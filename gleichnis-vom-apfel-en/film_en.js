// Lernfilm "Das Gleichnis vom Apfel" (MTW, Gravitation, Kap. 1)
var W=1280,H=720,FPS=30;
var cv=document.getElementById('c'),ctx=cv.getContext('2d');
var COL={bg1:'#1d382e',bg2:'#152a22',chalk:'#f2eee3',dim:'rgba(242,238,227,0.62)',gold:'#ecc45c',blue:'#8fd6ec',red:'#b3262a',board:'#274a3d'};
var SERIF='"Bitstream Charter","GFS Baskerville",Georgia,serif',SANS='Inter,"DejaVu Sans",sans-serif';
function clamp(x,a,b){return x<a?a:x>b?b:x;}
function ss(a,b,x){x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x);}
function lerp(a,b,t){return a+(b-a)*t;}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function cam(az,el){var ca=Math.cos(az),sa=Math.sin(az),ce=Math.cos(el),se=Math.sin(el);return {c:[ce*ca,ce*sa,se],r:[-sa,ca,0],u:[-se*ca,-se*sa,ce],az:az,el:el};}

// ---------- Apfel: Raymarching in ein Offscreen-Bild ----------
var appleCache={};
function renderApple(C,S,SS){
  var key=[C.az.toFixed(4),C.el.toFixed(4),S,SS,G.P.D.toFixed(4)].join('|');
  if(appleCache[key])return appleCache[key];
  var R=1.16,pu=S*SS,N=Math.ceil(2*R*pu),oc=document.createElement('canvas');oc.width=oc.height=N;
  var o=oc.getContext('2d'),img=o.createImageData(N,N),d=img.data;
  var c=C.c,r=C.r,u=C.u,Rb=1.13,P=G.P;
  var L=[-0.45*r[0]+0.65*u[0]+0.62*c[0],-0.45*r[1]+0.65*u[1]+0.62*c[1],-0.45*r[2]+0.65*u[2]+0.62*c[2]];
  var ll=Math.hypot(L[0],L[1],L[2]);L=[L[0]/ll,L[1]/ll,L[2]/ll];
  var Hh=[L[0]+c[0],L[1]+c[1],L[2]+c[2]];ll=Math.hypot(Hh[0],Hh[1],Hh[2]);Hh=[Hh[0]/ll,Hh[1]/ll,Hh[2]/ll];
  var zb=G.rho(1),rimz=-9;for(var t=0;t<1.2;t+=0.01){var q=G.onSurf(t,0);if(q[2]>rimz)rimz=q[2];}
  for(var j=0;j<N;j++){var b=R-(j+0.5)/pu;for(var i=0;i<N;i++){
    var a=(i+0.5)/pu-R,rr=a*a+b*b;if(rr>Rb*Rb)continue;
    var t0=Math.sqrt(Rb*Rb-rr),tt=t0,hit=false,x,y,z;
    var ox=a*r[0]+b*u[0],oy=a*r[1]+b*u[1],oz=a*r[2]+b*u[2];
    for(var k=0;k<60;k++){x=ox+tt*c[0];y=oy+tt*c[1];z=oz+tt*c[2];
      var rad=Math.sqrt(x*x+y*y+z*z),ct=z/rad;
      var f=rad-(1+P.k*ct-P.D*Math.exp(-(1-ct)/P.w1)-P.B*Math.exp(-(1+ct)/P.w2));
      if(f<0.0015){hit=true;break;}
      tt-=f*0.6>0.002?f*0.6:0.002;if(tt<-t0)break;}
    if(!hit)continue;
    var n=G.normal(x,y,z),rad2=Math.sqrt(x*x+y*y+z*z),cth=z/rad2,ph=Math.atan2(y,x),th=Math.acos(cth);
    var streak=0.5+0.5*Math.sin(ph*13+3*Math.sin(th*5)+1.3*Math.sin(ph*5));
    var m=clamp(ss(0.55,1.0,cth)*0.85*(0.55+0.45*streak)+0.10*streak+ss(-0.75,-1,cth)*0.5,0,1);
    var cr=lerp(176,206,m),cg=lerp(28,186,m),cb=lerp(34,84,m);
    var df=Math.max(0,dot(n,L)),sp=0.5*Math.pow(Math.max(0,dot(n,Hh)),60);
    var ao=1-0.55*(P.D/0.40)*clamp((rimz-z)/0.25,0,1)*ss(0.86,0.93,cth);
    var rim=Math.pow(1-Math.max(0,dot(n,c)),2.2);
    var sh=(0.30+0.78*df)*ao*(1-0.35*rim);
    var p=4*(j*N+i);d[p]=clamp(cr*sh+235*sp*ao,0,255);d[p+1]=clamp(cg*sh+225*sp*ao,0,255);d[p+2]=clamp(cb*sh+205*sp*ao,0,255);d[p+3]=255;
  }}
  o.putImageData(img,0,0);
  var res={cv:oc,N:N,R:R,S:S,SS:SS};
  var keys=Object.keys(appleCache);if(keys.length>6)delete appleCache[keys[0]];
  appleCache[key]=res;return res;
}
// View: Kamera + Bildlage
function View(C,cx,cy,S){this.C=C;this.cx=cx;this.cy=cy;this.S=S;}
View.prototype.proj=function(p){return [this.cx+this.S*dot(p,this.C.r),this.cy-this.S*dot(p,this.C.u)];};
View.prototype.vis=function(p,n){var c=this.C.c;if(n&&dot(n,c)<0.03)return false;
  var x=p[0]+(n?n[0]*0.012:0),y=p[1]+(n?n[1]*0.012:0),z=p[2]+(n?n[2]*0.012:0);
  for(var t=0.02;t<1.6;t+=0.025){if(G.F(x+c[0]*t,y+c[1]*t,z+c[2]*t)<0)return false;}return true;};
View.prototype.drawApple=function(alpha){var a=renderApple(this.C,this.S,2);var w=2*a.R*this.S;
  // Schatten
  ctx.save();ctx.globalAlpha=(alpha==null?1:alpha)*0.35;ctx.fillStyle='#0a1612';ctx.beginPath();
  ctx.ellipse(this.cx+18,this.cy+this.S*(0.98*Math.cos(this.C.el)+0.12),this.S*0.95,this.S*(0.16+0.5*Math.sin(this.C.el)*0.5),0,0,7);ctx.filter='blur(14px)';ctx.fill();ctx.restore();
  ctx.save();if(alpha!=null)ctx.globalAlpha=alpha;ctx.imageSmoothingQuality='high';ctx.drawImage(a.cv,this.cx-w/2,this.cy-w/2,w,w);ctx.restore();};
View.prototype.drawStem=function(scale){scale=scale==null?1:scale;if(scale<0.02)return;
  var zb=G.rho(1),n=40,prev=null,pv=false;ctx.save();ctx.lineCap='round';
  for(var pass=0;pass<2;pass++){prev=null;for(var i=0;i<=n;i++){var s=i/n*scale,h=0.72*s;
    var p=[0.10*s*s,0.05*s*s,zb-0.02+h];var q=this.proj(p),v=this.vis(p,null);
    if(prev&&v&&pv){ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(q[0],q[1]);
      ctx.strokeStyle=pass?'#8a6238':'#3d2714';ctx.lineWidth=(pass?0.030:0.048)*this.S*(1-0.25*s/scale*0)+0;ctx.stroke();}
    prev=q;pv=v;}}
  ctx.restore();};
// Spur auf der Schale
View.prototype.path=function(g,i0,i1,color,lw,hiddenAlpha){
  i0=Math.max(0,Math.floor(i0));i1=Math.min(g.pts.length-1,Math.floor(i1));if(i1<=i0)return;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.lineWidth=lw;
  var step=3,run=[],rv=null;var self=this;
  function flush(){if(run.length<2){run=[];return;}ctx.beginPath();ctx.moveTo(run[0][0],run[0][1]);for(var k=1;k<run.length;k++)ctx.lineTo(run[k][0],run[k][1]);
    if(rv){ctx.globalAlpha=1;ctx.setLineDash([]);}else{ctx.globalAlpha=hiddenAlpha==null?0.22:hiddenAlpha;ctx.setLineDash([5,7]);}
    if(rv||hiddenAlpha!==0)ctx.stroke();run=[];}
  for(var i=i0;i<=i1;i+=step){var ii=Math.min(i,i1),v=self.vis(g.pts[ii],g.nrm[ii]),q=self.proj(g.pts[ii]);
    if(rv===null)rv=v;if(v!==rv){run.push(q);flush();rv=v;}run.push(q);if(ii===i1)break;}
  if(run.length&&run[run.length-1]!==undefined){var qq=self.proj(g.pts[i1]);run.push(qq);}flush();ctx.restore();};
View.prototype.antAt=function(g,fi,phase,sc){var i=clamp(Math.round(fi),0,g.pts.length-1);
  if(!this.vis(g.pts[i],g.nrm[i]))return null;var q=this.proj(g.pts[i]),t=g.tan[i];
  var ang=Math.atan2(-dot(t,this.C.u),dot(t,this.C.r));drawAnt(q[0],q[1],ang,sc||1.35,phase);return q;};
function drawAnt(x,y,ang,sc,phase,col){col=col||'#140d08';ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.scale(sc,sc);
  ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=1.2;ctx.lineCap='round';ctx.lineJoin='round';
  for(var k=-1;k<=1;k++)for(var s=-1;s<=1;s+=2){var w=Math.sin(phase+k*2.1+(s>0?0:Math.PI))*2.6;
    ctx.beginPath();ctx.moveTo(k*2.5,0);ctx.lineTo(k*4.5+w,s*6.5);ctx.lineTo(k*6+w*1.6,s*10.5);ctx.stroke();}
  for(var s2=-1;s2<=1;s2+=2){ctx.beginPath();ctx.moveTo(8.5,s2*1);ctx.quadraticCurveTo(12,s2*3,15,s2*5.5);ctx.stroke();}
  ctx.beginPath();ctx.ellipse(-8.5,0,6.2,4.2,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(0,0,3.6,2.9,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(7,0,3.2,3,0,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.28)';ctx.beginPath();ctx.ellipse(-9.5,-1.3,2.6,1.2,0,0,7);ctx.fill();
  ctx.restore();}

// ---------- Text / Rahmen ----------
function bg(){var g=ctx.createRadialGradient(W*0.45,H*0.4,80,W*0.5,H*0.5,820);g.addColorStop(0,COL.bg1);g.addColorStop(1,COL.bg2);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // Kreidestaub
  ctx.save();ctx.globalAlpha=0.05;ctx.fillStyle=COL.chalk;var s=7;for(var i=0;i<260;i++){s=(s*16807)%2147483647;var x=s%W;s=(s*16807)%2147483647;var y=s%H;ctx.fillRect(x,y,2+(i%3),1);}ctx.restore();}
function wrap(text,maxW){var out=[];text.split('\n').forEach(function(par){var words=par.split(' '),line='';words.forEach(function(w){var t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w;}else line=t;});out.push(line);});return out;}
function text(t,x,y,o){o=o||{};ctx.save();ctx.font=(o.weight||400)+' '+(o.size||28)+'px '+(o.font||SANS);ctx.fillStyle=o.color||COL.chalk;ctx.globalAlpha=o.alpha==null?1:o.alpha;ctx.textAlign=o.align||'left';ctx.textBaseline=o.base||'alphabetic';
  var lines=o.maxW?wrap(t,o.maxW):t.split('\n'),lh=o.lh||(o.size||28)*1.32;for(var i=0;i<lines.length;i++)ctx.fillText(lines[i],x,y+i*lh);ctx.restore();return lines.length;}
function heading(par,title,a){text(par,56,62,{size:22,weight:600,color:COL.gold,alpha:a});text(title,56+ctx_measure(par,22,600)+16,62,{size:22,weight:400,color:COL.dim,alpha:a});}
function ctx_measure(t,size,weight){ctx.save();ctx.font=weight+' '+size+'px '+SANS;var w=ctx.measureText(t).width;ctx.restore();return w;}
// Untertitel: Ein-/Ausblenden innerhalb [t0,t1]
function caption(t,u,t0,t1){var a=ss(t0,t0+0.5,u)*(1-ss(t1-0.45,t1,u));if(a<=0)return;
  ctx.save();ctx.globalAlpha=a*0.5;ctx.fillStyle='#0d1c17';ctx.fillRect(0,566,W,154);ctx.restore();
  ctx.save();ctx.globalAlpha=a;ctx.fillStyle=COL.gold;ctx.fillRect(56,596,4,84);ctx.restore();
  text(t,82,626,{size:30,maxW:1130,lh:44,alpha:a,weight:400});}
function arrow(x0,y0,x1,y1,color,lw,dash){ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=lw||3;ctx.lineCap='round';if(dash)ctx.setLineDash(dash);
  var a=Math.atan2(y1-y0,x1-x0),h=11+(lw||3);ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1-Math.cos(a)*h*0.7,y1-Math.sin(a)*h*0.7);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x1-Math.cos(a-0.42)*h,y1-Math.sin(a-0.42)*h);ctx.lineTo(x1-Math.cos(a+0.42)*h,y1-Math.sin(a+0.42)*h);ctx.closePath();ctx.fill();ctx.restore();}

// ---------- Geometrie der Szenen ----------
var D0=0.40,DELTA=9.6*Math.PI/180,TH_P=1.35;
var CAM_SIDE=cam(0,0.30),CAM_TOP=cam(0,1.12);
var gTrack=G.launch(1.80,-1.02,1.18,2.0);           // Szene 1/2: einzelne Spur
var gA=G.launch(TH_P,0,DELTA,2.55),gB=G.launch(TH_P,0,-DELTA,2.55);
function crossIndex(g){for(var i=60;i<g.pts.length;i++){if(g.pts[i-1][1]*g.pts[i][1]<=0)return i;}return g.pts.length-1;}
var iCross=crossIndex(gA);
var AX=430,AY=318,AS=232;

// ---------- Szenen ----------
var scenes=[];
function add(dur,draw){scenes.push({dur:dur,draw:draw});}

// 0 Titel
add(4.5,function(u){var a=ss(0.2,1.0,u);
  text('The Parable of the Apple',W/2,300,{font:SERIF,size:74,align:'center',alpha:a});
  ctx.save();ctx.globalAlpha=ss(0.7,1.4,u);ctx.fillStyle=COL.gold;ctx.fillRect(W/2-60,338,120,3);ctx.restore();
  text('How geometry becomes gravitation',W/2,400,{size:32,align:'center',alpha:ss(0.9,1.7,u),color:COL.chalk});
  text('after Misner · Thorne · Wheeler, “Gravitation”, Chapter 1',W/2,640,{size:22,align:'center',alpha:ss(1.3,2.1,u),color:COL.dim});
  var g=gTrack,q=clamp((u-0.3)/4.2,0,1);drawAnt(lerp(300,980,q),500,0,1.7,u*22,COL.chalk);
  ctx.save();ctx.strokeStyle=COL.gold;ctx.globalAlpha=0.7;ctx.lineWidth=2.5;ctx.setLineDash([2,9]);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(300,500);ctx.lineTo(lerp(300,980,q)-26,500);ctx.stroke();ctx.restore();
});

// 1 Eine Ameise, eine Spur
add(9,function(u){var V=new View(CAM_SIDE,AX,AY,AS);heading('§ 1.1','The parable of the apple',1);
  V.drawApple();V.drawStem();var n=gTrack.pts.length-1,q=ss(1.0,7.6,u)*0.0+clamp((u-1.0)/6.6,0,1),fi=q*n;
  V.path(gTrack,0,fi,COL.gold,4);V.antAt(gTrack,fi,u*24);
  text('A student lies under an apple tree.\nAn apple falls, and ants are\ncrawling over its skin.',800,230,{size:27,lh:40,alpha:ss(0.3,1.1,u)*(1-ss(4.2,4.8,u)),color:COL.chalk});
  text('He wonders:\nBy what rule\ndoes an ant navigate?',800,230,{size:27,lh:40,alpha:ss(4.9,5.6,u),color:COL.chalk});
  caption('The ant walks across the skin and veers neither to the left nor to the right.',u,1.2,9);
});

// 2 Streifen abschälen
add(14,function(u){var V=new View(CAM_SIDE,AX,AY,AS);heading('§ 1.1','The parable of the apple',1);
  var g=gTrack,n=g.pts.length-1,L=n*g.ds,w=0.05,step=4;
  V.drawApple();V.drawStem();
  // Buch
  var bx=700,by=150,bw=524,bh=300,ba=ss(2.2,3.2,u);
  ctx.save();ctx.globalAlpha=ba;ctx.fillStyle='#e9e2cf';ctx.beginPath();ctx.roundRect(bx,by,bw,bh,6);ctx.fill();ctx.fillStyle='rgba(60,50,30,0.16)';
  for(var k=0;k<9;k++){if(k>3&&k<6)continue;ctx.fillRect(bx+34,by+38+k*26,bw-68-(k%3)*46,3);}
  ctx.fillStyle='rgba(60,50,30,0.25)';ctx.fillRect(bx+bw/2-1,by,2,bh);ctx.restore();
  var T=clamp((u-3.4)/5.2,0,1),fx=bx+bw/2,fy=by+bh/2+8;
  function edge(i,sgn){var p=g.pts[i],nn=g.nrm[i],t=g.tan[i],b=cross(nn,t);return [p[0]+sgn*w*b[0],p[1]+sgn*w*b[1],p[2]+sgn*w*b[2]];}
  function qOf(i){return ss(0,1,clamp(T*1.7-(i/n)*0.7,0,1));}
  function pos(i,sgn){var a=V.proj(edge(i,sgn)),s=i*g.ds,q=qOf(i);var fl=[fx+(s-L/2)*AS,fy-sgn*w*AS];
    return [lerp(a[0],fl[0],q),lerp(a[1],fl[1],q)-Math.sin(Math.PI*q)*70];}
  // Narbe auf dem Apfel
  ctx.save();for(var i=0;i<n;i+=step){var i2=Math.min(n,i+step),q=qOf(i);if(q<=0.01)continue;
    var a=V.proj(edge(i,1)),b=V.proj(edge(i2,1)),c=V.proj(edge(i2,-1)),d=V.proj(edge(i,-1));
    ctx.globalAlpha=Math.min(1,q*3);ctx.fillStyle='#f0e3b4';ctx.strokeStyle='#f0e3b4';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);ctx.closePath();ctx.fill();ctx.stroke();}ctx.restore();
  // Spur + Schnitte auf dem Apfel (solange noch nicht abgeschält)
  var cut=clamp((u-0.5)/2.2,0,1);
  ctx.save();ctx.lineCap='round';
  for(var i=0;i<n;i+=step){var i2=Math.min(n,i+step);if(qOf(i)>0.01)continue;
    var m0=V.proj(g.pts[i]),m1=V.proj(g.pts[i2]);ctx.strokeStyle=COL.gold;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(m0[0],m0[1]);ctx.lineTo(m1[0],m1[1]);ctx.stroke();
    if(i/n<cut){for(var s=-1;s<=1;s+=2){var e0=V.proj(edge(i,s)),e1=V.proj(edge(i2,s));ctx.strokeStyle='rgba(255,250,235,0.95)';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(e0[0],e0[1]);ctx.lineTo(e1[0],e1[1]);ctx.stroke();}}}
  ctx.restore();
  // Der Streifen selbst
  if(T>0){ctx.save();for(var i=0;i<n;i+=step){var i2=Math.min(n,i+step);if(qOf(i)<=0.01)continue;
    var a=pos(i,1),b=pos(i2,1),c=pos(i2,-1),d=pos(i,-1);
    ctx.fillStyle='#b3262a';ctx.strokeStyle='#b3262a';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);ctx.closePath();ctx.fill();ctx.stroke();}
    ctx.strokeStyle=COL.gold;ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();var started=false;
    for(var i=0;i<=n;i+=step){if(qOf(i)<=0.01)continue;var a=pos(i,1),d=pos(i,-1),mx=(a[0]+d[0])/2,my=(a[1]+d[1])/2;if(!started){ctx.moveTo(mx,my);started=true;}else ctx.lineTo(mx,my);}
    ctx.stroke();ctx.restore();}
  // Lineal-Vergleich
  var ra=ss(9.6,10.6,u);if(ra>0){ctx.save();ctx.globalAlpha=ra;ctx.strokeStyle='#3b3324';ctx.lineWidth=1.5;ctx.setLineDash([7,6]);var x0=fx-L/2*AS-14,x1=fx+L/2*AS+14;
    ctx.beginPath();ctx.moveTo(x0,fy+26);ctx.lineTo(lerp(x0,x1,ss(9.6,11.2,u)),fy+26);ctx.stroke();ctx.restore();
    text('straight as a laser beam',fx,fy+62,{size:21,align:'center',color:'#3b3324',alpha:ss(10.6,11.4,u),weight:500});}
  text('Geodesic',fx,by+bh+52,{font:SERIF,size:40,align:'center',color:COL.gold,alpha:ss(10.8,11.8,u)});
  text('the straightest possible line on a surface',fx,by+bh+88,{size:22,align:'center',color:COL.dim,alpha:ss(11.2,12.2,u)});
  caption('With a knife he cuts out a narrow strip of skin: one cut just above the track, one just below it.',u,0.3,6.2);
  caption('Laid flat on the book, the track is perfectly straight. Any zigzag or bend would only have made the path longer.',u,6.4,14);
});

// 3 Zwei Ameisen, die Mulde
function twoAnts(V,fi,u,withAnts){V.path(gA,0,fi,COL.gold,4);V.path(gB,0,fi,COL.blue,4);
  if(withAnts){V.antAt(gA,fi,u*24);V.antAt(gB,fi,u*24+1.7);}}
function markP(V,a){var p=V.proj(gA.pts[0]);ctx.save();ctx.globalAlpha=a;ctx.fillStyle=COL.chalk;ctx.beginPath();ctx.arc(p[0],p[1],6,0,7);ctx.fill();ctx.restore();
  text('P',p[0]-34,p[1]+10,{font:SERIF,size:32,alpha:a,weight:700});}
add(16,function(u){var e=ss(0.4,3.0,u),C=e<=0?CAM_SIDE:(e>=1?CAM_TOP:cam(0,lerp(0.30,1.12,e)));
  var V=new View(C,AX,AY,AS);heading('§ 1.1','The parable of the apple',1);V.drawApple();
  var n=gA.pts.length-1,q=clamp((u-4.0)/8.0,0,1),fi=q*n;
  markP(V,ss(2.9,3.6,u));twoAnts(V,fi,u,u>3.6);V.drawStem();
  if(fi>iCross+6){var x=V.proj(gA.pts[iCross]),a=ss(0,0.6,(fi-iCross)*gA.ds*4);ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=COL.chalk;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x[0],x[1],17,0,7);ctx.stroke();ctx.restore();}
  text('Looking down at an angle\ninto the dimple at the stem',800,200,{size:25,lh:37,alpha:ss(2.6,3.4,u)*(1-ss(6.6,7.2,u)),color:COL.dim});
  text('The tracks cross',800,200,{size:28,alpha:ss(12.2,13,u),weight:600});
  text('and then carry on in completely\ndifferent directions.',800,240,{size:25,lh:37,alpha:ss(12.6,13.4,u),color:COL.dim});
  caption('Two ants start at the same point P, heading in only slightly different directions.',u,3.0,7.4);
  caption('Their paths run through the dimple, one passing left of the stem, one right. Each walks along its strip of skin as straight as it possibly can.',u,7.6,16);
});

// 4 Newton / Einstein
add(15,function(u){var V=new View(CAM_TOP,AX,AY,AS);heading('§ 1.1','Two ways to tell the same story',1);V.drawApple();
  var n=gA.pts.length-1;twoAnts(V,n,u,false);V.drawStem();markP(V,1);
  var na=ss(0.6,1.4,u)*(1-ss(6.6,7.3,u));
  if(na>0){var tip=V.proj([0.03,0.015,G.rho(1)+0.35]);ctx.save();ctx.globalAlpha=na;
    [[gA,0.36],[gA,0.50],[gB,0.36],[gB,0.50]].forEach(function(o){var i=Math.round(o[1]*n),p=V.proj(o[0].pts[i]);var dx=tip[0]-p[0],dy=tip[1]-p[1],l=Math.hypot(dx,dy),k=Math.min(l-22,46+10*Math.sin(u*3));
      arrow(p[0],p[1],p[0]+dx/l*k,p[1]+dy/l*k,COL.chalk,3);});ctx.restore();
    text('Newton',800,170,{font:SERIF,size:46,alpha:na,color:COL.chalk});
    text('action at a distance',800,212,{size:24,alpha:na,color:COL.gold,weight:600});
    text('It looks as if the stem were\npulling the ants towards it\nfrom a distance.',800,262,{size:25,lh:37,alpha:na,maxW:400});}
  var ea=ss(7.2,8.0,u);
  if(ea>0){var q=clamp((u-8.0)/6.5,0,1),fi=lerp(0.18,0.62,q)*n,i=Math.round(fi),p=V.proj(gA.pts[i]);
    var lx=990,ly=330,lr=118;
    ctx.save();ctx.globalAlpha=ea;ctx.strokeStyle=COL.chalk;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p[0],p[1],24,0,7);ctx.stroke();
    ctx.globalAlpha=ea*0.5;ctx.lineWidth=1.5;var an=Math.atan2(ly-p[1],lx-p[0]);
    ctx.beginPath();ctx.moveTo(p[0]+24*Math.cos(an-1.2),p[1]+24*Math.sin(an-1.2));ctx.lineTo(lx+lr*Math.cos(an-1.57),ly+lr*Math.sin(an-1.57));
    ctx.moveTo(p[0]+24*Math.cos(an+1.2),p[1]+24*Math.sin(an+1.2));ctx.lineTo(lx+lr*Math.cos(an+1.57),ly+lr*Math.sin(an+1.57));ctx.stroke();ctx.restore();
    // Lupe: lokal flaches Stück Schale
    ctx.save();ctx.globalAlpha=ea;ctx.beginPath();ctx.arc(lx,ly,lr,0,7);ctx.clip();
    var gr=ctx.createLinearGradient(lx-lr,ly-lr,lx+lr,ly+lr);gr.addColorStop(0,'#c23a34');gr.addColorStop(1,'#96201f');ctx.fillStyle=gr;ctx.fillRect(lx-lr,ly-lr,2*lr,2*lr);
    ctx.fillStyle='rgba(240,220,150,0.16)';var off=(u*38)%34;for(var k=-6;k<8;k++){ctx.fillRect(lx-lr+k*34-off,ly-lr,3,2*lr);}
    ctx.strokeStyle=COL.gold;ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(lx-lr,ly);ctx.lineTo(lx-18,ly);ctx.stroke();
    drawAnt(lx,ly,0,3.3,u*24);ctx.restore();
    ctx.save();ctx.globalAlpha=ea;ctx.strokeStyle=COL.chalk;ctx.lineWidth=6;ctx.beginPath();ctx.arc(lx,ly,lr,0,7);ctx.stroke();
    ctx.lineWidth=10;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(lx+lr*0.72,ly+lr*0.72);ctx.lineTo(lx+lr*0.72+52,ly+lr*0.72+52);ctx.stroke();ctx.restore();
    V.antAt(gA,fi,u*24,1.1);
    text('Einstein',800,118,{font:SERIF,size:46,alpha:ea});text('local action',800,160,{size:24,alpha:ea,color:COL.gold,weight:600});
    text('Under the lens the skin is flat,\nthe track straight.',800,492,{size:24,lh:35,alpha:ss(8.6,9.4,u),maxW:420});}
  caption('Newton would have said: the stem gives off a force that acts across the distance.',u,0.6,7.0);
  caption('Einstein: the ant takes its marching orders only from the geometry right under its feet. Physics is simple only locally.',u,7.4,15);
});

// 5 Übersetzung
add(11,function(u){heading('§ 1.1','The parable translated (after Fig. 1.1)',1);
  var V=new View(CAM_TOP,225,330,150);V.drawApple();twoAnts(V,gA.pts.length-1,u,false);V.drawStem();
  var rows=[['Apple skin','Spacetime'],['Track of an ant','World line of a free particle'],['under the lens: flat','locally, special relativity holds'],['Dimple','Curvature of spacetime'],['Stem','Mass']];
  text('in the parable',460,150,{size:20,color:COL.dim,weight:600});text('in physics',812,150,{size:20,color:COL.dim,weight:600});
  ctx.save();ctx.fillStyle='rgba(242,238,227,0.25)';ctx.fillRect(460,166,780,1.5);ctx.restore();
  rows.forEach(function(r,i){var a=ss(0.6+i*1.5,1.3+i*1.5,u),y=218+i*72;
    text(r[0],460,y,{size:27,alpha:a});arrow(760,y-9,796,y-9,COL.gold,2.5);ctx.save();ctx.restore();
    text(r[1],812,y,{size:27,alpha:a,color:COL.gold,weight:500});
    ctx.save();ctx.globalAlpha=(1-a);ctx.fillStyle=COL.bg1;ctx.fillRect(752,y-26,52,34);ctx.restore();});
  caption('The apple’s skin has two dimensions, spacetime has four. The idea is the same.',u,8.0,11);
});

// 6 Krümmung messen
add(16,function(u){heading('§ 1.6','Curvature',1);
  var q=clamp((u-4.0)/7.5,0,1);
  // flach
  var px=330,py=300;ctx.save();ctx.translate(px,py);ctx.transform(1,0,-0.55,0.62,0,0);
  ctx.fillStyle='rgba(242,238,227,0.07)';ctx.fillRect(-200,-190,400,380);ctx.strokeStyle='rgba(242,238,227,0.22)';ctx.lineWidth=1.2;
  for(var k=-200;k<=200;k+=50){ctx.beginPath();ctx.moveTo(k,-190);ctx.lineTo(k,190);ctx.stroke();}for(var k2=-190;k2<=190;k2+=47.5){ctx.beginPath();ctx.moveTo(-200,k2);ctx.lineTo(200,k2);ctx.stroke();}
  var y0=170,y1=lerp(170,-170,q);ctx.lineCap='round';ctx.lineWidth=5;
  ctx.strokeStyle=COL.gold;ctx.beginPath();ctx.moveTo(-32,y0);ctx.lineTo(-32,y1);ctx.stroke();ctx.strokeStyle=COL.blue;ctx.beginPath();ctx.moveTo(32,y0);ctx.lineTo(32,y1);ctx.stroke();
  ctx.strokeStyle=COL.chalk;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-32,y1);ctx.lineTo(32,y1);ctx.stroke();
  ctx.fillStyle=COL.gold;ctx.beginPath();ctx.arc(-32,y1,8,0,7);ctx.fill();ctx.fillStyle=COL.blue;ctx.beginPath();ctx.arc(32,y1,8,0,7);ctx.fill();ctx.restore();
  text('flat surface',px,108,{size:26,align:'center',weight:600});
  // Kugel
  var sx=950,sy=305,sr=165,C=cam(0,0.42);
  var gr=ctx.createRadialGradient(sx-55,sy-65,10,sx,sy,sr);gr.addColorStop(0,'#5b8576');gr.addColorStop(1,'#2a4e41');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(sx,sy,sr,0,7);ctx.fill();
  function sp(th,ph){var p=[Math.sin(th)*Math.cos(ph),Math.sin(th)*Math.sin(ph),Math.cos(th)];return {x:sx+sr*dot(p,C.r),y:sy-sr*dot(p,C.u),v:dot(p,C.c)>0};}
  function curve(f,a,b,col,lw){ctx.save();ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.lineCap='round';var on=false;ctx.beginPath();for(var i=0;i<=80;i++){var t=lerp(a,b,i/80),s=f(t);if(s.v){if(!on){ctx.moveTo(s.x,s.y);on=true;}else ctx.lineTo(s.x,s.y);}else on=false;}ctx.stroke();ctx.restore();}
  for(var m=-5;m<=5;m++){(function(ph){curve(function(t){return sp(t,ph);},0.001,Math.PI-0.001,'rgba(242,238,227,0.16)',1.2);})(m*0.314);}
  [0.52,1.05,1.571,2.09].forEach(function(th){curve(function(t){return sp(th,t);},-1.6,1.6,'rgba(242,238,227,0.16)',1.2);});
  var dph=0.19,thE=1.571,th1=lerp(thE,0.0,q);
  curve(function(t){return sp(t,-dph);},thE,th1,COL.gold,5);curve(function(t){return sp(t,dph);},thE,th1,COL.blue,5);
  var a=sp(th1,-dph),b=sp(th1,dph);ctx.save();ctx.strokeStyle=COL.chalk;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  ctx.fillStyle=COL.gold;ctx.beginPath();ctx.arc(a.x,a.y,8,0,7);ctx.fill();ctx.fillStyle=COL.blue;ctx.beginPath();ctx.arc(b.x,b.y,8,0,7);ctx.fill();ctx.restore();
  text('curved surface',sx,108,{size:26,align:'center',weight:600});
  // Abstands-Diagramme
  function graph(gx,fn,label){var gy=530,gw=300,gh=62,ga=ss(3.2,4.0,u);ctx.save();ctx.globalAlpha=ga;ctx.strokeStyle='rgba(242,238,227,0.5)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(gx,gy-gh-8);ctx.lineTo(gx,gy);ctx.lineTo(gx+gw+8,gy);ctx.stroke();
    ctx.strokeStyle=COL.chalk;ctx.lineWidth=3.5;ctx.lineCap='round';ctx.beginPath();for(var i=0;i<=60;i++){var t=i/60*q;var X=gx+t*gw,Y=gy-gh*fn(t);if(i==0)ctx.moveTo(X,Y);else ctx.lineTo(X,Y);}ctx.stroke();ctx.restore();
    text('separation',gx-10,gy-gh-16,{size:17,color:COL.dim,alpha:ga});text('distance travelled',gx+gw+8,gy+24,{size:17,color:COL.dim,alpha:ga,align:'right'});
}
  graph(180,function(t){return 0.8;});
  graph(800,function(t){return 0.8*Math.sin(lerp(thE,0,t));});
  text('stays the same',330,596,{size:22,align:'center',color:COL.gold,alpha:ss(11.3,12,u),weight:600});
  text('shrinks faster and faster',950,596,{size:22,align:'center',color:COL.gold,alpha:ss(11.3,12,u),weight:600});
  caption('A single track reveals nothing about curvature, because locally every track looks straight. You need two neighbouring tracks and their separation.',u,0.4,7.8);
  if(u>12.4){ctx.save();ctx.globalAlpha=ss(12.4,12.9,u);ctx.fillStyle=COL.bg2;ctx.fillRect(0,566,W,154);ctx.restore();}
  caption('If two initially parallel geodesics move towards each other, the surface is curved. This measure is called geodesic deviation.',u,12.4,16);
});

// 7 Raumschiff
add(15,function(u){heading('§ 1.6','The same in the real world',1);
  // Erde
  var ex=640,ey=1592,er=1080;var gr=ctx.createRadialGradient(ex,ey-er,40,ex,ey,er);gr.addColorStop(0,'#3d7fa8');gr.addColorStop(0.25,'#2b5f84');gr.addColorStop(1,'#1c3f5c');
  ctx.fillStyle=gr;ctx.beginPath();ctx.arc(ex,ey,er,0,7);ctx.fill();ctx.save();ctx.strokeStyle='rgba(160,215,240,0.35)';ctx.lineWidth=6;ctx.beginPath();ctx.arc(ex,ey,er+3,0,7);ctx.stroke();ctx.restore();
  text('Earth',ex,552,{size:22,align:'center',color:'rgba(220,240,250,0.8)',weight:600});
  // Raumschiff
  var cx=640,cy=285,w=470,h=300;ctx.save();ctx.fillStyle='rgba(242,238,227,0.06)';ctx.strokeStyle=COL.chalk;ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(cx-w/2,cy-h/2,w,h,70);ctx.fill();ctx.stroke();
  ctx.lineWidth=2;ctx.strokeStyle='rgba(242,238,227,0.35)';ctx.beginPath();ctx.roundRect(cx-w/2+14,cy-h/2+14,w-28,h-28,58);ctx.stroke();ctx.restore();
  ctx.save();ctx.strokeStyle='rgba(242,238,227,0.25)';ctx.setLineDash([4,8]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,cy+h/2+6);ctx.lineTo(cx,506);ctx.stroke();ctx.restore();
  text('to Earth’s centre',cx+14,478,{size:17,color:COL.dim});
  var q=clamp((u-6.0)/7.0,0,1),k=q*q;var d1=44*(1+1.6*k),d2=120*(1-0.8*k);
  function dotp(x,y,col){ctx.save();ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,11,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.35)';ctx.beginPath();ctx.arc(x-3,y-3,4,0,7);ctx.fill();ctx.restore();}
  ctx.save();ctx.strokeStyle='rgba(242,238,227,0.3)';ctx.lineWidth=1.5;ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(cx,cy-44);ctx.lineTo(cx,cy+44);ctx.moveTo(cx-120,cy);ctx.lineTo(cx+120,cy);ctx.stroke();ctx.restore();
  dotp(cx,cy-d1,COL.gold);dotp(cx,cy+d1,COL.gold);dotp(cx-d2,cy,COL.blue);dotp(cx+d2,cy,COL.blue);
  var aa=ss(8.0,9.0,u);if(aa>0){ctx.save();ctx.globalAlpha=aa;arrow(cx+26,cy-d1+8,cx+26,cy-d1-30,COL.gold,3);arrow(cx+26,cy+d1-8,cx+26,cy+d1+30,COL.gold,3);
    arrow(cx-d2+8,cy-26,cx-d2+44,cy-26,COL.blue,3);arrow(cx+d2-8,cy-26,cx+d2-44,cy-26,COL.blue,3);ctx.restore();
    text('one above the other:\ndrift apart',130,250,{size:23,lh:33,color:COL.gold,alpha:aa,weight:500});
    text('side by side:\ndrift together',915,250,{size:23,lh:33,color:COL.blue,alpha:aa,weight:500});}
  text('Spaceship in free fall, test particles floating inside',cx,112,{size:22,align:'center',color:COL.dim});
  caption('In the freely falling spaceship, test particles float free of any force. At first glance: no trace of gravity.',u,0.4,6.4);
  caption('Measure precisely enough and the separations change at an accelerating rate. Newton calls it a tidal effect, Einstein spacetime curvature.',u,6.6,15);
});

// 8 Materie krümmt Geometrie
add(13,function(u){var e=ss(1.6,7.0,u);G.P.D=D0*e;var V=new View(CAM_TOP,AX,AY,AS);heading('§ 1.7','Matter acts back',1);
  V.drawApple();var a=G.launch(TH_P,0,DELTA,2.55,0.006),b=G.launch(TH_P,0,-DELTA,2.55,0.006);
  V.path(a,0,a.pts.length-1,COL.gold,4);V.path(b,0,b.pts.length-1,COL.blue,4);V.drawStem(e);markP(V,1);G.P.D=D0;
  text('no stem: no dimple',800,190,{size:27,alpha:1-ss(1.4,2.2,u),weight:600});
  text('The stem grows,\nthe dimple forms,\nthe tracks cross.',800,190,{size:27,lh:40,alpha:ss(2.4,3.4,u)});
  text('stem = mass',800,360,{font:SERIF,size:34,color:COL.gold,alpha:ss(7.2,8.0,u)});
  text('dimple = curvature',800,406,{font:SERIF,size:34,color:COL.gold,alpha:ss(7.6,8.4,u)});
  caption('The dimple is there because the stem is there. This is how matter curves the geometry around it.',u,0.6,7.2);
  caption('Curvature here forces curvature there. In this way matter here influences matter there.',u,7.4,13);
});

// 9 Schluss
add(11,function(u){
  text('Space acts on matter,',W/2,214,{font:SERIF,size:50,align:'center',alpha:ss(0.4,1.3,u)});
  text('telling it how to move.',W/2,272,{font:SERIF,size:38,align:'center',alpha:ss(1.0,1.9,u),color:COL.gold});
  text('Matter acts back on space,',W/2,392,{font:SERIF,size:50,align:'center',alpha:ss(3.4,4.3,u)});
  text('telling it how to curve.',W/2,450,{font:SERIF,size:38,align:'center',alpha:ss(4.0,4.9,u),color:COL.gold});
  text('Geometrodynamics in brief',W/2,566,{size:24,align:'center',alpha:ss(6.2,7.0,u),color:COL.dim});
  text('after Misner, Thorne, Wheeler: “Gravitation”, Chapter 1 (§ 1.1, § 1.6, § 1.7)',W/2,650,{size:20,align:'center',alpha:ss(6.8,7.6,u),color:COL.dim});
});

var starts=[],total=0;scenes.forEach(function(s){starts.push(total);total+=Math.round(s.dur*FPS);});
function renderScene(si,f){var s=scenes[si],u=f/FPS;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;bg();s.draw(u);
  var fa=Math.max(1-ss(0,0.4,u),ss(s.dur-0.4,s.dur,u+1/FPS));if(fa>0){ctx.save();ctx.globalAlpha=fa;ctx.fillStyle=COL.bg2;ctx.fillRect(0,0,W,H);ctx.restore();}}
function sceneFrames(si){return Math.round(scenes[si].dur*FPS);}
function grab(si,f){renderScene(si,f);return cv.toDataURL('image/jpeg',0.92);}
