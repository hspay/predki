// @ts-nocheck — mock AI archivist, ported verbatim. Provider-agnostic shape: extract(text) -> drafts[]; a GigaChat adapter replaces it later.
import { findCity } from './world'
import { uid } from './core'

const NAMES=[ // [nominative, stem, gender]
['Александр','Александр','m'],['Алексей','Алексе','m'],['Андрей','Андре','m'],['Антон','Антон','m'],['Борис','Борис','m'],['Вадим','Вадим','m'],['Василий','Васили','m'],['Виктор','Виктор','m'],['Владимир','Владимир','m'],['Георгий','Георги','m'],['Григорий','Григори','m'],['Дмитрий','Дмитри','m'],['Евгений','Евгени','m'],['Егор','Егор','m'],['Иван','Иван','m'],['Игорь','Игор','m'],['Илья','Иль','m'],['Иосиф','Иосиф','m'],['Кирилл','Кирилл','m'],['Константин','Константин','m'],['Лев','Льв','m'],['Леонид','Леонид','m'],['Матвей','Матве','m'],['Михаил','Михаил','m'],['Николай','Никола','m'],['Олег','Олег','m'],['Павел','Павл','m'],['Пётр','Петр','m'],['Петр','Петр','m'],['Роман','Роман','m'],['Семён','Семён','m'],['Сергей','Серге','m'],['Степан','Степан','m'],['Тимофей','Тимофе','m'],['Фёдор','Фёдор','m'],['Юрий','Юри','m'],['Яков','Яков','m'],['Максим','Максим','m'],['Никита','Никит','m'],['Артём','Артём','m'],['Аркадий','Аркади','m'],['Валентин','Валентин','m'],['Виталий','Витали','m'],['Геннадий','Геннади','m'],['Данил','Данил','m'],['Даниил','Даниил','m'],['Ефим','Ефим','m'],['Захар','Захар','m'],['Прохор','Прохор','m'],['Карл','Карл','m'],
['Анна','Анн','f'],['Анастасия','Анастаси','f'],['Валентина','Валентин','f'],['Вера','Вер','f'],['Галина','Галин','f'],['Дарья','Дарь','f'],['Евдокия','Евдоки','f'],['Екатерина','Екатерин','f'],['Елена','Елен','f'],['Елизавета','Елизавет','f'],['Зинаида','Зинаид','f'],['Зоя','Зо','f'],['Ирина','Ирин','f'],['Ксения','Ксени','f'],['Лариса','Ларис','f'],['Лидия','Лиди','f'],['Любовь','Любов','f'],['Людмила','Людмил','f'],['Мария','Мари','f'],['Марина','Марин','f'],['Надежда','Надежд','f'],['Наталья','Наталь','f'],['Наташа','Наташ','f'],['Нина','Нин','f'],['Ольга','Ольг','f'],['Полина','Полин','f'],['Прасковья','Прасковь','f'],['Раиса','Раис','f'],['Светлана','Светлан','f'],['София','Софи','f'],['Софья','Софь','f'],['Тамара','Тамар','f'],['Татьяна','Татьян','f'],['Юлия','Юли','f'],['Александра','Александр','f'],['Антонина','Антонин','f'],['Клавдия','Клавди','f'],['Пелагея','Пелаге','f'],['Аграфена','Аграфен','f'],['Ева','Ев','f'],['Инна','Инн','f'],['Ольга','Ольг','f'],
];
const REL_WORDS={'прабабушка':['f','прабабушка'],'прадед':['m','прадед'],'прадедушка':['m','прадед'],'бабушка':['f','бабушка'],'дедушка':['m','дедушка'],'дед':['m','дедушка'],'мама':['f','мать'],'мать':['f','мать'],'папа':['m','отец'],'отец':['m','отец'],'брат':['m','брат'],'сестра':['f','сестра'],'сын':['m','сын'],'дочь':['f','дочь'],'дядя':['m','дядя'],'тётя':['f','тётя'],'тетя':['f','тётя'],'муж':['m','муж'],'жена':['f','жена'],'гражданин':['m',''],'гражданка':['f','']};
const STOP=new Set(['Моя','Мой','Мои','Наш','Наша','Наши','Твой','Твоя','Перед','После','Там','Тут','Здесь','Дорогая','Дорогой','Пишу','Ну','Вот','Родители','Место','Дата','Бюро','Свидетельство','Расшифровка','Город','Гражданин','Гражданка','Институт','Госпиталь','Порт','Война','Войной','Когда','Потом','Затем','Тысяча']);
const MONTHS={'января':1,'февраля':2,'марта':3,'апреля':4,'мая':5,'июня':6,'июля':7,'августа':8,'сентября':9,'октября':10,'ноября':11,'декабря':12};

function nameToken(tok){ // -> {kind:'first'|'pat'|'last', nom, gender} | null
  const raw=tok.replace(/[^А-ЯЁа-яё-]/g,''); if(!raw||!/^[А-ЯЁ]/.test(raw)||STOP.has(raw)) return null; if(findCity(raw,{major:true})&&!NAMES.some(n=>n[0]===raw)) return null;
  const l=raw.toLowerCase();
  let m=l.match(/^(.+?)(ович|евич|ич)(а|у|ем|е)?$/); if(m&&m[1].length>=2) return {kind:'pat',nom:cap(m[1]+m[2]),gender:'m'};
  m=l.match(/^(.+?)(овн|евн|ичн)(а|ы|е|у|ой)$/); if(m&&m[1].length>=2) return {kind:'pat',nom:cap(m[1]+m[2]+'а'),gender:'f'};
  for(const [nom,stem,g] of NAMES){ const s=stem.toLowerCase(); if(l===nom.toLowerCase()||(l.startsWith(s)&&l.length-s.length<=2)) return {kind:'first',nom,gender:g}; }
  m=l.match(/^(.+?)(ов|ев|ёв|ин|ын)(а|у|ым|ой|е|ым|ою)?$/); if(m&&m[1].length>=2) return {kind:'last',base:m[1]+m[2],nom:cap(m[1]+m[2]),gender:m[3]==='а'||m[3]==='ой'||m[3]==='ою'?'f?':'m?'};
  m=l.match(/^(.+?)(ск|цк)(ий|ого|ому|им|ом|ая|ой|ую)$/); if(m) return {kind:'last',base:m[1]+m[2],nom:cap(m[1]+m[2]+'ий'),gender:/ая|ую/.test(m[3])?'f?':'m?'};
  return null;
}
function cap(s){ return s[0].toUpperCase()+s.slice(1); }
function lastFor(base,g){ return base.endsWith('ск')||base.endsWith('цк')?cap(base+(g==='f'?'ая':'ий')):cap(base+(g==='f'?'а':'')); }

export const MockExtractor={
  extract(text){
    const drafts=[]; const D=(o)=>{ o=Object.assign({id:uid(),first:'',last:'',patronymic:'',maiden:'',gender:'',rel:'',birthYear:'',birthDate:'',birthPlace:'',deathYear:'',deathPlace:'',job:'',events:[],spouses:[],parents:[],conf:{},selected:true},o); drafts.push(o); return o; };
    const findDraft=(m)=>drafts.find(d=>(m.first&&d.first===m.first&&(!m.last||!d.last||d.last===m.last))||(!m.first&&m.last&&d.last===m.last&&!d.first));
    const byRel=(label)=>drafts.find(d=>d.rel===label);
    let lastM=null,lastF=null,lastAny=null,couple=null,lastPlace=null,author=null;
    const setConf=(d,k,v)=>{ if(!d.conf[k]||v==='high') d.conf[k]=v; };
    const cityName=(w)=>{ const c=findCity(w); return c?c.ru:null; };
    // author: "я, Имя Фамилия"
    const am=text.match(/(?<![а-яёА-ЯЁ])я,\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/);
    const parseMention=(str)=>{ const toks=str.split(/\s+/).map(nameToken).filter(Boolean); if(!toks.length) return null; const m={first:'',last:'',patronymic:'',gender:''}; toks.forEach(tk=>{ if(tk.kind==='first'){ m.first=tk.nom; m.gender=m.gender||tk.gender; } else if(tk.kind==='pat'){ m.patronymic=tk.nom; m.gender=m.gender||tk.gender; } else if(tk.kind==='last'){ m.lastBase=tk.base; m.lastGuess=tk.gender; } }); if(m.lastBase){ const g=m.gender||(m.lastGuess==='f?'?'f':'m'); m.gender=m.gender||g; m.last=lastFor(m.lastBase,g); } return (m.first||m.last)?m:null; };
    if(am){ const m=parseMention(am[1]); if(m){ author=D(Object.assign(m,{rel:'я (автор)'})); setConf(author,'first','high'); const md=text.match(/урожд[её]нн(?:ая|ый)\s+([А-ЯЁ][а-яё]+)/); if(md) author.maiden=md[1]; } }
    const sentences=text.replace(/\[[^\]]*\]/g,'').split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(Boolean);
    sentences.forEach(sent=>{
      // ---- mentions with positions
      const ments=[]; const re=/((?:[А-ЯЁ][а-яё-]+)(?:\s+[А-ЯЁ][а-яё-]+){0,2})/g; let mm;
      while((mm=re.exec(sent))){ // shrink to name tokens only
        const words=mm[1].split(/\s+/); let start=0; while(start<words.length&&!nameToken(words[start])) start++; let end=start; while(end<words.length&&nameToken(words[end])) end++; if(end-start===0) continue;
        const str=words.slice(start,end).join(' '); const m=parseMention(str); if(!m) continue; const pos=mm.index+mm[1].indexOf(str);
        // relation word before: "прадеда Георгия", "дед мой, Тимофей", "их дочь Лидия", "мой отец, Василий"
        const before=sent.slice(Math.max(0,pos-40),pos).toLowerCase(); if(/урожд[её]нн(?:ая|ый)\s*$|дорог(?:ая|ой)\s*$/.test(before)) continue; const rw=before.match(/(прабабушк|прадедушк|прадед|бабушк|дедушк|дед|мам|мать|матер|пап|отец|отц|брат|сестр|сын|доч|дяд|т[её]т|муж|жен|гражданин|гражданк)[а-яё]*(?:\s+(?:мой|моя|мои|наш|наша|их|её|его|твой|твоя))?,?\s*(?:—\s*)?$/);
        let rel='',relOwner=null; if(rw){ const key=Object.keys(REL_WORDS).find(k=>k.startsWith(rw[1].slice(0,3))&&(k.startsWith(rw[1])||rw[1].startsWith(k.slice(0,4)))); if(key){ rel=REL_WORDS[key][1]; m.gender=m.gender||REL_WORDS[key][0]; if(/(?<![а-яёА-ЯЁ])(их|у них|наш|наша)(?![а-яёА-ЯЁ])/.test(before)&&(rel==='сын'||rel==='дочь')) relOwner='couple'; } }
        if(!rel){ const after=sent.slice(pos+str.length,pos+str.length+30).toLowerCase(); const ra=after.match(/^,?\s*(?:мо[яйи]|наш[а]?)?\s*(прабабушк|прадед|бабушк|дедушк|дед|мам|отец|сын|доч)[а-яё]*(?:\s+(?:мо[яйи]|наш[а]?))?[,.\s]/); if(ra){ const key=Object.keys(REL_WORDS).find(k=>k.startsWith(ra[1])); if(key){ rel=REL_WORDS[key][1]; m.gender=m.gender||REL_WORDS[key][0]; } } }
        let d=findDraft(m); if(!d){ d=D(m); d.rel=rel; setConf(d,'first',m.first&&m.last?'high':'mid'); if(relOwner==='couple'&&couple) d.parents=couple.map(x=>x.id); } else { if(!d.last&&m.last) d.last=m.last; if(!d.patronymic&&m.patronymic) d.patronymic=m.patronymic; if(!d.rel&&rel) d.rel=rel; if(!d.gender) d.gender=m.gender; }
        ments.push({d,pos,end:pos+str.length}); re.lastIndex=mm.index+mm[1].length;
      }
      // ---- relation-word references without a name: "прадед умер", "бабушка потом переехала", "дед строил"
      const rre=/(?<![а-яёА-ЯЁ])(прабабушка|прадед|прадедушка|бабушка|дедушка|дед|мама|отец|папа)(?![а-яёА-ЯЁ])/gi; let rm; while((rm=rre.exec(sent))){ if(ments.some(x=>(x.pos-rm.index>=0&&x.pos-rm.index<=25&&/^[а-яё]*[\s,]*(?:мо[йя]|наш[а]?|их|твой|твоя)?[\s,]*$/i.test(sent.slice(rm.index+rm[1].length,x.pos)))||(rm.index-x.end>=0&&rm.index-x.end<=12))) continue; const label=REL_WORDS[rm[1].toLowerCase()][1]; const d=byRel(label); if(d) ments.push({d,pos:rm.index,end:rm.index+rm[1].length,ref:true}); }
      ments.sort((a,b)=>a.pos-b.pos);
      // ---- subject resolution helper by position
      const pronouns=[]; const pre=/(?<![а-яёА-ЯЁ])(он|она|они|мы|я|вся семья|семья)(?![а-яёА-ЯЁ])/gi; let pm; while((pm=pre.exec(sent))) pronouns.push({w:pm[1].toLowerCase(),pos:pm.index});
      const subjAt=(i)=>{ let best=null; ments.forEach(x=>{ if(x.pos<=i&&(!best||x.pos>best.pos)){ let ds=[x.d]; if(/мы\s+с\s*$/i.test(sent.slice(Math.max(0,x.pos-8),x.pos))&&author&&author!==x.d){ ds=[author,x.d]; couple=ds.slice(); } best={pos:x.pos,ds}; } }); pronouns.forEach(p=>{ if(p.pos<=i&&(!best||p.pos>best.pos)){ let ds=null; if(p.w==='он'&&lastM) ds=[lastM]; if(p.w==='она'&&lastF) ds=[lastF]; if((p.w==='они'||p.w==='вся семья'||p.w==='семья')&&couple) ds=couple; if(p.w==='мы'){ ds=author?[author]:null; const c=sent.slice(p.pos,p.pos+30).match(/^мы\s+с\s+([А-ЯЁ][а-яё]+)/); if(c){ const m=parseMention(c[1]); const d=m&&(findDraft(m)||D(m)); if(d&&ds) ds=[...ds,d]; else if(d) ds=[d]; if(ds&&ds.length===2) couple=ds.slice(); } } if(p.w==='я'&&author) ds=[author]; if(ds) best={pos:p.pos,ds}; } }); return best?best.ds:(lastAny?[lastAny]:[]); };
      // update lastM/lastF as mentions appear (in order)
      const touch=d=>{ lastAny=d; if(d.gender==='m') lastM=d; if(d.gender==='f') lastF=d; };
      // ---- years and places with positions
      const years=[]; const yre=/\b(1[89]\d\d|20[0-4]\d)(?:-?м|-го| году| года)?/g; let ym; while((ym=yre.exec(sent))) years.push({y:+ym[1],pos:ym.index,used:false});
      const fulldate=sent.match(/(\d{1,2})\s+([а-я]+)\s+(1[89]\d\d|20\d\d)/);
      const places=[]; const pre2=/(?<![а-яёА-ЯЁ])(в|из|под|город|куда)\s+([А-ЯЁ][а-яё-]+(?:\s+[А-ЯЁ][а-яё-]+)?)/g; let plm; while((plm=pre2.exec(sent))){ const nm=cityName(plm[2])||cityName(plm[2].split(' ')[0]); if(nm) places.push({name:nm,pos:plm.index,used:false,prep:plm[1]}); }
      // "Место рождения: город Челябинск"
      const mr=sent.match(/Место рождения:\s*(?:город|г\.|с\.|село|дер\.)?\s*([А-ЯЁ][а-яё-]+)/);
      const nearYear=(i,after)=>{ let best=null; years.forEach(y=>{ if(y.used) return; const dist=Math.abs(y.pos-i); const okDir=after==null||(after?y.pos>=i:y.pos<=i); if(okDir&&(!best||dist<best.dist)) best={y,dist}; }); return best; };
      const takeYear=(i,maxAfter,maxBefore)=>{ maxAfter=maxAfter||45; maxBefore=maxBefore||40; const nv=verbs.find(v=>v.pos>i); let b=nearYear(i,true); if(b&&(b.dist>maxAfter||(nv&&b.y.pos>nv.pos))) b=null; if(!b){ b=nearYear(i,false); if(b&&b.dist>maxBefore) b=null; } if(!b) return null; b.y.used=true; return {year:b.y.y,conf:b.dist<30?'high':'mid'}; };
      const takePlace=(i)=>{ let best=null; places.forEach(p=>{ if(p.used) return; const d=p.pos-i; if(d>=0&&d<70&&(!best||d<best.d)) best={p,d}; }); if(!best){ const hz=sent.slice(Math.max(0,i-40),i+40).match(/(?<![а-яёА-ЯЁ])(здесь|там|туда|к нам)(?![а-яёА-ЯЁ])/i); if(hz&&lastPlace) return {place:lastPlace,conf:'low'}; return null; } best.p.used=true; lastPlace=best.p.name; return {place:best.p.name,conf:best.d<25?'high':'mid'}; };
      // ---- verbs
      const verbs=[]; const vre=/(?<![а-яёА-ЯЁ])(родил(?:ся|ась|ись)|года рождения|умер(?:ла|ли)?|скончал(?:ся|ась)|дожил[а]? до|погиб(?:ла)?|переехал[аи]?|перебрал(?:ся|ась|ись)|переведен[а]?|переведён|эвакуирован[аы]?|вышла замуж за|женился(?: он)? на|поженились|был[а]?|работал[аи]?|живёт|живут|учил(?:ся|ась) в|поступил[а]? в)(?![а-яёА-ЯЁ])/gi; let vm; while((vm=vre.exec(sent))) verbs.push({v:vm[1].trim().toLowerCase().replace(/женился он на/,'женился на'),pos:vm.index});
      let birthSeen=false;
      // process in order of position, interleaving mentions to keep lastM/lastF right
      const items=[...ments.map(x=>({t:'m',pos:x.pos,x})),...verbs.map(v=>({t:'v',pos:v.pos,v}))].sort((a,b)=>a.pos-b.pos);
      items.forEach(it=>{
        if(it.t==='m'){ touch(it.x.d); return; }
        const {v,pos}=it.v; let subj=subjAt(pos);
        if(/^родил/.test(v)){ birthSeen=true; const after=ments.find(x=>x.pos>pos&&x.pos-pos<45&&!x.ref&&/(их|у них|наш|наша|мо[йя]|его|её|дочь|сын|дети)/i.test(sent.slice(pos,x.pos))); if(after){ subj=[after.d]; touch(after.d); if(/(?<![а-яёА-ЯЁ])(их|у них|наш|наша)(?![а-яёА-ЯЁ])/.test(sent.slice(Math.max(0,pos-12),after.pos))&&couple&&!after.d.parents.length) after.d.parents=couple.map(x=>x.id); }
          subj.forEach(d=>{ if(fulldate&&MONTHS[fulldate[2]]){ d.birthDate=`${fulldate[1].padStart(2,'0')}.${String(MONTHS[fulldate[2]]).padStart(2,'0')}.${fulldate[3]}`; d.birthYear=+fulldate[3]; setConf(d,'birthYear','high'); years.forEach(y=>{ if(y.y===+fulldate[3]) y.used=true; }); } else { const y=takeYear(pos); if(y&&!d.birthYear){ d.birthYear=y.year; setConf(d,'birthYear',y.conf); } } const p=takePlace(pos); if(p&&!d.birthPlace){ d.birthPlace=p.place; setConf(d,'birthPlace',p.conf); } }); }
        else if(v==='года рождения'){ const y=nearYear(pos,false); if(y&&y.dist<12){ y.y.used=true; subj.forEach(d=>{ if(!d.birthYear){ d.birthYear=y.y.y; setConf(d,'birthYear','high'); } }); } }
        else if(/^(умер|скончал|дожил|погиб)/.test(v)){ subj.forEach(d=>{ const y=takeYear(pos); if(y&&!d.deathYear){ d.deathYear=y.year; setConf(d,'deathYear',y.conf); } const p=takePlace(pos); if(p&&!d.deathPlace){ d.deathPlace=p.place; setConf(d,'deathPlace',p.conf); } }); }
        else if(/^(переехал|перебрал|переведен|переведён|эвакуирован)/.test(v)){ const y=takeYear(pos,60,60); let p=takePlace(pos); if(!p){ const bef=places.filter(x=>!x.used&&x.pos<pos&&x.prep!=='из'); const any=places.filter(x=>x.pos<pos); if(bef.length){ bef[bef.length-1].used=true; p={place:bef[bef.length-1].name,conf:'mid'}; } else if(any.length){ p={place:any[any.length-1].name,conf:'low'}; } } if(p){ lastPlace=p.place; subj.forEach(d=>{ d.events.push({type:'move',year:y?y.year:'',place:p.place,conf:y&&y.conf==='high'&&p.conf==='high'?'high':'mid'}); }); } }
        else if(/^(вышла замуж за|женился на)/.test(v)){ const after=ments.find(x=>x.pos>pos&&x.pos-pos<40); if(after&&subj.length){ const a=subj[0], b=after.d; if(a!==b){ if(!a.spouses.includes(b.id)) a.spouses.push(b.id); if(!b.spouses.includes(a.id)) b.spouses.push(a.id); couple=[a,b]; const y=takeYear(pos,16,30); if(y){ a.events.push({type:'marriage',year:y.year,place:'',conf:y.conf}); } if(!b.gender) b.gender=v.startsWith('вышла')?'m':'f'; } } }
        else if(/^(был|работал)/.test(v)){ const jm=sent.slice(pos).match(/^(?:был[а]?|работал[аи]?)\s+([а-яё]+)(ом|ем|ей|ой|ью)(?![а-яёА-ЯЁ])/i); if(jm&&!/^(в|на|у|с|по)$/.test(jm[1])){ let job=jm[1]+(jm[2]==='ей'||jm[2]==='ой'||jm[2]==='ью'?(jm[1].endsWith('иц')?'а':'а'):''); if(jm[2]==='ью') job=jm[1]+'ь'; subj.forEach(d=>{ if(!d.job) d.job=cap(job); }); } else { const wm=sent.slice(pos).match(/^работал[аи]?\s+(на|в)\s+([а-яё]+\s+[а-яё]+|[а-яё]+)/i); if(wm) subj.forEach(d=>{ if(!d.job) d.job='работа: '+wm[2]; }); } }
        else if(/^(живёт|живут)/.test(v)){ const p=takePlace(pos); if(p) subj.forEach(d=>d.events.push({type:'other',year:'',place:p.place,note:'живёт',conf:'mid'})); }
        else if(/^(учил|поступил)/.test(v)){ const p=takePlace(pos); const y=takeYear(pos); subj.forEach(d=>d.events.push({type:'study',year:y?y.year:'',place:p?p.place:'',conf:'mid'})); }
      });
      // elliptical birth: "…, а я, Галина Крылова, урождённая Мельникова, в 1955 году в Томске"
      if(birthSeen) ments.forEach(x=>{ if(x.d.birthYear) return; const tail=sent.slice(x.end,x.end+80); const ym2=tail.match(/(1[89]\d\d|20\d\d)/); if(ym2){ const yy=years.find(y=>y.y===+ym2[1]&&!y.used); if(yy){ yy.used=true; x.d.birthYear=yy.y; setConf(x.d,'birthYear','mid'); const pl=places.find(p=>!p.used&&p.pos>x.end&&p.pos-x.end<80); if(pl){ pl.used=true; x.d.birthPlace=pl.name; setConf(x.d,'birthPlace','mid'); } } } });
      // "она из Архангельска" → origin
      ments.forEach(x=>{ if(x.d.birthPlace) return; const tail=sent.slice(x.end,x.end+60); if(/^,?\s*(?:[а-яё]+\s+[а-яё]+,\s*)?(?:она|он)?\s*из\s+[А-ЯЁ]/.test(tail)){ const pl=places.find(p=>!p.used&&p.prep==='из'&&p.pos>x.end&&p.pos-x.end<60); if(pl){ pl.used=true; x.d.birthPlace=pl.name; setConf(x.d,'birthPlace','mid'); } } });
      // parents: "Мама Павла, Вера Крылова" / "Родители: отец — X мать — Y"
      const pm2=sent.match(/^(Мама|Мать|Отец|Папа)\s+([А-ЯЁ][а-яё]+),\s*([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/); if(pm2){ const kid=parseMention(pm2[2]), par=parseMention(pm2[3]); const kd=kid&&findDraft(kid), pd=par&&findDraft(par); if(kd&&pd){ pd.rel=pd.rel||(pm2[1]==='Мама'||pm2[1]==='Мать'?'мать':'отец')+' '+pm2[2]; if(!kd.parents.includes(pd.id)) kd.parents.push(pd.id); } }
      if(mr){ const nm=cityName(mr[1]); if(nm&&lastAny&&!lastAny.birthPlace){ lastAny.birthPlace=nm; setConf(lastAny,'birthPlace','high'); } }
      lastPlace=places.length?places[places.length-1].name:lastPlace;
    });
    // document-style parents block
    const rp=text.match(/Родители:\s*отец\s*[—-]\s*([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})[\s\S]*?мать\s*[—-]\s*([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/);
    if(rp&&drafts.length){ const kid=drafts[0]; [['m',rp[1],'отец'],['f',rp[2],'мать']].forEach(([g,s,lab])=>{ const m=parseMention(s); if(!m) return; m.gender=g; const d=findDraft(m)||D(m); d.gender=g; d.rel=d.rel||lab+' '+kid.first; setConf(d,'first','high'); if(!kid.parents.includes(d.id)) kid.parents.push(d.id); }); if(rp&&drafts.length>=3){ const a=drafts[1],b=drafts[2]; if(a.rel.startsWith('отец')&&b.rel.startsWith('мать')){ a.spouses.push(b.id); b.spouses.push(a.id); } } }
    // gender fallbacks from patronymic/surname
    drafts.forEach(d=>{ if(!d.gender&&d.last) d.gender=/а$|ая$/.test(d.last)?'f':'m'; if(!d.conf.first) d.conf.first='mid'; });
    // spouses share surname guess (wife takes husband's if she has none)
    drafts.forEach(d=>{ if(!d.last&&d.spouses.length){ const s=drafts.find(x=>x.id===d.spouses[0]); if(s&&s.last){ d.last=lastFor(s.last.replace(/а$/,'').replace(/ая$/,'').replace(/ий$/,''),d.gender||'f'); setConf(d,'last','low'); } } });
    return drafts;
  }
};
