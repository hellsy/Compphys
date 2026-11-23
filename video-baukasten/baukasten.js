/* video-baukasten: rendert ein Drehbuch (Szenen + Sprechtext) als MP4 im Stil „visual journey“.

Aufruf:   node video-baukasten/baukasten.js pfad/zum/drehbuch.js
          VORSCHAU=1   → schneller Testlauf (10 fps, 960×540)
          STILLS=12,40 → nur Einzelbilder (STILLDIR=Ordner) statt eines Videos
          DUMP_BEATS=datei.json → nur die Sprechtexte ausgeben (für audio.py voice)

Neben dem Drehbuch werden gelesen bzw. geschrieben:
  <name>.narration.json   Längen der gesprochenen Sätze (von audio.py voice), verlängert die Szenen
  <name>.timeline.json    Zeitplan aller Sätze (für audio.py mix)
  <name>.mp4              das fertige Bild (ohne Ton; den Ton mischt audio.py mix dazu)
  tikz/*.tex              TikZ-Bilder, werden automatisch zu SVG übersetzt (im Drehbuch: tikz('name', …))

Benötigt: Node.js, Playwright mit Chromium, ffmpeg, npm install (three.js, MathJax), für TikZ: latex + dvisvgm
*/
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');

const BK = __dirname;
const DREHBUCH = path.resolve(process.argv[2] || path.join(BK, 'beispiel', 'beispiel.js'));
const NAME = DREHBUCH.replace(/\.js$/, '');
const VORSCHAU = process.env.VORSCHAU === '1';
const FPS = VORSCHAU ? 10 : 30;
const [BREITE, HOEHE] = VORSCHAU ? [960, 540] : [1920, 1080];
const NM = path.join(BK, 'node_modules');

function postprocessingBundle() {
  const ex = path.join(NM, 'three', 'examples', 'jsm');
  const teile = ['postprocessing/Pass.js', 'shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'shaders/BokehShader.js',
    'postprocessing/ShaderPass.js', 'postprocessing/MaskPass.js', 'postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js',
    'postprocessing/UnrealBloomPass.js', 'postprocessing/BokehPass.js', 'environments/RoomEnvironment.js'];
  let js = 'window.PP = {};\n';
  for (const t of teile) {
    let c = fs.readFileSync(path.join(ex, t), 'utf8');
    c = c.replace(/import\s*\{([^}]*)\}\s*from\s*'three';/g, 'const {$1} = THREE;')
         .replace(/import\s*\{([^}]*)\}\s*from\s*'[.][^']*';/g, 'const {$1} = PP;')
         .replace(/export\s*\{([^}]*)\};?/g, 'Object.assign(PP, {$1});');
    js += '{\n' + c + '\n}\n';
  }
  return js;
}

function tikzSvgs() {
  const dir = path.join(path.dirname(DREHBUCH), 'tikz'), out = {};
  if (!fs.existsSync(dir)) return out;
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'tikz-'));
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.tex'))) {
    const name = f.slice(0, -4);
    fs.copyFileSync(path.join(dir, f), path.join(tmp, f));
    execFileSync('latex', ['-interaction=nonstopmode', '-halt-on-error', f], { cwd: tmp, stdio: 'ignore' });
    execFileSync('dvisvgm', ['--no-fonts', '--exact', '-o', name + '.svg', name + '.dvi'], { cwd: tmp, stdio: 'ignore' });
    out[name] = fs.readFileSync(path.join(tmp, name + '.svg'), 'utf8');
  }
  return out;
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: BREITE, height: HOEHE } });
  page.on('pageerror', e => console.error('Seitenfehler:', e.message));
  await page.goto('file://' + path.join(BK, 'engine.html'));
  await page.evaluate(([w, h]) => { cv.width = w; cv.height = h; }, [BREITE, HOEHE]);
  await page.addScriptTag({ path: path.join(NM, 'three', 'build', 'three.min.js') });
  await page.addScriptTag({ content: postprocessingBundle() });
  await page.addScriptTag({ content: "window.MathJax = { svg: { fontCache: 'none' }, startup: { typeset: false } };" });
  await page.addScriptTag({ path: path.join(NM, 'mathjax', 'es5', 'tex-svg-full.js') });
  await page.waitForFunction(() => window.MathJax && MathJax.startup && MathJax.startup.promise, null, { timeout: 60000 });
  await page.evaluate(() => MathJax.startup.promise);
  await page.evaluate(t => { window.TIKZ = t; }, tikzSvgs());
  await page.evaluate(() => document.fonts.ready);
  await page.addScriptTag({ path: path.join(BK, 'lib.js') });
  await page.addScriptTag({ path: DREHBUCH });

  const narrFile = NAME + '.narration.json';
  const narr = fs.existsSync(narrFile) ? JSON.parse(fs.readFileSync(narrFile, 'utf8')).durations : null;
  const plan = await page.evaluate(n => VIDEO.init(n), narr);
  if (process.env.DUMP_BEATS) { fs.writeFileSync(process.env.DUMP_BEATS, JSON.stringify(plan.beats, null, 1)); console.log('Sprechtexte geschrieben'); await browser.close(); return; }
  fs.writeFileSync(NAME + '.timeline.json', JSON.stringify({ total: plan.total, beats: plan.beats }, null, 1));
  console.log(JSON.stringify(plan.szenen), `${plan.total.toFixed(1)} s`);

  if (process.env.STILLS) {
    const dir = process.env.STILLDIR || path.dirname(DREHBUCH);
    for (const t of process.env.STILLS.split(',').map(Number)) {
      const u = await page.evaluate(t => VIDEO.frame(t), t);
      fs.writeFileSync(path.join(dir, `still_${t}.jpg`), Buffer.from(u.split(',')[1], 'base64'));
    }
    await browser.close(); return;
  }
  const n = Math.round(plan.total * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-crf', '22', '-preset', VORSCHAU ? 'veryfast' : 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', NAME + '.mp4'],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, err) => ff.on('close', c => c === 0 ? ok() : err(new Error('ffmpeg ' + c))));
  const write = b => new Promise(ok => ff.stdin.write(b) ? ok() : ff.stdin.once('drain', ok));
  for (let i = 0; i < n; i += 8) {
    const ts = []; for (let j = i; j < Math.min(n, i + 8); j++) ts.push(j / FPS);
    for (const u of await page.evaluate(ts => ts.map(t => VIDEO.frame(t)), ts)) await write(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
    if (i % (FPS * 30) < 8) process.stdout.write(`\r${Math.round(100 * i / n)} %`);
  }
  ff.stdin.end(); await done; await browser.close();
  console.log('\rfertig: ' + NAME + '.mp4');
})().catch(e => { console.error(e); process.exit(1); });
