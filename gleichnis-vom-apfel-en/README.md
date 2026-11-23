# The Parable of the Apple

Englische Fassung des Lernvideos „Das Gleichnis vom Apfel“ (Misner, Thorne, Wheeler: *Gravitation*, Kap. 1, § 1.1, § 1.6, § 1.7).
Quelle: [hellsy/gleichnis-vom-apfel](https://github.com/hellsy/gleichnis-vom-apfel). Bilder, Animation und Timing sind unverändert, nur die Texte sind übersetzt.

- `Parable-of-the-Apple.mp4`: das fertige Video (2:04, 1280×720, ohne Ton)
- `film_en.js`: alle Szenen mit englischen Texten
- `geo.js`: Apfelform und Geodäten (unverändert aus dem Original)
- `index_en.html`, `render_en.js`, `shot_en.js`: Seite, Renderer und Standbilder

## Neu rendern

Voraussetzungen: Node.js, Playwright mit Chromium, ffmpeg.

```
node render_en.js        # alle Szenen, danach Parable-of-the-Apple.mp4
node render_en.js 8      # nur Szene 8, danach neu zusammenfügen
node shot_en.js "4:12"   # Standbild Szene 4, Sekunde 12
```

## Begriffe

| Deutsch | Englisch |
| --- | --- |
| Mulde | dimple |
| Lupe | lens |
| Geodäte | geodesic |
| geodätische Abweichung | geodesic deviation |
| Fernwirkung / lokale Wirkung | action at a distance / local action |
