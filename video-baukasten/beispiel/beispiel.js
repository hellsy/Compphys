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
  ],
};
