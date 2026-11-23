// Beispiel-Drehbuch für den video-baukasten. Ein neues Video = eine Kopie dieser Datei mit eigenen Szenen.
// Jede Szene: tag (Kapitelzeile oben links), beats (ein Satz pro Abschnitt, wird gesprochen und untertitelt),
// draw(st) zeichnet ein Bild. st: beat (Abschnitt), since (Sekunden im Abschnitt), lt (Sekunden in der Szene),
// ap(k, d) (weiches Einblenden ab Abschnitt k), t (Zeit im Video).
// Verfügbar: shot/setFX/addSun/addLights/ENV/V3 (3-D mit Lichteffekten), tex/formula (LaTeX), tikz (TikZ-Bilder),
// plot/axes/T/card/dot/legend (2-D), N (Farben), F (Schriften), ease/clamp/lerp.

// ---------- 3-D-Objekt für Szene 0: ein metallischer Torusknoten mit Bloom
const KNOT = new THREE.Scene(); KNOT.environment = ENV; addLights(KNOT);
const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.4, 0.42, 300, 40),
  new THREE.MeshStandardMaterial({ color: 0x4cc9f0, metalness: 0.9, roughness: 0.25, emissive: 0x0a2a40 }));
KNOT.add(knot);
setFX(KNOT, { bloom: [0.7, 0.5, 0.6] });

// ---------- 3-D-Bausteine für Szene 3 (bausteine3d.js): Fläche + Kurve + Leuchtpunkte + freie Kamerafahrt.
// Alles nur Ausgangspunkte: Funktion, Farben und Kamerabahn frei je nach Thema wählen.
const WELLE = new THREE.Scene(); WELLE.environment = ENV; addLights(WELLE); addSun(WELLE, 8);
const huegel = flaeche((x, y) => 1.2 * Math.exp(-(x * x + y * y) / 6) * Math.cos(1.4 * Math.hypot(x, y)) + 0.4,
  { x: [-6, 6], y: [-6, 6], nx: 140, ny: 140, farbe: (x, y, h) => new THREE.Color().setHSL(0.64 - 0.1 * h, 0.7, 0.1 + 0.12 * h) });
WELLE.add(huegel.mesh);
const spur = kurve(Array.from({ length: 120 }, (_, i) => { const a = i / 119 * 4 * Math.PI, r = 0.6 + i / 119 * 4;
  return V3(r * Math.cos(a), huegel.hoehe(r * Math.cos(a), -r * Math.sin(a)) + 0.08, r * Math.sin(a)); }),
  { radius: 0.035, farbe: s => new THREE.Color().setHSL(0.12 - 0.1 * s, 1, 0.6) });
WELLE.add(spur.gruppe);
const punkte = [0.25, 0.5, 0.75, 1].map(u => { const p = leuchtpunkt(N.gold, 0.045); p.position.copy(spur.kurve.getPoint(u)); WELLE.add(p); return p; });
setFX(WELLE, { bloom: [0.5, 0.45, 0.7], bokeh: 0.001 });
const FAHRT = [
  { pos: V3(0, 9, 11), ziel: V3(0, 0, 0), fov: 45 },
  { pos: V3(8, 4, 5), ziel: V3(0, 0.5, 0), kurve: 'linear' },
  { pos: V3(3, 1.6, -4), ziel: V3(-1, 0.6, 1), fov: 50, kurve: 'raus' },
];

window.DREHBUCH = {
  titel: 'video-baukasten',
  untertitel: 'template for learning videos in the visual journey style',
  szenen: [
    {
      tag: '',
      beats: ['This template shows the building blocks of every video in this style: three-dimensional scenes with real light, reflections and glow.'],
      draw(st) {
        knot.rotation.set(st.lt * 0.3, st.lt * 0.45, 0);
        shot(KNOT, V3(0, 1.2, 7.5), V3(0, 0, 0), 42);
        tex('e^{i\\pi} + 1 = 0', 800, 150, 64, N.gold, st.ap(0, 1.5));
      },
    },
    {
      tag: '01 · TikZ and LaTeX',
      beats: ['Exact diagrams come from TikZ and are drawn step by step, while every formula is typeset with LaTeX.'],
      draw(st) {
        tikz('einheitskreis', 480, 420, 560, N.white, st.since / 5);
        formula([['t', 'e^{i\\varphi} ='], ['t', '\\cos\\varphi'], ['t', '+'], ['t', 'i\\sin\\varphi']], 1150, 420, 52, N.white, 1 + st.since * 1.2);
        formula([['op', '\\sum', '\\infty', 'n=0'], ['f', '(i\\varphi)^n', 'n!']], 1150, 580, 44, N.cyan, clamp(st.since - 4, 0, 2));
      },
    },
    {
      tag: '02 · Plots',
      beats: ['Plots, labels and subtitles share the same colours and fonts, so every new video looks like part of one series.'],
      draw(st) {
        const P = plot(160, 180, 1280, 480, 0, 4 * Math.PI, -1.3, 1.3);
        axes(P, { xt: [0, Math.PI, 2 * Math.PI, 3 * Math.PI, 4 * Math.PI], xf: v => ['0', 'π', '2π', '3π', '4π'][Math.round(v / Math.PI)], yt: [-1, 0, 1], xl: 'φ' });
        const end = 4 * Math.PI * clamp(st.since / 5, 0, 1);
        for (const [f, c] of [[Math.cos, N.cyan], [Math.sin, N.pink]]) {
          glow(c, 12); ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.beginPath();
          for (let x = 0; x <= end; x += 0.02) x ? ctx.lineTo(P.X(x), P.Y(f(x))) : ctx.moveTo(P.X(x), P.Y(f(x)));
          ctx.stroke(); noGlow();
        }
        legend(P.x + 30, P.y + 30, [{ c: N.cyan, t: 'cos φ' }, { c: N.pink, t: 'sin φ' }]);
      },
    },
    {
      tag: '03 · 3-D building blocks',
      beats: ['Surfaces, glowing curves and free camera paths are flexible building blocks.', 'Every scene can reshape them, or add its own three-dimensional ideas.'],
      draw(st) {
        const u = clamp(st.lt / 15, 0, 1);
        huegel.wachsen(lerp(6.5, -7, clamp(u * 2.2, 0, 1)));
        spur.zeigeBis(clamp(u * 1.6 - 0.2, 0, 1));
        punkte.forEach((p, i) => p.visible = u * 1.6 - 0.2 > (i + 1) / 4);
        kamera.zeige(WELLE, kamera.wackeln(kamera.bahn(FAHRT, u), st.lt, 0.02));
        tex('z = f(x, y)', 800, 110, 54, N.white, st.ap(0, 1));
      },
    },
  ],
};
