// @ts-nocheck — layout algorithm ported verbatim from the prototype
// Tree: layered layout. Generations by relaxation, couples as blocks, crossing-minimising sweeps, then x placement.
import { S, byId, parentsOf, childrenOf, spousesOf, yearOf } from './core'

export const DIM={NW:176,NH:68,PG:30,GAP:70,LH:120};
export const {NW,NH,PG,GAP,LH}=DIM;

/** hOf(id) — height of a person's box (a framed portrait is taller than a card); rows take the tallest box, boxes are centred in their row. */
export function layout(hOf){
  const self=DIM;
    const people=S.people; if(!people.length) return {pos:{},blocks:[],w:0,h:0};
    const idx={}; people.forEach((p,i)=>idx[p.id]=i);
    // 1. generations via relaxation
    const gen={}; people.forEach(p=>gen[p.id]=0);
    for(let it=0;it<people.length+2;it++){ let ch=false;
      S.rels.forEach(r=>{ if(!(r.a in gen)||!(r.b in gen)) return;
        if(r.type==='parent'){ if(gen[r.b]<gen[r.a]+1){ gen[r.b]=gen[r.a]+1; ch=true; } }
        else { const m=Math.max(gen[r.a],gen[r.b]); if(gen[r.a]!==m||gen[r.b]!==m){ gen[r.a]=gen[r.b]=m; ch=true; } } });
      if(!ch) break; }
    // pull childless-parents up toward their children when they were left at 0: parents must be exactly one level above their child (min over children)
    for(let it=0;it<3;it++) people.forEach(p=>{ const ch=childrenOf(p.id); if(ch.length){ const want=Math.min(...ch.map(c=>gen[c.id]))-1; if(gen[p.id]<want){ gen[p.id]=want; spousesOf(p.id).forEach(s=>{ if(!parentsOf(s.id).length && gen[s.id]<want) gen[s.id]=want; }); } } });
    const minG=Math.min(...Object.values(gen)); people.forEach(p=>gen[p.id]-=minG);
    // 2. DFS order
    const order={}; let n=0; const seen=new Set();
    const dfs=id=>{ if(seen.has(id)) return; seen.add(id); order[id]=n++; spousesOf(id).forEach(s=>dfs(s.id)); const kids=[...new Set([...childrenOf(id),...spousesOf(id).flatMap(s=>childrenOf(s.id))].map(k=>k.id))].map(byId).sort((a,b)=>(yearOf(a.birthDate)||'9999').localeCompare(yearOf(b.birthDate)||'9999')); kids.forEach(k=>dfs(k.id)); };
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
    const PAR={}, KID={}; people.forEach(p=>{ PAR[p.id]=parentsOf(p.id).map(x=>x.id).filter(id=>bOf[id]&&bOf[id].g<gen[p.id]); KID[p.id]=childrenOf(p.id).map(x=>x.id).filter(id=>bOf[id]&&bOf[id].g>gen[p.id]); });
    const cx=id=>{ const b=bOf[id]; return b.x+b.m.indexOf(id)*(NW+PG)+NW/2; };
    const pack=()=>L.forEach(g=>{ let x=0; levels[g].forEach(b=>{ b.x=x; x+=b.w+GAP; }); });
    const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
    // a spouse faces the side where their own parents are; the one without parents goes to the outside
    const orient=()=>blocks.forEach(b=>{ if(b.m.length<2) return; const c=b.x+b.w/2; const key={}; b.m.forEach(id=>{ if(PAR[id].length) key[id]=mean(PAR[id].map(cx)); });
      const known=b.m.filter(id=>key[id]!=null); if(!known.length) return; const k0=mean(known.map(id=>key[id]));
      b.m.forEach(id=>{ if(key[id]==null) key[id]=k0<c?1e9:-1e9; }); b.m.sort((x,y)=>key[x]-key[y]); });
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
    const top={}; let acc=0; L.forEach(g=>{ top[g]=acc; acc+=rowH[g]+self.LH; });
    const pos={}; let minX=Infinity,maxX=-Infinity; blocks.forEach(b=>b.m.forEach((id,i)=>{ const h=hgt(id); pos[id]={x:b.x+i*(NW+PG),y:top[b.g]+(rowH[b.g]-h)/2,h,g:b.g,top:top[b.g],rh:rowH[b.g]}; minX=Math.min(minX,pos[id].x); maxX=Math.max(maxX,pos[id].x+NW); }));
    Object.values(pos).forEach(p=>p.x-=minX);
    return {pos,blocks,w:maxX-minX,h:acc-self.LH};
  }

export const LINE={g:'#F2C879',f:'#8EA7FF',m:'#F29AC0',ff:'#6EC3FF',fm:'#B39AFF',mf:'#5FD3AE',mm:'#FF9F8A',n:'rgba(255,255,255,.42)'};
export function branchColors(){
    const anc=id=>{ const seen=new Set(), st=[id]; while(st.length){ const x=st.pop(); parentsOf(x).forEach(p=>{ if(!seen.has(p.id)){ seen.add(p.id); st.push(p.id); } }); } return seen.size; };
    const leaves=S.people.filter(p=>!childrenOf(p.id).length); let root=null, bestN=-1; leaves.forEach(p=>{ const n=anc(p.id); if(n>bestN||(n===bestN&&(yearOf(p.birthDate)||'0')>(yearOf(root.birthDate)||'0'))){ bestN=n; root=p; } });
    const c={}; if(root){ const side=(p,i)=>p.gender==='f'?'m':p.gender==='m'?'f':(i?'m':'f');
      const ps=parentsOf(root.id); c[root.id]='g';
      ps.forEach((p,i)=>{ const sd=side(p,i); c[p.id]=sd; parentsOf(p.id).forEach((gp,j)=>{ const tag=sd+(gp.gender==='f'?'m':gp.gender==='m'?'f':(j?'m':'f')); const st=[gp.id]; while(st.length){ const x=st.pop(); if(c[x]) continue; c[x]=tag; parentsOf(x).forEach(q=>st.push(q.id)); } }); }); }
    // for the root's siblings the parents' colour ('f'/'m') maps to gold; for a grandparent's other child it maps to the side
    return {c,link:id=>{ if(c[id]) return c[id]; const ps=parentsOf(id); for(const p of ps){ const pc=c[p.id]; if(!pc) continue; if(pc==='f'||pc==='m') return 'g'; const kid=childrenOf(p.id).find(k=>c[k.id]); return kid?c[kid.id]:pc; } return 'n'; }};
  }
