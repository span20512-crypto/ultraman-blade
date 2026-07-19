#!/usr/bin/env python3
"""Generate five original loopable hero-rock / wafuu-tokusatsu instrumentals."""
import math, random, wave
from array import array
from pathlib import Path
SR=22050; TAU=math.tau
OUT=Path(__file__).resolve().parents[1]/'assets/audio/bgm/original'
TRACKS=[
 ('01-light-rises.wav','Light Rises',132,50,16,[0,7,9,12,9,7,3,7],101,.72),
 ('02-steel-kiai.wav','Steel Kiai',148,45,16,[0,3,7,5,10,7,12,10],202,.94),
 ('03-sevenfold-flash.wav','Sevenfold Flash',156,47,16,[0,4,9,7,14,11,9,7],303,1.),
 ('04-name-of-the-star.wav','Call the Star',142,43,16,[0,5,7,12,10,7,5,2],404,.9),
 ('05-afterglow-vow.wav','Afterglow Vow',118,48,12,[0,4,7,11,9,7,4,2],505,.62)]
def hz(m): return 440*2**((m-69)/12)
def env(i,n,a=.04,r=.18): return min(1,i/max(1,int(n*a)),(n-i)/max(1,int(n*r)))
def note(b,st,dur,midi,vol,voice,pan=0):
 first,n,f=int(st*SR),int(dur*SR),hz(midi); lp,rp=math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)
 for i in range(n):
  t=i/SR; p=TAU*f*t; e=env(i,n)
  if voice=='guitar': s=math.tanh((math.sin(p)+.43*math.sin(2*p)+.2*math.sin(3*p))*2.8)*e
  elif voice=='brass': s=(math.sin(p)+.5*math.sin(2*p)+.18*math.sin(3*p))*e
  elif voice=='shamisen': s=(math.sin(p)+.55*math.sin(2.01*p))*e*math.exp(-5.2*t/max(dur,.01))
  else: s=(math.sin(p)+(.28*math.sin(2*p) if voice=='bass' else 0))*e
  j=(first+i)*2
  if j+1>=len(b): break
  b[j]+=s*vol*lp; b[j+1]+=s*vol*rp
def drum(b,st,kind,vol,rng):
 dur={'kick':.2,'snare':.16,'hat':.055,'taiko':.28}[kind]; first,n=int(st*SR),int(dur*SR)
 for i in range(n):
  t=i/SR
  if kind=='kick': s=math.sin(TAU*(88-52*t/dur)*t)*math.exp(-18*t)
  elif kind=='taiko': s=(math.sin(TAU*82*t)+.35*math.sin(TAU*164*t))*math.exp(-11*t)
  else: s=((rng.random()*2-1)*.78+math.sin(TAU*(190 if kind=='snare' else 5200)*t)*.22)*math.exp((-24 if kind=='snare' else -65)*t)
  j=(first+i)*2
  if j+1>=len(b): break
  b[j]+=s*vol*.72; b[j+1]+=s*vol*.72
def render(s):
 fn,title,bpm,root,bars,motif,seed,energy=s; rng=random.Random(seed); beat=60/bpm; duration=bars*4*beat
 b=array('f',[0.])*(int(duration*SR)*2); scale=[0,2,3,5,7,9,10]; prog=[0,3,4,2]
 for bar in range(bars):
  bt=bar*4*beat; cr=root+scale[prog[(bar//2)%4]]
  drum(b,bt,'taiko',.24*energy,rng)
  for q in range(4):
   drum(b,bt+q*beat,'kick',.23*energy,rng)
   if q in (1,3): drum(b,bt+q*beat,'snare',.2*energy,rng)
   drum(b,bt+(q+.5)*beat,'hat',.07*energy,rng)
  for k in range(8):
   t=bt+k*beat/2; m=cr-12+(7 if k in (3,7) else 0)
   note(b,t,beat*.42,m,.16*energy,'guitar',-.28); note(b,t,beat*.46,m-12,.15*energy,'bass')
  for iv in (0,7,12): note(b,bt,beat*1.7,cr+iv,.075*energy,'guitar',.3)
  for k,step in enumerate(motif):
   v='shamisen' if (bar+k)%3 else 'brass'; octv=12 if bar%4==3 and k>=4 else 0
   note(b,bt+k*beat/2,beat*(.43 if v=='shamisen' else .7),root+12+step+octv,.105*energy,v,.34 if k%2 else -.12)
 peak=max(max(b),-min(b),1e-6)
 for i,v in enumerate(b): b[i]=math.tanh(v*.92/peak*1.35)/math.tanh(1.35)
 pcm=array('h',(max(-32768,min(32767,round(v*32767))) for v in b)); OUT.mkdir(parents=True,exist_ok=True)
 with wave.open(str(OUT/fn),'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
 print(f'{fn}: {title} - {duration:.2f}s')
if __name__=='__main__':
 for track in TRACKS: render(track)
