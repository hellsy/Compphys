// video-baukasten: Bibliothek im Browser (läuft nach engine.html, three.js, Post-Processing, MathJax und TikZ-SVGs).
// Stellt bereit: 3-D mit echten Lichteffekten (shot, setFX, addSun, ENV …), LaTeX (tex, formula), TikZ (tikz),
// Hintergrund, Untertitel und den Zeitplan (VIDEO.init / VIDEO.frame).
(function () {
  // ---------------------------------------------------------------- 3-D mit echten Lichteffekten
  const GL = document.createElement('canvas'); GL.width = cv.width; GL.height = cv.height;
  const R3 = new THREE.WebGLRenderer({ canvas: GL, antialias: true, preserveDrawingBuffer: true });
  R3.setSize(GL.width, GL.height, false); R3.setClearColor(0x060914, 1);
  R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap;
  const cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 400);
  const ENV = new THREE.PMREMGenerator(R3).fromScene(new PP.RoomEnvironment(), 0.04).texture;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const lerpV = (a, b, t) => a.clone().lerp(b, t);
  const proj = v => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * SW, (1 - p.y) / 2 * SH, p.z]; };
  const FX = new Map(), FXCONF = new Map();
  // setFX(scene, { bloom: [Stärke, Radius, Schwelle], bokeh: Blende (z. B. 0.0012) })
  function setFX(scene, conf) { FXCONF.set(scene, conf); FX.delete(scene); }
  function fxFor(scene) {
    let f = FX.get(scene); if (f) return f;
    const conf = FXCONF.get(scene) || {};
    const comp = new PP.EffectComposer(R3); comp.setSize(GL.width, GL.height);
    comp.addPass(new PP.RenderPass(scene, cam));
    let bokeh = null;
    if (conf.bokeh) { bokeh = new PP.BokehPass(scene, cam, { focus: 10, aperture: conf.bokeh, maxblur: 0.008, width: GL.width, height: GL.height }); comp.addPass(bokeh); }
    const [s, r, th] = conf.bloom || [0.5, 0.45, 0.8];
    comp.addPass(new PP.UnrealBloomPass(new THREE.Vector2(GL.width, GL.height), s, r, th));
    f = { comp, bokeh }; FX.set(scene, f); return f;
  }
  function addLights(scene) {
    scene.add(new THREE.AmbientLight(0x8090c0, 0.55));
    const d = new THREE.DirectionalLight(0xffffff, 0.8); d.position.set(5, 12, 8); scene.add(d);
    const d2 = new THREE.DirectionalLight(0x6080ff, 0.35); d2.position.set(-8, 4, -6); scene.add(d2);
  }
  // Licht mit weichen Schatten, das dem Kameraziel folgt (half = halbe Breite des Schattenbereichs)
  function addSun(scene, half = 16, intensity = 0.7) {
    const sun = new THREE.DirectionalLight(0xffffff, intensity); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const c = sun.shadow.camera; c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.near = 1; c.far = 80;
    sun.shadow.bias = -0.0008; sun.shadow.radius = 4; scene.add(sun, sun.target); scene.userData.sun = sun;
  }
  // eine 3-D-Szene aus Kameraposition pos auf das Ziel target rendern und ins Bild legen
  function shot(scene, pos, target, fov = 40) {
    cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.lookAt(target);
    const sun = scene.userData.sun;
    if (sun) { sun.position.set(target.x + 6, target.y + 14, target.z + 9); sun.target.position.copy(target); sun.target.updateMatrixWorld(); }
    const f = fxFor(scene); if (f.bokeh) f.bokeh.uniforms.focus.value = pos.distanceTo(target);
    f.comp.render(); ctx.drawImage(GL, 0, 0, SW, SH);
  }

  // ---------------------------------------------------------------- Vektorformen aus SVG (MathJax und TikZ)
  const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:-99999px;top:0;'; document.body.appendChild(host);
  function shapeFromSvg(svg) {
    const vb = svg.viewBox.baseVal; svg.setAttribute('width', vb.width); svg.setAttribute('height', vb.height);
    host.appendChild(svg); const items = [];
    const attr = (el, a) => { const e = el.closest('[' + a + ']'); const v = e ? e.getAttribute(a) : null; return v === 'currentColor' ? null : v; };
    svg.querySelectorAll('path, rect, use, line, circle, ellipse, polyline, polygon').forEach(el => {
      if (el.closest('defs')) return;
      const m = el.getCTM(); if (!m) return;
      let mm = [m.a, m.b, m.c, m.d, m.e, m.f], p = null, r = null;
      const tag = el.tagName.toLowerCase();
      if (tag === 'use') {
        const ref = svg.querySelector((el.getAttribute('href') || el.getAttribute('xlink:href')));
        if (!ref || !ref.getAttribute('d')) return;
        const x = +el.getAttribute('x') || 0, y = +el.getAttribute('y') || 0; mm = [mm[0], mm[1], mm[2], mm[3], mm[4] + mm[0] * x + mm[2] * y, mm[5] + mm[1] * x + mm[3] * y];
        p = new Path2D(ref.getAttribute('d'));
      } else if (tag === 'path') { const d = el.getAttribute('d'); if (!d) return; p = new Path2D(d); }
      else if (tag === 'rect') r = [+el.getAttribute('x') || 0, +el.getAttribute('y') || 0, +el.getAttribute('width') || 0, +el.getAttribute('height') || 0];
      else { p = new Path2D(); const g = el.getBBox(); if (tag === 'circle' || tag === 'ellipse') p.ellipse(g.x + g.width / 2, g.y + g.height / 2, g.width / 2, g.height / 2, 0, 0, 7); else if (tag === 'line') { p.moveTo(+el.getAttribute('x1'), +el.getAttribute('y1')); p.lineTo(+el.getAttribute('x2'), +el.getAttribute('y2')); } else { const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number); for (let i = 0; i + 1 < pts.length; i += 2) i ? p.lineTo(pts[i], pts[i + 1]) : p.moveTo(pts[i], pts[i + 1]); if (tag === 'polygon') p.closePath(); } }
      const fill = attr(el, 'fill'), stroke = attr(el, 'stroke'), sw = +(attr(el, 'stroke-width') || 1), dash = attr(el, 'stroke-dasharray');
      items.push({ m: mm, p, r, fill: tag === 'use' || tag === 'rect' ? (fill === 'none' ? null : (fill || 'auto')) : (fill === 'none' ? null : (fill || (stroke ? null : 'auto'))), stroke: stroke && stroke !== 'none' ? stroke : null, sw, dash: dash && dash !== 'none' ? dash.split(/[\s,]+/).map(Number) : null });
    });
    host.removeChild(svg);
    return { w: vb.width, h: vb.height, x0: vb.x, y0: vb.y, base: -vb.y, items };
  }
  const isBlack = c => !c || c === 'auto' || /^(#000|#000000|black|rgb\(0,\s*0,\s*0\))$/i.test(c);
  function drawShape(sh, x, y, sc, col, upto = 1e9, glowOps = true) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);   // getCTM liefert schon Koordinaten ab der linken oberen Ecke
    sh.items.forEach((it, i) => {
      if (i >= upto) return;
      ctx.save(); ctx.transform(...it.m);
      const fc = it.fill ? (isBlack(it.fill) ? col : it.fill) : null, sc2 = it.stroke ? (isBlack(it.stroke) ? col : it.stroke) : null;
      if (glowOps && fc && !isBlack(it.fill)) { ctx.shadowColor = fc; ctx.shadowBlur = 14 / sc; }
      if (it.r) { if (fc) { ctx.fillStyle = fc; ctx.fillRect(...it.r); } }
      else { if (fc) { ctx.fillStyle = fc; ctx.fill(it.p); } if (sc2) { ctx.strokeStyle = sc2; ctx.lineWidth = it.sw; ctx.lineCap = it.dash ? 'butt' : 'round'; ctx.lineJoin = 'round'; if (it.dash) ctx.setLineDash(it.dash); ctx.stroke(it.p); } }
      ctx.restore();
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- LaTeX (MathJax)
  const texCache = new Map();
  function texShape(tex) {
    let sh = texCache.get(tex); if (sh) return sh;
    const svg = MathJax.tex2svg('\\displaystyle ' + tex, { display: false }).querySelector('svg');
    sh = shapeFromSvg(svg); texCache.set(tex, sh); return sh;
  }
  // tex('e^{i\\pi}+1=0', cx, y, size, color, alpha): LaTeX zentriert bei (cx, y) zeichnen
  function tex(src, cx, y, size, col = N.white, alpha = 1) {
    const sh = texShape(src), sc = size / 1000 * 1.15; ctx.save(); ctx.globalAlpha *= alpha;
    drawShape(sh, cx - sh.w * sc / 2, y - sh.h * sc / 2, sc, col); ctx.restore();
  }
  // formula([...Teile], cx, y, size, color, reveal): Teile ['t', LaTeX] | ['f', Zähler, Nenner] | ['op', '\\sum' oder '\\prod', oben, unten];
  // reveal = Anzahl schon sichtbarer Teile (gebrochene Werte blenden den nächsten Teil ein)
  function pieceTex(p) {
    if (p[0] === 't') return p[1];
    if (p[0] === 'f') return `\\frac{${p[1]}}{${p[2]}}`;
    return `\\color{#ffd166}{${p[1]}${p[3] ? '_{' + p[3] + '}' : ''}${p[2] ? '^{' + p[2] + '}' : ''}}`;
  }
  function formula(pieces, cx, y, size, col = N.white, reveal = 99) {
    const texs = pieces.map(pieceTex), sc = size / 1000 * 1.15, full = texShape(texs.join(' '));
    const x0 = cx - full.w * sc / 2, yBase = y - full.h * sc / 2 + full.base * sc;
    const put = sh => drawShape(sh, x0, yBase - sh.base * sc, sc, col);
    const n = pieces.length, k = clamp(Math.floor(reveal), 0, n), fr = clamp(reveal - k, 0, 1);
    if (k >= n) return put(full);
    if (k > 0) put(texShape(texs.slice(0, k).join(' ')));
    if (fr > 0) { ctx.save(); ctx.globalAlpha *= fr; put(texShape(texs.slice(0, k + 1).join(' '))); ctx.restore(); }
  }

  // ---------------------------------------------------------------- TikZ (vorab zu SVG übersetzt, siehe tikz/*.tex)
  const tikzCache = new Map();
  function tikzShape(name) {
    let sh = tikzCache.get(name); if (sh) return sh;
    const src = (window.TIKZ || {})[name]; if (!src) throw new Error('TikZ-Bild fehlt: ' + name);
    const svg = new DOMParser().parseFromString(src, 'image/svg+xml').documentElement;
    sh = shapeFromSvg(document.importNode(svg, true)); tikzCache.set(name, sh); return sh;
  }
  // tikz(name, cx, cy, breite, farbe, reveal 0…1): TikZ-Bild zentriert zeichnen, reveal zeichnet es Stück für Stück
  function tikz(name, cx, cy, width, col = N.white, reveal = 1) {
    const sh = tikzShape(name), sc = width / sh.w;
    drawShape(sh, cx - width / 2, cy - sh.h * sc / 2, sc, col, Math.ceil(clamp(reveal, 0, 1) * sh.items.length), false);
  }

  // ---------------------------------------------------------------- Hintergrund, Untertitel, Zeitplan
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const STARS = Array.from({ length: 160 }, () => [rnd() * SW, rnd() * SH, rnd() * 1.6 + 0.3, rnd()]);
  function background(t) {
    const g = ctx.createRadialGradient(SW / 2, SH * 0.45, 100, SW / 2, SH / 2, SW * 0.75);
    g.addColorStop(0, '#0d1430'); g.addColorStop(1, N.bg); ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
    for (const [x, y, r, p] of STARS) { ctx.globalAlpha = 0.18 + 0.18 * Math.sin(t * 0.8 + p * 20); ctx.fillStyle = '#9fb0ff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function subtitle(text) {
    ctx.font = F.sans(30, 500); const words = text.split(' '), lines = []; let z = '';
    for (const w of words) { const t = z ? z + ' ' + w : w; if (ctx.measureText(t).width > 1300 && z) { lines.push(z); z = w; } else z = t; }
    if (z) lines.push(z);
    const lh = 44, y0 = SH - 30 - lines.length * lh;
    lines.forEach((l, i) => { const w = ctx.measureText(l).width; ctx.fillStyle = 'rgba(3,5,12,0.82)'; ctx.beginPath(); ctx.roundRect(SW / 2 - w / 2 - 16, y0 + i * lh, w + 32, lh, 6); ctx.fill(); T(l, SW / 2, y0 + i * lh + 32, F.sans(30, 500), '#f3f5ff', 'center'); });
  }
  const VIDEO = {
    // Szenenlängen: Textlänge, mindestens 6 s, und bei vorhandenem Sprecher dessen Satzlänge + 1,4 s
    init(narr) {
      const D = window.DREHBUCH; let t = 0, gi = 0; const B = [];
      D.szenen.forEach((s, si) => {
        s.start = t; s.bs = [];
        s.beats.forEach((text, bi) => { let d = Math.max(6, text.length / 13.5 + 2); if (narr && narr[gi] != null) d = Math.max(d, narr[gi] + 1.4); gi++; s.bs.push(t - s.start); B.push({ si, bi, text, start: t, dur: d }); t += d; });
        s.end = t;
      });
      this.B = B; this.TT = t; this.total = t + 4;
      return { total: this.total, beats: B.map(b => ({ si: b.si, bi: b.bi, start: b.start, dur: b.dur, text: b.text })), szenen: D.szenen.map(s => [s.tag || '', Math.round(s.start)]) };
    },
    frame(t) {
      const D = window.DREHBUCH, k = cv.width / SW;
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; noGlow();
      background(t);
      if (t >= this.TT) {
        const a = ease((t - this.TT) / 1); ctx.globalAlpha = a;
        T(D.titel || '', SW / 2, 410, F.disp(66), N.white, 'center'); if (D.untertitel) T(D.untertitel, SW / 2, 476, F.sans(24, 400), N.dim, 'center');
        ctx.globalAlpha = 1; return cv.toDataURL('image/jpeg', 0.95);
      }
      let bi = this.B.length - 1; while (bi > 0 && this.B[bi].start > t) bi--;
      const b = this.B[bi], s = D.szenen[b.si], lt = t - s.start;
      const st = { beat: b.bi, lt, since: t - b.start, bp: clamp((t - b.start) / b.dur, 0, 1), bs: s.bs, t, ap: (j, d = 0.8) => ease((lt - s.bs[j]) / d) };
      ctx.save(); s.draw(st); ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; noGlow();
      if (s.tag) { ctx.globalAlpha = ease(lt / 0.8); T(s.tag.toUpperCase(), 80, 70, F.mono(20, 500), N.gold); ctx.globalAlpha = 1; }
      subtitle(b.text);
      const edge = Math.min(lt, s.end - t);
      if (edge < 0.5) { ctx.globalAlpha = 1 - ease(edge / 0.5); ctx.fillStyle = '#03050c'; ctx.fillRect(0, 0, SW, SH); ctx.globalAlpha = 1; }
      return cv.toDataURL('image/jpeg', 0.95);
    },
  };
  Object.assign(window, { R3, cam, ENV, V3, lerpV, proj, setFX, addLights, addSun, shot, tex, formula, tikz, background, subtitle, VIDEO, glow, noGlow });
})();
