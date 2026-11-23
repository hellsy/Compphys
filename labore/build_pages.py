"""Baut die GitHub-Pages-Fassung der Lernsimulationen nach docs/ und erzeugt die QR-Codes.

Aufruf:  python3 build_pages.py
Die Quelldateien (z. B. elektromotor_labor.html) enthalten nur den Seiteninhalt;
hier bekommen sie ein vollständiges HTML-Gerüst, damit sie eigenständig laufen.
"""
from pathlib import Path
import qrcode

# Jede Seite hat ihr eigenes Repo mit GitHub Pages; dorthin führt der QR-Code.
PAGES = {"elektromotor-labor": ("elektromotor_labor.html", "Elektromotor-Labor", "https://hellsy.github.io/elektromotor-labor/")}

HEAD = """<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>:root{color-scheme:light;box-sizing:border-box}body{margin:0;padding:0}img{max-width:100%}</style>
</head>
<body>
"""

root = Path(__file__).parent
docs = root / "docs"
docs.mkdir(exist_ok=True)
(docs / ".nojekyll").write_text("")
links = []
for slug, (src, title, url) in PAGES.items():
    out = docs / slug
    out.mkdir(exist_ok=True)
    (out / "index.html").write_text(HEAD + (root / src).read_text(encoding="utf8") + "\n</body>\n</html>\n", encoding="utf8")
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=16, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    qr.make_image(fill_color="black", back_color="white").save(out / "qr.png")
    links.append(f'<li><a href="{url}">{title}</a></li>')
    # Druckvorlage: QR-Code mit Titel und Adresse darunter
    from PIL import Image, ImageDraw, ImageFont
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    W = img.width
    sheet = Image.new("RGB", (W, W + 170), "white")
    sheet.paste(img, (0, 0))
    d = ImageDraw.Draw(sheet)
    def font(size, bold=False):
        name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
        try: return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/" + name, size)
        except OSError: return ImageFont.load_default()
    for txt, f, y in ((title, font(54, True), W - 10), (url.replace("https://", ""), font(30), W + 70)):
        d.text((W // 2, y), txt, fill="black", font=f, anchor="ma")
    sheet.save(out / "qr_druck.png")

(docs / "index.html").write_text(
    '<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>Physik-Labore</title>\n'
    "<style>body{font:17px/1.5 system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem}</style>\n"
    "</head>\n<body>\n<h1>Physik-Labore</h1>\n<ul>\n" + "\n".join(links) + "\n</ul>\n</body>\n</html>\n",
    encoding="utf8",
)
print("fertig:", ", ".join(v[2] for v in PAGES.values()))
