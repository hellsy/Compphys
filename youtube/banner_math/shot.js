// Renders scene.html (served from this folder on port 8765) to scene_<w>.png
const {chromium} = require('playwright');
(async () => {
  const [w, h] = [+process.argv[2] || 1280, +process.argv[3] || 720];
  const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport: {width: w, height: h}});
  p.on('console', m => console.log('C:', m.text()));
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:8765/scene.html?w=${w}&h=${h}`);
  await p.waitForFunction(() => window.DONE, null, {timeout: 600000});
  await p.locator('canvas').screenshot({path: `${__dirname}/scene_${w}.png`});
  await b.close();
})();
