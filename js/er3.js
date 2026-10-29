'use strict';
/* ============================================================
   SPIELLEITUNG (HOST)
   ============================================================ */
let hostTab = 'steuerung';
const roleOpts = sel => Object.keys(CFG.roles).map(r=>`<option ${sel===r?'selected':''}>${esc(r)}</option>`).join('');
function drawPreview(){
  const n = allPlayers().length; if (!n) return 'Noch niemand beigetreten.';
  const sz = teamSizes(n);
  const bad = sz.some(x=>x<CFG.teamMin||x>CFG.teamMax);
  return `${n} Personen → ${sz.length} Team${sz.length>1?'s':''} (${sz.join(', ')})${bad?` <span class="pill off">nicht alle Teams ${CFG.teamMin}–${CFG.teamMax} Personen</span>`:''}`;
}
function qLabel(q, t){
  if (q.type==='plan' && t.plan) return `Plan: ${esc(CFG.tiers[t.plan.tier].label)}${t.plan.features.length?' + '+t.plan.features.map(f=>esc(CFG.features[f].label)).join(', '):''}${t.plan.company?' · Produkt „'+esc(t.plan.company)+'“':''}`;
  if (q.type==='support') return `${esc(CFG.support[q.kind].label)} (${fmtM(CFG.support[q.kind].cost)})`;
  if (q.type==='test'){ const nr = t.tests+1; return `Testlauf (Nr. ${nr} beim Buchen: ${nr<=CFG.freeTests?'frei':fmtM(CFG.extraTestPen)+' Abzug'})`; }
  return '';
}
function renderHost(){
  document.body.className = '';
  const ph = phaseById(st.phase), act = activePhases(st), idx = phaseIdx(st);
  const openQ = st.queue.filter(q => q.status==='offen');
  const head = `<header class="bar"><h1>Mission Erkundungsrover · Spielleitung</h1>
    <span class="pill b">Code ${esc(st.code)}</span>
    <span class="pill ${netStatus==='online'?'on':'off'}">${esc(netStatus)}</span>
    <span class="pill">${conns.length} Geräte</span><span class="sp"></span>
    ${st.started?`<a class="pill t" href="${esc(beamerURL(st.code))}" target="_blank" rel="noopener">Beamer-Ansicht öffnen</a>`:''}</header>`;
  if (!st.started){
    app.innerHTML = head + `<main>
    <section class="card"><h2>Sitzung anlegen</h2>
      <div class="grid">
        <p><label>Sitzungscode<br><input type="text" data-bind="code" value="${esc(st.code)}" maxlength="12"></label><br>
           <span class="muted">Bleibt der Code gleich (z. B. HSU26), bleibt auch der QR-Code auf den Folien gültig.</span></p>
        <p><label>Format<br><select data-bind="format">${Object.entries(FORMATS).map(([k,f])=>`<option value="${k}" ${st.format===k?'selected':''}>${esc(f.label)}</option>`).join('')}</select></label><br>
           <span class="muted">${esc((FORMATS[st.format]||{}).note||'')}</span></p>
        <p><label>Spielleitung<br><input type="text" data-bind="facilitator" value="${esc(st.facilitator)}"></label></p>
        <p><label>Wert pro Voting-Punkt (${esc(CFG.cur)})<br><input type="number" min="0" step="10000" data-bind="voteValue" value="${st.voteValue}"></label></p>
      </div>
      <h3>So läuft der Start</h3>
      <ol class="steps"><li>„Sitzung starten“ drücken. Danach können alle beitreten.</li>
        <li>Jede Person scannt den QR-Code mit dem eigenen Smartphone und trägt ihren Vornamen ein.</li>
        <li>Wenn alle da sind: „Teams auslosen“. Teams mit ${CFG.teamMin}–${CFG.teamMax} Personen, Rollen werden zufällig verteilt; jedes Smartphone zeigt Team und Rolle.</li>
        <li>Wer später kommt, wird automatisch dem kleinsten Team mit der fehlenden Rolle zugelost.</li></ol>
      <div class="row" style="margin-top:.5rem"><span class="sp" style="flex:1"></span><button data-act="start">Sitzung starten</button></div>
      <p class="muted">Phasen: ${act.map(p=>esc(p.nr+' '+p.name)+' ('+phaseMin(st,p.id)+' Min.)').join(' · ')}</p>
    </section></main>`;
    return;
  }
  const tabs = [['steuerung','Steuerung'],['teams','Teams & Buchungen'],['anfragen','Anfragen ('+openQ.length+')'],['ergebnis','Ergebnis']];
  let body = '';
  if (hostTab==='steuerung'){
    const canDraw = ['p0','p1'].includes(st.phase);
    body = `<section class="card"><h2>Phase ${esc(ph.nr)}: ${esc(ph.name)}</h2>
      <div class="phases">${act.map((p,i)=>`<span class="${i===idx?'cur':(i<idx?'done':'')}">${esc(p.nr)} ${esc(p.name)}</span>`).join('')}</div>
      <p>${esc(ph.desc)}</p>
      <p class="big timer" data-timer>${fmtTime(remainingMs(st))}</p>
      <div class="row">
        <button class="sec" data-act="prev" ${idx<=0?'disabled':''}>Zurück</button>
        <button data-act="next" ${idx>=act.length-1?'disabled':''}>Nächste Phase</button>
        <button class="sec" data-act="pause">${st.paused!=null?'Fortsetzen':'Pause'}</button>
        <button class="sec" data-act="plus">+2 Min.</button>
        <label class="chk"><input type="checkbox" data-bind="autoApply" ${st.autoApply?'checked':''}> Pläne automatisch übernehmen</label>
      </div>
      ${det('h_phase','Phaseninhalt (sehen die Teams auf dem Smartphone)', phaseInfoHTML(ph, []), false)}</section>
      <section class="card b"><h2>Beitritt und Auslosung</h2><div class="row" style="align-items:flex-start;gap:1.5rem">
        <div class="qr" style="width:220px">${qrSVG(teamURL(st.code))}</div>
        <div style="flex:1;min-width:260px"><p><b>Team-URL:</b><br><span class="muted">${esc(teamURL(st.code))}</span></p>
        <p><b>Beigetreten:</b> ${allPlayers().length} Personen${st.lobby.length?` · <b>${st.lobby.length} noch ohne Team</b>`:''}</p>
        <p>${drawPreview()}</p>
        <div class="row">${!st.drawn
          ? `<button data-act="draw" ${allPlayers().length?'':'disabled'}>Teams auslosen</button>`
          : `<button class="sec" data-act="redraw" ${canDraw?'':'disabled'}>Neu auslosen</button>${st.lobby.length?`<button data-act="placelobby">Wartende verteilen</button>`:''}`}</div>
        ${st.lobby.length?`<p class="muted">Ohne Team: ${st.lobby.map(p=>esc(p.name)).join(', ')}</p>`:''}
        ${st.teams.map(t=>`<div class="muted"><b>${esc(t.name)}</b> (${t.members.length}): ${t.members.map(m=>esc(m.name)+' ('+esc(m.role)+')').join(', ')||'–'}</div>`).join('')}
        </div></div></section>`;
  }
  if (hostTab==='teams'){
    body = st.teams.length ? `<div class="grid">${st.teams.map(t=>{ const c=calc(t,st); return `<section class="card">
      <h2>${esc(t.name)}${t.company?' · '+esc(t.company):''}</h2>
      <p>Restbudget: <span class="money ${c.rest<0?'neg':''}">${fmtM(c.rest)}</span></p>
      <h3>Mitglieder</h3>${t.members.map(m=>`<div class="row" style="margin:.2rem 0"><span style="min-width:6rem">${esc(m.name)}</span>
        <select data-mr="${m.id}" aria-label="Rolle von ${esc(m.name)}" style="width:auto">${roleOpts(m.role)}</select>
        <select data-mt="${m.id}" aria-label="Team von ${esc(m.name)}" style="width:auto">${st.teams.map(x=>`<option value="${x.id}" ${x.id===t.id?'selected':''}>${esc(x.name)}</option>`).join('')}<option value="">ohne Team</option></select></div>`).join('')||'<p class="muted">–</p>'}
      <label>Code-Stufe<br><select data-tf="tier" data-id="${t.id}"><option value="">– keine –</option>${Object.entries(CFG.tiers).map(([k,v])=>`<option value="${k}" ${t.tier===k?'selected':''}>${esc(v.label)} (${fmtM(v.cost)})</option>`).join('')}</select></label>
      <h3>Zusatzfunktionen</h3>${Object.entries(CFG.features).map(([k,v])=>`<label class="chk"><input type="checkbox" data-tf="feat" data-id="${t.id}" data-k="${k}" ${t.features.includes(k)?'checked':''}> ${esc(v.label)} (${fmtM(v.cost)})</label>`).join('')}
      <h3>Support & Tests</h3><div class="row">${Object.entries(CFG.support).map(([k,v])=>`<button class="sec sm" data-act="book" data-id="${t.id}" data-k="${k}">+ ${esc(v.label)}</button>`).join('')}
        <button class="sec sm" data-act="test" data-id="${t.id}">+ Testlauf (${t.tests})</button>
        <button class="sec sm" data-act="testm" data-id="${t.id}" ${t.tests?'':'disabled'} aria-label="Testlauf zurücknehmen">−</button>
        <button class="sec sm" data-act="undo" data-id="${t.id}" ${t.ledger.length?'':'disabled'}>Letzte Buchung zurück</button></div>
      <h3>Weitere Abzüge</h3><div class="row">${Object.entries(CFG.extraPen).map(([k,v])=>`<button class="sec sm" data-act="xpen" data-id="${t.id}" data-k="${k}">+ ${esc(v.label)} (${(t.extra||{})[k]||0})</button><button class="sec sm" data-act="xpenm" data-id="${t.id}" data-k="${k}" aria-label="${esc(v.label)} zurücknehmen">−</button>`).join('')}</div>
      <p class="muted">Beratungen: ${t.consults} · Testläufe: ${t.tests} · Abzüge: ${fmtM(c.pen)} · Support: ${fmtM(c.supCost)}</p>
      <label class="chk"><input type="checkbox" data-tf="align" data-id="${t.id}" ${t.alignFail?'checked':''}> Alignment fehlt (−${fmtM(CFG.alignPen)})</label>
      <h3>Live-Test</h3>${CFG.mandatory.map(m=>`<label class="chk"><input type="checkbox" data-tf="mand" data-id="${t.id}" data-k="${m.id}" ${t.mandatory[m.id]?'checked':''}> ${esc(m.label)}</label>`).join('')}
      <label class="chk"><input type="checkbox" data-tf="safe" data-id="${t.id}" ${t.safe?'checked':''}> ${esc(CFG.safeReturnLabel)}</label>
      <label class="chk"><input type="checkbox" data-tf="failure" data-id="${t.id}" ${t.failure?'checked':''}> Systemausfall aufgetreten</label></section>`; }).join('')}</div>`
      : `<section class="card"><p class="muted">Noch keine Teams. Erst unter „Steuerung“ auslosen.</p></section>`;
  }
  if (hostTab==='anfragen'){
    const rows = st.queue.slice().reverse().map(q => { const t=st.teams.find(x=>x.id===q.teamId); if(!t) return '';
      const btn = q.type==='plan'?'Übernehmen':(q.type==='test'?'Durchgeführt':'Buchen');
      return `<tr><td>${new Date(q.at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</td><td>${esc(t.name)}</td><td>${qLabel(q,t)}${q.by?' · '+esc(q.by):''}</td><td>${q.status==='offen'
        ? `<button class="sm" data-act="qok" data-q="${q.qid}">${btn}</button> <button class="sec sm" data-act="qno" data-q="${q.qid}">Ablehnen</button>` : `<span class="muted">${esc(q.status)}</span>`}</td></tr>`; }).join('');
    body = `<section class="card"><h2>Anfragen der Teams</h2><p class="muted">Support und Testläufe erscheinen hier, sobald Finance des Teams sie freigegeben hat. „Buchen“ zieht die Kosten ab, „Durchgeführt“ zählt den Testlauf.</p>
      ${rows?`<table><thead><tr><th>Zeit</th><th>Team</th><th>Anfrage</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`:'<p class="muted">Noch keine Anfragen.</p>'}</section>`;
  }
  if (hostTab==='ergebnis'){
    const res = st.teams.map(t => ({t, c:calc(t,st)})).sort((a,b)=>b.c.total-a.c.total);
    body = `<section class="card"><h2>Ergebnis</h2>
      <p class="muted">Gesamt = Restbudget + Boni (je ${fmtM(CFG.bonus)}, ab Phase 5) + Voting-Punkte × ${fmtM(st.voteValue)}. Pflichtanforderung verfehlt: Stimmen × 0,5. Abgegebene Stimmen: ${Object.keys(st.votes).length}.</p>
      <table><thead><tr><th>#</th><th>Team</th><th>Restbudget</th><th>Boni</th><th>Voting</th><th>Pflicht</th><th>Gesamt</th></tr></thead><tbody>
      ${res.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.t.name)}</td><td class="money">${fmtM(r.c.rest)}</td><td class="money">${fmtM(r.c.bonus)}</td><td>${r.c.votePts} Pkt. → ${fmtM(r.c.voteVal)}</td><td>${r.c.allReq?'erfüllt':'verfehlt'}</td><td class="money">${fmtM(r.c.total)}</td></tr>`).join('')}
      </tbody></table>
      <div class="row" style="margin-top:.8rem"><button data-act="reveal">${st.reveal?'Ergebnis verbergen':'Ergebnis aufdecken'}</button>
        <button class="sec" data-act="csv">CSV exportieren</button><button class="sec" data-act="json">JSON exportieren</button>
        <button class="warn" data-act="reset">Sitzung zurücksetzen</button></div></section>`;
  }
  app.innerHTML = head + `<main><nav class="row" style="margin-bottom:1rem" aria-label="Bereiche">${tabs.map(([k,l])=>`<button class="${hostTab===k?'':'sec'}" data-act="tab" data-k="${k}" aria-pressed="${hostTab===k}">${esc(l)}</button>`).join('')}</nav>${body}</main>`;
}

function download(name, text, type){
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; document.body.appendChild(a); a.click(); a.remove();
}
function hostClick(e){
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, act = activePhases(st), i = phaseIdx(st);
  const t = st.teams.find(x => x.id===el.dataset.id);
  switch (a){
    case 'tab': hostTab = el.dataset.k; render(); return;
    case 'start': st.started = true; setPhase(act[0].id); startPeer(); break;
    case 'draw': drawTeams(); break;
    case 'redraw': if (!confirm('Alle Teams und Rollen neu auslosen? Pläne und Anfragen gehen verloren.')) return; drawTeams(); break;
    case 'placelobby': st.lobby.splice(0).forEach(p => addLate(p)); break;
    case 'next': if (i<act.length-1) setPhase(act[i+1].id); break;
    case 'prev': if (i>0) setPhase(act[i-1].id); break;
    case 'pause': if (st.paused!=null){ st.phaseEnd = Date.now()+st.paused; st.paused=null; } else { st.paused = st.phaseEnd-Date.now(); } break;
    case 'plus': if (st.paused!=null) st.paused += 120000; else st.phaseEnd += 120000; break;
    case 'book': if (t) bookSupport(t, el.dataset.k); break;
    case 'test': if (t) t.tests++; break;
    case 'testm': if (t) t.tests = Math.max(0, t.tests-1); break;
    case 'xpen': if (t){ t.extra=t.extra||{}; t.extra[el.dataset.k]=(t.extra[el.dataset.k]||0)+1; } break;
    case 'xpenm': if (t){ t.extra=t.extra||{}; t.extra[el.dataset.k]=Math.max(0,(t.extra[el.dataset.k]||0)-1); } break;
    case 'undo': if (t && t.ledger.length){ const e2=t.ledger.pop(); if (e2.kind==='beratung') t.consults=Math.max(0,t.consults-1); } break;
    case 'qok': case 'qno': {
      const q = st.queue.find(x => x.qid===el.dataset.q); if (!q) return;
      const tt = st.teams.find(x => x.id===q.teamId);
      if (a==='qok' && tt){
        if (q.type==='plan'){ applyPlan(tt); q.status='übernommen'; }
        else if (q.type==='test'){ tt.tests++; q.status='durchgeführt'; }
        else { bookSupport(tt, q.kind); q.status='gebucht'; }
      } else q.status = 'abgelehnt';
      break;
    }
    case 'reveal': st.reveal = !st.reveal; break;
    case 'csv': {
      const head=['Team','Produkt','Mitglieder','Code-Stufe','Funktionen','Support','Tests','Beratungen','Abzuege','Restbudget','Boni','Voting-Punkte','Pflicht','Gesamt'];
      const rows=st.teams.map(t=>{const c=calc(t,st);return [t.name,t.company,t.members.map(m=>m.name+' ('+m.role+')').join(' | '),t.tier||'',t.features.join(' | '),c.supCost,t.tests,t.consults,c.pen,c.rest,c.bonus,c.votePts,c.allReq?'ja':'nein',c.total];});
      download('erkundungsrover_'+st.code+'.csv', [head,...rows].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\n'), 'text/csv;charset=utf-8');
      return;
    }
    case 'json': download('erkundungsrover_'+st.code+'.json', JSON.stringify(st,null,2), 'application/json'); return;
    case 'reset':
      if (confirm('Sitzung wirklich zurücksetzen? Alle Daten dieser Sitzung gehen verloren.')){ const code=st.code, fmt=st.format; st=newState(); st.code=code; st.format=fmt; hostTab='steuerung'; try{ if(peer) peer.destroy(); }catch(x){} peer=null; conns=[]; netStatus='offline'; }
      else return;
      break;
    default: return;
  }
  commit();
}
function hostChange(e){
  const el = e.target;
  if (el.dataset.bind){
    const k = el.dataset.bind;
    if (k==='code'){ st.code = cleanCode(el.value)||'HSU26'; }
    else if (k==='autoApply'){ st.autoApply = el.checked; }
    else if (k==='voteValue'){ st.voteValue = Math.max(0, Number(el.value)||0); }
    else st[k] = el.value;
    return commit();
  }
  if (el.dataset.mr){ const f=findPlayer(el.dataset.mr); if (f) f.p.role = CFG.roles[el.value]?el.value:f.p.role; return commit(); }
  if (el.dataset.mt){ moveMember(el.dataset.mt, el.value); return commit(); }
  if (el.dataset.tf){
    const t = st.teams.find(x => x.id===el.dataset.id); if (!t) return;
    const f = el.dataset.tf, k = el.dataset.k;
    if (f==='tier') t.tier = el.value||null;
    if (f==='feat') t.features = el.checked ? [...new Set([...t.features,k])] : t.features.filter(x=>x!==k);
    if (f==='align') t.alignFail = el.checked;
    if (f==='mand') t.mandatory[k] = el.checked;
    if (f==='safe') t.safe = el.checked;
    if (f==='failure') t.failure = el.checked;
    commit();
  }
}

/* ============================================================
   BEAMER
   ============================================================ */
function renderBeamer(){
  document.body.className = 'beamer';
  const s = pubS;
  if (!s){ app.innerHTML = `<div class="bm"><div><p class="ph">Mission Erkundungsrover</p><h1>Warte auf Spielleitung …</h1><p class="desc">${esc(netStatus)}</p></div></div>`; return; }
  const ph = phaseById(s.phase) || PHASES[0];
  const max = CFG.startBudget;
  const nAll = s.lobby.length + s.teams.reduce((a,t)=>a+t.members.length,0);
  let right;
  if (s.reveal){
    const r = s.teams.filter(t=>t.result).sort((a,b)=>b.result.total-a.result.total);
    right = `<table><thead><tr><th>#</th><th>Team</th><th>Gesamt</th></tr></thead><tbody>${r.map((t,i)=>`<tr><td>${i+1}</td><td>${esc(t.name)}${t.result.allReq?'':' <span class="pill off">Pflicht verfehlt</span>'}</td><td class="money">${fmtM(t.result.total)}</td></tr>`).join('')}</tbody></table>`;
  } else if (['p0','p1'].includes(s.phase) || !s.started){
    right = `<div class="qr">${qrSVG(teamURL(s.code))}</div><p style="font-size:1.1rem">Code <b>${esc(s.code)}</b> · ${nAll} beigetreten<br><span style="color:#aab">${esc(teamURL(s.code))}</span></p>
      ${s.drawn?`<div class="teams">${s.teams.map(t=>`<p><b>${esc(t.name)}${t.company?' · '+esc(t.company):''}</b><br>${t.members.map(m=>esc(m.name)).join(', ')}</p>`).join('')}</div>`
               :`<p class="desc">Jede Person tritt mit dem eigenen Smartphone bei. Teams und Rollen werden ausgelost.</p>`}`;
  } else {
    right = `<table><thead><tr><th>Team</th><th>Restbudget</th></tr></thead><tbody>${s.teams.map(t=>`<tr><td>${esc(t.name)}${t.company?' · '+esc(t.company):''}<div class="barw"><i style="width:${Math.max(0,Math.min(100,t.rest/max*100))}%"></i></div></td><td class="money">${fmtM(t.rest)}</td></tr>`).join('')}</tbody></table>`;
  }
  app.innerHTML = `<div class="bm"><div>
    <p class="ph">Phase ${esc(ph.nr)}</p><h1>${esc(ph.name)}</h1><p class="desc">${esc(ph.desc)}</p>
    <p class="timer" data-timer>${fmtTime(clientRemaining())}</p>
    <ol class="bsteps">${li(ph.steps)}</ol>
    <p class="desc"><b>Ergebnis:</b> ${esc(ph.result)} <span style="color:#aab">· Ihre Rollenaufgabe steht auf dem Smartphone.</span></p>
    </div><div>${right}</div></div>`;
}

let clockSkew = 0;
function clientRemaining(){
  const s = pubS; if (!s || !s.started) return null;
  if (s.paused!=null) return s.paused;
  return s.phaseEnd ? s.phaseEnd - (Date.now()+clockSkew) : null;
}

