# Compphys – Lernvideos

Webseite mit allen Videos und Lernumgebungen: https://hellsy.github.io/Compphys/ (erzeugt mit `python3 website/build.py` aus `website/themen.json`).

Jedes Thema hat einen eigenen Ordner mit dem fertigen Video und dem Skript, das es erzeugt.

| Thema | Ordner | Videos |
|---|---|---|
| Hopf-Bündel (Naber, Abschnitt 0.3) | [`hopf-buendel/`](hopf-buendel/) | `hopf.mp4` (de), `hopf_en.mp4` (en) |
| Kraft, Feder und Kraftmesser | [`kraftmesser/`](kraftmesser/) | `kraftmesser.mp4` |
| Gedämpfter harmonischer Oszillator | [`oszillator/`](oszillator/) | `oszillator.mp4` |
| Noether-Theorem | [`noether/`](noether/) | `noether.mp4`, `noether_field.mp4` |
| Heisenberg-Modell (Blatt 4) | [`heisenberg/`](heisenberg/) | `videos/` (3 Videos), dazu Lernskript, Drehbuch und Übungsmaterial |
| Parable of the Apple (en) | [`gleichnis-vom-apfel-en/`](gleichnis-vom-apfel-en/) | `Parable-of-the-Apple.mp4` |
| Riemannsche Vermutung | [`riemann/`](riemann/) | siehe unten |

## Interaktive Labore und Unterrichtsmaterial

| Inhalt | Ordner | Öffentliche Fassung |
|---|---|---|
| Elektromotor-Labor | [`labore/`](labore/) (`elektromotor_labor.html`, Pages-Fassung unter `docs/` mit QR-Code, `build_pages.py`) | https://hellsy.github.io/elektromotor-labor/ (eigenes Repo) |
| Lorentzkraft-Labor | [`labore/`](labore/) (`lorentzkraft_labor.html`, eigenständige Seite in `lorentzkraft-labor/index.html`) | eigenes Pages-Repo |
| Binärwerkstatt (Scratch, Klasse 9) | [`binaerwerkstatt/`](binaerwerkstatt/) | – |

Die öffentlichen Seiten laufen aus eigenen Repositories mit GitHub Pages. Die Dateien hier sind Arbeitskopien;
Änderungen werden erst öffentlich, wenn sie dort veröffentlicht werden.

## Riemannsche Vermutung

| Ordner | Inhalt |
|---|---|
| [`riemann/interaktiv/`](riemann/interaktiv/) | Interaktives Lernvideo im Browser (`riemann_lernvideo.html` de, `riemann_lernvideo_en.html` en): 8 Kapitel, Quiz, Regler zum Ausprobieren |
| [`riemann/lernvideo/`](riemann/lernvideo/) | Das interaktive Video als MP4: `riemann.mp4` (de), `riemann_en.mp4` (en) |
| [`riemann/geschichte/`](riemann/geschichte/) | `riemann_history.mp4`: die Geschichte von Euklid bis zum Millennium-Preis (en) |
| [`riemann/visual-journey/`](riemann/visual-journey/) | „The Riemann Hypothesis – a visual journey“ (en): `riemann_explained_3d.mp4` (3D, Sprecher, Filmmusik) und `riemann_explained.mp4` (2D, ohne Ton), Credits in `CREDITS.md` |

Alle älteren Entwicklungsstände der Riemann-Videos liegen im Branch
[`archiv/riemann-entwicklung`](../../tree/archiv/riemann-entwicklung).

## Videos neu erzeugen

- Hopf, Kraftmesser, Oszillator, Noether (Python, matplotlib, ffmpeg): im jeweiligen Ordner `python3 <name>_video.py`.
- Heisenberg und Parable of the Apple: siehe die README im jeweiligen Ordner.
- Riemann-MP4s (Node.js, Playwright, ffmpeg): `node riemann/lernvideo/riemann_video.js`, `node riemann/geschichte/riemann_history_video.js` usw.; `VORSCHAU=1` für einen schnellen Testlauf.
- 3D-Fassung mit Ton, im Ordner `riemann/visual-journey/`:
  1. `npm install` (three.js)
  2. `python3 riemann_audio.py voice` (Sprecher, Piper TTS)
  3. `node riemann_explained_3d_video.js` (Bild)
  4. `python3 riemann_audio.py mix` (Musik, Nullstellen-Töne, Sprecher → MP4)
