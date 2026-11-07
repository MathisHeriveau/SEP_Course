"""
Bande-son originale de « Un pas pour maman — 556 km pour la SEP ».

Composition et mixage entièrement programmés (aucune musique tierce) :
  - Piano : échantillons « Upright Piano KW » (FreePats, domaine public CC0) — un piano droit enregistré dans un salon.
  - Nappes, cordes, violoncelle : synthèse par table d'onde (code ci-dessous).
  - Design sonore : souffle (vol vers le départ), onde grave à l'arrivée, notes de piano à l'apparition des mairies.
Ré mineur relatif / Ré majeur, 75 BPM : une mesure = 3,2 s ; le départ (40 s) et l'arrivée (136 s) tombent sur des barres de mesure.

Usage : .venv/bin/python -I scripts/audio/compose.py
Sortie : public/audio/soundtrack.wav (48 kHz, stéréo) + stems dans out/audio/
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SR = 48000
EVENTS = json.load(open(os.path.join(ROOT, 'data/generated/audio-events.json')))
DUR = EVENTS['durationSec']
N = int(SR * (DUR + 0.5))
rng = np.random.default_rng(556)

BEAT = 0.8          # 75 BPM
BAR = 4 * BEAT      # 3,2 s
T0 = 1.6            # temps de la mesure 0 (= apparition de la première phrase)


def bar_t(b, beat=0.0):
    return T0 + b * BAR + beat * BEAT


def track():
    return np.zeros((N, 2), dtype=np.float64)


# =============================================================================
# Échantillonneur SFZ minimal (piano)
# =============================================================================
class Sampler:
    def __init__(self, sfz_path):
        self.base = os.path.dirname(sfz_path)
        txt = open(sfz_path, encoding='utf-8').read()
        txt = re.sub(r'//[^\n]*', '', txt)
        self.regions = []
        glob, group = {}, {}
        for tag, body in re.findall(r'<(\w+)>([^<]*)', txt):
            ops = dict(re.findall(r'(\w+)=(\S+)', body))
            if tag == 'global':
                glob = ops
            elif tag == 'group':
                group = ops
            elif tag == 'region':
                r = {**glob, **group, **ops}
                self.regions.append({
                    'lokey': int(r.get('lokey', 0)), 'hikey': int(r.get('hikey', 127)),
                    'lovel': int(r.get('lovel', 0)), 'hivel': int(r.get('hivel', 127)),
                    'key': int(r.get('pitch_keycenter', r.get('lokey', 60))),
                    'sample': r['sample'], 'loop': r.get('loop_mode') == 'loop_continuous',
                    'ls': int(r.get('loop_start', 0)), 'le': int(r.get('loop_end', 0)),
                })
        self.cache = {}
        self.release = float(glob.get('ampeg_release', 0.6))

    def load(self, name):
        if name not in self.cache:
            data, sr = sf.read(os.path.join(self.base, name), dtype='float64', always_2d=True)
            self.cache[name] = (data, sr)
        return self.cache[name]

    def pick(self, midi, vel):
        cands = [r for r in self.regions if r['lokey'] <= midi <= r['hikey'] and r['lovel'] <= vel <= r['hivel']]
        looped = [r for r in cands if r['loop']]
        return (looped or cands or [min(self.regions, key=lambda r: abs(r['key'] - midi))])[0]

    def render(self, out, t, midi, vel, dur, gain=1.0, pan=0.0):
        vel = int(max(1, min(127, vel)))
        r = self.pick(midi, vel)
        data, sr = self.load(r['sample'])
        ratio = 2 ** ((midi - r['key']) / 12) * sr / SR
        rel = max(self.release, 0.35)
        length = int((dur + rel + 0.05) * SR)
        pos = np.arange(length) * ratio
        if r['loop'] and r['le'] > r['ls'] > 0:
            ls, le = r['ls'], r['le']
            over = pos >= le
            pos[over] = ls + np.mod(pos[over] - ls, le - ls)
        valid = pos < len(data) - 1
        pos = pos[valid]
        i = pos.astype(np.int64)
        f = (pos - i)[:, None]
        sig = data[i] * (1 - f) + data[i + 1] * f
        n = len(sig)
        tt = np.arange(n) / SR
        # décroissance naturelle d'un piano (plus longue dans le grave)
        tau = np.interp(midi, [21, 48, 72, 96, 108], [14.0, 9.0, 5.0, 2.4, 1.4])
        env = np.exp(-tt / tau)
        # relâchement de la touche / de la pédale
        held = int(dur * SR)
        if held < n:
            env[held:] *= np.exp(-(tt[held:] - dur) / (rel / 4.6))
        # vélocité dans la couche
        layer_lo, layer_hi = (r['lovel'], r['hivel'])
        rel_vel = (vel - layer_lo + 1) / (layer_hi - layer_lo + 1)
        g = gain * (0.35 + 0.65 * rel_vel) * (vel / 100) ** 0.9
        sig = sig * (env * g)[:, None]
        # panoramique doux (aigu un peu à droite, grave un peu à gauche, comme vu du pianiste)
        p = np.clip(pan + (midi - 64) / 90, -1, 1)
        sig[:, 0] *= np.cos((p + 1) * np.pi / 4) * 1.414
        sig[:, 1] *= np.sin((p + 1) * np.pi / 4) * 1.414
        s0 = int(t * SR)
        e0 = min(N, s0 + n)
        if s0 < N:
            out[s0:e0] += sig[: e0 - s0]


# =============================================================================
# Synthèse par table d'onde (nappes, cordes, violoncelle)
# =============================================================================
TABLE = 4096


def saw_table(harmonics):
    k = np.arange(1, harmonics + 1)
    ph = np.arange(TABLE) / TABLE * 2 * np.pi
    w = (np.sin(np.outer(ph, k)) / k).sum(axis=1)
    return w / np.abs(w).max()


TABLES = {h: saw_table(h) for h in (5, 9, 16, 28)}


def osc(freq, n, vib_rate=0.0, vib_cents=0.0, vib_delay=0.4, detune_cents=0.0, phase=0.0):
    tt = np.arange(n) / SR
    f = freq * 2 ** (detune_cents / 1200)
    if vib_cents:
        depth = np.clip((tt - vib_delay) / 1.2, 0, 1) * vib_cents
        f = f * 2 ** (depth * np.sin(2 * np.pi * vib_rate * tt + phase) / 1200)
    h = 28 if freq < 180 else 16 if freq < 500 else 9 if freq < 1400 else 5
    table = TABLES[h]
    ph = (phase / (2 * np.pi) + np.cumsum(np.broadcast_to(f, tt.shape) / SR)) % 1.0
    idx = ph * TABLE
    i = idx.astype(np.int64)
    fr = idx - i
    return table[i] * (1 - fr) + table[(i + 1) % TABLE] * fr


def lowpass(x, fc, order=2):
    sos = butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
    return sosfilt(sos, x, axis=0)


def highpass(x, fc, order=2):
    sos = butter(order, fc, 'high', fs=SR, output='sos')
    return sosfilt(sos, x, axis=0)


def bandpass(x, lo, hi, order=2):
    sos = butter(order, [lo, hi], 'band', fs=SR, output='sos')
    return sosfilt(sos, x, axis=0)


def adsr(n, a, r, dur):
    tt = np.arange(n) / SR
    env = np.clip(tt / max(a, 1e-3), 0, 1) ** 1.5
    held = dur
    env = np.where(tt > held, env * np.exp(-(tt - held) / (r / 4.6)), env)
    return env


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def synth_note(out, t, midi, dur, gain, kind='pad', pan=0.0, cutoff=1800):
    rel = {'pad': 2.8, 'strings': 1.8, 'cello': 1.4}[kind]
    att = {'pad': 2.2, 'strings': 0.9, 'cello': 0.6}[kind]
    n = int((dur + rel) * SR)
    f = mtof(midi)
    voices = []
    if kind == 'pad':
        for d in (-7, 0, 6):
            voices.append(osc(f, n, detune_cents=d, phase=rng.uniform(0, 6.28)) * 0.33)
        sig = np.sum(voices, axis=0)
        sig = lowpass(sig, cutoff, 2)
        sig = highpass(sig, 110, 1)
    elif kind == 'strings':
        for d in (-5, 0, 4, 9):
            voices.append(osc(f, n, vib_rate=rng.uniform(4.8, 5.6), vib_cents=7, vib_delay=0.35, detune_cents=d, phase=rng.uniform(0, 6.28)) * 0.25)
        sig = np.sum(voices, axis=0)
        sig = lowpass(sig, cutoff, 2)
        sig = highpass(sig, 180, 1)
    else:  # cello
        for d in (-3, 3):
            voices.append(osc(f, n, vib_rate=rng.uniform(4.6, 5.2), vib_cents=10, vib_delay=0.3, detune_cents=d, phase=rng.uniform(0, 6.28)) * 0.5)
        sig = np.sum(voices, axis=0)
        sig = lowpass(sig, cutoff, 2)
        sig = highpass(sig, 65, 2)
    sig = sig * adsr(n, att, rel, dur) * gain
    st = np.stack([sig * np.cos((pan + 1) * np.pi / 4), sig * np.sin((pan + 1) * np.pi / 4)], axis=1) * 1.414
    s0 = int(t * SR)
    e0 = min(N, s0 + n)
    if s0 < N:
        out[s0:e0] += st[: e0 - s0]


# =============================================================================
# Réverbération à convolution (réponse impulsionnelle synthétique, stéréo décorrélée)
# =============================================================================
def make_ir(rt60=3.2, length=4.5, bright=6500, predelay=0.018):
    n = int(length * SR)
    tt = np.arange(n) / SR
    ir = np.zeros((n, 2))
    for ch in range(2):
        noise = rng.standard_normal(n)
        lo = lowpass(noise, 900, 2) * np.exp(-6.9 * tt / (rt60 * 1.15))
        mid = bandpass(noise, 900, 4000, 2) * np.exp(-6.9 * tt / rt60)
        hi = bandpass(noise, 4000, bright, 2) * np.exp(-6.9 * tt / (rt60 * 0.5))
        tail = lo + mid * 0.8 + hi * 0.45
        # premières réflexions
        for d, g in [(0.011, 0.5), (0.019, 0.35), (0.027, 0.3), (0.041, 0.22), (0.057, 0.18)]:
            k = int((d + 0.003 * ch) * SR)
            tail[k] += g * (1 if ch == 0 else 0.9)
        ir[:, ch] = tail
    pd = int(predelay * SR)
    ir = np.vstack([np.zeros((pd, 2)), ir])
    return ir / np.sqrt((ir ** 2).sum() / 2)


def reverb(x, ir, wet, hp=170):
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    y = highpass(y, hp, 2)  # retours de réverbération sans graves (évite la boue)
    return x * (1 - wet * 0.5) + y * wet * 0.35


# =============================================================================
# Harmonie (Ré majeur) — accords par mesure
# =============================================================================
NOTE = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
CHORDS = {
    'Dadd9': ('D', ['D', 'E', 'F#', 'A']), 'D': ('D', ['D', 'F#', 'A']), 'A/C#': ('C#', ['A', 'C#', 'E']),
    'Bm': ('B', ['B', 'D', 'F#']), 'Bm7': ('B', ['B', 'D', 'F#', 'A']), 'G': ('G', ['G', 'B', 'D']),
    'Gmaj7': ('G', ['G', 'B', 'D', 'F#']), 'Em7': ('E', ['E', 'G', 'B', 'D']), 'D/F#': ('F#', ['D', 'F#', 'A']),
    'A': ('A', ['A', 'C#', 'E']), 'Asus4': ('A', ['A', 'D', 'E']), 'F#m': ('F#', ['F#', 'A', 'C#']),
}
# basse dans le registre 1–2 (MIDI)
BASS = {'D': 38, 'C#': 37, 'B': 35, 'G': 31, 'E': 40, 'F#': 42, 'A': 33}

PROG = (['Dadd9', 'Bm7', 'Gmaj7', 'Asus4>A',              # 0–3  prologue
         'G', 'D/F#', 'Em7', 'A',                           # 4–7  titre, apparition de la carte
         'Bm', 'G', 'D', 'Asus4>A']                         # 8–11 vol vers le départ, départ
        + ['D', 'A/C#', 'Bm', 'G'] * 2                      # 12–19 la marche commence
        + ['Em7', 'G', 'D/F#', 'A']                         # 20–23
        + ['D', 'A/C#', 'Bm', 'G']                          # 24–27 le thème
        + ['Em7', 'G', 'D/F#', 'A']                         # 28–31 la réponse
        + ['G', 'A', 'Bm', 'D/F#']                          # 32–35 montée
        + ['G', 'A', 'F#m', 'Bm']                           # 36–39
        + ['G', 'Asus4>A']                                  # 40–41 dernière montée
        + ['D', 'Dadd9', 'Bm', 'G', 'D/F#', 'Em7', 'A', 'D'] # 42–49 arrivée, recul, bilan
        + ['Bm', 'G', 'Asus4>A']                            # 50–52 générique
        + ['G', 'D/F#', 'Em7', 'Asus4', 'Dadd9', 'Dadd9'])  # 53–58 message final, titre


def chord_at_bar(b, beat=0.0):
    name = PROG[min(b, len(PROG) - 1)]
    if '>' in name:
        a, z = name.split('>')
        name = a if beat < 2 else z
    return name


def chord_at_time(t):
    b = int(np.floor((t - T0) / BAR))
    beat = ((t - T0) / BAR - b) * 4
    return chord_at_bar(max(0, b), beat)


def tones(name, octave):
    """Notes de l'accord dans une octave donnée (MIDI), triées."""
    return sorted(12 * (octave + 1) + NOTE[n] for n in CHORDS[name][1])


def bass_of(name):
    return BASS[CHORDS[name][0]]


def p(note):
    """'F#5' → MIDI"""
    m = re.match(r'([A-G]#?)(\d)', note)
    return 12 * (int(m.group(2)) + 1) + NOTE[m.group(1)]


# =============================================================================
# Partition
# =============================================================================
piano = Sampler(os.path.join(ROOT, 'cache/audio-src/piano/UprightPianoKW-SFZ+FLAC-20220221/UprightPianoKW-20220221.sfz'))
st_piano, st_pad, st_strings, st_cello, st_ticks, st_sfx, st_amb = (track() for _ in range(7))


def human(t, ms=7):
    return t + rng.uniform(-ms, ms) / 1000


def hv(v, spread=4):
    return int(v + rng.uniform(-spread, spread))


def pl(t, note, vel, dur, gain=1.0):
    piano.render(st_piano, human(t), note if isinstance(note, int) else p(note), hv(vel), dur, gain)


def left_quarters(b, vel):
    """Main gauche : accord brisé en noires (prologue)."""
    for beat in range(4):
        name = chord_at_bar(b, beat)
        bs = bass_of(name)
        ch = tones(name, 3)
        seq = [bs, bs + 7, ch[0] + 12 if ch[0] + 12 < 64 else ch[0], ch[min(1, len(ch) - 1)] + 12]
        pl(bar_t(b, beat), seq[beat], vel - beat * 2, (4 - beat) * BEAT + 0.2)


def left_eighths(b, vel, accent=6):
    """Main gauche : arpège en croches — le pas de la marche."""
    for k in range(8):
        beat = k / 2
        name = chord_at_bar(b, beat)
        bs = bass_of(name)
        ch = tones(name, 3)
        top = tones(name, 4)
        seq = [bs, bs + 7 if bs + 7 < 52 else bs + 7 - 12, ch[0], top[0], top[min(1, len(top) - 1)], top[0], ch[min(1, len(ch) - 1)], bs + 12]
        v = vel + (accent if k in (0, 4) else 0) - (2 if k % 2 else 0)
        if k == 0:
            v -= 8  # basse plus discrète
        if k == 7 and seq[k] < 40:
            seq[k] += 12
        pl(bar_t(b, beat), seq[k], v, BEAT * 0.5 + 0.9)


def left_halves(b, vel):
    for beat in (0, 2):
        name = chord_at_bar(b, beat)
        bs = bass_of(name)
        pl(bar_t(b, beat), bs, vel, 2 * BEAT + 0.4)
        for n in tones(name, 3)[:3]:
            pl(bar_t(b, beat) + 0.03, n, vel - 10, 2 * BEAT + 0.3)


def melody(b0, notes, vel, octave_shift=0, gain=1.0, double=False):
    """notes : liste (mesure relative, temps, note, durée en temps)."""
    for (db, beat, note, d) in notes:
        m = p(note) + 12 * octave_shift
        pl(bar_t(b0 + db, beat), m, vel, d * BEAT + 0.25, gain)
        if double:
            pl(bar_t(b0 + db, beat) + 0.012, m - 12, vel - 12, d * BEAT + 0.25, gain)


MOTIF_PROLOGUE = [(0, 0, 'A4', 1), (0, 1, 'D5', 1), (0, 2, 'F#5', 2), (1, 0, 'F#5', 1), (1, 1, 'E5', 3),
                  (2, 0, 'D5', 2), (2, 2, 'B4', 2), (3, 0, 'D5', 2), (3, 2, 'C#5', 2)]
THEME = [(0, 0, 'F#5', 2), (0, 2, 'E5', 1), (0, 3, 'D5', 1), (1, 0, 'E5', 3), (1, 3, 'C#5', 1),
         (2, 0, 'D5', 2), (2, 2, 'B4', 2), (3, 0, 'D5', 1.5), (3, 1.5, 'E5', 0.5), (3, 2, 'B4', 2)]
ANSWER = [(0, 0, 'G5', 2), (0, 2, 'F#5', 1), (0, 3, 'E5', 1), (1, 0, 'D5', 3), (1, 3, 'B4', 1),
          (2, 0, 'A4', 2), (2, 2, 'D5', 2), (3, 0, 'C#5', 3), (3, 3, 'E5', 1)]
CLIMB = [(0, 0, 'B5', 2), (0, 2, 'A5', 1), (0, 3, 'G5', 1), (1, 0, 'A5', 2), (1, 2, 'E5', 2),
         (2, 0, 'F#5', 2), (2, 2, 'B5', 2), (3, 0, 'A5', 4)]
CLIMB2 = [(0, 0, 'B5', 2), (0, 2, 'D6', 2), (1, 0, 'C#6', 2), (1, 2, 'E6', 2),
          (2, 0, 'C#6', 2), (2, 2, 'A5', 2), (3, 0, 'B5', 3), (3, 3, 'D6', 1)]

# --- Prologue (0–3)
for b in range(4):
    left_quarters(b, 44)
melody(0, MOTIF_PROLOGUE, 50)
# --- Titre / carte (4–7)
for b in range(4, 8):
    left_halves(b, 40)
melody(4, [(0, 1, 'D5', 3), (1, 0, 'A4', 2), (1, 2, 'F#5', 2), (2, 0, 'E5', 2), (2, 2, 'G5', 2), (3, 0, 'E5', 2), (3, 2, 'C#5', 2)], 46)
# --- Vol vers le départ / départ (8–11)
for i, b in enumerate(range(8, 11)):
    left_eighths(b, 30 + i * 4, accent=4)
left_halves(11, 40)
melody(8, [(0, 0, 'F#5', 3), (1, 0, 'D5', 2), (1, 2, 'B4', 2), (2, 0, 'A4', 4), (3, 0, 'D5', 2), (3, 2, 'C#5', 2)], 44)
# --- La marche (12–41)
for b in range(12, 42):
    prog = (b - 12) / 29
    left_eighths(b, int(38 + 22 * prog), accent=5 + int(6 * prog))
melody(16, THEME, 46)
melody(20, ANSWER, 48)
melody(24, THEME, 58, octave_shift=0, double=True)
melody(28, ANSWER, 60, double=True)
melody(32, CLIMB, 66, double=True)
melody(36, CLIMB2, 72, double=True)
# dernière montée : accords répétés
for b in (40, 41):
    for k in range(8):
        name = chord_at_bar(b, k / 2)
        for n in tones(name, 5)[:3]:
            pl(bar_t(b, k / 2), n, 62 + (b - 40) * 8 + k * 1.5, BEAT * 0.5 + 0.2, 0.8)
    for beat in (0, 2):
        bs = bass_of(chord_at_bar(b, beat))
        pl(bar_t(b, beat), bs - 12 if bs - 12 >= 24 else bs, 80, 2 * BEAT + 0.5)
# --- Arrivée (42–43) : grand accord de Ré
ta = bar_t(42)
for n, v in [(26, 92), (38, 88), (45, 80), (50, 82), (54, 80), (57, 82), (62, 84), (66, 86), (69, 88), (74, 90)]:
    pl(ta + (0.02 * (n > 60)), n, v, 2 * BAR + 1.5)
for k, n in enumerate(['A5', 'D6', 'F#6', 'A6', 'E6', 'D6']):
    pl(bar_t(43, k * 0.66), n, 44 - k * 2, 2.6, 0.8)
# --- Recul, bilan (44–49)
for b in range(44, 50):
    left_halves(b, 50 - (b - 44) * 1)
melody(44, [(0, 0, 'F#5', 2), (0, 2, 'D5', 2), (1, 0, 'D5', 3), (1, 3, 'B4', 1), (2, 0, 'A4', 4), (3, 0, 'B4', 2), (3, 2, 'G4', 2), (4, 0, 'E5', 3), (4, 3, 'C#5', 1), (5, 0, 'D5', 4)], 50)
# --- Générique (50–52)
for b in range(50, 53):
    left_eighths(b, 36, accent=4)
melody(50, [(0, 0, 'F#5', 2), (0, 2, 'D5', 2), (1, 0, 'D5', 2), (1, 2, 'B4', 2), (2, 0, 'D5', 2), (2, 2, 'C#5', 2)], 44)
# --- Message final (53–56) : piano seul, rappel du motif
for b in range(53, 57):
    left_halves(b, 36)
melody(53, [(0, 0, 'D5', 2), (0, 2, 'B4', 2), (1, 0, 'A4', 1), (1, 1, 'D5', 1), (1, 2, 'F#5', 2), (2, 0, 'E5', 3), (3, 0, 'D5', 2), (3, 2, 'E5', 2)], 40)
# --- Accord final (57) : Ré ajout 9, arpégé lentement
tf = bar_t(57)
for k, n in enumerate([38, 45, 50, 54, 57, 64, 66, 69, 74]):
    pl(tf + k * 0.11, n, 46 - k, 7.5)

# --- Nappes et cordes : un accord par mesure (voicing ample)
def pad_chord(b, gain, cutoff, kind='pad', octave=3, pan_spread=0.5, beats=4):
    for half in ((0, 2), (2, 2)) if '>' in PROG[min(b, len(PROG) - 1)] else ((0, beats),):
        name = chord_at_bar(b, half[0])
        notes = tones(name, octave)
        for i, n in enumerate(notes):
            pan = (i / max(1, len(notes) - 1) - 0.5) * 2 * pan_spread
            synth_note({'pad': st_pad, 'strings': st_strings, 'cello': st_cello}[kind], bar_t(b, half[0]), n, half[1] * BEAT + 0.15, gain, kind, pan, cutoff)


for b in range(4, 59):
    pad_chord(b, 0.09, 650 + 750 * min(1, max(0, (b - 12) / 30)), 'pad', 3)
for b in range(16, 53):
    pad_chord(b, 0.06, 1500 + 1300 * min(1, max(0, (b - 16) / 26)), 'strings', 4, 0.8)
for b in range(32, 50):
    pad_chord(b, 0.045, 2800, 'strings', 5, 0.9)
for b in range(28, 52):
    name = chord_at_bar(b, 0)
    synth_note(st_cello, bar_t(b), bass_of(name) + 12 if bass_of(name) < 36 else bass_of(name), BAR + 0.1, 0.12, 'cello', -0.25, 1400)

# --- Notes des mairies : une note aiguë, accordée sur l'harmonie du moment
for i, c in enumerate(EVENTS['communes']):
    name = chord_at_time(c['t'])
    pool = tones(name, 6)
    note = pool[i % len(pool)]
    if c['waypoint']:
        piano.render(st_ticks, c['t'], note - 12, 50, 2.0, 1.0)
        piano.render(st_ticks, c['t'] + 0.09, note, 44, 2.0, 1.0)
    else:
        piano.render(st_ticks, c['t'], note, 34 + (i % 3) * 2, 1.2, 1.0)


# =============================================================================
# Design sonore
# =============================================================================
def env_points(points, n=N):
    tt = np.arange(n) / SR
    xs, ys = zip(*points)
    return np.interp(tt, xs, ys)


def noise(n):
    return rng.standard_normal((n, 2))


TL = EVENTS['timeline']
# Souffle du vol vers le départ : bruit filtré dont la bande monte puis redescend
fa, fb = TL['flyToStart']
seg = int((fb - fa + 2.0) * SR)
s0 = int((fa - 0.5) * SR)
nz = noise(seg)
low = bandpass(nz, 150, 700)
mid = bandpass(nz, 700, 2400)
high = bandpass(nz, 2400, 7000)
tt = np.arange(seg) / SR
u = tt / (fb - fa + 1.5)
w_low = np.interp(u, [0, 0.25, 0.6, 1], [0, 0.7, 0.5, 0])
w_mid = np.interp(u, [0, 0.3, 0.55, 0.85, 1], [0, 0.2, 0.9, 0.3, 0])
w_high = np.interp(u, [0, 0.4, 0.6, 0.75, 1], [0, 0.0, 0.5, 0.15, 0])
whoosh = low * w_low[:, None] + mid * w_mid[:, None] * 0.7 + high * w_high[:, None] * 0.35
st_sfx[s0:s0 + seg] += whoosh * 0.05

# Onde grave et scintillement à l'arrivée ; montée inversée juste avant
tA = TL['journey'][1]
n = int(6 * SR)
tt = np.arange(n) / SR
sub = np.sin(2 * np.pi * (44 - 4 * tt / 6) * tt) * np.exp(-tt / 2.2) * np.clip(tt / 0.04, 0, 1)
sub2 = np.sin(2 * np.pi * 88 * tt) * np.exp(-tt / 1.2) * 0.25
st_sfx[int(tA * SR):int(tA * SR) + n] += np.stack([sub + sub2] * 2, axis=1) * 0.32
n = int(2.6 * SR)
tt = np.arange(n) / SR
rev = highpass(noise(n), 2500, 2) * ((tt / 2.6) ** 3)[:, None]
st_sfx[int(tA * SR) - n:int(tA * SR)] += rev * 0.06
# Grave doux sous le titre
tT = TL['title'][0]
n = int(5 * SR)
tt = np.arange(n) / SR
sub = np.sin(2 * np.pi * 49 * tt) * np.exp(-tt / 2.0) * np.clip(tt / 0.3, 0, 1)
st_sfx[int(tT * SR):int(tT * SR) + n] += np.stack([sub] * 2, axis=1) * 0.12

# Ambiance d'air (vent très léger) pendant la carte
amb = lowpass(highpass(noise(N), 90, 2), 1100, 2)
amb *= 1 + 0.35 * np.sin(2 * np.pi * 0.06 * (np.arange(N) / SR)[:, None] + np.array([0.0, 1.3])[None, :])
amb_env = env_points([(0, 0), (TL['mapIn'][0], 0), (TL['mapIn'][1] + 2, 1), (TL['journey'][1], 1), (TL['finalText'][0], 0.6), (TL['finalText'][0] + 4, 0), (DUR + 1, 0)])
st_amb += amb * amb_env[:, None] * 0.010

# =============================================================================
# Mixage
# =============================================================================
print('Réverbération…', flush=True)
ir_hall = make_ir(3.4, 5.0)
ir_room = make_ir(1.9, 3.0, bright=5500)
mix_piano = reverb(st_piano, ir_room, 0.55)
mix_ticks = reverb(st_ticks, ir_hall, 0.85)
mix_pad = reverb(st_pad, ir_hall, 0.7)
mix_str = reverb(st_strings, ir_hall, 0.6)
mix_cel = reverb(st_cello, ir_hall, 0.5)
mix_sfx = reverb(st_sfx, ir_hall, 0.35)

# automation des cordes : souffle de section
str_env = env_points([(0, 0), (50, 0), (60, 0.55), (90, 0.75), (120, 0.95), (136, 1.2), (144, 1.2), (152, 0.85), (165, 0.6), (172, 0.3), (180, 0), (DUR + 1, 0)])
pad_env = env_points([(0, 0), (14, 0), (22, 0.8), (34, 1.0), (40, 0.7), (100, 0.9), (136, 1.2), (146, 0.9), (172, 0.55), (188, 0.25), (DUR + 1, 0)])

mix = (mix_piano * 1.0
       + mix_ticks * 0.42
       + mix_pad * pad_env[:, None] * 1.0
       + mix_str * str_env[:, None] * 1.0
       + mix_cel * 1.0
       + mix_sfx * 1.0
       + st_amb)

# Arc dynamique du film (dB) : intime au début, sommet à l'arrivée, apaisement final
arc_db = env_points([(0, -10), (14, -9), (19, -8), (27, -7), (34, -7.5), (40, -7), (60, -5.5), (90, -3.5), (115, -1.5), (130, 0), (136, 1.0), (138, 1.5), (142, 3.0), (146, 0.5), (152, -1.5), (160, -2.5), (171, -4.5), (182, -6), (DUR + 1, -7)])
mix *= (10 ** (arc_db / 20))[:, None]
# fondu de fin
fade = env_points([(0, 1), (DUR - 2.0, 1), (DUR, 0), (DUR + 1, 0)])
mix *= fade[:, None]
# léger allègement du bas du spectre (sous 120 Hz)
low_band = lowpass(mix, 120, 2)
mix = mix - 0.4 * low_band
mix = highpass(mix, 38, 2)

# compression douce de bus
def compress(x, thr_db=-20, ratio=2.0, att=0.02, rel=0.25):
    lvl = np.sqrt(np.mean(x ** 2, axis=1) + 1e-12)
    a_a = np.exp(-1 / (att * SR))
    a_r = np.exp(-1 / (rel * SR))
    env = np.zeros_like(lvl)
    e = 0.0
    for i in range(0, len(lvl), 64):
        v = lvl[i:i + 64].max()
        e = a_a * e + (1 - a_a) * v if v > e else a_r * e + (1 - a_r) * v
        env[i:i + 64] = e
    db = 20 * np.log10(env + 1e-9)
    over = np.maximum(0, db - thr_db)
    gain_db = -over * (1 - 1 / ratio)
    return x * (10 ** (gain_db / 20))[:, None]


mix = compress(mix, thr_db=-24, ratio=1.5)
peak = np.abs(mix).max()
mix = mix / peak * 0.7

os.makedirs(os.path.join(ROOT, 'out/audio'), exist_ok=True)
for name, s in [('piano', mix_piano), ('ticks', mix_ticks), ('pad', mix_pad * pad_env[:, None]), ('strings', mix_str * str_env[:, None]), ('cello', mix_cel), ('sfx', mix_sfx), ('ambiance', st_amb)]:
    sf.write(os.path.join(ROOT, f'out/audio/stem-{name}.wav'), (s / max(1e-9, np.abs(s).max()) * 0.8).astype(np.float32), SR, subtype='FLOAT')
pre = os.path.join(ROOT, 'out/audio/premaster.wav')
sf.write(pre, mix[: int(DUR * SR)].astype(np.float32), SR, subtype='FLOAT')

# Mastering : gain vers −16 LUFS intégrés, puis limiteur de crête (crête vraie ≤ −1,5 dBTP)
print('Mastering…', flush=True)
import pyloudnorm as pyln
from scipy.signal import resample_poly
from scipy.ndimage import minimum_filter1d, uniform_filter1d

TARGET_LUFS = -16.0
CEIL = 10 ** (-1.9 / 20)
meter = pyln.Meter(SR)
x = mix[: int(DUR * SR)]


def limit(x, ceil=CEIL, look=0.005, release=0.12):
    # détection de crête sur signal sur-échantillonné ×4 (approximation de la crête vraie)
    up = np.abs(resample_poly(x, 4, 1, axis=0)).max(axis=1)
    pk = up.reshape(-1, 4).max(axis=1)[: len(x)]
    need = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    la = int(look * SR)
    g = minimum_filter1d(need, size=2 * la + 1, origin=0)
    # relâchement exponentiel (le gain remonte lentement)
    a = np.exp(-1 / (release * SR))
    out = np.empty_like(g)
    cur = 1.0
    for i in range(0, len(g), 32):
        blk = g[i:i + 32].min()
        cur = blk if blk < cur else a ** 32 * cur + (1 - a ** 32) * blk
        out[i:i + 32] = cur
    out = uniform_filter1d(out, size=la)
    return x * out[:, None]


for _ in range(3):
    lufs = meter.integrated_loudness(x)
    x = x * 10 ** ((TARGET_LUFS - lufs) / 20)
    x = limit(x)
lufs = meter.integrated_loudness(x)
final = os.path.join(ROOT, 'public/audio/soundtrack.wav')
sf.write(final, x.astype(np.float32), SR, subtype='PCM_24')
print(f'Sonie intégrée : {lufs:.1f} LUFS')
print('→', final)
