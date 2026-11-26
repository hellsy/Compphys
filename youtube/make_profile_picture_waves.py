import numpy as np, mpmath
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont
S="/tmp/claude-0/-home-user/8bfb99ee-fa22-5f61-821f-781f6f13d7d3/scratchpad/yt"
F="/mnt/skills/examples/canvas-design/canvas-fonts/"
N=1600; rng=np.random.default_rng(7); bgc=np.array([4,6,16])
y,x=np.mgrid[0:N,0:N]/N; r=np.hypot(x-0.5,y-0.45)
bg=np.zeros((N,N,3)); bg[...]=bgc; bg+=np.clip(1-r*2.2,0,1)[...,None]**2*np.array([18,22,60])
im=Image.fromarray(bg.clip(0,255).astype(np.uint8)); glow=Image.new("RGB",(N,N))
d=ImageDraw.Draw(im); g=ImageDraw.Draw(glow)
for _ in range(220):
    sx,sy=rng.uniform(0,N,2)
    if sy>N*0.3: continue
    b=int(rng.uniform(60,220)); s=rng.uniform(1,3); d.ellipse((sx-s,sy-s,sx+s,sy+s),fill=(b,b,min(255,b+25)))
# light beams from behind the wave object
cx,cy=N*0.5,N*0.62
for a in np.linspace(-1.0,1.0,9):
    g.line((cx,cy,cx+np.sin(a)*N,cy-np.cos(a)*N),fill=(55,35,115),width=12)
# text mask in a flat (u,v) plane
MW,MH=1400,620
mask=Image.new("L",(MW,MH)); md=ImageDraw.Draw(mask)
f=ImageFont.truetype(F+"BigShoulders-Bold.ttf",300)
md.text((MW/2,165),"ROAD TO",font=f,fill=255,anchor="mm"); md.text((MW/2,465),"REALITY",font=f,fill=255,anchor="mm")
M=np.asarray(mask.filter(ImageFilter.GaussianBlur(5)),float)/255
# zeta wiggle on the critical line
T=np.linspace(14,30,MW); Z=np.array([float(abs(mpmath.zeta(complex(0.5,t)))) for t in T[::5]]); Z=np.interp(np.arange(MW),np.arange(0,MW,5),Z)
n=64; top=N*0.22; bottom=N*0.74
for i in range(n):
    p=i/(n-1)
    z=0.55+0.45*p                                  # dome: narrower at the back
    v=int(p*(MH-1)); h=M[v]
    yb=top+(bottom-top)*p
    u=np.arange(MW)-MW/2
    env=np.clip(1-(np.abs(u)/(MW/2))**6,0,1)         # soft ends
    xs=N/2+u*z*0.98
    ys=yb-h*16-np.clip(np.roll(Z,i*29),0,2.5)*6*z*env
    pts=list(zip(xs,ys)); poly=pts+[(xs[-1],N),(xs[0],N)]
    d.polygon(poly,fill=tuple(bgc)); g.polygon(poly,fill=(0,0,0))
    c=np.array([a+(b-a)*p for a,b in zip((60,200,255),(255,70,200))])
    lum=0.28+0.72*h
    # draw in segments so brightness follows the letters
    for k in range(0,MW-6,6):
        L=lum[k:k+7].max(); cc=tuple(int(x) for x in np.minimum(255,c*L*0.85+40*L))
        seg=pts[k:k+7]
        g.line(seg,fill=tuple(int(x*0.55*L) for x in c),width=10)
        d.line(seg,fill=cc,width=3 if L<0.6 else 5)
# golden critical line in front with the zeros of zeta
yb=bottom+120; T2=np.linspace(-33,33,900)
H=np.array([float(abs(mpmath.zeta(complex(0.5,t)))) for t in T2])
xs=N/2+T2/33*N*0.33; ys=yb-np.minimum(H,3.2)*45
pts=list(zip(xs,ys)); g.line(pts,fill=(160,120,40),width=24); d.line(pts,fill=(255,220,120),width=8)
for k in range(1,len(T2)-1):
    if H[k]<H[k-1] and H[k]<H[k+1] and H[k]<0.25:
        px,py=pts[k]; R=14
        g.ellipse((px-2*R,py-2*R,px+2*R,py+2*R),fill=(255,240,120)); d.ellipse((px-R,py-R,px+R,py+R),fill=(255,255,225))
bl=glow.filter(ImageFilter.GaussianBlur(20)); bl2=glow.filter(ImageFilter.GaussianBlur(70)).point(lambda v:int(v*0.6))
im=ImageChops.add(ImageChops.add(im,bl),bl2)
m=Image.new("L",(N,N)); ImageDraw.Draw(m).ellipse((40,40,N-40,N-40),fill=255); m=m.filter(ImageFilter.GaussianBlur(50))
im=Image.composite(im,Image.new("RGB",(N,N),tuple(bgc)),m).resize((800,800),Image.LANCZOS); im.save(S+"/avatar4.png")
c=Image.new("RGB",(800,800),(255,255,255)); mm=Image.new("L",(800,800)); ImageDraw.Draw(mm).ellipse((0,0,800,800),fill=255)
c.paste(im,(0,0),mm); prev=Image.new("RGB",(1000,800),(255,255,255)); prev.paste(c,(0,0)); prev.paste(c.resize((98,98),Image.LANCZOS),(860,40)); prev.save(S+"/avatar4_check.jpg")
