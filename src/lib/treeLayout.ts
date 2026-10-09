// @ts-nocheck — layout algorithm ported verbatim from the prototype
// Tree: layered layout. Generations by relaxation, couples as blocks, crossing-minimising sweeps, then x placement.
import { S, byId, parentsOf, childrenOf, spousesOf, stepParentsOf, stepChildrenOf, linkedSiblingsOf, yearOf } from './core'

export const DIM={NW:176,NH:68,PG:30,GAP:70,LH:120};
export const {NW,NH,PG,GAP,LH}=DIM;

/** hOf(id) — height of a person's box (a framed portrait is taller than a card); rows take the tallest box, boxes are centred in their row. */
export function layout(hOf){
  const self=DIM;
    if(!S.people.length) return {pos:{},blocks:[],w:0,h:0};
    // people with no link to anyone stand apart: to the right of the tree, on its lowest row
    const linked=new Set(); S.rels.forEach(r=>{ linked.add(r.a); linked.add(r.b); });
    const isoList=S.people.filter(p=>!linked.has(p.id)); const people=isoList.length<S.people.length?S.people.filter(p=>linked.has(p.id)):S.people;
    const iso=people===S.people?[]:isoList;
    // a stepparent stands in for the parents only when none are in the tree
    const parOf=id=>{ const ps=parentsOf(id); return ps.length?ps:stepParentsOf(id); };
    const kidOf=id=>[...childrenOf(id),...stepChildrenOf(id).filter(k=>!parentsOf(k.id).length)];
    const idx={}; people.forEach((p,i)=>idx[p.id]=i);
    // 1. generations via relaxation
    const gen={}; people.forEach(p=>gen[p.id]=0);
    for(let it=0;it<people.length+2;it++){ let ch=false;
      S.rels.forEach(r=>{ if(!(r.a in gen)||!(r.b in gen)) return; // parent (stepparent too) one level up; spouses and siblings on one level
        if(r.type==='parent'){ if(gen[r.b]<gen[r.a]+1){ gen[r.b]=gen[r.a]+1; ch=true; } }
        else { const m=Math.max(gen[r.a],gen[r.b]); if(gen[r.a]!==m||gen[r.b]!==m){ gen[r.a]=gen[r.b]=m; ch=true; } } });
      if(!ch) break; }
    // parents stand right above their children. A child with no spouse and no children of their own is «free»: it only follows
    // the parents, so a young brother no longer pins his parents to the top row (the parents of a spouse who married in).
    const deg={}; S.rels.forEach(r=>{ const A=deg[r.a]=deg[r.a]||{k:0,s:0}, Bd=deg[r.b]=deg[r.b]||{k:0,s:0}; if(r.type==='parent') A.k++; else { A.s++; Bd.s++; } });
    const free=id=>!deg[id]||(!deg[id].k&&!deg[id].s);
    const kidsOf=id=>S.rels.filter(r=>r.type==='parent'&&r.a===id&&r.b in gen).map(r=>r.b);
    const push=()=>{ let ch=false; S.rels.forEach(r=>{ if(!(r.a in gen)||!(r.b in gen)) return;
        if(r.type==='parent'){ if(gen[r.b]<gen[r.a]+1){ gen[r.b]=gen[r.a]+1; ch=true; } }
        else { const m=Math.max(gen[r.a],gen[r.b]); if(gen[r.a]!==m||gen[r.b]!==m){ gen[r.a]=gen[r.b]=m; ch=true; } } }); return ch; };
    for(let it=0;it<people.length*2+4;it++){ let ch=false;
      people.forEach(p=>{ const ks=kidsOf(p.id).filter(k=>!free(k)); if(!ks.length) return; const want=Math.min(...ks.map(k=>gen[k]))-1; if(gen[p.id]<want){ gen[p.id]=want; ch=true; } });
      for(let j=0;j<people.length+2;j++){ if(!push()) break; ch=true; }
      if(!ch) break; }
    const minG=Math.min(...Object.values(gen)); people.forEach(p=>gen[p.id]-=minG);
    // 2. DFS order
    const order={}; let n=0; const seen=new Set();
    const dfs=id=>{ if(seen.has(id)) return; seen.add(id); order[id]=n++; spousesOf(id).forEach(s=>dfs(s.id)); linkedSiblingsOf(id).forEach(s=>dfs(s.id)); const kids=[...new Set([...childrenOf(id),...spousesOf(id).flatMap(s=>childrenOf(s.id))].map(k=>k.id))].map(byId).sort((a,b)=>(yearOf(a.birthDate)||'9999').localeCompare(yearOf(b.birthDate)||'9999')); kids.forEach(k=>dfs(k.id)); };
    people.slice().sort((a,b)=>gen[a.id]-gen[b.id]||(yearOf(a.birthDate)||'9999').localeCompare(yearOf(b.birthDate)||'9999')).forEach(p=>dfs(p.id));
    // 3. blocks: a couple (spouses on the same level) is one unit
    const parent={}; people.forEach(p=>parent[p.id]=p.id); const find=x=>parent[x]===x?x:(parent[x]=find(parent[x]));
    S.rels.forEach(r=>{ if(r.type==='spouse'&&r.a in gen&&r.b in gen&&gen[r.a]===gen[r.b]) parent[find(r.a)]=find(r.b); });
    const bmap={}; people.forEach(p=>{ const k=find(p.id); (bmap[k]=bmap[k]||[]).push(p.id); });
    const NW=self.NW, PG=self.PG, GAP=self.GAP;
    const blocks=Object.values(bmap).map(m=>{ m.sort((a,b)=>order[a]-order[b]); return {m,g:gen[m[0]],x:0,w:m.length*NW+(m.length-1)*PG,o:Math.min(...m.map(i=>order[i]))}; });
    const levels={}; blocks.forEach(b=>(levels[b.g]=levels[b.g]||[]).push(b));
    const L=Object.keys(levels).map(Number).sort((a,b)=>a-b);
    const bOf={}; blocks.forEach(b=>b.m.forEach(id=>bOf[id]=b));
    const PAR={}, KID={}; people.forEach(p=>{ PAR[p.id]=parOf(p.id).map(x=>x.id).filter(id=>bOf[id]&&bOf[id].g<gen[p.id]); KID[p.id]=kidOf(p.id).map(x=>x.id).filter(id=>bOf[id]&&bOf[id].g>gen[p.id]); });
    const cx=id=>{ const b=bOf[id]; return b.x+b.m.indexOf(id)*(NW+PG)+NW/2; };
    const pack=()=>L.forEach(g=>{ let x=0; levels[g].forEach(b=>{ b.x=x; x+=b.w+GAP; }); });
    const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
    // a spouse faces the side where their own parents are; the one without parents goes to the outside
    // someone married more than once stands between the spouses, so no marriage line runs through another person
    const pathify=(b,key)=>{ if(b.m.length<3) return; const inB=new Set(b.m), adj={}; b.m.forEach(id=>adj[id]=spousesOf(id).map(s=>s.id).filter(s=>inB.has(s)));
      let ord; const ends=b.m.filter(id=>adj[id].length===1);
      if(b.m.every(id=>adj[id].length<=2)&&ends.length===2){ ord=[ends[0]]; const sn=new Set(ord); while(ord.length<b.m.length){ const nx=adj[ord[ord.length-1]].find(x=>!sn.has(x)); if(!nx) break; ord.push(nx); sn.add(nx); } if(ord.length<b.m.length) return; }
      else { const hub=b.m.slice().sort((x,y)=>adj[y].length-adj[x].length)[0]; const rest=b.m.filter(x=>x!==hub); const h=Math.ceil(rest.length/2); ord=[...rest.slice(0,h),hub,...rest.slice(h)]; }
      // keep each spouse on the side where their own parents are
      const n=ord.length, ks=ord.filter(id=>key[id]!=null).map(id=>key[id]), km=ks.length?mean(ks):0, rev=ord.slice().reverse();
      const sc=o=>o.reduce((s,id,i)=>s+(key[id]!=null?(2*i-(n-1))*(key[id]-km):0),0);
      if(ks.length>1){ if(sc(rev)>sc(ord)) ord=rev; } else { const p0={}; b.m.forEach((id,i)=>p0[id]=i); const s2=o=>o.reduce((s,id,i)=>s+(2*i-(n-1))*p0[id],0); if(s2(rev)>s2(ord)) ord=rev; }
      b.m=ord; };
    const orient=()=>blocks.forEach(b=>{ if(b.m.length<2) return; const c=b.x+b.w/2; const key={}; b.m.forEach(id=>{ if(PAR[id].length) key[id]=mean(PAR[id].map(cx)); });
      const real={...key}, known=b.m.filter(id=>key[id]!=null);
      if(known.length){ const k0=mean(known.map(id=>key[id])); b.m.forEach(id=>{ if(key[id]==null) key[id]=k0<c?1e9:-1e9; }); b.m.sort((x,y)=>key[x]-key[y]); }
      pathify(b,real); });
    const sweep=(g,dir)=>{ const arr=levels[g]; arr.forEach((b,i)=>{ const ns=b.m.flatMap(id=>dir<0?PAR[id]:KID[id]); b.k=ns.length?mean(ns.map(cx)):b.x+b.w/2; b.i=i; }); arr.sort((a,b)=>a.k-b.k||a.i-b.i); };
    // crossings between neighbouring levels (parent-couple midpoint → child)
    const crossings=()=>{ let n=0; for(let li=1;li<L.length;li++){ const segs=[]; levels[L[li]].forEach(b=>b.m.forEach(id=>{ if(PAR[id].length) segs.push([mean(PAR[id].map(cx)),cx(id)]); }));
      for(let i=0;i<segs.length;i++) for(let j=i+1;j<segs.length;j++){ const [a1,a2]=segs[i],[b1,b2]=segs[j]; if((a1-b1)*(a2-b2)<0) n++; } } return n; };
    L.forEach(g=>levels[g].sort((a,b)=>a.o-b.o)); pack(); orient(); pack();
    let best=null, bestN=Infinity; const snap=()=>({lv:L.map(g=>levels[g].slice()),mm:blocks.map(b=>b.m.slice())});
    for(let it=0;it<8;it++){
      for(let i=1;i<L.length;i++){ sweep(L[i],-1); pack(); } orient(); pack();
      for(let i=L.length-2;i>=0;i--){ sweep(L[i],1); pack(); } orient(); pack();
      const n=crossings(); if(n<bestN){ bestN=n; best=snap(); } if(!n) break; }
    if(best){ L.forEach((g,i)=>levels[g]=best.lv[i]); blocks.forEach((b,i)=>b.m=best.mm[i]); pack(); }
    // 4. x positions with the order fixed: pull toward children / parents, resolve overlaps from both sides
    const placeFixed=arr=>{ const n=arr.length; if(!n) return; const lx=[], rx=[];
      arr.forEach((b,i)=>{ lx[i]=i?Math.max(b.d,lx[i-1]+arr[i-1].w+GAP):b.d; });
      for(let i=n-1;i>=0;i--){ const b=arr[i]; rx[i]=i<n-1?Math.min(b.d,rx[i+1]-b.w-GAP):b.d; }
      arr.forEach((b,i)=>b.x=(lx[i]+rx[i])/2); };
    const up=()=>{ for(let i=L.length-2;i>=0;i--){ levels[L[i]].forEach(b=>{ const ks=[...new Set(b.m.flatMap(id=>KID[id]))]; b.d=ks.length?mean(ks.map(cx))-b.w/2:b.x; }); placeFixed(levels[L[i]]); } };
    const down=()=>{ for(let i=1;i<L.length;i++){ levels[L[i]].forEach(b=>{ const want=[]; b.m.forEach((id,j)=>{ if(PAR[id].length) want.push(mean(PAR[id].map(cx))-j*(NW+PG)-NW/2); }); b.d=want.length?mean(want):b.x; }); placeFixed(levels[L[i]]); } };
    for(let it=0;it<8;it++){ up(); down(); }
    const hgt=id=>hOf?hOf(id):self.NH; const rowH={}; blocks.forEach(b=>b.m.forEach(id=>{ rowH[b.g]=Math.max(rowH[b.g]||0,hgt(id)); }));
    const lastG=L[L.length-1]; iso.forEach(p=>{ rowH[lastG]=Math.max(rowH[lastG],hgt(p.id)); });
    const top={}; let acc=0; L.forEach(g=>{ top[g]=acc; acc+=rowH[g]+self.LH; });
    const pos={}; let minX=Infinity,maxX=-Infinity; blocks.forEach(b=>b.m.forEach((id,i)=>{ const h=hgt(id); pos[id]={x:b.x+i*(NW+PG),y:top[b.g]+(rowH[b.g]-h)/2,h,g:b.g,top:top[b.g],rh:rowH[b.g]}; minX=Math.min(minX,pos[id].x); maxX=Math.max(maxX,pos[id].x+NW); }));
    // the unlinked: oldest first, after the right edge of the whole tree
    iso.slice().sort((a,b)=>(yearOf(a.birthDate)||'9999').localeCompare(yearOf(b.birthDate)||'9999')).forEach(p=>{ const h=hgt(p.id), x=maxX+GAP; pos[p.id]={x,y:top[lastG]+(rowH[lastG]-h)/2,h,g:lastG,top:top[lastG],rh:rowH[lastG],iso:true}; maxX=x+NW; });
    Object.values(pos).forEach(p=>p.x-=minX);
    return {pos,blocks,w:maxX-minX,h:acc-self.LH};
  }

/* ---- line colours: every person gets a colour, the line from the parents down to them is drawn in it ----
   Gold: «me», my parents' couple, brothers, sisters, children. Father's ancestors share the cool range (turquoise → blue → violet),
   mother's the warm one (pink → red → orange): each ancestor splits their range in two for their father and mother, and a deeper
   generation is a little darker and calmer. Uncles and aunts take the line of the ancestor they branch from, their children a paler
   version of it. Families who married in (and their parents) get their own green tone. No grey lines. */
const okc=(c,light)=>light?`oklch(${(c.l-.25).toFixed(3)} ${Math.min(.2,c.c+.03).toFixed(3)} ${c.h.toFixed(1)})`:`oklch(${c.l.toFixed(3)} ${c.c.toFixed(3)} ${c.h.toFixed(1)})`;
const GOLD={l:.84,c:.125,h:82};
/** «me»: the person marked as you; otherwise the youngest person with the most known ancestors */
function rootPerson(){
  const me=S.settings.meId&&byId(S.settings.meId); if(me) return me;
  const anc=id=>{ const seen=new Set(), st=[id]; while(st.length){ const x=st.pop(); parentsOf(x).forEach(p=>{ if(!seen.has(p.id)){ seen.add(p.id); st.push(p.id); } }); } return seen.size; };
  let root=null, bestN=-1; S.people.filter(p=>!childrenOf(p.id).length).forEach(p=>{ const n=anc(p.id); if(n>bestN||(n===bestN&&(yearOf(p.birthDate)||'0')>(yearOf(root.birthDate)||'0'))){ bestN=n; root=p; } });
  return root;
}
export function familyColors(light){
  const col={}, fam={}, lineage=new Set(), root=rootPerson();
  if(root){ col[root.id]=GOLD; fam[root.id]='g'; lineage.add(root.id);
    const split=ps=>{ let f=ps.find(p=>p.gender==='m'), m=ps.find(p=>p.gender==='f'); const rest=ps.filter(p=>p!==f&&p!==m); if(!f) f=rest.shift(); if(!m) m=rest.shift(); return [f,m]; };
    const walk=(p,a,b,d,side)=>{ if(!p||col[p.id]) return; const mid=(a+b)/2; col[p.id]={l:Math.max(.66,.82-.035*(d-1)),c:Math.max(.1,.165-.014*(d-1)),h:((mid%360)+360)%360}; fam[p.id]=side; lineage.add(p.id);
      const [f,m]=split(parentsOf(p.id)); walk(f,a,mid,d+1,side); walk(m,mid,b,d+1,side); };
    const [dad,mom]=split(parentsOf(root.id)); walk(dad,192,300,1,'f'); walk(mom,340,422,1,'m'); }
  // uncles, aunts, cousins… : down from anyone coloured
  const fade=c=>({l:Math.min(.88,c.l+.035),c:Math.max(.05,c.c-.03),h:c.h});
  let ch=true; while(ch){ ch=false; S.people.forEach(p=>{ if(col[p.id]) return; const ps=parentsOf(p.id).filter(x=>col[x.id]); if(!ps.length) return;
    let sib=null; for(const x of ps){ sib=childrenOf(x.id).find(k=>lineage.has(k.id)); if(sib) break; }
    if(sib){ col[p.id]={...col[sib.id]}; fam[p.id]=fam[sib.id]; } else { col[p.id]=fade(col[ps[0].id]); fam[p.id]=fam[ps[0].id]; } ch=true; }); }
  // families who married in: every connected group of the rest gets its own green
  const FAR=[150,126,170,138,160,116], rest=new Set(S.people.filter(p=>!col[p.id]).map(p=>p.id)), done=new Set(); let fi=0;
  S.people.forEach(p=>{ if(!rest.has(p.id)||done.has(p.id)) return; const comp=[], st=[p.id];
    while(st.length){ const x=st.pop(); if(done.has(x)) continue; done.add(x); comp.push(x); S.rels.forEach(r=>{ if(r.a===x&&rest.has(r.b)) st.push(r.b); if(r.b===x&&rest.has(r.a)) st.push(r.a); }); }
    const h=FAR[fi++%FAR.length]; comp.forEach(id=>{ col[id]={l:.8,c:.12,h}; fam[id]='far'; }); });
  const css=id=>okc(col[id]||GOLD,light);
  return {
    /** the line from the parents down to this person */
    kin:id=>css(id),
    /** a marriage: gold for «me»; an ancestors' couple takes the colour of the line it continues; otherwise the relative's colour */
    mar:r=>{ if(root&&(r.a===root.id||r.b===root.id)) return okc(GOLD,light);
      const kid=childrenOf(r.a).find(k=>lineage.has(k.id)&&childrenOf(r.b).some(x=>x.id===k.id)); if(kid) return css(kid.id);
      return css([r.a,r.b].find(id=>fam[id]&&fam[id]!=='far')||r.a); },
  };
}
