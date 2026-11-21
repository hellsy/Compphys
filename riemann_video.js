/* Lernvideo (Motion Graphic): Die Riemannsche Vermutung  ->  riemann.mp4

Rendert das interaktive Lernvideo riemann_lernvideo.html Bild für Bild als MP4
(1280×720, 30 fps, ohne Ton). Alle Grafiken werden dabei mit demselben Code berechnet
wie in der interaktiven Fassung:
    ζ(s) über das Borwein-Verfahren für η(s) und die Funktionalgleichung,
    Nullstellen über Vorzeichenwechsel der Riemann-Siegel-Funktion Z(t),
    Primzahlen per Sieb bis 100 000.
Die Untertitel werden ins Bild geschrieben, nach jedem Kapitel folgt die Quizfrage
mit Auflösung.

Aufruf:  node riemann_video.js            ->  riemann.mp4
         VORSCHAU=1 node riemann_video.js ->  schneller Testlauf mit 10 fps
Benötigt: Node.js, Playwright mit Chromium, ffmpeg
*/
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const VORSCHAU = process.env.VORSCHAU === '1';
const FPS = VORSCHAU ? 10 : 30;
const BREITE = 1280, HOEHE = 720;
const QUIZ_FRAGE = 6, QUIZ_ANTWORT = 6, ENDE = 5;   // Sekunden
const HTML = path.join(__dirname, 'riemann_lernvideo.html');
const AUS = path.join(__dirname, 'riemann.mp4');

// Läuft im Browser: zeichnet ein Bild des Videos auf die Leinwand und gibt es als JPEG zurück.
function frameImBrowser(seg) {
  const k = cv.width / SW;
  const unten = (text) => {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.font = F.sans(30, 500);
    const worte = text.split(' '), zeilen = []; let z = '';
    for (const w of worte) { const t = z ? z + ' ' + w : w; if (ctx.measureText(t).width > 1300 && z) { zeilen.push(z); z = w; } else z = t; }
    if (z) zeilen.push(z);
    const lh = 44, y0 = SH - 40 - zeilen.length * lh;
    zeilen.forEach((l, i) => {
      const w = ctx.measureText(l).width;
      ctx.fillStyle = 'rgba(5,8,18,0.8)';
      ctx.beginPath(); ctx.roundRect(SW / 2 - w / 2 - 16, y0 + i * lh, w + 32, lh, 6); ctx.fill();
      txt(ctx, l, SW / 2, y0 + i * lh + 32, F.sans(30, 500), '#f1f3fb', 'center');
    });
  };
  if (seg.typ === 'video') {
    S.T = seg.T; S.user = {};
    render();
    unten(BEATS[beatAt(seg.T)].text);
  } else if (seg.typ === 'quiz') {
    S.T = CH[seg.ci].end - 1e-3; S.user = {};
    render();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.fillStyle = 'rgba(6,9,20,0.82)'; ctx.fillRect(0, 0, SW, SH);
    const q = CH[seg.ci].quiz, x = 260, w = 1080;
    const antwort = seg.zeit >= seg.frageDauer;
    const a = ease(Math.min(seg.zeit / 0.5, 1));
    ctx.globalAlpha = a;
    card(ctx, x, 150, w, 600);
    txt(ctx, 'KURZE FRAGE ZU KAPITEL ' + seg.ci + ' · ' + CH[seg.ci].title.toUpperCase(), x + 44, 210, F.mono(20), COL.gold);
    const yq = wrapText(ctx, q.q, x + 44, 272, w - 88, 48, F.disp(38), COL.text);
    let y = yq + 40;
    q.opts.forEach((o, i) => {
      const richtig = antwort && i === q.a;
      ctx.fillStyle = richtig ? '#15392d' : '#1b2347';
      ctx.strokeStyle = richtig ? '#5fd39a' : '#2f3a6b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x + 44, y, w - 88, 62, 10); ctx.fill(); ctx.stroke();
      txt(ctx, String.fromCharCode(65 + i) + '   ' + o, x + 70, y + 41, F.sans(26, richtig ? 600 : 400), antwort && !richtig ? COL.dim : COL.text);
      y += 76;
    });
    if (!antwort) {
      const rest = Math.ceil(seg.frageDauer - seg.zeit);
      txt(ctx, 'Überlege kurz … Auflösung in ' + rest + ' s', x + 44, y + 40, F.sans(24, 400), COL.dim);
    } else {
      ctx.globalAlpha = a * ease(Math.min((seg.zeit - seg.frageDauer) / 0.5, 1));
      txt(ctx, 'Richtig ist ' + String.fromCharCode(65 + q.a) + '.', x + 44, y + 40, F.sans(26, 600), '#5fd39a');
      wrapText(ctx, q.why, x + 44, y + 80, w - 88, 34, F.sans(23, 400), COL.dim);
    }
    ctx.globalAlpha = 1;
  } else {
    S.T = total - 1e-3; S.user = {};
    render();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalAlpha = ease(Math.min(seg.zeit / 1, 1));
    ctx.fillStyle = 'rgba(6,9,20,0.95)'; ctx.fillRect(0, 0, SW, SH);
    txt(ctx, 'ENDE DES VIDEOS', SW / 2, 330, F.mono(22), COL.gold, 'center');
    txt(ctx, 'Die Vermutung ist seit 1859 offen.', SW / 2, 430, F.disp(56), COL.text, 'center');
    txt(ctx, 'Interaktive Fassung zum Selbstausprobieren: riemann_lernvideo.html', SW / 2, 520, F.sans(26, 400), COL.dim, 'center');
    ctx.globalAlpha = 1;
  }
  return cv.toDataURL('image/jpeg', 0.95);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: BREITE, height: HOEHE } });
  await page.goto('file://' + HTML);
  // Warten, bis Farbbild und Nullstellen berechnet sind
  await page.waitForFunction(() => typeof domDone !== 'undefined' && domDone === NCHUNK && ZEROS.length > 100, null, { timeout: 180000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(([w, h]) => {
    window.removeEventListener('resize', resize);
    S.playing = false; cv.width = w; cv.height = h;
    window.requestAnimationFrame = () => 0;   // Hauptschleife der Seite anhalten
  }, [BREITE, HOEHE]);
  await page.waitForTimeout(200);

  // Ablauf: Kapitel, danach jeweils die Quizfrage, am Schluss die Endkarte
  const kapitel = await page.evaluate(() => CH.map(c => ({ start: c.start, end: c.end, quiz: !!c.quiz })));
  const segs = [];
  kapitel.forEach((c, ci) => {
    for (let i = 0, n = Math.round((c.end - c.start) * FPS); i < n; i++) segs.push({ typ: 'video', T: c.start + i / FPS });
    if (c.quiz) for (let i = 0, n = (QUIZ_FRAGE + QUIZ_ANTWORT) * FPS; i < n; i++) segs.push({ typ: 'quiz', ci, zeit: i / FPS, frageDauer: QUIZ_FRAGE });
  });
  for (let i = 0; i < ENDE * FPS; i++) segs.push({ typ: 'ende', zeit: i / FPS });
  console.log(`${segs.length} Bilder (${(segs.length / FPS / 60).toFixed(1)} min) bei ${FPS} fps`);

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-crf', '24', '-preset', VORSCHAU ? 'veryfast' : 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', AUS],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const fertig = new Promise((ok, err) => ff.on('close', c => c === 0 ? ok() : err(new Error('ffmpeg Exit ' + c))));
  const schreib = buf => new Promise(ok => ff.stdin.write(buf) ? ok() : ff.stdin.once('drain', ok));

  const BATCH = 8;
  for (let i = 0; i < segs.length; i += BATCH) {
    const urls = await page.evaluate(([fn, batch]) => { const f = eval('(' + fn + ')'); return batch.map(f); }, [frameImBrowser.toString(), segs.slice(i, i + BATCH)]);
    for (const u of urls) await schreib(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
    if (i % (FPS * 30) < BATCH) process.stdout.write(`\r${Math.round(100 * i / segs.length)} %`);
  }
  ff.stdin.end();
  await fertig;
  await browser.close();
  console.log('\rfertig: ' + AUS);
})().catch(e => { console.error(e); process.exit(1); });
