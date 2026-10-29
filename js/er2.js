'use strict';
/* ============================================================
   HILFSFUNKTIONEN
   ============================================================ */
const app = document.getElementById('app');
const P = new URLSearchParams(location.search);
const MODE = P.get('host')==='true' ? 'host' : (P.get('view')==='beamer' ? 'beamer' : 'team');
const LS = 'odce_erkundungsrover_state_v2';
const PFX = 'odce-erkundungsrover-';
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanCode = c => String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
const fmtM = v => (v/1e6).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:2})+' Mio. '+CFG.cur;
const uid = () => Math.random().toString(36).slice(2,10);
const phaseById = id => PHASES.find(p => p.id===id);
const activePhases = s => PHASES.filter(p => !((FORMATS[s.format]||{}).skip||[]).includes(p.id));
const phaseMin = (s,id) => { const f=FORMATS[s.format]||{}; const p=phaseById(id); return (f.minutes&&f.minutes[id]) || (p?p.min:10); };
const baseURL = () => location.origin + location.pathname;
const teamURL = code => baseURL() + '?s=' + encodeURIComponent(code);
const beamerURL = code => baseURL() + '?view=beamer&s=' + encodeURIComponent(code);
const phaseIdx = s => activePhases(s).findIndex(p => p.id===s.phase);
const atOrAfter = (s,id) => { const a=activePhases(s); const i=a.findIndex(p=>p.id===s.phase), j=a.findIndex(p=>p.id===id); return j>=0 && i>=j; };

function qrSVG(url){
  if (typeof qrcode !== 'function') return '<p class="muted">QR-Bibliothek nicht geladen. URL: '+esc(url)+'</p>';
  try { const q=qrcode(0,'M'); q.addData(url); q.make(); return q.createSvgTag({cellSize:6, margin:2, scalable:true}); }
  catch(e){ return '<p class="muted">'+esc(url)+'</p>'; }
}
let toastT=null;
function toast(msg){
  let el=document.querySelector('.toast'); if(!el){ el=document.createElement('div'); el.className='toast'; el.setAttribute('role','status'); document.body.appendChild(el); }
  el.textContent=msg; clearTimeout(toastT); toastT=setTimeout(()=>el.remove(),3200);
}
function remainingMs(s){
  if (!s.started) return null;
  if (s.paused!=null) return s.paused;
  if (!s.phaseEnd) return null;
  return s.phaseEnd - Date.now();
}
function fmtTime(ms){
  if (ms==null) return '–';
  const neg = ms<0; const t=Math.round(Math.abs(ms)/1000);
  return (neg?'−':'') + String(Math.floor(t/60)).padStart(2,'0') + ':' + String(t%60).padStart(2,'0');
}

/* ============================================================
   ZUSTAND, AUSLOSUNG UND BERECHNUNG
   ============================================================ */
const TEAMNAMES = ['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota','Kappa','Lambda','My','Ny','Xi','Omikron','Pi'];
const areas = role => (CFG.roles[role]||{k:[]}).k;
const hasArea = (role, a) => areas(role).includes(a);
function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function newTeam(name){
  return {id:uid(), name, company:'', tier:null, features:[], ledger:[], tests:0, consults:0,
          alignFail:false, mandatory:{}, safe:false, failure:false, members:[], plan:null, extra:{}};
}
function newState(){
  return {v:2, code:'HSU26', date:new Date().toISOString().slice(0,10), facilitator:'', format:'woche1',
          voteValue:100000, autoApply:false, started:false, phase:'p0', phaseEnd:null, paused:null,
          lobby:[], drawn:false, teams:[], queue:[], votes:{}, reveal:false};
}
// Anzahl Teams: jedes Team 4-6 Personen, bevorzugt 5. Bei 1-3 oder 7 Personen geht das nicht exakt (Warnung).
function teamCount(n){
  if (n<=0) return 0;
  const lo = Math.ceil(n/CFG.teamMax), hi = Math.floor(n/CFG.teamMin);
  if (lo<=hi) return Math.min(hi, Math.max(lo, Math.round(n/5)));
  return Math.max(1, lo);
}
function teamSizes(n){ const k=teamCount(n); return Array.from({length:k},(_,i)=>Math.floor(n/k)+(i<n%k?1:0)); }
function rolesFor(n){
  if (n<=4) return ['Finance & Leitung','Software-Engineering','Hardware-Engineering','Marketing & Sales'].slice(0,n);
  const r = ['Leitung','Hardware-Engineering','Software-Engineering','Finance','Marketing & Sales'];
  for (let i=5;i<n;i++) r.push(i%2 ? 'Hardware-Engineering' : 'Software-Engineering');
  return r;
}
function allPlayers(){ return [...st.lobby, ...st.teams.flatMap(t=>t.members)]; }
function findPlayer(id){
  const l = st.lobby.find(p=>p.id===id); if (l) return {p:l, t:null};
  for (const t of st.teams){ const m=t.members.find(x=>x.id===id); if (m) return {p:m, t}; }
  return null;
}
function drawTeams(){
  const ppl = shuffle(allPlayers().map(p=>({id:p.id, name:p.name})));
  const k = teamCount(ppl.length);
  st.teams = Array.from({length:k},(_,i)=>newTeam('Team '+(TEAMNAMES[i]||(i+1))));
  ppl.forEach((p,i)=>st.teams[i%k].members.push(p));
  st.teams.forEach(t => { const r=shuffle(rolesFor(t.members.length)); t.members.forEach((m,i)=>m.role=r[i]); });
  st.lobby = []; st.drawn = true; st.queue = []; st.votes = {};
}
// Nachzügler: ins kleinste Team, mit der Rolle, die dort fehlt
function addLate(p){
  if (!st.teams.length){ st.lobby.push(p); return null; }
  const t = st.teams.slice().sort((a,b)=>a.members.length-b.members.length)[0];
  const roles = t.members.map(m=>m.role);
  let role;
  if (t.members.length+1<=4) role = rolesFor(4).find(r=>!roles.includes(r)) || 'Hardware-Engineering';
  else {
    const fl = t.members.find(m=>m.role==='Finance & Leitung');
    if (fl){ fl.role='Finance'; role='Leitung'; }
    else role = ['Leitung','Finance','Marketing & Sales','Software-Engineering','Hardware-Engineering'].find(r=>!roles.includes(r))
      || (roles.filter(r=>r==='Hardware-Engineering').length<=roles.filter(r=>r==='Software-Engineering').length ? 'Hardware-Engineering' : 'Software-Engineering');
  }
  p.role = role; t.members.push(p); return t;
}
function moveMember(id, teamId){
  const f = findPlayer(id); if (!f) return;
  if (f.t) f.t.members = f.t.members.filter(m=>m.id!==id); else st.lobby = st.lobby.filter(m=>m.id!==id);
  const t = st.teams.find(x=>x.id===teamId);
  if (t){ f.p.role = f.p.role || 'Hardware-Engineering'; t.members.push(f.p); } else { delete f.p.role; st.lobby.push(f.p); }
}
function calc(t, s){
  const tierCost = t.tier && CFG.tiers[t.tier] ? CFG.tiers[t.tier].cost : 0;
  const featCost = t.features.reduce((a,f)=>a+((CFG.features[f]||{}).cost||0),0);
  const supCost  = t.ledger.reduce((a,e)=>a+e.cost,0);
  const testPen  = Math.max(0, t.tests-CFG.freeTests)*CFG.extraTestPen;
  const consultPen = t.consults>CFG.consultLimit ? CFG.consultPen : 0;
  const alignPen = t.alignFail ? CFG.alignPen : 0;
  const extraPen = Object.entries(CFG.extraPen).reduce((a,[k,v])=>a+((t.extra||{})[k]||0)*v.cost,0);
  const pen = testPen+consultPen+alignPen+extraPen;
  const rest = CFG.startBudget - tierCost - featCost - supCost - pen;
  const allReq = CFG.mandatory.every(m => t.mandatory[m.id]);
  const live = s ? atOrAfter(s,'p5') : false;
  const bonuses = {safe: live && t.safe, all: live && allReq, nopen: live && pen===0, nofail: live && !t.failure};
  const bonus = Object.values(bonuses).filter(Boolean).length*CFG.bonus;
  let votePts = 0;
  if (s) Object.values(s.votes).forEach(v => { if (v.voterTeam!==t.id && v.scores && v.scores[t.id]) CFG.criteria.forEach(c => votePts += Number(v.scores[t.id][c.id]||0)); });
  const voteFactor = (live && !allReq) ? 0.5 : 1;
  const voteVal = votePts*voteFactor*(s?s.voteValue:0);
  return {tierCost, featCost, supCost, testPen, consultPen, alignPen, pen, rest, allReq, bonuses, bonus, votePts, voteFactor, voteVal, total: rest+bonus+voteVal};
}
function pub(){
  return {code:st.code, started:st.started, phase:st.phase, format:st.format, phaseEnd:st.phaseEnd, paused:st.paused,
    skip:(FORMATS[st.format]||{}).skip||[], reveal:st.reveal, now:Date.now(), drawn:st.drawn,
    lobby: st.lobby.map(p=>({id:p.id, name:p.name})),
    teams: st.teams.map(t => { const c=calc(t,st); return {id:t.id, name:t.name, company:t.company, tier:t.tier, features:t.features,
      rest:c.rest, reveal: t.plan&&t.plan.applied&&t.tier ? CFG.tiers[t.tier].reveal : null, tests:t.tests, consults:t.consults,
      members:t.members.map(m=>({id:m.id,name:m.name,role:m.role})),
      plan: t.plan ? {tier:t.plan.tier, features:t.plan.features, company:t.plan.company, applied:t.plan.applied} : null,
      planStatus: t.plan ? (t.plan.applied?'übernommen':'eingereicht') : null,
      result: st.reveal ? {bonus:c.bonus, votePts:c.votePts, voteVal:c.voteVal, total:c.total, allReq:c.allReq} : null}; }),
    queue: st.queue.map(q => ({qid:q.qid, type:q.type, teamId:q.teamId, kind:q.kind||null, by:q.by||'', status:q.status})),
    voted: Object.keys(st.votes)};
}

/* ============================================================
   NETZWERK (PeerJS) UND LOKALE SYNCHRONISATION
   ============================================================ */
let st = null, pubS = null, peer = null, conns = [], hostConn = null, netStatus = 'offline';
const myId = localStorage.getItem('odce_er_client') || uid();
localStorage.setItem('odce_er_client', myId);
let bc = null; try { bc = new BroadcastChannel('odce_erkundungsrover'); } catch(e) {}

function startPeer(){
  if (typeof Peer !== 'function'){ netStatus='PeerJS nicht geladen (nur lokal)'; render(); return; }
  try { if (peer) peer.destroy(); } catch(e) {}
  conns = []; netStatus = 'verbinde …';
  peer = new Peer(PFX+st.code, {debug:0});
  peer.on('open', () => { netStatus='online'; render(); });
  peer.on('connection', c => {
    conns.push(c);
    c.on('open', () => { c.send({t:'state', s:pub()}); render(); });
    c.on('data', d => onClientMsg(c, d));
    c.on('close', () => { conns = conns.filter(x => x!==c); render(); });
  });
  peer.on('disconnected', () => { netStatus='getrennt, verbinde neu …'; render(); try { peer.reconnect(); } catch(e) {} });
  peer.on('error', e => {
    netStatus = e && e.type==='unavailable-id' ? 'Code bereits belegt (andere Spielleitung offen?)' : 'Netzfehler: '+(e&&e.type||e);
    render();
  });
}
function broadcast(){
  const p = pub();
  conns.forEach(c => { try { if (c.open) c.send({t:'state', s:p}); } catch(e) {} });
  if (bc) try { bc.postMessage({t:'state', s:p}); } catch(e) {}
}
function save(){ try { localStorage.setItem(LS, JSON.stringify(st)); } catch(e) {} }
function commit(){ save(); broadcast(); render(); }

function onClientMsg(c, d){
  if (!d || typeof d!=='object') return;
  const ack = msg => { try { c.send({t:'ack', msg}); } catch(e) {} };
  if (d.t==='hello'){ c.send({t:'state', s:pub()}); return; }
  if (d.t==='join'){
    const name = String(d.name||'').trim().slice(0,30); if (!name || !d.id) return;
    const ex = findPlayer(d.id);
    if (ex){ ex.p.name = name; commit(); return ack(ex.t ? 'Willkommen zurück bei '+ex.t.name+'.' : 'Sie sind dabei.'); }
    const p = {id:d.id, name};
    if (st.drawn){ const t = addLate(p); commit(); return ack(t ? 'Sie wurden '+t.name+' zugelost.' : 'Sie sind dabei.'); }
    st.lobby.push(p); commit(); return ack('Sie sind dabei. Die Teams werden gleich ausgelost.');
  }
  const f = findPlayer(d.id); const team = f && f.t; const role = f && f.p.role;
  if (!team) return ack('Sie sind noch keinem Team zugeordnet.');
  switch (d.t){
    case 'plan': {
      if (!hasArea(role,'fin')) return ack('Den Budgetplan reicht Finance ein.');
      if (!['p0','p1'].includes(st.phase)) return ack('Planung ist nur in Phase 0 und 1 möglich.');
      if (team.plan && team.plan.applied) return ack('Ihr Plan wurde bereits übernommen. Der Code-Kauf ist bindend.');
      team.plan = {tier: CFG.tiers[d.tier]?d.tier:'basis', features:(d.features||[]).filter(x=>CFG.features[x]),
                   company:String(d.company||'').slice(0,40), at:Date.now(), applied:false};
      st.queue = st.queue.filter(q => !(q.type==='plan' && q.teamId===team.id && q.status==='offen'));
      if (st.autoApply) applyPlan(team);
      else st.queue.push({qid:uid(), type:'plan', teamId:team.id, by:f.p.name, status:'offen', at:Date.now()});
      commit(); return ack(st.autoApply ? 'Plan übernommen.' : 'Plan eingereicht. Die Spielleitung prüft.');
    }
    case 'req': {
      const isTest = d.kind==='test';
      if (!isTest && !CFG.support[d.kind]) return;
      if (['p0','p1','p6'].includes(st.phase)) return ack('Support und Testläufe gibt es ab Phase 2.');
      const fin = hasArea(role,'fin');
      st.queue.push({qid:uid(), type:isTest?'test':'support', teamId:team.id, kind:isTest?null:d.kind, by:f.p.name,
                     status: fin ? 'offen' : 'Freigabe Finance', at:Date.now()});
      commit(); return ack(fin ? 'Anfrage an die Spielleitung gesendet.' : 'Anfrage gesendet. Finance muss sie freigeben.');
    }
    case 'fin': {
      if (!hasArea(role,'fin')) return ack('Nur Finance gibt frei.');
      const q = st.queue.find(x => x.qid===d.qid && x.teamId===team.id && x.status==='Freigabe Finance'); if (!q) return;
      q.status = d.ok ? 'offen' : 'von Finance abgelehnt';
      commit(); return ack(d.ok ? 'Freigegeben, die Spielleitung bucht.' : 'Abgelehnt.');
    }
    case 'vote': {
      if (!hasArea(role,'lead')) return ack('Die Teamstimme gibt die Leitung ab.');
      if (st.phase!=='p6') return ack('Voting ist erst in Phase 6 geöffnet.');
      const scores = {};
      st.teams.forEach(t => { if (t.id!==team.id && d.scores && d.scores[t.id]) { scores[t.id]={}; CFG.criteria.forEach(k => scores[t.id][k.id]=Math.max(0,Math.min(5,Number(d.scores[t.id][k.id])||0))); } });
      st.votes[team.id] = {voterTeam:team.id, by:d.id, scores, at:Date.now()};
      commit(); return ack('Stimme gespeichert.');
    }
  }
}
function applyPlan(t){
  if (!t.plan) return;
  t.tier = t.plan.tier; t.features = t.plan.features.slice(); if (t.plan.company) t.company = t.plan.company;
  t.plan.applied = true;
}
function bookSupport(t, kind){
  const s = CFG.support[kind]; if (!s) return;
  t.ledger.push({label:s.label, kind, cost:s.cost, at:Date.now()});
  if (kind==='beratung') t.consults++;
}
function setPhase(id){
  st.phase = id; st.paused = null; st.phaseEnd = Date.now() + phaseMin(st,id)*60000;
}

/* ============================================================
   GEMEINSAME TEXTBAUSTEINE (Regeln, Phaseninfo)
   ============================================================ */
const li = arr => arr.map(x=>`<li>${esc(x)}</li>`).join('');
function rulesHTML(){
  return `<h3>Mission</h3><p>${esc(CFG.mission)}</p>
    <p><b>Pflicht im Live-Test:</b></p><ol class="steps">${li(CFG.mandatory.map(m=>m.label))}</ol>
    <p><b>Gewinnen heißt:</b> Restbudget + Boni + Stimmen der anderen Teams. Wer eine Pflichtanforderung verfehlt, verliert 50 % seiner Stimmen.</p>
    <h3>Code-Stufen (genau eine, Kauf ist bindend)</h3>
    ${Object.values(CFG.tiers).map(v=>`<div class="info"><b>${esc(v.label)}</b> · ${fmtM(v.cost)}<br>
      <span class="lbl">Sie bekommen:</span> ${esc(v.gets)}<br><span class="lbl">Selbst zu tun:</span> ${esc(v.own)}<br><span class="lbl">Passt, wenn:</span> ${esc(v.fit)}</div>`).join('')}
    <p class="muted">${esc(CFG.tierHidden)}</p>
    <h3>Zusatzfunktionen (optional)</h3>
    ${Object.values(CFG.features).map(v=>`<div class="info"><b>${esc(v.label)}</b> · ${fmtM(v.cost)}<br>${esc(v.what)}<br>
      <span class="lbl">Aufwand:</span> ${esc(v.work)}<br><span class="lbl">Nutzen:</span> ${esc(v.why)}</div>`).join('')}
    <h3>Support und Testläufe (Finance gibt frei)</h3>
    ${Object.values(CFG.support).map(v=>`<div class="info"><b>${esc(v.label)}</b> · ${fmtM(v.cost)}<br>${esc(v.what)}</div>`).join('')}
    <div class="info"><b>${esc(CFG.test.label)}</b> · 2 frei, dann je ${fmtM(CFG.extraTestPen)}<br>${esc(CFG.test.what)}</div>
    <h3>Abzüge</h3><ul class="steps">${li([
      'Mehr als '+CFG.freeTests+' Testläufe: je '+fmtM(CFG.extraTestPen),
      'Mehr als '+CFG.consultLimit+' Beratungen: '+fmtM(CFG.consultPen),
      ...Object.values(CFG.extraPen).map(v=>v.label+': je '+fmtM(v.cost)),
      'Fehlendes Alignment: '+fmtM(CFG.alignPen),
      'Pflicht verfehlt: −50 % der Stimmen'])}</ul>
    <h3>Boni (je ${fmtM(CFG.bonus)})</h3><ul class="steps">${li([CFG.safeReturnLabel,'Alle Pflichtanforderungen erfüllt','Keine Abzüge','Kein Systemausfall'])}</ul>
    <h3>Rollen</h3>${Object.entries(CFG.roles).map(([r,v])=>`<div class="info"><b>${esc(r)}</b>: ${esc(v.short)}</div>`).join('')}`;
}
// Aufgaben aller Rollen dieser Phase; mine = Aufgabenbereiche der eigenen Rolle (werden markiert)
function whoDoesWhat(ph, mine){
  return `<table class="rt"><tbody>${Object.entries(ph.roles).map(([k,txt])=>`<tr class="${(mine||[]).includes(k)?'me':''}"><td>${esc(CFG.areaLabel[k])}</td><td>${esc(txt)}</td></tr>`).join('')}</tbody></table>`;
}
function phaseInfoHTML(ph, mine){
  return `<h3>Was das Team jetzt tut</h3><ol class="steps">${li(ph.steps)}</ol>
    <h3>Wer macht was</h3>${whoDoesWhat(ph, mine)}
    <p><b>Ergebnis:</b> ${esc(ph.result)}</p><p class="muted"><b>Regeln und Kosten:</b> ${esc(ph.rules)}</p>`;
}
// <details> bleibt nach Neuaufbau offen/geschlossen
const openDet = {};
function det(id, title, inner, dflt){
  const open = id in openDet ? openDet[id] : !!dflt;
  return `<details data-det="${id}" ${open?'open':''}><summary>${title}</summary><div class="detb">${inner}</div></details>`;
}
document.addEventListener('toggle', e => { const d=e.target; if (d && d.dataset && d.dataset.det) openDet[d.dataset.det] = d.open; }, true);

