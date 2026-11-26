"""Ton für das 3D-Lernvideo „The Riemann Hypothesis – a visual journey“.

Schritt 1:  python3 riemann_audio.py voice
            Liest alle Erzähltexte aus riemann_explained_3d_video.js, spricht sie mit der
            Piper-Stimme en_US-ryan-high ein (Modell wird bei Bedarf von huggingface.co geladen)
            und schreibt die Längen nach riemann_narration.json. Das Video-Skript verlängert damit
            jede Szene so weit, dass der gesprochene Satz hineinpasst.
Schritt 2:  node riemann_explained_3d_video.js        (Video mit neuen Szenenlängen + Zeitplan)
Schritt 3:  python3 riemann_audio.py mix
            Erzeugt eine eigene futuristische Drum-and-Bass-Musik (Breakbeat um 172 BPM, Reese-Bass,
            Synth-Flächen, Laser-Sweeps, Einschläge zu jedem Kapitel, Shepard-Ton und voller DnB im Tunnel), legt die Sprecherstimme darüber, senkt die Musik unter der Stimme ab
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


# Klangwelt d-Moll mit A-Dur als Spannungsakkord, am Schluss Auflösung nach D-Dur
AKK = {
    "Dm": [38, 50, 57, 62, 65, 69], "Bb": [34, 46, 53, 58, 62, 65], "Gm": [43, 50, 55, 58, 62, 67],
    "A": [45, 52, 57, 61, 64, 69], "F": [41, 48, 53, 57, 60, 65], "C": [36, 48, 55, 60, 64, 67],
    "Dadd9": [38, 50, 57, 62, 66, 69, 76],
}
FOLGEN = [["Dm", "Bb", "Gm", "A"], ["Dm", "F", "C", "Bb"], ["Dm", "Bb", "F", "A"]]
def chor(noten, dauer, hell=1.0):
    """chorartige Fläche: vier verstimmte Stimmen mit langsamem Vibrato"""
    n = int(dauer * SR); t = np.arange(n) / SR; out = np.zeros(n, np.float32)
    for m in noten:
        f = mtof(m)
        for v in range(4):
            vib = 1 + 0.004 * np.sin(2 * np.pi * (4.5 + 0.7 * v) * t + v)
            ph = 2 * np.pi * f * (1 + (v - 1.5) * 0.0025) * np.cumsum(vib) / SR
            out += (np.sin(ph) + 0.35 * hell * np.sin(2 * ph) + 0.15 * hell * np.sin(3 * ph)).astype(np.float32)
    return out / (len(noten) * 6)


def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t / 0.035)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)).astype(np.float32)


def hat(lang=0.05):
    n = int(lang * SR); x = rauschen_band(n, 7000, 11000)
    return (x * np.exp(-np.arange(n) / (SR * lang / 4))).astype(np.float32) * 0.5


def einschlag(staerke=1.0):
    n = int(3.5 * SR); t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (36 + 40 * np.exp(-t / 0.08)) * t) * np.exp(-t / 1.1)
    rau = rauschen_band(n, 60, 2500) * np.exp(-t / 0.35) * 0.5
    return ((sub + rau) * staerke).astype(np.float32)


def anschwellen(dauer, lo=1500, hi=9000):
    n = int(dauer * SR); x = rauschen_band(n, lo, hi)
    return (x * np.linspace(0, 1, n) ** 2.2 * 0.45).astype(np.float32)


def shepard(dauer, oktaven_pro_s=0.35):
    """endlos steigender Ton"""
    n = int(dauer * SR); t = np.arange(n) / SR; out = np.zeros(n, np.float32)
    for k in range(7):
        pos = (k + oktaven_pro_s * t) % 7
        f = 40 * 2 ** pos
        a = np.exp(-((pos - 3.5) ** 2) / 2.0)
        out += (a * np.sin(2 * np.pi * np.cumsum(f) / SR)).astype(np.float32)
    return out / 4


def snare(staerke=1.0):
    n = int(0.25 * SR); t = np.arange(n) / SR
    rau = rauschen_band(n, 1200, 9000) * np.exp(-t / 0.07)
    ton = np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.05) * 0.6
    return ((rau + ton) * staerke).astype(np.float32)


def reese(m, dauer, verzerrt=0.0):
    """Reese-Bass: zwei gegeneinander verstimmte Sägezahn-Wellen, die sich langsam verschieben"""
    n = int(dauer * SR); t = np.arange(n) / SR; f = mtof(m); out = np.zeros(n, np.float32)
    for verst, ph0 in ((-0.6, 0.0), (0.6, 1.3)):
        ff = f * (1 + verst / 100 * (1 + 0.5 * np.sin(2 * np.pi * 0.25 * t)))
        ph = 2 * np.pi * np.cumsum(ff) / SR + ph0
        for k in range(1, 11):
            out += (np.sin(k * ph) / k * (0.75 ** (k - 1)) ** (1 - 0.5 * verzerrt)).astype(np.float32)
    out /= 3.0
    if verzerrt: out = np.tanh(out * (1 + 3 * verzerrt)) / np.tanh(1 + 3 * verzerrt)
    return out * huelle(n, int(0.01 * SR), int(0.05 * SR))


def laser(m):
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = mtof(m) * np.exp(-t / 0.08) + 80
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)).astype(np.float32)


# Szenenplan: (Akkordfolge, Drums 0 aus / 1 Halftime / 2 voller DnB, Reese-Lautstärke, Laser, Helligkeit der Fläche)
PLAN = {0: (0, 0, 0.5, 0, 0.8), 1: (1, 1, 0.45, 0, 0.9), 2: (0, 1, 0.5, 1, 1.0), 3: (1, 1, 0.5, 0, 1.0),
        4: (2, 2, 0.55, 1, 1.0), 5: (0, 1, 0.5, 1, 0.9), 6: (2, 2, 0.6, 1, 1.1), 7: (0, 2, 0.6, 1, 1.1),
        8: (1, 2, 0.65, 1, 1.2), 9: (2, 2, 0.55, 1, 1.0)}
BPM = 172.0


def drums_takt(st, t, stufe, g=1.0):
    """ein Takt Drum and Bass (4 Schläge); stufe 1 = Halftime, 2 = voller Breakbeat"""
    b = 60 / BPM
    if stufe == 1:
        st(kick(), t, 0.5, 0.55 * g); st(snare(0.9), t + 2 * b, 0.5, 0.45 * g)
        for q in range(8): st(hat(0.03), t + q * b / 2, 0.6, 0.12 * g)
    else:
        for x in (0, 2.5): st(kick(), t + x * b, 0.5, 0.65 * g)
        for x in (1, 3): st(snare(1.0), t + x * b, 0.5, 0.5 * g)
        st(snare(0.35), t + 3.75 * b, 0.45, 0.4 * g); st(snare(0.3), t + 1.75 * b, 0.55, 0.3 * g)
        for q in range(16): st(hat(0.025 if q % 2 else 0.04), t + q * b / 4, 0.62 if q % 2 else 0.4, (0.09 if q % 2 else 0.14) * g)


def musik(zeitplan):
    total = zeitplan["total"]; beats = zeitplan["beats"]; n = int(total * SR) + 2 * SR
    L = np.zeros(n, np.float32); R = np.zeros(n, np.float32)
    def st(sig, t, pan=0.5, g=1.0):
        addiere(L, t, sig * g * (1 - pan) * 2 ** 0.5); addiere(R, t, sig * g * pan * 2 ** 0.5)
    szenen = []
    for b in beats:
        if not szenen or szenen[-1][0] != b["si"]: szenen.append([b["si"], b["start"], b["start"] + b["dur"]])
        else: szenen[-1][2] = b["start"] + b["dur"]
    szenen[-1][2] = total
    def zeit(si, bi):
        for b in beats:
            if b["si"] == si and b["bi"] == bi: return b["start"], b["dur"]
        return None, None
    t_titel, _ = zeit(0, 1); t_dive, d_dive = zeit(6, 3); t_steig, d_steig = zeit(6, 2); t_ende, _ = zeit(9, 2)
    takt = 4 * 60 / BPM; akk_dauer = 2 * takt
    for si, a, e in szenen:
        folge, drums, rlaut, laser_an, hell = PLAN.get(si, (0, 1, 0.5, 0, 1))
        if si > 0:
            st(anschwellen(1.6), a - 1.7, 0.5, 0.7); st(einschlag(0.6), a + 0.05, 0.5, 1.0)
        t = a; k = 0
        while t < e - 0.3:
            if si == 6 and t_dive and t >= t_dive - 0.01: break
            ende_akk = min(t + akk_dauer, e)
            name = FOLGEN[folge][k % 4]
            ruhig = si == 9 and t_ende and t >= t_ende - 0.01
            if ruhig: name = "Dadd9"
            noten = AKK[name]; d = ende_akk - t + 2.0
            st(chor(noten[1:5], d, hell) * huelle(int(d * SR), int(1.5 * SR), int(2.5 * SR)), t, 0.5, 0.55)
            sub = (np.sin(2 * np.pi * mtof(noten[0] - 12) * np.arange(int(d * SR)) / SR) * 0.5).astype(np.float32) * huelle(int(d * SR), int(0.3 * SR), int(1.5 * SR))
            st(sub, t, 0.5, 0.8)
            if not ruhig:
                rd = ende_akk - t
                st(reese(noten[0], rd, 0.0) * huelle(int(rd * SR), int((1.2 if si == 0 else 0.05) * SR), int(0.3 * SR)), t, 0.5, rlaut)
                if drums and not (si == 0):
                    tt = t
                    while tt < ende_akk - 0.05: drums_takt(st, tt, drums, 0.9 if drums == 2 else 0.8); tt += takt
                if laser_an:
                    for _ in range(2):
                        st(laser(int(rng.choice([74, 79, 81, 86]))), t + rng.uniform(0, ende_akk - t), rng.uniform(0.15, 0.85), 0.12)
            t += akk_dauer; k += 1
    if t_titel:
        st(anschwellen(2.4, 800, 9000), t_titel - 2.3, 0.5, 0.9); st(einschlag(1.0), t_titel + 0.15, 0.5, 1.0)
    if t_steig:
        st(shepard(d_steig, 0.25) * np.linspace(0.2, 1, int(d_steig * SR)).astype(np.float32), t_steig, 0.5, 0.2)
    if t_dive:                                        # Sturzflug + Tunnel: voller Drum and Bass mit verzerrtem Reese
        d = int(2.6 * SR); tt = np.arange(d) / SR
        whoosh = rauschen_band(d, 300, 7000) * (tt / 2.6) ** 2 * 0.8
        ton = np.sin(2 * np.pi * np.cumsum(np.linspace(110, 1300, d)) / SR) * (tt / 2.6) ** 2 * 0.25
        st((whoosh + ton).astype(np.float32), t_dive, 0.5, 1.0)
        b = 60 / BPM; x = t_dive; j = 0
        while x < t_dive + 2.5: st(snare(0.3 + 0.7 * j / 20), x, 0.5, 0.35); x += b / (2 if j < 8 else 4); j += 1   # Snare-Wirbel
        tf = t_dive + 2.6; st(einschlag(1.4), tf, 0.5, 1.0)
        dauer = t_dive + d_dive - tf; m = int(dauer * SR); tm = np.arange(m) / SR
        env = huelle(m, int(0.2 * SR), int(1.8 * SR))
        st(shepard(dauer, 0.6) * env, tf, 0.5, 0.25)
        wind = rauschen_band(m, 900, 6000) * (0.2 + 0.12 * np.sin(2 * np.pi * 0.5 * tm)) * env
        addiere(L, tf, wind * 0.4); addiere(R, tf, wind[::-1] * 0.4)
        x = tf; j = 0; riff = [26, 26, 29, 24]
        while x < tf + dauer - 1.0:
            drums_takt(st, x, 2, 1.15)
            st(reese(riff[j % 4] + 12, takt, 0.8), x, 0.5, 0.7)
            if j % 4 == 3:                            # Fill: Snare-Wirbel am Ende jeder Phrase
                for q in range(8): st(snare(0.4 + 0.07 * q), x + 3 * b + q * b / 8, 0.5, 0.3)
            st(laser(86), x + 1.5 * b, 0.3, 0.12); st(laser(81), x + 3.5 * b, 0.7, 0.12)
            x += takt; j += 1
    L = hall(L, 2.0, 0.22, seed=1); R = hall(R, 2.0, 0.22, seed=2)
    peak = max(np.abs(L).max(), np.abs(R).max())
    return L / peak, R / peak


# ------------------------------------------------------------------ Filmmusik aus echten Stücken (Kevin MacLeod, CC BY 4.0)
TRACK_URL = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/"
TRACKS = os.path.join(CACHE, "tracks")
CREDIT = ("Music: Kevin MacLeod (incompetech.com) – Rynos Theme, Floating Cities, Interloper, "
          "Volatile Reaction, Lost Frontier, Long Note Two, Heroic Age – licensed under CC BY 4.0")


def track(name):
    os.makedirs(TRACKS, exist_ok=True)
    mp3 = os.path.join(TRACKS, name + ".mp3")
    if not os.path.exists(mp3):
        urllib.request.urlretrieve(TRACK_URL + name.replace(" ", "%20") + ".mp3", mp3)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def einsatz(x, ziel_s, um_s=0.6):
    """starken Einsatz (Onset) in der Nähe von ziel_s finden, damit ein Schnitt auf dem Schlag liegt"""
    m = np.abs(x[:, 0]) + np.abs(x[:, 1]); hop = 256
    a = max(0, int((ziel_s - um_s) * SR)); b = min(len(m) - hop, int((ziel_s + um_s) * SR))
    e = np.array([m[i:i + hop].sum() for i in range(a, b, hop)])
    if len(e) < 3: return ziel_s
    return (a + hop * (int(np.argmax(np.diff(e))) + 1)) / SR


def db_rms(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)


def lade_score(zp=None):
    """Szenen-genau geschnittene Filmmusik aus sieben Stücken, mit Überblendungen und Lautstärkedramaturgie"""
    zp = zp or json.load(open(ZEITPLAN)); beats = zp["beats"]; total = zp["total"]
    def start(si, bi=0):
        for b in beats:
            if b["si"] == si and b["bi"] == bi: return b["start"]
    t_dive = start(6, 3); t_flash = t_dive + 2.6
    # (Stück, Versatz im Stück [s], von, bis, Ziel-Lautstärke dB, Einblendung s, Ausblendung s)
    plan = [
        # Rynos Theme als Leitmotiv: leiser Beginn, Höhepunkt 1 auf dem Titel, ruhiger Mittelteil ...
        ("Rynos Theme", None, 0.0, 89.0, -20, 1.5, 3.0),
        ("Floating Cities", 2.0, 86.0, start(5) - 14.0, -22, 3.0, 2.5),
        # ... und Rückkehr: Steigerung, der große Höhepunkt 2 fällt auf Riemanns Auftritt (1859)
        ("Rynos Theme 2", None, start(5) - 16.0, start(6) + 1.0, -18, 2.5, 1.5),
        ("Interloper", 0.0, start(6) - 1.0, t_dive + 0.4, -20, 2.0, 0.4),
        ("Volatile Reaction", None, t_dive, start(7) + 1.0, -14, 0.05, 1.8),
        ("Lost Frontier", 0.0, start(7) - 0.5, start(8) + 1.0, -23, 2.5, 2.0),
        ("Long Note Two", 95.0, start(8) - 1.0, start(9) + 1.0, -27, 2.0, 2.0),
        ("Heroic Age", None, start(9) - 1.0, total, -18, 2.0, 2.5),
    ]
    n = int((total + 1) * SR); out = np.zeros((n, 2), np.float32)
    for name, off, a, e, ziel, ein, aus in plan:
        x = track(name.replace(" 2", "") if name == "Rynos Theme 2" else name)
        if name == "Rynos Theme 2":                      # Höhepunkt 2 des Stücks (ab 2:00) genau auf Riemanns ersten Satz
            off = einsatz(x, 120.0, 0.8) - (start(5) - a)
        if name == "Rynos Theme":                        # der große Orchestereinsatz fällt genau auf den Titel
            off = einsatz(x, 30.0, 0.8) - start(0, 1)
        if name == "Volatile Reaction":                  # ein starker Schlag des Stücks fällt genau auf den Blitz
            off = einsatz(x, 40.0, 2.0) - (t_flash - t_dive)
        if name == "Heroic Age":                         # das Ende des Stücks fällt auf das Ende des Videos
            off = max(0.0, len(x) / SR - (e - a) - 0.3)
        seg = x[int(off * SR): int(off * SR) + int((e - a) * SR)]
        seg = seg * 10 ** ((ziel - db_rms(seg)) / 20)
        k = len(seg); env = huelle(k, int(ein * SR), int(aus * SR))
        if name == "Floating Cities":                    # wird zum Ende hin lauter und leitet in die Steigerung über
            env = env * np.interp(np.arange(k) / SR, [0, k / SR - 22, k / SR], [0.85, 0.85, 1.35]).astype(np.float32)
        if name == "Interloper":                         # Crescendo bis zum Sturzflug
            env = env * np.linspace(0.55, 1.25, k, dtype=np.float32)
        seg = seg * env[:, None]
        i = int(a * SR); j = min(n, i + k); out[i:j] += seg[: j - i]
    return out[:, 0].copy(), out[:, 1].copy()


def nullstellen_toene(zp, n):
    """Musik der Primzahlen: jede Nullstelle als Ton (Tonhöhe ~ t, Lautstärke ~ 1/t, wie ihr Gewicht in ψ(x));
    die Töne setzen genau ein, wenn im Bild die entsprechende Welle hinzukommt"""
    beats = zp["beats"]
    b2 = next(b for b in beats if b["si"] == 8 and b["bi"] == 2); b3 = next(b for b in beats if b["si"] == 8 and b["bi"] == 3)
    ende = b3["start"] + b3["dur"]
    zeros = json.load(open(os.path.join(CACHE, "zeros138.json"))) if os.path.exists(os.path.join(CACHE, "zeros138.json")) else None
    if zeros is None:
        import mpmath
        zeros = [float(mpmath.zetazero(k).imag) for k in range(1, 139)]
    seq = [1, 2, 3, 5, 10, 20, 40]
    einsatz_t = [None] * len(zeros)
    for k in range(len(zeros)):
        for q, cnt in enumerate(seq):                   # gleiche Abfolge wie im Bild (alle 1.9 s)
            if k < cnt: einsatz_t[k] = b2["start"] + q * 1.9; break
        if einsatz_t[k] is None:                         # danach bis 138 über 6 s, wie im Bild mit smoothstep
            s_ = min(max((k + 1 - 40) / (len(zeros) - 40), 0.0), 1.0)
            u = 0.5 - np.sin(np.arcsin(1 - 2 * s_) / 3)    # Umkehrung von u²(3 − 2u)
            einsatz_t[k] = b3["start"] + 6 * float(u)
    L = np.zeros(n, np.float32); R = np.zeros(n, np.float32)
    for k, (g, t0) in enumerate(zip(zeros, einsatz_t)):
        d = ende - t0 + 1.5
        if d <= 0: continue
        m = int(d * SR); t = np.arange(m) / SR; f = 110.0 * g / zeros[0]
        ton = (np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)) * (zeros[0] / g)
        ton = (ton * huelle(m, int(0.25 * SR), int(1.8 * SR))).astype(np.float32)
        pan = 0.5 + 0.3 * np.sin(k * 2.399)
        addiere(L, t0, ton * (1 - pan)); addiere(R, t0, ton * pan)
    p = max(np.abs(L).max(), np.abs(R).max()) + 1e-9
    return L / p, R / p


def effekte(zp, n):
    """Whoosh, Einschläge und Steigton aus der Synthese, passend auf Titel und Sturzflug gesetzt"""
    L = np.zeros(n, np.float32); R = np.zeros(n, np.float32)
    beats = zp["beats"]
    def zeit(si, bi):
        for b in beats:
            if b["si"] == si and b["bi"] == bi: return b["start"], b["dur"]
        return None, None
    t_titel, _ = zeit(0, 1); t_dive, _ = zeit(6, 3)
    if t_titel:
        s = anschwellen(2.4, 800, 9000) * 0.9; addiere(L, t_titel - 2.3, s); addiere(R, t_titel - 2.3, s)
        b = einschlag(1.0); addiere(L, t_titel + 0.15, b); addiere(R, t_titel + 0.15, b)
    if t_dive:
        d = int(2.6 * SR); tt = np.arange(d) / SR
        w = (rauschen_band(d, 300, 7000) * (tt / 2.6) ** 2 * 0.8).astype(np.float32)
        addiere(L, t_dive, w); addiere(R, t_dive, w)
        b = einschlag(1.4); addiere(L, t_dive + 2.6, b); addiere(R, t_dive + 2.6, b)
    return L, R


STIMME_PEGEL, MUSIK_PEGEL, DUCK = 0.55, 0.8, 0.4


def schritt_mix():
    zp = json.load(open(ZEITPLAN)); beats = zp["beats"]
    print("Musik: Kevin MacLeod, szenengenau geschnitten, + Nullstellen-Töne + Effekte")
    L, R = lade_score(zp); n = len(L)
    fl, fr = effekte(zp, n); L = L + 0.25 * fl; R = R + 0.25 * fr
    tl, tr = nullstellen_toene(zp, n); L = L + 0.09 * tl; R = R + 0.09 * tr
    p = max(np.abs(L).max(), np.abs(R).max()); L /= p; R /= p
    stimme = np.zeros(n, np.float32)
    for i, b in enumerate(beats):
        v = lies_wav(os.path.join(CACHE, f"voice_{i:02d}.wav"))
        addiere(stimme, b["start"] + 0.35, v / (np.abs(v).max() + 1e-9) * STIMME_PEGEL)
    huelle_stimme = glaetten(glaetten(np.abs(stimme), 0.25), 0.6)
    duck = 1 - DUCK * np.clip(huelle_stimme / 0.04, 0, 1)
    links = stimme + L * duck * MUSIK_PEGEL; rechts = stimme + R * duck * MUSIK_PEGEL
    links = np.tanh(links * 1.1) / np.tanh(1.1); rechts = np.tanh(rechts * 1.1) / np.tanh(1.1)
    wav = os.path.join(CACHE, "mix.wav"); schreib_wav(wav, np.stack([links, rechts], 1))
    # Bild-Master ohne Ton und ohne Einblendung sichern (nach jedem neuen Rendern löschen!)
    master = os.path.join(CACHE, "video_master.mp4")
    if not os.path.exists(master) or os.path.getmtime(master) < os.path.getmtime(ZEITPLAN):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", VIDEO, "-map", "0:v", "-c:v", "copy", master], check=True)
    # Namensnennung (CC BY 4.0) in den letzten Sekunden einblenden
    t_end = zp["total"] - 4.2
    font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    zeilen = ["Music: Kevin MacLeod (incompetech.com), licensed under CC BY 4.0",
              "Rynos Theme · Floating Cities · Interloper · Volatile Reaction · Lost Frontier · Long Note Two · Heroic Age",
              "Voice: Piper TTS (en_US-ryan-high)"]
    # Farbabstimmung: dämpft knallige, gesättigte Farben und weiche Spitzlichter (angenehmer auf Handys)
    # bis vor die Regenbogenflächen (Szene 06) etwas satter (Türme, Kurven, Summen), danach leicht gedämpft
    t6 = next(b["start"] for b in beats if b["si"] == 6)
    GRADE = (f"curves=all='0/0 0.6/0.6 0.88/0.83 1/0.92',vibrance=intensity=0.25:enable='lt(t,{t6:.2f})',"
             f"vibrance=intensity=-0.15:enable='gte(t,{t6:.2f})'")
    filt = GRADE + "," + ",".join(f"drawtext=fontfile={font}:text='{z.replace(':', chr(92) + ':')}':fontcolor=0xB8C0E0:fontsize={27 if i else 30}:x=(w-text_w)/2:y=h-{180 - 45 * i}:enable='gte(t,{t_end:.2f})':alpha='min(1,(t-{t_end:.2f})/0.8)'"
                    for i, z in enumerate(zeilen))
    tmp = VIDEO.replace(".mp4", "_tmp.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", master, "-i", wav, "-map", "0:v", "-map", "1:a", "-vf", filt,
                    "-c:v", "libx264", "-crf", "24", "-preset", "medium", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-shortest", "-movflags", "+faststart", tmp], check=True)
    os.replace(tmp, VIDEO)
    print("fertig:", VIDEO)


if __name__ == "__main__":
    {"voice": schritt_voice, "mix": schritt_mix}[sys.argv[1] if len(sys.argv) > 1 else "mix"]()
