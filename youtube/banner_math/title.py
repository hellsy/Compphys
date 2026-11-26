"""Adds the 'ROAD TO REALITY' title to the rendered scene: banner (2560x1440) and round profile picture (800x800)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import os
D=os.path.dirname(os.path.abspath(__file__)); F="/mnt/skills/examples/canvas-design/canvas-fonts/"
def metal(W,H,y0,h):
    g=Image.new("RGB",(W,H)); d=ImageDraw.Draw(g)
    for yy in range(H):
        t=((yy-y0)%h)/h
        c=(int(245-80*t),int(248-70*t),int(255-45*t)) if t<0.5 else (int(165+90*(t-0.5)*2),int(178+45*(t-0.5)*2),int(210-70*(t-0.5)*2))
        d.line((0,yy,W,yy),fill=c)
    return g
def put(im,mask,y0,h,dark=0.85,blur=16,grow=11):
    W,H=im.size
    dk=mask.filter(ImageFilter.MaxFilter(grow)).filter(ImageFilter.GaussianBlur(blur)).point(lambda v:int(v*dark))
    im=Image.composite(Image.new("RGB",(W,H),(5,6,14)),im,dk)
    gl=Image.composite(Image.new("RGB",(W,H),(110,160,255)),Image.new("RGB",(W,H)),mask).filter(ImageFilter.GaussianBlur(26)).point(lambda v:int(v*0.4))
    return Image.composite(metal(W,H,y0,h),ImageChops.add(im,gl),mask)
# banner
im=Image.open(D+"/scene_2560.png").convert("RGB"); W,H=im.size
band=Image.new("L",(W,H)); ImageDraw.Draw(band).ellipse((W/2-760,600,W/2+760,920),fill=110); im=Image.composite(Image.new("RGB",(W,H),(10,8,16)),im,band.filter(ImageFilter.GaussianBlur(70)))
font=ImageFont.truetype(F+"Tektur-Medium.ttf",118); small=ImageFont.truetype(F+"IBMPlexMono-Bold.ttf",38)
title="ROAD TO REALITY"; sp=20; y=690
ws=[ImageDraw.Draw(im).textlength(c,font=font) for c in title]; tw=sum(ws)+sp*(len(title)-1); x0=(W-tw)/2
mask=Image.new("L",(W,H)); md=ImageDraw.Draw(mask); x=x0
for c,w in zip(title,ws): md.text((x,y),c,font=font,fill=255,anchor="lm"); x+=w+sp
im=put(im,mask,y-60,240)
d=ImageDraw.Draw(im); lc=(200,215,240)
d.line((x0-300,y,x0-36,y),fill=lc,width=3); d.line((x0+tw+36,y,x0+tw+300,y),fill=lc,width=3); d.line((x0+30,y+100,x0+tw-30,y+100),fill=(150,170,210),width=2)
fl=Image.new("RGB",(W,H)); ImageDraw.Draw(fl).ellipse((W/2-70,y+90,W/2+70,y+110),fill=(255,190,110)); im=ImageChops.add(im,fl.filter(ImageFilter.GaussianBlur(10)))
sub="VISUAL JOURNEYS THROUGH MATH & PHYSICS"; sh=Image.new("L",(W,H)); ImageDraw.Draw(sh).text((W/2,y+165),sub,font=small,fill=255,anchor="mm")
im=Image.composite(Image.new("RGB",(W,H),(0,0,0)),im,sh.filter(ImageFilter.GaussianBlur(8)))
ImageDraw.Draw(im).text((W/2,y+165),sub,font=small,fill=(255,208,125),anchor="mm")
im.save(D+"/banner_math.jpg",quality=92); im.resize((1280,720)).save(D+"/banner_math_check.jpg")
# profile picture
im=Image.open(D+"/scene_1600.png").convert("RGB"); W,H=im.size
f2=ImageFont.truetype(F+"Tektur-Medium.ttf",190); mask=Image.new("L",(W,H)); md=ImageDraw.Draw(mask)
md.text((W/2,980),"ROAD TO",font=f2,fill=255,anchor="mm"); md.text((W/2,1170),"REALITY",font=f2,fill=255,anchor="mm")
im=put(im,mask,890,190,blur=24,grow=15)
m=Image.new("L",(W,H)); ImageDraw.Draw(m).ellipse((30,30,W-30,H-30),fill=255)
im=Image.composite(im,Image.new("RGB",(W,H),(4,6,16)),m.filter(ImageFilter.GaussianBlur(40))).resize((800,800),Image.LANCZOS); im.save(D+"/avatar_math.png")
c=Image.new("RGB",(800,800),(255,255,255)); mm=Image.new("L",(800,800)); ImageDraw.Draw(mm).ellipse((0,0,800,800),fill=255)
c.paste(im,(0,0),mm); p=Image.new("RGB",(1000,800),(255,255,255)); p.paste(c,(0,0)); p.paste(c.resize((98,98),Image.LANCZOS),(860,40)); p.save(D+"/avatar_math_check.jpg")
