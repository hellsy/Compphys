# video-baukasten

Vorlage für Lernvideos im Stil von „The Riemann Hypothesis – a visual journey“ (`riemann/visual-journey/`):
dunkler Science-Fiction-Look, 1920×1080, 3-D mit echten Lichteffekten, LaTeX-Formeln, TikZ-Zeichnungen,
Sprecher (Piper, Stimme Ryan) und Filmmusik von Kevin MacLeod (CC BY 4.0).

## Neues Video in vier Schritten

1. **Drehbuch anlegen:** `beispiel/beispiel.js` in einen neuen Themenordner kopieren, z. B. `noether/journey/noether.js`.
   Eine Szene besteht aus `tag` (Kapitelzeile), `beats` (ein Satz pro Abschnitt – wird gesprochen und untertitelt)
   und `draw(st)` (zeichnet ein Bild zur Zeit `st`). TikZ-Bilder kommen als `.tex` in einen Ordner `tikz/` daneben,
   die Musik als `noether.musik.json` (Vorlage: `beispiel/beispiel.musik.json`).
2. `python3 video-baukasten/audio.py voice noether/journey/noether.js` – Sprecher einsprechen
3. `node video-baukasten/baukasten.js noether/journey/noether.js` – Bild rendern (`VORSCHAU=1` für einen schnellen Test, `STILLS=5,20` für Standbilder)
4. `python3 video-baukasten/audio.py mix noether/journey/noether.js` – Musik, Sprecher und Credits → `noether.mp4`

## Was im Drehbuch zur Verfügung steht

| Baustein | Aufruf |
|---|---|
| 3-D-Szene mit Bloom, Tiefenunschärfe, Spiegelungen | `const S = new THREE.Scene(); S.environment = ENV; addLights(S); setFX(S, { bloom: [0.6, 0.5, 0.6], bokeh: 0.0012 }); shot(S, V3(…), V3(…), fov)` |
| weiche Schatten | `addSun(S, 16)` und `mesh.castShadow = mesh.receiveShadow = true` |
| LaTeX-Formel | `tex('e^{i\\pi}+1=0', x, y, size, N.gold, alpha)` |
| Formel, die Teil für Teil erscheint | `formula([['t', '\\zeta(s)='], ['op', '\\sum', '\\infty', 'n=1'], ['f', '1', 'n^s']], x, y, size, N.white, reveal)` |
| TikZ-Bild, Strich für Strich | `tikz('einheitskreis', x, y, breite, N.white, 0…1)` (Datei `tikz/einheitskreis.tex`) |
| 2-D-Graphen | `plot`, `axes`, `legend`, `T`, `card`, `dot`, `glow` |
| Farben / Schriften | `N.gold`, `N.cyan`, `N.pink`, `N.violet`, `N.green`, `N.white`, `N.dim` · `F.disp`, `F.sans`, `F.mono` |

Koordinaten der Zeichenfläche: 1600 × 900, unabhängig von der Ausgabeauflösung.

## Handout

`handout/vorlage.tex` ist ein Arbeitsblatt im selben Farbschema mit TikZ-Beispiel (`pdflatex vorlage.tex`).

## Voraussetzungen

- `npm install` in diesem Ordner (three.js 0.149, MathJax 3.2.2)
- Node.js, Playwright mit Chromium, ffmpeg, Python mit numpy und `piper-tts`
- TikZ und Handout: `latex`, `dvisvgm`, `pdflatex` (Debian/Ubuntu: `texlive-latex-extra texlive-pictures texlive-lang-german lmodern dvisvgm`)
- Netzwerk: huggingface.co (Stimme), incompetech.com (Musik)
