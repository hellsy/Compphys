import numpy as np, mpmath
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont
S="/tmp/claude-0/-home-user/8bfb99ee-fa22-5f61-821f-781f6f13d7d3/scratchpad/yt"
F="/mnt/skills/examples/canvas-design/canvas-fonts/"
N=1600; rng=np.random.default_rng(7); bgc=(4,6,16)
y,x=np.mgrid[0:N,0:N]/N; r=np.hypot(x-0.5,y-0.45)
bg=np.zeros((N,N,3)); bg[...]=bgc; bg+=np.clip(1-r*2.2,0,1)[...,None]**2*np.array([18,22,60])
im=Image.fromarray(bg.clip(0,255).astype(np.uint8)); beams=Image.new("RGB",(N,N)); d=ImageDraw.Draw(im)
for _ in range(220):
    sx,sy=rng.uniform(0,N,2)
    if sy>N*0.28: continue
    b=int(rng.uniform(60,220)); s=rng.uniform(1,3); d.ellipse((sx-s,sy-s,sx+s,sy+s),fill=(b,b,min(255,b+25)))
cx,cy=N*0.5,N*0.62
bd=ImageDraw.Draw(beams)
for a in np.linspace(-1.0,1.0,9): bd.line((cx,cy,cx+np.sin(a)*N,cy-np.cos(a)*N),fill=(55,35,115),width=12)
im=ImageChops.add(im,beams.filter(ImageFilter.GaussianBlur(30)))
# letters, with dome-like perspective (top narrower)
mask=Image.new("L",(N,N)); md=ImageDraw.Draw(mask)
f1=ImageFont.truetype(F+"BigShoulders-Bold.ttf",360)
md.text((N/2,560),"ROAD TO",font=f1,fill=255,anchor="mm"); md.text((N/2,930),"REALITY",font=f1,fill=255,anchor="mm")
top,bot=380,1110
def warp(img):
    # trapezoid: scale x by s(y) around the centre
    A=np.asarray(img); out=np.zeros_like(A); xs=np.arange(N)
    for yy in range(N):
        p=np.clip((yy-top)/(bot-top),0,1); s=0.72+0.28*p
        src=(xs-N/2)/s+N/2
        out[yy]=np.interp(src,xs,A[yy].astype(float),left=0,right=0)
    return Image.fromarray(out.astype(np.uint8))
mask=warp(mask)
# stacked laser wave lines (smooth bumps like the zeta rows), clipped to the letters
T=np.linspace(14,40,N); Z=np.array([float(abs(mpmath.zeta(complex(0.6,t)))) for t in T[::8]]); Z=np.interp(np.arange(N),np.arange(0,N,8),Z)
lines=Image.new("RGB",(N,N)); glow=Image.new("RGB",(N,N)); ld=ImageDraw.Draw(lines); gd=ImageDraw.Draw(glow)
k=0
for y0 in np.arange(top,bot+30,19):
    p=(y0-top)/(bot-top)
    c=np.array([a+(b-a)*p for a,b in zip((70,210,255),(255,80,210))])
    ys=y0-np.roll(Z,k*61)*5.5; k+=1
    pts=list(zip(range(N),ys))
    ld.line(pts,fill=tuple(int(v) for v in np.minimum(255,c*0.85+45)),width=6)
    gd.line(pts,fill=tuple(int(v*0.6) for v in c),width=16)
m2=mask.filter(ImageFilter.GaussianBlur(1.5))
lines=Image.composite(lines,Image.new("RGB",(N,N)),m2)
glow=Image.composite(glow,Image.new("RGB",(N,N)),m2.filter(ImageFilter.MaxFilter(7)))
im=ImageChops.add(im,glow.filter(ImageFilter.GaussianBlur(18)))
im=ImageChops.add(im,glow.filter(ImageFilter.GaussianBlur(60)).point(lambda v:int(v*0.6)))
im=ImageChops.add(im,lines)
# golden critical line with zeros in front
g2=Image.new("RGB",(N,N)); d2=ImageDraw.Draw(g2); dd=ImageDraw.Draw(im)
T2=np.linspace(-33,33,900); H=np.array([float(abs(mpmath.zeta(complex(0.5,t)))) for t in T2])
xs=N/2+T2/33*N*0.33; ys=1290-np.minimum(H,3.2)*45; pts=list(zip(xs,ys))
d2.line(pts,fill=(170,125,40),width=24)
zs=[pts[k] for k in range(1,len(T2)-1) if H[k]<H[k-1] and H[k]<H[k+1] and H[k]<0.25]
for px,py in zs: d2.ellipse((px-28,py-28,px+28,py+28),fill=(255,240,120))
im=ImageChops.add(im,g2.filter(ImageFilter.GaussianBlur(20))); dd=ImageDraw.Draw(im)
dd.line(pts,fill=(255,222,125),width=8)
for px,py in zs: dd.ellipse((px-14,py-14,px+14,py+14),fill=(255,255,225))
m=Image.new("L",(N,N)); ImageDraw.Draw(m).ellipse((40,40,N-40,N-40),fill=255); m=m.filter(ImageFilter.GaussianBlur(50))
im=Image.composite(im,Image.new("RGB",(N,N),bgc),m).resize((800,800),Image.LANCZOS); im.save(S+"/avatar5.png")
c=Image.new("RGB",(800,800),(255,255,255)); mm=Image.new("L",(800,800)); ImageDraw.Draw(mm).ellipse((0,0,800,800),fill=255)
c.paste(im,(0,0),mm); prev=Image.new("RGB",(1000,800),(255,255,255)); prev.paste(c,(0,0)); prev.paste(c.resize((98,98),Image.LANCZOS),(860,40)); prev.save(S+"/avatar5_check.jpg")
