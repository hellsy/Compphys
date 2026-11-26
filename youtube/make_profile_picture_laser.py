import numpy as np, mpmath
from PIL import Image, ImageDraw, ImageFilter, ImageChops
S="/tmp/claude-0/-home-user/8bfb99ee-fa22-5f61-821f-781f6f13d7d3/scratchpad/yt"
N=1600; rng=np.random.default_rng(7)
y,x=np.mgrid[0:N,0:N]/N
r=np.hypot(x-0.5,y-0.45)
bg=np.zeros((N,N,3)); bg[...]=[4,6,16]; bg+=np.clip(1-r*2.2,0,1)[...,None]**2*np.array([18,22,60])
im=Image.fromarray(bg.clip(0,255).astype(np.uint8)); glow=Image.new("RGB",(N,N))
d=ImageDraw.Draw(im); g=ImageDraw.Draw(glow)
for _ in range(220):
    sx,sy=rng.uniform(0,N,2)
    if sy>N*0.32: continue
    b=int(rng.uniform(60,220)); s=rng.uniform(1,3)
    d.ellipse((sx-s,sy-s,sx+s,sy+s),fill=(b,b,min(255,b+25)))
# zeta landscape |zeta(sigma+it)|, rows = sigma (back 2.2 -> front -0.6), cols = t in [-34,34]
T=np.linspace(-33,33,420); SIG=np.linspace(2.4,0.5,11)
vx=N*0.5; horizon=N*0.30; base=N*0.56
def hue(c):
    return c
rows=[]
for i,sg in enumerate(SIG):
    h=np.array([min(float(abs(mpmath.zeta(complex(sg,t)))) if not (abs(sg-1)<1e-9 and abs(t)<1e-9) else 9,3.2) for t in T])
    rows.append(h)
n=len(SIG)
for i,(sg,h) in enumerate(zip(SIG,rows)):
    p=i/(n-1)                      # 0 back .. 1 front
    z=0.25+0.75*p                  # perspective scale
    yb=horizon+(base-horizon)*p**1.3
    xs=vx+T/33*N*0.40*z
    ys=yb-h*N*0.034*z
    pts=list(zip(xs,ys))
    crit=abs(sg-0.5)<0.11
    # laser colors: cyan -> magenta across depth, critical line gold
    c=(255,210,90) if crit else tuple(int(a+(b-a)*p) for a,b in zip((60,200,255),(255,70,200)))
    w=int(2+3*z)+(3 if crit else 0)
    g.line(pts,fill=tuple(int(v*0.45) for v in c),width=w*3); d.line(pts,fill=tuple(min(255,int(v*0.85+40)) for v in c),width=w)
    if crit:  # mark zeros (minima near 0)
        for k in range(1,len(T)-1):
            if h[k]<h[k-1] and h[k]<h[k+1] and h[k]<0.25:
                px,py=pts[k]; R=9*z+6
                g.ellipse((px-R*2,py-R*2,px+R*2,py+R*2),fill=(255,240,120)); d.ellipse((px-R,py-R,px+R,py+R),fill=(255,255,220))
# road from bottom to critical line center
ci=int(np.argmin(abs(SIG-0.5))); p=ci/(n-1); yc=horizon+(base-horizon)*p**1.3
for sgn in (-1,1):
    g.line((vx+sgn*6,yc+20,vx+sgn*360,N),fill=(255,180,60),width=24)
    d.line((vx+sgn*6,yc+20,vx+sgn*360,N),fill=(255,220,130),width=7)
for j in range(12):
    t0=(j/12)**1.7; t1=((j+0.45)/12)**1.7
    y0=yc+20+(N-yc-20)*t0; y1=yc+20+(N-yc-20)*t1; w=2+14*t1
    g.line((vx,y0,vx,y1),fill=(80,200,255),width=int(w*3)); d.line((vx,y0,vx,y1),fill=(210,245,255),width=int(w))
# laser beams fanning from the road's vanishing point
for a in np.linspace(-0.9,0.9,7):
    ex=vx+np.sin(a)*N; ey=yc-np.cos(a)*N*0.9
    g.line((vx,yc,ex,ey),fill=(60,40,120),width=10)
bl=glow.filter(ImageFilter.GaussianBlur(22)); bl2=glow.filter(ImageFilter.GaussianBlur(70)).point(lambda v:int(v*0.6))
im=ImageChops.add(ImageChops.add(im,bl),bl2)
m=Image.new("L",(N,N)); ImageDraw.Draw(m).ellipse((40,40,N-40,N-40),fill=255); m=m.filter(ImageFilter.GaussianBlur(60))
im=Image.composite(im,Image.new("RGB",(N,N),(4,6,16)),m).resize((800,800),Image.LANCZOS)
im.save(S+"/avatar2.png")
c=Image.new("RGB",(800,800),(255,255,255)); mm=Image.new("L",(800,800)); ImageDraw.Draw(mm).ellipse((0,0,800,800),fill=255)
c.paste(im,(0,0),mm); prev=Image.new("RGB",(1000,800),(255,255,255)); prev.paste(c,(0,0)); prev.paste(c.resize((98,98),Image.LANCZOS),(860,40)); prev.save(S+"/avatar2_check.jpg")
