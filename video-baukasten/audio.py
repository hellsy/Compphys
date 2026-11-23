"""video-baukasten: Ton für ein Drehbuch – Sprecher (Piper, Stimme Ryan) und Filmmusik (Kevin MacLeod, CC BY 4.0).

Ablauf für ein Drehbuch pfad/name.js:
  1. python3 video-baukasten/audio.py voice pfad/name.js   → spricht alle Sätze ein, schreibt name.narration.json
  2. node video-baukasten/baukasten.js pfad/name.js        → Bild (Szenen passend zur Sprechlänge)
  3. python3 video-baukasten/audio.py mix pfad/name.js     → Musik + Sprecher + Credits → name.mp4

Musik und Effekte stehen in name.musik.json, z. B.:
  {"tracks": [{"stueck": "Echoes of Time v2", "von": 0, "bis": 2, "versatz": 0, "db": -21},
              {"stueck": "Interloper", "von": 2, "bis": null, "versatz": 0, "db": -20, "crescendo": true}],
   "einschlaege": [[1, 0]]}          # Einschlag + Anschwellen zu Beginn von Szene 1, Satz 0
  von/bis = Szenennummern (bis = null: bis zum Ende). Stücke: https://incompetech.com (Kevin MacLeod)
Benötigt: numpy, piper-tts, ffmpeg; Netz: huggingface.co (Stimme), incompetech.com (Musik)
"""
import json
import os
import re
import subprocess
import sys
import urllib.request
import wave

import numpy as np

BK = os.path.dirname(os.path.abspath(__file__))
SR = 22050
STIMME = "en_US-ryan-high"
STIMMEN_DIR = os.path.join(BK, "voices")
TRACK_URL = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/"
STIMME_PEGEL, MUSIK_PEGEL, DUCK = 0.55, 0.8, 0.4
rng = np.random.default_rng(1859)


def pfade(drehbuch):
    name = os.path.splitext(os.path.abspath(drehbuch))[0]
    cache = name + "_audio"
    os.makedirs(cache, exist_ok=True)
    return name, cache


# ------------------------------------------------------------------ Sprecher
def sprechbar(text):
    for a, b in [("π", "pi"), ("ζ", "zeta"), ("ρ", "rho"), ("ψ", "psi"), ("σ", "sigma"), ("½", "one half"), ("–", ", "), ("’", "'")]:
        text = text.replace(a, b)
    return re.sub(r"\s+", " ", text).strip()


def modell():
    os.makedirs(STIMMEN_DIR, exist_ok=True)
    onnx = os.path.join(STIMMEN_DIR, STIMME + ".onnx")
    basis = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/" + STIMME
    for endung, ziel in ((".onnx", onnx), (".onnx.json", onnx + ".json")):
        if not os.path.exists(ziel):
            urllib.request.urlretrieve(basis + endung, ziel)
    return onnx


def lies_wav(pfad):
    with wave.open(pfad) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        return x.reshape(-1, w.getnchannels()).mean(axis=1)


def voice(drehbuch):
    name, cache = pfade(drehbuch)
    beats_json = os.path.join(cache, "beats.json")
    if os.path.exists(name + ".narration.json"):
        os.remove(name + ".narration.json")
    subprocess.run(["node", os.path.join(BK, "baukasten.js"), drehbuch], env=dict(os.environ, DUMP_BEATS=beats_json), check=True)
    beats = json.load(open(beats_json)); onnx = modell(); laengen = []
    for i, b in enumerate(beats):
        ziel = os.path.join(cache, f"voice_{i:02d}.wav")
        subprocess.run([sys.executable, "-m", "piper", "-m", onnx, "-f", ziel, "--length-scale", "1.08", "--sentence-silence", "0.45"],
                       input=sprechbar(b["text"]).encode(), check=True, capture_output=True)
        laengen.append(round(len(lies_wav(ziel)) / SR, 3))
        print(f"{i:2d}  {laengen[-1]:5.1f} s  {b['text'][:60]}")
    json.dump({"voice": STIMME, "durations": laengen}, open(name + ".narration.json", "w"), indent=1)


# ------------------------------------------------------------------ Musik und Effekte
def huelle(n, an, ab):
    e = np.ones(n, np.float32); a, b = min(an, n // 2), min(ab, n // 2)
    if a: e[:a] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    if b: e[-b:] = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, b))
    return e


def addiere(spur, start, sig):
    i = int(start * SR)
    if 0 <= i < len(spur):
        j = min(len(spur), i + len(sig)); spur[i:j] += sig[: j - i]


def rauschen(n, lo, hi):
    X = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR); X[(f < lo) | (f > hi)] = 0
    y = np.fft.irfft(X, n).astype(np.float32); return y / (np.abs(y).max() + 1e-9)


def einschlag(staerke=1.0):
    n = int(3.5 * SR); t = np.arange(n) / SR
    return ((np.sin(2 * np.pi * (36 + 40 * np.exp(-t / 0.08)) * t) * np.exp(-t / 1.1) + rauschen(n, 60, 2500) * np.exp(-t / 0.35) * 0.5) * staerke).astype(np.float32)


def anschwellen(dauer):
    n = int(dauer * SR); return (rauschen(n, 800, 9000) * np.linspace(0, 1, n) ** 2.2 * 0.45).astype(np.float32)


def track(cache, name):
    os.makedirs(os.path.join(cache, "tracks"), exist_ok=True)
    mp3 = os.path.join(cache, "tracks", name + ".mp3")
    if not os.path.exists(mp3):
        urllib.request.urlretrieve(TRACK_URL + name.replace(" ", "%20") + ".mp3", mp3)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def glaetten(x, sek):
    k = max(1, int(sek * SR)); c = np.cumsum(np.concatenate([[0], x])); y = (c[k:] - c[:-k]) / k
    return np.concatenate([np.full(k - 1, y[0]), y]).astype(np.float32)


def mix(drehbuch):
    name, cache = pfade(drehbuch)
    zp = json.load(open(name + ".timeline.json")); beats = zp["beats"]; total = zp["total"]
    plan = json.load(open(name + ".musik.json")) if os.path.exists(name + ".musik.json") else {"tracks": []}
    start = {}
    for b in beats: start.setdefault(b["si"], b["start"])
    n = int((total + 1) * SR); musik = np.zeros((n, 2), np.float32)
    for tr in plan["tracks"]:
        a = start[tr["von"]] - (1.0 if tr["von"] else 0.0); e = start[tr["bis"]] + 1.0 if tr.get("bis") is not None else total
        x = track(cache, tr["stueck"]); off = tr.get("versatz", 0.0)
        if off == "ende": off = max(0.0, len(x) / SR - (e - a) - 0.3)
        seg = x[int(off * SR): int(off * SR) + int((e - a) * SR)]
        seg = seg * 10 ** ((tr.get("db", -21) - 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)) / 20)
        env = huelle(len(seg), int((0.5 if not tr["von"] else 2.0) * SR), int(2.0 * SR))
        if tr.get("crescendo"): env = env * np.linspace(0.55, 1.25, len(seg), dtype=np.float32)
        i = int(a * SR); j = min(n, i + len(seg)); musik[i:j] += (seg * env[:, None])[: j - i]
    for si, bi in plan.get("einschlaege", []):
        t0 = next(b["start"] for b in beats if b["si"] == si and b["bi"] == bi)
        for k in (0, 1): addiere(musik[:, k], t0 - 2.3, anschwellen(2.4) * 0.25); addiere(musik[:, k], t0 + 0.15, einschlag(0.3))
    p = np.abs(musik).max() + 1e-9; musik /= p
    stimme = np.zeros(n, np.float32); hat_stimme = os.path.exists(os.path.join(cache, "voice_00.wav"))
    if hat_stimme:
        for i, b in enumerate(beats):
            v = lies_wav(os.path.join(cache, f"voice_{i:02d}.wav")); addiere(stimme, b["start"] + 0.35, v / (np.abs(v).max() + 1e-9) * STIMME_PEGEL)
    duck = 1 - DUCK * np.clip(glaetten(glaetten(np.abs(stimme), 0.25), 0.6) / 0.04, 0, 1)
    out = np.stack([stimme + musik[:, 0] * duck * MUSIK_PEGEL, stimme + musik[:, 1] * duck * MUSIK_PEGEL], 1)
    out = np.tanh(out * 1.1) / np.tanh(1.1)
    wav = os.path.join(cache, "mix.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
    # Bild-Master sichern (nach neuem Rendern automatisch erneuert) und Credits einblenden
    video, master = name + ".mp4", os.path.join(cache, "video_master.mp4")
    if not os.path.exists(master) or os.path.getmtime(master) < os.path.getmtime(name + ".timeline.json"):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-map", "0:v", "-c:v", "copy", master], check=True)
    stuecke = " · ".join(dict.fromkeys(t["stueck"] for t in plan["tracks"]))
    zeilen = ([f"Music: Kevin MacLeod (incompetech.com), licensed under CC BY 4.0", stuecke] if stuecke else []) + (["Voice: Piper TTS (en_US-ryan-high)"] if hat_stimme else [])
    font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; t_end = total - 4.2
    filt = ",".join(f"drawtext=fontfile={font}:text='{z.replace(':', chr(92) + ':')}':fontcolor=0xB8C0E0:fontsize={27 if i else 30}:x=(w-text_w)/2:y=h-{180 - 45 * i}:enable='gte(t,{t_end:.2f})':alpha='min(1,(t-{t_end:.2f})/0.8)'"
                    for i, z in enumerate(zeilen)) or "null"
    tmp = name + "_tmp.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", master, "-i", wav, "-map", "0:v", "-map", "1:a", "-vf", filt,
                    "-c:v", "libx264", "-crf", "22", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
                    "-shortest", "-movflags", "+faststart", tmp], check=True)
    os.replace(tmp, video); print("fertig:", video)


if __name__ == "__main__":
    {"voice": voice, "mix": mix}[sys.argv[1]](sys.argv[2])
