// node render.js [szenen...]  -> scene_N.mp4, danach film.mp4
const {chromium}=require('playwright');const {spawn,execFileSync}=require('child_process');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:720}});
p.on('pageerror',e=>{console.log('ERR',e.message);process.exit(1);});
await p.goto('file://'+__dirname+'/index_en.html');await p.evaluate(()=>document.fonts.ready);
const n=await p.evaluate(()=>scenes.length);const list=process.argv.length>2?process.argv.slice(2).map(Number):[...Array(n).keys()];
for(const si of list){const frames=await p.evaluate(si=>sceneFrames(si),si);const tmp=`scene_en_${si}.tmp.mp4`;const t0=Date.now();
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-crf','18','-preset','veryfast','-pix_fmt','yuv420p','-r','30',tmp]);
 const done=new Promise((res,rej)=>ff.on('exit',c=>c===0?res():rej(new Error('ffmpeg '+c))));ff.stderr.on('data',d=>process.stderr.write(d));
 for(let f=0;f<frames;f++){const d=await p.evaluate(([si,f])=>grab(si,f),[si,f]);if(!ff.stdin.write(Buffer.from(d.slice(23),'base64')))await new Promise(r=>ff.stdin.once('drain',r));}
 ff.stdin.end();await done;fs.renameSync(tmp,`scene_en_${si}.mp4`);console.log('scene',si,frames,'frames',((Date.now()-t0)/1000).toFixed(0)+'s');}
await b.close();
fs.writeFileSync('list_en.txt',[...Array(n).keys()].map(i=>`file 'scene_en_${i}.mp4'`).join('\n'));
execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i','list_en.txt','-c','copy','-movflags','+faststart','film_en.tmp.mp4']);
fs.renameSync('film_en.tmp.mp4','Parable-of-the-Apple.mp4');console.log('fertig');})();
