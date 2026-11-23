"""Ton für das 3D-Lernvideo „The Riemann Hypothesis – a visual journey“.

Schritt 1:  python3 riemann_audio.py voice
            Liest alle Erzähltexte aus riemann_explained_3d_video.js, spricht sie mit der
            Piper-Stimme en_US-ryan-high ein (Modell wird bei Bedarf von huggingface.co geladen)
            und schreibt die Längen nach riemann_narration.json. Das Video-Skript verlängert damit
            jede Szene so weit, dass der gesprochene Satz hineinpasst.
Schritt 2:  node riemann_explained_3d_video.js        (Video mit neuen Szenenlängen + Zeitplan)
Schritt 3:  python3 riemann_audio.py mix
            Erzeugt eine eigene Ambient-Musik (Flächen, Arpeggios, Bass, Effekte zum Titel und zum
            Sturzflug in den Pol), legt die Sprecherstimme darüber, senkt die Musik unter der Stimme ab
            und schreibt die Tonspur in riemann_explained_3d.mp4.

Benötigt: numpy, piper-tts, Node.js + Playwright (für Schritt 1), ffmpeg
"""
import json
import os
import re
import subprocess
import sys
import urllib.request
import wave

import numpy as np

HIER = os.path.dirname(os.path.abspath(__file__))
SR = 22050
STIMME = "en_US-ryan-high"
STIMMEN_DIR = os.path.join(HIER, "voices")
CACHE = os.path.join(HIER, "audio_cache")
NARR_JSON = os.path.join(HIER, "riemann_narration.json")
ZEITPLAN = os.path.join(HIER, "riemann_explained_3d_timeline.json")
VIDEO = os.path.join(HIER, "riemann_explained_3d.mp4")
rng = np.random.default_rng(1859)


# ------------------------------------------------------------------ Sprecher
def sprechbar(text):
    """Formelzeichen in Wörter verwandeln, damit die Stimme sie vorliest."""
    ersetzen = [("π(x)", "pi of x"), ("π²", "pi squared"), ("li(x)", "L I of x"), ("ψ(x)", "psi of x"),
                ("Z(t)", "Z of t"), ("ζ", "zeta"), ("π", "pi"), ("σ", "sigma"), ("½", "one half"),
                ("12,367", "twelve thousand three hundred and sixty-seven"), ("–", ", "), ("’", "'")]
    for a, b in ersetzen:
        text = text.replace(a, b)
    return re.sub(r"\s+", " ", text).strip()


def modell():
    os.makedirs(STIMMEN_DIR, exist_ok=True)
    onnx = os.path.join(STIMMEN_DIR, STIMME + ".onnx")
    basis = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/" + STIMME
    for endung in (".onnx", ".onnx.json"):
        ziel = onnx if endung == ".onnx" else onnx + ".json"
        if not os.path.exists(ziel):
            print("lade", basis + endung)
            urllib.request.urlretrieve(basis + endung, ziel)
    return onnx


def lies_wav(pfad):
    with wave.open(pfad) as w:
        assert w.getframerate() == SR, w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).mean(axis=1)
    return x


def schreib_wav(pfad, stereo):
    x = np.clip(stereo, -1, 1)
    with wave.open(pfad, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def schritt_voice():
    os.makedirs(CACHE, exist_ok=True)
    beats_json = os.path.join(CACHE, "beats.json")
    env = dict(os.environ, DUMP_BEATS=beats_json)
    if os.path.exists(NARR_JSON):
        os.remove(NARR_JSON)      # Texte ohne alte Längen auslesen
    subprocess.run(["node", os.path.join(HIER, "riemann_explained_3d_video.js")], env=env, check=True)
    beats = json.load(open(beats_json))
    onnx = modell()
    laengen = []
    for i, b in enumerate(beats):
        ziel = os.path.join(CACHE, f"voice_{i:02d}.wav")
        subprocess.run([sys.executable, "-m", "piper", "-m", onnx, "-f", ziel,
                        "--length-scale", "1.08", "--sentence-silence", "0.45"],
                       input=sprechbar(b["text"]).encode(), check=True, capture_output=True)
        laengen.append(round(len(lies_wav(ziel)) / SR, 3))
        print(f"{i:2d}  {laengen[-1]:5.1f} s  {b['text'][:60]}")
    json.dump({"voice": STIMME, "durations": laengen}, open(NARR_JSON, "w"), indent=1)
    print("geschrieben:", NARR_JSON, f"– gesprochen insgesamt {sum(laengen) / 60:.1f} min")


# ------------------------------------------------------------------ Musik
def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def huelle(n, an, ab):
    """weiche Ein- und Ausblendung (Samples)"""
    e = np.ones(n, np.float32)
    a, b = min(an, n // 2), min(ab, n // 2)
    if a: e[:a] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    if b: e[-b:] = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, b))
    return e


def addiere(spur, start, sig):
    i = int(start * SR)
    if i >= len(spur): return
    j = min(len(spur), i + len(sig))
    spur[i:j] += sig[: j - i]


def flaeche(noten, dauer, hell=1.0):
    """warme Fläche: je Ton zwei leicht verstimmte Oszillatoren mit drei Teiltönen"""
    n = int(dauer * SR); t = np.arange(n) / SR; out = np.zeros(n, np.float32)
    for m in noten:
        f = mtof(m)
        for verst in (-0.12, 0.12):
            ph = rng.uniform(0, 2 * np.pi)
            for k, a in ((1, 1.0), (2, 0.32 * hell), (3, 0.12 * hell)):
                out += (a * np.sin(2 * np.pi * f * k * (1 + verst / 100 * k) * t + ph * k)).astype(np.float32)
    return out / (len(noten) * 2.5)


def zupf(m, dauer=1.6, hall=0.35):
    n = int(dauer * SR); t = np.arange(n) / SR; f = mtof(m)
    e = np.exp(-t / hall) * (1 - np.exp(-t / 0.004))
    return (e * (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t))).astype(np.float32)


def rauschen_band(n, f_lo, f_hi):
    x = rng.standard_normal(n).astype(np.float32)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    X[(f < f_lo) | (f > f_hi)] = 0
    y = np.fft.irfft(X, n).astype(np.float32)
    return y / (np.abs(y).max() + 1e-9)


def hall(x, sek=2.4, mix=0.35, seed=0):
    """Faltungshall mit abklingendem Rauschen, blockweise per FFT"""
    r = np.random.default_rng(seed)
    m = int(sek * SR); ir = (r.standard_normal(m) * np.exp(-np.arange(m) / (SR * sek / 6))).astype(np.float32)
    ir /= np.sqrt((ir ** 2).sum())
    blk = 1 << 16; nfft = 1 << int(np.ceil(np.log2(blk + m)))
    H = np.fft.rfft(ir, nfft); y = np.zeros(len(x) + m, np.float32)
    for s in range(0, len(x), blk):
        seg = x[s:s + blk]
        y[s:s + nfft] += np.fft.irfft(np.fft.rfft(seg, nfft) * H, nfft)[: min(nfft, len(y) - s)]
    return (1 - mix) * x + mix * y[: len(x)] * 0.9


def glaetten(x, sek):
    k = max(1, int(sek * SR)); c = np.cumsum(np.concatenate([[0], x]))
    y = (c[k:] - c[:-k]) / k
    return np.concatenate([np.full(k - 1, y[0]), y]).astype(np.float32)


# Akkorde (MIDI): d-Moll-Klangwelt, am Schluss Auflösung nach D-Dur
AKK = {
    "Dm9": [38, 45, 53, 60, 64], "Bbmaj7": [34, 41, 50, 57, 62], "Fmaj9": [41, 48, 57, 64, 67],
    "Gm9": [43, 50, 58, 62, 69], "Am7": [45, 52, 60, 67, 72], "Cadd9": [36, 43, 52, 62, 67],
    "Dadd9": [38, 45, 54, 62, 64],
}
FOLGE = [["Dm9", "Bbmaj7", "Fmaj9", "Cadd9"], ["Dm9", "Gm9", "Bbmaj7", "Am7"]]
# je Szene: (Folge, Arpeggio-Töne pro Sekunde, Helligkeit)
SZENE = {0: (0, 0.0, 0.7), 1: (0, 1.5, 0.9), 2: (1, 2.5, 1.0), 3: (0, 3.0, 1.0), 4: (1, 2.0, 0.9),
         5: (0, 2.0, 0.9), 6: (1, 3.0, 1.1), 7: (0, 2.5, 1.1), 8: (1, 4.0, 1.2), 9: (0, 1.0, 0.8)}


def musik(zeitplan):
    total = zeitplan["total"]; beats = zeitplan["beats"]; n = int(total * SR) + SR
    L = np.zeros(n, np.float32); R = np.zeros(n, np.float32)
    szenen = []
    for b in beats:
        if not szenen or szenen[-1][0] != b["si"]: szenen.append([b["si"], b["start"], b["start"] + b["dur"]])
        else: szenen[-1][2] = b["start"] + b["dur"]
    szenen[-1][2] = total
    takt = 8.0
    for si, a, e in szenen:
        folge, dichte, hell_ = SZENE.get(si, (0, 2, 1))
        t = a; k = 0
        while t < e - 0.5:
            name = FOLGE[folge][k % 4]
            if si == 9 and t > e - 14: name = "Dadd9"          # Auflösung am Ende
            d = min(takt, e - t) + 3.0
            p = flaeche(AKK[name], d, hell_) * huelle(int(d * SR), int(2.2 * SR), int(3.0 * SR))
            addiere(L, t, p * 0.9); addiere(R, t, p * 0.9)
            bass = (np.sin(2 * np.pi * mtof(AKK[name][0] - 12) * np.arange(int(d * SR)) / SR) * 0.5).astype(np.float32) * huelle(int(d * SR), int(1.5 * SR), int(3 * SR))
            addiere(L, t, bass * 0.6); addiere(R, t, bass * 0.6)
            if dichte > 0:
                schritt = 1.0 / dichte; tt = t + 0.25; j = 0
                toene = sorted(set(AKK[name][2:] + [m + 12 for m in AKK[name][2:]]))
                while tt < t + min(takt, e - t) - 0.2:
                    m = toene[(j * 3 + (j // len(toene))) % len(toene)]
                    z = zupf(m, 1.8, 0.28 + 0.1 * (si == 8)) * (0.16 if j % 4 else 0.22)
                    pan = 0.5 + 0.35 * np.sin(j * 1.3)
                    addiere(L, tt, z * (1 - pan)); addiere(R, tt, z * pan)
                    tt += schritt; j += 1
            t += takt; k += 1
    # Effekte
    def zeit(si, bi):
        for b in beats:
            if b["si"] == si and b["bi"] == bi: return b["start"]
    t_titel = zeit(0, 1)
    if t_titel:
        sw = int(2.6 * SR); s = rauschen_band(sw, 2000, 9000) * np.linspace(0, 1, sw) ** 2 * 0.35
        addiere(L, t_titel - 2.3, s); addiere(R, t_titel - 2.3, s[::-1] * 0.8 + s * 0.2)
        bo = int(3 * SR); tb = np.arange(bo) / SR; boom = (np.sin(2 * np.pi * 48 * tb) * np.exp(-tb / 0.9) * 0.9).astype(np.float32)
        addiere(L, t_titel + 0.2, boom); addiere(R, t_titel + 0.2, boom)
        for m in (74, 81, 86):          # Glitzern
            g = zupf(m, 3.5, 1.2) * 0.12; addiere(L, t_titel + 0.4, g); addiere(R, t_titel + 0.55, g)
    t_dive = zeit(6, 3)
    if t_dive:
        d = int(2.6 * SR); tt = np.arange(d) / SR
        whoosh = rauschen_band(d, 300, 6000) * (tt / 2.6) ** 2 * 0.6
        ton = np.sin(2 * np.pi * np.cumsum(np.linspace(120, 900, d)) / SR) * (tt / 2.6) ** 2 * 0.18
        addiere(L, t_dive, (whoosh + ton).astype(np.float32)); addiere(R, t_dive, (whoosh * 0.9 + ton).astype(np.float32))
        tf = t_dive + 2.6; bo = int(4 * SR); tb = np.arange(bo) / SR
        boom = (np.sin(2 * np.pi * 38 * tb + 3 * np.exp(-tb / 0.1)) * np.exp(-tb / 1.4) * 1.0).astype(np.float32)
        addiere(L, tf, boom); addiere(R, tf, boom)
        rest = next(b for b in beats if b["si"] == 6 and b["bi"] == 3); dauer = rest["start"] + rest["dur"] - tf
        m = int(dauer * SR); tm = np.arange(m) / SR
        wind = rauschen_band(m, 800, 5000) * (0.18 + 0.1 * np.sin(2 * np.pi * 0.7 * tm)) * huelle(m, int(0.3 * SR), int(1.5 * SR))
        drone = (np.sin(2 * np.pi * 55 * tm) * 0.25 + np.sin(2 * np.pi * 82.5 * tm) * 0.12) * (1 + 0.5 * np.sin(2 * np.pi * 2.2 * tm)) * huelle(m, int(0.2 * SR), int(1.5 * SR))
        addiere(L, tf, (wind + drone).astype(np.float32)); addiere(R, tf, (wind[::-1] + drone).astype(np.float32))
    L = hall(L, seed=1); R = hall(R, seed=2)
    peak = max(np.abs(L).max(), np.abs(R).max())
    return L / peak, R / peak


def schritt_mix():
    zp = json.load(open(ZEITPLAN)); beats = zp["beats"]
    print("Musik …")
    L, R = musik(zp); n = len(L)
    stimme = np.zeros(n, np.float32)
    for i, b in enumerate(beats):
        v = lies_wav(os.path.join(CACHE, f"voice_{i:02d}.wav"))
        addiere(stimme, b["start"] + 0.35, v / (np.abs(v).max() + 1e-9) * 0.9)
    huelle_stimme = glaetten(glaetten(np.abs(stimme), 0.25), 0.6)
    duck = 1 - 0.62 * np.clip(huelle_stimme / 0.05, 0, 1)
    musik_pegel = 0.34
    links = stimme + L * duck * musik_pegel; rechts = stimme + R * duck * musik_pegel
    links = np.tanh(links * 1.1) / np.tanh(1.1); rechts = np.tanh(rechts * 1.1) / np.tanh(1.1)
    wav = os.path.join(CACHE, "mix.wav"); schreib_wav(wav, np.stack([links, rechts], 1))
    tmp = VIDEO.replace(".mp4", "_tmp.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", VIDEO, "-i", wav, "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-shortest", "-movflags", "+faststart", tmp], check=True)
    os.replace(tmp, VIDEO)
    print("fertig:", VIDEO)


if __name__ == "__main__":
    {"voice": schritt_voice, "mix": schritt_mix}[sys.argv[1] if len(sys.argv) > 1 else "mix"]()
