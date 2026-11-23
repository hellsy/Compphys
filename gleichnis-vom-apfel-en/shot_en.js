// node shot.js "scene:sec,scene:sec,..."  -> Standbilder
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:720}});
p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>console.log('LOG',m.text()));
await p.goto('file://'+__dirname+'/index_en.html');await p.evaluate(()=>document.fonts.ready);
for(const s of process.argv[2].split(',')){const [si,t]=s.split(':').map(Number);const t0=Date.now();
 const d=await p.evaluate(([si,t])=>grab(si,Math.round(t*30)),[si,t]);
 fs.writeFileSync(`prev_en_${si}_${t}.jpg`,Buffer.from(d.split(',')[1],'base64'));console.log(s,Date.now()-t0,'ms');}
console.log(await p.evaluate(()=>({total:total/30,iCross:iCross,n:gA.pts.length})));
await b.close();})();
