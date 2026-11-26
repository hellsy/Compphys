"""Builds the GitHub Pages site of Compphys from website/themen.json.

Output: index.html (overview) and themen/<id>.html (video player + interactive learning environment)
in the repository root, plus poster images in website/bilder/. Run:  python3 website/build.py
"""
import html, json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, "website")
CFG = json.load(open(os.path.join(WEB, "themen.json"), encoding="utf-8"))
E = html.escape
LANG = {"de": "Deutsch", "en": "English"}


def poster(datei, zeit=None):
    """Poster frame (at `zeit` seconds, else at 35 % of the video), 640 px wide (only created once)."""
    name = datei.replace("/", "_").rsplit(".", 1)[0] + ".jpg"
    out = os.path.join(WEB, "bilder", name)
    if not os.path.exists(out):
        os.makedirs(os.path.dirname(out), exist_ok=True)
        src = os.path.join(ROOT, datei)
        dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]))
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{zeit if zeit is not None else dur * 0.35:.1f}", "-i", src, "-frames:v", "1",
                        "-vf", "scale=640:-2", "-q:v", "4", out], check=True)
    return "website/bilder/" + name


def dauer(datei):
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(ROOT, datei)]))
    return f"{int(d // 60)}:{int(d % 60):02d}"


CSS = """
:root{--bg:#060914;--bg2:#0c1226;--card:#10182f;--line:#1f2a4a;--text:#e8ecf8;--dim:#9aa5c4;--gold:#e0a82e;--cyan:#4cc9f0;--pink:#f0559b}
*{box-sizing:border-box}html{color-scheme:dark}
body{margin:0;background:radial-gradient(1200px 600px at 70% -10%,#1a2350 0%,transparent 60%),var(--bg);color:var(--text);
 font:16px/1.6 Inter,system-ui,sans-serif;min-height:100vh}
a{color:var(--cyan);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
header.top{padding:28px 0 8px;display:flex;align-items:center;gap:14px}
header.top .logo{font:600 15px/1 'JetBrains Mono',monospace;letter-spacing:.18em;color:var(--gold);text-transform:uppercase}
.hero{padding:48px 0 36px}
h1{font:600 clamp(34px,6vw,64px)/1.08 Fraunces,Georgia,serif;margin:0 0 14px;
 background:linear-gradient(180deg,#fff3cf,#e0a82e 70%,#a8741a);-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{color:var(--dim);font-size:clamp(17px,2.2vw,20px);max-width:760px;margin:0}
h2{font:600 26px/1.2 Fraunces,Georgia,serif;margin:56px 0 18px;color:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
.card{background:linear-gradient(180deg,var(--card),var(--bg2));border:1px solid var(--line);border-radius:16px;overflow:hidden;
 display:flex;flex-direction:column;color:var(--text);transition:transform .2s,border-color .2s,box-shadow .2s}
.card:hover{transform:translateY(-3px);border-color:#3a4c85;box-shadow:0 12px 40px rgba(76,201,240,.12);text-decoration:none}
.card img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#000}
.card .body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:8px;flex:1}
.card h3{margin:0;font:600 20px/1.25 Fraunces,Georgia,serif}
.card p{margin:0;color:var(--dim);font-size:15px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto;padding-top:6px}
.tag{font:500 12px/1 'JetBrains Mono',monospace;padding:5px 8px;border-radius:999px;border:1px solid var(--line);color:var(--dim)}
.tag.i{border-color:rgba(224,168,46,.5);color:var(--gold)}
.lab{padding:18px;border-radius:14px;border:1px solid var(--line);background:var(--bg2);color:var(--text)}
.lab:hover{border-color:#3a4c85;text-decoration:none}.lab h3{margin:0 0 4px;font:600 18px/1.3 Inter,sans-serif}.lab p{margin:0;color:var(--dim);font-size:15px}
.player{background:#000;border-radius:16px;overflow:hidden;border:1px solid var(--line);box-shadow:0 20px 60px rgba(0,0,0,.5)}
.player video{width:100%;display:block;aspect-ratio:16/9;background:#000}
.now{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;margin:14px 0 0}
.now b{font:600 20px/1.3 Fraunces,Georgia,serif}.now span{color:var(--dim);font-size:14px}
.list{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;margin-top:22px}
.item{display:flex;flex-direction:column;gap:6px;text-align:left;background:var(--bg2);border:1px solid var(--line);border-radius:12px;
 padding:0 0 12px;overflow:hidden;color:var(--text);cursor:pointer;font:inherit}
.item img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.item .t{padding:0 12px;font-weight:600;font-size:15px;line-height:1.35}
.item .m{padding:0 12px;color:var(--dim);font-size:13px}.item[aria-current=true]{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.tabs button{font:inherit;font-size:14px;padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:var(--bg2);color:var(--text);cursor:pointer}
.tabs button[aria-selected=true]{border-color:var(--gold);color:var(--gold)}
.frame{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fff}
.frame iframe{width:100%;height:min(82vh,860px);border:0;display:block}
.open{display:inline-block;margin-top:10px;font-size:14px}
.back{display:inline-block;margin:6px 0 0;font-size:15px}
.text{color:var(--dim);max-width:820px;font-size:17px;margin:0 0 26px}
footer{margin:80px 0 0;padding:24px 0 40px;border-top:1px solid var(--line);color:var(--dim);font-size:14px}
@media (max-width:600px){.wrap{padding:0 16px}.hero{padding:28px 0 20px}.frame iframe{height:75vh}}
"""

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">')


def seite(titel, beschreibung, inhalt, tiefe):
    up = "../" * tiefe
    return f"""<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(titel)}</title><meta name="description" content="{E(beschreibung)}">{FONTS}
<style>{CSS}</style></head><body>
<div class="wrap"><header class="top"><a class="logo" href="{up}index.html">{E(CFG['titel'])}</a></header>
{inhalt}
<footer>Alle Videos und Simulationen sind berechnet und frei zugänglich. Quellcode: <a href="https://github.com/hellsy/Compphys">github.com/hellsy/Compphys</a></footer>
</div></body></html>
"""


def tags(t):
    out = [f'<span class="tag">{len(t["videos"])} Video{"s" if len(t["videos"]) != 1 else ""}</span>']
    if t.get("interaktiv"):
        out.append('<span class="tag i">interaktiv</span>')
    for s in sorted({v["sprache"] for v in t["videos"]}):
        out.append(f'<span class="tag">{s.upper()}</span>')
    return "".join(out)


def index():
    karten = "".join(f"""<a class="card" href="themen/{t['id']}.html"><img src="{poster(t['videos'][0]['datei'], t['videos'][0].get('bild_zeit'))}" alt="" loading="lazy">
<div class="body"><h3>{E(t['titel'])}</h3><p>{E(t['kurz'])}</p><div class="tags">{tags(t)}</div></div></a>""" for t in CFG["themen"])
    labore = "".join(f"""<a class="lab" href="{E(l['link'])}"><h3>{E(l['titel'])}</h3><p>{E(l['kurz'])}</p></a>""" for l in CFG["labore"])
    inhalt = f"""<section class="hero"><h1>{E(CFG['titel'])}</h1><p class="lead">{E(CFG['untertitel'])}</p></section>
<h2>Themen</h2><div class="grid">{karten}</div>
""" + (f'<h2>Interaktive Labore</h2><div class="grid">{labore}</div>' if labore else "")
    open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(seite(CFG["titel"], CFG["untertitel"], inhalt, 0))


def thema(t):
    vids = [dict(v, poster="../" + poster(v["datei"], v.get("bild_zeit")), src="../" + v["datei"], dauer=dauer(v["datei"])) for v in t["videos"]]
    v0 = vids[0]
    meta = lambda v: " · ".join(x for x in [LANG[v["sprache"]], v["dauer"], v.get("info", "")] if x)
    liste = ""
    if len(vids) > 1:
        liste = '<div class="list">' + "".join(
            f"""<button class="item" data-src="{E(v['src'])}" data-poster="{E(v['poster'])}" data-t="{E(v['titel'])}" data-m="{E(meta(v))}"{' aria-current="true"' if i == 0 else ''}>
<img src="{E(v['poster'])}" alt="" loading="lazy"><span class="t">{E(v['titel'])}</span><span class="m">{E(meta(v))}</span></button>"""
            for i, v in enumerate(vids)) + "</div>"
    inter = ""
    if t.get("interaktiv"):
        ia = t["interaktiv"]
        knoepfe = "".join(f'<button role="tab" data-src="../{E(x["datei"])}" aria-selected="{"true" if i == 0 else "false"}">{E(x["titel"])} · {x["sprache"].upper()}</button>' for i, x in enumerate(ia))
        inter = f"""<h2>Selbst ausprobieren</h2><p class="text">Die interaktive Lernumgebung: Parameter verändern, Kapitel durchgehen, Quiz lösen.</p>
<div class="tabs" role="tablist">{knoepfe}</div>
<div class="frame"><iframe id="sim" src="../{E(ia[0]['datei'])}" title="Interaktive Lernumgebung" loading="lazy"></iframe></div>
<a class="open" id="open" href="../{E(ia[0]['datei'])}" target="_blank" rel="noopener">Im eigenen Fenster öffnen ↗</a>"""
    inhalt = f"""<a class="back" href="../index.html">← Alle Themen</a>
<section class="hero" style="padding-top:20px"><h1>{E(t['titel'])}</h1><p class="lead">{E(t['kurz'])}</p></section>
<p class="text">{E(t['text'])}</p>
<div class="player"><video id="vid" controls preload="metadata" playsinline poster="{E(v0['poster'])}" src="{E(v0['src'])}"></video></div>
<div class="now"><b id="vt">{E(v0['titel'])}</b><span id="vm">{E(meta(v0))}</span></div>
{liste}{inter}
<script>
document.querySelectorAll('.item').forEach(b=>b.onclick=()=>{{const v=document.getElementById('vid');v.poster=b.dataset.poster;v.src=b.dataset.src;
document.getElementById('vt').textContent=b.dataset.t;document.getElementById('vm').textContent=b.dataset.m;
document.querySelectorAll('.item').forEach(x=>x.removeAttribute('aria-current'));b.setAttribute('aria-current','true');v.play();
document.querySelector('.player').scrollIntoView({{behavior:'smooth',block:'center'}})}});
document.querySelectorAll('[role=tab]').forEach(b=>b.onclick=()=>{{document.getElementById('sim').src=b.dataset.src;document.getElementById('open').href=b.dataset.src;
document.querySelectorAll('[role=tab]').forEach(x=>x.setAttribute('aria-selected','false'));b.setAttribute('aria-selected','true')}});
</script>"""
    os.makedirs(os.path.join(ROOT, "themen"), exist_ok=True)
    open(os.path.join(ROOT, "themen", t["id"] + ".html"), "w", encoding="utf-8").write(seite(t["titel"] + " – " + CFG["titel"], t["kurz"], inhalt, 1))


if __name__ == "__main__":
    index()
    for t in CFG["themen"]:
        thema(t)
    open(os.path.join(ROOT, ".nojekyll"), "w").close()
    print("index.html und", len(CFG["themen"]), "Themenseiten geschrieben")
