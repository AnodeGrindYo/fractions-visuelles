// app.js — écrans + modal + génération procédurale responsive
function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ const t=b; b=a%b; a=t;} return a||1; }
function simplify(n,d){ const g=gcd(n,d); const s = d<0?-1:1; return {n:(n/g)*s, d:Math.abs(d)/g}; }
const dysPalette = ['#2E86AB','#F18F01','#4CB944','#7A5CFF','#EF476F','#06D6A0','#FFB703','#118AB2'];
const denNeutral = getComputedStyle(document.documentElement).getPropertyValue('--den') || '#b7bec9';
const $ = (s)=>document.querySelector(s);

const els = {
  screenStart: $('#screenStart'),
  screenGame: $('#screenGame'),
  btnStart: $('#btnStart'),
  btnBack: $('#btnBack'),
  prompt: $('#prompt'),
  status: $('#status'),
  svg: $('#svg'),
  btnCheck: $('#btnCheck'),
  btnNext: $('#btnNext'),
  modal: $('#modal'),
  modalTitle: $('#modalTitle'),
  modalMsg: $('#modalMsg'),
  modalIcon: $('#modalIcon'),
  btnClose: $('#btnClose'),
  shapeType: $('#shapeType'),
  difficulty: $('#difficulty')
};

let current = { spec:null, fillColor:'#377eb8', targetUnits:0 };

function pickFillColor(){ return dysPalette[Math.floor(Math.random()*dysPalette.length)]; }
function tokenNum(v,color){ return `<b style="color:${color||current.fillColor}">${v}</b>`; }
function tokenDen(v){ return `<b style="color:${denNeutral}">${v}</b>`; }

// Subdivision funcs
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
function pickReachableTarget(totalUnits){
  const divisors = [];
  for(let i=1;i<totalUnits;i++){ if(totalUnits % i === 0) divisors.push(i); }
  const d = divisors[Math.floor(Math.random()*divisors.length)] || 1;
  const kmax = Math.floor((totalUnits-1)/d);
  const n = Math.max(1, Math.floor(Math.random()*kmax));
  const units = n*d;
  return {units, frac:simplify(units, totalUnits)};
}
function genShape(kind, diff){
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
  const tgt = pickReachableTarget(totalUnits);
  return {type, parts, totalUnits, target: tgt.frac, targetUnits: tgt.units};
}

// Screens
function showScreen(which){
  els.screenStart.classList.toggle('active', which==='start');
  els.screenGame.classList.toggle('active', which==='game');
}

// Render
function render(spec){
  current.spec = spec;
  current.fillColor = pickFillColor();
  current.targetUnits = spec.targetUnits;
  els.prompt.innerHTML = `Colorie <b style="color:${current.fillColor}">${spec.target.n}</b>/<b style="color:${denNeutral}">${spec.target.d}</b> de la figure.`;
  els.svg.innerHTML = '';
  spec.parts.forEach(p=>{
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    const d = p.pts.map((pt,i)=> (i===0?'M':'L')+pt[0]+' '+pt[1]).join(' ') + ' Z';
    path.setAttribute('d', d);
    path.setAttribute('fill', 'white');
    path.setAttribute('stroke', '#111');
    const sw = window.innerWidth < 600 ? 12 : 18;
    path.setAttribute('stroke-width', String(sw)/2);
    path.classList.add('part');
    path.dataset.units = String(p.units);
    path.dataset.sel = '0';
    path.addEventListener('click', ()=>{
      path.dataset.sel = (path.dataset.sel==='1') ? '0' : '1';
      updateFill(path); updateStatus();
    });
    els.svg.appendChild(path);
    updateFill(path);
  });
  updateStatus();
}
function updateFill(path){
  const isSel = path.dataset.sel==='1';
  path.setAttribute('fill', isSel ? current.fillColor : 'white');
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
  const fTgt = current.spec.target;
  els.status.innerHTML = `<div class="status-badges">
    <span class="badge">Cible : <b style="color:${current.fillColor}">${fTgt.n}</b>/<b style="color:${denNeutral}">${fTgt.d}</b></span>
    <span class="badge">Sélectionné : <b style="color:${current.fillColor}">${fSel.n}</b>/<b style="color:${denNeutral}">${fSel.d}</b></span>
    <span class="badge">Reste : <b style="color:${current.fillColor}">${fRem.n}</b>/<b style="color:${denNeutral}">${fRem.d}</b></span>
  </div>`;
}

// Modal
function openModal(ok){
  els.modal.classList.add('show');
  els.modal.setAttribute('aria-hidden','false');
  if(ok){
    $('#modalIcon').textContent = '🎉';
    $('#modalTitle').textContent = 'Félicitations !';
    $('#modalMsg').textContent = 'Exact : tu as colorié la fraction demandée.';
    $('#btnNext').style.display = 'inline-block';
  }else{
    $('#modalIcon').textContent = '🤔';
    $('#modalTitle').textContent = 'Pas encore';
    $('#modalMsg').textContent = 'Ajuste la sélection pour atteindre la cible.';
    $('#btnNext').style.display = 'none';
  }
}
function closeModal(advanceIfOk){
  const wasOk = $('#btnNext').style.display !== 'none';
  els.modal.classList.remove('show');
  els.modal.setAttribute('aria-hidden','true');
  if(advanceIfOk && wasOk){
    generate();
  }
}

// Events
els.btnStart.addEventListener('click', ()=>{ showScreen('game'); generate(); });
els.btnBack.addEventListener('click', ()=>{ showScreen('start'); });

els.btnCheck.addEventListener('click', ()=>{
  const ok = currentSelectionUnits() === current.targetUnits;
  openModal(ok);
});
$('#btnClose').addEventListener('click', ()=> closeModal(true));
$('#btnNext').addEventListener('click', ()=> closeModal(true));

function generate(){
  const kind = els.shapeType.value;
  const diff = parseInt(els.difficulty.value,10);
  const spec = genShape(kind, diff);
  render(spec);
}

// Init
showScreen('start');
