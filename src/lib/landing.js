// @ts-nocheck — framework-free landing, mounted by components/Onboarding.tsx
// Landing.mount(rootEl, { gsap, ScrollTrigger, lang, world, sky, logo, hasData, onStart, onBrand, onLang }) → destroy().
// Screens: 1 hero collage · 2 tabs with real app pages · 3 app snippets · 4 family app on a phone · 5 planet CTA.
// Smooth scrolling inside the #landing container comes from Lenis (vendored, lib/vendor/lenis.mjs) and drives GSAP ScrollTrigger.
import Lenis from './vendor/lenis.mjs'
import progressShot from '../assets/landing-progress.jpg'

export const Landing = (() => {
const TXT = {
  ru: { from:'из', l1:'Мои предки', sub:'Семейное древо, карта переездов и ИИ-архивариус, который превращает бабушкины рассказы в карточки', hint:'Листайте', open:'Открыть приложение',
    s1eye:'Как это работает', s1h:'Всё, что вы знаете о семье, — в одном живом древе',
    st:[['Соберите древо','Добавляйте родителей, детей и супругов прямо с карточки. Древо само раскладывается по поколениям.'],
        ['Заполните короткую анкету','Фото лица, пара документов, даты и одна история. Никаких длинных форм — прогресс виден сразу.'],
        ['Увидьте путь семьи','Переезды складываются в карту: откуда уехали прадеды и куда разлетелись внуки.']],
    s2eye:'ИИ-архивариус', s2h:'Вставьте рассказ — получите карточки', raw:'Расшифровка · бабушка_Зина.m4a · 04:12',
    story:'Моя прабабушка <mark data-k="n1">Зинаида Орлова</mark> родилась в <mark data-k="y1">1912</mark> году в <mark data-k="p1">Казани</mark>. В 1934 году вышла замуж за <mark data-k="n2">Георгия</mark>, врача из <mark data-k="p2">Саратова</mark>. Перед войной, в <mark data-k="y3">1939</mark>, они переехали в <mark data-k="m1">Свердловск</mark>, а в 1950 вся семья перебралась в Москву.',
    f:{name:'Имя',birth:'Рождение',place:'Место',move:'Переезд'}, ok:'в древе',
    ctaH:'Соберите древо своей семьи за 15 минут', ctaP:'Начните с себя и шаг за шагом добавьте родных. Древо сохранится в вашем аккаунте.',
    sample:'Открыть пример семьи', blank:'Начать с себя', note:'Бесплатно · без регистрации · прототип',
    caps:{A:'Письмо · 1979',B:'Билет · 1941',C:'Семейная плёнка · 1987',D:'Поколения',E:'Сочи · 1976',F:'Карта переездов',G:'Древо',H:'Свидетельство о рождении',I:'Запись голоса',J:'Где живёт семья',K:'Архивариус нашёл',L:'Predki'},
    letter:['Дорогая Наташа!','Пишу тебе из Иркутска,','куда мы с Павлом переехали','после института. Алёша','родился здесь, в 1982-м.','Мама передаёт привет…'],
    doc:['СВИДЕТЕЛЬСТВО О РОЖДЕНИИ','Смирнов Илья Матвеевич','родился 14 сентября 1946 г.','г. Челябинск','отец: Смирнов Матвей Егорович','мать: Смирнова Евдокия Прохоровна'],
    chips:[['Зинаида Орлова','1912 · Казань'],['Георгий Орлов','1908 · Саратов'],['Лидия Соколова','1941 · Свердловск'],['Переезд','1950 · Москва']],
    ticket:['МОСКВА','ТАШКЕНТ','вагон 7 · место 23'],
  },
  en: { from:'from', l1:'My ancestors are', sub:'A family tree, a map of moves, and an AI archivist that turns grandma’s stories into cards', hint:'Scroll', open:'Open the app',
    s1eye:'How it works', s1h:'Everything you know about your family, in one living tree',
    st:[['Build the tree','Add parents, children and spouses right from a card. The tree lays itself out by generation.'],
        ['Fill a short profile','A face photo, a couple of documents, dates and one story. No long forms — progress shows at once.'],
        ['See the family’s journey','Moves become a map: where great-grandparents left from and where the grandchildren scattered.']],
    s2eye:'AI archivist', s2h:'Paste a story — get cards back', raw:'Transcript · grandma_Zina.m4a · 04:12',
    story:'My great-grandmother <mark data-k="n1">Zinaida Orlova</mark> was born in <mark data-k="y1">1912</mark> in <mark data-k="p1">Kazan</mark>. In 1934 she married <mark data-k="n2">Georgy</mark>, a doctor from <mark data-k="p2">Saratov</mark>. Before the war, in <mark data-k="y3">1939</mark>, they moved to <mark data-k="m1">Sverdlovsk</mark>, and in 1950 the whole family settled in Moscow.',
    f:{name:'Name',birth:'Born',place:'Place',move:'Move'}, ok:'in the tree',
    ctaH:'Build your family tree in 15 minutes', ctaP:'Start with yourself and add your relatives step by step. Your tree is saved to your account.',
    sample:'Open the sample family', blank:'Start with me', note:'Free · no sign-up · prototype',
    caps:{A:'Letter · 1979',B:'Ticket · 1941',C:'Home movie · 1987',D:'Generations',E:'Sochi · 1976',F:'Map of moves',G:'Tree',H:'Birth certificate',I:'Voice memo',J:'Where the family lives',K:'Archivist found',L:'Predki'},
    letter:['Dear Natasha!','I’m writing from Irkutsk,','where Pavel and I moved','after university. Alyosha','was born here in 1982.','Mum sends her love…'],
    doc:['BIRTH CERTIFICATE','Ilya Matveyevich Smirnov','born 14 September 1946','Chelyabinsk','father: Matvey Smirnov','mother: Evdokia Smirnova'],
    chips:[['Zinaida Orlova','1912 · Kazan'],['Georgy Orlov','1908 · Saratov'],['Lidia Sokolova','1941 · Sverdlovsk'],['Move','1950 · Moscow']],
    ticket:['MOSCOW','TASHKENT','car 7 · seat 23'],
  }
};

// Cities: [ru genitive, en, lat, lon, landing style]
const CITIES = [
  ['Ташкента','Tashkent',41.30,69.24,{f:'Yeseva One',s:1}],
  ['Москвы','Moscow',55.75,37.62,{f:'Ruslan Display',s:.92}],
  ['Токио','Tokyo',35.68,139.69,{f:'Rubik Mono One',s:.74}],
  ['Читы','Chita',52.03,113.50,{f:'Caveat',w:700,s:1.28}],
  ['Берлина','Berlin',52.52,13.41,{f:'Playfair Display',w:800,i:1,s:1}],
  ['Пензы','Penza',53.20,45.00,{f:'Press Start 2P',s:.5}],
  ['Риги','Riga',56.95,24.11,{f:'Old Standard TT',i:1,s:1.08}],
  ['Казани','Kazan',55.79,49.12,{f:'Unbounded',w:700,s:.8,ol:1}],
  ['Одессы','Odesa',46.48,30.73,{f:'Lobster',s:1.04}],
  ['Харбина','Harbin',45.80,126.53,{f:'Stalinist One',s:.6}],
  ['Тбилиси','Tbilisi',41.72,44.79,{f:'Marck Script',s:1.12}],
  ['Нью-Йорка','New York',40.71,-74.01,{f:'Oswald',w:600,s:1.02,u:1}],
];
// flicker pool (VOX-style interstitial frames)
const POOL = [
  {f:'Playfair Display',w:800,s:1},{f:'Unbounded',w:700,s:.8},{f:'Rubik Mono One',s:.74},{f:'Russo One',s:.92},{f:'Yeseva One',s:1},
  {f:'Lobster',s:1.04},{f:'Caveat',w:700,s:1.28},{f:'Press Start 2P',s:.5},{f:'Oswald',w:600,s:1.02,u:1},{f:'Amatic SC',w:700,s:1.3},
  {f:'Old Standard TT',i:1,s:1.08},{f:'Rubik Glitch',s:.84},{f:'Pacifico',s:.84},{f:'Comfortaa',w:700,s:.9},{f:'Kelly Slab',s:1},{f:'Stalinist One',s:.6},
  {f:'Playfair Display',w:800,i:1,s:1,hl:1},{f:'Unbounded',w:700,s:.8,ol:1},{f:'Russo One',s:.92,hl:1},{f:'Ruslan Display',s:.92},
];

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const icoCheck='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const brandMark='<span class="brand-mark"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1A1206" stroke-width="1.8" stroke-linecap="round"><path d="M8 14V7M8 7c0-3 2-5 5-5-0 3-2 5-5 5zM8 9C8 6.5 6.3 5 3.5 5 3.5 7.5 5.2 9 8 9z"/></svg></span>';
function applyStyle(el,st){ el.style.fontFamily=`"${st.f}",var(--f-display)`; el.style.fontWeight=st.w||400; el.style.fontStyle=st.i?'italic':'normal'; el.style.fontSize=(st.s||1)+'em'; el.style.textTransform=st.u?'uppercase':'none'; el.style.letterSpacing=st.f==='Press Start 2P'?'-.02em':st.f==='Oswald'?'-.01em':'-.01em'; el.classList.toggle('hl',!!st.hl); el.classList.toggle('ol',!!st.ol); }

// ---------------- tiles: each one is a tiny "home video" drawn on canvas ----------------
function seeded(n){ let s=n; return ()=>{ s=(s*16807)%2147483647; return s/2147483647; }; }
function makeTiles(T,world,state){
  const W=(c)=>c.width, H=(c)=>c.height;
  const worldPath=world?new Path2D(world):null;
  const proj=(lat,lon)=>[(lon+180)/360*1000,(90-lat)/180*500];
  const film=(ctx,c,t,a)=>{ // vignette + light flicker = "footage"
    const g=ctx.createRadialGradient(W(c)/2,H(c)/2,Math.min(W(c),H(c))*.25,W(c)/2,H(c)/2,Math.max(W(c),H(c))*.75); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,`rgba(0,0,0,${a||.55})`); ctx.fillStyle=g; ctx.fillRect(0,0,W(c),H(c));
    ctx.fillStyle=`rgba(255,240,220,${.02+.02*Math.sin(t*17)})`; ctx.fillRect(0,0,W(c),H(c)); };
  const cam=(ctx,c,t,amt)=>{ const k=1.06+.03*Math.sin(t*.25); ctx.translate(W(c)/2+Math.sin(t*.7)*amt,H(c)/2+Math.cos(t*.53)*amt); ctx.scale(k,k); ctx.translate(-W(c)/2,-H(c)/2); };
  return {
    A:{light:1,draw(ctx,c,t,d){ // handwritten letter
      ctx.save(); cam(ctx,c,t,3*d); ctx.fillStyle='#E8DCC2'; ctx.fillRect(-20,-20,W(c)+40,H(c)+40);
      ctx.strokeStyle='rgba(90,110,160,.18)'; ctx.lineWidth=1*d; const lh=Math.max(22*d,H(c)/9); for(let y=lh*1.5;y<H(c)+lh;y+=lh){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W(c),y); ctx.stroke(); }
      const cycle=(t%16)/12; const total=T.letter.join('').length; let n=Math.floor(Math.min(1,cycle)*total);
      ctx.fillStyle='#23305E'; ctx.font=`500 ${lh*.78}px "Caveat",cursive`; T.letter.forEach((ln,i)=>{ const s=ln.slice(0,Math.max(0,n)); n-=ln.length; ctx.fillText(s,lh*.7,lh*2.35+i*lh); });
      ctx.restore(); film(ctx,c,t,.35); }},
    B:{light:1,draw(ctx,c,t,d){ // train ticket
      ctx.save(); cam(ctx,c,t,4*d); ctx.fillStyle='#2F4B3F'; ctx.fillRect(-20,-20,W(c)+40,H(c)+40);
      const w=W(c)*.84,h=H(c)*.62,x=(W(c)-w)/2,y=(H(c)-h)/2; ctx.translate(W(c)/2,H(c)/2); ctx.rotate(-.06+.02*Math.sin(t*.4)); ctx.translate(-W(c)/2,-H(c)/2);
      ctx.fillStyle='#EFE3C4'; ctx.fillRect(x,y,w,h); ctx.fillStyle='#2F4B3F'; for(let i=0;i<9;i++){ ctx.beginPath(); ctx.arc(x+w*.72,y+h*(i+.5)/9,2.2*d,0,6.3); ctx.fill(); }
      ctx.fillStyle='#8C2F24'; ctx.font=`700 ${h*.2}px "Oswald",sans-serif`; ctx.fillText(T.ticket[0],x+w*.06,y+h*.32); ctx.fillText('→ '+T.ticket[1],x+w*.06,y+h*.58);
      ctx.fillStyle='#3A3428'; ctx.font=`500 ${h*.1}px "JetBrains Mono",monospace`; ctx.fillText(T.ticket[2],x+w*.06,y+h*.84); ctx.font=`700 ${h*.26}px "Oswald",sans-serif`; ctx.save(); ctx.translate(x+w*.87,y+h*.5); ctx.rotate(-Math.PI/2); ctx.textAlign='center'; ctx.fillText('1941',0,h*.09); ctx.restore();
      ctx.restore(); film(ctx,c,t,.5); }},
    C:{draw(ctx,c,t,d){ // home movie: warm bokeh + timecode
      const g=ctx.createLinearGradient(0,0,W(c),H(c)); g.addColorStop(0,'#3B1A2E'); g.addColorStop(.55,'#B4502D'); g.addColorStop(1,'#F2B45A'); ctx.fillStyle=g; ctx.fillRect(0,0,W(c),H(c));
      const R=seeded(7); for(let i=0;i<18;i++){ const x=(R()*W(c)+Math.sin(t*.3+i)*30*d)%W(c), y=(R()*H(c)+Math.cos(t*.25+i*2)*24*d), r=(10+R()*38)*d; const gg=ctx.createRadialGradient(x,y,0,x,y,r); gg.addColorStop(0,`rgba(255,${200+R()*55|0},${150+R()*80|0},${.35+R()*.3})`); gg.addColorStop(1,'rgba(255,220,180,0)'); ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(x,y,r,0,6.3); ctx.fill(); }
      // silhouette of a window frame for depth
      ctx.fillStyle='rgba(20,8,14,.55)'; ctx.fillRect(W(c)*.62,0,W(c)*.04,H(c)); ctx.fillRect(0,H(c)*.38,W(c),H(c)*.03);
      ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font=`500 ${11*d}px "JetBrains Mono",monospace`; const s=Math.floor(t)%60, f=Math.floor(t*24)%24; ctx.fillText(`● REC  00:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`,10*d,20*d);
      film(ctx,c,t,.6); }},
    D:{draw(ctx,c,t,d){ // generations counter
      ctx.fillStyle='#1C2A6B'; ctx.fillRect(0,0,W(c),H(c)); const y0=1898, y=Math.floor(y0+((t*9)%(2026-y0)));
      ctx.fillStyle='rgba(255,255,255,.1)'; ctx.font=`600 ${H(c)*.9}px "Oswald",sans-serif`; ctx.textAlign='center'; ctx.fillText(String(y).slice(0,2),W(c)/2,H(c)*.86);
      ctx.fillStyle='#F2C879'; ctx.font=`600 ${Math.min(W(c)*.32,H(c)*.55)}px "Oswald",sans-serif`; ctx.fillText(String(y),W(c)/2,H(c)*.66); ctx.textAlign='left'; film(ctx,c,t,.45); }},
    E:{draw(ctx,c,t,d){ // polaroid developing: seaside sunset
      ctx.fillStyle='#EDEAE3'; ctx.fillRect(0,0,W(c),H(c)); const m=Math.min(W(c),H(c))*.07, pw=W(c)-m*2, ph=H(c)-m*3.2;
      ctx.save(); ctx.beginPath(); ctx.rect(m,m,pw,ph); ctx.clip(); const hz=m+ph*.58;
      let g=ctx.createLinearGradient(0,m,0,hz); g.addColorStop(0,'#274C7A'); g.addColorStop(.6,'#E58A5B'); g.addColorStop(1,'#F6C27A'); ctx.fillStyle=g; ctx.fillRect(m,m,pw,ph);
      const sx=m+pw*.5, sy=hz-ph*.05+Math.sin(t*.2)*2*d; ctx.fillStyle='#FFE6B0'; ctx.beginPath(); ctx.arc(sx,sy,ph*.09,0,6.3); ctx.fill();
      g=ctx.createLinearGradient(0,hz,0,m+ph); g.addColorStop(0,'#2E5F86'); g.addColorStop(1,'#12304C'); ctx.fillStyle=g; ctx.fillRect(m,hz,pw,ph);
      for(let i=0;i<14;i++){ const yy=hz+i*ph*.03+2*d, ww=pw*.18*(1-i/16)*(1+.2*Math.sin(t*1.5+i)); ctx.fillStyle=`rgba(255,220,160,${.55-i*.035})`; ctx.fillRect(sx-ww/2+Math.sin(t+i)*4*d,yy,ww,1.6*d); }
      const dev=Math.min(1,(t%14)/5); ctx.fillStyle=`rgba(200,196,188,${1-dev})`; ctx.fillRect(m,m,pw,ph); ctx.restore();
      ctx.fillStyle='#3B3A50'; ctx.font=`500 ${m*1.1}px "Caveat",cursive`; ctx.fillText(T.caps.E,m*1.2,H(c)-m*.9); }},
    F:{draw(ctx,c,t,d){ // migration map, follows the hero word
      ctx.fillStyle='#0B1526'; ctx.fillRect(0,0,W(c),H(c)); if(!worldPath) return;
      const sc=Math.max(W(c),H(c))/300; const cur=proj(CITIES[state.idx][2],CITIES[state.idx][3]);
      if(!state.cam) state.cam={x:cur[0],y:cur[1]}; state.cam.x+=(cur[0]-state.cam.x)*.06; state.cam.y+=(cur[1]-state.cam.y)*.06;
      const ox=W(c)/2-state.cam.x*sc, oy=H(c)*.55-state.cam.y*sc;
      ctx.save(); ctx.translate(ox,oy); ctx.scale(sc,sc); ctx.fillStyle='#1B2C48'; ctx.fill(worldPath); ctx.strokeStyle='rgba(140,170,220,.35)'; ctx.lineWidth=.6/sc*d; ctx.stroke(worldPath); ctx.restore();
      const P=(ci)=>{ const [x,y]=proj(CITIES[ci][2],CITIES[ci][3]); return [x*sc+ox,y*sc+oy]; };
      const path=state.path; const k=Math.min(1,(t-state.pathT)/1.1);
      ctx.lineWidth=2*d; ctx.lineCap='round';
      for(let i=0;i<path.length-1;i++){ const [ax,ay]=P(path[i]),[bx,by]=P(path[i+1]); const last=i===path.length-2; const kk=last?k:1; const mx=(ax+bx)/2,my=(ay+by)/2-Math.hypot(bx-ax,by-ay)*.25;
        ctx.strokeStyle=last?'#F2C879':'rgba(242,200,121,.35)'; ctx.beginPath(); ctx.moveTo(ax,ay); const steps=24; for(let s=1;s<=steps*kk;s++){ const u=s/steps; ctx.lineTo((1-u)*(1-u)*ax+2*(1-u)*u*mx+u*u*bx,(1-u)*(1-u)*ay+2*(1-u)*u*my+u*u*by); } ctx.stroke(); }
      path.forEach((ci,i)=>{ const [x,y]=P(ci); const cur=i===path.length-1; ctx.fillStyle=cur?'#F2C879':'rgba(242,200,121,.55)'; ctx.beginPath(); ctx.arc(x,y,(cur?4:2.5)*d,0,6.3); ctx.fill();
        if(cur){ const pr=(t*1.2)%1; ctx.strokeStyle=`rgba(242,200,121,${1-pr})`; ctx.lineWidth=1.5*d; ctx.beginPath(); ctx.arc(x,y,(4+pr*16)*d,0,6.3); ctx.stroke(); ctx.fillStyle='#fff'; ctx.font=`500 ${12*d}px "Onest",sans-serif`; ctx.fillText(state.cityName(ci),x+9*d,y-8*d); } });
      film(ctx,c,t,.4); }},
    G:{light:1,draw(ctx,c,t,d){ // tree growing
      ctx.fillStyle='#EFE9DD'; ctx.fillRect(0,0,W(c),H(c)); const cyc=(t%9)/6, e=x=>Math.min(1,Math.max(0,x));
      const n=[[.5,.16],[.26,.46],[.74,.46],[.13,.8],[.39,.8],[.61,.8],[.87,.8]], L=[[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]];
      ctx.lineWidth=1.6*d; ctx.strokeStyle='#8B7B5C'; L.forEach(([a,b],i)=>{ const k=e(cyc*3-.3-i*.15); if(!k) return; const [ax,ay]=[n[a][0]*W(c),n[a][1]*H(c)],[bx,by]=[n[b][0]*W(c),n[b][1]*H(c)]; ctx.beginPath(); ctx.moveTo(ax,ay); const my=(ay+by)/2; ctx.bezierCurveTo(ax,my,bx,my,ax+(bx-ax)*k,ay+(by-ay)*k); ctx.stroke(); });
      n.forEach(([x,y],i)=>{ const k=e(cyc*3-i*.28); if(!k) return; const r=Math.min(W(c),H(c))*.07*k; ctx.fillStyle=i===0?'#C8963E':'#FBF8F1'; ctx.strokeStyle='#8B7B5C'; ctx.lineWidth=1.4*d; ctx.beginPath(); ctx.arc(x*W(c),y*H(c),r,0,6.3); ctx.fill(); ctx.stroke(); });
      film(ctx,c,t,.25); }},
    H:{light:1,draw(ctx,c,t,d){ // document typing + stamp
      ctx.save(); cam(ctx,c,t,2*d); ctx.fillStyle='#D5DCE0'; ctx.fillRect(-20,-20,W(c)+40,H(c)+40);
      ctx.strokeStyle='rgba(60,80,110,.35)'; ctx.lineWidth=2*d; ctx.strokeRect(10*d,10*d,W(c)-20*d,H(c)-20*d);
      const fs=Math.min(W(c)/19,15*d); const cyc=(t%12)/8; const total=T.doc.join('').length; let n=Math.floor(Math.min(1,cyc)*total);
      T.doc.forEach((ln,i)=>{ ctx.fillStyle=i===0?'#1E2B45':'#2E3A52'; ctx.font=i===0?`700 ${fs*1.02}px "Old Standard TT",serif`:`400 ${fs*.86}px "JetBrains Mono",monospace`; const s=ln.slice(0,Math.max(0,n)); n-=ln.length; ctx.fillText(s,22*d,30*d+fs*1.3+i*fs*1.9); });
      if(cyc>1){ const k=Math.min(1,(cyc-1)*4); ctx.save(); ctx.translate(W(c)*.72,H(c)*.72); ctx.rotate(-.35); ctx.scale(1.6-.6*k,1.6-.6*k); ctx.globalAlpha=k*.85; ctx.strokeStyle='#8E2E3B'; ctx.lineWidth=3*d; const r=Math.min(W(c),H(c))*.16; ctx.beginPath(); ctx.arc(0,0,r,0,6.3); ctx.stroke(); ctx.beginPath(); ctx.arc(0,0,r*.72,0,6.3); ctx.stroke(); ctx.fillStyle='#8E2E3B'; ctx.font=`700 ${r*.3}px "Oswald",sans-serif`; ctx.textAlign='center'; ctx.fillText('ЗАГС',0,r*.1); ctx.restore(); }
      ctx.restore(); film(ctx,c,t,.35); }},
    I:{draw(ctx,c,t,d){ // voice memo waveform
      ctx.fillStyle='#0E3B3A'; ctx.fillRect(0,0,W(c),H(c)); const bars=Math.floor(W(c)/(6*d)), mid=H(c)*.5, R=seeded(3); const ph=(t*.08)%1;
      for(let i=0;i<bars;i++){ const u=i/bars; const a=(.2+.8*Math.abs(Math.sin(u*9+R()*3)*Math.sin(u*23+t*.6)))*H(c)*.32; ctx.fillStyle=u<ph?'#7FE0C4':'rgba(127,224,196,.3)'; ctx.fillRect(i*6*d,mid-a,3.2*d,a*2); }
      ctx.fillStyle='#fff'; ctx.fillRect(ph*W(c),H(c)*.12,1.5*d,H(c)*.76); film(ctx,c,t,.45); }},
    J:{draw(ctx,c,t,d){ // dotted globe
      ctx.fillStyle='#05070C'; ctx.fillRect(0,0,W(c),H(c)); const r=Math.min(W(c),H(c))*.4, cx=W(c)/2, cy=H(c)/2; const rot=t*.25;
      for(let la=-80;la<=80;la+=10) for(let lo=0;lo<360;lo+=10){ const L=(lo*Math.PI/180)+rot, A=la*Math.PI/180; const x=Math.cos(A)*Math.sin(L), z=Math.cos(A)*Math.cos(L), y=Math.sin(A); if(z<0) continue; ctx.fillStyle=`rgba(170,200,255,${.15+.5*z})`; ctx.fillRect(cx+x*r,cy-y*r,1.4*d,1.4*d); }
      CITIES.forEach(([,,la,lo],i)=>{ const L=(lo*Math.PI/180)+rot, A=la*Math.PI/180; const x=Math.cos(A)*Math.sin(L), z=Math.cos(A)*Math.cos(L), y=Math.sin(A); if(z<.05) return; const on=i===state.idx; ctx.fillStyle=on?'#F2C879':'rgba(242,200,121,.6)'; ctx.beginPath(); ctx.arc(cx+x*r,cy-y*r,(on?3.5:2)*d,0,6.3); ctx.fill(); });
      ctx.strokeStyle='rgba(170,200,255,.25)'; ctx.lineWidth=1*d; ctx.beginPath(); ctx.arc(cx,cy,r,0,6.3); ctx.stroke(); }},
    K:{draw(ctx,c,t,d){ // archivist chips
      ctx.fillStyle='#171126'; ctx.fillRect(0,0,W(c),H(c)); const cyc=(t%10)/7; const fs=Math.max(10*d,Math.min(15*d,H(c)*.075)); const y0K=H(c)*.18; ctx.font=`600 ${fs}px "Onest",sans-serif`;
      let x=14*d,y=y0K; T.chips.forEach(([a,b],i)=>{ const k=Math.min(1,Math.max(0,cyc*4-i)); if(!k) return; const txt=a+'  '+b; const w=ctx.measureText(txt).width+28*d, h=fs*2.1; if(x+w>W(c)-10*d){ x=14*d; y+=h+10*d; } if(y+h>H(c)-24*d) return;
        ctx.globalAlpha=k; ctx.fillStyle='rgba(242,200,121,.14)'; ctx.strokeStyle='rgba(242,200,121,.6)'; ctx.lineWidth=1*d; const yy=y+(1-k)*10*d; ctx.beginPath(); ctx.roundRect(x,yy,w,h,h/2); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#F2C879'; ctx.fillText(a,x+14*d,yy+h*.66); ctx.fillStyle='rgba(255,255,255,.7)'; ctx.fillText(b,x+14*d+ctx.measureText(a+'  ').width,yy+h*.66); ctx.globalAlpha=1; x+=w+10*d; });
      film(ctx,c,t,.4); }},
    L:{draw(ctx,c,t,d){ // astral sky — the app itself
      ctx.fillStyle='#07090F'; ctx.fillRect(0,0,W(c),H(c)); const R=seeded(21); let g=ctx.createRadialGradient(W(c)*.7,H(c)*.4,0,W(c)*.7,H(c)*.4,W(c)*.7); g.addColorStop(0,'rgba(58,78,124,.5)'); g.addColorStop(1,'rgba(7,9,15,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W(c),H(c));
      for(let i=0;i<140;i++){ const x=(R()*W(c)+t*4*d*(R()-.5))%W(c), y=R()*H(c), a=R()*(.6+.4*Math.sin(t*2+i)); ctx.fillStyle=`rgba(220,232,255,${a})`; ctx.fillRect(x,y,1.3*d,1.3*d); }
      const cx=W(c)*.66, cy=H(c)*.5, r=Math.min(W(c),H(c))*.3; g=ctx.createRadialGradient(cx-r*.3,cy-r*.3,r*.1,cx,cy,r); g.addColorStop(0,'rgba(255,255,255,.14)'); g.addColorStop(.9,'rgba(255,255,255,.02)'); g.addColorStop(1,'rgba(255,255,255,.3)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,6.3); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.lineWidth=2*d; ctx.beginPath(); ctx.arc(cx,cy,r*.88,Math.PI*1.1,Math.PI*1.4); ctx.stroke();
      }},
  };
}


// ---------------- closing planet (starfield + dotted globe with family cities) ----------------
function drawPlanet(cv,sky,t){
  const dpr=Math.min(2,devicePixelRatio||1), W=Math.round(cv.clientWidth*dpr), H=Math.round(cv.clientHeight*dpr); if(!W||!H) return;
  if(cv.width!==W||cv.height!==H){ cv.width=W; cv.height=H; } const ctx=cv.getContext('2d');
  if(sky&&sky.field){ sky.field.render(W,H,t,dpr); ctx.drawImage(sky.field.canvas,0,0); } else { ctx.fillStyle='#07090F'; ctx.fillRect(0,0,W,H); }
  const mob=W<H; const R=(mob?W*.62:W*.46), cx=W*.5, cy=mob?H*.98:H*.7+R; const rot=t*.12, tilt=.35;
  let g=ctx.createRadialGradient(cx,cy,R*.9,cx,cy,R*1.35); g.addColorStop(0,'rgba(110,145,255,.28)'); g.addColorStop(1,'rgba(110,145,255,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,R*1.35,0,6.284); ctx.fill();
  g=ctx.createRadialGradient(cx-R*.35,cy-R*.4,R*.1,cx,cy,R); g.addColorStop(0,'#18264A'); g.addColorStop(1,'#060A16'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,R,0,6.284); ctx.fill();
  const P=(la,lo)=>{ const A=la*Math.PI/180, L=lo*Math.PI/180+rot; let x=Math.cos(A)*Math.sin(L), y=Math.sin(A), z=Math.cos(A)*Math.cos(L); const y2=y*Math.cos(tilt)-z*Math.sin(tilt), z2=y*Math.sin(tilt)+z*Math.cos(tilt); return [cx+x*R, cy-y2*R, z2]; };
  const ds=Math.max(1.2,R/260);
  for(let la=-80;la<=80;la+=6){ const n=Math.max(6,Math.round(60*Math.cos(la*Math.PI/180))); for(let i=0;i<n;i++){ const [x,y,z]=P(la,i*360/n); if(z<0) continue; ctx.fillStyle=`rgba(170,200,255,${.12+.55*z})`; ctx.beginPath(); ctx.arc(x,y,ds*(.6+.6*z),0,6.284); ctx.fill(); } }
  const on=Math.floor(t/2.2)%CITIES.length;
  CITIES.forEach(([,,la,lo],i)=>{ const [x,y,z]=P(la,lo); if(z<.05) return; const hot=i===on, r=(hot?7:4.2)*ds*(.7+.3*z);
    const gg=ctx.createRadialGradient(x,y,0,x,y,r*5); gg.addColorStop(0,`rgba(242,200,121,${hot?.75:.45})`); gg.addColorStop(1,'rgba(242,200,121,0)'); ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(x,y,r*5,0,6.284); ctx.fill();
    ctx.fillStyle=hot?'#FFF3D6':'#F2C879'; ctx.beginPath(); ctx.arc(x,y,r,0,6.284); ctx.fill(); });
  ctx.strokeStyle='rgba(170,200,255,.35)'; ctx.lineWidth=1.5*dpr; ctx.beginPath(); ctx.arc(cx,cy,R,0,6.284); ctx.stroke();
}

// ---------------- copy for the sections below the hero ----------------
const COPY = {
  ru: {
    sub: 'Предки — конструктор семейного древа и карта миграций',
    brandTag: 'семейное древо',
    nav: { tree: 'Древо', map: 'Карта', progress: 'Прогресс', people: 'Люди', ai: 'Архивариус', card: 'Анкета' },
    growth: 'Вашему древу: 128 лет', growthSub: '12 человек · 4 поколения',
    suiteH: 'Вся семья в одном месте', suiteBtn: 'Начать с себя', more: 'Попробовать',
    tabs: {
      tree: { h: 'Построй понятное древо за пару минут', p: 'Поколения раскладываются сами, у каждой семьи свой цвет, стиль древа кастомизируется.', top: ['Древо', '12 чел. · 4 покол.', 'Добавить человека'] },
      card: { h: 'Короткая анкета вместо длинной формы', p: 'Фото лица, пара документов, даты и одна история. Даты вводятся цифрами, точки встанут сами.', top: ['Древо', '12 чел. · 4 покол.', 'Добавить человека'] },
      map: { h: 'Карта переездов семьи', p: 'Каждый переезд из анкеты становится линией на карте. Видно, откуда уехали прадеды и куда разъехались внуки.', top: ['Карта', 'перемещения семьи', ''] },
      ai: { h: 'Рассказ бабушки превращается в карточки', p: 'Вставьте расшифровку, запись голоса или фото документа. Архивариус предложит карточки, а в древо попадёт только то, что вы подтвердите.', top: ['Архивариус', 'черновики ждут подтверждения', 'Добавить выбранные в древо'] },
      progress: { h: 'Достижения за каждый шаг', p: 'Каждое достижение открывает следующие в трёх ветках: Род, Летопись и Странствия. Сразу видно, что уже собрано и что заполнить дальше.', top: ['Прогресс', '22 / 43', ''] },
    },
    N: { p1: ['Пётр', 'Ветров'], p2: ['Мария', 'Ветрова'], p3: ['Иосиф', 'Ланге'], p4: ['Анна', 'Ланге'], p5: ['Вадим', 'Ветров'], p6: ['Елена', 'Ветрова'], p8: ['Андрей', 'Ветров'], p10: ['Сергей', 'Ветров'] },
    memo: ['июн', '92 года со дня рождения <b>Елены Ветровой</b>'],
    card: { title: 'Анкета', edit: 'Редактировать', name: 'Елена Иосифовна Ветрова', short: 'Елена Ветрова', meta: 'урожд. Ланге · 1934–2015 · переводчица', metaShort: 'урожд. Ланге · 1934–2015',
      fill: 'Заполнено 80%', born: ['Рождение', '22.06.1934 · Рига'], moves: ['Переезды', 'Ташкент → Москва'],
      story: 'Помнила Ригу по запаху кофе в отцовской аптеке. Хранила все письма семьи в жестяной коробке из-под печенья.',
      docsL: 'Фото и документы', famL: 'Семья', fam: ['Иосиф · отец', 'Анна · мать', 'Вадим · муж'] },
    docs: ['письмо', 'билет', 'фото', 'справка'], tk: 'РИГА<br>→ТШК',
    city: { vol: 'Вологда', len: 'Ленинград', mos: 'Москва', riga: 'Рига', tash: 'Ташкент', nsk: 'Новосибирск', ber: 'Берлин', lis: 'Лиссабон', tbi: 'Тбилиси', lon: 'Лондон' },
    people: 'Люди', legend: ['Елена Ветрова', 'Пётр Ветров', 'Вадим Ветров', 'Андрей Ветров', 'Дмитрий Ветров', 'Анна Ветрова'],
    ai: { seg: ['Текст', 'Аудио', 'Документ'],
      src: '«Папа, <mark>Иосиф Карлович Ланге</mark>, родился в <mark>Риге</mark> в <mark>1905</mark> году, в семье аптекарей. Мама, <mark>Анна</mark>, урождённая <mark>Берзиня</mark>, была портнихой. В <mark>1941</mark> отца с заводом эвакуировали в <mark>Ташкент</mark>, мы поехали с ним. После войны его перевели в <mark>Москву</mark>…»',
      cap: 'Расшифровка · рассказ_Елены.m4a · 06:40', found: 'Найдено 2 чел.',
      d1: ['Иосиф Ланге', 'отец · уверен', ['1905 · Рига', '1941 → Ташкент', '1947 → Москва']],
      d2: ['Анна Ланге (Берзиня)', 'мать · вероятно', ['портниха'], 'год рождения?'],
      d3: ['Похоже на Елену Ветрову', 'обновить карточку'] },
    progAlt: 'Система прогресса: ветки Род, Летопись и Странствия',
    snip: { ai: 'Архивариус', file: 'рассказ_деда.m4a',
      quote: '«В <mark>1941</mark> отца с заводом эвакуировали из <mark>Риги</mark> в <mark>Ташкент</mark>, мама <mark>Анна</mark> поехала с ним…»',
      r1: ['Иосиф Ланге', '1905 · Рига', 'уверен'], r2: ['Переезд', '1941 · Ташкент', 'вероятно'], add: 'Добавить в древо',
      pill: 'Вадим <b>Петрович</b>: добавить отца, <b>Петра Ветрова</b>?' },
    fam: { h: 'Память семьи<br>в едином приложении', sub: 'С доступом по приглашению', title: 'Семья Ветровых', invite: 'Пригласить', access: 'Доступ редактирования',
      rows: [['Рассказ бабушки Зины', '04:12 · добавила Ольга'], ['Билет Рига → Ташкент', '1941 · добавил Андрей'], ['Письмо из Иркутска', '1979 · добавила Анна']],
      tabs: ['Древо', 'Карта', 'Архив', 'Прогресс'],
      caps: { ticket: 'билет · 1941', zina: 'бабушка Зина', letter: 'письмо · 1979', receipt: 'чек · 1976', photo: 'фото · 1976', cert: 'свидетельство · 1946', dad: 'голосовое от папы' },
      ticketBig: 'РИГА<br>→ ТАШКЕНТ<br>1941', ticketFar: 'МОСКВА<br>→ОДЕССА',
      receipt: ['ЧЕК', 'Фотоателье<br>«Момент»', ['фото 9×12', '4 шт'], ['ИТОГО', '1-20'], ['Сочи', '1976']] },
  },
  en: {
    sub: 'Predki is a family tree builder and a map of your family’s moves',
    brandTag: 'family tree',
    nav: { tree: 'Tree', map: 'Map', progress: 'Progress', people: 'People', ai: 'Archivist', card: 'Profile' },
    growth: 'Your tree: 128 years', growthSub: '12 people · 4 generations',
    suiteH: 'Your whole family in one place', suiteBtn: 'Start with me', more: 'Try it',
    tabs: {
      tree: { h: 'Build a clear tree in a couple of minutes', p: 'Generations lay themselves out, every family gets its own colour, and the tree style is customisable.', top: ['Tree', '12 people · 4 gen.', 'Add person'] },
      card: { h: 'A short profile instead of a long form', p: 'A face photo, a couple of documents, dates and one story. Type dates as digits and the dots appear by themselves.', top: ['Tree', '12 people · 4 gen.', 'Add person'] },
      map: { h: 'Your family’s map of moves', p: 'Every move in a profile becomes a line on the map. See where great-grandparents left from and where the grandchildren went.', top: ['Map', 'family movements', ''] },
      ai: { h: 'Grandma’s story turns into cards', p: 'Paste a transcript, a voice memo or a photo of a document. The archivist suggests cards, and only what you approve goes into the tree.', top: ['Archivist', 'drafts await your approval', 'Add selected to the tree'] },
      progress: { h: 'An achievement for every step', p: 'Each achievement unlocks the next ones in three branches: Kin, Chronicle and Journeys. You see at once what is collected and what to fill in next.', top: ['Progress', '22 / 43', ''] },
    },
    N: { p1: ['Pyotr', 'Vetrov'], p2: ['Maria', 'Vetrova'], p3: ['Iosif', 'Lange'], p4: ['Anna', 'Lange'], p5: ['Vadim', 'Vetrov'], p6: ['Elena', 'Vetrova'], p8: ['Andrei', 'Vetrov'], p10: ['Sergei', 'Vetrov'] },
    memo: ['Jun', '92 years since the birth of <b>Elena Vetrova</b>'],
    card: { title: 'Profile', edit: 'Edit', name: 'Elena Iosifovna Vetrova', short: 'Elena Vetrova', meta: 'née Lange · 1934–2015 · translator', metaShort: 'née Lange · 1934–2015',
      fill: '80% filled', born: ['Born', '22.06.1934 · Riga'], moves: ['Moves', 'Tashkent → Moscow'],
      story: 'Remembered Riga by the smell of coffee in her father’s pharmacy. Kept every family letter in a tin biscuit box.',
      docsL: 'Photos & documents', famL: 'Family', fam: ['Iosif · father', 'Anna · mother', 'Vadim · husband'] },
    docs: ['letter', 'ticket', 'photo', 'certificate'], tk: 'RIGA<br>→TAS',
    city: { vol: 'Vologda', len: 'Leningrad', mos: 'Moscow', riga: 'Riga', tash: 'Tashkent', nsk: 'Novosibirsk', ber: 'Berlin', lis: 'Lisbon', tbi: 'Tbilisi', lon: 'London' },
    people: 'People', legend: ['Elena Vetrova', 'Pyotr Vetrov', 'Vadim Vetrov', 'Andrei Vetrov', 'Dmitry Vetrov', 'Anna Vetrova'],
    ai: { seg: ['Text', 'Audio', 'Document'],
      src: '“My father, <mark>Iosif Karlovich Lange</mark>, was born in <mark>Riga</mark> in <mark>1905</mark> into a family of pharmacists. My mother, <mark>Anna</mark>, née <mark>Berzina</mark>, was a seamstress. In <mark>1941</mark> father was evacuated with his factory to <mark>Tashkent</mark> and we went with him. After the war he was transferred to <mark>Moscow</mark>…”',
      cap: 'Transcript · elena_story.m4a · 06:40', found: 'Found 2 people',
      d1: ['Iosif Lange', 'father · confident', ['1905 · Riga', '1941 → Tashkent', '1947 → Moscow']],
      d2: ['Anna Lange (Berzina)', 'mother · likely', ['seamstress'], 'birth year?'],
      d3: ['Looks like Elena Vetrova', 'update the card'] },
    progAlt: 'Progress system: Kin, Chronicle and Journeys branches',
    snip: { ai: 'Archivist', file: 'grandpa_story.m4a',
      quote: '“In <mark>1941</mark> father was evacuated with his factory from <mark>Riga</mark> to <mark>Tashkent</mark>, and mother <mark>Anna</mark> went with him…”',
      r1: ['Iosif Lange', '1905 · Riga', 'confident'], r2: ['Move', '1941 · Tashkent', 'likely'], add: 'Add to the tree',
      pill: 'Vadim <b>Petrovich</b>: add his father, <b>Pyotr Vetrov</b>?' },
    fam: { h: 'Family memory<br>in one app', sub: 'Invite-only access', title: 'The Vetrov family', invite: 'Invite', access: 'Edit access',
      rows: [['Grandma Zina’s story', '04:12 · added by Olga'], ['Riga → Tashkent ticket', '1941 · added by Andrei'], ['Letter from Irkutsk', '1979 · added by Anna']],
      tabs: ['Tree', 'Map', 'Archive', 'Progress'],
      caps: { ticket: 'ticket · 1941', zina: 'Grandma Zina', letter: 'letter · 1979', receipt: 'receipt · 1976', photo: 'photo · 1976', cert: 'certificate · 1946', dad: 'voice note from dad' },
      ticketBig: 'RIGA<br>→ TASHKENT<br>1941', ticketFar: 'MOSCOW<br>→ODESA',
      receipt: ['RECEIPT', 'Photo studio<br>“Moment”', ['photo 9×12', '4 pcs'], ['TOTAL', '1.20'], ['Sochi', '1976']] },
  },
};

// ---------------- icons (same strokes as the app sidebar) ----------------
const I = {
  tree: '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5V12M12 12 5 16.5M12 12l7 4.5"/></svg>',
  map: '<svg class="ico" viewBox="0 0 24 24"><path d="M3 6.5 9 4l6 2.5 6-2.5v13.5L15 20l-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></svg>',
  progress: '<svg class="ico" viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M9 20h6M10 17h4"/></svg>',
  people: '<svg class="ico" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5c3 0 5.5 2 5.5 5"/></svg>',
  ai: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></svg>',
  spark: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/></svg>',
  card: '<svg class="ico" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10.5" r="2.2"/><path d="M5.8 16.5c.6-1.8 1.8-2.7 3.2-2.7s2.6.9 3.2 2.7M14.5 9.5h3.5M14.5 13h3.5"/></svg>',
  plus: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg class="ico" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  fit: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  arrow: '<svg class="ico" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  lock: '<svg class="ico" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  check: '<svg viewBox="0 0 12 12"><path d="M2.5 6.2l2.2 2.2L9.5 3.6"/></svg>',
  play: '<svg viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z"/></svg>',
};
const LINE = { g: '#F2C879', f: '#8EA7FF', m: '#F29AC0', n: 'rgba(255,255,255,.42)' };

// ---------------- small builders shared by the sections ----------------
function treeSVG(nodes, couples, kids, o) {
  const NW = o.nw, NH = o.nh;
  let h = `<svg class="tsvg" viewBox="${o.vb}" width="100%">`;
  couples.forEach(([a, b]) => { const A = nodes[a], B = nodes[b]; h += `<path class="lk" style="stroke:${LINE.g}" d="M${A.x + NW} ${A.y + NH / 2}H${B.x}"/>`; });
  (o.extra || []).forEach(x => { h += x; });
  kids.forEach(([a, b, c, col]) => {
    const A = nodes[a], B = nodes[b], C = nodes[c]; const sx = (A.x + NW + B.x) / 2, sy = A.y + NH / 2, y0 = A.y + NH + 6, y1 = C.y - 8, k = (y1 - y0) * .55, cx = C.x + NW / 2;
    h += `<path class="lk" style="stroke:${col}" d="M${sx} ${sy}V${y0}C${sx} ${y0 + k} ${cx} ${y1 - k} ${cx} ${y1}V${C.y}"/><circle cx="${sx}" cy="${sy}" r="3.2" fill="${col}"/>`;
  });
  Object.values(nodes).forEach(n => {
    const ini = (n.ini || n.n.split(' ').map(w => w[0]).join('')).slice(0, 2);
    h += `<g class="${n.sel ? 'sel' : ''}" transform="translate(${n.x} ${n.y})"><rect class="card" width="${NW}" height="${NH}" rx="12"/>
      <circle class="${n.g === 'f' ? 'avf' : 'avm'}" cx="${NH / 2}" cy="${NH / 2}" r="${NH / 2 - 7}"/><text class="avt" x="${NH / 2}" y="${NH / 2 + 4}">${esc(ini)}</text>
      <text class="nm" x="${NH + 4}" y="${NH / 2 - 2}">${esc(n.n.split(' ')[0])}</text><text class="yr" x="${NH + 4}" y="${NH / 2 + 13}">${n.y0}</text></g>`;
  });
  return h + '</svg>';
}
const full = (C, k) => C.N[k].join(' ');
function miniTree(C, withKid) {
  const N = { a: { x: 0, y: 4, n: full(C, 'p1'), y0: '1898', g: 'm' }, b: { x: 104, y: 4, n: full(C, 'p2'), y0: '1902', g: 'f' },
    c: { x: 52, y: withKid ? 110 : 100, n: full(C, 'p5'), y0: '1928', g: 'm' }, d: { x: 156, y: withKid ? 110 : 100, n: full(C, 'p6'), y0: '1934', g: 'f', sel: 1 } };
  if (withKid) N.e = { x: 104, y: 216, n: full(C, 'p8'), y0: '1958', g: 'm' };
  return treeSVG(N, [['a', 'b'], ['c', 'd']], withKid ? [['a', 'b', 'c', LINE.f], ['c', 'd', 'e', LINE.g]] : [['a', 'b', 'c', LINE.f]], { nw: 94, nh: 40, vb: withKid ? '-2 0 256 262' : '-2 0 256 146' });
}
function familyTree(C, sel) {
  const NW = 124, NH = 44, nm = k => C.N[k][0];
  const N = {
    p1: { x: 10, y: 24, n: nm('p1'), y0: '1898–1969', g: 'm' }, p2: { x: 146, y: 24, n: nm('p2'), y0: '1902–1980', g: 'f' },
    p3: { x: 310, y: 24, n: nm('p3'), y0: '1905–1976', g: 'm' }, p4: { x: 446, y: 24, n: nm('p4'), y0: '1910–1990', g: 'f' },
    p5: { x: 78, y: 150, n: nm('p5'), y0: '1928–2003', g: 'm' }, p6: { x: 378, y: 150, n: nm('p6'), y0: '1934–2015', g: 'f', sel: sel === 'p6' },
    p8: { x: 160, y: 276, n: nm('p8'), y0: '1958', g: 'm' }, p10: { x: 296, y: 276, n: nm('p10'), y0: '1963', g: 'm' },
  };
  const sx = (78 + NW + 378) / 2, sy = 172, y0 = sy + 20, y1 = 268, k = (y1 - y0) * .55;
  const down = c => { const cx = N[c].x + NW / 2; return `<path class="lk" style="stroke:${LINE.g}" d="M${sx} ${sy}V${y0}C${sx} ${y0 + k} ${cx} ${y1 - k} ${cx} ${y1}V276"/>`; };
  const extra = [`<path class="lk" style="stroke:${LINE.g}" d="M${78 + NW} 172H378"/>`, down('p8'), down('p10'), `<circle cx="${sx}" cy="${sy}" r="3.2" fill="${LINE.g}"/>`];
  return treeSVG(N, [['p1', 'p2'], ['p3', 'p4']], [['p1', 'p2', 'p5', LINE.f], ['p3', 'p4', 'p6', LINE.m]], { nw: NW, nh: NH, vb: '0 0 580 340', extra });
}
function mapSVG(C, world) {
  const lon0 = -12, lon1 = 96, latC = 49, Wd = 592, Hd = 446;
  const x0 = (lon0 + 180) / 360 * 1000, x1 = (lon1 + 180) / 360 * 1000, yc = (90 - latC) / 180 * 500;
  const s = Wd / (x1 - x0); const ox = -x0 * s, oy = Hd / 2 - yc * s;
  const P = (la, lo) => [((lo + 180) / 360 * 1000) * s + ox, ((90 - la) / 180 * 500) * s + oy];
  const G = { vol: [59.22, 39.89, 1], len: [59.93, 30.32], mos: [55.75, 37.62], riga: [56.95, 24.11], tash: [41.3, 69.24], nsk: [55.03, 82.92], ber: [52.52, 13.41], lis: [38.72, -9.14], tbi: [41.72, 44.79], lon: [51.5, -.12] };
  const arc = (a, b) => { const [ax, ay] = P(G[a][0], G[a][1]), [bx, by] = P(G[b][0], G[b][1]); const mx = (ax + bx) / 2, my = (ay + by) / 2 - Math.hypot(bx - ax, by - ay) * .22; return `M${ax} ${ay}Q${mx} ${my} ${bx} ${by}`; };
  const R = [['riga', 'tash', LINE.m], ['tash', 'mos', LINE.m], ['vol', 'len', LINE.f], ['len', 'mos', '#6EC3FF'], ['mos', 'nsk', '#6EC3FF'], ['mos', 'ber', LINE.g], ['mos', 'lis', '#5FD3AE'], ['mos', 'lon', '#FF9F8A'], ['lon', 'tbi', '#FF9F8A']];
  return `<svg class="msvg" viewBox="0 0 ${Wd} ${Hd}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="${Wd}" height="${Hd}" fill="#0B1322"/>
    <g transform="translate(${ox} ${oy}) scale(${s})"><path class="land" d="${world || ''}" style="stroke-width:${.6 / s}"/></g>
    ${R.map(([a, b, c]) => `<path class="rt" stroke="${c}" d="${arc(a, b)}"/>`).join('')}
    ${Object.entries(G).map(([k, [la, lo, dn]]) => { const [x, y] = P(la, lo); const e = x > Wd - 110; return `<circle class="cd" cx="${x}" cy="${y}" r="4.5"/><text class="ct" x="${e ? x - 8 : x + 8}" y="${dn ? y + 16 : y - 7}" text-anchor="${e ? 'end' : 'start'}">${esc(C.city[k])}</text>`; }).join('')}</svg>`;
}
const docThumb = (kind, w, C) => {
  if (kind === 'letter') return `<div class="doc letter" style="--w:${w}px"><i class="ln" style="top:22%"></i><i class="ln" style="top:40%"></i><i class="ln" style="top:58%;right:34%"></i></div>`;
  if (kind === 'ticket') return `<div class="doc ticket" style="--w:${w}px"><span class="tx">${C.tk}</span><i class="perf"></i></div>`;
  if (kind === 'photo') return `<div class="doc photo" style="--w:${w}px"><i class="img"></i></div>`;
  return `<div class="doc cert" style="--w:${w}px"><i class="ln" style="top:20%"></i><i class="ln" style="top:36%"></i><i class="ln" style="top:52%;right:44%"></i><i class="stp"></i></div>`;
};
const bars = (n, seed, h) => { let s = seed; return Array.from({ length: n }, () => { s = (s * 16807) % 2147483647; return `<i style="height:${Math.round(4 + (s / 2147483647) * h)}px"></i>`; }).join(''); };
const ring = (off) => `<svg class="ring" viewBox="0 0 44 44"><circle class="tr" cx="22" cy="22" r="18"/><circle class="br" cx="22" cy="22" r="18" stroke-dasharray="113" stroke-dashoffset="${off}" transform="rotate(-90 22 22)"/></svg>`;

// ---------------- section markup ----------------
function suiteHTML(C) {
  return `<section class="suite" id="ld-features"><div class="frame">
    <div class="suite-head"><h2 class="h2">${esc(C.suiteH)}</h2><button type="button" class="btn-out" data-act="blank">${esc(C.suiteBtn)}</button></div>
    <div class="tabs" role="tablist">${TAB_KEYS.map((k, i) => `<button type="button" class="tab" role="tab" aria-selected="false" data-i="${i}">${TAB_ICON[k]}${esc(C.nav[k])}</button>`).join('')}</div>
    <div class="tab-body"><div class="tb-text"></div><div class="tb-visual"><div class="backdrop"></div><div class="mock-wrap"><div class="mock"></div></div></div></div>
  </div></section>`;
}
const TAB_KEYS = ['tree', 'map', 'ai', 'progress'];
const TAB_ICON = { tree: I.tree, map: I.map, ai: I.ai, progress: I.progress };
function tabBody(k, C, world, logo) {
  const t = C.tabs[k];
  const btn = t.top[2] ? `<span class="m-btn${k === 'ai' ? ' pri' : ''}">${k === 'ai' ? '' : I.plus}${esc(t.top[2])}</span>` : '';
  let body = '';
  if (k === 'tree') body = familyTree(C) + `<div class="memo"><span class="d">22<small>${C.memo[0]}</small></span><span>${C.memo[1]}</span></div><div class="tools"><span>${I.plus}</span><span>${I.minus}</span><span>${I.fit}</span></div>`;
  if (k === 'map') { const cols = [LINE.m, LINE.f, '#6EC3FF', LINE.g, '#5FD3AE', '#FF9F8A'];
    body = mapSVG(C, world) + `<div class="m-legend"><span class="lbl">${esc(C.people)}</span>${C.legend.map((n, i) => `<div><i style="--c:${cols[i]}"></i>${esc(n)}</div>`).join('')}</div>`; }
  if (k === 'ai') { const a = C.ai;
    const dc = (d, g, low, dim) => `<div class="dcard"${dim ? ' style="opacity:.8"' : ''}><div class="hd"><span class="av ${g}">${d[0].split(' ').map(w => w[0]).join('').slice(0, 2)}</span><div><b>${esc(d[0])}</b><small>${esc(d[1])}</small></div></div>${d[2] ? `<div class="m-kv">${d[2].map(x => `<span>${esc(x)}</span>`).join('')}${low ? `<span class="low">${esc(low)}</span>` : ''}</div>` : ''}</div>`;
    body = `<div class="ai-grid"><div class="src"><div class="m-seg">${a.seg.map((s, i) => `<span${i ? '' : ' class="on"'}>${s}</span>`).join('')}</div><p>${a.src}</p><span class="lbl" style="margin-top:auto">${esc(a.cap)}</span></div>
      <div class="dcards"><span class="lbl">${esc(a.found)}</span>${dc(a.d1, 'm')}${dc(a.d2, 'f', a.d2[3])}${dc(a.d3, 'f', null, true)}</div></div>`; }
  if (k === 'progress') body = `<img class="prog-shot" src="${progressShot}" alt="${esc(C.progAlt)}">`;
  const active = k;
  const NAVM = ['tree', 'map', 'progress', 'people', 'ai'];
  return `<aside class="m-side"><div class="m-brand"><span class="mark">${logo}</span><div>Predki<small>${esc(C.brandTag)}</small></div></div>
      ${NAVM.map(n => `<div class="m-nav${n === active ? ' on' : ''}">${I[n]}${esc(C.nav[n])}${n === 'ai' ? '<span class="beta">beta</span>' : ''}</div>`).join('')}
      <div class="m-grow">${ring(45)}<div><b>${esc(C.growth)}</b><small>${esc(C.growthSub)}</small></div></div></aside>
    <div class="m-main"><div class="m-top"><h4>${esc(t.top[0])}</h4><span class="s">${esc(t.top[1])}</span>${btn}</div><div class="m-body fade">${body}</div></div>`;
}
function snipsHTML(C) {
  const s = C.snip, c = C.card;
  return `<section class="snips" id="ld-snips"><canvas class="snips-sky" aria-hidden="true"></canvas><div class="horizon" aria-hidden="true"></div>
    <div class="stage" aria-hidden="true">
      <div class="snip s-ai" data-depth=".05"><div class="sn-head">${I.spark}${esc(s.ai)}<span class="meta">${esc(s.file)}</span></div>
        <p>${s.quote}</p>
        <div class="drafts">
          <div class="drow"><span class="ck">${I.check}</span><div><b>${esc(s.r1[0])}</b><br><small>${esc(s.r1[1])}</small></div><span class="conf hi">${esc(s.r1[2])}</span></div>
          <div class="drow"><span class="ck">${I.check}</span><div><b>${esc(s.r2[0])}</b><br><small>${esc(s.r2[1])}</small></div><span class="conf mid">${esc(s.r2[2])}</span></div>
        </div><div class="go">${esc(s.add)}</div></div>
      <div class="snip s-rail" data-depth=".09"><span class="on">${I.tree}</span><span>${I.map}</span><span>${I.progress}</span><span>${I.people}</span><span>${I.ai}</span></div>
      <div class="snip s-tree" data-depth=".02"><div class="sn-head">${I.tree}${esc(C.nav.tree)}<span class="meta">${esc(C.tabs.tree.top[1])}</span></div>${miniTree(C, true)}</div>
      <div class="snip s-pill" data-depth=".07">${I.spark}${s.pill}</div>
      <div class="snip s-person" data-depth=".04">
        <div class="pc-top"><span class="av f">${C.N.p6[0][0]}${C.N.p6[1][0]}</span><div><b>${esc(c.short)}</b><small>${esc(c.metaShort)}</small></div></div>
        <div class="fill" style="--p:80%">${esc(c.fill)}<i></i></div>
        <div class="rows"><div><span>${c.born[0]}</span><span class="mono">${c.born[1]}</span></div><div><span>${c.moves[0]}</span><span>${c.moves[1]}</span></div></div>
        <div class="docs-row">${['letter', 'ticket', 'photo', 'cert'].map((d, i) => `<div>${docThumb(d, 60, C)}<span class="doc-cap">${esc(C.docs[i])}</span></div>`).join('')}</div>
      </div>
      <div class="snip s-grow" data-depth=".08">${ring(45)}<div><b>${esc(C.growth)}</b><small>${esc(C.growthSub)}</small></div></div>
    </div></section>`;
}
function famHTML(C, logo) {
  const f = C.fam, cp = f.caps;
  const voice = (wv, time) => `<div class="voice"><span class="pl">${I.play}</span>${wv ? `<span class="wv">${wv}</span>` : ''}${time}</div>`;
  const art = (cls, depth, style, inner, cap) => `<div class="art ${cls}" data-depth="${depth}" style="${style}">${inner}${cap ? `<span class="art-cap">${esc(cap)}</span>` : ''}</div>`;
  const rc = f.receipt;
  return `<section class="fam" id="ld-family"><canvas class="fam-stars" aria-hidden="true"></canvas>
    <div class="fam-head"><h2 class="h2">${f.h}</h2><span class="fam-sub">${I.lock}${esc(f.sub)}</span></div>
    <div class="fam-stage" aria-hidden="true"><div class="rays"></div><div class="burst"></div>
      ${art('far hide-m', .03, 'left:6%;top:6%;--d:11s;--r0:8deg;--r1:14deg', `<div class="doc ticket" style="--w:120px"><span class="tx">${f.ticketFar}</span><i class="perf"></i></div>`)}
      ${art('far hide-m', .04, 'right:9%;top:2%;--d:10s;--dl:-3s', voice('', '01:57'))}
      ${art('', .12, 'left:9%;top:8%;--d:8s;--r0:-14deg;--r1:-9deg', `<div class="doc ticket" style="--w:200px"><span class="tx" style="font-size:19px">${f.ticketBig}</span><i class="perf"></i></div>`, cp.ticket)}
      ${art('', .16, 'right:7%;top:10%;--d:9.5s;--dl:-2s;--r0:3deg;--r1:-2deg', voice(bars(22, 7, 18), '04:12'), cp.zina)}
      ${art('back', .08, 'left:17%;top:50%;--d:10s;--dl:-4s;--r0:7deg;--r1:11deg', `<div class="doc letter" style="--w:190px"><i class="ln" style="top:16%"></i><i class="ln" style="top:28%"></i><i class="ln" style="top:40%"></i><i class="ln" style="top:52%"></i><i class="ln" style="top:64%;right:38%"></i></div>`, cp.letter)}
      ${art('', .2, 'right:15%;top:36%;--d:8.5s;--dl:-1s;--r0:-8deg;--r1:-3deg', `<div class="receipt"><b>${rc[0]}</b>${rc[1]}${rc.slice(2).map(r => `<div class="r"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('')}</div>`, cp.receipt)}
      ${art('back hide-m', .1, 'left:3%;top:72%;--d:9s;--dl:-5s;--r0:-5deg;--r1:2deg', `<div class="doc photo" style="--w:150px"><i class="img"></i></div>`, cp.photo)}
      ${art('', .14, 'right:4%;top:70%;--d:10.5s;--dl:-2.5s;--r0:6deg;--r1:1deg', `<div class="doc cert" style="--w:180px"><i class="ln" style="top:16%;left:30%;right:30%"></i><i class="ln" style="top:34%"></i><i class="ln" style="top:48%"></i><i class="ln" style="top:62%;right:50%"></i><i class="stp"></i></div>`, cp.cert)}
      ${art('hide-m', .22, 'left:1%;top:38%;--d:7.5s;--dl:-1.5s;--r0:-3deg;--r1:3deg', voice(bars(14, 3, 16), '00:48'), cp.dad)}
      <div class="hand-wrap"><div class="hand-float"><div class="beam"></div>
        <div class="phone"><i class="sb" style="top:120px;height:26px"></i><i class="sb" style="top:170px;height:48px"></i><i class="sb" style="top:228px;height:48px"></i>
          <div class="screen"><div class="island"></div>
            <div class="ap-status"><span>9:41</span><svg viewBox="0 0 44 12"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="1" width="3" height="11" rx="1"/><rect x="24" y="1" width="18" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="26" y="3" width="12" height="6" rx="1.5"/></svg></div>
            <div class="ap-head"><span class="brand-mark">${logo}</span><div><b>${esc(f.title)}</b><small>${esc(C.growthSub)}</small></div></div>
            <div class="ap-invite"><span class="ap-acc-l">${esc(f.access)}</span><div class="ap-avs"><span class="av m">${C.N.p8[0][0]}${C.N.p8[1][0]}</span><span class="av f">${C === COPY.en ? 'OV' : 'ОВ'}</span><span class="av m">${C === COPY.en ? 'DV' : 'ДВ'}</span><span class="ap-more">+2</span></div><span class="ap-inv">${I.plus}${esc(f.invite)}</span></div>
            <div class="ap-tree">${miniTree(C, false)}</div>
            <div class="ap-list">
              <div class="ap-row"><span class="vth">${bars(9, 5, 14)}</span><div><b>${esc(f.rows[0][0])}</b><small>${esc(f.rows[0][1])}</small></div></div>
              <div class="ap-row">${docThumb('ticket', 40, C)}<div><b>${esc(f.rows[1][0])}</b><small>${esc(f.rows[1][1])}</small></div></div>
              <div class="ap-row">${docThumb('letter', 40, C)}<div><b>${esc(f.rows[2][0])}</b><small>${esc(f.rows[2][1])}</small></div></div>
            </div>
            <div class="ap-tabs"><span class="on">${I.tree}${esc(f.tabs[0])}</span><span>${I.map}${esc(f.tabs[1])}</span><span>${I.ai}${esc(f.tabs[2])}</span><span>${I.progress}${esc(f.tabs[3])}</span></div>
          </div></div>
      </div></div>
    </div></section>`;
}
function paintStars(cv, n, seed) {
  const dpr = Math.min(1.5, devicePixelRatio || 1); const W = cv.width = Math.round(cv.clientWidth * dpr), H = cv.height = Math.round(cv.clientHeight * dpr); if (!W || !H) return; const ctx = cv.getContext('2d');
  let s = seed; const R = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  for (let i = 0; i < n; i++) { const a = .2 + R() * .7; ctx.fillStyle = R() < .15 ? `rgba(255,226,180,${a})` : `rgba(220,232,255,${a})`; ctx.beginPath(); ctx.arc(R() * W, R() * H, (.4 + R() * 1.1) * dpr, 0, 6.283); ctx.fill(); }
}

// ---------------- mount ----------------
function mount(root, opts) {
  const gsap = opts.gsap, ST = opts.ScrollTrigger; if (ST) gsap.registerPlugin(ST);
  let lang = opts.lang === 'en' ? 'en' : 'ru';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cleanup = [], ctxGsap = null, lenis = null, tab = 0;
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); cleanup.push(() => el.removeEventListener(ev, fn, o)); };
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];

  function render() {
    const T = TXT[lang], C = COPY[lang];
    const logo = () => (opts.logo ? opts.logo() : '');
    const NOM = { 'Ташкента': 'Ташкент', 'Москвы': 'Москва', 'Токио': 'Токио', 'Читы': 'Чита', 'Берлина': 'Берлин', 'Пензы': 'Пенза', 'Риги': 'Рига', 'Казани': 'Казань', 'Одессы': 'Одесса', 'Харбина': 'Харбин', 'Тбилиси': 'Тбилиси', 'Нью-Йорка': 'Нью-Йорк' };
    const state = { idx: 0, path: [0], pathT: 0, lang, cityName: i => lang === 'en' ? CITIES[i][1] : (NOM[CITIES[i][0]] || CITIES[i][0]) };
    const keys = 'ABCDEFGHIJKL'.split('');
    root.innerHTML = `<div class="ld-page">
    <header class="ld-top"><button type="button" class="ld-brand" data-act="brand"><span class="brand-mark">${logo()}</span>Predki</button>
      <div class="ld-lang"><button type="button" data-l="ru" class="${lang === 'ru' ? 'on' : ''}">RU</button><button type="button" data-l="en" class="${lang === 'en' ? 'on' : ''}">EN</button></div>
      <button type="button" class="btn ld-open" data-act="open">${esc(T.open)}</button></header>
    <main>
      <section class="ld-hero">
        <div class="ld-grid">${keys.map(k => `<div class="ld-tile" data-t="${k}" style="grid-area:${k}"><canvas></canvas><span class="cap">${esc(T.caps[k])}</span></div>`).join('')}</div>
        <div class="ld-shade"></div><div class="ld-dark"></div>
        <h1 class="ld-title"><span class="ld-line"><span class="ld-l1">${esc(T.l1)}</span></span>
          <span class="ld-line"><span class="ld-l2"><span class="ld-from">${esc(T.from)}</span><span class="ld-wwrap"><span class="ld-word"></span></span></span></span>
          <span class="ld-line ld-subl"><span class="ld-sub">${esc(C.sub)}</span></span></h1>
        <span class="ld-measure ld-l2"></span>
        <button type="button" class="ld-hint" data-act="next"><span>${esc(T.hint)}</span><i></i></button><div class="ld-grain"></div>
      </section>
      ${suiteHTML(C)}
      ${snipsHTML(C)}
      ${famHTML(C, logo())}
      <section class="ld-cta" id="ld-cta"><canvas class="cta-canvas" aria-hidden="true"></canvas><h2 class="ld-h2">${esc(T.ctaH)}</h2>
        <div class="row"><button type="button" class="btn primary" data-act="blank">${esc(T.blank)}</button></div></section>
    </main></div>`;

    // grain texture
    const gc = document.createElement('canvas'); gc.width = gc.height = 160; const gx = gc.getContext('2d'); const im = gx.createImageData(160, 160);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    gx.putImageData(im, 0, 0); $('.ld-grain').style.backgroundImage = `url(${gc.toDataURL()})`;

    // smooth scroll inside the landing container; drives ScrollTrigger
    lenis = new Lenis({ wrapper: root, content: $('.ld-page'), lerp: 0.12 });
    if (ST) lenis.on('scroll', ST.update);
    const lenisTick = t => lenis && lenis.raf(t * 1000); gsap.ticker.add(lenisTick); gsap.ticker.lagSmoothing(0);
    cleanup.push(() => { gsap.ticker.remove(lenisTick); gsap.ticker.lagSmoothing(500, 33); if (lenis) { lenis.destroy(); lenis = null; } });
    const goTo = el => { if (!el) return; if (lenis) lenis.scrollTo(el, { duration: 1.2 }); else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); };

    // actions
    $$('.ld-lang button').forEach(b => on(b, 'click', () => { if (b.dataset.l === lang) return; lang = b.dataset.l; opts.onLang && opts.onLang(lang); teardown(); render(); }));
    on(root, 'click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return; const act = a.dataset.act;
      if (act === 'sample' || act === 'blank') opts.onStart(act);
      else if (act === 'brand') { if (opts.onBrand) opts.onBrand(); else opts.onStart(null); }
      else if (act === 'open') { if (opts.hasData && opts.hasData()) opts.onStart(null); else goTo($('#ld-cta')); }
      else if (act === 'next') goTo($('#ld-features'));
    });

    heroAnimate(T, state);
    suiteInit(C);
    // snippets play when they come into view
    const stage = $('.snips .stage');
    if (reduce) stage.classList.add('play');
    else { const io = new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { stage.classList.add('play'); ob.disconnect(); } }, { threshold: .2 }); io.observe(stage); cleanup.push(() => io.disconnect()); }
    snipsSky();
    const famStars = $('.fam-stars'); const paintFam = () => paintStars(famStars, 320, 23); paintFam(); on(window, 'resize', paintFam);
    ctaPlanet();

    // header + gentle parallax of snippets and artifacts
    const top = $('.ld-top'), hero = $('.ld-hero'), snips = $('#ld-snips'), fam = $('#ld-family'), hand = $('.hand-wrap');
    const snipEls = $$('.snips .snip[data-depth]').map(el => ({ el, d: parseFloat(el.dataset.depth) }));
    const artEls = $$('.fam .art').map(el => ({ el, d: parseFloat(el.dataset.depth) }));
    let ticking = false;
    const onScroll = () => {
      ticking = false; const y = root.scrollTop, vh = root.clientHeight;
      top.classList.toggle('solid', y > hero.offsetHeight - 80);
      if (reduce) return;
      if (root.clientWidth > 860 && y + vh > snips.offsetTop && y < snips.offsetTop + snips.offsetHeight) { const rel = y + vh * .4 - snips.offsetTop; snipEls.forEach(s => { s.el.style.transform = `translate3d(0,${(-rel * s.d).toFixed(1)}px,0)`; }); }
      if (y + vh > fam.offsetTop && y < fam.offsetTop + fam.offsetHeight) { const rel = y + vh * .5 - fam.offsetTop; artEls.forEach(a => { a.el.style.translate = `0 ${(-rel * a.d * .5).toFixed(1)}px`; }); hand.style.translate = `0 ${(-rel * .05).toFixed(1)}px`; }
    };
    on(root, 'scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
    if (ST) { requestAnimationFrame(() => ST.refresh()); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh()); }
  }

  // ---- hero: canvas tiles, VOX word, intro, scroll-out
  function heroAnimate(T, state) {
    const hero = $('.ld-hero'); const dprMax = Math.min(1.5, devicePixelRatio || 1);
    const defs = makeTiles(T, opts.world, state);
    const tiles = $$('.ld-tile').map(el => { const def = defs[el.dataset.t]; if (def.light) el.classList.add('light'); const cv = el.querySelector('canvas'); return { el, cv, ctx: cv.getContext('2d'), def }; });
    const size = () => tiles.forEach(o => { const r = o.el.getBoundingClientRect(); o.cv.width = Math.max(2, Math.round(r.width * dprMax)); o.cv.height = Math.max(2, Math.round(r.height * dprMax)); });
    size(); const ro = new ResizeObserver(size); ro.observe(hero); cleanup.push(() => ro.disconnect());
    let vis = true, last = 0; const t0 = performance.now();
    const draw = force => { const now = performance.now(); if (!force && (!vis || now - last < 1000 / 30)) return; last = now; const t = (now - t0) / 1000;
      tiles.forEach(o => { o.ctx.setTransform(1, 0, 0, 1, 0, 0); try { o.def.draw(o.ctx, o.cv, reduce ? 4 : t, dprMax); } catch (e) {} }); };
    const tick = () => draw(false); gsap.ticker.add(tick); cleanup.push(() => gsap.ticker.remove(tick)); draw(true);
    const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; }); io.observe(hero); cleanup.push(() => io.disconnect());
    // city word
    const wrap = $('.ld-wwrap'), word = $('.ld-word'), meas = $('.ld-measure');
    const fit = (txt, st, dur) => { meas.innerHTML = ''; const s = document.createElement('span'); s.className = 'ld-word'; s.style.position = 'static'; s.textContent = txt; applyStyle(s, st);
      const bl = document.createElement('i'); bl.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'; s.appendChild(bl); meas.appendChild(s);
      const r = s.getBoundingClientRect(), br = bl.getBoundingClientRect(); const desc = r.bottom - br.top; const pb = parseFloat(getComputedStyle(wrap).paddingBottom) || 0;
      word.style.bottom = (pb - desc) + 'px'; gsap.to(wrap, { width: r.width, duration: dur, ease: 'expo.out', overwrite: true }); };
    const cityText = i => lang === 'en' ? CITIES[i][1] : CITIES[i][0];
    const setWord = (i, st) => { word.textContent = cityText(i); applyStyle(word, st); };
    let cur = 0, timer = null; cleanup.push(() => clearTimeout(timer));
    const land = n => { const st = CITIES[n][4]; setWord(n, st); fit(cityText(n), st, .55);
      if (!reduce) gsap.fromTo(word, { scale: 1.08, yPercent: -4 }, { scale: 1, yPercent: 0, duration: .7, ease: 'expo.out' });
      state.idx = n; state.path = [...state.path.slice(-3), n]; if (state.path.length > 1 && state.path[state.path.length - 2] === n) state.path.pop(); state.pathT = (performance.now() - t0) / 1000; };
    land(0);
    const next = () => { const n = (cur + 1) % CITIES.length;
      if (reduce) { cur = n; land(n); timer = setTimeout(next, 2600); return; }
      const frames = 6 + Math.floor(Math.random() * 3); let f = 0; const R = seeded(n * 7 + 3);
      const step = () => { if (f < frames) { const st = POOL[Math.floor(R() * POOL.length)]; setWord(n, st); fit(cityText(n), st, .1); f++; timer = setTimeout(step, 58); } else { cur = n; land(n); timer = setTimeout(next, 2100); } };
      step(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (word.isConnected) fit(cityText(cur), CITIES[cur][4], .3); });
    timer = setTimeout(next, 2400);
    ctxGsap = gsap.context(() => {
      if (!reduce) {
        gsap.timeline({ defaults: { ease: 'expo.out' } })
          .from('.ld-tile', { clipPath: 'inset(50% 50% 50% 50%)', duration: 1.3, stagger: { each: .05, from: 'center', grid: 'auto' } }, 0)
          .from('.ld-tile canvas', { scale: 1.25, duration: 1.8, stagger: { each: .05, from: 'center' } }, 0)
          .from('.ld-l1, .ld-l2, .ld-sub', { yPercent: 110, duration: 1.1, stagger: .1 }, .35)
          .set('.ld-line', { overflow: 'visible' })
          .from('.ld-hint, .ld-top', { opacity: 0, y: 14, duration: .9, stagger: .08 }, .9);
      } else gsap.set('.ld-line', { overflow: 'visible' });
      if (!ST) return;
      const sc = { scroller: root, trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.ld-title', { yPercent: -18, scale: .92, opacity: .2, ease: 'none', scrollTrigger: { ...sc } });
      $$('.ld-tile').forEach((el, k) => gsap.to(el, { yPercent: -(8 + (k % 4) * 7), ease: 'none', scrollTrigger: { ...sc } }));
      gsap.to('.ld-dark', { opacity: .75, ease: 'none', scrollTrigger: { ...sc } });
      if (!reduce) gsap.from('.ld-cta > *:not(canvas)', { opacity: 0, y: 30, stagger: .08, duration: .9, ease: 'expo.out', scrollTrigger: { scroller: root, trigger: '.ld-cta', start: 'top 70%' } });
    }, root);
  }

  // ---- tabs with implemented pages
  function suiteInit(C) {
    const tabsEl = $('.tabs'), tbText = $('.tb-text'), mock = $('.mock'), mockWrap = $('.mock-wrap');
    const show = i => {
      tab = i; const k = TAB_KEYS[i], t = C.tabs[k];
      $$('.tab').forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
      tbText.innerHTML = `<div class="tb-label">${TAB_ICON[k]}${esc(C.nav[k])}</div>
        <div class="tb-copy fade"><h3>${esc(t.h)}</h3><p>${esc(t.p)}</p><button type="button" class="more" data-act="blank">${esc(C.more)} ${I.arrow}</button></div>`;
      mock.innerHTML = tabBody(k, C, opts.world, opts.logo ? opts.logo() : '');
    };
    on(tabsEl, 'click', e => { const b = e.target.closest('.tab'); if (b) show(+b.dataset.i); });
    on(tabsEl, 'keydown', e => { if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return; const n = (tab + (e.key === 'ArrowRight' ? 1 : TAB_KEYS.length - 1)) % TAB_KEYS.length; show(n); $$('.tab')[n].focus(); });
    show(tab);
    const fitMock = () => { mock.style.transform = `scale(${mockWrap.clientWidth / (mock.offsetWidth || 760)})`; };
    const ro = new ResizeObserver(fitMock); ro.observe(mockWrap); cleanup.push(() => ro.disconnect()); fitMock();
  }

  // ---- calm starfield behind the snippets
  function snipsSky() {
    const cv = $('.snips-sky'), ctx = cv.getContext('2d'); let W = 0, H = 0, dpr = 1, vis = false, last = 0, raf = 0;
    let s = 7; const R = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
    const stars = Array.from({ length: 220 }, () => ({ x: R(), y: R(), r: .4 + R() * 1.1, a: .25 + R() * .6, tw: R() * 6.3, warm: R() < .15 }));
    const size = () => { dpr = Math.min(1.5, devicePixelRatio || 1); W = cv.width = Math.round(cv.clientWidth * dpr); H = cv.height = Math.round(cv.clientHeight * dpr); };
    const draw = t => { ctx.clearRect(0, 0, W, H); for (const st of stars) { const a = st.a * (reduce ? 1 : .7 + .3 * Math.sin(t * .0011 + st.tw)); ctx.fillStyle = st.warm ? `rgba(255,226,180,${a})` : `rgba(220,232,255,${a})`; ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r * dpr, 0, 6.283); ctx.fill(); } };
    const loop = t => { raf = 0; if (!vis) return; raf = requestAnimationFrame(loop); if (t - last < 1000 / 20) return; last = t; draw(t); };
    size(); draw(0); on(window, 'resize', () => { size(); draw(performance.now()); });
    const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf && !reduce) raf = requestAnimationFrame(loop); }); io.observe(cv);
    cleanup.push(() => { io.disconnect(); cancelAnimationFrame(raf); vis = false; });
  }

  // ---- closing: starfield + slowly turning dotted planet
  function ctaPlanet() {
    const cc = $('.cta-canvas'); const sky = opts.sky || null; let vis = false, raf = 0, lastc = 0; const t0c = performance.now();
    const loop = now => { raf = 0; if (!vis) return; raf = requestAnimationFrame(loop); if (now - lastc < 1000 / 30) return; lastc = now; drawPlanet(cc, sky, reduce ? 0 : (now - t0c) / 1000); };
    const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf) raf = requestAnimationFrame(loop); }); io.observe(cc);
    cleanup.push(() => { io.disconnect(); cancelAnimationFrame(raf); vis = false; });
  }

  function teardown() { cleanup.forEach(f => { try { f(); } catch (e) {} }); cleanup = []; if (ctxGsap) ctxGsap.revert(); ctxGsap = null; }
  render();
  return () => { teardown(); root.innerHTML = ''; };
}
return { mount, CITIES };
})();
