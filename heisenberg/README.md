# Heisenberg-Modell – Bachelorarbeit

Lernmaterial zur exakten Diagonalisierung von Quanten-Spinmodellen, begleitend zum Vorlesungsskript
„Computational Many-Body Physics“ (SS 2022), Kapitel 2, und den Übungsblättern 4–6.

## Ordner

| Ordner | Inhalt |
|---|---|
| `material/` | Vorlesungsskript, Lesepaket zu Blatt 4 (Blatt + Skript Kap. 2, S. 1–10), Übungsblätter 4–6, Musterlösung `three-site_cluster.jl` (Julia) |
| `lernskript/` | Wachsendes Lernskript (`lecture.tex` → `heisenberg-lecture.pdf`, XeLaTeX) |
| `drehbuch/` | Lern-Drehbuch zu Blatt 4, Aufgabe 2 als HTML (Szenen, Hinweise, aufklappbare Lösungen) |
| `code/` | Python-Referenzcode für die Hamilton-Matrix mit Kronecker-Test (erst nach eigenem Versuch ansehen) |
| `videos/` | Lernvideos und die Skripte, mit denen sie gerendert werden |
| `interaktiv/` | `python-werkstatt.html`: 14 Level ohne Tastatur zum Programm aus Blatt 4, Aufgabe 2 (im Browser öffnen) |

## Videos

| Datei | Inhalt | Länge |
|---|---|---|
| `heisenberg-spin-operators.mp4` | Was die Operatoren mit den Spins machen (deutsch) | 73 s |
| `heisenberg-spin-operators-en.mp4` | dasselbe auf Englisch | 73 s |
| `heisenberg-physical-picture-en.mp4` | Physikalisches Bild: Isolator vs. Metall, Herkunft von J, Ferro-/Antiferromagnet, Magnon, Singulett/Triplett (englisch) | 64 s |
| `heisenberg-hilbert-space-en.mp4` | Ortsraum vs. Hilbertraum, Dimension, orthogonale Zustände, Bloch-Kugel (englisch) | 59 s |

Neu rendern (Python mit numpy, matplotlib; ffmpeg):

```bash
cd videos
python3 render.py    s1 s2 s3 s4 s5 s6 s7 s8   # deutsch,  Szenen s1.mp4 … s8.mp4
python3 render_en.py s1 s2 s3 s4 s5 s6 s7 s8   # englisch, Szenen en_s1.mp4 …
python3 render2.py   b1 b2 b3 b4 b5 b6         # Video 2,  Szenen b1.mp4 …
python3 render3.py   c1 c2 c3 c4 c5 c6         # Video 3,  Szenen c1.mp4 …
# danach mit ffmpeg -f concat … -c copy zusammenfügen
```

Einzelbilder zum Prüfen: `python3 render2.py still b5:11`

## Lernskript bauen

```bash
cd lernskript
xelatex lecture.tex && xelatex lecture.tex
```

## Stand (25.11.2026)

- Blatt 4, Aufgabe 1a: erledigt
- Blatt 4, Aufgabe 1b (Ising): erledigt
- Blatt 4, Aufgabe 1c (Heisenberg): in Arbeit
- Blatt 4, Aufgabe 1d (Modell d): in Arbeit
