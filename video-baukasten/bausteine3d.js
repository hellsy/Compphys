// video-baukasten: flexible 3-D-Bausteine und Kamerafahrten.
// Alles sind Ausgangspunkte, keine Schablonen: jede Option kann eine Zahl ODER eine Funktion sein,
// Bausteine lassen sich frei kombinieren und mit eigenem three.js-Code ergänzen.
(function () {
  const val = (v, ...a) => (typeof v === 'function' ? v(...a) : v);   // Zahl oder Funktion
  const C = c => (c instanceof THREE.Color ? c : new THREE.Color(c));

  // ---------------------------------------------------------------- Kamera
  // kamera.bahn(keyframes, u): frei definierte Fahrt. keyframes = [{ pos, ziel, fov?, t? , kurve? }, …]
  //   t: Zeitpunkt 0…1 des Keyframes (sonst gleichmäßig), kurve: Easing bis zum nächsten Keyframe
  //   ('weich' Standard, 'linear', 'rein', 'raus' oder eine Funktion u → u). Positionen werden als Spline verbunden.
  const EASE = { weich: ease, linear: u => u, rein: u => u * u * u, raus: u => 1 - Math.pow(1 - u, 3) };
  function bahn(keys, u) {
    const n = keys.length; if (n === 1) return { pos: keys[0].pos.clone(), ziel: keys[0].ziel.clone(), fov: keys[0].fov || 42 };
    const ts = keys.map((k, i) => k.t ?? i / (n - 1)); u = clamp(u, 0, 1);
    let i = 0; while (i < n - 2 && u > ts[i + 1]) i++;
    const lu = clamp((u - ts[i]) / Math.max(1e-9, ts[i + 1] - ts[i]), 0, 1);
    const e = (typeof keys[i].kurve === 'function' ? keys[i].kurve : EASE[keys[i].kurve || 'weich'])(lu);
    const g = (i + e) / (n - 1);
    const sp = new THREE.CatmullRomCurve3(keys.map(k => k.pos)), sz = new THREE.CatmullRomCurve3(keys.map(k => k.ziel));
    return { pos: sp.getPoint(g), ziel: sz.getPoint(g), fov: lerp(keys[i].fov || 42, keys[i + 1].fov || 42, e) };
  }
  const kamera = {
    bahn,
    // umkreisen: mitte, radius, hoehe, winkel (alles darf eine Funktion der Zeit sein, wenn man sie selbst einsetzt)
    orbit: (mitte, radius, hoehe, winkel, fov = 42) => ({ pos: V3(mitte.x + radius * Math.sin(winkel), mitte.y + hoehe, mitte.z + radius * Math.cos(winkel)), ziel: mitte.clone(), fov }),
    // Sturzflug auf einen Punkt: spiralförmig von oben (u = 0) bis knapp darüber (u = 1)
    sturzflug: (punkt, u, { hoehe = 8, radius = 3, drehung = 1.5, fovEnde = 95 } = {}) => {
      const e = ease(u), r = radius * (1 - e), a = drehung * e * Math.PI;
      return { pos: V3(punkt.x + r * Math.sin(a), punkt.y + lerp(hoehe, 0.05, e * e), punkt.z + r * Math.cos(a)), ziel: V3(punkt.x, punkt.y - 2 * e, punkt.z), fov: lerp(50, fovEnde, e * e) };
    },
    // leichtes Wackeln (Handkamera), staerke in Welteinheiten
    wackeln: (k, t, staerke = 0.03) => ({ ...k, pos: k.pos.clone().add(V3(Math.sin(t * 1.7) * staerke, Math.sin(t * 2.3 + 1) * staerke, Math.sin(t * 1.3 + 2) * staerke)) }),
    // eine Kamera-Einstellung rendern
    zeige: (szene, k) => shot(szene, k.pos, k.ziel, k.fov || 42),
  };

  // ---------------------------------------------------------------- Flächen / „Gebirge“
  // flaeche(f, opt): Höhenfeld z = f(x, y). f darf eine Zahl (Höhe) oder { h, farbe } liefern.
  //   opt: x:[min,max], y:[min,max], nx, ny, hoeheMax, farbe: (x, y, h, wert) → Farbe, material: {...}
  //   Rückgabe: { mesh, hoehe(x, y), wachsen(front, richtung), ... } – wachsen lässt die Fläche hinter einer Front entstehen.
  function flaeche(f, opt = {}) {
    const [x0, x1] = opt.x || [-5, 5], [y0, y1] = opt.y || [-5, 5], nx = opt.nx || 160, ny = opt.ny || 160, hmax = opt.hoeheMax ?? 4;
    const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0, nx, ny); geo.rotateX(-Math.PI / 2); geo.translate((x0 + x1) / 2, 0, -(y0 + y1) / 2);
    const P = geo.attributes.position, cols = [], H = new Float32Array(P.count), X = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = -P.getZ(i), r = f(x, y), h = Math.min(hmax, typeof r === 'number' ? r : r.h);
      P.setY(i, h); H[i] = h; X[i] = x;
      const c = C(opt.farbe ? opt.farbe(x, y, h, r) : (r.farbe ?? new THREE.Color().setHSL(0.55 + 0.3 * h / hmax, 0.7, 0.5)));
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide, envMapIntensity: 0.15, ...(opt.material || {}) }));
    mesh.castShadow = mesh.receiveShadow = true;
    const C0 = Float32Array.from(cols);
    return {
      mesh, geo,
      hoehe: (x, y) => Math.min(hmax, (r => typeof r === 'number' ? r : r.h)(f(x, y))),
      // wachsen(front, breite, leuchten): alles mit x > front ist voll da, davor flach und dunkel; an der Front ein Lichtsaum
      wachsen(front, breite = 0.9, leuchten = [0.3, 0.8, 0.95]) {
        const col = geo.attributes.color;
        for (let i = 0; i < P.count; i++) {
          const d = X[i] - front, k = d >= breite ? 1 : d <= 0 ? 0 : ease(d / breite), gl = Math.exp(-d * d * 12);
          P.setY(i, H[i] * k + 0.004); const m = 0.03 + 0.97 * k;
          col.setXYZ(i, C0[3 * i] * m + leuchten[0] * gl, C0[3 * i + 1] * m + leuchten[1] * gl, C0[3 * i + 2] * m + leuchten[2] * gl);
        }
        P.needsUpdate = true; col.needsUpdate = true;
      },
    };
  }

  // ---------------------------------------------------------------- leuchtende Kurven im Raum
  // kurve(punkte, opt): Röhre mit Leuchthülle. opt: radius, farbe (fest oder (s 0…1) → Farbe), glow (Hüllenfaktor)
  //   Rückgabe: { gruppe, zeigeBis(u) } – zeigeBis zeichnet die Kurve nur bis zum Anteil u.
  function kurve(punkte, opt = {}) {
    const cur = new THREE.CatmullRomCurve3(punkte), seg = opt.segmente || Math.max(64, punkte.length * 2), rad = opt.radius ?? 0.04;
    const gruppe = new THREE.Group(), meshes = [];
    for (const [r, alpha, add] of [[rad, 1, false], [rad * (opt.glow ?? 3.5), 0.18, true]]) {
      const g = new THREE.TubeGeometry(cur, seg, r, 8, false), cols = [], n = g.attributes.position.count;
      for (let i = 0; i < n; i++) { const s = Math.floor(i / 9) / seg, c = C(val(opt.farbe ?? N.cyan, s)); cols.push(c.r, c.g, c.b); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: alpha < 1, opacity: alpha, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !add }));
      gruppe.add(m); meshes.push(m);
    }
    return { gruppe, kurve: cur, zeigeBis(u) { meshes.forEach(m => m.geometry.setDrawRange(0, Math.floor(m.geometry.index.count * clamp(u, 0, 1) / 3) * 3)); } };
  }

  // ---------------------------------------------------------------- Leuchtpunkte, Grate, Tunnel
  // leuchtpunkt(farbe, groesse): helle Kugel mit Halo (z. B. Nullstellen, Teilchen, Markierungen)
  function leuchtpunkt(farbe = N.gold, groesse = 0.1) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(groesse, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    m.add(new THREE.Mesh(new THREE.SphereGeometry(groesse * 3, 16, 12), new THREE.MeshBasicMaterial({ color: C(farbe), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })));
    return m;
  }
  // grate(funktionen, opt): mehrere Profile hintereinander (Joy-Division-Stil). funktionen[k](x) → Höhe.
  //   opt: x:[min,max], abstand, skala:[sx, sy], farbe:(k) → Farbe, hervor: Index eines hervorgehobenen Grats
  function grate(funktionen, opt = {}) {
    const [x0, x1] = opt.x || [0, 10], [sx, sy] = opt.skala || [1, 1], ab = opt.abstand ?? 0.9, gruppe = new THREE.Group(), n = opt.punkte || 500;
    const linien = funktionen.map((f, k) => {
      const z = (k - (funktionen.length - 1) / 2) * ab, top = [];
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; top.push(V3((x - (x0 + x1) / 2) * sx, Math.max(0, f(x)) * sy, z)); }
      const pos = [], idx = []; top.forEach(p => pos.push(p.x, p.y, p.z, p.x, 0, p.z));
      for (let i = 0; i < top.length - 1; i++) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setIndex(idx); cg.computeVertexNormals();
      const hervor = opt.hervor === k, c = C(val(opt.farbe ?? (j => `hsl(${200 + j * 10},70%,60%)`), k));
      const g = new THREE.Group();
      g.add(new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0x0b1230, roughness: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })));
      const lm = new THREE.MeshBasicMaterial({ color: hervor ? C(N.gold) : c, transparent: true });
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(top), n, hervor ? 0.05 : 0.025, 6, false), lm));
      gruppe.add(g); return { g, lm };
    });
    return { gruppe, linien };
  }
  // tunnel(textur, opt): Wurmloch-Szene mit Lichtschlieren. textur: Canvas/Bild für die Wand (z. B. ein Farbbild der Funktion)
  //   Rückgabe: { szene, zeige(t) } – zeige(t) rendert den Flug zur Zeit t (Sekunden seit Tunnelbeginn)
  function tunnel(textur, opt = {}) {
    const szene = new THREE.Scene(); szene.fog = new THREE.Fog(0x000000, 6, 60);
    const tex = new THREE.CanvasTexture(textur); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(opt.wiederholung?.[0] ?? 2, opt.wiederholung?.[1] ?? 6);
    const rohr = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 140, 48, 1, true), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide }));
    rohr.rotation.x = Math.PI / 2; rohr.position.z = -60; szene.add(rohr);
    const NS = opt.schlieren ?? 700, pos = new Float32Array(NS * 6), seeds = Array.from({ length: NS }, () => [Math.random() * 6.283, 0.4 + Math.random() * 2.4, Math.random() * 120, 0.5 + Math.random()]);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    szene.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: C(opt.farbe ?? 0xbff1ff), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })));
    setFX(szene, opt.fx || { bloom: [1.1, 0.6, 0.45] });
    return {
      szene,
      zeige(t) {
        const tempo = val(opt.tempo ?? (s => 8 * s + s * s * s), t), spd = 18 + t * t * 6;
        tex.offset.set(t * 0.08, -tempo * 0.02); tex.needsUpdate = true; rohr.rotation.y = t * (opt.drall ?? 0.5);
        seeds.forEach(([a, r, z0, s], i) => { const z = -((z0 - tempo * s * 1.6) % 120 + 120) % 120, len = 0.6 + spd * 0.06, aa = a + t * 0.5; pos.set([Math.cos(aa) * r, Math.sin(aa) * r, z, Math.cos(aa) * r, Math.sin(aa) * r, z - len], i * 6); });
        sg.attributes.position.needsUpdate = true;
        shot(szene, V3(Math.sin(t * 0.7) * 0.3, Math.cos(t * 0.6) * 0.3, 0), V3(0, 0, -50), 70 + t * 6);
      },
    };
  }
  // farbbild(f, opt): Farbbild einer komplexen Funktion als Canvas (Farbe = Winkel, Helligkeit = Betrag), z. B. für tunnel()
  function farbbild(f, { x = [-2, 2], y = [-2, 2], breite = 400, hoehe = 400 } = {}) {
    const c = document.createElement('canvas'); c.width = breite; c.height = hoehe; const g = c.getContext('2d'), img = g.createImageData(breite, hoehe);
    for (let j = 0; j < hoehe; j++) for (let i = 0; i < breite; i++) {
      const [re, im] = f(x[0] + (x[1] - x[0]) * i / breite, y[1] - (y[1] - y[0]) * j / hoehe), m = Math.hypot(re, im);
      const col = new THREE.Color().setHSL(((Math.atan2(im, re) / (2 * Math.PI)) + 1) % 1, 0.7, 0.25 + 0.3 * ((Math.log2(m + 1e-9) % 1 + 1) % 1));
      const o = 4 * (j * breite + i); img.data[o] = col.r * 255; img.data[o + 1] = col.g * 255; img.data[o + 2] = col.b * 255; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0); return c;
  }

  Object.assign(window, { kamera, flaeche, kurve, leuchtpunkt, grate, tunnel, farbbild });
})();
