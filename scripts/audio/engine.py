"""
Moteur audio réutilisable (extrait de compose.py, qui reste inchangé pour que la bande-son du documentaire
soit reproductible à l'identique). Même piano (Upright Piano KW, CC0), mêmes timbres, même réverbération,
même harmonie en Ré majeur à 75 BPM : les shorts partagent l'identité sonore du film.
"""
import os
import re

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt
from scipy.ndimage import minimum_filter1d, uniform_filter1d

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SR = 48000
BEAT = 0.8
BAR = 4 * BEAT
PIANO_SFZ = os.path.join(ROOT, 'cache/audio-src/piano/UprightPianoKW-SFZ+FLAC-20220221/UprightPianoKW-20220221.sfz')


# =============================================================================
# Filtres
# =============================================================================
def lowpass(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x, axis=0)


def highpass(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x, axis=0)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)


def add_at(out, t, sig):
    s0 = int(round(t * SR))
    if s0 < 0:
        sig = sig[-s0:]
        s0 = 0
    e0 = min(len(out), s0 + len(sig))
    if s0 < len(out) and e0 > s0:
        out[s0:e0] += sig[: e0 - s0]


# =============================================================================
# Échantillonneur SFZ (piano)
# =============================================================================
class Sampler:
    def __init__(self, sfz_path=PIANO_SFZ):
        self.base = os.path.dirname(sfz_path)
        txt = re.sub(r'//[^\n]*', '', open(sfz_path, encoding='utf-8').read())
        self.regions, glob, group = [], {}, {}
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
        pos = np.arange(int((dur + rel + 0.05) * SR)) * ratio
        if r['loop'] and r['le'] > r['ls'] > 0:
            ls, le = r['ls'], r['le']
            over = pos >= le
            pos[over] = ls + np.mod(pos[over] - ls, le - ls)
        pos = pos[pos < len(data) - 1]
        i = pos.astype(np.int64)
        f = (pos - i)[:, None]
        sig = data[i] * (1 - f) + data[i + 1] * f
        tt = np.arange(len(sig)) / SR
        tau = np.interp(midi, [21, 48, 72, 96, 108], [14.0, 9.0, 5.0, 2.4, 1.4])
        env = np.exp(-tt / tau)
        held = int(dur * SR)
        if held < len(sig):
            env[held:] *= np.exp(-(tt[held:] - dur) / (rel / 4.6))
        rel_vel = (vel - r['lovel'] + 1) / (r['hivel'] - r['lovel'] + 1)
        g = gain * (0.35 + 0.65 * rel_vel) * (vel / 100) ** 0.9
        sig = sig * (env * g)[:, None]
        p = np.clip(pan + (midi - 64) / 90, -1, 1)
        sig[:, 0] *= np.cos((p + 1) * np.pi / 4) * 1.414
        sig[:, 1] *= np.sin((p + 1) * np.pi / 4) * 1.414
        add_at(out, t, sig)


# =============================================================================
# Synthèse par table d'onde
# =============================================================================
TABLE = 4096


def _saw_table(h):
    k = np.arange(1, h + 1)
    ph = np.arange(TABLE) / TABLE * 2 * np.pi
    w = (np.sin(np.outer(ph, k)) / k).sum(axis=1)
    return w / np.abs(w).max()


TABLES = {h: _saw_table(h) for h in (5, 9, 16, 28)}


def osc(freq, n, rng, vib_rate=0.0, vib_cents=0.0, vib_delay=0.4, detune_cents=0.0):
    tt = np.arange(n) / SR
    phase = rng.uniform(0, 6.28)
    f = freq * 2 ** (detune_cents / 1200)
    if vib_cents:
        depth = np.clip((tt - vib_delay) / 1.2, 0, 1) * vib_cents
        f = f * 2 ** (depth * np.sin(2 * np.pi * vib_rate * tt + phase) / 1200)
    h = 28 if freq < 180 else 16 if freq < 500 else 9 if freq < 1400 else 5
    ph = (phase / (2 * np.pi) + np.cumsum(np.broadcast_to(f, tt.shape) / SR)) % 1.0
    idx = ph * TABLE
    i = idx.astype(np.int64)
    fr = idx - i
    tb = TABLES[h]
    return tb[i] * (1 - fr) + tb[(i + 1) % TABLE] * fr


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def synth_note(out, t, midi, dur, gain, rng, kind='pad', pan=0.0, cutoff=1800):
    rel = {'pad': 2.8, 'strings': 1.8, 'cello': 1.4}[kind]
    att = {'pad': 2.2, 'strings': 0.9, 'cello': 0.6}[kind]
    n = int((dur + rel) * SR)
    f = mtof(midi)
    if kind == 'pad':
        sig = sum(osc(f, n, rng, detune_cents=d) * 0.33 for d in (-7, 0, 6))
        sig = highpass(lowpass(sig, cutoff), 110, 1)
    elif kind == 'strings':
        sig = sum(osc(f, n, rng, vib_rate=rng.uniform(4.8, 5.6), vib_cents=7, vib_delay=0.35, detune_cents=d) * 0.25 for d in (-5, 0, 4, 9))
        sig = highpass(lowpass(sig, cutoff), 180, 1)
    else:
        sig = sum(osc(f, n, rng, vib_rate=rng.uniform(4.6, 5.2), vib_cents=10, vib_delay=0.3, detune_cents=d) * 0.5 for d in (-3, 3))
        sig = highpass(lowpass(sig, cutoff), 65)
    tt = np.arange(n) / SR
    env = np.clip(tt / att, 0, 1) ** 1.5
    env = np.where(tt > dur, env * np.exp(-(tt - dur) / (rel / 4.6)), env)
    sig = sig * env * gain
    add_at(out, t, np.stack([sig * np.cos((pan + 1) * np.pi / 4), sig * np.sin((pan + 1) * np.pi / 4)], axis=1) * 1.414)


# =============================================================================
# Réverbération
# =============================================================================
def make_ir(rng, rt60=3.2, length=4.5, bright=6500, predelay=0.018):
    n = int(length * SR)
    tt = np.arange(n) / SR
    ir = np.zeros((n, 2))
    for ch in range(2):
        noise = rng.standard_normal(n)
        tail = (lowpass(noise, 900) * np.exp(-6.9 * tt / (rt60 * 1.15))
                + bandpass(noise, 900, 4000) * np.exp(-6.9 * tt / rt60) * 0.8
                + bandpass(noise, 4000, bright) * np.exp(-6.9 * tt / (rt60 * 0.5)) * 0.45)
        for d, g in [(0.011, 0.5), (0.019, 0.35), (0.027, 0.3), (0.041, 0.22), (0.057, 0.18)]:
            tail[int((d + 0.003 * ch) * SR)] += g * (1 if ch == 0 else 0.9)
        ir[:, ch] = tail
    ir = np.vstack([np.zeros((int(predelay * SR), 2)), ir])
    return ir / np.sqrt((ir ** 2).sum() / 2)


def reverb(x, ir, wet, hp=170):
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x * (1 - wet * 0.5) + highpass(y, hp) * wet * 0.35


# =============================================================================
# Harmonie (Ré majeur)
# =============================================================================
NOTE = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
CHORDS = {
    'Dadd9': ('D', ['D', 'E', 'F#', 'A']), 'D': ('D', ['D', 'F#', 'A']), 'A/C#': ('C#', ['A', 'C#', 'E']),
    'Bm': ('B', ['B', 'D', 'F#']), 'Bm7': ('B', ['B', 'D', 'F#', 'A']), 'G': ('G', ['G', 'B', 'D']),
    'Gmaj7': ('G', ['G', 'B', 'D', 'F#']), 'Em7': ('E', ['E', 'G', 'B', 'D']), 'D/F#': ('F#', ['D', 'F#', 'A']),
    'A': ('A', ['A', 'C#', 'E']), 'Asus4': ('A', ['A', 'D', 'E']), 'F#m': ('F#', ['F#', 'A', 'C#']),
}
BASS = {'D': 38, 'C#': 37, 'B': 35, 'G': 31, 'E': 40, 'F#': 42, 'A': 33}

# Motifs du documentaire (mesure relative, temps, note, durée en temps)
MOTIF_PROLOGUE = [(0, 0, 'A4', 1), (0, 1, 'D5', 1), (0, 2, 'F#5', 2), (1, 0, 'F#5', 1), (1, 1, 'E5', 3),
                  (2, 0, 'D5', 2), (2, 2, 'B4', 2), (3, 0, 'D5', 2), (3, 2, 'C#5', 2)]
THEME = [(0, 0, 'F#5', 2), (0, 2, 'E5', 1), (0, 3, 'D5', 1), (1, 0, 'E5', 3), (1, 3, 'C#5', 1),
         (2, 0, 'D5', 2), (2, 2, 'B4', 2), (3, 0, 'D5', 1.5), (3, 1.5, 'E5', 0.5), (3, 2, 'B4', 2)]
ANSWER = [(0, 0, 'G5', 2), (0, 2, 'F#5', 1), (0, 3, 'E5', 1), (1, 0, 'D5', 3), (1, 3, 'B4', 1),
          (2, 0, 'A4', 2), (2, 2, 'D5', 2), (3, 0, 'C#5', 3), (3, 3, 'E5', 1)]
CLIMB = [(0, 0, 'B5', 2), (0, 2, 'A5', 1), (0, 3, 'G5', 1), (1, 0, 'A5', 2), (1, 2, 'E5', 2),
         (2, 0, 'F#5', 2), (2, 2, 'B5', 2), (3, 0, 'A5', 4)]


def p(note):
    m = re.match(r'([A-G]#?)(\d)', note)
    return 12 * (int(m.group(2)) + 1) + NOTE[m.group(1)]


def tones(name, octave):
    return sorted(12 * (octave + 1) + NOTE[n] for n in CHORDS[name][1])


def bass_of(name):
    return BASS[CHORDS[name][0]]


# =============================================================================
# Partition : pistes + écriture musicale
# =============================================================================
class Score:
    def __init__(self, prog, duration, seed=556):
        self.prog = prog
        self.dur = duration
        self.n = int(SR * (duration + 0.5))
        self.rng = np.random.default_rng(seed)
        self.piano = Sampler()
        self.tr = {k: np.zeros((self.n, 2)) for k in ('piano', 'chimes', 'pad', 'strings', 'cello', 'sfx', 'steps', 'amb')}

    # --- temps et harmonie
    @staticmethod
    def t(b, beat=0.0):
        return (b * 4 + beat) * BEAT

    def chord(self, b, beat=0.0):
        name = self.prog[max(0, min(int(b), len(self.prog) - 1))]
        if '>' in name:
            a, z = name.split('>')
            name = a if beat < 2 else z
        return name

    def chord_at(self, t):
        b = int(np.floor(t / BAR))
        return self.chord(b, (t / BAR - b) * 4)

    # --- piano
    def pl(self, t, note, vel, dur, gain=1.0, track='piano', human=7):
        m = note if isinstance(note, int) else p(note)
        self.piano.render(self.tr[track], t + self.rng.uniform(-human, human) / 1000, m, int(vel + self.rng.uniform(-4, 4)), dur, gain)

    def left_eighths(self, b, vel, accent=6):
        for k in range(8):
            beat = k / 2
            name = self.chord(b, beat)
            bs = bass_of(name)
            ch, top = tones(name, 3), tones(name, 4)
            seq = [bs, bs + 7 if bs + 7 < 52 else bs - 5, ch[0], top[0], top[min(1, len(top) - 1)], top[0], ch[min(1, len(ch) - 1)], bs + 12]
            v = vel + (accent if k in (0, 4) else 0) - (2 if k % 2 else 0) - (8 if k == 0 else 0)
            if k == 7 and seq[k] < 40:
                seq[k] += 12
            self.pl(self.t(b, beat), seq[k], v, BEAT * 0.5 + 0.9)

    def left_halves(self, b, vel):
        for beat in (0, 2):
            name = self.chord(b, beat)
            self.pl(self.t(b, beat), bass_of(name), vel, 2 * BEAT + 0.4)
            for n in tones(name, 3)[:3]:
                self.pl(self.t(b, beat) + 0.03, n, vel - 10, 2 * BEAT + 0.3)

    def rolled(self, t, notes, vel, dur, spread=0.05):
        for k, n in enumerate(notes):
            self.pl(t + k * spread, n, vel - k, dur)

    def melody(self, b0, notes, vel, double=False, gain=1.0):
        for (db, beat, note, d) in notes:
            m = p(note)
            self.pl(self.t(b0 + db, beat), m, vel, d * BEAT + 0.25, gain)
            if double:
                self.pl(self.t(b0 + db, beat) + 0.012, m - 12, vel - 12, d * BEAT + 0.25, gain)

    def repeated_chords(self, b, vel0, vel_step):
        for k in range(8):
            name = self.chord(b, k / 2)
            for n in tones(name, 5)[:3]:
                self.pl(self.t(b, k / 2), n, vel0 + k * vel_step, BEAT * 0.5 + 0.2, 0.8)
        for beat in (0, 2):
            bs = bass_of(self.chord(b, beat))
            self.pl(self.t(b, beat), bs - 12 if bs - 12 >= 24 else bs, vel0 + 12, 2 * BEAT + 0.5)

    def big_d(self, t, vel=90):
        for n, v in [(26, vel + 2), (38, vel - 2), (45, vel - 10), (50, vel - 8), (54, vel - 10), (57, vel - 8), (62, vel - 6), (66, vel - 4), (69, vel - 2), (74, vel)]:
            self.pl(t + (0.02 if n > 60 else 0), n, v, 2 * BAR + 1.5)

    def chime(self, t, low=False, vel=62):
        """Note de piano aiguë, accordée sur l'harmonie (signature sonore des villes du documentaire)."""
        pool = tones(self.chord_at(t), 6)
        note = pool[int(self.rng.integers(0, len(pool)))]
        self.piano.render(self.tr['chimes'], t, note - 12, vel, 2.2)
        if not low:
            self.piano.render(self.tr['chimes'], t + 0.09, note, vel - 6, 2.2)

    # --- nappes / cordes
    def pad_bar(self, b, gain, cutoff, kind='pad', octave=3, spread=0.5):
        name0 = self.prog[min(b, len(self.prog) - 1)]
        halves = ((0, 2), (2, 2)) if '>' in name0 else ((0, 4),)
        for (beat, d) in halves:
            notes = tones(self.chord(b, beat), octave)
            for i, n in enumerate(notes):
                pan = (i / max(1, len(notes) - 1) - 0.5) * 2 * spread
                synth_note(self.tr[kind], self.t(b, beat), n, d * BEAT + 0.15, gain, self.rng, kind, pan, cutoff)

    def cello_bar(self, b, gain=0.12):
        bs = bass_of(self.chord(b, 0))
        synth_note(self.tr['cello'], self.t(b), bs + 12 if bs < 36 else bs, BAR + 0.1, gain, self.rng, 'cello', -0.25, 1400)

    # --- design sonore
    def noise(self, n):
        return self.rng.standard_normal((n, 2))

    def footstep(self, t, gain=1.0):
        """Pas sur un chemin : talon (grave, court) + crissement de gravier (grains filtrés)."""
        n = int(0.32 * SR)
        tt = np.arange(n) / SR
        thump = np.sin(2 * np.pi * 62 * tt) * np.exp(-tt / 0.035) * 0.55
        thump += lowpass(self.rng.standard_normal(n), 380)[:] * np.exp(-tt / 0.03) * 0.5
        crunch = np.zeros(n)
        for _ in range(14):
            s = int(self.rng.uniform(0.004, 0.16) * SR)
            ln = int(self.rng.uniform(0.004, 0.014) * SR)
            g = self.rng.uniform(0.3, 1.0) * np.exp(-s / SR / 0.07)
            crunch[s:s + ln] += self.rng.standard_normal(ln) * np.hanning(ln) * g
        crunch = bandpass(crunch, 900, 5200)
        sig = (thump + crunch * 0.8) * gain * 0.22
        pan = self.rng.uniform(-0.15, 0.15)
        add_at(self.tr['steps'], t, np.stack([sig * (1 - pan), sig * (1 + pan)], axis=1))

    def whoosh(self, t0, t1, gain=1.0, rising=False):
        n = int((t1 - t0 + 0.8) * SR)
        nz = self.noise(n)
        tt = np.arange(n) / SR
        u = tt / (t1 - t0 + 0.6)
        if rising:
            lowb, highb = bandpass(nz, 1800, 4500), bandpass(nz, 4500, 11000)
            w1 = np.interp(u, [0, 0.4, 0.9, 1], [0, 0.6, 0.5, 0])
            w2 = np.interp(u, [0, 0.5, 0.9, 1], [0, 0.2, 0.7, 0])
            sig = lowb * w1[:, None] + highb * w2[:, None] * 0.6
        else:
            low, mid = bandpass(nz, 140, 700), bandpass(nz, 700, 2600)
            sig = low * np.interp(u, [0, 0.3, 0.65, 1], [0, 0.75, 0.45, 0])[:, None] + mid * np.interp(u, [0, 0.35, 0.6, 1], [0, 0.25, 0.7, 0])[:, None] * 0.6
        add_at(self.tr['sfx'], t0 - 0.3, sig * 0.05 * gain)

    def speed_whoosh(self, t0, t1, gain=1.0):
        """Souffle de vitesse pendant une accélération : l'air monte jusqu'à mi-chemin puis retombe à la ville suivante."""
        n = int((t1 - t0) * SR)
        if n <= 0:
            return
        u = np.arange(n) / n
        shape = np.sin(np.pi * u) ** 2
        nz = self.noise(n)
        low, mid, high = bandpass(nz, 180, 900), bandpass(nz, 900, 3200), bandpass(nz, 3200, 9000)
        sig = low * (shape ** 1.2)[:, None] * 0.8 + mid * (shape ** 1.6)[:, None] * 0.55 + high * (shape ** 2.4)[:, None] * 0.25
        # léger balayage stéréo : l'air passe d'un côté à l'autre
        sig[:, 0] *= 0.85 + 0.15 * np.cos(np.pi * u)
        sig[:, 1] *= 0.85 - 0.15 * np.cos(np.pi * u)
        add_at(self.tr["sfx"], t0, sig * 0.16 * gain)

    def tick(self, t, gain=1.0):
        """Petit déclic boisé : une commune de plus."""
        n = int(0.05 * SR)
        tt = np.arange(n) / SR
        ping = np.sin(2 * np.pi * self.rng.uniform(2300, 2700) * tt) * np.exp(-tt / 0.012)
        click = bandpass(self.rng.standard_normal(n), 1800, 6000) * np.exp(-tt / 0.004)
        sig = (ping * 0.5 + click * 0.6) * 0.14 * gain
        pan = self.rng.uniform(-0.3, 0.3)
        add_at(self.tr['sfx'], t, np.stack([sig * (1 - pan), sig * (1 + pan)], axis=1))

    def sub_hit(self, t, gain=1.0, f0=46, decay=2.0):
        n = int((decay * 3) * SR)
        tt = np.arange(n) / SR
        sig = np.sin(2 * np.pi * (f0 - 4 * tt / (decay * 3)) * tt) * np.exp(-tt / decay) * np.clip(tt / 0.02, 0, 1)
        sig += np.sin(2 * np.pi * 2 * f0 * tt) * np.exp(-tt / (decay * 0.5)) * 0.22
        add_at(self.tr['sfx'], t, np.stack([sig, sig], axis=1) * 0.3 * gain)

    def reverse_swell(self, t_end, dur=2.4, gain=1.0):
        n = int(dur * SR)
        tt = np.arange(n) / SR
        sig = highpass(self.noise(n), 2500) * ((tt / dur) ** 3)[:, None]
        add_at(self.tr['sfx'], t_end - dur, sig * 0.06 * gain)

    def ambience(self, t0, t1, gain=1.0):
        n = self.n
        amb = lowpass(highpass(self.noise(n), 90), 1100)
        amb *= 1 + 0.35 * np.sin(2 * np.pi * 0.07 * (np.arange(n) / SR)[:, None] + np.array([0.0, 1.3])[None, :])
        env = np.interp(np.arange(n) / SR, [0, t0, t0 + 1.5, t1 - 1.5, t1, self.dur + 1], [0, 0, 1, 1, 0, 0])
        self.tr['amb'] += amb * env[:, None] * 0.010 * gain

    # --- mixage & mastering
    def env(self, points):
        xs, ys = zip(*points)
        return np.interp(np.arange(self.n) / SR, xs, ys)

    def mix(self, arc_db, pad_env, str_env, target_lufs=-14.0, steps_gain=1.0, sfx_gain=1.0, music=True):
        rng = np.random.default_rng(7)
        ir_hall, ir_room = make_ir(rng, 3.4, 5.0), make_ir(rng, 1.9, 3.0, bright=5500)
        T = self.tr
        m = (reverb(T['piano'], ir_room, 0.55)
             + reverb(T['chimes'], ir_hall, 0.7) * 0.85
             + reverb(T['pad'], ir_hall, 0.7) * self.env(pad_env)[:, None]
             + reverb(T['strings'], ir_hall, 0.6) * self.env(str_env)[:, None]
             + reverb(T['cello'], ir_hall, 0.5))
        if not music:
            m *= 0
        m = m + reverb(T['sfx'], ir_hall, 0.35) * sfx_gain + reverb(T['steps'], ir_room, 0.25) * steps_gain + T['amb']
        m *= (10 ** (self.env(arc_db) / 20))[:, None]
        m *= self.env([(0, 1), (self.dur - 0.45, 1), (self.dur, 0), (self.dur + 1, 0)])[:, None]
        m = highpass(m - 0.4 * lowpass(m, 120), 38)
        return self.master(m[: int(self.dur * SR)], target_lufs)

    @staticmethod
    def master(x, target_lufs, ceil_db=-1.2):
        import pyloudnorm as pyln
        ceil = 10 ** (ceil_db / 20)
        meter = pyln.Meter(SR)

        def limit(x, look=0.005, release=0.12):
            up = np.abs(resample_poly(x, 4, 1, axis=0)).max(axis=1)
            pk = up.reshape(-1, 4).max(axis=1)[: len(x)]
            need = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
            la = int(look * SR)
            g = minimum_filter1d(need, size=2 * la + 1)
            a = np.exp(-1 / (release * SR))
            out, cur = np.empty_like(g), 1.0
            for i in range(0, len(g), 32):
                blk = g[i:i + 32].min()
                cur = blk if blk < cur else a ** 32 * cur + (1 - a ** 32) * blk
                out[i:i + 32] = cur
            return x * uniform_filter1d(out, size=la)[:, None]

        for _ in range(3):
            x = x * 10 ** ((target_lufs - meter.integrated_loudness(x)) / 20)
            x = limit(x)
        return x, meter.integrated_loudness(x)
