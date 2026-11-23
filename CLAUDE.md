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
