// @ts-nocheck
// ---------- Astral sky: starfield + liquid-glass lens (canvas, no libraries) ----------
// One Starfield renders the drifting stars to an offscreen canvas; the app background draws it
// as-is, the welcome screen draws it and then refracts it through one large glass lens:
// magnified sample, per-channel scale offsets (dispersion), an annular edge band that bends
// harder (displacement), a slow breathing wobble, a specular highlight and a cold rim.
function Starfield(seed){
  const R=(()=>{ let s=seed||7; return ()=>{ s=(s*1664525+1013904223)%4294967296; return s/4294967296; }; })();
  const stars=[]; for(let i=0;i<520;i++){ const big=R()<.07; stars.push({x:R(),y:R(),r:big?1.4+R()*1.1:.35+R()*.8,a:.25+R()*.75,tw:R()*6.28,ts:.4+R()*1.2,warm:R()<.18,dx:(R()-.5)*.004,dy:(R()-.5)*.002}); }
  const c=document.createElement('canvas'); const ctx=c.getContext('2d');
  return { canvas:c,
    render(W,H,t,dpr){ if(c.width!==W||c.height!==H){ c.width=W; c.height=H; }
      // ground: deep space with two faint nebulae (cool + one warm, very low)
      ctx.fillStyle='#07090F'; ctx.fillRect(0,0,W,H);
      let g=ctx.createRadialGradient(W*.72,H*.35,0,W*.72,H*.35,Math.max(W,H)*.6); g.addColorStop(0,'rgba(58,78,124,.32)'); g.addColorStop(.5,'rgba(30,40,70,.12)'); g.addColorStop(1,'rgba(7,9,15,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      g=ctx.createRadialGradient(W*.18,H*.85,0,W*.18,H*.85,Math.max(W,H)*.5); g.addColorStop(0,'rgba(242,200,121,.10)'); g.addColorStop(1,'rgba(7,9,15,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      for(const s of stars){ const x=((s.x+s.dx*t)%1+1)%1*W, y=((s.y+s.dy*t)%1+1)%1*H; const a=s.a*(.7+.3*Math.sin(t*s.ts+s.tw)); const r=s.r*dpr;
        ctx.beginPath(); ctx.arc(x,y,r,0,6.283); ctx.fillStyle=s.warm?`rgba(255,226,180,${a})`:`rgba(220,232,255,${a})`; ctx.fill();
        if(s.r>1.4){ ctx.beginPath(); ctx.arc(x,y,r*4,0,6.283); const gg=ctx.createRadialGradient(x,y,0,x,y,r*4); gg.addColorStop(0,`rgba(230,238,255,${a*.35})`); gg.addColorStop(1,'rgba(230,238,255,0)'); ctx.fillStyle=gg; ctx.fill(); } }
    } };
}

// Draw the sky through a glass lens at (cx,cy,rad). `src` is the rendered starfield canvas.
function drawLens(ctx,src,cx,cy,rad,t,chan){
  const breathe=1+Math.sin(t*.9)*.012; const mag=1.22*breathe;
  const draw=(img,scale,ox,oy,alpha,comp)=>{ ctx.save(); ctx.globalAlpha=alpha; ctx.globalCompositeOperation=comp||'source-over'; ctx.translate(cx+ox,cy+oy); ctx.scale(scale,scale); ctx.translate(-cx,-cy); ctx.drawImage(img,0,0); ctx.restore(); };
  // 1. main refraction: three colour channels at slightly different magnification = dispersion at the edges
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,rad,0,6.283); ctx.clip();
  ctx.fillStyle='#0A0E18'; ctx.fillRect(cx-rad,cy-rad,rad*2,rad*2);
  const wob=Math.sin(t*1.3)*2.5, wob2=Math.cos(t*1.1)*2.5;
  draw(chan.r,mag*1.028,wob,wob2,1,'lighter'); draw(chan.g,mag,0,0,1,'lighter'); draw(chan.b,mag*.972,-wob,-wob2,1,'lighter');
  // 2. edge band bends harder (thick-glass displacement)
  ctx.beginPath(); ctx.arc(cx,cy,rad,0,6.283); ctx.arc(cx,cy,rad*.78,0,6.283,true); ctx.clip('evenodd');
  draw(src,mag*1.16,Math.sin(t*.7)*4,Math.cos(t*.8)*4,.85);
  ctx.restore();
  // 3. glass body: depth shading, rim, specular
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,rad,0,6.283); ctx.clip();
  let g=ctx.createRadialGradient(cx-rad*.35,cy-rad*.4,rad*.1,cx,cy,rad); g.addColorStop(0,'rgba(255,255,255,.10)'); g.addColorStop(.55,'rgba(255,255,255,.02)'); g.addColorStop(.92,'rgba(255,255,255,0)'); g.addColorStop(1,'rgba(255,255,255,.22)'); ctx.fillStyle=g; ctx.fillRect(cx-rad,cy-rad,rad*2,rad*2);
  g=ctx.createRadialGradient(cx+rad*.4,cy+rad*.45,rad*.2,cx,cy,rad); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.85,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.35)'); ctx.fillStyle=g; ctx.fillRect(cx-rad,cy-rad,rad*2,rad*2);
  // specular arc, top-left
  ctx.beginPath(); ctx.arc(cx,cy,rad*.9,Math.PI*1.08,Math.PI*1.42); ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.lineWidth=rad*.016; ctx.shadowColor='rgba(255,255,255,.9)'; ctx.shadowBlur=rad*.06; ctx.lineCap='round'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,rad*.9,Math.PI*.12,Math.PI*.3); ctx.shadowBlur=0; ctx.strokeStyle='rgba(242,200,121,.45)'; ctx.lineWidth=rad*.012; ctx.stroke();
  // inner glow: light gathered by the glass
  g=ctx.createRadialGradient(cx,cy,0,cx,cy,rad); g.addColorStop(0,'rgba(120,150,220,.16)'); g.addColorStop(.7,'rgba(120,150,220,.04)'); g.addColorStop(1,'rgba(120,150,220,0)'); ctx.fillStyle=g; ctx.fillRect(cx-rad,cy-rad,rad*2,rad*2);
  ctx.restore();
  // rim
  ctx.beginPath(); ctx.arc(cx,cy,rad,0,6.283); ctx.strokeStyle='rgba(255,255,255,.28)'; ctx.lineWidth=1.2; ctx.stroke();
}
function channelSplit(src,chan){ ['r','g','b'].forEach((k,i)=>{ const c=chan[k]; if(c.width!==src.width||c.height!==src.height){ c.width=src.width; c.height=src.height; } const x=c.getContext('2d'); x.globalCompositeOperation='source-over'; x.drawImage(src,0,0); x.globalCompositeOperation='multiply'; x.fillStyle=['#ff0000','#00ff00','#0000ff'][i]; x.fillRect(0,0,c.width,c.height); }); }

export const Sky={ field:Starfield(11), anim:0,
  start(cv){ const ctx=cv.getContext('2d'); const dpr=Math.min(1.5,devicePixelRatio||1); let W,H; const size=()=>{ W=cv.width=Math.round(cv.clientWidth*dpr); H=cv.height=Math.round(cv.clientHeight*dpr); }; size(); window.addEventListener('resize',size,{passive:true});
    let last=0; const t0=performance.now();
    const draw=(now)=>{ this.anim=requestAnimationFrame(draw); if(now-last<1000/24) return; last=now; if(!W||!H) return; this.field.render(W,H,(now-t0)/1000,dpr); ctx.drawImage(this.field.canvas,0,0); };
    this.anim=requestAnimationFrame(draw);
    return ()=>{ cancelAnimationFrame(this.anim); window.removeEventListener('resize',size); }; },
  // welcome screen: full sky + lens; the lens drifts and leans toward the pointer
  welcome(cv,o){ o=o||{}; const ctx=cv.getContext('2d'); const dpr=Math.min(2,devicePixelRatio||1); let W,H; const size=()=>{ W=cv.width=Math.round(cv.clientWidth*dpr); H=cv.height=Math.round(cv.clientHeight*dpr); }; size();
    const chan={r:document.createElement('canvas'),g:document.createElement('canvas'),b:document.createElement('canvas')}; let px=0,py=0,tx=0,ty=0; const t0=performance.now(); let anim=0;
    const onMove=e=>{ tx=(e.clientX/window.innerWidth-.5); ty=(e.clientY/window.innerHeight-.5); };
    window.addEventListener('pointermove',onMove,{passive:true}); window.addEventListener('resize',size,{passive:true});
    const draw=(now)=>{ anim=requestAnimationFrame(draw); if(!W||!H) return; const t=(now-t0)/1000; px+=(tx-px)*.04; py+=(ty-py)*.04;
      this.field.render(W,H,t,dpr); ctx.drawImage(this.field.canvas,0,0); channelSplit(this.field.canvas,chan);
      const mobile=W<H; const rad=(mobile?Math.min(W,H)*.34:Math.min(W,H)*.30)*(o.r||1); const cx=mobile?W*(o.mx||.5)+px*30*dpr:W*(o.x||.71)+px*40*dpr+Math.sin(t*.4)*10*dpr; const cy=mobile?H*(o.my||.26)+py*20*dpr:H*(o.y||.5)+py*30*dpr+Math.cos(t*.5)*12*dpr;
      // soft halo behind the lens
      const g=ctx.createRadialGradient(cx,cy,rad*.8,cx,cy,rad*1.7); g.addColorStop(0,'rgba(120,150,220,.18)'); g.addColorStop(1,'rgba(120,150,220,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      drawLens(ctx,this.field.canvas,cx,cy,rad,t,chan);
      // a small satellite lens for depth
      if(o.satellite!==false) drawLens(ctx,this.field.canvas,cx-rad*1.25-px*20*dpr,cy+rad*.85-py*15*dpr,rad*.22,t+2,chan);
    };
    anim=requestAnimationFrame(draw);
    return ()=>{ cancelAnimationFrame(anim); window.removeEventListener('pointermove',onMove); window.removeEventListener('resize',size); }; }
};
