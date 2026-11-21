/* Learning video (motion graphic, English): The Riemann Hypothesis – a history  ->  riemann_history.mp4

From Euclid (c. 300 BC) to the Millennium Prize: the people and ideas behind the
Riemann hypothesis, as an animated maths explainer without interactivity.
All graphics are computed, not drawn by hand. The script reuses the computational core of
riemann_lernvideo_en.html (ζ(s) via Borwein's method and the functional equation, zeros
via sign changes of the Riemann–Siegel function Z(t), primes by sieve up to 100,000).

Usage:   node riemann_history_video.js            ->  riemann_history.mp4
         VORSCHAU=1 node riemann_history_video.js ->  quick test run at 10 fps
Requires: Node.js, Playwright with Chromium, ffmpeg
*/
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const VORSCHAU = process.env.VORSCHAU === '1';
const FPS = VORSCHAU ? 10 : 30;
const BREITE = 1280, HOEHE = 720;
const HTML = path.join(__dirname, 'riemann_lernvideo_en.html');
const AUS = path.join(__dirname, 'riemann_history.mp4');

// ------------------------------------------------------------------ scenes (run in the browser)
function setup() {
  const Y0 = 150;                                   // top of the content area below the headline
  const fadeIn = (st, k, d = 0.8) => st.ap(k, d);
  const head = (title, sub) => { txt(ctx, title, 80, 84, F.disp(40), COL.text); if (sub) txt(ctx, sub, 80, 122, F.sans(21, 400), COL.dim); };
  const quote = (x, y, w, lines, src, a) => {
    ctx.globalAlpha = a; card(ctx, x, y, w, 70 + lines.length * 46 + 40);
    ctx.fillStyle = COL.gold; ctx.fillRect(x + 28, y + 34, 4, lines.length * 46);
    lines.forEach((l, i) => txt(ctx, l, x + 52, y + 66 + i * 46, F.dispI(30), COL.text));
    txt(ctx, src, x + 52, y + 74 + lines.length * 46 + 14, F.sans(19, 400), COL.dim);
    ctx.globalAlpha = 1;
  };
  const zerosLine = (x, st, scale = 11, base = 790) => {
    ctx.strokeStyle = COL.gold; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.setLineDash([10, 10]);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SH); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    for (const g of ZEROS) { const y = base - (g * scale - st.lt * 12); if (y < -20 || y > SH + 20) continue; dot(ctx, x, y, 6, COL.gold, true); }
  };
  const ratioPlot = (P, upto) => {
    ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2.5; ctx.beginPath(); let first = true;
    for (let px = 0; px <= P.w; px++) {
      const x = Math.floor(Math.exp(Math.log(P.xa) + (Math.log(upto) - Math.log(P.xa)) * px / P.w)); if (x > upto) break;
      const r = PI_[x] / (x / Math.log(x)); const X = P.X(x), Y = P.Y(r);
      if (first) { ctx.moveTo(X, Y); first = false; } else ctx.lineTo(X, Y);
    }
    ctx.stroke();
  };
  const logTicks = [10, 100, 1000, 10000, 100000];
  const fmtPow = v => '10' + ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶'][Math.round(Math.log10(v))];

  // more zeros for the statistics scene (Riemann–Siegel up to t = 1000)
  const ZBIG = M.findZeros(1000);
  const unf = ZBIG.map(g => M.theta(g) / Math.PI + 1);
  const PAIR = new Float64Array(30);
  for (let i = 0; i < unf.length; i++) for (let j = i + 1; j < unf.length; j++) { const d = unf[j] - unf[i]; if (d >= 3) break; PAIR[Math.floor(d / 0.1)]++; }
  for (let b = 0; b < 30; b++) PAIR[b] /= unf.length * 0.1;
  const HARM = []; { let H = 0, n = 0; for (let e = 0; e <= 6.0001; e += 0.02) { const N = Math.round(Math.pow(10, e)); while (n < N) { n++; H += 1 / n; } HARM.push([e, H]); } }

  const S = [
  { year: '', title: '', beats: [
      'Some problems in mathematics are easy to state and seem impossible to solve. This is the story of the most famous of them, and of the people who chased it for more than two thousand years.'],
    draw(st) {
      zerosLine(1240, st);
      txt(ctx, 'A SHORT HISTORY', 110, 300, F.mono(20), COL.gold);
      txt(ctx, 'The Riemann', 104, 400, F.disp(92), COL.text);
      txt(ctx, 'Hypothesis', 104, 505, F.disp(92), COL.text);
      ctx.globalAlpha = fadeIn(st, 0, 1.5);
      txt(ctx, 'From Euclid to the Millennium Prize', 110, 575, F.sans(30, 400), COL.dim);
      ctx.globalAlpha = 1;
    } },
  { year: 'c. 300 BC', title: 'Euclid of Alexandria', beats: [
      'It begins with the primes. Around 300 BC, Euclid of Alexandria proved in his Elements that there are infinitely many of them.',
      'His argument fits on a napkin. Take any finite list of primes, multiply them together and add one. The result is not divisible by any prime on the list, so the list was never complete.',
      'A century later, Eratosthenes of Cyrene described a sieve to find all primes up to a given bound. But how the primes are spread out remained a mystery for two thousand years.'],
    draw(st) {
      head('Infinitely many primes', 'Elements, Book IX, Proposition 20');
      if (st.beat === 0) {
        const n = Math.min(40, Math.floor(st.since * 4));
        PRIMES.slice(0, n).forEach((p, i) => { const c = i % 10, r = Math.floor(i / 10); ctx.globalAlpha = clamp(st.since * 4 - i, 0, 1); txt(ctx, String(p), 220 + c * 120, 280 + r * 100, F.disp(48), COL.coral, 'center'); });
        ctx.globalAlpha = clamp(st.since - 6, 0, 1); txt(ctx, '…  and they never stop', 1340, 700, F.dispI(34), COL.text, 'right'); ctx.globalAlpha = 1;
      } else if (st.beat === 1) {
        const rows = [['2 · 3 + 1', '7', 'prime'], ['2 · 3 · 5 + 1', '31', 'prime'], ['2 · 3 · 5 · 7 + 1', '211', 'prime'], ['2 · 3 · 5 · 7 · 11 · 13 + 1', '30031', '= 59 · 509']];
        rows.forEach((r, i) => {
          ctx.globalAlpha = clamp((st.since - 0.5 - i * 2.2) / 0.6, 0, 1);
          txt(ctx, r[0] + '  =', 820, 270 + i * 100, F.disp(44), COL.text, 'right');
          txt(ctx, r[1], 850, 270 + i * 100, F.disp(44), COL.gold);
          txt(ctx, r[2], 1100, 270 + i * 100, F.sans(28, 500), i === 3 ? COL.coral : COL.dim);
        });
        ctx.globalAlpha = clamp((st.since - 9.5) / 0.6, 0, 1);
        txt(ctx, 'new primes, missing from the list', 1100, 708, F.sans(24, 400), COL.coral);
        ctx.globalAlpha = 1;
      } else {
        const a = fadeIn(st, 2, 1);
        for (let n = 1; n <= 120; n++) {
          const c = (n - 1) % 20, r = Math.floor((n - 1) / 20), x = 110 + c * 69, y = 190 + r * 76, pr = n > 1 && !sieve[n];
          const on = clamp((st.since - 0.5) * 30 - n, 0, 1) * a;
          ctx.globalAlpha = a; ctx.fillStyle = pr ? `rgba(255,122,107,${0.08 + 0.15 * on})` : 'rgba(255,255,255,0.03)';
          ctx.beginPath(); ctx.roundRect(x, y, 62, 66, 8); ctx.fill();
          txt(ctx, String(n), x + 31, y + 42, F.mono(21, pr ? 600 : 400), pr && on > 0.5 ? COL.coral : '#3d4670', 'center');
        }
        ctx.globalAlpha = 1;
      }
    } },
  { year: '1735', title: 'Leonhard Euler', beats: [
      'In 1735 the young Leonhard Euler solved a problem that had defeated the best minds of Europe for almost a century: the Basel problem. The sum of the reciprocals of all squares is exactly π squared over six.',
      'Two years later he found something deeper. The sum over all whole numbers equals a product over all primes. This Euler product is the first bridge between analysis and the primes.',
      'With it Euler gave a new proof that there are infinitely many primes: if there were only finitely many, the product would be finite. But at s equal to 1 the sum, the harmonic series, grows without bound.'],
    draw(st) {
      if (st.beat === 0) {
        head('The Basel problem', 'posed by Pietro Mengoli in 1650, solved by Euler');
        txt(ctx, '1 + 1/4 + 1/9 + 1/16 + 1/25 + …  =  π²/6', 800, 230, F.disp(46), COL.text, 'center');
        const P = plot(200, 290, 1200, 430, 0, 40, 1, 1.7), K = clamp(Math.floor(st.since * 4), 1, 40);
        axes(ctx, P, { xt: [0, 10, 20, 30, 40], yt: [1, 1.2, 1.4, 1.6], yf: v => de(v, 1), xl: 'number of terms' });
        ctx.strokeStyle = COL.gold; ctx.setLineDash([12, 9]); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(P.x, P.Y(Math.PI ** 2 / 6)); ctx.lineTo(P.x + P.w, P.Y(Math.PI ** 2 / 6)); ctx.stroke(); ctx.setLineDash([]);
        let s = 0; for (let n = 1; n <= K; n++) { s += 1 / (n * n); dot(ctx, P.X(n), P.Y(s), 5, COL.cyan); }
        txt(ctx, 'π²/6 = 1.644934…', P.x + P.w, P.Y(Math.PI ** 2 / 6) - 16, F.mono(22), COL.gold, 'right');
      } else if (st.beat === 1) {
        head('The Euler product (1737)', 'Variae observationes circa series infinitas');
        txt(ctx, '∑  1 / nˢ   =   ∏   1 / (1 − 1/pˢ)', 800, 330, F.disp(60), COL.text, 'center');
        txt(ctx, 'all n ≥ 1', 470, 378, F.mono(20), COL.dim, 'center'); txt(ctx, 'all primes p', 905, 378, F.mono(20), COL.coral, 'center');
        const f = ['1/(1 − 1/2ˢ)', '1/(1 − 1/3ˢ)', '1/(1 − 1/5ˢ)', '1/(1 − 1/7ˢ)', '1/(1 − 1/11ˢ)', '…'];
        f.forEach((t, i) => { ctx.globalAlpha = clamp((st.since - 2 - i * 0.8) / 0.5, 0, 1); txt(ctx, (i ? '× ' : '') + t, 170 + i * 230, 540, F.disp(30), COL.coral); });
        ctx.globalAlpha = clamp((st.since - 8) / 0.6, 0, 1);
        txt(ctx, 'whole numbers  ⟷  primes', 800, 660, F.dispI(36), COL.gold, 'center'); ctx.globalAlpha = 1;
      } else {
        head('The harmonic series diverges', '1 + 1/2 + 1/3 + 1/4 + … grows like ln N');
        const P = plot(200, 220, 1200, 480, 0, 6, 0, 15);
        axes(ctx, P, { xt: [0, 1, 2, 3, 4, 5, 6], yt: [0, 5, 10, 15], xf: v => fmtPow(Math.pow(10, v)), xl: 'number of terms N (log scale)' });
        const upto = clamp(st.since * 0.7, 0, 6);
        ctx.strokeStyle = COL.cyan; ctx.lineWidth = 3; ctx.beginPath();
        HARM.filter(h => h[0] <= upto).forEach((h, i) => i ? ctx.lineTo(P.X(h[0]), P.Y(h[1])) : ctx.moveTo(P.X(h[0]), P.Y(h[1]))); ctx.stroke();
        const last = HARM.filter(h => h[0] <= upto).pop(); if (last) txt(ctx, 'H = ' + de(last[1], 2), P.X(last[0]) + 12, P.Y(last[1]) - 12, F.mono(22), COL.text);
        txt(ctx, 'no limit  ⟹  infinitely many primes', P.x + P.w, P.y + 40, F.sans(26, 600), COL.gold, 'right');
      }
    } },
  { year: '1792', title: 'Gauss and Legendre', beats: [
      'Around 1792, the fifteen-year-old Carl Friedrich Gauss studied tables of primes. He counted them in blocks of a thousand and noticed that they thin out slowly and steadily.',
      'Near a number x, he guessed, about one in every ln x numbers is prime. Adding up this density gives the logarithmic integral li(x). Gauss only described the idea in a letter in 1849.',
      'Adrien-Marie Legendre published a similar formula in 1798 and refined it ten years later. Both were guesses backed by data. Nobody could prove them.'],
    draw(st) {
      head('Primes in blocks of 1,000', 'how many primes lie between 1,000k and 1,000(k + 1)?');
      const P = plot(170, 200, 1300, 500, 0, 100, 0, 170);
      axes(ctx, P, { xt: [0, 20, 40, 60, 80, 100], yt: [0, 50, 100, 150], xf: v => de(v * 1000), xl: 'x' });
      const nb = st.beat === 0 ? clamp(Math.floor(st.since * 12), 0, 100) : 100;
      for (let k = 0; k < nb; k++) { const c = PI_[1000 * (k + 1)] - PI_[1000 * k]; ctx.fillStyle = 'rgba(255,122,107,0.75)'; ctx.fillRect(P.X(k) + 1, P.Y(c), P.w / 100 - 2, P.Y(0) - P.Y(c)); }
      const a = st.beat >= 1 ? fadeIn(st, 1, 1) : 0;
      if (a > 0) {
        ctx.globalAlpha = a; ctx.strokeStyle = COL.cyan; ctx.lineWidth = 3.5; ctx.beginPath();
        for (let k = 0.3; k <= 100; k += 0.2) { const y = 1000 / Math.log(1000 * k); k === 0.3 ? ctx.moveTo(P.X(k), P.Y(y)) : ctx.lineTo(P.X(k), P.Y(y)); }
        ctx.stroke();
        card(ctx, 900, 230, 540, 150);
        txt(ctx, 'density near x  ≈  1 / ln x', 930, 285, F.disp(32), COL.cyan);
        txt(ctx, 'li(x) = ∫₂ˣ dt / ln t', 930, 345, F.disp(32), COL.text);
        ctx.globalAlpha = 1;
      }
      if (st.beat === 2) { ctx.globalAlpha = fadeIn(st, 2, 1); card(ctx, 900, 400, 540, 96); txt(ctx, 'Legendre (1808):  x / (ln x − 1.08366)', 930, 458, F.sans(26, 500), COL.violet); ctx.globalAlpha = 1; }
    } },
  { year: '1850', title: 'Pafnuty Chebyshev', beats: [
      'The first real progress came from Saint Petersburg. Around 1850, Pafnuty Chebyshev proved that for large x, π(x) stays within about ten percent of x over ln x.',
      'He also showed: if the ratio settles down at all, it must settle at exactly one. But whether it settles down, he could not prove.'],
    draw(st) {
      head('π(x) / (x / ln x)', 'the ratio of the prime count to Gauss’s estimate');
      const P = plot(190, 200, 1280, 500, 10, 100000, 0.85, 1.35, true);
      axes(ctx, P, { xt: logTicks, yt: [0.9, 1, 1.1, 1.2, 1.3], xf: fmtPow, yf: v => de(v, 1), xl: 'x (log scale)' });
      const a = fadeIn(st, 0, 1);
      ctx.globalAlpha = a; ctx.fillStyle = 'rgba(242,193,78,0.14)'; ctx.fillRect(P.x, P.Y(1.10555), P.w, P.Y(0.92129) - P.Y(1.10555));
      ctx.strokeStyle = 'rgba(242,193,78,0.7)'; ctx.lineWidth = 1.5; ctx.strokeRect(P.x, P.Y(1.10555), P.w, P.Y(0.92129) - P.Y(1.10555));
      txt(ctx, 'Chebyshev: for large x, between 0.921 and 1.106', P.x + 20, P.Y(0.92129) + 32, F.sans(22, 600), COL.gold); ctx.globalAlpha = 1;
      ratioPlot(P, Math.exp(Math.log(10) + (Math.log(100000) - Math.log(10)) * clamp(st.lt / 8, 0, 1)));
      if (st.beat === 1) { ctx.globalAlpha = fadeIn(st, 1, 1); ctx.strokeStyle = COL.text; ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.x, P.Y(1)); ctx.lineTo(P.x + P.w, P.Y(1)); ctx.stroke(); ctx.setLineDash([]); txt(ctx, 'limit = 1 ?', P.x + P.w - 10, P.Y(1) + 34, F.disp(30), COL.text, 'right'); ctx.globalAlpha = 1; }
    } },
  { year: '1859', title: 'Bernhard Riemann', beats: [
      'In 1859 Bernhard Riemann was elected to the Berlin Academy. In return he submitted a short paper, his only one on number theory: eight pages on the number of primes below a given size.',
      'His key idea was to let s in Euler’s zeta function be a complex number. He extended ζ to the entire complex plane and found a hidden symmetry around the line with real part one half.',
      'Then he wrote down an exact formula for the primes. Its ingredients are the zeros of the zeta function: each zero contributes a wave to the distribution of the primes.',
      'About these zeros he remarked that it is very likely that they all lie on that line. A rigorous proof would be desirable, but he had put the search aside after a few fleeting attempts.',
      'Riemann died of tuberculosis in 1866, at only thirty-nine. His remark became the Riemann hypothesis.'],
    draw(st) {
      if (st.beat === 0) {
        const a = fadeIn(st, 0, 1); ctx.globalAlpha = a;
        ctx.fillStyle = '#e9e3d3'; ctx.beginPath(); ctx.roundRect(560, 150, 480, 600, 6); ctx.fill();
        txt(ctx, 'Ueber die Anzahl der Primzahlen', 800, 230, F.disp(24, 600), '#2a2418', 'center');
        txt(ctx, 'unter einer gegebenen Grösse.', 800, 262, F.disp(24, 600), '#2a2418', 'center');
        txt(ctx, '(Monatsberichte der Berliner Akademie, November 1859.)', 800, 300, F.dispI(15), '#5a5040', 'center');
        ctx.fillStyle = 'rgba(42,36,24,0.35)';
        for (let i = 0; i < 17; i++) { const w = i % 6 === 5 ? 210 : 390; ctx.fillRect(605, 340 + i * 22, w * clamp(st.since * 0.6 - i * 0.12, 0, 1), 6); }
        txt(ctx, '8 pages', 1080, 500, F.disp(40), COL.gold); txt(ctx, '1 conjecture', 1080, 550, F.disp(40), COL.gold);
        ctx.globalAlpha = 1;
      } else if (st.beat === 1) {
        const cy = 18, hh = 6.75 / 2, V = { X: re => (re + 7.5) / 12 * SW, Y: im => SH / 2 - (im - cy) / (2 * hh) * SH };
        ctx.globalAlpha = fadeIn(st, 1, 1);
        ctx.drawImage(domCanvas, 0, (DOM.im1 - (cy + hh)) * DOM.PX, DOM.W, 2 * hh * DOM.PX, 0, 0, SW, SH);
        ctx.fillStyle = 'rgba(11,16,32,0.45)'; ctx.fillRect(0, 0, SW, SH);
        ctx.strokeStyle = COL.gold; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.moveTo(V.X(0.5), 0); ctx.lineTo(V.X(0.5), SH); ctx.stroke(); ctx.setLineDash([]);
        const sg = 0.5 + 1.6 * Math.abs(Math.sin(st.since * 0.6)), tt = 16.2;
        dot(ctx, V.X(sg), V.Y(tt), 9, COL.cyan, true); dot(ctx, V.X(1 - sg), V.Y(tt), 9, COL.cyan, true);
        ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(V.X(1 - sg) + 14, V.Y(tt)); ctx.lineTo(V.X(sg) - 14, V.Y(tt)); ctx.stroke();
        card(ctx, 60, 50, 620, 140); txt(ctx, 'ξ(s) = ξ(1 − s)', 90, 120, F.disp(46), COL.text);
        txt(ctx, 'mirror symmetry around Re(s) = ½', 92, 162, F.sans(21, 400), COL.dim);
        txt(ctx, 'Re(s) = ½', V.X(0.5) + 16, 40, F.mono(20), COL.gold);
        ctx.globalAlpha = 1;
      } else if (st.beat === 2) {
        head('Riemann’s explicit formula', 'primes from zeros: each zero pair adds one wave');
        const N = clamp(Math.floor(st.since * 9), 0, ZEROS.length);
        const P = plot(150, 190, 1320, 520, 1, 40, -2, 42);
        axes(ctx, P, { xt: [1, 10, 20, 30, 40], yt: [0, 10, 20, 30, 40], xl: 'x' });
        clipTo(ctx, P);
        ctx.strokeStyle = COL.coral; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(P.X(1), P.Y(0));
        for (let n = 2; n <= 40; n++) { ctx.lineTo(P.X(n), P.Y(PSI[n - 1])); ctx.lineTo(P.X(n), P.Y(PSI[n])); } ctx.stroke();
        ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2.4; ctx.beginPath(); let first = true;
        for (let px = 0; px <= P.w; px += 1.5) {
          const x = 1 + px / P.w * 39; if (x < 1.03) continue; const L = Math.log(x), r = Math.sqrt(x); let s = 0;
          for (let k = 0; k < N; k++) { const g = ZEROS[k]; s += (0.5 * Math.cos(g * L) + g * Math.sin(g * L)) / (0.25 + g * g); }
          const y = x - 2 * r * s - Math.log(2 * Math.PI) - 0.5 * Math.log(1 - 1 / (x * x));
          if (first) { ctx.moveTo(P.X(x), P.Y(y)); first = false; } else ctx.lineTo(P.X(x), P.Y(y));
        }
        ctx.stroke(); ctx.restore();
        txt(ctx, N + ' zero pairs', P.x + P.w - 16, P.y + P.h - 24, F.mono(30), COL.gold, 'right');
      } else if (st.beat === 3) {
        zerosLine(1240, st, 9);
        quote(90, 190, 1040, ['„… und es ist sehr wahrscheinlich,', 'dass alle Wurzeln reell sind.“'], 'Riemann, 1859  ·  “… and it is very likely that all roots are real.”', fadeIn(st, 3, 1));
        ctx.globalAlpha = clamp((st.since - 4) / 0.8, 0, 1);
        wrapText(ctx, 'Riemann writes in terms of a function ξ(t). “All roots real” means: all non-trivial zeros of ζ have real part ½.', 120, 560, 1000, 36, F.sans(24, 400), COL.dim);
        ctx.globalAlpha = 1;
      } else {
        zerosLine(1240, st);
        ctx.globalAlpha = fadeIn(st, 4, 1);
        txt(ctx, 'Bernhard Riemann', 110, 360, F.disp(72), COL.text);
        txt(ctx, '1826 – 1866', 112, 430, F.mono(34), COL.gold);
        txt(ctx, 'Breselenz · Göttingen · Selasca', 112, 490, F.sans(26, 400), COL.dim);
        ctx.globalAlpha = 1;
      }
    } },
  { year: '1896', title: 'The prime number theorem', beats: [
      'Thirty-seven years later, in 1896, Jacques Hadamard and Charles de la Vallée Poussin independently proved the prime number theorem, building on Riemann’s ideas.',
      'The decisive step was to show that ζ has no zeros on the line with real part 1. Pinning all zeros to the line one half remained far out of reach.'],
    draw(st) {
      if (st.beat === 0) {
        head('Proved: π(x) / (x / ln x) → 1', 'Hadamard and de la Vallée Poussin, independently, 1896');
        const P = plot(190, 200, 1280, 500, 10, 100000, 0.85, 1.35, true);
        axes(ctx, P, { xt: logTicks, yt: [0.9, 1, 1.1, 1.2, 1.3], xf: fmtPow, yf: v => de(v, 1), xl: 'x (log scale)' });
        ctx.strokeStyle = COL.gold; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(P.x, P.Y(1)); ctx.lineTo(P.x + P.w, P.Y(1)); ctx.stroke();
        ratioPlot(P, 100000);
        txt(ctx, 'limit = 1  ✓', P.x + P.w - 10, P.Y(1) + 36, F.disp(32), COL.gold, 'right');
        txt(ctx, 'but slowly: at x = 10⁵ the ratio is still ' + de(PI_[100000] / (100000 / Math.log(100000)), 3), P.x + P.w - 10, P.Y(1) + 76, F.sans(22, 400), COL.dim, 'right');
      } else {
        head('Where the zeros cannot be', 'the critical strip 0 < Re(s) < 1');
        const X = re => 400 + re * 600;
        ctx.globalAlpha = fadeIn(st, 1, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(X(0), 160, 600, 560);
        txt(ctx, '?', X(0.5) - 120, 450, F.disp(90), 'rgba(233,236,248,0.25)', 'center'); txt(ctx, '?', X(0.5) + 120, 330, F.disp(90), 'rgba(233,236,248,0.25)', 'center');
        ctx.strokeStyle = '#5fd39a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(X(1), 160); ctx.lineTo(X(1), 720); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), 160); ctx.lineTo(X(0), 720); ctx.stroke();
        ctx.strokeStyle = COL.gold; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.moveTo(X(0.5), 160); ctx.lineTo(X(0.5), 720); ctx.stroke(); ctx.setLineDash([]);
        txt(ctx, 'Re(s) = 1: no zeros (1896)', X(1) + 24, 300, F.sans(26, 600), '#5fd39a');
        txt(ctx, 'Re(s) = ½: all zeros? (1859)', X(1) + 24, 360, F.sans(26, 600), COL.gold);
        txt(ctx, 'σ = 0', X(0), 750, F.mono(20), COL.dim, 'center'); txt(ctx, 'σ = ½', X(0.5), 750, F.mono(20), COL.gold, 'center'); txt(ctx, 'σ = 1', X(1), 750, F.mono(20), COL.dim, 'center');
        ctx.globalAlpha = 1;
      }
    } },
  { year: '1900', title: 'David Hilbert', beats: [
      'At the International Congress of Mathematicians in Paris in 1900, David Hilbert presented a list of 23 problems for the new century. The Riemann hypothesis was part of problem number eight.',
      'Hilbert is said to have remarked later that if he woke up after sleeping for a thousand years, his first question would be whether the Riemann hypothesis had been proved.'],
    draw(st) {
      if (st.beat === 0) {
        head('Hilbert’s 23 problems', 'International Congress of Mathematicians, Paris, August 1900');
        for (let i = 0; i < 23; i++) {
          const c = i % 8, r = Math.floor(i / 8), x = 170 + c * 140, y = 180 + r * 140, hot = i === 7;
          ctx.globalAlpha = clamp((st.since * 6 - i) / 2, 0, 1);
          ctx.fillStyle = hot ? 'rgba(242,193,78,0.22)' : 'rgba(255,255,255,0.05)'; ctx.strokeStyle = hot ? COL.gold : COL.line; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(x, y, 120, 120, 12); ctx.fill(); ctx.stroke();
          txt(ctx, String(i + 1), x + 60, y + 78, F.disp(48), hot ? COL.gold : COL.dim, 'center');
        }
        ctx.globalAlpha = clamp((st.since - 5) / 0.8, 0, 1);
        card(ctx, 170, 600, 700, 110); txt(ctx, 'Problem 8: prime number problems', 200, 645, F.sans(24, 600), COL.gold);
        txt(ctx, 'Riemann hypothesis · Goldbach · twin primes', 200, 685, F.sans(21, 400), COL.text);
        ctx.globalAlpha = 1;
      } else {
        zerosLine(1240, st, 9);
        quote(90, 230, 1040, ['“If I were to awaken after having slept for a', 'thousand years, my first question would be:', 'has the Riemann hypothesis been proven?”'], 'attributed to David Hilbert', fadeIn(st, 1, 1));
      }
    } },
  { year: '1914', title: 'Hardy and Littlewood', beats: [
      'In 1914 the English mathematician G. H. Hardy proved that infinitely many zeros lie exactly on the critical line. Not all of them, but infinitely many.',
      'In the same year his collaborator John Littlewood showed that π(x) and li(x) swap places infinitely often, even though every table ever computed has li(x) on top. The first crossing is expected only near 10 to the power 316.'],
    draw(st) {
      if (st.beat === 0) {
        head('Infinitely many zeros on the line', 'G. H. Hardy, 1914');
        const x = 800; ctx.strokeStyle = COL.gold; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.moveTo(x, 160); ctx.lineTo(x, SH); ctx.stroke(); ctx.setLineDash([]);
        ZEROS.forEach((g, i) => { const y = 760 - g * 5.2 + 0 * i; if (y < 170) return; ctx.globalAlpha = clamp(st.since * 8 - i, 0, 1); dot(ctx, x, y, 6, COL.gold, true); });
        ctx.globalAlpha = clamp((st.since - 3) / 0.8, 0, 1); txt(ctx, '∞', x + 60, 300, F.disp(110), COL.gold); ctx.globalAlpha = 1;
      } else {
        head('li(x) − π(x)', 'positive in every table, yet it changes sign infinitely often (Littlewood, 1914)');
        const P = plot(170, 190, 1300, 330, 2, 100000, -10, 45);
        axes(ctx, P, { xt: [20000, 40000, 60000, 80000, 100000], yt: [0, 20, 40], xl: 'x' });
        ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2; ctx.beginPath();
        for (let c = 0; c < P.w; c++) { const a = Math.max(2, Math.floor(2 + 99998 * c / P.w)), b = Math.floor(2 + 99998 * (c + 1) / P.w); let lo = 1e9, hi = -1e9; for (let n = a; n <= b; n++) { lo = Math.min(lo, DIFF[n]); hi = Math.max(hi, DIFF[n]); } c ? ctx.lineTo(P.x + c, P.Y(hi)) : ctx.moveTo(P.x + c, P.Y(hi)); ctx.lineTo(P.x + c, P.Y(lo)); }
        ctx.stroke();
        ctx.globalAlpha = clamp((st.since - 5) / 0.8, 0, 1);
        card(ctx, 330, 590, 940, 92);
        txt(ctx, 'first sign change: somewhere near 1.4 × 10³¹⁶', 800, 648, F.disp(34), COL.gold, 'center');
        ctx.globalAlpha = 1;
      }
    } },
  { year: '1932', title: 'Siegel and the zero hunters', beats: [
      'In 1932 Carl Ludwig Siegel studied Riemann’s unpublished notes in Göttingen. Hidden in them was a powerful method for computing zeros, which Riemann had used by hand. Today it is called the Riemann–Siegel formula.',
      'Then the hunt began. Gram had found 15 zeros in 1903, Titchmarsh 1,041 in 1936. In 1953 Alan Turing used one of the first electronic computers, in Manchester, to push further.',
      'Every new generation of computers went further: millions by 1969, one and a half billion by 1986, ten trillion by 2004. Every single zero found so far lies exactly on the critical line.'],
    draw(st) {
      if (st.beat === 0) {
        head('The Riemann–Siegel function Z(t)', 'real-valued, with a sign change at every zero on the line');
        const P = plot(170, 220, 1300, 460, 0, 60, -4.2, 4.2);
        axes(ctx, P, { xt: [0, 10, 20, 30, 40, 50, 60], yt: [-4, -2, 0, 2, 4], xl: 't' });
        const T = clamp(st.since * 5, 0, 60), n = Math.round(T / 0.025);
        ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2.6; ctx.beginPath(); for (let i = 0; i <= n && i < SP.length; i += 2) { const p = SP[i]; i ? ctx.lineTo(P.X(p[0]), P.Y(p[3])) : ctx.moveTo(P.X(p[0]), P.Y(p[3])); } ctx.stroke();
        ZEROS.filter(g => g <= T).forEach(g => dot(ctx, P.X(g), P.Y(0), 6, COL.gold, true));
      } else {
        head('Zeros checked on the critical line', 'all of them have real part ½');
        const D = [['1903', 'Gram', 15], ['1936', 'Titchmarsh', 1041], ['1953', 'Turing', 1104], ['1956', 'Lehmer', 25000], ['1969', 'Rosser, Yohe, Schoenfeld', 3500000], ['1986', 'van de Lune, te Riele, Winter', 1.5e9], ['2004', 'Gourdon, Demichel', 1e13]];
        const L = v => Math.log10(v), x0 = 640, W = 820;
        const vis = st.beat === 1 ? 3 + clamp(st.since / 2 - 3, 0, 0) : 3 + clamp(Math.floor(st.since / 2.2) + 1, 0, 4);
        D.forEach((d, i) => {
          if (i >= vis) return; const y = 200 + i * 72, a = st.beat === 1 ? clamp((st.since - i * 2) / 0.6, 0, 1) : (i < 3 ? 1 : clamp((st.since - (i - 3) * 2.2) / 0.6, 0, 1));
          ctx.globalAlpha = a;
          txt(ctx, d[0], 120, y + 34, F.mono(26), COL.gold); txt(ctx, d[1], 220, y + 34, F.sans(24, 500), COL.text);
          const w = W * L(d[2]) / 13 * ease(a); ctx.fillStyle = 'rgba(90,209,230,0.8)'; ctx.fillRect(x0, y + 8, w, 36);
          const lab = d[2] >= 1e9 ? (d[2] === 1e13 ? '10¹³' : '1.5 × 10⁹') : de(d[2]);
          txt(ctx, lab, x0 + w + 14, y + 36, F.mono(22), COL.text);
        });
        ctx.globalAlpha = 1; txt(ctx, 'bar length: log scale', x0, 728, F.sans(18, 400), COL.dim);
      }
    } },
  { year: '1942', title: 'How many on the line?', beats: [
      'Others attacked the problem from the theoretical side. Atle Selberg proved in 1942 that a positive fraction of all zeros lies on the line. Norman Levinson raised it to more than a third in 1974, and Brian Conrey to more than two fifths in 1989.'],
    draw(st) {
      head('Proportion of zeros proved to lie on the line', 'the goal is 100 %');
      const steps = [['1914', 'Hardy', 0, 'infinitely many'], ['1942', 'Selberg', 0.04, '> 0'], ['1974', 'Levinson', 0.3474, '> 34 %'], ['1989', 'Conrey', 0.4077, '> 40 %']];
      const x0 = 340, W = 1080;
      steps.forEach((s, i) => {
        const a = clamp((st.since - 0.5 - i * 3) / 0.8, 0, 1), y = 210 + i * 110; ctx.globalAlpha = a;
        txt(ctx, s[0], 110, y + 44, F.mono(28), COL.gold); txt(ctx, s[1], 200, y + 44, F.sans(26, 500), COL.text);
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x0, y + 14, W, 44);
        ctx.fillStyle = COL.gold; ctx.fillRect(x0, y + 14, Math.max(3, W * s[2] * ease(a)), 44);
        txt(ctx, s[3], x0 + Math.max(3, W * s[2]) + 16, y + 46, F.sans(24, 600), COL.text);
      });
      ctx.globalAlpha = 1; ctx.strokeStyle = COL.text; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(x0 + W, 200); ctx.lineTo(x0 + W, 660); ctx.stroke(); ctx.setLineDash([]);
      txt(ctx, '100 %', x0 + W, 690, F.mono(22), COL.text, 'center');
    } },
  { year: '1972', title: 'Montgomery and Dyson', beats: [
      'In 1972 Hugh Montgomery visited the Institute for Advanced Study in Princeton and met the physicist Freeman Dyson at afternoon tea. Montgomery described a formula for how the zeros repel each other.',
      'Dyson recognized it at once: it is the same formula that describes the energy levels of heavy atomic nuclei, modeled by random matrices. Nobody knows why.',
      'Andrew Odlyzko’s computations in the 1980s confirmed the match with stunning precision. The zeros of ζ seem to behave like the spectrum of an unknown physical system.'],
    draw(st) {
      head('How far apart are the zeros?', 'pair correlation of ' + ZBIG.length + ' zeros (t < 1000), spacing rescaled to 1');
      const P = plot(190, 200, 1280, 480, 0, 3, 0, 1.6);
      axes(ctx, P, { xt: [0, 0.5, 1, 1.5, 2, 2.5, 3], yt: [0, 0.5, 1, 1.5], xf: v => de(v, 1), yf: v => de(v, 1), xl: 'distance between zeros' });
      const nb = st.beat === 0 ? clamp(Math.floor(st.since * 3), 0, 30) : 30;
      for (let b = 0; b < nb; b++) { ctx.fillStyle = 'rgba(90,209,230,0.7)'; ctx.fillRect(P.X(b * 0.1) + 2, P.Y(PAIR[b]), P.X(0.1) - P.X(0) - 4, P.Y(0) - P.Y(PAIR[b])); }
      if (st.beat >= 1) {
        ctx.globalAlpha = fadeIn(st, 1, 1); ctx.strokeStyle = COL.gold; ctx.lineWidth = 4; ctx.beginPath();
        for (let u = 0.005; u <= 3; u += 0.01) { const v = 1 - Math.pow(Math.sin(Math.PI * u) / (Math.PI * u), 2); u < 0.01 ? ctx.moveTo(P.X(u), P.Y(v)) : ctx.lineTo(P.X(u), P.Y(v)); } ctx.stroke();
        card(ctx, 880, 220, 560, 120); txt(ctx, '1 − (sin πu / πu)²', 910, 274, F.disp(36), COL.gold);
        txt(ctx, 'random matrices (GUE), nuclear physics', 910, 316, F.sans(21, 400), COL.dim); ctx.globalAlpha = 1;
      }
      legend(ctx, P.x + 30, P.y + 40, [{ c: COL.cyan, t: 'zeros of ζ' }].concat(st.beat >= 1 ? [{ c: COL.gold, t: 'Montgomery–Dyson prediction' }] : []));
    } },
  { year: '2000', title: 'The Millennium Prize', beats: [
      'In 2000 the Clay Mathematics Institute named the Riemann hypothesis one of its seven Millennium Prize Problems, with a prize of one million dollars.',
      'More than 160 years after Riemann’s eight pages, thousands of theorems are proved on the assumption that it is true. The hypothesis itself is still open.',
      'Every zero we have ever seen sits on the line with real part one half. Whether all of them do remains the greatest unsolved question about the primes.'],
    draw(st) {
      if (st.beat === 0) {
        ctx.globalAlpha = fadeIn(st, 0, 1); card(ctx, 330, 200, 940, 440);
        txt(ctx, 'MILLENNIUM PRIZE PROBLEMS · CLAY MATHEMATICS INSTITUTE', 800, 270, F.mono(19), COL.gold, 'center');
        txt(ctx, '$1,000,000', 800, 400, F.disp(100), COL.text, 'center');
        txt(ctx, 'for a proof (or disproof) of the Riemann hypothesis', 800, 470, F.sans(26, 400), COL.dim, 'center');
        txt(ctx, 'announced 24 May 2000, Paris', 800, 570, F.disp(30), COL.gold, 'center'); ctx.globalAlpha = 1;
      } else if (st.beat === 1) {
        head('1859 → today', 'still open');
        const yrs = Math.round(lerp(0, 166, ease(st.since / 5)));
        txt(ctx, String(yrs), 800, 470, F.disp(200), COL.gold, 'center'); txt(ctx, 'years', 800, 560, F.sans(34, 400), COL.dim, 'center');
      } else {
        zerosLine(800, st, 9);
        ctx.globalAlpha = fadeIn(st, 2, 1.2);
        txt(ctx, 'Re(s) = ½ ?', 860, 300, F.disp(64), COL.gold);
        txt(ctx, 'for all non-trivial zeros', 862, 350, F.sans(28, 400), COL.dim);
        ctx.globalAlpha = 1;
      }
    } },
  ];

  let T = 0; const B = [];
  S.forEach((s, si) => { s.start = T; s.bs = []; s.beats.forEach((text, bi) => { const d = Math.max(5, text.length / 14 + 1.8); s.bs.push(T - s.start); B.push({ si, bi, text, start: T, dur: d }); T += d; }); s.end = T; });
  const TOTAL = T + 4;

  function subtitle(text) {
    ctx.font = F.sans(30, 500); const words = text.split(' '), lines = []; let z = '';
    for (const w of words) { const t = z ? z + ' ' + w : w; if (ctx.measureText(t).width > 1300 && z) { lines.push(z); z = w; } else z = t; }
    if (z) lines.push(z);
    const lh = 44, y0 = SH - 34 - lines.length * lh;
    lines.forEach((l, i) => { const w = ctx.measureText(l).width; ctx.fillStyle = 'rgba(5,8,18,0.82)'; ctx.beginPath(); ctx.roundRect(SW / 2 - w / 2 - 16, y0 + i * lh, w + 32, lh, 6); ctx.fill(); txt(ctx, l, SW / 2, y0 + i * lh + 32, F.sans(30, 500), '#f1f3fb', 'center'); });
  }
  function frame(t) {
    const k = cv.width / SW; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, SW, SH);
    if (t >= T) {   // closing card
      const a = ease((t - T) / 1);
      ctx.globalAlpha = a; txt(ctx, 'The Riemann Hypothesis', 800, 400, F.disp(64), COL.text, 'center');
      txt(ctx, 'Interactive version: riemann_lernvideo_en.html', 800, 470, F.sans(26, 400), COL.dim, 'center'); ctx.globalAlpha = 1;
      return cv.toDataURL('image/jpeg', 0.95);
    }
    let bi = B.length - 1; while (bi > 0 && B[bi].start > t) bi--;
    const b = B[bi], s = S[b.si], lt = t - s.start;
    const st = { beat: b.bi, lt, since: t - b.start, bp: clamp((t - b.start) / b.dur, 0, 1), ap: (j, d = 0.8) => ease((lt - s.bs[j]) / d) };
    ctx.save(); s.draw(st); ctx.restore(); ctx.globalAlpha = 1;
    if (s.year) {   // year stamp
      const a = ease(lt / 0.8); ctx.globalAlpha = a;
      txt(ctx, s.year, SW - 70, 84, F.disp(46), COL.gold, 'right');
      txt(ctx, s.title, SW - 70, 120, F.sans(21, 500), COL.dim, 'right'); ctx.globalAlpha = 1;
    }
    subtitle(b.text);
    // fade through black between scenes
    const edge = Math.min(lt, s.end - t);
    if (edge < 0.45) { ctx.globalAlpha = 1 - ease(edge / 0.45); ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, SW, SH); ctx.globalAlpha = 1; }
    return cv.toDataURL('image/jpeg', 0.95);
  }
  window.HIST = { frame, total: TOTAL, scenes: S.map(s => [s.year, s.title, Math.round(s.start)]) };
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: BREITE, height: HOEHE } });
  await page.goto('file://' + HTML);
  await page.waitForFunction(() => typeof domDone !== 'undefined' && domDone === NCHUNK && ZEROS.length > 100, null, { timeout: 180000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(([w, h]) => { window.removeEventListener('resize', resize); S.playing = false; cv.width = w; cv.height = h; window.requestAnimationFrame = () => 0; }, [BREITE, HOEHE]);
  await page.evaluate('(' + setup.toString() + ')()');
  const total = await page.evaluate(() => HIST.total);
  const n = Math.round(total * FPS);
  console.log(`${n} frames (${(total / 60).toFixed(1)} min) at ${FPS} fps`);
  if (process.env.SZENEN) console.log(await page.evaluate(() => JSON.stringify(HIST.scenes)));

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-crf', '24', '-preset', VORSCHAU ? 'veryfast' : 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', AUS],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, err) => ff.on('close', c => c === 0 ? ok() : err(new Error('ffmpeg exit ' + c))));
  const write = buf => new Promise(ok => ff.stdin.write(buf) ? ok() : ff.stdin.once('drain', ok));
  const BATCH = 8;
  for (let i = 0; i < n; i += BATCH) {
    const ts = []; for (let j = i; j < Math.min(n, i + BATCH); j++) ts.push(j / FPS);
    const urls = await page.evaluate(ts => ts.map(t => HIST.frame(t)), ts);
    for (const u of urls) await write(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
    if (i % (FPS * 30) < BATCH) process.stdout.write(`\r${Math.round(100 * i / n)} %`);
  }
  ff.stdin.end(); await done; await browser.close();
  console.log('\rdone: ' + AUS);
})().catch(e => { console.error(e); process.exit(1); });
