"""Filmmusik für das 3D-Lernvideo per KI (Meta MusicGen, lokal auf der CPU gerechnet).

Liest den Szenen-Zeitplan riemann_explained_3d_timeline.json und erzeugt für jede Szene Musik
nach einer eigenen Beschreibung (epischer Science-Fiction-Film-Score). Lange Szenen werden in
Stücken von 30 s erzeugt, wobei jedes Stück die letzten Sekunden des vorigen fortsetzt; beim
Sturzflug in den Pol beginnt ein neues, sehr intensives Stück. Ergebnis: audio_cache/score.wav,
das riemann_audio.py mix automatisch statt der synthetischen Musik verwendet.

Aufruf:  HF_HUB_DISABLE_XET=1 python3 riemann_musicgen.py [facebook/musicgen-small|facebook/musicgen-medium]
Lizenz der Modellgewichte: CC-BY-NC 4.0 (nicht-kommerzielle Nutzung).
Benötigt: torch, transformers, sentencepiece, numpy
"""
import json
import os
import sys
import time
import wave

import numpy as np
import torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration

HIER = os.path.dirname(os.path.abspath(__file__))
ZEITPLAN = os.path.join(HIER, "riemann_explained_3d_timeline.json")
AUS = os.path.join(HIER, "audio_cache", "score.wav")
MODELL = sys.argv[1] if len(sys.argv) > 1 else "facebook/musicgen-small"

STIL = "epic cinematic science fiction film score, high quality orchestral and synth production"
PROMPTS = {
    0: "mysterious cosmic intro, deep synth pads, slow rising strings, shimmering atmosphere, no drums",
    1: "curious and wondrous, pizzicato strings and soft synth pulse, light cinematic percussion",
    2: "steady pulse, string ostinato, building tension, deep synth bass",
    3: "hopeful and growing, strings and piano ostinato, gradual epic build",
    4: "majestic revelation, brass and strings, big synth pads, cinematic drums",
    5: "ethereal and mysterious, slow strings, airy synth pads, sense of discovery",
    6: "rising tension, driving low strings, pulsing synth bass, cinematic percussion",
    "dive": "intense hyperspace jump, massive epic drums, roaring brass, fast string ostinato, huge energy, action climax",
    7: "awe and wonder, choir and strings, epic sci-fi atmosphere, slow powerful drums",
    8: "uplifting and heroic, rhythmic strings, bold brass, driving percussion",
    9: "emotional epic finale, strings and choir, majestic and resolving, slow ending",
}
STUECK, UEBERLAPP = 30.0, 5.0


def segmente(zp):
    beats = zp["beats"]; segs = []
    for b in beats:
        key = "dive" if (b["si"] == 6 and b["bi"] == 3) else b["si"]
        if not segs or segs[-1][0] != key:
            segs.append([key, b["start"], b["start"] + b["dur"]])
        else:
            segs[-1][2] = b["start"] + b["dur"]
    segs[-1][2] = zp["total"]
    return segs


def main():
    zp = json.load(open(ZEITPLAN))
    torch.set_num_threads(os.cpu_count() or 4)
    proc = AutoProcessor.from_pretrained(MODELL)
    model = MusicgenForConditionalGeneration.from_pretrained(MODELL).eval()
    sr = model.config.audio_encoder.sampling_rate
    tps = model.config.audio_encoder.frame_rate              # Tokens pro Sekunde (50)
    gesamt = np.zeros(int((zp["total"] + 2) * sr), np.float32)
    vorher = None; t0 = time.time()
    for key, a, e in segmente(zp):
        text = f"{STIL}, {PROMPTS[key]}"
        stuecke = []; laenge = 0.0
        while laenge < e - a + 1.5:
            neu = min(STUECK, e - a + 1.5 - laenge + 0.01)
            prompt_audio = None
            if stuecke:
                prompt_audio = stuecke[-1][-int(UEBERLAPP * sr):]
            elif vorher is not None and key != "dive":       # sanfter Übergang zur vorigen Szene
                prompt_audio = vorher[-int(UEBERLAPP * sr):]
            if prompt_audio is not None:
                inp = proc(audio=prompt_audio, sampling_rate=sr, text=[text], padding=True, return_tensors="pt")
                ntok = int((neu) * tps)
            else:
                inp = proc(text=[text], padding=True, return_tensors="pt"); ntok = int(neu * tps)
            with torch.no_grad():
                out = model.generate(**inp, max_new_tokens=ntok, do_sample=True, guidance_scale=3.0)
            x = out[0, 0].numpy().astype(np.float32)
            if prompt_audio is not None:
                x = x[len(prompt_audio):]                    # nur der neue Teil
            stuecke.append(x)
            laenge += len(x) / sr
            print(f"  {key}: {laenge:5.1f}/{e - a:5.1f} s   ({time.time() - t0:6.0f} s Rechenzeit)", flush=True)
        seg = np.concatenate(stuecke)[: int((e - a + 1.5) * sr)]
        seg /= (np.abs(seg).max() + 1e-9)
        # einblenden (weich, außer beim Sturzflug) und an die richtige Stelle legen
        ein = int((0.05 if key == "dive" else 1.2) * sr); seg[:ein] *= np.linspace(0, 1, ein)
        aus = int(1.5 * sr); seg[-aus:] *= np.linspace(1, 0, aus)
        i = int(a * sr); j = min(len(gesamt), i + len(seg)); gesamt[i:j] += seg[: j - i]
        vorher = seg[:-aus]
    gesamt /= (np.abs(gesamt).max() + 1e-9)
    os.makedirs(os.path.dirname(AUS), exist_ok=True)
    with wave.open(AUS, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((gesamt * 32767 * 0.95).astype(np.int16).tobytes())
    print("geschrieben:", AUS, f"({time.time() - t0:.0f} s)")


if __name__ == "__main__":
    main()
