'use strict';
/* ============================================================
   TEAM (SMARTPHONE): jede Person mit eigenem Gerät
   ============================================================ */
const CODE = cleanCode(P.get('s')) || 'HSU26';
const JKEY = 'odce_er_join2_'+CODE;
let me = null; try { me = JSON.parse(localStorage.getItem(JKEY)||'null'); } catch(e) {}
let draft = {tier:'basis', features:[], company:''};
let voteDraft = {};
function send(m){
  m.id = myId;
  if (hostConn && hostConn.open){ try { hostConn.send(m); } catch(e) { toast('Senden fehlgeschlagen.'); } }
  else toast('Keine Verbindung zur Spielleitung.');
}
function phaseOverview(s){
  return `<ol class="steps">${PHASES.filter(p=>!(s.skip||[]).includes(p.id)).map(p=>`<li><b>${esc(p.nr)} ${esc(p.name)}:</b> ${esc(p.desc)}</li>`).join('')}</ol>`;
}
function renderTeam(){
  document.body.className = 'team';
  const s = pubS;
  const head = `<header class="bar"><h1>Mission Erkundungsrover</h1><span class="sp"></span><span class="pill ${hostConn&&hostConn.open?'on':'off'}">${esc(hostConn&&hostConn.open?'verbunden':netStatus)}</span></header>`;
  if (!s){ app.innerHTML = head+`<main><section class="card"><h2>Verbinde mit Sitzung ${esc(CODE)} …</h2><p class="muted">${esc(netStatus)}</p><p class="muted">Falls es nicht klappt: WLAN wechseln oder mobilen Hotspot nutzen.</p></section></main>`; return; }
  const inLobby = s.lobby.some(p=>p.id===myId);
  const myTeam = s.teams.find(t => t.members.some(m=>m.id===myId));
  const rules = `<section class="card">${det('t_rules','Spielregeln, Preise und Rollen', rulesHTML(), false)}</section>`;
  if (!me || (!inLobby && !myTeam)){
    app.innerHTML = head+`<main><section class="card"><h2>Mission Erkundungsrover: Beitreten</h2>
      <p>${esc(CFG.mission)}</p>
      <p><label>Ihr Vorname<br><input type="text" id="jn" maxlength="30" value="${esc(me&&me.name||'')}" autocomplete="given-name"></label></p>
      <button data-act="join">Beitreten</button>
      <p class="muted">Jede Person tritt mit dem eigenen Smartphone bei. Teams (${CFG.teamMin}–${CFG.teamMax} Personen) und Rollen werden ausgelost. Gespeichert wird nur Ihr Vorname, im Browser der Spielleitung.</p></section>${rules}</main>`;
    return;
  }
  const ph = phaseById(s.phase)||PHASES[0];
  if (!myTeam){
    app.innerHTML = head+`<main><section class="card b"><h2>Sie sind dabei, ${esc(me.name)}.</h2>
      <p>Die Spielleitung lost gleich die Teams und Rollen aus. Danach sehen Sie hier Ihr Team, Ihre Rolle und Ihre Aufgabe.</p>
      <p class="muted">Bisher beigetreten: ${s.lobby.length + s.teams.reduce((a,t)=>a+t.members.length,0)} Personen.</p></section>
      <section class="card"><h2>So läuft die Mission</h2>${phaseOverview(s)}</section>${rules}</main>`;
    return;
  }
  const myRole = (myTeam.members.find(m=>m.id===myId)||{}).role;
  const mine = areas(myRole);
  const isFin = mine.includes('fin'), isLead = mine.includes('lead');
  const finP = myTeam.members.filter(m=>hasArea(m.role,'fin')).map(m=>m.name).join(', ')||'Finance';
  const leadP = myTeam.members.filter(m=>hasArea(m.role,'lead')).map(m=>m.name).join(', ')||'Leitung';
  let body = `<section class="card b"><h2>${esc(myTeam.name)}${myTeam.company?' · '+esc(myTeam.company):''}</h2>
    <p>Sie: <b>${esc(me.name)}</b> · Rolle: <span class="pill t">${esc(myRole)}</span></p>
    <p class="muted">${esc((CFG.roles[myRole]||{}).short||'')}</p>
    <p>Phase ${esc(ph.nr)}: <b>${esc(ph.name)}</b> · <span class="timer" data-timer>${fmtTime(clientRemaining())}</span> · Restbudget: <span class="money ${myTeam.rest<0?'neg':''}">${fmtM(myTeam.rest)}</span></p>
    ${det('t_members','Ihr Team ('+myTeam.members.length+' Personen)', `<table><tbody>${myTeam.members.map(m=>`<tr class="${m.id===myId?'me':''}"><td>${esc(m.name)}</td><td>${esc(m.role)}</td></tr>`).join('')}</tbody></table>`, s.phase==='p0')}
    </section>`;
  if (!s.reveal) body += `<section class="card now"><h2>Ihre Aufgabe jetzt</h2>${mine.map(k=>`<p>${mine.length>1?'<b>'+esc(CFG.areaLabel[k])+':</b> ':''}${esc(ph.roles[k])}</p>`).join('')}</section>`;
  // Gekaufter Plan
  if (myTeam.tier && myTeam.reveal){
    const tv = CFG.tiers[myTeam.tier];
    body += `<section class="card">${det('t_plan','Ihr Paket: '+esc(tv.label)+(myTeam.features.length?' + '+myTeam.features.length+' Zusatzfunktion'+(myTeam.features.length>1?'en':''):''),
      `<p><b>Code ${esc(tv.label)}.</b> ${esc(tv.gets)}<br><span class="lbl">Jetzt bekannt:</span> ${esc(myTeam.reveal)}<br><span class="lbl">Selbst zu tun:</span> ${esc(tv.own)}</p>
       ${myTeam.features.map(f=>`<p><b>${esc(CFG.features[f].label)}:</b> ${esc(CFG.features[f].what)} <span class="muted">${esc(CFG.features[f].work)}</span></p>`).join('')||'<p class="muted">Keine Zusatzfunktionen.</p>'}`, ['p2','p2a','p3'].includes(s.phase))}</section>`;
  }
  if (s.reveal){
    const r = s.teams.filter(t=>t.result).sort((a,b)=>b.result.total-a.result.total);
    body += `<section class="card"><h2>Ergebnis</h2><table><tbody>${r.map((t,i)=>`<tr class="${t.id===myTeam.id?'me':''}"><td>${i+1}</td><td>${esc(t.name)}</td><td class="money">${fmtM(t.result.total)}</td></tr>`).join('')}</tbody></table></section>`;
  } else if (['p0','p1'].includes(s.phase)){
    const locked = myTeam.plan && myTeam.plan.applied;
    const cost = (CFG.tiers[draft.tier]||{cost:0}).cost + draft.features.reduce((a,f)=>a+CFG.features[f].cost,0);
    const sub = myTeam.plan ? `<p><span class="pill t">Plan ${esc(myTeam.planStatus)}</span> ${esc(CFG.tiers[myTeam.plan.tier].label)}${myTeam.plan.features.length?' + '+myTeam.plan.features.map(f=>esc(CFG.features[f].label)).join(', '):''}${myTeam.plan.company?' · „'+esc(myTeam.plan.company)+'“':''}</p>`:'';
    body += locked ? `<section class="card"><h2>Budgetplan</h2>${sub}<p class="muted">Der Plan ist übernommen, der Code-Kauf ist bindend.</p></section>` :
     `<section class="card"><h2>Budgetplan</h2>${sub}
      <p class="muted">${isFin?'Sie reichen den Plan für das Team ein. Stimmen Sie sich vorher ab.':'Besprechen Sie die Auswahl im Team. Einreichen kann nur Finance ('+esc(finP)+'). Sie können hier mitrechnen.'}</p>
      <p><label>Produktname<br><input type="text" id="pc" maxlength="40" value="${esc(draft.company||myTeam.company||'')}"></label></p>
      <h3>Code-Stufe (genau eine, Kauf ist bindend)</h3>${Object.entries(CFG.tiers).map(([k,v])=>`<label class="opt"><input type="radio" name="tier" value="${k}" data-d="tier" ${draft.tier===k?'checked':''}> <b>${esc(v.label)}</b> · ${fmtM(v.cost)}<br>
        <span class="small"><span class="lbl">Sie bekommen:</span> ${esc(v.gets)}<br><span class="lbl">Selbst zu tun:</span> ${esc(v.own)}<br><span class="lbl">Passt, wenn:</span> ${esc(v.fit)}</span></label>`).join('')}
      <p class="muted">${esc(CFG.tierHidden)}</p>
      <h3>Zusatzfunktionen (optional)</h3>${Object.entries(CFG.features).map(([k,v])=>`<label class="opt"><input type="checkbox" value="${k}" data-d="feat" ${draft.features.includes(k)?'checked':''}> <b>${esc(v.label)}</b> · ${fmtM(v.cost)}<br>
        <span class="small">${esc(v.what)}<br><span class="lbl">Aufwand:</span> ${esc(v.work)}<br><span class="lbl">Nutzen:</span> ${esc(v.why)}</span></label>`).join('')}
      <p class="muted">Pflicht im Live-Test: ${CFG.mandatory.map(m=>esc(m.label)).join(' · ')}. Support und zusätzliche Testläufe kosten extra: Planen Sie Reserve ein.</p>
      <div class="sum"><span>Geplant: <b class="money">${fmtM(cost)}</b><br><span class="muted">Rest: ${fmtM(CFG.startBudget-cost)}</span></span>${isFin?'<button data-act="plan">Plan einreichen</button>':'<span class="muted">Einreichen: '+esc(finP)+'</span>'}</div></section>`;
  } else if (s.phase==='p6'){
    const others = s.teams.filter(t => t.id!==myTeam.id);
    const done = s.voted.includes(myTeam.id);
    body += isLead ? `<section class="card"><h2>Peer-Voting</h2><p class="muted">Sie geben die Stimme für Ihr Team ab. Diskutieren Sie vorher im Team. Die zuletzt abgegebene Stimme zählt.</p>${done?'<p><span class="pill on">Stimme Ihres Teams liegt vor</span></p>':''}
      ${others.map(t=>`<h3>${esc(t.name)}${t.company?' · '+esc(t.company):''}</h3>${CFG.criteria.map(c=>`<label>${esc(c.label)}<br><select data-v="${t.id}" data-c="${c.id}">${[0,1,2,3,4,5].map(n=>`<option ${Number((voteDraft[t.id]||{})[c.id]||0)===n?'selected':''}>${n}</option>`).join('')}</select></label>`).join('')}`).join('')}
      <div class="sum"><span class="muted">0 = schwach, 5 = herausragend</span><button data-act="vote">Stimme abgeben</button></div></section>`
      : `<section class="card"><h2>Peer-Voting</h2><p>Die Teamstimme gibt ${esc(leadP)} ab. Bewertet werden: ${CFG.criteria.map(c=>esc(c.label)).join(' · ')} (je 0–5).</p>${done?'<p><span class="pill on">Stimme Ihres Teams liegt vor</span></p>':''}</section>`;
  } else {
    const mineQ = s.queue.filter(q => q.teamId===myTeam.id && q.type!=='plan');
    const pendTests = mineQ.filter(q=>q.type==='test' && ['offen','Freigabe Finance'].includes(q.status)).length;
    const nextNr = myTeam.tests + pendTests + 1;
    const testPrice = nextNr<=CFG.freeTests ? 'frei (noch '+(CFG.freeTests-nextNr+1)+' von '+CFG.freeTests+')' : fmtM(CFG.extraTestPen)+' Abzug';
    const qName = q => q.type==='test' ? 'Testlauf' : CFG.support[q.kind].label;
    const pend = mineQ.filter(q=>q.status==='Freigabe Finance');
    body += `<section class="card"><h2>Support und Testläufe</h2>
      <p class="muted">${isFin?'Ihre Anfragen gehen direkt an die Spielleitung.':'Ihre Anfrage geht erst an Finance ('+esc(finP)+'). Nach der Freigabe bucht die Spielleitung.'}</p>
      <button class="t" style="width:100%;margin:.25rem 0;text-align:left" data-act="req" data-k="test"><b>Testlauf anmelden</b> · ${esc(testPrice)}<br><span class="small">${esc(CFG.test.what)}</span></button>
      ${Object.entries(CFG.support).map(([k,v])=>`<button class="sec" style="width:100%;margin:.25rem 0;text-align:left" data-act="req" data-k="${k}"><b>${esc(v.label)}</b> · ${fmtM(v.cost)}<br><span class="small">${esc(v.what)}</span></button>`).join('')}
      <p class="muted">Beratungen bisher: ${myTeam.consults} (ab der ${CFG.consultLimit+1}. zusätzlich ${fmtM(CFG.consultPen)}) · Testläufe: ${myTeam.tests} (${CFG.freeTests} frei, danach je ${fmtM(CFG.extraTestPen)})</p>
      ${isFin && pend.length ? `<h3>Zur Freigabe (${pend.length})</h3>${pend.map(q=>`<div class="row" style="margin:.3rem 0"><span style="flex:1">${esc(qName(q))} · von ${esc(q.by)}</span><button class="sm" data-act="fin" data-q="${q.qid}" data-ok="1">Freigeben</button><button class="sec sm" data-act="fin" data-q="${q.qid}" data-ok="0">Ablehnen</button></div>`).join('')}` : ''}
      ${mineQ.length?`<h3>Anfragen Ihres Teams</h3>${mineQ.slice(-8).reverse().map(q=>`<div class="muted">${esc(qName(q))} (${esc(q.by)}): ${esc(q.status)}</div>`).join('')}`:''}</section>`;
  }
  if (!s.reveal) body += `<section class="card">${det('t_phase','Phase '+esc(ph.nr)+' im Überblick: wer macht was', phaseInfoHTML(ph, mine), true)}</section>`;
  body += rules;
  app.innerHTML = head + `<main>${body}</main>`;
}
function teamClick(e){
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a==='join'){
    const name=(document.getElementById('jn').value||'').trim(); if (!name){ toast('Bitte Vornamen eintragen.'); return; }
    me = {name}; localStorage.setItem(JKEY, JSON.stringify(me)); send({t:'join', name}); render(); return;
  }
  if (a==='plan'){ const c=document.getElementById('pc'); draft.company = c?c.value:draft.company; send({t:'plan', tier:draft.tier, features:draft.features, company:draft.company}); return; }
  if (a==='req'){ send({t:'req', kind:el.dataset.k}); return; }
  if (a==='fin'){ send({t:'fin', qid:el.dataset.q, ok:el.dataset.ok==='1'}); return; }
  if (a==='vote'){ send({t:'vote', scores:voteDraft}); return; }
}
function teamChange(e){
  const el = e.target;
  if (el.dataset.d==='tier'){ draft.tier = el.value; render(); }
  if (el.dataset.d==='feat'){ draft.features = el.checked ? [...new Set([...draft.features, el.value])] : draft.features.filter(x=>x!==el.value); render(); }
  if (el.dataset.v){ voteDraft[el.dataset.v] = voteDraft[el.dataset.v]||{}; voteDraft[el.dataset.v][el.dataset.c] = Number(el.value); }
}
function teamInput(e){ if (e.target.id==='pc') draft.company = e.target.value; }

/* ============================================================
   CLIENT-VERBINDUNG (Team und Beamer)
   ============================================================ */
let retryT = null;
function onState(s){ pubS = s; if (s.now) clockSkew = s.now - Date.now(); render(); }
function connectClient(){
  clearTimeout(retryT);
  if (typeof Peer !== 'function'){ netStatus='PeerJS nicht geladen – Netz prüfen'; render(); return; }
  try { if (peer) peer.destroy(); } catch(e) {}
  netStatus = 'verbinde …'; render();
  peer = new Peer(undefined, {debug:0});
  peer.on('open', () => {
    hostConn = peer.connect(PFX+CODE, {reliable:true});
    hostConn.on('open', () => { netStatus='verbunden'; hostConn.send({t:'hello', id:myId});
      if (me && me.name) hostConn.send({t:'join', id:myId, name:me.name}); render(); });
    hostConn.on('data', d => { if (d && d.t==='state') onState(d.s); else if (d && d.t==='ack') toast(d.msg); });
    hostConn.on('close', () => { netStatus='Verbindung verloren, neuer Versuch …'; render(); retryT=setTimeout(connectClient, 3000); });
  });
  peer.on('error', e => {
    netStatus = e && e.type==='peer-unavailable' ? 'Sitzung '+CODE+' nicht gefunden. Läuft die Spielleitung?' : 'Netzfehler: '+(e&&e.type||e);
    render(); retryT = setTimeout(connectClient, 4000);
  });
}

/* ============================================================
   START
   ============================================================ */
function render(){
  const f = document.activeElement && document.activeElement.id;
  if (MODE==='host') renderHost(); else if (MODE==='beamer') renderBeamer(); else renderTeam();
  if (f){ const el=document.getElementById(f); if (el) el.focus(); }
}
setInterval(() => {
  const ms = MODE==='host' ? remainingMs(st||{}) : clientRemaining();
  document.querySelectorAll('[data-timer]').forEach(el => el.textContent = fmtTime(ms));
}, 1000);

if (MODE==='host'){
  try { st = JSON.parse(localStorage.getItem(LS)||'null'); } catch(e) { st = null; }
  if (!st || st.v!==2) st = newState();
  app.addEventListener('click', hostClick);
  app.addEventListener('change', hostChange);
  render();
  if (st.started) startPeer();
  window.addEventListener('beforeunload', save);
} else if (MODE==='beamer'){
  let local = null; try { local = JSON.parse(localStorage.getItem(LS)||'null'); } catch(e) {}
  if (local && local.code===CODE && local.started){
    st = local; pubS = pub(); netStatus = 'lokal';
    if (bc) bc.onmessage = ev => { if (ev.data && ev.data.t==='state') onState(ev.data.s); };
    window.addEventListener('storage', ev => { if (ev.key===LS){ try { st = JSON.parse(ev.newValue); pubS = pub(); render(); } catch(e) {} } });
    render();
  } else { render(); connectClient(); }
} else {
  app.addEventListener('click', teamClick);
  app.addEventListener('change', teamChange);
  app.addEventListener('input', teamInput);
  render(); connectClient();
}
