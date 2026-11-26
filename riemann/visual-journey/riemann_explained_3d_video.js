/* Learning video (motion graphic, English, with real 3-D scenes): The Riemann Hypothesis – a visual journey  ->  riemann_explained_3d.mp4

Same storyboard as riemann_explained_video.js, but four scenes are rendered in true 3-D with three.js
(WebGL in headless Chromium): the curve ζ(½ + it) as a spiral in space, the prime towers as blocks,
the 'zeta mountains' |ζ(s)| over the complex plane, and the ridge landscape of the critical strip.

A strongly animated explainer, structured like a classic "Riemann hypothesis explained" talk:
curlicues → primes as building blocks → Gauss's count → infinite sums → zeta and the Euler
product → complex numbers and rotating arrows → analytic continuation → zeros and the critical
line (as a 3-D ridge landscape) → the harmonics of the primes → computers and proof.
Narration text is original; every picture is computed. Reuses the computational core of
riemann_lernvideo_en.html (ζ via Borwein + functional equation, zeros via Riemann–Siegel Z(t)).

Usage:   npm install   (once, installs three.js)
         node riemann_explained_3d_video.js            ->  riemann_explained_3d.mp4
         VORSCHAU=1 node riemann_explained_3d_video.js ->  quick test run at 10 fps
Requires: Node.js, Playwright with Chromium, ffmpeg, three.js 0.149 (package.json)
*/
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const VORSCHAU = process.env.VORSCHAU === '1';
const FPS = VORSCHAU ? 10 : 30;
const BREITE = 1920, HOEHE = 1080;
const HTML = path.join(__dirname, '..', 'interaktiv', 'riemann_lernvideo_en.html');
const AUS = path.join(__dirname, 'riemann_explained_3d.mp4');
const THREE_JS = path.join(__dirname, 'node_modules', 'three', 'build', 'three.min.js');

function setup() {
  const N = { gold: '#ffd166', cyan: '#4cc9f0', pink: '#f72585', violet: '#9d7bff', green: '#5fe3a1', white: '#eef1ff', dim: '#8d96bd', bg: '#060914' };
  const PCOL = { 2: N.cyan, 3: N.violet, 5: N.pink, 7: N.green, 11: N.gold, 13: '#ff9f43', 17: '#48dbfb', 19: '#ff6b81', 23: '#c8b6ff', 29: '#7bed9f' };
  const pcol = p => PCOL[p] || `hsl(${(p * 47) % 360},70%,66%)`;
  const factors = n => { const f = []; let m = n; for (let p = 2; p * p <= m; p++) while (m % p === 0) { f.push(p); m /= p; } if (m > 1) f.push(m); return f; };
  const glow = (c, b) => { ctx.shadowColor = c; ctx.shadowBlur = b; };
  const noGlow = () => { ctx.shadowBlur = 0; };
  const T = (s, x, y, font, c, al = 'left') => txt(ctx, s, x, y, font, c, al);
  // seeded star dust
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const STARS = Array.from({ length: 160 }, () => [rnd() * SW, rnd() * SH, rnd() * 1.6 + 0.3, rnd()]);
  function background(t) {
    const g = ctx.createRadialGradient(SW / 2, SH * 0.45, 100, SW / 2, SH / 2, SW * 0.75);
    g.addColorStop(0, '#0d1430'); g.addColorStop(1, N.bg); ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
    for (const [x, y, r, p] of STARS) { ctx.globalAlpha = 0.18 + 0.18 * Math.sin(t * 0.8 + p * 20); ctx.fillStyle = '#9fb0ff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  // ---------------- precomputed data
  function curl(t, n) { const pts = [[0, 0]]; let x = 0, y = 0; for (let k = 1; k <= n; k++) { const m = 1 / Math.sqrt(k), a = -t * Math.log(k); x += m * Math.cos(a); y += m * Math.sin(a); pts.push([x, y]); } return pts; }
  const CP = []; for (let t = 0; t <= 100.0001; t += 0.02) { const z = M.zeta([0.5, t]); CP.push([z[0], z[1]]); }
  const SIG = Array.from({ length: 13 }, (_, k) => 0.05 + 0.075 * k);
  const RT = []; for (let t = 0; t <= 50.0001; t += 0.05) RT.push(t);
  const RIDGE = SIG.map(s => RT.map(t => Math.hypot(...M.zeta([s, t]))));
  const Z23 = M.zeta([2, 3]);
  const terms = (s, n) => { const pts = [[0, 0]]; let x = 0, y = 0; for (let k = 1; k <= n; k++) { const m = Math.pow(k, -s[0]), a = -s[1] * Math.log(k); x += m * Math.cos(a); y += m * Math.sin(a); pts.push([x, y]); } return pts; };
  const fmtBig = v => { if (v < 1e6) return de(Math.round(v)); const e = Math.floor(Math.log10(v)); const sup = String(e).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join(''); return (v / Math.pow(10, e)).toFixed(1) + ' × 10' + sup; };
  function arrow(x0, y0, x1, y1, c, w) {
    const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), hl = Math.min(14, L * 0.4);
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - hl * 0.6 * Math.cos(a), y1 - hl * 0.6 * Math.sin(a)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - hl * Math.cos(a - 0.4), y1 - hl * Math.sin(a - 0.4)); ctx.lineTo(x1 - hl * Math.cos(a + 0.4), y1 - hl * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
  }
  let fitHead = [0, 0];
  function fitDraw(pts, box, colA, colB, lw, upto) {   // draw polyline scaled into box
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
    for (const [x, y] of pts) { mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y); }
    const sc = Math.min(box.w / (mxx - mnx || 1), box.h / (mxy - mny || 1));
    const ox = box.x + box.w / 2 - sc * (mnx + mxx) / 2, oy = box.y + box.h / 2 + sc * (mny + mxy) / 2;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = lw; ctx.lineJoin = 'round';
    const n = Math.min(pts.length - 1, upto), seg = 40;
    for (let i = 0; i < n; i += seg) {
      const f = i / pts.length; ctx.strokeStyle = `hsl(${lerp(colA, colB, f)},85%,62%)`; ctx.beginPath(); ctx.moveTo(ox + sc * pts[i][0], oy - sc * pts[i][1]);
      for (let j = i + 1; j <= Math.min(n, i + seg); j++) ctx.lineTo(ox + sc * pts[j][0], oy - sc * pts[j][1]); ctx.stroke();
    }
    fitHead = [ox + sc * pts[n][0], oy - sc * pts[n][1]];
    ctx.globalCompositeOperation = 'source-over';
  }
  function domainView(cy, clipX0, alpha) {
    const hh = 6.75 / 2; ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.rect(clipX0, 0, SW - clipX0, SH); ctx.clip();
    ctx.imageSmoothingEnabled = true; ctx.drawImage(domCanvas, 0, (DOM.im1 - (cy + hh)) * DOM.PX, DOM.W, 2 * hh * DOM.PX, 0, 0, SW, SH);
    ctx.fillStyle = 'rgba(6,9,20,0.3)'; ctx.fillRect(0, 0, SW, SH); ctx.restore();
    return { X: re => (re + 7.5) / 12 * SW, Y: im => SH / 2 - (im - cy) / (2 * hh) * SH };
  }
  const psiWave = (x, g) => { const L = Math.log(x); return -2 * Math.sqrt(x) * (0.5 * Math.cos(g * L) + g * Math.sin(g * L)) / (0.25 + g * g); };

  // ---------------- scenes
  const S = [
  { tag: '', beats: [
      'These swirling curls are traced by a single function as it moves along one line. For more than 160 years, curves like them have fascinated and frustrated mathematicians.',
      'Behind them hides the Riemann hypothesis: perhaps the most important unsolved problem in mathematics, and one of the seven Millennium Problems, worth one million dollars.',
      'If it is true, it reveals the deepest pattern of the prime numbers. Let us build it up step by step: from counting, through infinite sums, all the way to complex numbers.'],
    draw(st) {
      const box = st.beat === 2 ? { x: 820, y: 110, w: 680, h: 600 } : { x: 300, y: 90, w: 1000, h: 640 };
      const upto = Math.floor(clamp(st.lt / 34, 0.02, 1) * (CP.length - 1));
      glow(N.cyan, 12); fitDraw(CP, box, 185, 330, 2.2, upto); noGlow();
      const hb = fitHead; glow(N.white, 30); dot(ctx, hb[0], hb[1], 7, N.white, false); noGlow();
      if (st.beat === 1) { ctx.globalAlpha = st.ap(1, 1.2); card(ctx, 470, 300, 660, 170); T('THE RIEMANN HYPOTHESIS', 800, 360, F.mono(22), N.gold, 'center'); T('$1,000,000', 800, 432, F.disp(64), N.white, 'center'); ctx.globalAlpha = 1; }
      if (st.beat === 2) { ctx.globalAlpha = st.ap(2, 1.2); T('A visual journey', 110, 330, F.mono(22), N.gold); T('Primes, zeta', 104, 420, F.disp(72), N.white); T('and the critical line', 104, 500, F.disp(72), N.white); ctx.globalAlpha = 1; }
      ctx.globalAlpha = 1;
    } },
  { tag: '01 · Building blocks', beats: [
      'Every whole number is built from primes. Picture each number as a tower stacked from its prime factors: twelve is two times two times three.',
      'The primes are the towers made of a single block. More than two thousand years ago, Euclid proved that they never run out.',
      'But where do they appear? They seem to pop up at random. Walking along the numbers, how many single-block towers should you expect to see?'],
    draw(st) {
      const span = st.beat < 2 ? 40 : lerp(40, 100, ease(st.since / 6)), n0 = 2, w = 1440 / span, base = 640;
      const bh = Math.min(46, w * 0.95);
      for (let n = n0; n < n0 + span; n++) {
        const f = factors(n), x = 80 + (n - n0) * w, prime = f.length === 1;
        const rise = st.beat === 0 ? clamp(st.since * 6 - (n - n0) * 0.35, 0, 1) : 1;
        const dimC = st.beat >= 1 && !prime ? 0.22 : 1;
        f.forEach((p, i) => {
          const y = base - (i + 1) * bh * ease(rise); ctx.globalAlpha = dimC * ease(rise);
          if (prime) glow(pcol(p), st.beat >= 1 ? 18 : 6);
          ctx.fillStyle = pcol(p); ctx.beginPath(); ctx.roundRect(x + w * 0.08, y + 2, w * 0.84, bh - 4, Math.min(6, w * 0.15)); ctx.fill(); noGlow();
          if (w > 30 && bh > 26) T(String(p), x + w / 2, y + bh / 2 + 7, F.mono(Math.min(18, w * 0.4), 600), '#0b1020', 'center');
        });
        ctx.globalAlpha = dimC; if (w > 18) T(String(n), x + w / 2, base + 28, F.mono(Math.min(17, w * 0.5)), prime ? N.white : N.dim, 'center');
      }
      ctx.globalAlpha = 1;
      if (st.beat === 0) { ctx.globalAlpha = clamp((st.since - 4) / 0.6, 0, 1); card(ctx, 80, 120, 520, 110); T('12 = 2 · 2 · 3', 110, 192, F.disp(48), N.white); ctx.globalAlpha = 1; }
      if (st.beat === 1) { ctx.globalAlpha = st.ap(1, 0.8); T('primes = towers of height one', 80, 170, F.disp(44), N.gold); T('Euclid, c. 300 BC: infinitely many', 82, 220, F.sans(26, 400), N.dim); ctx.globalAlpha = 1; }
      if (st.beat === 2) { ctx.globalAlpha = st.ap(2, 0.8); T('where is the next one?', 80, 170, F.disp(44), N.gold); ctx.globalAlpha = 1; }
    } },
  { tag: '02 · Counting the primes', beats: [
      'As a teenager, Carl Friedrich Gauss counted primes obsessively, eventually up to three million. Let π(x) be the number of primes up to x. It climbs one step at every prime.',
      'Now zoom out. Ten, a hundred, a thousand, a hundred thousand: the jagged steps melt into a smooth curve.',
      'Gauss guessed that near x, roughly one number in ln x is prime. Adding up that density gives the logarithmic integral li(x). At this scale, the two curves are almost impossible to tell apart.'],
    draw(st) {
      const X = st.beat === 0 ? 12 + st.since * 1.6 : st.beat === 1 ? loglerp(12 + (st.bs[1] - st.bs[0]) * 1.6 - 0.0, 100000, ease(st.since / 7)) : 100000;
      const XX = Math.max(12, Math.min(100000, X)), top = PI_[Math.floor(XX)] * 1.18 + 1.5;
      const P = plot(160, 150, 1300, 560, 0, XX, 0, top);
      axes(ctx, P, { xt: ticks(0, XX, 6), yt: ticks(0, top, 5), xl: 'x' });
      clipTo(ctx, P);
      if (st.beat === 2) { const a = st.ap(2, 1); glow(N.cyan, 12); ctx.strokeStyle = N.cyan; ctx.lineWidth = 4; ctx.beginPath(); const lim = 2 + (XX - 2) * clamp(st.since / 4, 0, 1); for (let px = 0; px <= P.w; px += 2) { const x = Math.max(2, XX * px / P.w); if (x > lim) break; px ? ctx.lineTo(P.X(x), P.Y(li(x))) : ctx.moveTo(P.X(x), P.Y(li(x))); } ctx.globalAlpha = a; ctx.stroke(); noGlow(); ctx.globalAlpha = 1; }
      glow(N.pink, 10); ctx.strokeStyle = N.pink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(P.X(0), P.Y(0));
      if (XX <= 1500) { for (let n = 2; n <= XX; n++) if (!sieve[n]) { ctx.lineTo(P.X(n), P.Y(PI_[n - 1])); ctx.lineTo(P.X(n), P.Y(PI_[n])); } ctx.lineTo(P.X(XX), P.Y(PI_[Math.floor(XX)])); }
      else for (let px = 0; px <= P.w; px++) { const x = Math.floor(XX * px / P.w); ctx.lineTo(P.X(x), P.Y(PI_[x])); }
      ctx.stroke(); noGlow(); ctx.restore();
      if (XX < 60) for (let n = 2; n <= XX; n++) if (!sieve[n]) dot(ctx, P.X(n), P.Y(PI_[n]), 6, N.gold, true);
      card(ctx, 1110, 170, 330, 120); T('x = ' + de(Math.floor(XX)), 1135, 218, F.mono(24), N.white); T('π(x) = ' + de(PI_[Math.floor(XX)]), 1135, 262, F.mono(24), N.pink);
      if (st.beat === 2) { ctx.globalAlpha = st.ap(2, 1); card(ctx, 200, 190, 560, 110); T('li(x) = ∫ dt / ln t', 230, 262, F.disp(42), N.cyan); ctx.globalAlpha = 1; }
    } },
  { tag: '03 · Infinite sums', beats: [
      'To go further we need infinite sums. One half, plus one quarter, plus one eighth, and so on: each piece fills half of the remaining gap, and the total converges to exactly two.',
      'The harmonic series also has shrinking terms: one, a half, a third, a quarter. Yet it creeps past every bound. To pass ten you already need 12,367 terms. It diverges.',
      'In 1735, Leonhard Euler cracked the sum of one over the squares and found π squared over six. Squares on one side, the circle number on the other.'],
    draw(st) {
      const L = 130, U = 600;
      if (st.beat === 0) {
        T('1 + ½ + ¼ + ⅛ + …  =  2', 800, 220, F.disp(56), N.white, 'center');
        const k = Math.min(12, Math.floor(st.since * 1.4) + 1); let x = 0;
        for (let i = 0; i < k; i++) { const w = U * Math.pow(0.5, i); glow(i % 2 ? N.violet : N.cyan, 12); ctx.fillStyle = i % 2 ? N.violet : N.cyan; ctx.fillRect(L + x * 1 + 2, 360, w - 4, 140); noGlow(); if (w > 60) T(i ? '1/' + Math.pow(2, i) : '1', L + x + w / 2, 445, F.disp(32), '#0b1020', 'center'); x += w; }
        ctx.strokeStyle = N.white; ctx.lineWidth = 2; ctx.strokeRect(L, 350, 2 * U, 160);
        T('0', L, 560, F.mono(22), N.dim, 'center'); T('1', L + U, 560, F.mono(22), N.dim, 'center'); T('2', L + 2 * U, 560, F.mono(22), N.gold, 'center');
      } else if (st.beat === 1) {
        T('1 + ½ + ⅓ + ¼ + …  =  ∞', 800, 220, F.disp(56), N.white, 'center');
        const n = Math.min(12367, Math.floor(Math.exp(st.since * 0.95))); let H = 0; const u = 130;
        let x = 0; for (let i = 1; i <= n; i++) { const w = u / i; if (i <= 200) { ctx.fillStyle = `hsl(${190 + i * 7 % 140},80%,${60 - Math.min(i, 30)}%)`; ctx.fillRect(110 + x, 380, Math.max(w - 1, 0.6), 100); } x += w; H += 1 / i; }
        if (n > 200) { ctx.fillStyle = 'rgba(76,201,240,0.5)'; ctx.fillRect(110 + u * 5.878, 380, Math.min(u * (H - 5.878), 1440 - u * 5.878), 100); }
        for (let m = 0; m <= 10; m++) { ctx.strokeStyle = N.dim; ctx.beginPath(); ctx.moveTo(110 + m * u, 370); ctx.lineTo(110 + m * u, 500); ctx.stroke(); T(String(m), 110 + m * u, 530, F.mono(22), m === 10 ? N.gold : N.dim, 'center'); }
        T(de(n) + ' terms   sum = ' + de(H, 3), 800, 630, F.mono(30), N.gold, 'center');
      } else {
        T('1 + ¼ + ⅑ + 1/16 + …  =  π²/6', 800, 220, F.disp(56), N.white, 'center');
        const k = Math.min(40, Math.floor(st.since * 4) + 1), s = 300; let x = 140, sum = 0;
        for (let i = 1; i <= k; i++) { const w = s / i; glow(pcol(PRIMES[(i - 1) % 10]), 8); ctx.fillStyle = pcol(PRIMES[(i - 1) % 10]); ctx.globalAlpha = 0.85; ctx.fillRect(x, 620 - w, Math.max(w - 2, 0.5), w); noGlow(); ctx.globalAlpha = 1; x += w; sum += 1 / (i * i); }
        T('sum = ' + de(sum, 5), 1460, 420, F.mono(30), N.gold, 'right'); T('π²/6 = 1.64493', 1460, 470, F.mono(30), N.cyan, 'right');
      }
    } },
  { tag: '04 · The zeta function', beats: [
      'Now let the exponent vary. Call it s, and you get the zeta function: zeta of s is the sum of one over n to the s. For every s greater than one the sum converges.',
      'Euler then found that the very same function is a product, with one factor for every prime. Multiply the factors out, and every whole number appears exactly once, assembled from its prime factors.',
      'This product is the bridge. Whatever the zeta function does, the primes are hidden inside it.'],
    draw(st) {
      if (st.beat === 0) {
        T('ζ(s) = 1 + 1/2ˢ + 1/3ˢ + 1/4ˢ + …', 800, 160, F.disp(52), N.white, 'center');
        const P = plot(260, 220, 1080, 480, 0, 6, 0, 6);
        axes(ctx, P, { xt: [0, 1, 2, 3, 4, 5, 6], yt: [0, 1, 2, 3, 4, 5, 6], xl: 's' });
        ctx.strokeStyle = 'rgba(247,37,133,0.6)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.X(1), P.y); ctx.lineTo(P.X(1), P.y + P.h); ctx.stroke(); ctx.setLineDash([]);
        clipTo(ctx, P); glow(N.cyan, 14); ctx.strokeStyle = N.cyan; ctx.lineWidth = 4; ctx.beginPath();
        const end = lerp(1.17, 6, clamp(st.since / 6, 0, 1)); let f = true; for (let s = 1.17; s <= end; s += 0.02) { const y = M.zeta([s, 0])[0]; f ? ctx.moveTo(P.X(s), P.Y(y)) : ctx.lineTo(P.X(s), P.Y(y)); f = false; } ctx.stroke(); noGlow(); ctx.restore();
        [[2, 'ζ(2) = π²/6'], [4, 'ζ(4) = π⁴/90']].forEach(([s, l], i) => { if (end < s) return; const y = M.zeta([s, 0])[0]; dot(ctx, P.X(s), P.Y(y), 8, N.gold, true); T(l, P.X(s) + 14, P.Y(y) - 18, F.mono(22), N.gold); });
        T('diverges for s ≤ 1', P.X(1) - 14, P.y + 40, F.sans(22, 600), N.pink, 'right');
      } else if (st.beat === 1) {
        T('ζ(s) = ∏  1 / (1 − 1/pˢ)', 800, 150, F.disp(52), N.white, 'center'); T('one factor for every prime p', 800, 192, F.sans(22, 400), N.dim, 'center');
        const ps = [2, 3, 5, 7, 97], stage = clamp(st.since / 2.2, 0, 5);
        for (let n = 1; n <= 100; n++) {
          const c = (n - 1) % 20, r = Math.floor((n - 1) / 20), x = 110 + c * 69, y = 250 + r * 82, f = factors(n);
          const need = n === 1 ? 0 : ps.findIndex(p => p >= Math.max(...f)) + 1;
          const on = clamp(stage - need + 1, 0, 1), col = n === 1 ? N.white : pcol(Math.max(...f));
          ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.beginPath(); ctx.roundRect(x, y, 62, 70, 8); ctx.fill();
          if (on > 0) { ctx.globalAlpha = on; glow(col, 14); ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, 62, 70, 8); ctx.fill(); noGlow(); ctx.globalAlpha = 1; }
          T(String(n), x + 31, y + 45, F.mono(22, 600), on > 0.5 ? '#0b1020' : '#3a4470', 'center');
        }
        const lab = ['× factor for 2', '× factor for 3', '× factor for 5', '× factor for 7', '× all other primes'][Math.min(4, Math.floor(stage))];
        T(lab, 1490, 230, F.mono(22), N.gold, 'right');
      } else {
        const a = st.ap(2, 1); ctx.globalAlpha = a;
        T('1 + 1/2ˢ + 1/3ˢ + 1/4ˢ + …', 800, 330, F.disp(54), N.cyan, 'center');
        T('=', 800, 420, F.disp(60), N.white, 'center');
        T('(1 + 1/2ˢ + 1/4ˢ + …)(1 + 1/3ˢ + 1/9ˢ + …)(1 + 1/5ˢ + …) ⋯', 800, 510, F.disp(40), N.pink, 'center');
        T('all numbers', 1230, 290, F.sans(22, 500), N.dim); T('only primes', 1290, 560, F.sans(22, 500), N.dim);
        ctx.globalAlpha = 1;
      }
    } },
  { tag: '05 · Complex numbers', beats: [
      'In 1859, Gauss’s former student Bernhard Riemann had a radical idea: feed the zeta function complex numbers.',
      'A complex number has a real part and an imaginary part, so it lives in a plane rather than on a line. Multiplying by i turns every point a quarter turn: i squared is minus one.',
      'With a complex exponent, every term of the sum becomes a small rotating arrow. Placed tip to tail, the arrows for s equal to two plus three i spiral in towards one point: the value of zeta at two plus three i.',
      'But push the real part below one and the spiral never settles down. It curls outward forever. Here the sum simply makes no sense.'],
    draw(st) {
      if (st.beat === 0) {
        const a = st.ap(0, 1); ctx.globalAlpha = a;
        T('Bernhard Riemann', 800, 360, F.disp(76), N.white, 'center'); T('1826 – 1866  ·  Göttingen', 800, 420, F.mono(26), N.gold, 'center');
        T('s  ⟶  σ + i t', 800, 540, F.disp(56), N.cyan, 'center'); ctx.globalAlpha = 1;
      } else if (st.beat === 1) {
        const cx = 800, cy = 430, U = 200;
        ctx.strokeStyle = 'rgba(160,175,230,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 560, cy); ctx.lineTo(cx + 560, cy); ctx.moveTo(cx, cy - 260); ctx.lineTo(cx, cy + 260); ctx.stroke();
        ctx.strokeStyle = 'rgba(160,175,230,0.25)'; ctx.beginPath(); ctx.arc(cx, cy, U, 0, 7); ctx.stroke();
        T('real', cx + 560, cy + 34, F.mono(20), N.dim, 'right'); T('imaginary', cx + 14, cy - 240, F.mono(20), N.dim);
        [['1', 1, 0], ['i', 0, 1], ['−1', -1, 0], ['−i', 0, -1]].forEach(([l, x, y]) => T(l, cx + x * U * 1.18, cy - y * U * 1.18 + 8, F.disp(34), N.white, 'center'));
        const k = st.since / 2.2, ang = (Math.floor(k) + ease((k % 1) * 1.6)) * Math.PI / 2;
        glow(N.gold, 20); arrow(cx, cy, cx + U * Math.cos(ang), cy - U * Math.sin(ang), N.gold, 5); noGlow();
        card(ctx, 90, 160, 380, 120); T('× i  =  turn by 90°', 120, 212, F.sans(28, 600), N.gold); T('i · i = −1', 120, 256, F.disp(34), N.white);
      } else {
        const conv = st.beat === 2, s = conv ? [2, 3] : [0.3, 7], n = conv ? clamp(Math.floor(st.since * 4) + 1, 1, 60) : clamp(Math.floor(Math.exp(st.since * 0.7)) + 1, 1, 3000);
        const pts = terms(s, n);
        let sc = conv ? 330 : 0, cx = conv ? 480 : 800, cy = conv ? 380 : 460;
        if (conv) { const e = ease((st.since - 5) / 7); sc = 330 * lerp(1, 3.2, e); cx = lerp(480, 760 - sc * Z23[0], e); cy = lerp(380, 430 + sc * Z23[1], e); }
        if (!conv) { let r = 0.5; for (const [x, y] of pts) r = Math.max(r, Math.hypot(x - pts[pts.length - 1][0] / 2, y - pts[pts.length - 1][1] / 2)); sc = 260 / r; cx = 800 - sc * pts[pts.length - 1][0] / 2; cy = 450 + sc * pts[pts.length - 1][1] / 2; }
        ctx.strokeStyle = 'rgba(160,175,230,0.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(SW, cy); ctx.moveTo(cx, 140); ctx.lineTo(cx, SH); ctx.stroke();
        if (conv) { glow(N.gold, 24); dot(ctx, cx + sc * Z23[0], cy - sc * Z23[1], 10, N.gold, true); noGlow(); T('ζ(2 + 3i) ≈ ' + Z23[0].toFixed(3) + ' − ' + Math.abs(Z23[1]).toFixed(3) + ' i', cx + sc * Z23[0] + 24, cy - sc * Z23[1] + 50, F.mono(24), N.gold); }
        if (conv || n < 80) { for (let k = 1; k < pts.length; k++) { const c = `hsl(${190 + k * 9},85%,64%)`; glow(c, 8); arrow(cx + sc * pts[k - 1][0], cy - sc * pts[k - 1][1], cx + sc * pts[k][0], cy - sc * pts[k][1], c, conv ? 3.5 : 2.5); } noGlow(); }
        else { glow(N.pink, 8); ctx.strokeStyle = N.pink; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(cx + sc * x, cy - sc * y) : ctx.moveTo(cx + sc * x, cy - sc * y)); ctx.stroke(); noGlow(); }
        card(ctx, 1060, 150, 440, 130); T(conv ? 's = 2 + 3i' : 's = 0.3 + 7i', 1090, 206, F.disp(40), conv ? N.cyan : N.pink); T(de(n) + ' arrows' + (conv ? '' : '  · no limit'), 1090, 252, F.mono(22), N.dim);
      }
    } },
  { tag: '06 · Analytic continuation', beats: [
      'Riemann found a way around this. Analytic continuation extends a function beyond the region where its formula works, and it can do so in only one smooth way.',
      'Here every point of the plane is coloured by the value of zeta: the hue shows its direction, the rings its size. Where the sum converges, on the right, the picture is fixed. Riemann’s extension fills in the rest of the plane.',
      'Only one point stays forbidden. At s equal to one, the function shoots off to infinity.'],
    draw(st) {
      const cy = 1.6, hh = 3.375, Vx = re => (re + 7.5) / 12 * SW;
      const edge = st.beat === 0 ? Vx(1) : st.beat === 1 ? lerp(Vx(1), 0, ease((st.since - 1.5) / 6)) : 0;
      const V = domainView(cy, edge, 1);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, V.Y(0)); ctx.lineTo(SW, V.Y(0)); ctx.moveTo(V.X(0), 0); ctx.lineTo(V.X(0), SH); ctx.stroke();
      if (edge > 2) { glow(N.white, 20); ctx.strokeStyle = N.white; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(edge, 0); ctx.lineTo(edge, SH); ctx.stroke(); noGlow(); }
      for (let r = -7; r <= 4; r++) if (r) T(String(r).replace('-', '−'), V.X(r), V.Y(0) + 30, F.mono(18), N.white, 'center');
      card(ctx, 60, 130, 520, 120); T(st.beat === 0 ? '∑ 1/nˢ converges only here →' : 'continued to the whole plane', 90, 182, F.sans(26, 600), N.white); T('colour = direction · rings = size', 90, 222, F.sans(20, 400), N.dim);
      if (st.beat === 2) { const p = 1 + 0.3 * Math.sin(st.since * 5); glow(N.white, 30); ctx.strokeStyle = N.white; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(V.X(1), V.Y(0), 22 * p, 0, 7); ctx.stroke(); noGlow(); card(ctx, V.X(1) + 40, V.Y(0) - 120, 300, 64); T('pole at s = 1', V.X(1) + 62, V.Y(0) - 78, F.sans(26, 600), N.white); }
    } },
  { tag: '07 · The zeros', beats: [
      'In this new territory, zeta can take the value zero. At minus two, minus four, minus six and so on lie the trivial zeros. They are easy to explain.',
      'The other zeros are far more mysterious. All of them lie in the critical strip, where the real part is between zero and one, and Riemann showed there are infinitely many.',
      'Lift the strip into a landscape. Each ridge traces the size of zeta along one vertical line in the strip. Watch the ground: only one ridge ever touches it.',
      'It is the line with real part exactly one half. Riemann conjectured that every non-trivial zero lies on this critical line. That is the Riemann hypothesis.'],
    draw(st) {
      if (st.beat <= 1) {
        const cy = st.beat === 0 ? 1.2 : lerp(1.2, 30, ease(st.since / 9));
        const V = domainView(cy, 0, 1);
        if (st.beat === 0) [-2, -4, -6].forEach((r, i) => { const a = clamp((st.since - 2 - i * 0.7) / 0.5, 0, 1); ctx.globalAlpha = a; glow(N.pink, 24); ctx.strokeStyle = N.pink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(V.X(r), V.Y(0), 20, 0, 7); ctx.stroke(); noGlow(); T(String(r).replace('-', '−'), V.X(r), V.Y(0) + 56, F.disp(30), N.pink, 'center'); ctx.globalAlpha = 1; });
        else {
          ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(V.X(0), 0, V.X(1) - V.X(0), SH);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(V.X(0), 0); ctx.lineTo(V.X(0), SH); ctx.moveTo(V.X(1), 0); ctx.lineTo(V.X(1), SH); ctx.stroke();
          for (const g of ZEROS) { if (Math.abs(g - cy) > 4) continue; glow(N.gold, 22); dot(ctx, V.X(0.5), V.Y(g), 8, N.gold, false); noGlow(); }
          card(ctx, V.X(1) + 30, 140, 380, 70); T('critical strip 0 < Re(s) < 1', V.X(1) + 50, 184, F.sans(22, 600), N.white);
        }
      } else {
        const X0 = 150, W = 1150, x = (t, k) => X0 + k * 16 + t / 50 * W, base = k => 330 + k * 30, H = 42;
        const nShow = st.beat === 2 ? clamp(st.since * 2.2, 0, 13) : 13;
        for (let k = 0; k <= 12; k++) {
          if (k >= nShow) continue;
          const half = k === 6, dimL = st.beat === 3 && !half ? 0.35 : 1;
          ctx.beginPath(); ctx.moveTo(x(0, k), base(k));
          RT.forEach((t, i) => ctx.lineTo(x(t, k), base(k) - H * Math.min(RIDGE[k][i], 4)));
          ctx.lineTo(x(50, k), base(k)); ctx.closePath(); ctx.fillStyle = N.bg; ctx.fill();
          ctx.globalAlpha = dimL; const c = half ? N.gold : `hsl(${200 + k * 8},70%,${55 + Math.abs(k - 6) * 2}%)`;
          glow(c, half ? 18 : 6); ctx.strokeStyle = c; ctx.lineWidth = half ? 3.5 : 1.8; ctx.beginPath();
          RT.forEach((t, i) => { const y = base(k) - H * Math.min(RIDGE[k][i], 4); i ? ctx.lineTo(x(t, k), y) : ctx.moveTo(x(t, k), y); }); ctx.stroke(); noGlow();
          ctx.strokeStyle = 'rgba(160,175,230,0.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x(0, k), base(k)); ctx.lineTo(x(50, k), base(k)); ctx.stroke();
          T('σ = ' + SIG[k].toFixed(2), x(0, k) - 14, base(k) + 6, F.mono(15), half ? N.gold : N.dim, 'right'); ctx.globalAlpha = 1;
        }
        if (nShow > 6) ZEROS.filter(g => g < 50).forEach(g => { glow(N.gold, 26); dot(ctx, x(g, 6), base(6), 7, N.white, false); noGlow(); });
        T('t →', x(50, 12) + 20, base(12) + 6, F.mono(20), N.dim);
        if (st.beat === 3) { ctx.globalAlpha = st.ap(3, 1); card(ctx, 330, 120, 940, 120); T('All non-trivial zeros have real part ½', 800, 175, F.disp(40), N.gold, 'center'); T('the Riemann hypothesis (1859)', 800, 216, F.sans(22, 400), N.dim, 'center'); ctx.globalAlpha = 1; }
      }
    } },
  { tag: '08 · The music of the primes', beats: [
      'Why should the zeros matter for the primes? Take the prime staircase and change it slightly: step up by log p at every prime p, and at every power of a prime.',
      'Riemann’s explicit formula rebuilds this staircase. It starts with a smooth straight line, the main term.',
      'Then every zero adds a wave, a harmonic whose frequency is the zero’s height on the critical line. One zero, two, five, ten, forty: the waves begin to carve out the steps.',
      'With all infinitely many zeros the match is exact. The primes are the sum of the music of the zeros, and the hypothesis says this music is as balanced as it can possibly be.'],
    draw(st) {
      const seq = [1, 2, 3, 5, 10, 20, 40];
      const Nz = st.beat <= 1 ? 0 : st.beat === 2 ? seq[Math.min(6, Math.floor(st.since / 1.9))] : Math.round(lerp(40, ZEROS.length, ease(st.since / 6)));
      const P = plot(150, 140, 1330, 390, 1, 40, -2, 42);
      axes(ctx, P, { xt: [1, 10, 20, 30, 40], yt: [0, 20, 40], xl: 'x' });
      clipTo(ctx, P);
      glow(N.pink, 10); ctx.strokeStyle = N.pink; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(P.X(1), P.Y(0));
      for (let n = 2; n <= 40; n++) { ctx.lineTo(P.X(n), P.Y(PSI[n - 1])); ctx.lineTo(P.X(n), P.Y(PSI[n])); } ctx.stroke(); noGlow();
      if (st.beat >= 1) {
        const a = st.ap(1, 1); ctx.globalAlpha = a; glow(N.cyan, 14); ctx.strokeStyle = N.cyan; ctx.lineWidth = 3; ctx.beginPath(); let f = true;
        for (let px = 0; px <= P.w; px += 1.5) { const x = 1 + px / P.w * 39; if (x < 1.03) continue; let y = x - Math.log(2 * Math.PI) - 0.5 * Math.log(1 - 1 / (x * x)); for (let k = 0; k < Nz; k++) y += psiWave(x, ZEROS[k]); f ? ctx.moveTo(P.X(x), P.Y(y)) : ctx.lineTo(P.X(x), P.Y(y)); f = false; }
        ctx.stroke(); noGlow(); ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (Nz > 0) {   // the newest harmonic on its own
        const g = ZEROS[Nz - 1], amp = 2 * Math.sqrt(40) / g * 1.15, Q = plot(150, 620, 1330, 110, 1, 40, -amp, amp);
        ctx.strokeStyle = 'rgba(160,175,230,0.2)'; ctx.beginPath(); ctx.moveTo(Q.x, Q.Y(0)); ctx.lineTo(Q.x + Q.w, Q.Y(0)); ctx.stroke();
        glow(N.gold, 10); ctx.strokeStyle = N.gold; ctx.lineWidth = 2.5; ctx.beginPath(); for (let px = 0; px <= Q.w; px += 1.5) { const x = 1 + px / Q.w * 39; const y = psiWave(x, g); px ? ctx.lineTo(Q.X(x), Q.Y(y)) : ctx.moveTo(Q.X(x), Q.Y(y)); } ctx.stroke(); noGlow();
        T('newest wave alone (zero at t = ' + g.toFixed(2) + ')', Q.x, Q.y - 14, F.mono(18), N.gold);
      }
      card(ctx, 180, 150, 300, 66); T(Nz + (Nz === 1 ? ' zero' : ' zeros'), 205, 195, F.mono(30), N.gold);
    } },
  { tag: '09 · Beyond computation', beats: [
      'Computers have now checked more than ten trillion zeros. Every single one of them sits exactly on the critical line.',
      'But no finite search can reach infinity. A single zero off the line would destroy the hypothesis, and only a proof can rule that out.',
      'So the question Riemann raised in 1859 is still open. Do all the zeros lie on one line? Whoever proves it will finally understand the primes.'],
    draw(st) {
      if (st.beat === 0) {
        const cx = 800, v = Math.pow(10, clamp(st.since * 1.25, 1, 13)), speed = 60 + st.since * st.since * 40;
        glow(N.gold, 12); ctx.strokeStyle = 'rgba(255,209,102,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, SH); ctx.stroke(); noGlow();
        const gap = clamp(90 - st.since * 9, 6, 90), off = (st.since * speed) % gap;
        for (let y = -gap + off; y < SH + gap; y += gap) { const r = clamp(gap / 12, 2, 7); glow(N.gold, 16); dot(ctx, cx, y, r, N.white, false); noGlow(); }
        card(ctx, 900, 330, 520, 150); T('zeros checked', 930, 380, F.sans(24, 500), N.dim); T(fmtBig(v), 930, 448, F.disp(56), N.gold);
        T('all on Re(s) = ½', 930, 520, F.sans(24, 600), N.green);
      } else if (st.beat === 1) {
        const cx = 800; ctx.strokeStyle = 'rgba(255,209,102,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, SH); ctx.stroke();
        for (let y = 40; y < SH; y += 34) dot(ctx, cx, y, 4, N.gold, true);
        const fl = 0.5 + 0.5 * Math.sin(st.since * 9), a = st.ap(1, 1);
        ctx.globalAlpha = a * (0.4 + 0.6 * fl); glow(N.pink, 30); dot(ctx, cx + 140, 300, 10, N.pink, false); noGlow();
        ctx.globalAlpha = a; T('?', cx + 180, 316, F.disp(60), N.pink); card(ctx, 920, 470, 520, 120); T('one zero off the line', 950, 520, F.sans(28, 600), N.pink); T('would be enough to break it', 950, 560, F.sans(22, 400), N.dim); ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = 0.6; glow(N.cyan, 10); fitDraw(CP, { x: 820, y: 110, w: 680, h: 600 }, 185, 330, 2, Math.floor(clamp(st.since / 14, 0.05, 1) * (CP.length - 1))); noGlow(); ctx.globalAlpha = 1;
        ctx.globalAlpha = st.ap(2, 1.2); T('Re(s) = ½', 110, 360, F.disp(88), N.gold); T('for every zero?', 114, 430, F.disp(44), N.white); T('open since 1859', 114, 500, F.mono(24), N.dim); ctx.globalAlpha = 1;
      }
    } },
  ];

  // ================================================================ 3-D scenes (three.js, WebGL)
  const GL = document.createElement('canvas'); GL.width = cv.width; GL.height = cv.height;
  const R3 = new THREE.WebGLRenderer({ canvas: GL, antialias: true, preserveDrawingBuffer: true });
  R3.setSize(GL.width, GL.height, false); R3.setClearColor(0x060914, 1);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 400);
  function shot(scene, pos, target, fov = 40) {
    cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.lookAt(target);
    R3.render(scene, cam); ctx.drawImage(GL, 0, 0, SW, SH);
  }
  const proj = v => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * SW, (1 - p.y) / 2 * SH, p.z]; };
  const hsvRGB = (h, s, v) => { const c = new THREE.Color(); c.setHSL(h, s, v); return c; };
  const lerpV = (a, b, t) => a.clone().lerp(b, t);
  const orbit = (cx, cy, cz, r, ang, h) => V3(cx + r * Math.cos(ang), cy + h, cz + r * Math.sin(ang));
  function addLights(sc) { sc.add(new THREE.AmbientLight(0x8090c0, 0.55)); const d = new THREE.DirectionalLight(0xffffff, 0.9); d.position.set(5, 12, 8); sc.add(d); const d2 = new THREE.DirectionalLight(0x6080ff, 0.35); d2.position.set(-8, 4, -6); sc.add(d2); }

  // ---- (a) the curve ζ(½ + it) as a 3-D spiral; t runs along the z-axis
  const SPI = new THREE.Scene(); SPI.fog = new THREE.Fog(0x060914, 18, 46);
  const TZ = 0.32, spPts = [];
  for (let i = 0; i < CP.length && i * 0.02 <= 60; i += 2) spPts.push(V3(CP[i][0] * 1.6, CP[i][1] * 1.6, -i * 0.02 * TZ));
  const spCurve = new THREE.CatmullRomCurve3(spPts);
  function tube(r, color, opacity, additive) {
    const g = new THREE.TubeGeometry(spCurve, spPts.length * 2, r, 8, false);
    const cols = []; const n = g.attributes.position.count;
    for (let i = 0; i < n; i++) { const f = Math.floor(i / 9) / (spPts.length * 2); const c = hsvRGB(0.52 + 0.3 * f, 0.85, 0.6); cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: opacity < 1, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !additive });
    return new THREE.Mesh(g, m);
  }
  const spCore = tube(0.035, 0, 1, false), spGlow = tube(0.13, 0, 0.18, true);
  SPI.add(spCore, spGlow);
  const axisG = new THREE.BufferGeometry().setFromPoints([V3(0, 0, 2), V3(0, 0, -60 * TZ - 2)]);
  SPI.add(new THREE.Line(axisG, new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.55 })));
  const zeroBalls = ZEROS.filter(g => g < 60).map(g => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.position.set(0, 0, -g * TZ); const h = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })); m.add(h); SPI.add(m); return m; });
  function drawSpiral(st, mode) {
    // reveal the curve up to height tMax
    const tMax = mode === 'intro' ? clamp(4 + st.lt * 1.6, 4, 60) : 60;
    const frac = tMax / 60;
    [spCore, spGlow].forEach(m => m.geometry.setDrawRange(0, Math.floor(m.geometry.index.count * frac / 3) * 3));
    zeroBalls.forEach((b, i) => { b.visible = ZEROS[i] <= tMax; });
    const zc = -Math.min(tMax, 30) * TZ * 0.5;
    let pos, tgt;
    if (mode === 'intro' && st.beat < 2) { const a = 0.6 + st.lt * 0.12; pos = orbit(0, 0, zc, 9, a, 2.5 + Math.sin(st.lt * 0.2)); tgt = V3(0.6, 0, zc); }
    else if (mode === 'intro') { const e = ease(st.since / 6), a = 0.6 + st.lt * 0.12; const p0 = orbit(0, 0, zc, 9, a, 2.5), p1 = V3(0.6, 0.1, 14); pos = lerpV(p0, p1, e); tgt = lerpV(V3(0.6, 0, zc), V3(0.6, 0, -20), e); }
    else { const a = st.lt * 0.15; pos = orbit(0, 0, -6, 12, a, 4); tgt = V3(0.5, 0, -8); }
    shot(SPI, pos, tgt, 42);
    // labels for the first zeros
    if (mode === 'intro' && st.beat < 2) ZEROS.slice(0, 4).forEach((g, i) => { if (g > tMax) return; const [x, y, z] = proj(V3(0, 0, -g * TZ)); if (z < 1) T('t = ' + g.toFixed(2), x + 16, y - 12, F.mono(18), N.gold); });
  }

  // ---- (b) prime towers as real blocks
  const TOW = new THREE.Scene(); TOW.fog = new THREE.Fog(0x060914, 25, 70); addLights(TOW);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 60), new THREE.MeshStandardMaterial({ color: 0x0a1028, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(150, 0, 0); TOW.add(floor);
  const grid = new THREE.GridHelper(400, 400, 0x1c2550, 0x141b3c); grid.position.set(150, 0.001, 0); TOW.add(grid);
  const towers = [];
  const boxG = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  for (let n = 2; n <= 200; n++) {
    const f = factors(n), prime = f.length === 1, grp = new THREE.Group(); grp.position.set(n - 2, 0, 0);
    f.forEach((p, i) => { const c = new THREE.Color(pcol(p)); const m = new THREE.Mesh(boxG, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: prime ? 0.55 : 0.12, roughness: 0.45, metalness: 0.1, transparent: true })); m.position.y = 0.42 + i * 0.84; grp.add(m); });
    TOW.add(grp); towers.push({ n, grp, prime, h: f.length });
  }
  function drawTowers(st) {
    towers.forEach(t => {
      const rise = st.beat === 0 ? clamp(st.since * 6 - (t.n - 2) * 0.35, 0, 1) : 1;
      t.grp.scale.set(1, Math.max(0.001, ease(rise)), 1);
      const op = st.beat >= 1 && !t.prime ? lerp(1, 0.16, st.ap(1, 1.2)) : 1;
      t.grp.children.forEach(m => { m.material.opacity = op; m.material.emissiveIntensity = t.prime ? (st.beat >= 1 ? 0.55 : 0.3) : 0.06; });
    });
    let pos, tgt;
    if (st.beat === 0) { const x = lerp(2, 18, ease(st.since / 14)); pos = V3(x - 6, 3.2, 9); tgt = V3(x + 3, 1.4, 0); }
    else if (st.beat === 1) { const x = lerp(18, 34, ease(st.since / 12)); pos = V3(x - 4, 5, 11); tgt = V3(x + 4, 0.8, 0); }
    else { const e = ease(st.since / 9); pos = lerpV(V3(30, 5, 11), V3(60, 30, 40), e); tgt = lerpV(V3(38, 0.8, 0), V3(85, 0, 0), e); }
    shot(TOW, pos, tgt, 45);
    towers.forEach(t => { const [x, y, z] = proj(V3(t.n - 2, 0, 0.7)); if (z < 1 && x > 20 && x < SW - 20 && cam.position.distanceTo(V3(t.n - 2, 0, 0)) < (st.beat < 2 ? 17 : 70) && (st.beat < 2 || t.prime)) T(String(t.n), x, y + 24, F.mono(st.beat < 2 ? 18 : 13, t.prime ? 600 : 400), t.prime ? N.white : N.dim, 'center'); });
  }

  // ---- (c) the zeta mountains: height = size of ζ, colour = angle of ζ
  const MTN = new THREE.Scene(); MTN.fog = new THREE.Fog(0x060914, 18, 55); addLights(MTN);
  const s0 = -6.6, s1 = 3.0, t0 = -3, t1 = 40, NS = 192, NT = 690;
  const mG = new THREE.PlaneGeometry(s1 - s0, t1 - t0, NS, NT); mG.rotateX(-Math.PI / 2); mG.translate((s0 + s1) / 2, 0, 0);   // x = Re(s) from s0 to s1
  { const P = mG.attributes.position, cols = [];
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i); const sg = x, tt = (t1 + t0) / 2 - z;   // z runs from -(t1-t0)/2 .. +(t1-t0)/2
      const v = M.zeta([sg, tt]); const m = Math.hypot(v[0], v[1]);
      const h = isFinite(m) ? Math.min(3.0, 0.9 * Math.log(1 + m)) : 3.0; P.setY(i, h);
      const hue = ((Math.atan2(v[1], v[0]) / (2 * Math.PI)) + 1) % 1; const c = hsvRGB(hue, 0.88, 0.27 + 0.07 * Math.min(h, 2)); cols.push(c.r, c.g, c.b);
    }
    mG.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); mG.computeVertexNormals(); }
  const mtn = new THREE.Mesh(mG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide }));
  const tz = t => (t1 + t0) / 2 - t;          // world z of height t
  MTN.add(mtn);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(1, t1 - t0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
  strip.rotation.x = -Math.PI / 2; strip.position.set(0.5, 0.02, 0); MTN.add(strip);
  const critPts = []; for (let t = t0; t <= t1; t += 0.05) { const v = M.zeta([0.5, t]); critPts.push(V3(0.5, Math.min(3, 0.9 * Math.log(1 + Math.hypot(v[0], v[1]))) + 0.04, tz(t))); }
  const critLine = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(critPts), critPts.length, 0.035, 6, false), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
  MTN.add(critLine);
  const mZeros = ZEROS.filter(g => g < t1).map(g => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }))); m.position.set(0.5, 0.06, tz(g)); MTN.add(m); return m; });
  const trivial = [-2, -4, -6].map(r => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 32), new THREE.MeshBasicMaterial({ color: 0xf72585 })); m.rotation.x = Math.PI / 2; m.position.set(r, 0.08, tz(0)); MTN.add(m); return m; });
  function drawMountains(st) {
    let pos, tgt;
    if (st.beat === 0) { const a = lerp(-0.3, 0.3, ease(st.since / 12)); pos = V3(-2.4 + 8.5 * Math.sin(a), 4.6, tz(-3) + 8.5 * Math.cos(a)); tgt = V3(-2.5, 0.4, tz(2)); }
    else { const tc = lerp(4, 32, ease(st.since / 12)); pos = V3(5.8, 5.2, tz(tc - 5)); tgt = V3(0.3, 0, tz(tc + 3)); }
    strip.material.opacity = st.beat >= 1 ? 0.06 + 0.06 * st.ap(1, 1) : 0.03;
    shot(MTN, pos, tgt, 46);
    if (st.beat === 0) {
      [[-2, '−2'], [1, 'pole at s = 1']].forEach(([r, l]) => { const [x, y, z] = proj(V3(r, r === 1 ? 3.1 : 0.1, tz(0))); if (z < 1) T(l, x, y - 22, F.sans(24, 600), r === 1 ? N.white : N.pink, 'center'); });
      [[-4, '−4'], [-6, '−6']].forEach(([r, l]) => { const [x, y, z] = proj(V3(r, 0.1, tz(0))); if (z < 1) T(l, x, y - 22, F.sans(24, 600), N.pink, 'center'); });
    } else {
      ZEROS.slice(0, 8).forEach(g => { const [x, y, z] = proj(V3(0.5, 0.1, tz(g))); if (z < 1 && y > 200 && y < SH - 170) T('½ + ' + g.toFixed(2) + ' i', x + 22, y + 6, F.sans(20, 600), N.gold); });
      card(ctx, 1080, 110, 420, 70); T('critical strip 0 < Re(s) < 1', 1105, 155, F.sans(22, 600), N.white);
    }
  }

  // ---- (d) the ridge landscape in real 3-D
  const RID = new THREE.Scene(); RID.fog = new THREE.Fog(0x060914, 22, 60); addLights(RID);
  const RX = t => t * 0.5 - 12.5, RZ = k => (k - 6) * 0.9, RY = v => 0.75 * Math.min(v, 4);
  const ridges = SIG.map((sg, k) => {
    const half = k === 6, grp = new THREE.Group();
    const top = RT.map((t, i) => V3(RX(t), RY(RIDGE[k][i]), RZ(k)));
    const curtainPos = []; top.forEach(p => { curtainPos.push(p.x, p.y, p.z, p.x, 0, p.z); });
    const idx = []; for (let i = 0; i < top.length - 1; i++) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(curtainPos, 3)); cg.setIndex(idx); cg.computeVertexNormals();
    const c = new THREE.Color(half ? 0xffd166 : `hsl(${200 + k * 8},70%,60%)`);
    grp.add(new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: half ? 0x3a2c08 : 0x0b1230, emissive: half ? 0x2a1d00 : 0x050814, roughness: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })));
    const lg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(top), 600, half ? 0.05 : 0.025, 6, false);
    const lm = new THREE.MeshBasicMaterial({ color: c, transparent: true }); grp.add(new THREE.Mesh(lg, lm));
    RID.add(grp); return { grp, lm, half };
  });
  const rZeros = ZEROS.filter(g => g < 50).map(g => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }))); m.position.set(RX(g), 0.02, RZ(6)); RID.add(m); return m; });
  const rFloor = new THREE.GridHelper(40, 40, 0x1c2550, 0x121935); rFloor.position.y = -0.01; RID.add(rFloor);
  function drawRidges(st) {
    const show = st.beat === 2 ? clamp(st.since * 2.2, 0, 13) : 13;
    ridges.forEach((r, k) => { r.grp.visible = k < show; r.grp.position.y = k < show ? -2 * (1 - ease(clamp(show - k, 0, 1))) : 0; r.lm.opacity = st.beat === 3 && !r.half ? lerp(1, 0.25, st.ap(3, 1)) : 1; });
    rZeros.forEach(z => { z.visible = show > 6; });
    const a = (st.beat === 2 ? lerp(-0.9, -0.35, ease(st.since / 12)) : lerp(-0.35, 0.35, ease(st.since / 12)));
    const pos = V3(Math.sin(a) * 19, st.beat === 2 ? 9 : lerp(9, 4, ease(st.since / 10)), Math.cos(a) * 19), tgt = V3(0, 0.6, 0);
    shot(RID, pos, tgt, 42);
    [0, 6, 12].forEach(k => { const [x, y, z] = proj(V3(RX(0) - 0.6, 0, RZ(k))); if (z < 1 && k < show) T('σ = ' + SIG[k].toFixed(2), x, y, F.mono(18), k === 6 ? N.gold : N.dim, 'right'); });
    if (st.beat === 3) { ctx.globalAlpha = st.ap(3, 1); card(ctx, 330, 120, 940, 120); T('All non-trivial zeros have real part ½', 800, 175, F.disp(40), N.gold, 'center'); T('the Riemann hypothesis (1859)', 800, 216, F.sans(22, 400), N.dim, 'center'); ctx.globalAlpha = 1; }
  }

  // ---- (e) 3-D title: golden extruded letters with light sweep, gold dust and bloom
  const GL2 = document.createElement('canvas'); GL2.width = cv.width; GL2.height = cv.height;
  const R4 = new THREE.WebGLRenderer({ canvas: GL2, antialias: true, alpha: true, preserveDrawingBuffer: true });
  R4.setSize(GL2.width, GL2.height, false); R4.setClearColor(0x000000, 0);
  const TIT = new THREE.Scene(), tcam = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 200);
  TIT.add(new THREE.AmbientLight(0x404a70, 0.6));
  const key = new THREE.DirectionalLight(0xfff1c8, 0.9); key.position.set(-4, 6, 10); TIT.add(key);
  const sweep = new THREE.PointLight(0xffffff, 3.2, 14); TIT.add(sweep);
  const rim = new THREE.PointLight(0x4cc9f0, 1.6, 30); rim.position.set(0, -3, -4); TIT.add(rim);
  const font = new THREE.TitleFont(window.TITLE_FONT);
  const goldMat = () => new THREE.MeshPhongMaterial({ color: 0xe8b84a, specular: 0xfff4d0, shininess: 90, emissive: 0x3a2400, transparent: true });
  const letters = [];
  function word(text, size, y) {
    const glyphs = [...text]; let x = 0; const items = [];
    for (const ch of glyphs) {
      const g = font.data.glyphs[ch] || font.data.glyphs['?'], adv = g.ha * size / font.data.resolution;
      if (ch !== ' ') {
        const geo = new THREE.ExtrudeGeometry(font.generateShapes(ch, size), { depth: size * 0.28, bevelEnabled: true, bevelThickness: size * 0.05, bevelSize: size * 0.03, bevelSegments: 3, curveSegments: 6 });
        geo.computeBoundingBox(); const bb = geo.boundingBox; geo.translate(-(bb.max.x + bb.min.x) / 2, 0, -size * 0.14);
        const m = new THREE.Mesh(geo, goldMat()); items.push({ m, x: x + adv / 2 });
      }
      x += adv * 1.07;
    }
    items.forEach(it => { it.home = V3(it.x - x / 2, y, 0); TIT.add(it.m); letters.push(it); });
  }
  word('THE RIEMANN', 1.15, 0.75); word('HYPOTHESIS', 1.15, -0.85);
  letters.forEach((it, i) => { it.i = i; it.from = V3(it.home.x * 2.2 + (i % 2 ? 3 : -3), it.home.y + (i % 3 - 1) * 4, 30 + i * 1.5); it.spin = (i % 2 ? 1 : -1) * (2.5 + (i % 4)); });
  // gold dust
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,240,200,1)'); r.addColorStop(0.3, 'rgba(255,209,102,0.6)'); r.addColorStop(1, 'rgba(255,209,102,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const NP = 900, dPos = new Float32Array(NP * 3), dSeed = [];
  for (let i = 0; i < NP; i++) { const s = [rnd() * 24 - 12, rnd() * 10 - 5, rnd() * 10 - 6, rnd() * 6.28, 0.3 + rnd() * 0.7]; dSeed.push(s); }
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dMat = new THREE.PointsMaterial({ map: dotTex, size: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
  TIT.add(new THREE.Points(dGeo, dMat));
  function drawTitle(t, fadeOut) {
    // t: seconds since the title starts
    letters.forEach(it => {
      const k = ease(clamp((t - it.i * 0.11) / 1.6, 0, 1));
      it.m.position.copy(lerpV(it.from, it.home, k));
      it.m.rotation.set((1 - k) * it.spin * 0.6, (1 - k) * it.spin, 0);
      it.m.material.opacity = clamp((t - it.i * 0.11) * 3, 0, 1) * (1 - fadeOut);
    });
    const sw = ((t - 2.2) % 6.5) / 2.2;                       // light sweep every 6.5 s
    sweep.position.set(lerp(-11, 11, clamp(sw, 0, 1)), 1.5, 3.2); sweep.intensity = sw >= 0 && sw <= 1 ? 3.2 : 0.4;
    for (let i = 0; i < NP; i++) { const s = dSeed[i]; dPos[3 * i] = s[0] + Math.sin(t * 0.3 * s[4] + s[3]) * 0.6; dPos[3 * i + 1] = s[1] + ((t * 0.35 * s[4] + s[3]) % 10) - 5 + 5 * 0; dPos[3 * i + 2] = s[2]; }
    dGeo.attributes.position.needsUpdate = true; dMat.opacity = 0.85 * clamp(t / 1.5, 0, 1) * (1 - fadeOut);
    const drift = t * 0.05;
    tcam.position.set(Math.sin(drift) * 1.6, 0.35 + Math.sin(t * 0.21) * 0.25, 13 - clamp(t / 12, 0, 1) * 1.2); tcam.lookAt(0, -0.05, 0);
    R4.clear(); R4.render(TIT, tcam);
    // bloom: blurred additive copy, then the sharp letters
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.filter = 'blur(16px)'; ctx.globalAlpha = 0.5; ctx.drawImage(GL2, 0, 0, SW, SH);
    ctx.filter = 'blur(4px)'; ctx.globalAlpha = 0.28; ctx.drawImage(GL2, 0, 0, SW, SH); ctx.restore();
    ctx.drawImage(GL2, 0, 0, SW, SH);
  }

  // ---- hook the 3-D scenes into the storyboard
  const old9 = S[9].draw;
  S[0].draw = st => {
    drawSpiral(st, 'intro');
    if (st.beat === 1) {
      ctx.globalAlpha = 0.6 * st.ap(1, 1); ctx.fillStyle = '#03050c'; ctx.fillRect(0, 0, SW, SH); ctx.globalAlpha = 1;
      drawTitle(st.since, 0);
      ctx.globalAlpha = clamp((st.since - 3) / 1, 0, 1); T('MILLENNIUM PRIZE PROBLEM  ·  $1,000,000', 800, 660, F.mono(24, 500), N.gold, 'center'); ctx.globalAlpha = 1;
    }
    if (st.beat === 2 && st.since < 1.3) { const d = st.bs[2] - st.bs[1]; ctx.globalAlpha = 0.6 * (1 - ease(st.since)); ctx.fillStyle = '#03050c'; ctx.fillRect(0, 0, SW, SH); ctx.globalAlpha = 1; drawTitle(d + st.since, ease(st.since / 1.2)); }
    if (st.beat === 2) { ctx.globalAlpha = ease((st.since - 5) / 1.2); T('A visual journey', 110, 330, F.mono(22), N.gold); T('Primes, zeta', 104, 420, F.disp(72), N.white); T('and the critical line', 104, 500, F.disp(72), N.white); ctx.globalAlpha = 1; }
  };
  S[1].draw = st => {
    drawTowers(st);
    if (st.beat === 0) { ctx.globalAlpha = clamp((st.since - 4) / 0.6, 0, 1); card(ctx, 80, 110, 470, 100); T('12 = 2 · 2 · 3', 110, 178, F.disp(46), N.white); ctx.globalAlpha = 1; }
    if (st.beat === 1) { ctx.globalAlpha = st.ap(1, 0.8); T('primes = towers of height one', 80, 160, F.disp(44), N.gold); T('Euclid, c. 300 BC: infinitely many', 82, 206, F.sans(26, 400), N.dim); ctx.globalAlpha = 1; }
    if (st.beat === 2) { ctx.globalAlpha = st.ap(2, 0.8); T('where is the next one?', 80, 160, F.disp(44), N.gold); ctx.globalAlpha = 1; }
  };
  S[7].draw = st => { if (st.beat <= 1) drawMountains(st); else drawRidges(st); };
  S[9].draw = st => {
    if (st.beat < 2) return old9(st);
    drawSpiral(st, 'final');
    ctx.globalAlpha = st.ap(2, 1.2); ctx.fillStyle = 'rgba(6,9,20,0.45)'; ctx.fillRect(0, 0, 820, SH);
    T('Re(s) = ½', 110, 360, F.disp(88), N.gold); T('for every zero?', 114, 430, F.disp(44), N.white); T('open since 1859', 114, 500, F.mono(24), N.dim); ctx.globalAlpha = 1;
  };
  // the narration of scene 7, beat 2 now describes a real landscape
  S[7].beats[2] = 'Lift the strip into a landscape. Each ridge traces the size of zeta along one vertical line in the strip. Watch the ground: only one ridge ever touches it.';

  // ================================================================ formula typesetting (2-D)
  // pieces: ['t', text] | ['f', num, den] | ['op', '∑' or '∏', top, bottom]; 'x^y' draws y as superscript
  function pw(p, size) {
    const tw = s => { const [b, e] = s.split('^'); ctx.font = F.disp(size); let w = ctx.measureText(b).width; if (e) { ctx.font = F.disp(size * 0.6); w += ctx.measureText(e).width + 2; } return w; };
    if (p[0] === 't') return tw(p[1]);
    if (p[0] === 'f') return Math.max(tw(p[1]), tw(p[2])) + size * 0.35;
    return size * 1.35;
  }
  function tx(s, x, y, size, col, al = 'left') {
    const [b, e] = s.split('^'); ctx.font = F.disp(size); const wb = ctx.measureText(b).width; let we = 0;
    if (e) { ctx.font = F.disp(size * 0.6); we = ctx.measureText(e).width + 2; }
    const x0 = al === 'center' ? x - (wb + we) / 2 : x;
    T(b, x0, y, F.disp(size), col); if (e) T(e, x0 + wb + 2, y - size * 0.42, F.disp(size * 0.6), col);
  }
  function formula(pieces, cx, y, size, col, reveal = 99) {   // y = axis of fraction bars
    const ws = pieces.map(p => pw(p, size)), gap = size * 0.22, W = ws.reduce((a, b) => a + b, 0) + gap * (pieces.length - 1);
    let x = cx - W / 2;
    pieces.forEach((p, i) => {
      const a = clamp(reveal - i, 0, 1); if (a <= 0) { x += ws[i] + gap; return; }
      ctx.globalAlpha *= a; const c = p[3] && p[0] !== 'op' ? p[3] : col;
      if (p[0] === 't') tx(p[1], x, y + size * 0.36, size, c);
      else if (p[0] === 'f') { tx(p[1], x + ws[i] / 2, y - size * 0.22, size, c, 'center'); ctx.fillStyle = c; ctx.fillRect(x + size * 0.08, y - size * 0.04, ws[i] - size * 0.16, Math.max(2, size * 0.05)); tx(p[2], x + ws[i] / 2, y + size * 0.86, size, c, 'center'); }
      else { glow(N.gold, 14); T(p[1], x + ws[i] / 2, y + size * 0.62, F.disp(size * 1.9), N.gold, 'center'); noGlow(); if (p[2]) T(p[2], x + ws[i] / 2, y - size * 1.2, F.disp(size * 0.5), N.gold, 'center'); if (p[3]) T(p[3], x + ws[i] / 2, y + size * 1.42, F.disp(size * 0.5), N.gold, 'center'); }
      ctx.globalAlpha /= a; x += ws[i] + gap;
    });
  }
  const ZETA_SUM = [['t', 'ζ(s)  ='], ['op', '∑', '∞', 'n = 1'], ['f', '1', 'n^s']];
  const ZETA_TERMS = [['t', '='], ['t', '1'], ['t', '+'], ['f', '1', '2^s'], ['t', '+'], ['f', '1', '3^s'], ['t', '+'], ['f', '1', '4^s'], ['t', '+  …']];
  const ZETA_PROD = [['t', '='], ['op', '∏', '', 'p prime'], ['f', '1', '1 − 1/p^s']];

  // scene 04 with real ∑ / ∏ notation
  S[4].draw = st => {
    if (st.beat === 0) {
      formula(ZETA_SUM, 470, 170, 46, N.white, 1 + st.since * 1.5);
      formula(ZETA_TERMS, 1060, 170, 40, N.cyan, (st.since - 2) * 2.2);
      const P = plot(260, 300, 1080, 400, 0, 6, 0, 6);
      axes(ctx, P, { xt: [0, 1, 2, 3, 4, 5, 6], yt: [0, 2, 4, 6], xl: 's' });
      ctx.strokeStyle = 'rgba(247,37,133,0.6)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.X(1), P.y); ctx.lineTo(P.X(1), P.y + P.h); ctx.stroke(); ctx.setLineDash([]);
      clipTo(ctx, P); glow(N.cyan, 14); ctx.strokeStyle = N.cyan; ctx.lineWidth = 4; ctx.beginPath();
      const end = lerp(1.17, 6, clamp((st.since - 4) / 6, 0, 1)); let f = true; for (let s = 1.17; s <= end; s += 0.02) { const y = M.zeta([s, 0])[0]; f ? ctx.moveTo(P.X(s), P.Y(y)) : ctx.lineTo(P.X(s), P.Y(y)); f = false; } ctx.stroke(); noGlow(); ctx.restore();
      [[2, 'ζ(2) = π²/6'], [4, 'ζ(4) = π⁴/90']].forEach(([s, l]) => { if (end < s) return; const y = M.zeta([s, 0])[0]; dot(ctx, P.X(s), P.Y(y), 8, N.gold, true); T(l, P.X(s) + 14, P.Y(y) - 18, F.mono(22), N.gold); });
      T('diverges for s ≤ 1', P.X(1) - 14, P.y + 40, F.sans(22, 600), N.pink, 'right');
    } else if (st.beat === 1) {
      formula([['t', 'ζ(s)']].concat(ZETA_PROD), 800, 165, 44, N.white, 1 + st.since * 2);
      const ps = [2, 3, 5, 7, 97], stage = clamp((st.since - 1.5) / 2.2, 0, 5);
      for (let n = 1; n <= 100; n++) {
        const c = (n - 1) % 20, r = Math.floor((n - 1) / 20), x = 110 + c * 69, y = 290 + r * 80, f = factors(n);
        const need = n === 1 ? 0 : ps.findIndex(p => p >= Math.max(...f)) + 1;
        const on = clamp(stage - need + 1, 0, 1), col = n === 1 ? N.white : pcol(Math.max(...f));
        ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.beginPath(); ctx.roundRect(x, y, 62, 68, 8); ctx.fill();
        if (on > 0) { ctx.globalAlpha = on; glow(col, 14); ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, 62, 68, 8); ctx.fill(); noGlow(); ctx.globalAlpha = 1; }
        T(String(n), x + 31, y + 44, F.mono(22, 600), on > 0.5 ? '#0b1020' : '#3a4470', 'center');
      }
      T(['× factor for 2', '× factor for 3', '× factor for 5', '× factor for 7', '× all other primes'][Math.min(4, Math.floor(stage))], 1490, 270, F.mono(22), N.gold, 'right');
    } else {
      const a = st.ap(2, 1); ctx.globalAlpha = a;
      formula([['op', '∑', '∞', 'n = 1'], ['f', '1', 'n^s']], 520, 360, 64, N.cyan);
      T('=', 800, 383, F.disp(72), N.white, 'center');
      formula([['op', '∏', '', 'p prime'], ['f', '1', '1 − 1/p^s']], 1110, 360, 64, N.pink);
      T('every whole number', 520, 560, F.sans(26, 500), N.cyan, 'center'); T('only the primes', 1110, 560, F.sans(26, 500), N.pink, 'center');
      ctx.globalAlpha = 1;
    }
  };
  // scene 05: show the sum behind the arrows
  const old5 = S[5].draw;
  S[5].draw = st => { old5(st); if (st.beat >= 2) { const conv = st.beat === 2; formula([['op', '∑', 'N', 'n = 1'], ['f', '1', conv ? 'n^2 + 3i' : 'n^0.3 + 7i']], 1290, 380, 34, conv ? N.cyan : N.pink); } };

  // ================================================================ 3-D: analytic continuation on the zeta mountains
  R3.localClippingEnabled = true;
  const clipPlane = new THREE.Plane(V3(1, 0, 0), 99);
  mtn.material.clippingPlanes = [clipPlane];
  // the landscape "grows" out of the floor behind a glowing front (heights and colours per frame)
  const mPos = mG.attributes.position, mCol = mG.attributes.color, NV = mPos.count;
  const H0 = new Float32Array(NV), C0 = new Float32Array(NV * 3), XV = new Float32Array(NV);
  for (let i = 0; i < NV; i++) { H0[i] = mPos.getY(i); XV[i] = mPos.getX(i); C0[3 * i] = mCol.getX(i); C0[3 * i + 1] = mCol.getY(i); C0[3 * i + 2] = mCol.getZ(i); }
  const XMIN = s0;
  let grownTo = null;
  function growFrom(edge) {
    if (grownTo === edge) return; grownTo = edge;
    for (let i = 0; i < NV; i++) {
      const d = XV[i] - edge, f = d >= 0.9 ? 1 : d <= 0 ? 0 : ease(d / 0.9), glowF = Math.exp(-d * d * 12) * (edge > XMIN ? 1 : 0);
      mPos.setY(i, H0[i] * f + 0.004);
      const after = d > 0 && edge > XMIN ? 0.35 * Math.exp(-d / 0.9) : 0, k = 0.03 + 0.97 * f + after;
      mCol.setXYZ(i, C0[3 * i] * k + 0.3 * glowF, C0[3 * i + 1] * k + 0.8 * glowF, C0[3 * i + 2] * k + 0.95 * glowF);
    }
    mPos.needsUpdate = true; mCol.needsUpdate = true;
  }
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, t1 - t0), new THREE.MeshBasicMaterial({ color: 0xbff1ff })); MTN.add(front);
  const frontGlow = new THREE.Mesh(new THREE.PlaneGeometry(t1 - t0, 1.2), new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  frontGlow.rotation.y = Math.PI / 2; MTN.add(frontGlow);
  const floorGrid = new THREE.GridHelper(60, 60, 0x24306a, 0x161e44); floorGrid.position.set(0, -0.02, 0); MTN.add(floorGrid);
  const poleRing = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffffff })); poleRing.rotation.x = Math.PI / 2; poleRing.position.set(1, 3.05, tz(0)); MTN.add(poleRing);
  function mtnExtras(scene) {   // which helpers are visible in which scene
    const z7 = scene === 7, z9 = scene === 9;
    strip.visible = critLine.visible = z7 || z9; mZeros.forEach(m => { m.visible = z7 || z9; }); trivial.forEach(m => { m.visible = z7; });
    front.visible = frontGlow.visible = poleRing.visible = floorGrid.visible = scene === 6;
    clipPlane.constant = 99;
    if (scene !== 6) growFrom(XMIN - 1);
  }
  function drawContinuation(st) {
    mtnExtras(6);
    const d1 = st.bs[1], since1 = st.lt - d1;
    const edge = st.beat === 0 ? 1.0 : st.beat === 1 ? lerp(1.0, XMIN - 1, ease((since1 - 1.5) / 9)) : XMIN - 1;
    growFrom(+edge.toFixed(3));
    front.position.set(edge, 0.03, 0); frontGlow.position.set(edge, 0.6, 0);
    front.visible = frontGlow.visible = edge > XMIN - 0.5;
    poleRing.visible = st.beat === 2; poleRing.scale.setScalar(1 + 0.25 * Math.sin(st.since * 5));
    let pos, tgt;
    if (st.beat === 0) {                     // low flight along the boundary Re(s) = 1
      const t = lerp(-2, 9, ease(st.since / 12));
      pos = V3(-0.3, 2.3, tz(t - 6)); tgt = V3(1.3, 0.6, tz(t + 4));
    } else if (st.beat === 1) {              // rise and watch the front sweep to the left
      const e = ease(since1 / 6);
      pos = lerpV(V3(-0.3, 2.3, tz(3)), V3(5.5, 12.5, tz(-12)), e); tgt = lerpV(V3(1.3, 0.6, tz(13)), V3(-2, 0.3, tz(5)), e);
    } else {                                 // orbit the pole
      const a = lerp(0.6, -0.9, ease(st.since / 10));
      pos = V3(1 + 5.2 * Math.sin(a), 3.4, tz(0) + 5.2 * Math.cos(a)); tgt = V3(0.6, 1.2, tz(0.5));
    }
    shot(MTN, pos, tgt, 50);
    card(ctx, 60, 110, 560, 120);
    if (st.beat === 0) { T('∑ 1/nˢ only works here:', 90, 162, F.sans(26, 600), N.white); T('Re(s) > 1', 90, 204, F.disp(30), N.cyan); }
    else if (st.beat === 1) { T('analytic continuation', 90, 162, F.sans(26, 600), N.white); T('the only smooth way to fill the plane', 90, 204, F.sans(22, 400), N.dim); }
    else { T('pole at s = 1', 90, 162, F.sans(26, 600), N.white); T('ζ(s) → ∞', 90, 206, F.disp(32), N.pink); }
    if (st.beat === 0) { const [x, y, z] = proj(V3(1, 0, tz(lerp(-2, 9, ease(st.since / 12)) + 2))); if (z < 1) { ctx.fillStyle = 'rgba(6,9,20,0.85)'; ctx.beginPath(); ctx.roundRect(x - 190, y - 44, 160, 44, 8); ctx.fill(); T('Re(s) = 1', x - 110, y - 14, F.mono(22), N.cyan, 'center'); } }
    if (st.beat === 2) { const [x, y, z] = proj(V3(1, 3.2, tz(0))); if (z < 1) { glow(N.white, 20); T('s = 1', x + 30, y - 10, F.sans(26, 600), N.white); noGlow(); } }
  }
  S[6].draw = drawContinuation;
  const oldMountains = drawMountains;
  S[7].draw = st => { mtnExtras(7); if (st.beat <= 1) oldMountains(st); else drawRidges(st); };

  // ================================================================ 3-D: the music of the primes as a waterfall of waves
  const WAV = new THREE.Scene(); WAV.fog = new THREE.Fog(0x060914, 20, 48); addLights(WAV);
  const WX = x => (x - 20.5) * 0.5, WY = v => v * 0.2;
  const wGrid = new THREE.GridHelper(40, 40, 0x1c2550, 0x121935); wGrid.position.set(0, -0.01, -6); WAV.add(wGrid);
  const stairPath = new THREE.CurvePath(); { let prev = V3(WX(1), 0, 0); for (let n = 2; n <= 40; n++) { const a = V3(WX(n), WY(PSI[n - 1]), 0), b = V3(WX(n), WY(PSI[n]), 0); stairPath.add(new THREE.LineCurve3(prev, a)); if (PSI[n] !== PSI[n - 1]) stairPath.add(new THREE.LineCurve3(a, b)); prev = b; } stairPath.add(new THREE.LineCurve3(prev, V3(WX(40.5), prev.y, 0))); }
  const stairMat = new THREE.MeshBasicMaterial({ color: 0xf72585 });
  WAV.add(new THREE.Mesh(new THREE.TubeGeometry(stairPath, 900, 0.05, 6, false), stairMat));
  WAV.add(new THREE.Mesh(new THREE.TubeGeometry(stairPath, 900, 0.16, 6, false), new THREE.MeshBasicMaterial({ color: 0xf72585, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })));
  const NW = 40, wavesMesh = [];
  for (let k = 0; k < NW; k++) {
    const g = ZEROS[k], pts = [];
    for (let x = 1.05; x <= 40.5; x += 0.05) pts.push(V3(WX(x), 1.4 + 0.38 * psiWave(x, g) * g / (2 * Math.sqrt(x)), -1.2 - k * 0.42));
    const c = new THREE.Color(`hsl(${190 + k * 4},80%,62%)`);
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length, 0.022, 5, false), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.7 }));
    WAV.add(m); wavesMesh.push({ m, c });
  }
  let sumMesh = null, sumGlow = null; const sumMat = new THREE.MeshBasicMaterial({ color: 0x4cc9f0 }), sumGlowMat = new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
  function setSum(Nz, show) {
    if (sumMesh) { WAV.remove(sumMesh, sumGlow); sumMesh.geometry.dispose(); sumGlow.geometry.dispose(); sumMesh = null; }
    if (!show) return;
    const pts = []; for (let x = 1.06; x <= 40.5; x += 0.06) { let y = x - Math.log(2 * Math.PI) - 0.5 * Math.log(1 - 1 / (x * x)); for (let k = 0; k < Nz; k++) y += psiWave(x, ZEROS[k]); pts.push(V3(WX(x), WY(y), 0.02)); }
    const cur = new THREE.CatmullRomCurve3(pts);
    sumMesh = new THREE.Mesh(new THREE.TubeGeometry(cur, pts.length, 0.04, 6, false), sumMat); sumGlow = new THREE.Mesh(new THREE.TubeGeometry(cur, pts.length, 0.14, 6, false), sumGlowMat);
    WAV.add(sumMesh, sumGlow);
  }
  S[8].draw = st => {
    const seq = [1, 2, 3, 5, 10, 20, 40];
    const Nz = st.beat <= 1 ? 0 : st.beat === 2 ? seq[Math.min(6, Math.floor(st.since / 1.9))] : Math.round(lerp(40, ZEROS.length, ease(st.since / 6)));
    setSum(Nz, st.beat >= 1);
    sumGlowMat.opacity = st.beat === 1 ? 0.2 * st.ap(1, 1) : 0.2;
    wavesMesh.forEach((w, k) => { w.m.visible = k < Nz; w.m.material.color.set(k === Nz - 1 && st.beat === 2 ? 0xffd166 : w.c); w.m.material.opacity = k === Nz - 1 ? 1 : 0.4; });
    let pos, tgt;
    const front = V3(0, 4.2, 15.5), side = V3(15, 9, 9);
    if (st.beat <= 1) { pos = front; tgt = V3(0, 3.6, 0); }
    else if (st.beat === 2) { const e = ease(st.since / 5); pos = lerpV(front, side, e); tgt = lerpV(V3(0, 3.6, 0), V3(0, 1.6, -6), e); }
    else { const e = ease(st.since / 6); pos = lerpV(side, front, e); tgt = lerpV(V3(0, 1.6, -6), V3(0, 3.6, 0), e); }
    shot(WAV, pos, tgt, 44);
    formula([['t', 'ψ(x)  =  x  −'], ['op', '∑', '', 'ρ'], ['f', 'x^ρ', 'ρ'], ['t', '−  ln 2π  −  ½ ln(1 − 1/x²)']], 800, 150, 46, N.white);
    card(ctx, 60, 250, 300, 66); T(Nz + (Nz === 1 ? ' zero' : ' zeros'), 85, 295, F.mono(30), N.gold);
    if (st.beat === 2 && Nz > 0) T('each zero adds one wave', 1500, 300, F.sans(24, 600), N.gold, 'right');
    [10, 20, 30, 40].forEach(x => { const [px, py, pz] = proj(V3(WX(x), 0, 0.3)); if (pz < 1) T(String(x), px, py + 28, F.mono(18), N.dim, 'center'); });
    if (Nz > NW) T('+ ' + (Nz - NW) + ' more waves', 1500, 300, F.sans(22, 500), N.dim, 'right');
  };

  // ================================================================ 3-D: flight along the critical line, and a zero that must not exist
  const finalDraw = S[9].draw;
  const ghosts = [0.85, 0.15].map(sg => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf72585 })); m.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf72585, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }))); const zv = M.zeta([sg, 23.6]); m.position.set(sg, Math.min(3, 0.9 * Math.log(1 + Math.hypot(zv[0], zv[1]))) + 0.25, tz(23.6)); m.visible = false; MTN.add(m); return m; });
  S[9].draw = st => {
    if (st.beat === 2) { ghosts.forEach(g => { g.visible = false; }); return finalDraw(st); }
    mtnExtras(9); clipPlane.constant = 99;
    if (st.beat === 0) {
      const tt = lerp(-2, 38, ease(st.since / 11));
      mZeros.forEach((m, i) => { const d = Math.abs(ZEROS[i] - tt); m.scale.setScalar(1 + 1.6 * Math.exp(-d * d * 0.8)); });
      shot(MTN, V3(0.5, 4.8, tz(tt - 7)), V3(0.5, 0, tz(tt + 4)), 50);
      const v = Math.pow(10, clamp(st.since * 1.25, 1, 13));
      card(ctx, 960, 130, 520, 150); T('zeros checked', 990, 180, F.sans(24, 500), N.dim); T(fmtBig(v), 990, 246, F.disp(56), N.gold); T('all on Re(s) = ½', 990, 316, F.sans(24, 600), N.green);
    } else {
      mZeros.forEach(m => m.scale.setScalar(1));
      const fl = 0.55 + 0.45 * Math.sin(st.since * 8), a = st.ap(1, 1);
      ghosts.forEach(g => { g.visible = false; });   // drawn as 2-D markers below (visible on every colour)
      const ang = lerp(-0.4, 0.4, ease(st.since / 12));
      shot(MTN, V3(0.5 + 2.5 * Math.sin(ang), 6.5, tz(19.5)), V3(0.5, 0, tz(24.5)), 46);
      if (st.since > 1.2) ghosts.forEach((g, i) => { const [x, y, z] = proj(g.position); if (z >= 1) return; { const ph = (st.since * 1.2) % 1, pr = 22 + 14 * ph; ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,230,0,${(1 - ph).toFixed(2)})`; ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.stroke(); ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff36b'; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.lineWidth = 4; ctx.strokeStyle = '#0a0f25'; ctx.stroke(); ctx.restore(); } const lab = i ? 'mirror twin' : 'a zero off the line?', lx = x + (i ? -110 : 110), ly = y + (i ? 70 : -70); ctx.font = F.sans(24, 600); const w = ctx.measureText(lab).width; ctx.strokeStyle = 'rgba(255,230,0,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + (i ? -22 : 22), y + (i ? 14 : -14)); ctx.lineTo(lx, ly - 8); ctx.stroke(); ctx.fillStyle = 'rgba(6,9,20,0.85)'; ctx.beginPath(); ctx.roundRect(i ? lx - w - 14 : lx - 4, ly - 30, w + 18, 42, 8); ctx.fill(); T(lab, i ? lx - 5 : lx + 5, ly, F.sans(24, 600), N.pink, i ? 'right' : 'left'); });
      ctx.globalAlpha = a; card(ctx, 60, 120, 600, 120); T('one zero off the line', 90, 172, F.sans(28, 600), N.pink); T('(they would come in mirror pairs) would break it', 90, 212, F.sans(21, 400), N.dim); ctx.globalAlpha = 1;
    }
  };

  // ================================================================ revision 3: sums as bars + gauge, bigger key formulas
  S[3].beats[0] = 'To go further we need infinite sums. One, plus one half, plus one quarter, and so on: each new piece fills half of the remaining gap, and the total converges to exactly two.';
  function gauge(x, y, h, vmax, value, target, tLabel, col) {   // vertical column that fills with the running sum
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.roundRect(x, y, 90, h, 10); ctx.fill();
    const v = Math.min(value, vmax), hh = h * v / vmax;
    const g = ctx.createLinearGradient(0, y + h, 0, y); g.addColorStop(0, col); g.addColorStop(1, '#ffffff');
    glow(col, 22); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y + h - hh, 90, hh, 10); ctx.fill(); noGlow();
    for (let k = 0; k <= vmax + 1e-9; k += vmax > 5 ? 2 : 0.5) { const yy = y + h - h * k / vmax; ctx.fillStyle = 'rgba(160,175,230,0.4)'; ctx.fillRect(x - 12, yy, 8, 2); T(de(k, vmax > 5 ? 0 : 1), x - 18, yy + 7, F.mono(18), N.dim, 'right'); }
    if (target !== null) { const yy = y + h - h * target / vmax; glow(N.gold, 12); ctx.fillStyle = N.gold; ctx.fillRect(x - 6, yy - 1.5, 102, 3); noGlow(); T(tLabel, x + 106, yy + 8, F.mono(22), N.gold); }
    T('sum = ' + de(value, value > 9.99 ? 2 : 4), x + 45, y + h + 44, F.mono(24, 600), N.white, 'center');
    if (value > vmax) { T('▲ keeps growing', x + 45, y - 16, F.sans(22, 600), N.pink, 'center'); }
  }
  function termBars(x0, y0, W, H, terms, maxTerm, colorOf, squares) {
    const n = terms.length, bw = Math.min(70, W / Math.max(n, 8));
    let x = x0;
    terms.forEach((v, i) => {
      const c = colorOf(i);
      if (squares) { const side = H * Math.sqrt(v / maxTerm); if (x + side > x0 + W) return; glow(c, 10); ctx.fillStyle = c; ctx.globalAlpha *= 0.9; ctx.fillRect(x, y0 + H - side, Math.max(side - 2, 0.6), side); ctx.globalAlpha /= 0.9; noGlow(); x += side; }
      else { const h = H * v / maxTerm; glow(c, 10); ctx.fillStyle = c; ctx.fillRect(x + 1, y0 + H - h, Math.max(bw - 3, 0.6), h); noGlow(); if (bw > 40 && i < 8) T(i === 0 ? '1' : '1/' + (squares ? (i + 1) * (i + 1) : Math.round(1 / v)), x + bw / 2, y0 + H + 30, F.disp(22), N.dim, 'center'); x += bw; }
    });
    ctx.strokeStyle = 'rgba(160,175,230,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y0 + H + 1); ctx.lineTo(x0 + W, y0 + H + 1); ctx.stroke();
  }
  S[3].draw = st => {
    const BX = 120, BY = 300, BW = 1080, BH = 380, GX = 1340;
    if (st.beat === 0) {
      formula([['t', '1  +'], ['f', '1', '2'], ['t', '+'], ['f', '1', '4'], ['t', '+'], ['f', '1', '8'], ['t', '+  …  =  2']], 800, 170, 56, N.white);
      const k = Math.min(14, Math.floor(st.since * 1.3) + 1), terms = []; let s = 0; for (let i = 0; i < k; i++) { terms.push(Math.pow(0.5, i)); s += Math.pow(0.5, i); }
      termBars(BX, BY, BW, BH, terms, 1, i => i % 2 ? N.violet : N.cyan, false);
      gauge(GX, BY, BH, 2.2, s, 2, 'limit 2', N.cyan);
    } else if (st.beat === 1) {
      formula([['t', '1  +'], ['f', '1', '2'], ['t', '+'], ['f', '1', '3'], ['t', '+'], ['f', '1', '4'], ['t', '+  …  =  ∞']], 800, 170, 56, N.white);
      const n = Math.min(12367, Math.floor(Math.exp(st.since * 0.95))), terms = []; let H = 0;
      for (let i = 1; i <= n; i++) { H += 1 / i; if (i <= 60) terms.push(1 / i); }
      termBars(BX, BY, BW, BH, terms, 1, i => `hsl(${190 + i * 5},80%,62%)`, false);
      if (n > 60) T('… and ' + de(n - 60) + ' more', BX + BW, BY - 14, F.mono(22), N.dim, 'right');
      gauge(GX, BY, BH, 10, H, null, '', N.pink);
      if (H >= 10) T('10 passed after 12,367 terms', GX + 45, BY + BH + 84, F.sans(22, 600), N.gold, 'center');
    } else {
      formula([['t', '1  +'], ['f', '1', '4'], ['t', '+'], ['f', '1', '9'], ['t', '+'], ['f', '1', '16'], ['t', '+  …  ='], ['f', 'π²', '6']], 800, 170, 56, N.white);
      const k = Math.min(40, Math.floor(st.since * 4) + 1), terms = []; let s = 0; for (let i = 1; i <= k; i++) { terms.push(1 / (i * i)); s += 1 / (i * i); }
      termBars(BX, BY, BW, BH, terms, 1, i => pcol(PRIMES[i % 10]), true);
      T('each square: side 1/n, area 1/n²', BX, BY + BH + 40, F.sans(22, 500), N.dim);
      gauge(GX, BY, BH, 1.8, s, Math.PI * Math.PI / 6, 'π²/6', N.gold);
    }
  };

  // scene 04: one line, the sum right next to its terms; evaluated sums at the dots
  const prev4 = S[4].draw;
  S[4].draw = st => {
    if (st.beat !== 0) return prev4(st);
    formula([['t', 'ζ(s)  ='], ['op', '∑', '∞', 'n = 1'], ['f', '1', 'n^s'], ['t', '='], ['t', '1  +'], ['f', '1', '2^s'], ['t', '+'], ['f', '1', '3^s'], ['t', '+'], ['f', '1', '4^s'], ['t', '+  …']], 800, 170, 50, N.white, 1 + st.since * 3);
    const P = plot(260, 300, 1080, 400, 0, 6, 0, 6);
    axes(ctx, P, { xt: [0, 1, 2, 3, 4, 5, 6], yt: [0, 2, 4, 6], xl: 's' });
    ctx.strokeStyle = 'rgba(247,37,133,0.6)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.X(1), P.y); ctx.lineTo(P.X(1), P.y + P.h); ctx.stroke(); ctx.setLineDash([]);
    clipTo(ctx, P); glow(N.cyan, 14); ctx.strokeStyle = N.cyan; ctx.lineWidth = 4; ctx.beginPath();
    const end = lerp(1.17, 6, clamp((st.since - 3) / 6, 0, 1)); let f = true; for (let s = 1.17; s <= end; s += 0.02) { const y = M.zeta([s, 0])[0]; f ? ctx.moveTo(P.X(s), P.Y(y)) : ctx.lineTo(P.X(s), P.Y(y)); f = false; } ctx.stroke(); noGlow(); ctx.restore();
    [[2, '2', 'π²/6'], [4, '4', 'π⁴/90']].forEach(([s, e, v]) => {
      if (end < s) return; const y = M.zeta([s, 0])[0]; dot(ctx, P.X(s), P.Y(y), 8, N.gold, true);
      const x0 = P.X(s) + 18, y0 = P.Y(y) - 70; ctx.fillStyle = 'rgba(6,9,20,0.85)'; ctx.beginPath(); ctx.roundRect(x0 - 8, y0 - 46, 330, 80, 10); ctx.fill();
      formula([['t', 'ζ(' + e + ') ='], ['op', '∑', '', ''], ['f', '1', 'n^' + e], ['t', '=  ' + v]], x0 + 155, y0 - 8, 26, N.gold);
    });
    T('diverges for s ≤ 1', P.X(1) - 14, P.y + 40, F.sans(22, 600), N.pink, 'right');
  };

  // scene 08: bigger formula
  // (the formula call inside S[8].draw is enlarged by the build step below)

  // ================================================================ 3-D: multiplying by i is a quarter turn
  const CPX = new THREE.Scene(); CPX.fog = new THREE.Fog(0x060914, 14, 30); addLights(CPX);
  const U2 = 2.2;
  const cGrid = new THREE.GridHelper(12, 24, 0x2a3670, 0x161e44); CPX.add(cGrid);
  const mkBar = (w, d, col) => new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), new THREE.MeshBasicMaterial({ color: col }));
  const axR = mkBar(12, 0.03, 0x8d96bd), axI = mkBar(0.03, 12, 0x8d96bd); CPX.add(axR, axI);
  const circ = new THREE.Mesh(new THREE.TorusGeometry(U2, 0.022, 8, 120), new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.6 })); circ.rotation.x = Math.PI / 2; CPX.add(circ);
  const cpPt = (re, im) => V3(re * U2, 0.02, -im * U2);
  const marks = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([a, b]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.position.copy(cpPt(a, b)); CPX.add(m); return m; });
  const arrowG = new THREE.Group(); CPX.add(arrowG);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, U2 - 0.35, 16), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xb07800, emissiveIntensity: 0.8 }));
  shaft.rotation.z = -Math.PI / 2; shaft.position.x = (U2 - 0.35) / 2; arrowG.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.4, 20), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xb07800, emissiveIntensity: 0.9 }));
  head.rotation.z = -Math.PI / 2; head.position.x = U2 - 0.2; arrowG.add(head);
  const aGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, U2, 16), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
  aGlow.rotation.z = -Math.PI / 2; aGlow.position.x = U2 / 2; arrowG.add(aGlow);
  arrowG.position.y = 0.12;
  let arcMesh = null; const arcMat = new THREE.MeshBasicMaterial({ color: 0xf72585, transparent: true, opacity: 0.85 });
  function setArc(a0, a1) {
    if (arcMesh) { CPX.remove(arcMesh); arcMesh.geometry.dispose(); arcMesh = null; }
    if (a1 - a0 < 0.02) return;
    const pts = []; for (let k = 0; k <= 40; k++) { const a = a0 + (a1 - a0) * k / 40; pts.push(V3(Math.cos(a) * U2 * 0.55, 0.14, -Math.sin(a) * U2 * 0.55)); }
    arcMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.04, 6, false), arcMat); CPX.add(arcMesh);
  }
  function drawComplex(st) {
    // 0–2 s: arrow at 1; 2–4.5: × i to i; 6–8.5: × i to −1; then a slow full turn
    const t = st.since, q = x => ease(clamp(x, 0, 1));
    const ang = Math.PI / 2 * (q((t - 2) / 2.5) + q((t - 6) / 2.5) + q((t - 11) / 2) + q((t - 13.5) / 2));
    arrowG.rotation.y = ang;
    const seg = t < 6 ? [0, Math.min(ang, Math.PI / 2)] : t < 11 ? [Math.PI / 2, ang] : [Math.PI, Math.max(Math.PI, ang)];
    setArc(seg[0], seg[1]);
    shot(CPX, V3(2.6, 6.6, 6.4), V3(0, 0, -0.3), 44);   // fixed camera: only the arrow turns
    [['1', 1, 0], ['i', 0, 1], ['−1', -1, 0], ['−i', 0, -1]].forEach(([l, r, i]) => { const [x, y, z] = proj(cpPt(r * 1.22, i * 1.22)); if (z < 1) { glow(N.white, 10); T(l, x, y + 12, F.disp(40), N.white, 'center'); noGlow(); } });
    const [rx, ry] = proj(V3(5.6, 0, 0)), [ix, iy] = proj(V3(0, 0, -5.6));
    T('real', rx, ry + 30, F.mono(20), N.dim, 'center'); T('imaginary', ix + 14, iy, F.mono(20), N.dim);
    // the key statement, large and on top
    if (t < 6) { formula([['t', '1  ·  i  =  i']], 800, 140, 60, N.white, clamp((t - 2) / 1, 0, 1)); T('multiplying by i = turning by 90°', 800, 230, F.sans(28, 500), N.pink, 'center'); }
    else if (t < 11) { formula([['t', 'i  ·  i  =  −1']], 800, 140, 64, N.gold); T('two quarter turns = a half turn', 800, 232, F.sans(28, 500), N.pink, 'center'); }
    else { formula([['t', 'i² = −1      i⁴ = 1']], 800, 140, 56, N.gold); T('four quarter turns bring you home', 800, 230, F.sans(28, 500), N.pink, 'center'); }
  }
  const prev5 = old5;
  S[5].draw = st => {
    if (st.beat === 1) return drawComplex(st);
    prev5(st);
    if (st.beat >= 2) { const conv = st.beat === 2; ctx.fillStyle = 'rgba(6,9,20,0.75)'; ctx.beginPath(); ctx.roundRect(250, 78, 640, 186, 16); ctx.fill(); formula([['t', conv ? 'ζ(2 + 3i)  ≈' : 'S_N ='], ['op', '∑', 'N', 'n = 1'], ['f', '1', conv ? 'n^2 + 3i' : 'n^0.3 + 7i']], 570, 165, 44, conv ? N.cyan : N.pink); }
  };

  // ================================================================ 3-D: dive into the pole – a wormhole
  S[6].beats.push('Dive in, and the values grow beyond every bound: near s equal to one, zeta behaves like one over s minus one. The pole is not a place you can reach, only a road to infinity.');
  const TUN = new THREE.Scene(); TUN.fog = new THREE.Fog(0x000000, 6, 60);
  const tunCan = document.createElement('canvas'); const tx0 = Math.round(4.5 * DOM.PX); tunCan.width = DOM.W - tx0; tunCan.height = Math.round(44 * DOM.PX); tunCan.getContext('2d').drawImage(domCanvas, tx0, 0, tunCan.width, tunCan.height, 0, 0, tunCan.width, tunCan.height);
  const tunTex = new THREE.CanvasTexture(tunCan); tunTex.wrapS = tunTex.wrapT = THREE.RepeatWrapping; tunTex.repeat.set(2, 6);
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 140, 48, 1, true), new THREE.MeshBasicMaterial({ map: tunTex, side: THREE.BackSide }));
  tunnel.rotation.x = Math.PI / 2; tunnel.position.z = -60; TUN.add(tunnel);
  const NS2 = 700, sPos = new Float32Array(NS2 * 6), sSeed = [];
  for (let i = 0; i < NS2; i++) sSeed.push([rnd() * 6.283, 0.4 + rnd() * 2.4, rnd() * 120, 0.5 + rnd()]);
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const streaks = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ color: 0xbff1ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); TUN.add(streaks);
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })); core.position.z = -110; TUN.add(core);
  function drawTunnel(t) {
    const speed = 18 + t * t * 6, travel = 8 * t + t * t * t;
    tunTex.offset.set(t * 0.08, -travel * 0.02); tunTex.needsUpdate = true; tunnel.rotation.y = t * 0.5;
    for (let i = 0; i < NS2; i++) {
      const [a, r, z0, sp] = sSeed[i]; const z = -((z0 - travel * sp * 1.6) % 120 + 120) % 120; const len = 0.6 + speed * 0.06;
      const aa = a + t * 0.5, x = Math.cos(aa) * r, y = Math.sin(aa) * r;
      sPos.set([x, y, z, x, y, z - len], i * 6);
    }
    sGeo.attributes.position.needsUpdate = true;
    cam.fov = 70 + t * 6; cam.updateProjectionMatrix(); cam.position.set(Math.sin(t * 0.7) * 0.3, Math.cos(t * 0.6) * 0.3, 0); cam.lookAt(0, 0, -50);
    fxFor(TUN).comp.render(); ctx.drawImage(GL, 0, 0, SW, SH);
    const vg = ctx.createRadialGradient(SW / 2, SH / 2, 120, SW / 2, SH / 2, SW * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, SW, SH);
  }
  const prev6 = S[6].draw;
  S[6].draw = st => {
    if (st.beat < 2) return prev6(st);
    mtnExtras(6); growFrom(XMIN - 1); front.visible = frontGlow.visible = false;
    const tip = V3(1, 3.0, tz(0));
    if (st.beat === 2) {                    // fly past the peak, then climb above it
      poleRing.visible = true; poleRing.scale.setScalar(1 + 0.25 * Math.sin(st.since * 5));
      const e = ease(st.since / 7.5), a = lerp(0.9, -1.4, e);
      const pos = V3(1 + lerp(6, 2.2, e) * Math.sin(a), lerp(2.4, 7.5, ease((st.since - 2) / 5.5)), tz(0) + lerp(6, 2.2, e) * Math.cos(a));
      shot(MTN, pos, lerpV(V3(0.8, 1.4, tz(0.5)), tip, e), 50);
      card(ctx, 60, 110, 560, 120); T('pole at s = 1', 90, 162, F.sans(26, 600), N.white); T('ζ(s) → ∞', 90, 206, F.disp(32), N.pink);
      const [x, y, z] = proj(V3(1, 3.2, tz(0))); if (z < 1) { glow(N.white, 20); T('s = 1', x + 30, y - 10, F.sans(26, 600), N.white); noGlow(); }
      return;
    }
    const t = st.since, DIVE = 2.6;
    if (t < DIVE) {                          // nose-dive straight into the tip
      poleRing.visible = true; const e = ease(t / DIVE) ;
      const a = -1.4 + e * 1.2, r = 2.2 * (1 - e);
      const pos = V3(1 + r * Math.sin(a), lerp(7.5, 3.05, e * e), tz(0) + r * Math.cos(a));
      shot(MTN, pos, V3(1, lerp(3.0, -2, e), tz(0)), lerp(50, 95, e * e));
      ctx.globalAlpha = clamp((t - DIVE + 0.5) / 0.5, 0, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, SW, SH); ctx.globalAlpha = 1;
    } else {
      const tt = t - DIVE; drawTunnel(tt);
      ctx.globalAlpha = 1 - clamp(tt / 0.6, 0, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, SW, SH); ctx.globalAlpha = 1;
      ctx.globalAlpha = clamp((tt - 1) / 1, 0, 1);
      glow(N.white, 26); formula([['t', 'ζ(s)  ≈'], ['f', '1', 's − 1'], ['t', '→  ∞']], 800, 200, 66, N.white); noGlow();
      ctx.globalAlpha = 1;
    }
  };

  // ================================================================ real lighting: bloom, depth of field, environment reflections, soft shadows
  const PP = window.PP;
  R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap;
  const ENV = new THREE.PMREMGenerator(R3).fromScene(new PP.RoomEnvironment(), 0.04).texture;
  const FX = new Map(), FXCONF = new Map();
  function fxFor(scene) {
    let f = FX.get(scene); if (f) return f;
    const conf = FXCONF.get(scene) || {};
    const comp = new PP.EffectComposer(R3); comp.setSize(GL.width, GL.height);
    comp.addPass(new PP.RenderPass(scene, cam));
    let bokeh = null;
    if (conf.bokeh) { bokeh = new PP.BokehPass(scene, cam, { focus: 10, aperture: conf.bokeh, maxblur: 0.008, width: GL.width, height: GL.height }); comp.addPass(bokeh); }
    const [s, r, th] = conf.bloom || [0.5, 0.45, 0.75];
    comp.addPass(new PP.UnrealBloomPass(new THREE.Vector2(GL.width, GL.height), s, r, th));
    f = { comp, bokeh }; FX.set(scene, f); return f;
  }
  function sunFollow(scene, target) {          // the shadow-casting light follows the camera target
    const sun = scene.userData.sun; if (!sun) return;
    sun.position.set(target.x + 6, target.y + 14, target.z + 9); sun.target.position.copy(target); sun.target.updateMatrixWorld();
  }
  shot = function (scene, pos, target, fov = 40) {
    cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.lookAt(target);
    sunFollow(scene, target);
    const f = fxFor(scene);
    if (f.bokeh) f.bokeh.uniforms.focus.value = pos.distanceTo(target);
    f.comp.render(); ctx.drawImage(GL, 0, 0, SW, SH);
  };
  function addSun(scene, half, intensity = 0.9) {
    const sun = new THREE.DirectionalLight(0xffffff, intensity); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const c = sun.shadow.camera; c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.near = 1; c.far = 60;
    sun.shadow.bias = -0.0008; sun.shadow.radius = 4;
    scene.add(sun, sun.target); scene.userData.sun = sun;
  }
  // towers: reflective blocks, soft shadows, depth of field
  TOW.environment = ENV; addSun(TOW, 18, 0.6);
  towers.forEach(t => t.grp.children.forEach(m => { m.castShadow = m.receiveShadow = true; m.material.roughness = 0.35; m.material.metalness = 0.2; m.material.envMapIntensity = 0.45; m.material.emissiveIntensity *= 0.55; }));
  floor.receiveShadow = true; floor.material.envMapIntensity = 0.3;
  FXCONF.set(TOW, { bloom: [0.32, 0.4, 0.86], bokeh: 0.0012 });
  // mountains: soft shadows over the terrain, a hint of reflection
  MTN.environment = ENV; addSun(MTN, 16, 0.55); mtn.castShadow = mtn.receiveShadow = true; mtn.material.envMapIntensity = 0.12; mtn.material.roughness = 0.6;
  FXCONF.set(MTN, { bloom: [0.22, 0.4, 0.93] });
  // complex plane: reflective arrow
  CPX.environment = ENV; FXCONF.set(CPX, { bloom: [0.7, 0.45, 0.6] });
  shaft.material.metalness = head.material.metalness = 0.6; shaft.material.roughness = head.material.roughness = 0.25;
  FXCONF.set(SPI, { bloom: [1.0, 0.55, 0.5] });
  FXCONF.set(RID, { bloom: [0.85, 0.5, 0.5] });
  FXCONF.set(WAV, { bloom: [0.85, 0.5, 0.5] });
  FXCONF.set(TUN, { bloom: [1.1, 0.6, 0.45] });
  // golden title: real metal with environment reflections (own renderer, own environment)
  TIT.environment = new THREE.PMREMGenerator(R4).fromScene(new PP.RoomEnvironment(), 0.04).texture;
  letters.forEach(it => { const o = it.m.material; it.m.material = new THREE.MeshStandardMaterial({ color: 0xf0c05a, metalness: 1.0, roughness: 0.22, emissive: 0x2a1800, transparent: true, opacity: o.opacity }); });

  // ================================================================ LaTeX formulas (MathJax → vector paths on the canvas)
  const MJ = window.MathJax, texCache = new Map();
  const mjHost = document.createElement('div'); mjHost.style.cssText = 'position:absolute;left:-99999px;top:0;'; document.body.appendChild(mjHost);
  function uni2tex(s) {
    s = String(s);
    const i = s.indexOf('^'); if (i >= 0) return uni2tex(s.slice(0, i)) + '^{' + uni2tex(s.slice(i + 1)) + '}';
    const map = [['ln', '\\ln '], ['ζ', '\\zeta '], ['π', '\\pi '], ['ρ', '\\rho '], ['ψ', '\\psi '], ['σ', '\\sigma '], ['−', '-'], ['·', '\\cdot '],
      ['…', '\\dots '], ['∞', '\\infty '], ['≈', '\\approx '], ['→', '\\to '], ['½', '\\tfrac{1}{2}'], ['²', '^{2}'], ['⁴', '^{4}']];
    s = s.replace(/[A-Za-z]{3,}(?: [A-Za-z]{3,})*/g, w => w === 'ln' ? w : '\\text{' + w + '}');
    for (const [a, b] of map) s = s.split(a).join(b);
    return s.replace(/ {2,}/g, ' ');
  }
  function pieceTex(p) {
    if (p[0] === 't') return uni2tex(p[1]);
    if (p[0] === 'f') return `\\frac{${uni2tex(p[1])}}{${uni2tex(p[2])}}`;
    const op = p[1] === '∏' ? '\\prod' : '\\sum';
    return `\\color{#ffd166}{${op}${p[3] ? '_{' + uni2tex(p[3]) + '}' : ''}${p[2] ? '^{' + uni2tex(p[2]) + '}' : ''}}`;
  }
  function texShape(tex) {
    let sh = texCache.get(tex); if (sh) return sh;
    const svg = MJ.tex2svg('\\displaystyle ' + tex, { display: false }).querySelector('svg');
    const vb = svg.viewBox.baseVal; svg.setAttribute('width', vb.width); svg.setAttribute('height', vb.height);
    mjHost.appendChild(svg);
    const items = [];
    svg.querySelectorAll('path, rect').forEach(el => {
      const m = el.getCTM(); if (!m) return;
      const fillEl = el.closest('[fill]'); let col = fillEl ? fillEl.getAttribute('fill') : null; if (col === 'currentColor') col = null;
      const mm = [m.a, m.b, m.c, m.d, m.e, m.f];
      if (el.tagName === 'path') { const d = el.getAttribute('d'); if (d) items.push({ m: mm, p: new Path2D(d), col }); }
      else items.push({ m: mm, r: [+el.getAttribute('x') || 0, +el.getAttribute('y') || 0, +el.getAttribute('width') || 0, +el.getAttribute('height') || 0], col });
    });
    mjHost.removeChild(svg);
    sh = { w: vb.width, h: vb.height, base: -vb.y, items }; texCache.set(tex, sh); return sh;
  }
  function drawShape(sh, x, yBase, sc, col) {
    ctx.save(); ctx.translate(x, yBase - sh.base * sc); ctx.scale(sc, sc);
    for (const it of sh.items) { ctx.save(); ctx.transform(...it.m); ctx.fillStyle = it.col || col; if (it.col) { ctx.shadowColor = it.col; ctx.shadowBlur = 14 / sc; } if (it.p) ctx.fill(it.p); else ctx.fillRect(...it.r); ctx.restore(); }
    ctx.restore();
  }
  formula = function (pieces, cx, y, size, col, reveal = 99) {
    const texs = pieces.map(pieceTex), sc = size / 1000 * 1.15;
    const full = texShape(texs.join(' '));
    const x0 = cx - full.w * sc / 2, yBase = y - full.h * sc / 2 + full.base * sc + size * 0.1;
    const n = pieces.length, k = Math.max(0, Math.min(n, Math.floor(reveal))), fr = Math.min(1, Math.max(0, reveal - k));
    if (k >= n) return drawShape(full, x0, yBase, sc, col);
    if (k > 0) drawShape(texShape(texs.slice(0, k).join(' ')), x0, yBase, sc, col);
    if (fr > 0) { ctx.save(); ctx.globalAlpha *= fr; drawShape(texShape(texs.slice(0, k + 1).join(' ')), x0, yBase, sc, col); ctx.restore(); }
  };

  let TT = 0; const B = [];
  const NARR = window.NARR || null; let gi = 0;   // NARR: spoken length of every beat in seconds (riemann_narration.json)
  S.forEach((s, si) => { s.start = TT; s.bs = []; s.beats.forEach((text, bi) => { let d = Math.max(6, text.length / 13.5 + 2); if (NARR && NARR[gi] != null) d = Math.max(d, NARR[gi] + 1.4); gi++; s.bs.push(TT - s.start); B.push({ si, bi, text, start: TT, dur: d }); TT += d; }); s.end = TT; });
  const TOTAL = TT + 4;
  function subtitle(text) {
    ctx.font = F.sans(30, 500); const words = text.split(' '), lines = []; let z = '';
    for (const w of words) { const t = z ? z + ' ' + w : w; if (ctx.measureText(t).width > 1300 && z) { lines.push(z); z = w; } else z = t; }
    if (z) lines.push(z);
    const lh = 44, y0 = SH - 30 - lines.length * lh;
    lines.forEach((l, i) => { const w = ctx.measureText(l).width; ctx.fillStyle = 'rgba(3,5,12,0.82)'; ctx.beginPath(); ctx.roundRect(SW / 2 - w / 2 - 16, y0 + i * lh, w + 32, lh, 6); ctx.fill(); T(l, SW / 2, y0 + i * lh + 32, F.sans(30, 500), '#f3f5ff', 'center'); });
  }
  function frame(t) {
    const k = cv.width / SW; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; noGlow();
    background(t);
    if (t >= TT) { const a = ease((t - TT) / 1); ctx.globalAlpha = a; T('The Riemann Hypothesis', 800, 410, F.disp(66), N.white, 'center'); T('interactive version: riemann_lernvideo_en.html', 800, 476, F.sans(24, 400), N.dim, 'center'); ctx.globalAlpha = 1; return cv.toDataURL('image/jpeg', 0.95); }
    let bi = B.length - 1; while (bi > 0 && B[bi].start > t) bi--;
    const b = B[bi], s = S[b.si], lt = t - s.start;
    const st = { beat: b.bi, lt, since: t - b.start, bs: s.bs, ap: (j, d = 0.8) => ease((lt - s.bs[j]) / d) };
    ctx.save(); s.draw(st); ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; noGlow();
    if (s.tag) { ctx.globalAlpha = ease(lt / 0.8); T(s.tag.toUpperCase(), 80, 70, F.mono(20, 500), N.gold); ctx.globalAlpha = 1; }
    subtitle(b.text);
    const edge = Math.min(lt, s.end - t);
    if (edge < 0.5) { ctx.globalAlpha = 1 - ease(edge / 0.5); ctx.fillStyle = '#03050c'; ctx.fillRect(0, 0, SW, SH); ctx.globalAlpha = 1; }
    return cv.toDataURL('image/jpeg', 0.95);
  }
  window.EXPL = { frame, total: TOTAL, scenes: S.map(s => [s.tag, Math.round(s.start)]), beats: B.map(b => ({ si: b.si, bi: b.bi, start: b.start, dur: b.dur, text: b.text })) };
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: BREITE, height: HOEHE } });
  await page.goto('file://' + HTML);
  await page.waitForFunction(() => typeof domDone !== 'undefined' && domDone === NCHUNK && ZEROS.length > 100, null, { timeout: 180000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(([w, h]) => { window.removeEventListener('resize', resize); S.playing = false; cv.width = w; cv.height = h; window.requestAnimationFrame = () => 0; }, [BREITE, HOEHE]);
  await page.addScriptTag({ path: THREE_JS });
  // three.js post-processing (bloom, depth of field) and RoomEnvironment: ES modules turned into one classic script
  {
    const ex = path.join(__dirname, 'node_modules', 'three', 'examples', 'jsm');
    const teile = ['postprocessing/Pass.js', 'shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'shaders/BokehShader.js',
      'postprocessing/ShaderPass.js', 'postprocessing/MaskPass.js', 'postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js',
      'postprocessing/UnrealBloomPass.js', 'postprocessing/BokehPass.js', 'environments/RoomEnvironment.js'];
    let js = 'window.PP = {};\n';
    for (const t of teile) {
      let c = require('fs').readFileSync(path.join(ex, t), 'utf8');
      c = c.replace(/import\s*\{([^}]*)\}\s*from\s*'three';/g, 'const {$1} = THREE;')
           .replace(/import\s*\{([^}]*)\}\s*from\s*'[.][^']*';/g, 'const {$1} = PP;')
           .replace(/export\s*\{([^}]*)\};?/g, 'Object.assign(PP, {$1});');
      js += '{\n' + c + '\n}\n';
    }
    await page.addScriptTag({ content: js });
  }
  // MathJax for LaTeX formulas
  await page.addScriptTag({ content: "window.MathJax = { svg: { fontCache: 'none' }, startup: { typeset: false } };" });
  await page.addScriptTag({ path: path.join(__dirname, 'node_modules', 'mathjax', 'es5', 'tex-svg-full.js') });
  await page.waitForFunction(() => window.MathJax && MathJax.startup && MathJax.startup.promise, null, { timeout: 60000 });
  await page.evaluate(() => MathJax.startup.promise);
  // 3-D font support: FontLoader from three/examples (ES module) turned into a classic script
  const fs = require('fs');
  const ex = path.join(__dirname, 'node_modules', 'three', 'examples');
  let fl = fs.readFileSync(path.join(ex, 'jsm', 'loaders', 'FontLoader.js'), 'utf8');
  fl = fl.replace(/^import\s*\{[^}]*\}\s*from\s*'three';/m, 'const { FileLoader, Loader, ShapePath } = THREE;').replace(/^export\s*\{[^}]*\};?/m, 'THREE.TitleFont = Font;');
  await page.addScriptTag({ content: '(function(){' + fl + '})();' });
  await page.addScriptTag({ content: 'window.TITLE_FONT = ' + fs.readFileSync(path.join(ex, 'fonts', 'optimer_bold.typeface.json'), 'utf8') + ';' });
  const NARR_FILE = path.join(__dirname, 'riemann_narration.json');
  if (fs.existsSync(NARR_FILE)) await page.evaluate(n => { window.NARR = n; }, JSON.parse(fs.readFileSync(NARR_FILE, 'utf8')).durations);
  await page.evaluate('(' + setup.toString() + ')()');
  const beats = await page.evaluate(() => EXPL.beats);
  if (process.env.DUMP_BEATS) { fs.writeFileSync(process.env.DUMP_BEATS, JSON.stringify(beats, null, 1)); console.log('beats written'); await browser.close(); return; }
  fs.writeFileSync(path.join(__dirname, 'riemann_explained_3d_timeline.json'), JSON.stringify({ total: await page.evaluate(() => EXPL.total), beats }, null, 1));
  const total = await page.evaluate(() => EXPL.total);
  if (process.env.STILLS) {   // STILLS="12,40,…" writes single frames instead of a video
    const fs = require('fs');
    for (const t of process.env.STILLS.split(',').map(Number)) { const u = await page.evaluate(t => EXPL.frame(t), t); fs.writeFileSync(path.join(process.env.STILLDIR || '.', `still_${t}.jpg`), Buffer.from(u.split(',')[1], 'base64')); }
    console.log(await page.evaluate(() => JSON.stringify(EXPL.scenes)), total); await browser.close(); return;
  }
  // RANGE="t0,t1" renders only this time span (e.g. to patch one scene into an existing video)
  const [r0, r1] = process.env.RANGE ? process.env.RANGE.split(',').map(Number) : [0, total];
  const f0 = Math.round(r0 * FPS), n = Math.round(r1 * FPS) - f0;
  console.log(`${n} frames (${(total / 60).toFixed(1)} min) at ${FPS} fps`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-crf', '24', '-preset', VORSCHAU ? 'veryfast' : 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', process.env.RANGE_OUT || AUS],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, err) => ff.on('close', c => c === 0 ? ok() : err(new Error('ffmpeg exit ' + c))));
  const write = buf => new Promise(ok => ff.stdin.write(buf) ? ok() : ff.stdin.once('drain', ok));
  const BATCH = 8;
  for (let i = 0; i < n; i += BATCH) {
    const ts = []; for (let j = i; j < Math.min(n, i + BATCH); j++) ts.push((f0 + j) / FPS);
    const urls = await page.evaluate(ts => ts.map(t => EXPL.frame(t)), ts);
    for (const u of urls) await write(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
    if (i % (FPS * 30) < BATCH) process.stdout.write(`\r${Math.round(100 * i / n)} %`);
  }
  ff.stdin.end(); await done; await browser.close();
  console.log('\rdone: ' + AUS);
})().catch(e => { console.error(e); process.exit(1); });
