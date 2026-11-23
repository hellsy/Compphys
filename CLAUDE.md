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

- Neue Lernvideos mit dem privaten Baukasten **`hellsy/video-baukasten`** bauen: das Repo selbst hinzufügen
  (mit Schreibrechten) und dessen `CLAUDE.md` und `README.md` folgen. Fertige Videos kommen hierher.
- Zu jedem neuen Lernvideo gehört immer auch eine **interaktive Lernsimulation** (eine HTML-Datei, läuft im Browser):
  Regler und Parameter zum Ausprobieren, Kapitel passend zum Video, kurzes Quiz. Vorbild:
  `riemann/interaktiv/riemann_lernvideo_en.html` in `hellsy/Compphys`. Ablage im Themenordner unter `interaktiv/`,
  Sprache Englisch, ohne Nachfrage mit dem Video committen.
