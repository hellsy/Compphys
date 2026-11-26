import numpy as np, mpmath
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageEnhance, ImageFont
S="/tmp/claude-0/-home-user/8bfb99ee-fa22-5f61-821f-781f6f13d7d3/scratchpad/yt"
F="/mnt/skills/examples/canvas-design/canvas-fonts/"
N=1600; bgc=(4,6,16)
# background: zeta mountain from the video, darkened
mt=Image.open(S+"/base.png").convert("RGB"); d0=ImageDraw.Draw(mt); d0.rectangle((0,0,300,70),fill=bgc); d0.rectangle((834,180,948,205),fill=bgc)
mt=mt.crop((300,60,1220,700)).resize((int(920*1.75),int(640*1.75)))
mt=ImageEnhance.Brightness(ImageEnhance.Color(mt).enhance(0.8)).enhance(0.32)
fm=Image.new("L",mt.size); ImageDraw.Draw(fm).rectangle((140,140,mt.width-140,mt.height-140),fill=255); fm=fm.filter(ImageFilter.GaussianBlur(110))
im=Image.new("RGB",(N,N),bgc); im.paste(mt,((N-mt.width)//2,N-mt.height-120),fm)
# stars on top
rng=np.random.default_rng(3); d=ImageDraw.Draw(im)
for _ in range(160):
    sx,sy=rng.uniform(0,N,2)
    if sy>N*0.35: continue
    b=int(rng.uniform(50,200)); s=rng.uniform(1,2.6); d.ellipse((sx-s,sy-s,sx+s,sy+s),fill=(b,b,b+20))
# text mask
mask=Image.new("L",(N,N)); md=ImageDraw.Draw(mask)
f1=ImageFont.truetype(F+"BigShoulders-Bold.ttf",330)
lines=[("ROAD TO",500),("REALITY",860)]
for t,yy in lines: md.text((N/2,yy),t,font=f1,fill=255,anchor="mm")
# laser wave lines: rows of |zeta(1/2+it)| wiggles, clipped to the text
T=np.linspace(14,34,N)
row=np.array([float(abs(mpmath.zeta(complex(0.5,t)))) for t in T[::4]]); row=np.interp(np.arange(N),np.arange(0,N,4),row)
waves=Image.new("RGB",(N,N)); wg=Image.new("RGB",(N,N)); wd=ImageDraw.Draw(waves); gd=ImageDraw.Draw(wg)
for k,y0 in enumerate(range(300,1080,17)):
    shift=(k*53)%N
    ys=y0-np.clip(np.roll(row,shift),0,2.2)*5
    p=(y0-300)/780
    c=(int(90+165*p),int(210-10*p),int(255-165*p))  # cyan -> gold
    pts=list(zip(range(N),ys))
    wd.line(pts,fill=c,width=4); gd.line(pts,fill=c,width=10)
txt=Image.composite(waves,Image.new("RGB",(N,N)),mask)
txtg=Image.composite(wg,Image.new("RGB",(N,N)),mask.filter(ImageFilter.MaxFilter(9)))
# laser outline
edge=mask.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(5))
outl=Image.composite(Image.new("RGB",(N,N),(255,215,120)),Image.new("RGB",(N,N)),edge)
glow=ImageChops.add(txtg,outl)
im=ImageChops.add(im,glow.filter(ImageFilter.GaussianBlur(26)).point(lambda v:int(v*0.8)))
im=ImageChops.add(im,glow.filter(ImageFilter.GaussianBlur(80)).point(lambda v:int(v*0.5)))
im=ImageChops.add(im,txt); im=ImageChops.add(im,outl)
m=Image.new("L",(N,N)); ImageDraw.Draw(m).ellipse((40,40,N-40,N-40),fill=255); m=m.filter(ImageFilter.GaussianBlur(50))
im=Image.composite(im,Image.new("RGB",(N,N),bgc),m).resize((800,800),Image.LANCZOS); im.save(S+"/avatar3.png")
c=Image.new("RGB",(800,800),(255,255,255)); mm=Image.new("L",(800,800)); ImageDraw.Draw(mm).ellipse((0,0,800,800),fill=255)
c.paste(im,(0,0),mm); prev=Image.new("RGB",(1000,800),(255,255,255)); prev.paste(c,(0,0)); prev.paste(c.resize((98,98),Image.LANCZOS),(860,40)); prev.save(S+"/avatar3_check.jpg")
