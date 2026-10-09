// @ts-nocheck — achievement logic ported from the prototype as-is
// Progress: achievement constellation (Род · Летопись · Странствия). Data + evaluation live here, the page draws it.
import { S, LANG, fullName, go, editPerson, openPerson, fillPercent, toast, t, ui } from './core'

export const Progress=(function(){
  const L=()=>LANG==='en'?'en':'ru';
  const tx=v=>v&&typeof v==='object'?(v[L()]||v.ru):v;
  const nf=n=>Math.round(n).toLocaleString(L()==='en'?'en-US':'ru-RU');
  const pl=(n,f)=>{ if(L()==='en') return Math.abs(n)===1?f.en[0]:f.en[1]; n=Math.abs(n)%100; const n1=n%10; const r=f.ru; if(n>10&&n<20) return r[2]; if(n1>1&&n1<5) return r[1]; if(n1===1) return r[0]; return r[2]; };
  const W={
    ru:{title:'Прогресс',done:'Получено',ready:'Выполнено, ждёт открытия',avail:'Доступно',lock:'Закрыто',hidden:'Скрытое достижение',hiddenD:'Откроется само, когда условие выполнится. Подсказка: ',got:'Получено {d}',readyS:'Уже выполнено. Засчитается, когда получите «{b}».',first:'Сначала: {b}',met:'Условие выполнено',notMet:'Ещё не выполнено',of:'из',close:'Закрыть',secretL:'СКРЫТОЕ',
      gen:{tree:'Перейти в древо',people:'Открыть людей',map:'Открыть карту',ai:'Открыть архивариуса'},
      memo:{today:'Сегодня',tomorrow:'Завтра',inN:'Через {n} {d}',line:'{w} — {a} {y} со дня рождения'}},
    en:{title:'Progress',done:'Earned',ready:'Done, waiting to unlock',avail:'Available',lock:'Locked',hidden:'Hidden achievement',hiddenD:'Unlocks by itself once the condition is met. Hint: ',got:'Earned {d}',readyS:'Already done. It counts once you earn “{b}”.',first:'First: {b}',met:'Condition met',notMet:'Not done yet',of:'of',close:'Close',secretL:'HIDDEN',
      gen:{tree:'Go to the tree',people:'Open people',map:'Open the map',ai:'Open the archivist'},
      memo:{today:'Today',tomorrow:'Tomorrow',inN:'In {n} {d}',line:'{w} — {a} {y} since the birth of'}}
  };
  const w=k=>W[L()][k];
  const fill=(s,o)=>{ for(const k in o) s=s.replace('{'+k+'}',o[k]); return s; };
  const U={people:{ru:['человек','человека','человек'],en:['person','people']},women:{ru:['женщина','женщины','женщин'],en:['woman','women']},gp:{ru:['предок','предка','предков'],en:['ancestor','ancestors']},
    portrait:{ru:['портрет','портрета','портретов'],en:['portrait','portraits']},story:{ru:['история','истории','историй'],en:['story','stories']},file:{ru:['файл','файла','файлов'],en:['file','files']},
    city:{ru:['город','города','городов'],en:['city','cities']},step:{ru:['переезд','переезда','переездов'],en:['move','moves']},year:{ru:['год','года','лет'],en:['year','years']},gen:{ru:['поколение','поколения','поколений'],en:['generation','generations']},
    km:{ru:['км','км','км'],en:['km','km']},day:{ru:['день','дня','дней'],en:['day','days']}};

  /* ---- metrics read from the family data ---- */
  const yr=d=>{ const m=String(d||'').match(/(\d{4})/); return m?+m[1]:0; };
  const dist=(a,b)=>{ const R=6371,r=Math.PI/180; const h=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lon-a.lon)*r/2)**2; return 2*R*Math.asin(Math.sqrt(h)); };
  function metrics(){
    const P=S.people, byI=id=>P.find(p=>p.id===id);
    const par=id=>S.rels.filter(r=>r.type==='parent'&&!r.step&&r.b===id).map(r=>byI(r.a)).filter(Boolean);
    const memo={}; const depth=id=>{ if(memo[id]!=null) return memo[id]; memo[id]=0; const ps=par(id); return memo[id]=ps.length?1+Math.max(...ps.map(p=>depth(p.id))):0; };
    const anc=(id,k)=>{ let l=[id]; for(let i=0;i<k;i++) l=[...new Set(l.flatMap(x=>par(x).map(p=>p.id)))]; return l; };
    const bio=p=>(p.bio||'').length>=100;
    const reloc=p=>(p.events||[]).filter(e=>['move','study','work'].includes(e.type));
    const geo=P.flatMap(p=>(p.events||[]).filter(e=>e.lat!=null&&e.lat!==''));
    let longest=0; const legs=new Map();
    P.forEach(p=>{ const ev=(p.events||[]).filter(e=>e.lat!=null&&e.lat!=='').sort((a,b)=>(+a.year||0)-(+b.year||0));
      for(let i=1;i<ev.length;i++){ if(ev[i].place===ev[i-1].place) continue; const d=dist(ev[i-1],ev[i]); longest=Math.max(longest,d); legs.set([ev[i-1].place,ev[i].place].sort().join('|'),d); } });
    const years=[...P.flatMap(p=>[yr(p.birthDate),yr(p.deathDate)]),...geo.map(e=>+e.year||0)].filter(Boolean);
    let gpMax=0, ggpMax=0, rootsOk=0, cousins=0;
    P.forEach(p=>{ const g=anc(p.id,2).map(byI).filter(Boolean); gpMax=Math.max(gpMax,g.length); ggpMax=Math.max(ggpMax,anc(p.id,3).length); if(g.length>=4&&g.every(x=>x.birthPlace)) rootsOk=1;
      if(cousins) return; const mine=new Set(par(p.id).map(x=>x.id)), myG=anc(p.id,2);
      P.forEach(q=>{ if(q===p||cousins) return; if(par(q.id).some(x=>mine.has(x.id))) return; const qg=new Set(anc(q.id,2)); if(myG.some(x=>qg.has(x))) cousins=1; }); });
    const full=p=>['first','last','gender','birthDate','birthPlace','job','bio','avatar'].every(k=>p[k])&&(p.events||[]).length;
    const media=P.flatMap(p=>p.media||[]);
    const names={}; P.forEach(p=>{ const y=yr(p.birthDate); if(p.first&&y) (names[p.first]=names[p.first]||[]).push(y); });
    const M={ n:P.length, gens:P.length?Math.max(...P.map(p=>depth(p.id)))+1:0, bothParents:P.some(p=>par(p.id).length>=2)?1:0, gpMax, ggpMax, cousins,
      maidens:P.filter(p=>p.gender==='f'&&p.maiden).length, patronymics:P.filter(p=>p.patronymic).length,
      portraits:P.filter(p=>p.avatar).length, stories:P.filter(bio).length, docs:media.filter(m=>m.type==='doc').length,
      docPeople:P.filter(p=>(p.media||[]).some(m=>m.type==='doc')).length, media:media.length+P.filter(p=>p.avatar).length,
      jobs:P.filter(p=>p.job).length, fullCard:P.some(full)?1:0, aiUsed:S.settings.aiUsed?1:0, aiAudio:S.settings.aiAudio?1:0,
      birthPlaces:P.filter(p=>p.birthPlace).length, moveGeo:geo.some(e=>e.type==='move')?1:0, cities:new Set(geo.map(e=>e.place)).size,
      eduWork:P.filter(p=>(p.events||[]).some(e=>e.type==='study'||e.type==='work')).length, maxReloc:Math.max(0,...P.map(p=>reloc(p).length)),
      longest, pathKm:[...legs.values()].reduce((a,b)=>a+b,0), span:years.length?Math.max(...years)-Math.min(...years):0,
      rootsOk, faceGens:new Set(P.filter(p=>p.avatar).map(p=>depth(p.id))).size, bioRoute:P.some(p=>bio(p)&&reloc(p).length>=3)?1:0,
      namesake:Object.values(names).some(ys=>ys.length>1&&Math.max(...ys)-Math.min(...ys)>=40)?1:0,
      maxAge:Math.max(0,...P.map(p=>{ const b=yr(p.birthDate), d=yr(p.deathDate); return b&&d?d-b:0; })) };
    M.faceAll=M.n>=25&&M.portraits>=M.n?25:M.n>=25?Math.min(24,Math.floor(M.portraits/M.n*25)):Math.min(M.portraits,24);
    return M;
  }

  /* ---- icons (24×24 stroke) ---- */
  function pedigree(levels){ let s='', prev=null; for(let l=0;l<levels;l++){ const k=2**l, y=20-l*(16/(levels-1)), r=l===levels-1&&levels>3?1.1:1.7; const xs=[...Array(k)].map((_,i)=>k>1?12+(i-(k-1)/2)*(20/(k-1)):12); xs.forEach((x,i)=>{ s+=`<circle cx="${x.toFixed(2)}" cy="${y}" r="${r}"/>`; if(prev) s+=`<path d="M${prev.xs[i>>1].toFixed(2)} ${prev.y-1.8}L${x.toFixed(2)} ${y+r}"/>`; }); prev={xs,y}; } return s; }
  const IC={
    person:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>',
    parents:'<circle cx="6.5" cy="6" r="2.5"/><circle cx="17.5" cy="6" r="2.5"/><circle cx="12" cy="18.5" r="2.5"/><path d="M6.5 8.5V12h11V8.5M12 12v4"/>',
    ped4:pedigree(3), ped8:pedigree(4),
    ring:'<circle cx="12" cy="14.5" r="6"/><path d="M9.5 4.5h5L16 6.8 12 9.3 8 6.8z"/>',
    cousins:'<circle cx="12" cy="4" r="2"/><path d="M12 6v2.5M6 8.5h12M6 8.5V11M18 8.5V11"/><circle cx="6" cy="13" r="2"/><circle cx="18" cy="13" r="2"/><path d="M6 15v3M18 15v3"/><circle cx="6" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M9 20h6" stroke-dasharray="1.2 2"/>',
    portrait:'<ellipse cx="12" cy="12" rx="7.5" ry="9.5"/><circle cx="12" cy="10" r="2.6"/><path d="M7.8 17.2c1-2.1 2.5-3.2 4.2-3.2s3.2 1.1 4.2 3.2"/>',
    quill:'<path d="M20 4C13 5 8.5 9.5 7 17"/><path d="M20 4c-.5 5-3.5 9-9 10.5"/><path d="M4 20l3-3"/>',
    doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 11h6M9.5 14h6M9.5 17h4"/>',
    spark:'<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/>',
    wave:'<path d="M3 12h1.5M7 8.5v7M10.5 5v14M14 8v8M17.5 10v4M21 12h-.5"/>',
    brief:'<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5v-2h6v2M3.5 12.5h17"/>',
    frames:'<rect x="3" y="7" width="12" height="13" rx="1.5"/><path d="M7 7V4h13v13h-5"/><circle cx="9" cy="12" r="2"/><path d="M5.5 18c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4"/>',
    docs:'<path d="M9 7h7l3 3v11H9z"/><path d="M16 7v3h3"/><path d="M6 4h7M6 4v14"/><circle cx="14" cy="16" r="2"/>',
    card:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="2"/><path d="M5.8 15.5c.6-1.2 1.6-1.8 2.7-1.8s2.1.6 2.7 1.8M14 9.5h4M14 14l1.5 1.5 3-3"/>',
    book:'<path d="M12 6.5C10 5 7 4.5 4 5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v14"/>',
    box:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 13h4"/>',
    faces:'<ellipse cx="7" cy="9.5" rx="3.8" ry="4.8"/><ellipse cx="17" cy="9.5" rx="3.8" ry="4.8"/><ellipse cx="12" cy="15" rx="3.8" ry="4.8"/>',
    pin:'<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    move:'<circle cx="5" cy="17" r="2"/><circle cx="19" cy="7" r="2"/><path d="M7 16c5-1 5-8 10-8.5" stroke-dasharray="2 2.2"/>',
    three:'<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M10.9 7 6.1 16M13.1 7l4.8 9M7.2 18h9.6" stroke-dasharray="2 2"/>',
    cap:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5M22 9v5"/>',
    route:'<circle cx="5" cy="19" r="2"/><path d="M7 19h6a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h5" stroke-dasharray="2 2"/><path d="M19 10s-3-2.8-3-5a3 3 0 0 1 6 0c0 2.2-3 5-3 5z"/>',
    hour:'<path d="M6 3h12M6 21h12M7.5 3c0 5.5 9 5 9 9s-9 3.5-9 9M16.5 3c0 5.5-9 5-9 9s9 3.5 9 9"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.1 4.9-4.9 2.1 2.1-4.9z"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
    roots:'<path d="M12 3v8M12 11c-1 4-4 5-7 6M12 11c1 4 4 5 7 6M12 11v10M9 15.5 7.5 21M15 15.5l1.5 5.5"/>',
    bio:'<path d="M3 6c2.5-1 5-1 7 .5v13c-2-1.5-4.5-1.5-7-.5z"/><path d="M10 6.5v13"/><path d="M17 16s-4-3.6-4-6.8a4 4 0 0 1 8 0c0 3.2-4 6.8-4 6.8z"/><circle cx="17" cy="9.2" r="1.3"/>',
    bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/>',
    arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>', x:'<path d="M6 6l12 12M18 6 6 18"/>'
  };

  /* ---- the tree. cta: [action, param, ru, en]; actions: add · go · edit(field) · open(media|events) · ai(mode) ---- */
  const T=(ru,en)=>({ru,en});
  const N=[
   {id:'root',br:'root',tier:1,x:600,y:620,ic:'person',t:T('Первое имя','First name'),d:T('Добавьте в древо первого человека. Обычно начинают с себя.','Add the first person to the tree. Most people start with themselves.'),m:'n',goal:1,u:U.people,tip:T('Имя, дата и место рождения. Остальное можно дописать позже.','Name, date and place of birth. The rest can wait.'),cta:['add','',T('Добавить человека','Add person')]},

   {id:'k_family',br:'kin',tier:1,x:505,y:620,gl:'5',t:T('Семья','Family'),d:T('Пять человек в древе: вы, родители и ещё двое.','Five people in the tree: you, your parents and two more.'),m:'n',goal:5,u:U.people,req:['root'],tip:T('Братья, сёстры, супруги и дети вспоминаются быстрее всего.','Siblings, spouses and children come to mind fastest.'),cta:['add','',T('Добавить человека','Add person')]},
   {id:'k_parents',br:'kin',tier:1,x:430,y:560,ic:'parents',t:T('Двое родителей','Both parents'),d:T('У кого-то в древе указаны и отец, и мать.','Someone in the tree has both a father and a mother.'),m:'bothParents',goal:1,req:['k_family'],tip:T('Откройте карточку и нажмите «+ Родитель».','Open a card and tap “+ Parent”.'),cta:['go','tree',T('Открыть древо','Open the tree')]},
   {id:'k_15',br:'kin',tier:2,x:430,y:680,gl:'15',t:T('Пятнадцать','Fifteen'),d:T('15 человек в древе. Тёти, дяди и их дети быстро добавляют ширины.','15 people in the tree. Aunts, uncles and cousins widen it fast.'),m:'n',goal:15,u:U.people,req:['k_family'],tip:T('Спросите у родителей, сколько у них было братьев и сестёр.','Ask your parents how many siblings they had.'),cta:['add','',T('Добавить человека','Add person')]},
   {id:'k_gen3',br:'kin',tier:2,x:355,y:500,gl:'III',t:T('Три колена','Three generations'),d:T('Древо охватывает три поколения: вы, родители, бабушки и дедушки.','The tree spans three generations: you, your parents, your grandparents.'),m:'gens',goal:3,u:U.gen,req:['k_parents'],tip:T('Колено — поколение в родословной. Третье колено от вас — бабушки и дедушки.','Your grandparents are the third generation back.'),cta:['go','tree',T('Открыть древо','Open the tree')]},
   {id:'k_patro',br:'kin',tier:1,x:355,y:620,gl:'-ич',t:T('Отчества','Patronymics'),d:T('Отчество указано у десяти человек. Оно называет имя отца, и Predki сам предложит его карточку.','Ten people have a patronymic. It names the father, and Predki suggests his card.'),m:'patronymics',goal:10,u:U.people,req:['k_parents'],tip:T('Впишите отчество — карточка отца появится с именем и фамилией.','Enter a patronymic and the father’s card appears with a name and surname.'),cta:['edit','patronymic',T('Вписать отчество','Add a patronymic')]},
   {id:'k_cousins',br:'kin',tier:2,x:355,y:740,ic:'cousins',t:T('Двоюродные','Cousins'),d:T('В древе есть двоюродные братья или сёстры: общие бабушка и дедушка, разные родители.','The tree has cousins: shared grandparents, different parents.'),m:'cousins',goal:1,req:['k_15'],tip:T('Добавьте детей к брату или сестре одного из родителей.','Add children to a parent’s brother or sister.'),cta:['go','tree',T('Открыть древо','Open the tree')]},
   {id:'k_gp',br:'kin',tier:2,x:280,y:440,ic:'ped4',t:T('Четверо','All four'),d:T('У одного человека известны все четыре бабушки и дедушки.','One person has all four grandparents known.'),m:'gpMax',goal:4,u:U.gp,req:['k_gen3'],tip:T('Про линию матери обычно знают меньше. Начните с неё.','The mother’s line is usually less known. Start there.'),cta:['go','tree',T('Открыть древо','Open the tree')]},
   {id:'k_maiden',br:'kin',tier:2,x:280,y:560,ic:'ring',t:T('Девичьи фамилии','Maiden names'),d:T('Указана девичья фамилия у трёх женщин. По ним ищут материнские линии.','Three women have a maiden name. That is how maternal lines are traced.'),m:'maidens',goal:3,u:U.women,req:['k_gen3'],tip:T('Девичьи фамилии прабабушек теряются первыми. Спросите старших, пока есть кого.','Great-grandmothers’ maiden names are the first to be lost. Ask your elders.'),cta:['edit','maiden',T('Вписать девичью фамилию','Add a maiden name')]},
   {id:'k_30',br:'kin',tier:3,x:280,y:680,gl:'30',t:T('Тридцать','Thirty'),d:T('30 человек в древе.','30 people in the tree.'),m:'n',goal:30,u:U.people,req:['k_15'],tip:T('Архивариус быстро добавляет людей из длинных рассказов.','The archivist adds people from long stories quickly.'),cta:['ai','text',T('Открыть архивариуса','Open the archivist')]},
   {id:'k_gen4',br:'kin',tier:3,x:205,y:500,gl:'IV',t:T('Четыре колена','Four generations'),d:T('Прадеды и прабабушки в древе.','Great-grandparents are in the tree.'),m:'gens',goal:4,u:U.gen,req:['k_gp'],tip:T('Имена прадедов часто есть в отчествах бабушек и дедушек.','Great-grandfathers’ names often hide in grandparents’ patronymics.'),cta:['go','tree',T('Открыть древо','Open the tree')]},
   {id:'k_gen5',br:'kin',tier:3,x:130,y:440,gl:'V',t:T('Пять колен','Five generations'),d:T('Прапрадеды. Обычно это люди XIX века, их ищут по метрическим книгам.','Great-great-grandparents, usually born in the 19th century and found in parish registers.'),m:'gens',goal:5,u:U.gen,req:['k_gen4'],tip:T('Метрические книги хранятся в областных архивах, многие оцифрованы.','Parish registers are kept in regional archives, many are digitised.'),cta:['go','tree',T('Открыть древо','Open the tree')]},
   {id:'k_ggp',br:'kin',tier:3,x:130,y:560,ic:'ped8',t:T('Восемь прадедов','All eight'),d:T('У одного человека известны все восемь прадедов и прабабушек. Редкая полнота.','One person has all eight great-grandparents known. A rare level of completeness.'),m:'ggpMax',goal:8,u:U.gp,req:['k_gen5'],tip:T('Составьте список недостающих и спросите о каждом отдельно.','List the missing ones and ask about each separately.'),cta:['go','tree',T('Открыть древо','Open the tree')]},
   {id:'k_100',br:'kin',tier:4,x:62,y:650,gl:'100',t:T('Сотня','One hundred'),d:T('100 человек в древе. Так выглядит большой род.','100 people in the tree. This is what a large family looks like.'),m:'n',goal:100,u:U.people,req:['k_30'],tip:T('Боковые ветви: семьи братьев и сестёр прадедов.','Side branches: families of your great-grandparents’ siblings.'),cta:['add','',T('Добавить человека','Add person')]},

   {id:'c_face',br:'chron',tier:1,x:600,y:525,ic:'portrait',t:T('Первое лицо','First face'),d:T('Портрет хотя бы у одного человека.','At least one person has a portrait.'),m:'portraits',goal:1,u:U.portrait,req:['root'],tip:T('Подойдёт снимок старой карточки из альбома на телефон.','A phone photo of an old album print works fine.'),cta:['edit','avatar',T('Добавить портрет','Add a portrait')]},
   {id:'c_story',br:'chron',tier:1,x:530,y:465,ic:'quill',t:T('Первая история','First story'),d:T('Биография в несколько предложений (от 100 знаков) у одного человека.','One person has a biography of a few sentences (100+ characters).'),m:'stories',goal:1,u:U.story,req:['c_face'],tip:T('Где жил, кем работал, что о нём рассказывают в семье.','Where they lived, what they did, what the family tells about them.'),cta:['edit','bio',T('Написать историю','Write a story')]},
   {id:'c_doc',br:'chron',tier:1,x:670,y:465,ic:'doc',t:T('Первый документ','First document'),d:T('Скан документа: метрика, диплом, письмо, трудовая книжка.','A scanned document: birth record, diploma, letter, employment record.'),m:'docs',goal:1,u:U.file,req:['c_face'],tip:T('Документ можно сфотографировать, скан не обязателен.','A photo of the document is enough.'),cta:['open','media',T('Загрузить документ','Upload a document')]},
   {id:'c_gallery',br:'chron',tier:2,x:460,y:405,ic:'frames',t:T('Галерея','Gallery'),d:T('Портреты у десяти человек.','Ten people have portraits.'),m:'portraits',goal:10,u:U.portrait,req:['c_story'],tip:T('Одно групповое фото можно разрезать на портреты.','One group photo can be cropped into several portraits.'),cta:['edit','avatar',T('Добавить портрет','Add a portrait')]},
   {id:'c_jobs',br:'chron',tier:1,x:600,y:405,ic:'brief',t:T('Кем работали','Occupations'),d:T('Профессия указана у десяти человек.','Ten people have an occupation.'),m:'jobs',goal:10,u:U.people,req:['c_story'],tip:T('Профессии хорошо ищутся в трудовых книжках и некрологах.','Employment records and obituaries are good sources.'),cta:['edit','job',T('Вписать профессию','Add an occupation')]},
   {id:'c_ai',br:'chron',tier:1,x:740,y:405,ic:'spark',t:T('Помощь архивариуса','Archivist’s help'),d:T('Получите первый черновик от ИИ-архивариуса.','Get your first draft from the AI archivist.'),m:'aiUsed',goal:1,req:['c_doc'],tip:T('Вставьте любой текст о семье. Архивариус предложит карточки, вы их проверите.','Paste any text about the family. The archivist drafts cards for you to check.'),cta:['ai','text',T('Открыть архивариуса','Open the archivist')]},
   {id:'c_full',br:'chron',tier:2,x:530,y:345,ic:'card',t:T('Полная карточка','Complete card'),d:T('Карточка заполнена на 100%: имя, пол, дата и место рождения, профессия, история, портрет и события.','A card filled 100%: name, gender, birth date and place, occupation, story, portrait and events.'),m:'fullCard',goal:1,req:['c_jobs'],tip:T('Начните с человека, о котором знаете больше всего.','Start with the person you know most about.'),cta:['open','fullest',T('Открыть самую полную карточку','Open the fullest card')]},
   {id:'c_papers',br:'chron',tier:2,x:670,y:345,ic:'docs',t:T('Метрики','Records'),d:T('Документы есть у пяти человек.','Five people have documents.'),m:'docPeople',goal:5,u:U.people,req:['c_ai'],tip:T('Архивариус прочитает фото документа и заполнит карточку.','The archivist reads a document photo and fills the card.'),cta:['ai','photo',T('Прочитать документ','Read a document')]},
   {id:'c_voice',br:'chron',tier:2,x:810,y:345,ic:'wave',t:T('Голос семьи','Family voice'),d:T('Расшифруйте запись разговора с родственником через архивариуса.','Transcribe a recorded conversation with a relative through the archivist.'),m:'aiAudio',goal:1,req:['c_ai'],tip:T('Запишите бабушку на диктофон. Даже короткий разговор даёт несколько карточек.','Record your grandmother. Even a short talk yields several cards.'),cta:['ai','audio',T('Загрузить запись','Upload a recording')]},
   {id:'c_20',br:'chron',tier:3,x:460,y:285,ic:'book',t:T('Летописец','Chronicler'),d:T('Истории у двадцати человек.','Twenty people have stories.'),m:'stories',goal:20,u:U.story,req:['c_full'],tip:T('Две-три фразы на человека уже считаются историей.','Two or three sentences per person already count.'),cta:['edit','bio',T('Написать историю','Write a story')]},
   {id:'c_archive',br:'chron',tier:3,x:740,y:285,ic:'box',t:T('Семейный архив','Family archive'),d:T('50 фотографий и документов в древе.','50 photos and documents in the tree.'),m:'media',goal:50,u:U.file,req:['c_papers'],tip:T('Разберите один семейный альбом целиком.','Go through one family album cover to cover.'),cta:['open','media',T('Загрузить файлы','Upload files')]},
   {id:'c_faces',br:'chron',tier:4,x:600,y:215,ic:'faces',t:T('Каждое лицо','Every face'),d:T('Портрет у каждого человека в древе, когда в нём хотя бы 25 человек.','Everyone in the tree has a portrait, with at least 25 people.'),m:'faceAll',goal:25,req:['c_20','c_archive'],tip:T('Людям без фото подойдёт портрет брата, сестры или ребёнка с пометкой.','For people without photos, a sibling’s or child’s portrait with a note will do.'),cta:['edit','avatar',T('Добавить портрет','Add a portrait')],
     fmt:m=>{ const g=Math.max(25,m.n); return L()==='en'?`${m.portraits} of ${g} portraits`:`${m.portraits} из ${g} ${pl(g,U.portrait)}`; }},

   {id:'r_born',br:'road',tier:1,x:695,y:620,ic:'pin',t:T('Места рождения','Birthplaces'),d:T('Место рождения указано у пяти человек.','Five people have a birthplace.'),m:'birthPlaces',goal:5,u:U.people,req:['root'],tip:T('Город или село из паспорта, свидетельства или со слов родных.','A town or village from a passport, a certificate or relatives’ words.'),cta:['edit','birthPlace',T('Вписать место рождения','Add a birthplace')]},
   {id:'r_move',br:'road',tier:1,x:770,y:560,ic:'move',t:T('Первый переезд','First move'),d:T('Событие «Переезд» с местом на карте.','A “Move” event with a place on the map.'),m:'moveGeo',goal:1,req:['r_born'],tip:T('Эвакуация, распределение, переезд к супругу — всё это переезды.','Evacuation, a job posting, moving to a spouse — all count.'),cta:['open','events',T('Добавить переезд','Add a move')]},
   {id:'r_3',br:'road',tier:1,x:770,y:680,ic:'three',t:T('Три города','Three cities'),d:T('Семья жила в трёх разных городах.','The family lived in three different cities.'),m:'cities',goal:3,u:U.city,req:['r_born'],tip:T('Считаются места из событий: рождение, учёба, работа, переезд.','Places from events count: birth, study, work, move.'),cta:['go','map',T('Открыть карту','Open the map')]},
   {id:'r_work',br:'road',tier:2,x:845,y:500,ic:'cap',t:T('Учёба и работа','Study and work'),d:T('События учёбы или работы у пяти человек.','Five people have study or work events.'),m:'eduWork',goal:5,u:U.people,req:['r_move'],tip:T('Где учился и куда распределили — частая причина переезда.','Where they studied and got posted is a common reason to move.'),cta:['open','events',T('Добавить учёбу или работу','Add study or work')]},
   {id:'r_route',br:'road',tier:2,x:845,y:620,ic:'route',t:T('Маршрут жизни','Life route'),d:T('У одного человека три переезда, учёбы или работы в других городах.','One person has three moves, studies or jobs in other cities.'),m:'maxReloc',goal:3,u:U.step,req:['r_move'],tip:T('Выберите самого непоседливого родственника.','Pick the most restless relative.'),cta:['open','events',T('Добавить событие','Add an event')]},
   {id:'r_1000',br:'road',tier:2,x:845,y:740,gl:'1000',t:T('Тысяча вёрст','A thousand versts'),d:T('Один переезд длиннее тысячи вёрст (около 1067 км).','One move longer than a thousand versts (about 1,067 km).'),m:'longest',goal:1067,u:U.km,req:['r_3'],tip:T('Эвакуации 1941 года часто дают самые длинные маршруты.','1941 evacuations often give the longest routes.'),cta:['go','map',T('Открыть карту','Open the map')]},
   {id:'r_century',br:'road',tier:3,x:920,y:440,ic:'hour',t:T('Век на карте','A century on the map'),d:T('События семьи охватывают сто лет.','Family events span a hundred years.'),m:'span',goal:100,u:U.year,req:['r_work'],tip:T('Добавьте рождение самого старшего предка с датой.','Add the oldest ancestor’s birth with a date.'),cta:['go','map',T('Открыть карту','Open the map')]},
   {id:'r_10k',br:'road',tier:3,x:920,y:560,ic:'compass',t:T('Десять тысяч вёрст','Ten thousand versts'),d:T('Весь путь семьи по карте длиннее 10 000 вёрст (около 10 668 км). Общие переезды считаются один раз.','The family’s whole route exceeds 10,000 versts (about 10,668 km). Shared moves count once.'),m:'pathKm',goal:10668,u:U.km,req:['r_1000'],tip:T('Проверьте, у всех ли переездов указано место.','Check that every move has a place.'),cta:['go','map',T('Открыть карту','Open the map')]},
   {id:'r_10',br:'road',tier:2,x:920,y:680,gl:'10',t:T('Десять городов','Ten cities'),d:T('Семья жила в десяти разных городах.','The family lived in ten different cities.'),m:'cities',goal:10,u:U.city,req:['r_3'],tip:T('Места рождения прадедов часто добавляют новые города.','Great-grandparents’ birthplaces often add new cities.'),cta:['go','map',T('Открыть карту','Open the map')]},
   {id:'r_150',br:'road',tier:3,x:995,y:500,gl:'150',t:T('Полтора века','A century and a half'),d:T('События семьи охватывают 150 лет.','Family events span 150 years.'),m:'span',goal:150,u:U.year,req:['r_century'],tip:T('Нужен предок, родившийся в середине XIX века.','You need an ancestor born in the mid-19th century.'),cta:['go','map',T('Открыть карту','Open the map')]},
   {id:'r_25',br:'road',tier:3,x:1070,y:680,gl:'25',t:T('Двадцать пять городов','Twenty-five cities'),d:T('Семья жила в двадцати пяти разных городах.','The family lived in twenty-five different cities.'),m:'cities',goal:25,u:U.city,req:['r_10'],tip:T('Боковые ветви рода часто живут в других странах.','Side branches often live in other countries.'),cta:['go','map',T('Открыть карту','Open the map')]},
   {id:'r_world',br:'road',tier:4,x:1138,y:600,ic:'globe',t:T('Вокруг света','Around the world'),d:T('Весь путь семьи длиннее экватора: 40 075 км.','The family’s whole route is longer than the equator: 40,075 km.'),m:'pathKm',goal:40075,u:U.km,req:['r_10k','r_25'],tip:T('Считаются все переезды всех людей, повторы — один раз.','All moves of all people count, repeats once.'),cta:['go','map',T('Открыть карту','Open the map')]},

   {id:'x_faces',br:'link',tier:3,x:375,y:350,ic:'faces',t:T('Лица поколений','Faces of generations'),d:T('Портреты есть в четырёх поколениях.','Portraits in four generations.'),m:'faceGens',goal:4,u:U.gen,req:['k_gp','c_gallery'],tip:T('Начните с самого старшего снимка в семье.','Start with the oldest photo in the family.'),cta:['edit','avatar',T('Добавить портрет','Add a portrait')]},
   {id:'x_bio',br:'link',tier:3,x:890,y:360,ic:'bio',t:T('Биография','Biography'),d:T('У одного человека есть история и маршрут из трёх переездов, учёбы или работы.','One person has a story and a route of three moves, studies or jobs.'),m:'bioRoute',goal:1,req:['c_voice','r_century'],tip:T('Расскажите историю того, кто больше всех ездил.','Tell the story of the one who travelled most.'),cta:['edit','bio',T('Написать историю','Write a story')]},
   {id:'x_roots',br:'link',tier:3,x:600,y:745,ic:'roots',t:T('Корни','Roots'),d:T('Известны места рождения всех четырёх бабушек и дедушек одного человека.','Birthplaces known for all four grandparents of one person.'),m:'rootsOk',goal:1,req:['k_15','r_3'],tip:T('Откуда родом каждый из четверых? Спросите в семье.','Where was each of the four born? Ask the family.'),cta:['edit','birthPlace',T('Вписать место рождения','Add a birthplace')]},

   {id:'s_name',br:'secret',tier:3,x:150,y:185,gl:'Aa',t:T('Тёзки','Namesakes'),d:T('Имя передали через поколения: два человека с одним именем, разница в рождении больше 40 лет.','A name passed down: two people with the same first name, born 40+ years apart.'),hint:T('Связано с именами.','It is about names.'),m:'namesake',goal:1,req:[],tip:T('Имена часто давали в честь дедушек и бабушек.','Children were often named after grandparents.'),cta:['go','people',T('Открыть людей','Open people')]},
   {id:'s_long',br:'secret',tier:3,x:1050,y:185,gl:'90',t:T('Долгожитель','Long life'),d:T('В древе есть человек, проживший 90 лет и больше.','Someone in the tree lived to 90 or more.'),hint:T('Связано с датами жизни.','It is about life dates.'),m:'maxAge',goal:90,u:U.year,req:[],tip:T('Нужны обе даты: рождения и смерти.','Both dates are needed: birth and death.'),cta:['go','people',T('Открыть людей','Open people')]}
  ];
  const BR={kin:{ru:'Род',en:'Kin',lx:44,ly:370,a:'start'},chron:{ru:'Летопись',en:'Chronicle',lx:600,ly:142,a:'middle'},road:{ru:'Странствия',en:'Journeys',lx:1156,ly:370,a:'end'}};
  const R={1:19,2:22,3:25,4:31};
  const TX=x=>600+(x-600)*.8, TY=y=>620+(y-620)*1.2;
  N.forEach(n=>{ n.x=TX(n.x); n.y=TY(n.y); n.r=R[n.tier]; n.req=n.req||[]; });
  ['kin','chron','road'].forEach(b=>{ BR[b].lx=TX(BR[b].lx); BR[b].ly=TY(BR[b].ly); }); BR.kin.lx-=20; BR.road.lx+=20; BR.kin.ly+=40; BR.road.ly+=40;
  const byN=id=>N.find(n=>n.id===id);

  /* ---- state ---- */
  let M={}, ST={};
  function evaluate(){
    M=metrics(); ST={}; const kept=new Set(S.achievements||[]); const met=n=>(M[n.m]||0)>=n.goal;
    N.forEach(n=>ST[n.id]='lock'); let ch=true;
    while(ch){ ch=false; N.forEach(n=>{ if(ST[n.id]==='done') return; if(kept.has(n.id)||(n.req.every(r=>ST[r]==='done')&&met(n))){ ST[n.id]='done'; ch=true; } }); }
    N.forEach(n=>{ if(ST[n.id]==='done') return; const ok=n.req.every(r=>ST[r]==='done'); ST[n.id]=met(n)?'ready':(ok&&n.br!=='secret')?'avail':'lock'; });
    return ST;
  }
  const ratio=n=>n.goal?Math.min(1,(M[n.m]||0)/n.goal):0;
  const cascade=id=>{ const s=Object.assign({},ST); s[id]='done'; let c=0,ch=true; while(ch){ ch=false; N.forEach(n=>{ if(s[n.id]==='ready'&&n.req.every(r=>s[r]==='done')){ s[n.id]='done'; c++; ch=true; } }); } return c; };
  function fmt(n){ if(n.fmt) return n.fmt(M); const v=M[n.m]||0; if(n.goal===1) return v>=1?w('met'):w('notMet'); const u=n.u||U.people;
    return `${nf(Math.min(v,n.goal))} ${w('of')} ${nf(n.goal)} ${pl(n.goal,u)}`; }

  /* ---- achievements bookkeeping (called from commit) ---- */
  function check(quiet){
    const valid=new Set(N.map(n=>n.id)); S.achievements=(S.achievements||[]).filter(id=>valid.has(id)); S.achDates=S.achDates||{}; S.achSeen=(S.achSeen||[]).filter(id=>valid.has(id));
    evaluate(); const got=N.filter(n=>ST[n.id]==='done'&&!S.achievements.includes(n.id));
    got.forEach(n=>{ S.achievements.push(n.id); S.achDates[n.id]=new Date().toISOString(); if(quiet) S.achSeen.push(n.id); });
    if(!quiet&&got.length) toast(got.length===1?t('ach.unlocked',{t:tx(got[0].t)}):t('ach.unlockedN',{n:got.length}),'ach');
    return got.length;
  }
  const unseen=()=>(S.achievements||[]).filter(id=>!(S.achSeen||[]).includes(id)).length;

  /* ---- geometry ---- */
  function hull(pts){ pts=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]); const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]); const lo=[],up=[];
    for(const p of pts){ while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0) lo.pop(); lo.push(p); }
    for(const p of pts.reverse()){ while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0) up.pop(); up.push(p); }
    return lo.slice(0,-1).concat(up.slice(0,-1)); }
  function pick(field){ const P=S.people; if(field==='maiden') return P.find(p=>p.gender==='f'&&!p.maiden); if(field==='patronymic') return P.find(p=>!p.patronymic&&p.first); if(field==='bio') return P.find(p=>(p.bio||'').length<100); return P.find(p=>!p[field]); }
  function act(n,st,select){ // returns {label, primary, run}
    const [a,param,lab]=n.cta, general=a==='go'?param:a==='ai'?'ai':a==='add'?'tree':a==='open'&&param==='events'?'people':'people';
    if(st==='done'||(n.br==='secret'&&st!=='done')) return {label:w('gen')[general],primary:false,run:()=>go(general)};
    const blockers=n.req.filter(r=>ST[r]!=='done').map(byN);
    if(st==='ready'&&blockers.length){ const b=blockers.find(x=>ST[x.id]==='avail')||blockers[0]; return {label:fill(w('first'),{b:tx(b.t)}),primary:true,run:()=>select&&select(b.id)}; }
    return {label:tx(lab),primary:true,run:()=>{
      if(a==='add'){ go('tree'); setTimeout(()=>editPerson(null),150); return; }
      if(a==='go'){ go(param); return; }
      if(a==='ai'){ ui.ai.mode=param; ui.ai.transcript=''; go('ai'); return; }
      if(a==='edit'){ const p=pick(param); if(!p){ go('people'); return; } go('tree'); setTimeout(()=>editPerson(p.id),150); return; }
      if(a==='open'){ const P=S.people; let p=null;
        if(param==='fullest') p=P.slice().sort((x,y)=>fillPercent(y)-fillPercent(x))[0];
        else if(param==='media') p=P.find(x=>!(x.media||[]).some(m=>m.type==='doc'))||P[0];
        else p=P.slice().sort((x,y)=>(x.events||[]).length-(y.events||[]).length)[0];
        if(!p){ go('tree'); return; } go('tree'); setTimeout(()=>openPerson(p.id),150); } }};
  }
  function firstGoal(){ const g=N.filter(n=>ST[n.id]==='avail').map(n=>({n,c:cascade(n.id),p:ratio(n)})).sort((a,b)=>b.c-a.c||b.p-a.p); return g.length?g[0].n.id:null; }

  /* ---- памятная дата: nearest ancestor birthday within 60 days (shown on the tree page) ---- */
  function nearestBirthday(){
    const today=new Date(); today.setHours(0,0,0,0); let best=null;
    S.people.forEach(p=>{ const s=String(p.birthDate||''); let m=s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/), y,mo,d; if(m){ d=+m[1]; mo=+m[2]; y=+m[3]; } else if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/))){ y=+m[1]; mo=+m[2]; d=+m[3]; } else return;
      let nx=new Date(today.getFullYear(),mo-1,d); if(nx<today) nx=new Date(today.getFullYear()+1,mo-1,d); const days=Math.round((nx-today)/864e5);
      if(days<=60&&(!best||days<best.days)) best={p,days,age:nx.getFullYear()-y,date:nx}; });
    if(!best) return null;
    const {p,days,age,date}=best, mw=W[L()].memo;
    const when=days===0?mw.today:days===1?mw.tomorrow:fill(mw.inN,{n:days,d:pl(days,U.day)});
    return {id:p.id,day:date.getDate(),month:date.toLocaleDateString(L()==='en'?'en-GB':'ru-RU',{month:'short'}).replace('.',''),line:fill(mw.line,{w:when,a:age,y:pl(age,U.year)}),name:fullName(p)};
  }

  const earnedDate=n=>{ const d=S.achDates&&S.achDates[n.id]; return d?new Date(d).toLocaleDateString(L()==='en'?'en-GB':'ru-RU',{day:'numeric',month:'long'}):''; };
  return {N,BR,IC,U,W,w,tx,pl,fill,L,byN,evaluate,check,unseen,ratio,cascade,fmt,hull,act,firstGoal,nearestBirthday,earnedDate,
    get ST(){ return ST; }, get M(){ return M; }, title:n=>tx(n.t)};
})();
