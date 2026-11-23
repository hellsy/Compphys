// Apfel-Geometrie: Rotationsfläche mit Mulde, Geodäten per Projektion
var G = (function(){
  var P = {D:0.40, w1:0.045, B:0.10, w2:0.05, k:0.05};
  function rho(c){ return 1 + P.k*c - P.D*Math.exp(-(1-c)/P.w1) - P.B*Math.exp(-(1+c)/P.w2); }
  function F(x,y,z){ var r=Math.sqrt(x*x+y*y+z*z); return r - rho(z/r); }
  function grad(x,y,z){ var e=1e-4; return [ (F(x+e,y,z)-F(x-e,y,z))/(2*e), (F(x,y+e,z)-F(x,y-e,z))/(2*e), (F(x,y,z+e)-F(x,y,z-e))/(2*e) ]; }
  function normal(x,y,z){ var g=grad(x,y,z), l=Math.hypot(g[0],g[1],g[2]); return [g[0]/l,g[1]/l,g[2]/l]; }
  function onSurf(th,ph){ var c=Math.cos(th), s=Math.sin(th), r=rho(c); return [r*s*Math.cos(ph), r*s*Math.sin(ph), r*c]; }
  function project(p){ for(var i=0;i<4;i++){ var g=grad(p[0],p[1],p[2]), f=F(p[0],p[1],p[2]), gg=g[0]*g[0]+g[1]*g[1]+g[2]*g[2]; p=[p[0]-f*g[0]/gg,p[1]-f*g[1]/gg,p[2]-f*g[2]/gg]; } return p; }
  // Geodäte ab Punkt p in Richtung v (wird tangential gemacht), Länge L, Schritt ds
  function geodesic(p,v,L,ds){
    ds=ds||0.004; p=project(p); var pts=[],nrm=[],tan=[]; var n=Math.round(L/ds);
    for(var i=0;i<=n;i++){
      var nn=normal(p[0],p[1],p[2]); var d=v[0]*nn[0]+v[1]*nn[1]+v[2]*nn[2];
      v=[v[0]-d*nn[0],v[1]-d*nn[1],v[2]-d*nn[2]]; var l=Math.hypot(v[0],v[1],v[2]); v=[v[0]/l,v[1]/l,v[2]/l];
      pts.push(p); nrm.push(nn); tan.push(v);
      p=project([p[0]+v[0]*ds,p[1]+v[1]*ds,p[2]+v[2]*ds]);
    }
    return {pts:pts,nrm:nrm,tan:tan,ds:ds};
  }
  // Start bei (th,ph), Kurs: Winkel delta gegen "bergauf" (Richtung Stiel), positiv = nach +phi
  function launch(th,ph,delta,L,ds){
    var p=onSurf(th,ph), e=1e-3, a=onSurf(th-e,ph);
    var up=[a[0]-p[0],a[1]-p[1],a[2]-p[2]], l=Math.hypot(up[0],up[1],up[2]); up=[up[0]/l,up[1]/l,up[2]/l];
    var ea=[-Math.sin(ph),Math.cos(ph),0];
    var v=[up[0]*Math.cos(delta)+ea[0]*Math.sin(delta),up[1]*Math.cos(delta)+ea[1]*Math.sin(delta),up[2]*Math.cos(delta)+ea[2]*Math.sin(delta)];
    return geodesic(p,v,L,ds);
  }
  return {P:P,rho:rho,F:F,grad:grad,normal:normal,onSurf:onSurf,project:project,geodesic:geodesic,launch:launch};
})();
if(typeof module!=='undefined') module.exports=G;
