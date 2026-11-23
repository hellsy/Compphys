/* Learning video (motion graphic, English): The Riemann Hypothesis – a visual journey  ->  riemann_explained.mp4

A strongly animated explainer, structured like a classic "Riemann hypothesis explained" talk:
curlicues → primes as building blocks → Gauss's count → infinite sums → zeta and the Euler
product → complex numbers and rotating arrows → analytic continuation → zeros and the critical
line (as a 3-D ridge landscape) → the harmonics of the primes → computers and proof.
Narration text is original; every picture is computed. Reuses the computational core of
riemann_lernvideo_en.html (ζ via Borwein + functional equation, zeros via Riemann–Siegel Z(t)).

Usage:   node riemann_explained_video.js            ->  riemann_explained.mp4
         VORSCHAU=1 node riemann_explained_video.js ->  quick test run at 10 fps
Requires: Node.js, Playwright with Chromium, ffmpeg
*/
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const VORSCHAU = process.env.VORSCHAU === '1';
const FPS = VORSCHAU ? 10 : 30;
const BREITE = 1280, HOEHE = 720;
const HTML = path.join(__dirname, 'riemann_lernvideo_en.html');
const AUS = path.join(__dirname, 'riemann_explained.mp4');

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

  let TT = 0; const B = [];
  S.forEach((s, si) => { s.start = TT; s.bs = []; s.beats.forEach((text, bi) => { const d = Math.max(6, text.length / 13.5 + 2); s.bs.push(TT - s.start); B.push({ si, bi, text, start: TT, dur: d }); TT += d; }); s.end = TT; });
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
  window.EXPL = { frame, total: TOTAL, scenes: S.map(s => [s.tag, Math.round(s.start)]) };
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: BREITE, height: HOEHE } });
  await page.goto('file://' + HTML);
  await page.waitForFunction(() => typeof domDone !== 'undefined' && domDone === NCHUNK && ZEROS.length > 100, null, { timeout: 180000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(([w, h]) => { window.removeEventListener('resize', resize); S.playing = false; cv.width = w; cv.height = h; window.requestAnimationFrame = () => 0; }, [BREITE, HOEHE]);
  await page.evaluate('(' + setup.toString() + ')()');
  const total = await page.evaluate(() => EXPL.total);
  if (process.env.STILLS) {   // STILLS="12,40,…" writes single frames instead of a video
    const fs = require('fs');
    for (const t of process.env.STILLS.split(',').map(Number)) { const u = await page.evaluate(t => EXPL.frame(t), t); fs.writeFileSync(path.join(process.env.STILLDIR || '.', `still_${t}.jpg`), Buffer.from(u.split(',')[1], 'base64')); }
    console.log(await page.evaluate(() => JSON.stringify(EXPL.scenes)), total); await browser.close(); return;
  }
  const n = Math.round(total * FPS);
  console.log(`${n} frames (${(total / 60).toFixed(1)} min) at ${FPS} fps`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-crf', '24', '-preset', VORSCHAU ? 'veryfast' : 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', AUS],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, err) => ff.on('close', c => c === 0 ? ok() : err(new Error('ffmpeg exit ' + c))));
  const write = buf => new Promise(ok => ff.stdin.write(buf) ? ok() : ff.stdin.once('drain', ok));
  const BATCH = 8;
  for (let i = 0; i < n; i += BATCH) {
    const ts = []; for (let j = i; j < Math.min(n, i + BATCH); j++) ts.push(j / FPS);
    const urls = await page.evaluate(ts => ts.map(t => EXPL.frame(t)), ts);
    for (const u of urls) await write(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
    if (i % (FPS * 30) < BATCH) process.stdout.write(`\r${Math.round(100 * i / n)} %`);
  }
  ff.stdin.end(); await done; await browser.close();
  console.log('\rdone: ' + AUS);
})().catch(e => { console.error(e); process.exit(1); });
