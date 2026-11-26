"""Writes riemann_explained_3d.en.srt from the timeline and the narration lengths.
Each spoken beat is split into sentences (long ones at a comma); times are shared out by text length."""
import json, re, os
HIER = os.path.dirname(os.path.abspath(__file__))
zp = json.load(open(os.path.join(HIER, 'riemann_explained_3d_timeline.json')))
narr = json.load(open(os.path.join(HIER, 'riemann_narration.json')))['durations']


def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def chunks(text):
    out = []
    for p in re.split(r'(?<=[.?!:])\s+', text):
        while len(p) > 90:
            cut = p.rfind(', ', 0, 90)
            if cut < 30: cut = p.rfind(' ', 0, 90)
            out.append(p[:cut + 1].strip()); p = p[cut + 1:].strip()
        if p: out.append(p)
    return out


def wrap(t):
    if len(t) <= 45: return t
    i = t.rfind(' ', 0, len(t) // 2 + 8)
    return t[:i] + "\n" + t[i + 1:]


cues = []
for i, b in enumerate(zp['beats']):
    t, dur = b['start'] + 0.35, narr[i]
    cs = chunks(b['text']); tot = sum(len(c) for c in cs)
    for c in cs:
        d = dur * len(c) / tot; cues.append((t, t + d - 0.05, c)); t += d
with open(os.path.join(HIER, 'riemann_explained_3d.en.srt'), 'w', encoding='utf-8') as f:
    for k, (a, e, c) in enumerate(cues, 1):
        f.write(f"{k}\n{ts(a)} --> {ts(e)}\n{wrap(c)}\n\n")
print(len(cues), 'subtitles')
