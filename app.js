// app.js — génération procédurale + suivi de la somme sélectionnée
// Fonctions utilitaires arithmétiques
function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ const t=b; b=a%b; a=t;} return a||1; }
function simplify(n,d){ const g=gcd(n,d); const s = d<0?-1:1; return {n:(n/g)*s, d:Math.abs(d)/g}; }

// Palette simple stable par nombre (pour la sélection)
const NUM_PALETTE = ['#377eb8','#e41a1c','#4daf4a','#984ea3','#ff7f00','#a6cee3','#f781bf','#999999','#66d9ef','#dede00','#8dd3c7','#bebada'];
const denNeutral = getComputedStyle(document.documentElement).getPropertyValue('--den') || '#b7bec9';
function colorFor(n){ if(!Number.isFinite(n)||n<=0) return denNeutral; return NUM_PALETTE[(Math.abs(Math.trunc(n))-1)%NUM_PALETTE.length]; }

// ---------- Subdivision helpers (SVG polygons) ----------
function mid(a,b){ return [(a[0]+b[0])/2,(a[1]+b[1])/2]; }

function subdivTriangle(tri, depth=1, partial=true, weight=1){
  const res=[];
  function rec(t, d, w){
    if(d===0){ res.push({type:'poly', pts:t, units:w}); return; }
    const [A,B,C]=t, AB=mid(A,B), BC=mid(B,C), CA=mid(C,A);
    const subs=[[A,AB,CA],[AB,B,BC],[CA,BC,C],[AB,BC,CA]];
    for(const s of subs){
      if(!partial || Math.random()<0.6){ rec(s, d-1, w); }
      else{ res.push({type:'poly', pts:s, units:w*Math.pow(4, d-1)}); }
    }
  }
  rec(tri, depth, 1);
  return res;
}

function subdivSquare(square, depth=1, partial=true){
  const res=[];
  function rec(rect, d, w){
    if(d===0){ res.push({type:'poly', pts:rect, units:w}); return; }
    const [A,B,C,D]=rect;
    const AB=mid(A,B), BC=mid(B,C), CD=mid(C,D), DA=mid(D,A);
    const M=mid(AB,CD);
    const cells=[[A,AB,M,DA],[AB,B,BC,M],[DA,M,CD,D],[M,BC,C,CD]];
    for(const cell of cells){
      if(!partial || Math.random()<0.6){ rec(cell, d-1, w); }
      else{ res.push({type:'poly', pts:cell, units:w*Math.pow(4, d-1)}); }
    }
  }
  rec(square, depth, 1);
  return res;
}

function subdivHexagon(hex, depth=1, partial=true){
  const res=[];
  const center = hex.reduce((a,p)=>[a[0]+p[0]/6,a[1]+p[1]/6],[0,0]);
  for(let i=0;i<6;i++){
    const t=[center, hex[i], hex[(i+1)%6]];
    res.push(...subdivTriangle(t, depth, partial));
  }
  return res;
}

function sectorPolygon(cx,cy,r,a1,a2,steps=10){
  const pts=[[cx,cy]];
  for(let i=0;i<=steps;i++){
    const t=a1 + (a2-a1)*i/steps;
    pts.push([cx + r*Math.cos(t), cy + r*Math.sin(t)]);
  }
  return pts;
}
function subdivCircle(cx,cy,r, sectors=6, depth=1, partial=true){
  const res=[];
  function rec(a1,a2,d,w){
    if(d===0){ res.push({type:'poly', pts:sectorPolygon(cx,cy,r,a1,a2), units:w}); return; }
    const m=(a1+a2)/2;
    if(!partial || Math.random()<0.6){ rec(a1,m,d-1,w); rec(m,a2,d-1,w); }
    else{ res.push({type:'poly', pts:sectorPolygon(cx,cy,r,a1,a2), units:w*Math.pow(2,d)}); }
  }
  const dtheta = 2*Math.PI/sectors;
  for(let i=0;i<sectors;i++){
    const a1=-Math.PI/2 + i*dtheta, a2=a1+dtheta;
    rec(a1,a2, depth, 1);
  }
  return res;
}

function genShape(kind='auto', diff=2){
  const pad=60;
  const tri=[[500, 60],[940,940],[60,940]];
  const sq =[[60,60],[940,60],[940,940],[60,940]];
  const hex=[]; for(let i=0;i<6;i++){ const a=Math.PI/6 + i*Math.PI/3; hex.push([500 + 410*Math.cos(a), 500 + 410*Math.sin(a)]); }
  const depth = diff===1 ? 1 : (diff===2 ? 2 : 2);
  const partial = true;
  let type = kind==='auto' ? ['triangle','square','hex','circle'][Math.floor(Math.random()*4)] : kind;
  let parts=[];
  if(type==='triangle') parts = subdivTriangle(tri, depth, partial);
  else if(type==='square') parts = subdivSquare(sq, depth, partial);
  else if(type==='hex') parts = subdivHexagon(hex, depth, partial);
  else parts = subdivCircle(500,500, 430, 6, diff===3?2:1, partial);

  const totalUnits = parts.reduce((a,p)=>a+p.units,0);
  // pick a target units between 1 and total-1
  // On choisit un numérateur divisible par totalUnits / d
  // pour garantir une fraction atteignable
  const divs = [];
  for (let i=1;i<totalUnits;i++){
    if (totalUnits % i === 0) divs.push(i);
  }
  const d = divs[Math.floor(Math.random()*divs.length)];
  const kmax = Math.floor((totalUnits-1)/d);
  const n = Math.max(1, Math.floor(Math.random()*kmax));
  const targetUnits = n * d;
  const target = simplify(targetUnits, totalUnits);

  return {type, parts, totalUnits, target, targetUnits};
}

// ---------- Rendering & interaction ----------
const els = {
  prompt: document.getElementById('prompt'),
  status: document.getElementById('status'),
  svg: document.getElementById('svg'),
  btnNew: document.getElementById('btnNew'),
  btnHint: document.getElementById('btnHint'),
  btnCheck: document.getElementById('btnCheck'),
  btnNext: document.getElementById('btnNext'),
  feedback: document.getElementById('feedback'),
  shapeType: document.getElementById('shapeType'),
  difficulty: document.getElementById('difficulty')
};

let current = null;

function tokenNum(v){ return `<b style="color:${colorFor(Number(v))}">${v}</b>`; }
function tokenDen(v){ return `<b style="color:${denNeutral}">${v}</b>`; }

function render(spec){
  current = {spec};
  els.prompt.innerHTML = `Colorie ${tokenNum(spec.target.n)}<span class="sep">/</span>${tokenDen(spec.target.d)} de la figure.`;
  els.svg.innerHTML='';
  els.feedback.textContent='';
  // draw parts
  spec.parts.forEach((p,idx)=>{
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    const d = p.pts.map((pt,i)=> (i===0?'M':'L')+pt[0]+' '+pt[1]).join(' ') + ' Z';
    path.setAttribute('d', d);
    path.setAttribute('fill', 'white');
    path.setAttribute('stroke', '#111');
    path.setAttribute('stroke-width', '18');
    path.classList.add('part');
    path.dataset.units = String(p.units);
    path.dataset.sel = '0';
    path.addEventListener('click', ()=>{
      const sel = path.dataset.sel==='1';
      path.dataset.sel = sel ? '0':'1';
      updateFill(path);
      updateStatus();
    });
    els.svg.appendChild(path);
    updateFill(path);
  });
  updateStatus();
}

function updateFill(path){
  const isSel = path.dataset.sel==='1';
  path.setAttribute('fill', isSel ? colorFor(1) : 'white');
}

function currentSelectionUnits(){
  return Array.from(els.svg.querySelectorAll('.part')).reduce((a,p)=> a + (p.dataset.sel==='1'? parseInt(p.dataset.units,10):0), 0);
}

function updateStatus(){
  const sel = currentSelectionUnits();
  const tot = current.spec.totalUnits;
  const tgtU = current.spec.targetUnits;
  const rem = Math.max(0, tgtU - sel);
  const fSel = simplify(sel, tot);
  const fRem = simplify(rem, tot);
  const fTgt = simplify(tgtU, tot);
  els.status.innerHTML = `<div class="status-badges">
    <span class="badge">Cible : ${tokenNum(fTgt.n)}/${tokenDen(fTgt.d)}</span>
    <span class="badge">Sélectionné : ${tokenNum(fSel.n)}/${tokenDen(fSel.d)}</span>
    <span class="badge">Reste : ${tokenNum(fRem.n)}/${tokenDen(fRem.d)}</span>
  </div>`;
}

function generate(){
  const kind = els.shapeType.value;
  const diff = parseInt(els.difficulty.value,10);
  const spec = genShape(kind, diff);
  render(spec);
}

els.btnNew.addEventListener('click', generate);
els.btnNext.addEventListener('click', generate);
els.btnHint.addEventListener('click', ()=>{
  els.feedback.className='feedback';
  // hint: si sélection trop grande/petite
  const sel = currentSelectionUnits(), tgt = current.spec.targetUnits;
  if(sel < tgt) els.feedback.textContent = "Indice : il manque encore des zones à colorier.";
  else if(sel > tgt) els.feedback.textContent = "Indice : tu as colorié trop de zones, enlève-en.";
  else els.feedback.textContent = "Parfait : tu as la bonne quantité.";
});
els.btnCheck.addEventListener('click', ()=>{
  const ok = currentSelectionUnits() === current.spec.targetUnits;
  els.feedback.className = 'feedback ' + (ok?'ok':'err');
  els.feedback.textContent = ok ? "Exact : tu as colorié exactement la fraction demandée." : "Pas encore. Ajuste ta sélection pour atteindre la cible.";
  if(ok){ /* auto-next UX nice touch could be added here */ }
});

// init
generate();
