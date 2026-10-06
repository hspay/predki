// @ts-nocheck — frame drawing is plain SVG string building, ported from the «Стена предков» prototype
// Portrait frames for the Tree: eight shapes, each in a few colours and three sizes.
// A person without `frame` keeps the usual card. Some frames open with achievements.
import { S } from './core'
import { LANG } from './i18n'

export type FrameSize = 'S' | 'M' | 'L'
export interface FrameLook { id: string; color: string; size: FrameSize }

export const PAL = {
  tomato:['#D7392E','Томат','Tomato'], cream:['#EDE4CF','Сливки','Cream'], powder:['#F08C9B','Пудра','Powder'], coal:['#2B2522','Уголь','Coal'],
  lemon:['#F2D23A','Лимон','Lemon'], mint:['#A6D9C4','Мята','Mint'], sky:['#AEC8E1','Небо','Sky'], lime:['#BBE07F','Салат','Lime'],
  cobalt:['#2F5BD0','Кобальт','Cobalt'], white:['#F6F5F1','Белый','White'],
}
export const colorName = k => (PAL[k] ? PAL[k][LANG === 'en' ? 2 : 1] : k)
// ach: the achievement that opens the frame (none = available from the start)
export const FR = [
  { id:'carved',  ru:'Резьба',  en:'Carved',  mood:['основательный','steady'],   base:[118,150], vars:['cream','mint','powder','sky'].map(k=>({k})) },
  { id:'arch',    ru:'Арка',    en:'Arch',    mood:['мечтатель','dreamer'],      base:[118,160], vars:['tomato','lime','cobalt','cream','lemon'].map(k=>({k})) },
  { id:'cameo',   ru:'Камея',   en:'Cameo',   mood:['благородный','noble'],      base:[118,152], vars:['powder','cream','sky','coal'].map(k=>({k})) },
  { id:'scallop', ru:'Фестон',  en:'Scallop', mood:['нежный','tender'],          base:[146,146], ach:'c_face',    achT:['Первое лицо','First face'], vars:[{k:'powder',edge:'#C8343F'},{k:'white',edge:'#2F5BD0'},{k:'mint',edge:'#2E8C76'},{k:'lemon',edge:'#E07A1E'}] },
  { id:'daisy',   ru:'Ромашка', en:'Daisy',   mood:['солнечный','sunny'],        base:[146,146], ach:'k_gen3',    achT:['Три колена','Three generations'], vars:[{k:'lime',stripe:'#B9CFE6',ring:'#E2B12C'},{k:'powder',stripe:'#9FD0DA',ring:'#C8343F'},{k:'sky',stripe:'#F7F6F2',ring:'#2F5BD0'},{k:'lemon',stripe:'#F6F2E4',ring:'#D7392E'}] },
  { id:'beads',   ru:'Бусины',  en:'Beads',   mood:['весёлый','cheerful'],       base:[124,156], ach:'k_15',      achT:['Пятнадцать','Fifteen'], vars:['cream','sky','mint','tomato','coal','lemon'].map(k=>({k})) },
  { id:'wave',    ru:'Волна',   en:'Wave',    mood:['неугомонный','restless'],   base:[124,156], ach:'r_move',    achT:['Первый переезд','First move'], vars:['lemon','tomato','coal','mint','cobalt'].map(k=>({k})) },
  { id:'knobby',  ru:'Капли',   en:'Drops',   mood:['своенравный','wayward'],    base:[124,150], ach:'c_gallery', achT:['Галерея','Gallery'], vars:['coal','tomato','cobalt','cream'].map(k=>({k})) },
]
export const FBY = Object.fromEntries(FR.map(F => [F.id, F]))
export const SZ = { S:.84, M:1, L:1.18 }
export const frameName = F => (LANG === 'en' ? F.en : F.ru)
export const frameMood = F => F.mood[LANG === 'en' ? 1 : 0]
export const frameAchName = F => (F.achT ? F.achT[LANG === 'en' ? 1 : 0] : '')
export const isOpen = F => !F.ach || (S.achievements || []).includes(F.ach)
export const varOf = (F, key) => F.vars.find(v => v.k === key) || F.vars[0]
export function frameDims(look: FrameLook) { const F = FBY[look.id] || FR[0], sc = SZ[look.size] || 1; return { w: F.base[0] * sc, h: F.base[1] * sc } }
/** SVG pieces for a portrait in a frame: defs (gradients, clip paths) and the drawing, sized w×h with the origin at the top-left. */
export function frameSvg(look: FrameLook, u: string, photo?: string) {
  const F = FBY[look.id] || FR[0], sc = SZ[look.size] || 1, w = F.base[0] * sc, h = F.base[1] * sc, v = varOf(F, look.color)
  const D = FRAMES[F.id](w, h, v, u, sc)
  const img = photo ? `<image href="${photo}" x="0" y="0" width="${f(w)}" height="${f(h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#c${u})"/>` : ''
  return { w, h, defs: D.defs + (D.extraDefs || '') + `<clipPath id="c${u}">${D.clip}</clipPath>`, body: D.back + `<rect width="${f(w)}" height="${f(h)}" fill="#2a3044" clip-path="url(#c${u})"/>` + img + D.over }
}

// ---------- colour helpers ----------
const f = n => (Math.round(n * 10) / 10).toString();
function toHsl(hex){ const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b); let h=0,s=0; const l=(mx+mn)/2; if(mx!==mn){ const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn); h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4; h/=6 } return [h,s,l] }
function toHex([h,s,l]){ const k=n=>(n+h*12)%12, a=s*Math.min(l,1-l), c=n=>l-a*Math.max(-1,Math.min(k(n)-3,9-k(n),1)); return '#'+[0,8,4].map(n=>Math.round(c(n)*255).toString(16).padStart(2,'0')).join('') }
const tone = (c, d) => { const [h,s,l] = toHsl(c); return toHex([h, s, Math.max(0, Math.min(1, l + d))]) };
const gloss = (u, c) => `<radialGradient id="g${u}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${tone(c,.2)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${tone(c,-.17)}"/></radialGradient>`;
const bevel = (u, c) => `<linearGradient id="l${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tone(c,.1)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${tone(c,-.14)}"/></linearGradient>`;
const ell = (cx, cy, rx, ry) => `M${f(cx-rx)},${f(cy)}a${f(rx)},${f(ry)} 0 1,0 ${f(2*rx)},0a${f(rx)},${f(ry)} 0 1,0 ${f(-2*rx)},0Z`;
const rectP = (x, y, w, h) => `M${f(x)},${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
// walk a rectangle's outline; cb(x, y, nx, ny, d) with the outward normal
function perimeter(x0, y0, W, H, step, cb){ const P = 2*(W+H); for(let d = 0; d < P; d += step){ let x,y,nx,ny; if(d<W){x=x0+d;y=y0;nx=0;ny=-1} else if(d<W+H){x=x0+W;y=y0+d-W;nx=1;ny=0} else if(d<2*W+H){x=x0+W-(d-W-H);y=y0+H;nx=0;ny=1} else {x=x0;y=y0+H-(d-2*W-H);nx=-1;ny=0} cb(x,y,nx,ny,d) } return P }

// ---------- the eight frames: each returns defs, back (under photo), clip (photo window), over (on top) ----------
const FRAMES = {
  beads(w,h,v,u,s){ const c=PAL[v.k][0], r=10*s, x0=r, y0=r, x1=w-r, y1=h-r, pts=[];
    const nx=Math.max(2,Math.round((x1-x0)/(2*r*.95))), ny=Math.max(2,Math.round((y1-y0)/(2*r*.95)));
    for(let i=0;i<=nx;i++){ const x=x0+(x1-x0)*i/nx; pts.push([x,y0],[x,y1]) }
    for(let j=1;j<ny;j++){ const y=y0+(y1-y0)*j/ny; pts.push([x0,y],[x1,y]) }
    const i=r*1.2;
    return { defs:gloss(u,c), back:'', clip:`<rect x="${f(i)}" y="${f(i)}" width="${f(w-2*i)}" height="${f(h-2*i)}"/>`,
      over: pts.map(([x,y])=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#g${u})"/>`).join('') } },
  wave(w,h,v,u,s){ const c=PAL[v.k][0], t=9*s, a=3.4*s, sw=11*s, W=w-2*t, H=h-2*t; const P=2*(W+H), lam=P/Math.round(P/(12*s)); const pts=[];
    perimeter(t,t,W,H,1.2,(x,y,nx,ny,d)=>{ const o=a*Math.sin(2*Math.PI*d/lam); pts.push(f(x+nx*o)+','+f(y+ny*o)) });
    const d='M'+pts.join('L')+'Z';
    return { defs:'', back:'', clip:rectP(t,t,W,H).replace(/^/,'<path d="')+'"/>',
      over:`<path d="${d}" fill="none" stroke="${tone(c,-.25)}" stroke-width="${f(sw)}" stroke-linejoin="round" opacity=".45" transform="translate(${f(1.2*s)},${f(1.8*s)})"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${f(sw)}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${tone(c,.18)}" stroke-width="${f(sw*.32)}" stroke-linejoin="round" opacity=".85" transform="translate(${f(-.8*s)},${f(-1*s)})"/>` } },
  scallop(w,h,v,u,s){ const c=PAL[v.k][0], cx=w/2, cy=h/2, R=w/2-4*s, A=7.5*s, n=14, rw=R*.58;
    const shape=Rr=>{ let p=''; for(let k=0;k<=240;k++){ const th=k/240*2*Math.PI, r=Rr-A+A*Math.abs(Math.cos(n*th/2)); p+=(k?'L':'M')+f(cx+r*Math.cos(th))+','+f(cy+r*Math.sin(th)) } return p+'Z' };
    return { defs:'', back:`<path d="${shape(R+3*s)}" fill="${v.edge}" transform="translate(0,${f(2.2*s)})"/><path d="${shape(R)}" fill="${c}"/>`,
      clip:`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rw)}"/>`, over:`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rw)}" fill="none" stroke="${tone(c,-.18)}" stroke-width="${f(1.6*s)}"/>` } },
  daisy(w,h,v,u,s){ const c=PAL[v.k][0], cx=w/2, cy=h/2, R=w/2-2*s, rw=R*.5; let fl=''; for(let k=0;k<=240;k++){ const th=k/240*2*Math.PI, r=R*.8+R*.065*Math.cos(6*th); fl+=(k?'L':'M')+f(cx+r*Math.cos(th))+','+f(cy+r*Math.sin(th)) } fl+='Z';
    let wedges=''; const N=32; for(let k=0;k<N;k++){ const a0=k/N*2*Math.PI, a1=(k+1)/N*2*Math.PI; wedges+=`<path d="M${f(cx)},${f(cy)}L${f(cx+R*Math.cos(a0))},${f(cy+R*Math.sin(a0))}L${f(cx+R*Math.cos(a1))},${f(cy+R*Math.sin(a1))}Z" fill="${k%2?v.stripe:'#FBFAF6'}"/>` }
    return { defs:`<clipPath id="fl${u}"><path d="${fl}"/></clipPath>`,
      back:`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="${c}" stroke="${tone(c,-.12)}" stroke-width="1"/><g clip-path="url(#fl${u})">${wedges}</g>`,
      clip:`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rw)}"/>`, over:`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rw+1.5*s)}" fill="none" stroke="${v.ring}" stroke-width="${f(3.4*s)}"/>` } },
  knobby(w,h,v,u,s){ const c=PAL[v.k][0], t=10*s, W=w-2*t, H=h-2*t, P=2*(W+H), n=2*Math.round(P/(2*9.2*s)), sp=P/n; let beads=''; let k=0;
    perimeter(t,t,W,H,sp,(x,y)=>{ const r=(k++%2?6:9.6)*s; beads+=`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#g${u})"/>` });
    const i=t+3*s;
    return { defs:gloss(u,c), back:'', clip:`<rect x="${f(i)}" y="${f(i)}" width="${f(w-2*i)}" height="${f(h-2*i)}"/>`,
      over:`<rect x="${f(t)}" y="${f(t)}" width="${f(W)}" height="${f(H)}" fill="none" stroke="${tone(c,-.06)}" stroke-width="${f(8*s)}"/>`+beads } },
  carved(w,h,v,u,s){ const c=PAL[v.k][0], b=17*s; let arcs=''; const st=8.5*s;
    const side=(x0,y0,dx,dy,nx,ny,len)=>{ const n=Math.max(1,Math.round(len/st)), step=len/n; for(let k=0;k<n;k++){ const px=x0+dx*step*k+nx*b*.12, py=y0+dy*step*k+ny*b*.12, ex=px+dx*step, ey=py+dy*step, qx=(px+ex)/2+nx*b*.75, qy=(py+ey)/2+ny*b*.75;
      arcs+=`<path d="M${f(px)},${f(py)}Q${f(qx)},${f(qy)} ${f(ex)},${f(ey)}" fill="none" stroke="${tone(c,-.17)}" stroke-width="${f(1.1*s)}"/><path d="M${f(px+.8)},${f(py+.8)}Q${f(qx+.8)},${f(qy+.8)} ${f(ex+.8)},${f(ey+.8)}" fill="none" stroke="${tone(c,.12)}" stroke-width="${f(.8*s)}" opacity=".8"/>` } };
    side(b*.4,0,1,0,0,1,w-b*.8); side(b*.4,h,1,0,0,-1,w-b*.8); side(0,b*.4,0,1,1,0,h-b*.8); side(w,b*.4,0,1,-1,0,h-b*.8);
    return { defs:bevel(u,c), back:'', clip:`<rect x="${f(b)}" y="${f(b)}" width="${f(w-2*b)}" height="${f(h-2*b)}"/>`,
      over:`<path d="${rectP(0,0,w,h)}${rectP(b,b,w-2*b,h-2*b)}" fill="url(#l${u})" fill-rule="evenodd" stroke="${tone(c,-.18)}" stroke-width="1"/><g clip-path="url(#cb${u})">${arcs}</g><rect x="${f(b)}" y="${f(b)}" width="${f(w-2*b)}" height="${f(h-2*b)}" fill="none" stroke="${tone(c,-.32)}" stroke-width="${f(1.6*s)}"/>`,
      extraDefs:`<clipPath id="cb${u}"><path d="${rectP(0,0,w,h)}${rectP(b,b,w-2*b,h-2*b)}" clip-rule="evenodd"/></clipPath>` } },
  cameo(w,h,v,u,s){ const c=PAL[v.k][0], cx=w/2, cy=h/2, RX=w/2-2*s, RY=h/2-2*s, rx=RX*.7, ry=RY*.74; let pearls=''; const N=24;
    for(let k=0;k<N;k++){ const th=k/N*2*Math.PI; pearls+=`<circle cx="${f(cx+(rx+RX)/2*Math.cos(th))}" cy="${f(cy+(ry+RY)/2*Math.sin(th))}" r="${f(2.4*s)}" fill="${tone(c,.26)}" stroke="${tone(c,-.16)}" stroke-width=".5"/>` }
    return { defs:gloss(u,c), back:'', clip:`<path d="${ell(cx,cy,rx,ry)}"/>`,
      over:`<path d="${ell(cx,cy,RX,RY)}${ell(cx,cy,rx,ry)}" fill="url(#g${u})" fill-rule="evenodd"/>${pearls}<path d="${ell(cx,cy,rx+1.4*s,ry+1.4*s)}" fill="none" stroke="#D4AE55" stroke-width="${f(1.6*s)}"/>` } },
  arch(w,h,v,u,s){ const c=PAL[v.k][0], b=14*s, R=w/2;
    const ap=(i)=>`M${f(i)},${f(h-i)}L${f(i)},${f(R)}A${f(R-i)},${f(R-i)} 0 0 1 ${f(w-i)},${f(R)}L${f(w-i)},${f(h-i)}Z`;
    return { defs:bevel(u,c), back:'', clip:`<path d="${ap(b)}"/>`,
      over:`<path d="${ap(0)}${ap(b)}" fill="url(#l${u})" fill-rule="evenodd" stroke="${tone(c,-.16)}" stroke-width="1"/><path d="${ap(b*.5)}" fill="none" stroke="${tone(c,.24)}" stroke-width="${f(1.1*s)}" opacity=".9"/><circle cx="${f(R)}" cy="${f(b*.5)}" r="${f(3.4*s)}" fill="${tone(c,-.2)}"/>` } },
};

