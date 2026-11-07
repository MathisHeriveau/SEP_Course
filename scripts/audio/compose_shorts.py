"""
Bandes-son des shorts : la musique originale du documentaire, RÉARRANGÉE depuis sa partition
(mêmes thèmes, même piano, mêmes harmonies, même tempo) pour 57,6 s, 30,4 s et 15,2 s.
Chaque coupe, chaque chiffre, chaque ville et l'arrivée tombent sur un temps de la musique.

Usage : .venv/bin/python -I scripts/audio/compose_shorts.py [principal|s30|teaser ...]
Sorties : public/audio/shorts/<id>.wav (musique + design sonore)
          public/audio/shorts/<id>-sans-musique.wav (design sonore seul : pas, souffles, impacts)
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import ANSWER, CLIMB, MOTIF_PROLOGUE, ROOT, SR, THEME, Score, tones, bass_of, p  # noqa: E402

EV = json.load(open(os.path.join(ROOT, 'data/generated/shorts-events.json')))
CFG = {'targetLufs': -14.0, 'footsteps': True, 'footstepsGain': 0.5}
OUT = os.path.join(ROOT, 'public/audio/shorts')
os.makedirs(OUT, exist_ok=True)


def common_sfx(s, ev, steps_bars=1):
    """Design sonore partagé : pas, comète, vols de caméra, impacts, villes, arrivée, ambiance."""
    # Les pas : un par temps sur la première mesure, de plus en plus discrets
    for k in range(4 * steps_bars):
        s.footstep(k * 0.8 + 0.02, gain=CFG['footstepsGain'] * (1 - 0.12 * k))
    for c in ev['comet']:
        s.whoosh(c['t0'], c['t1'], gain=0.55, rising=True)
    for f in ev['flies']:
        s.whoosh(f['t0'], f['t1'], gain=0.8)
    for h in ev['displayHits']:
        if '556' in h['text'] and '{km}' not in h['text']:
            s.sub_hit(h['t'], gain=0.75)
            s.pl(h['t'], 26, 74, 2.4, human=0)
            s.pl(h['t'], 38, 68, 2.4, human=0)
    for tw in ev['towns']:
        s.chime(round(tw['t'] / 0.4) * 0.4, low=False)
    # Accélérations : souffle de vitesse, proportionné à l'allure
    for seg in ev.get('segments', []):
        if seg['kmPerSec'] > 8:
            s.speed_whoosh(seg['t0'], seg['t1'], gain=min(1.25, max(0.45, seg['kmPerSec'] / 55)))
    # Une commune de plus : un déclic, au plus un tous les 0,12 s (comme un compteur qui tourne)
    last = -1.0
    for t in ev.get('communeTicks', []):
        if t - last >= 0.12:
            s.tick(t, gain=0.9)
            last = t
    # Deux pas à chaque ville où le marcheur ralentit (et au départ)
    for tw in ev['towns']:
        b = round(tw['t'] / 0.4) * 0.4
        s.footstep(b - 0.8, gain=0.5)
        s.footstep(b, gain=0.42)
    if ev['arrival'] is not None:
        s.reverse_swell(ev['arrival'], 2.6)
        s.sub_hit(ev['arrival'], gain=1.0, decay=2.4)
    map_start = ev['cuts'][1]['t'] if len(ev['cuts']) > 1 else 0.0
    s.ambience(map_start, ev['durationSec'] - 1.0, gain=0.9)


# =============================================================================
def principal():
    ev = EV['principal']
    prog = ['Dadd9', 'Bm7', 'Gmaj7', 'Asus4>A',
            'D', 'A/C#', 'Bm', 'G', 'Em7', 'A',
            'G', 'A', 'Asus4>A',
            'D', 'Dadd9',
            'Bm', 'G>Asus4', 'Dadd9']
    s = Score(prog, ev['durationSec'])
    T = s.t
    # 0 — l'accroche : un accord dès la première image, le motif d'ouverture
    s.rolled(0.0, [38, 45, 50, 54], 56, 3.4, 0.03)
    s.melody(0, [MOTIF_PROLOGUE[0], MOTIF_PROLOGUE[1], MOTIF_PROLOGUE[2]], 56)
    s.pl(T(0, 3), 'A5', 54, 1.0)  # « 556 KM »
    # 1 — « pour elle. » sur le temps fort ; la carte s'ouvre
    s.rolled(T(1), [35, 47, 50, 54, 57], 60, 3.4, 0.03)
    s.melody(1, [(0, 0, 'F#5', 1), (0, 1, 'E5', 3)], 54)
    # 2 — 6 départements, 128 communes
    s.left_halves(2, 46)
    s.pl(T(2), 'D6', 56, 1.4)
    s.pl(T(2), 43, 56, 2.0)
    s.pl(T(2, 1), 'B5', 54, 1.6)
    s.melody(2, [(0, 2, 'D5', 2)], 48)
    # 3 — plongée vers Noaillan
    s.left_halves(3, 42)
    s.melody(3, [(0, 0, 'D5', 2), (0, 2, 'C#5', 2)], 46)
    # 4–8 — la marche : l'arpège en croches est le pas ; le thème du film
    for i, b in enumerate(range(4, 9)):
        s.left_eighths(b, 42 + 3 * i, accent=5 + i)
    s.melody(4, THEME, 54)
    s.melody(8, [ANSWER[0], ANSWER[1], ANSWER[2]], 58, double=True)
    # 9 — recul : la musique respire
    s.left_halves(9, 50)
    s.melody(9, [(0, 0, 'C#5', 3), (0, 3, 'E5', 1)], 54)
    # 10–12 — les derniers kilomètres : montée
    s.left_eighths(10, 56, accent=9)
    s.left_eighths(11, 60, accent=10)
    s.melody(10, [CLIMB[0], CLIMB[1], CLIMB[2], CLIMB[3], CLIMB[4]], 66, double=True)
    s.repeated_chords(12, 54, 1.6)
    # 13 — l'arrivée
    s.big_d(T(13), 92)
    # 14 — respiration
    for k, n in enumerate(['A5', 'D6', 'F#6', 'A6', 'E6', 'D6']):
        s.pl(T(14, k * 0.66), n, 44 - 2 * k, 2.6, 0.8)
    s.pl(T(14, 2), 50, 46, 2.0)
    s.pl(T(14, 2), 'A4', 46, 2.0)
    # 15–17 — le message
    s.left_halves(15, 44)
    s.melody(15, [(0, 0, 'F#5', 2), (0, 2, 'D5', 2)], 48)
    s.left_halves(16, 40)
    s.melody(16, [(0, 0, 'D5', 2), (0, 2, 'E5', 2)], 46)
    s.rolled(T(17), [38, 45, 50, 54, 57, 64, 66, 69, 74], 48, 4.0, 0.11)
    # nappes, cordes, violoncelle
    for b in range(1, 18):
        s.pad_bar(b, 0.09, 700 + 700 * min(1, max(0, (b - 4) / 9)))
    for b in range(5, 17):
        s.pad_bar(b, 0.06, 1600 + 1200 * min(1, (b - 5) / 8), 'strings', 4, 0.8)
    for b in range(10, 15):
        s.pad_bar(b, 0.045, 2800, 'strings', 5, 0.9)
    for b in range(8, 16):
        s.cello_bar(b)
    common_sfx(s, ev)
    s.footstep(T(17, 1.5), gain=0.35)
    s.footstep(T(17, 2.5), gain=0.25)
    arc = [(0, -2), (3.2, -2.5), (6.4, -2.5), (9.6, -3), (12.8, -3.5), (25.6, -2.5), (32, -3), (38, -3.5), (41.4, -3.5), (41.6, 3.5), (45, 1.0), (46.4, -1), (54.4, -2.5), (57.6, -3)]
    pad = [(0, 0), (3.2, 0.8), (12.8, 0.9), (41.6, 1.2), (48, 0.8), (57.6, 0.5)]
    strs = [(0, 0), (16, 0.6), (32, 0.9), (41.6, 1.25), (46, 1.0), (52, 0.6), (57.6, 0.3)]
    return s, arc, pad, strs


def s30():
    ev = EV['s30']
    prog = ['Dadd9', 'Bm7', 'D', 'A/C#', 'Bm', 'G', 'Asus4>A', 'D', 'G>Asus4', 'Dadd9']
    s = Score(prog, ev['durationSec'])
    T = s.t
    s.rolled(0.0, [26, 38, 45, 50, 54], 64, 3.4, 0.02)  # « 556 KM » dès l'image 0
    s.melody(0, [(0, 1, 'D5', 1), (0, 2, 'F#5', 2)], 54)
    s.rolled(T(1), [35, 47, 50, 54, 57], 58, 3.4, 0.03)
    s.melody(1, [(0, 0, 'F#5', 1), (0, 1, 'E5', 3)], 52)
    for i, b in enumerate(range(2, 6)):
        s.left_eighths(b, 44 + 3 * i, accent=6 + i)
    s.melody(2, THEME, 56)
    s.repeated_chords(6, 54, 1.6)
    s.big_d(T(7), 92)
    s.melody(7, [(0, 3, 'A5', 1)], 46)
    s.left_halves(8, 42)
    s.melody(8, [(0, 0, 'D5', 2), (0, 2, 'E5', 2)], 46)
    s.rolled(T(9), [38, 45, 50, 54, 57, 64, 66, 69, 74], 48, 2.6, 0.09)
    for b in range(1, 10):
        s.pad_bar(b, 0.09, 800 + 600 * min(1, b / 6))
    for b in range(2, 9):
        s.pad_bar(b, 0.06, 1800 + 1000 * min(1, (b - 2) / 5), 'strings', 4, 0.8)
    for b in range(4, 8):
        s.cello_bar(b)
    common_sfx(s, ev)
    arc = [(0, -2), (3.2, -3), (6.4, -3.5), (16, -2.5), (19.2, -3), (22.2, -2.5), (22.4, 2.5), (24.8, -1), (28.8, -2.5), (30.4, -3)]
    pad = [(0, 0), (3.2, 0.8), (22.4, 1.2), (30.4, 0.6)]
    strs = [(0, 0), (6.4, 0.6), (19.2, 1.0), (22.4, 1.25), (26, 0.7), (30.4, 0.3)]
    return s, arc, pad, strs


def teaser():
    ev = EV['teaser']
    prog = ['Dadd9', 'Bm7', 'G>Asus4', 'D', 'Dadd9']
    s = Score(prog, ev['durationSec'])
    T = s.t
    s.rolled(0.0, [38, 45, 50, 54], 56, 3.4, 0.03)
    s.melody(0, [MOTIF_PROLOGUE[0], MOTIF_PROLOGUE[1], MOTIF_PROLOGUE[2]], 56)
    # le trait de lumière se dessine (2,4 → 9,6 s) : la marche s'accélère, puis monte
    s.left_eighths(1, 48, accent=7)
    s.melody(1, [(0, 0, 'F#5', 1), (0, 1, 'E5', 2), (0, 3, 'D5', 1)], 56)
    s.repeated_chords(2, 54, 1.8)
    s.big_d(T(3), 92)
    s.melody(3, [(0, 3, 'A5', 1)], 46)
    s.rolled(T(4), [38, 45, 50, 54, 57, 64, 66, 69, 74], 46, 2.4, 0.08)
    for b in range(1, 5):
        s.pad_bar(b, 0.09, 900 + 400 * b)
    for b in range(1, 4):
        s.pad_bar(b, 0.06, 2000 + 400 * b, 'strings', 4, 0.8)
    s.cello_bar(2)
    s.cello_bar(3)
    common_sfx(s, ev)
    arc = [(0, -2), (2.4, -2.5), (6.4, -3), (9.4, -2.5), (9.6, 2.5), (12.4, -1.5), (15.2, -2.5)]
    pad = [(0, 0), (3.2, 0.8), (9.6, 1.2), (15.2, 0.6)]
    strs = [(0, 0), (3.2, 0.6), (9.6, 1.25), (15.2, 0.4)]
    return s, arc, pad, strs


BUILDERS = {'principal': principal, 's30': s30, 'teaser': teaser}

if __name__ == '__main__':
    ids = sys.argv[1:] or list(BUILDERS)
    for sid in ids:
        s, arc, pad, strs = BUILDERS[sid]()
        for music in (True, False):
            x, lufs = s.mix(arc, pad, strs, target_lufs=CFG['targetLufs'] if music else CFG['targetLufs'] - 6, music=music)
            path = os.path.join(OUT, f'{sid}.wav' if music else f'{sid}-sans-musique.wav')
            sf.write(path, x.astype(np.float32), SR, subtype='PCM_24')
            print(f'{sid}{"" if music else " (sans musique)"} : {len(x) / SR:.2f} s, {lufs:.1f} LUFS → {os.path.relpath(path, ROOT)}')
