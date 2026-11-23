# Hinweise für Claude

- Braucht eine Aufgabe ein weiteres Repo von hellsy (auch zum Pushen), es selbst hinzufügen. Wird das blockiert, nicht auf GitHub-Einstellungen verweisen, sondern kurz fragen: „Darf ich das Repo X mit Schreibrechten hinzufügen?“ Ein Ja reicht.
- Antworten kurz und einfach halten, keine langen Anleitungen mit mehreren Wegen.
- Ergebnisse (Lernvideos, Skripte, Übersetzungen) immer ohne Nachfrage committen und pushen, auf den Arbeits-Branch der Sitzung.
- Lernvideos liegen als Skript plus fertiges MP4 im Repo. Englische Fassungen bekommen einen eigenen Ordner mit Endung `-en`.

---

# Compphys – learning videos (motion graphics)

- **Language: English only.** All new videos, on-screen text, code comments and file names are in English.
  Do not produce German versions anymore (existing German videos stay as they are).
- Style: numpy + matplotlib (Agg) + ffmpeg, 1280×720, light background `#fbfaf7`, shared helpers
  (`card`, `header`, `grab`, `hold`, `smooth`), `VORSCHAU=1` for a 10 fps preview.
- Everything shown is computed (state the integrator in the docstring); prefer visual, animated scenes
  over text cards.
- Commit the script together with the rendered `.mp4`.

---

# Lernvideos im Stil „visual journey“ (Standard für neue Videos)

- Neue Lernvideos mit dem **`video-baukasten/`** bauen (siehe `video-baukasten/README.md`): pro Video nur ein Drehbuch
  (Szenen + Sprechtext), Ablauf `audio.py voice` → `baukasten.js` → `audio.py mix`.
- Stil: dunkler Science-Fiction-Look, 1920×1080, 30 fps, 3-D mit echten Lichteffekten (Bloom, Tiefenunschärfe,
  Spiegelungen, Schatten), Formeln in LaTeX (MathJax), Diagramme in TikZ, alles Gezeigte berechnet.
- Sprecher: Piper-Stimme `en_US-ryan-high`, Musik leiser unter der Stimme. Musik: Stücke von Kevin MacLeod
  (incompetech.com, CC BY 4.0), szenengenau geschnitten; Namensnennung im Abspann und in `CREDITS.md`.
- Vor dem vollständigen Rendern Standbilder prüfen (`STILLS=…`); Video, Drehbuch, Zeitplan und Musikplan committen.
- Zu jedem Video kann ein Handout entstehen: `video-baukasten/handout/vorlage.tex`.
