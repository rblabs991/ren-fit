/* Ren Fit — screens, workout player, storage, reminders, backup. */
(function(){
"use strict";
const RF=window.RF,{clamp,sm}=RF.util,VERSION='2.0';
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const root=document.documentElement,STANDALONE=root.classList.contains('standalone'),HOST_THEME=root.getAttribute('data-theme');
const CAN_DOWNLOAD=STANDALONE;

/* ---------- storage: everything stays in this browser ---------- */
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const DEF={lang:null,theme:'auto',intro:true,voice:true,two:true,rest:15,level:1,name:'Ren',height:null,sessions:0,nudgeOff:{},
  rem:{workout:{t:'20:30',on:true},breakfast:{t:'08:30',on:true},snack:{t:'16:00',on:true},dinner:{t:'18:00',on:true},evening:{t:'21:00',on:true}}};
const S=Object.assign({},DEF,store.get('rf.settings',{}));
S.rem=Object.assign({},DEF.rem,S.rem||{});S.nudgeOff=S.nudgeOff||{};
if(S.lang!=='en'&&S.lang!=='hr')S.lang=(navigator.language||'en').toLowerCase().startsWith('hr')?'hr':'en';
if(!RF.LEVELS.some(l=>l.id===S.level))S.level=1;
const save=()=>store.set('rf.settings',S);
let log=store.get('rf.log',{}),weights=store.get('rf.weights',[]),sessions=store.get('rf.sessions',[]);
const dayKey=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const todayLog=()=>log[dayKey()]||{};
function setHabit(i,v){const k=dayKey();(log[k]=log[k]||{})[i]=v;store.set('rf.log',log)}
const sessionCount=()=>sessions.length+(S.sessions||0);
const sessionsAt=l=>sessions.filter(x=>x.l===l).length;
function streaks(){
  const has=d=>!!(log[dayKey(d)]||{})[0];let cur=0;const d=new Date();if(!has(d))d.setDate(d.getDate()-1);
  while(has(d)){cur++;d.setDate(d.getDate()-1)}
  let best=0,run=0,prev=null;
  for(const k of Object.keys(log).filter(k=>log[k]&&log[k][0]).sort()){const dt=new Date(k+'T12:00:00');run=prev&&Math.round((dt-prev)/864e5)===1?run+1:1;best=Math.max(best,run);prev=dt}
  return{cur,best:Math.max(best,cur)}}

/* ---------- language ---------- */
const t=(k,v)=>{let s=(RF.STR[S.lang]||RF.STR.en)[k];if(s==null)s=RF.STR.en[k]!=null?RF.STR.en[k]:k;if(v)for(const x in v)s=s.split('{'+x+'}').join(v[x]);return s};
const L=o=>o[S.lang]||o.en;
const MT=id=>L(RF.MOVE_TEXT[id]);
const loc=()=>S.lang==='hr'?'hr-HR':'en-GB';
const fmt=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const days=n=>n===1?t('k_day1'):t('k_days',{n});

/* ---------- routine for the chosen level ---------- */
const levelById=id=>RF.LEVELS.find(l=>l.id===id)||RF.LEVELS[0];
function routine(lv){lv=lv||levelById(S.level);const out=[];for(const g of RF.GROUPS)for(const[id,s]of lv[g])out.push({id,s,g});return out}
const introDur=id=>clamp(Math.round(MT(id).intro.split(/\s+/).length/2.4)+3,9,22);
function routineSecs(lv){const r=routine(lv);return r.reduce((a,e)=>a+e.s+(S.intro?introDur(e.id):0),0)+(r.length-1)*S.rest+(S.intro?0:5)}
const routineMin=lv=>Math.round(routineSecs(lv)/60);
function itemFor(id){for(const lv of[levelById(S.level),...RF.LEVELS]){const it=routine(lv).find(x=>x.id===id);if(it)return it}return{id,s:40,g:'move'}}

/* ---------- theme ---------- */
function applyTheme(){
  if(S.theme==='auto'){if(HOST_THEME)root.setAttribute('data-theme',HOST_THEME);else root.removeAttribute('data-theme')}else root.setAttribute('data-theme',S.theme);
  const m=$('meta[name=theme-color]');if(m)m.setAttribute('content',getComputedStyle(root).getPropertyValue('--bg').trim());
  RF.applyStageTheme&&RF.applyStageTheme()}
try{matchMedia('(prefers-color-scheme: light)').addEventListener('change',applyTheme)}catch(e){}
new MutationObserver(()=>RF.applyStageTheme&&RF.applyStageTheme()).observe(root,{attributes:true,attributeFilter:['data-theme']});

/* ---------- screens ---------- */
let tab='today',recFilter='breakfast',toastT=0;
const app=$('#app');
function toast(msg){let el=$('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el)}el.textContent=msg;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,2600)}
const langSw=()=>`<div class="lang" role="group" aria-label="${esc(t('st_lang'))}"><button data-lang="en" aria-pressed="${S.lang==='en'}">EN</button><button data-lang="hr" aria-pressed="${S.lang==='hr'}">HR</button></div>`;
const head=(eb,h,sub)=>`<header class="view-head"><div class="eyebrow">${esc(eb)}</div>${langSw()}<h1>${esc(h)}</h1>${sub?`<p class="muted">${esc(sub)}</p>`:''}</header>`;
const figSvg=()=>`<svg class="start-fig" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="40" fill="var(--surface-2)"/><g fill="none" stroke="var(--fg)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M42 30v20M42 50l-9 16M42 50l9 16M42 34l-13 8M42 34l13-10"/></g><circle cx="42" cy="21" r="6.5" fill="var(--accent)"/></svg>`;
function applyStatic(){root.lang=S.lang;$$('[data-i18n]').forEach(e=>e.textContent=t(e.dataset.i18n));$$('[data-i18n-label]').forEach(e=>e.setAttribute('aria-label',t(e.dataset.i18nLabel)))}
function render(keepScroll){
  const y=window.scrollY;applyStatic();
  $$('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
  app.innerHTML=VIEWS[tab]();bind[tab]&&bind[tab]();window.scrollTo(0,keepScroll?y:0)}

const VIEWS={
today(){
  const now=new Date(),h=now.getHours()+now.getMinutes()/60,tl=todayLog(),done=!!tl[0],n=RF.HABITS.filter((_,i)=>tl[i]).length,N=RF.HABITS.length;
  const greet=t(h<12?'morning':h<18?'afternoon':'evening')+(S.name?', '+S.name:'');
  const date=now.toLocaleDateString(loc(),{weekday:'long',day:'numeric',month:'long'});
  const lv=levelById(S.level),lt=L(RF.LEVEL_TEXT[lv.id]),st=streaks(),C=2*Math.PI*20,off=C*(1-n/N),mins=routineMin(lv);
  const nudge=S.level<3&&sessionsAt(S.level)>=8&&!S.nudgeOff[S.level];
  return `<div class="view">${head(date,greet)}
  <div class="start">
    <div><div class="eyebrow">${esc(t('daily_routine'))} · ${esc(t('level'))} ${lv.id}</div><h2>${esc(done?t('done_today'):t('your_minutes',{n:mins}))}</h2>
      <div class="meta"><span>${esc(lt.n)}</span><span class="num">${esc(t('n_min',{n:mins}))}</span><span>${esc(t('n_moves',{n:routine(lv).length}))}</span>${st.cur>1?`<span class="pill hot">${esc(t('streak_n',{n:st.cur}))}</span>`:''}</div></div>
    ${figSvg()}
    ${done?`<div class="btn-wide again"><span class="pill go">✓ ${esc(t('completed_today'))}</span><button class="btn btn-ghost btn-sm" data-go>${esc(t('go_again'))}</button></div>`:`<button class="btn btn-primary btn-wide" data-go>▶&nbsp; ${esc(t('start_routine'))}</button>`}
  </div>
  ${nudge?`<div class="nudge"><div><h3>${esc(t('lvlup_t',{n:S.level+1}))}</h3><p class="muted small">${esc(t('lvlup_d',{k:sessionsAt(S.level)}))}</p></div><div class="row"><button class="btn btn-primary btn-sm" data-nudge="yes">${esc(t('lvlup_yes',{n:S.level+1}))}</button><button class="btn btn-ghost btn-sm" data-nudge="no">${esc(t('lvlup_no'))}</button></div></div>`:''}
  <section class="section"><div class="section-head"><h2>${esc(t('eating_today'))}</h2><span class="muted small">${esc(t('kcal_target'))}</span></div>
    <div class="card"><div class="timeline">${RF.DAY.map(d=>{const x=L(d),on=h>=d.a&&h<d.b;return `<div class="slot ${on?'now':''}"><div class="time">${esc(d.t)}</div><div class="what"><b>${esc(x.n)}${on?`<span class="nowtag">${esc(t('now'))}</span>`:''}</b><span>${esc(x.d)}</span></div></div>`}).join('')}</div></div>
  </section>
  <button class="ringrow" data-tabgo="checklist">
    <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="20" fill="none" stroke="var(--surface-2)" stroke-width="6"/><circle cx="26" cy="26" r="20" fill="none" stroke="var(--go)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 26 26)"/><text x="26" y="30.5" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="13" font-weight="700" fill="var(--fg)">${n}/${N}</text></svg>
    <div><b>${esc(t('habits_today'))}</b><span class="muted" style="font-size:14px">${esc(n===N?t('habits_all'):t('habits_hint'))}</span></div>
  </button>
  </div>`},

workout(){
  const lv=levelById(S.level),r=routine(lv);
  return `<div class="view">${head(t('w_eyebrow'),t('w_title'),t('w_sub'))}
  <section class="section"><h2>${esc(t('choose_level'))}</h2>
    <div class="levels" role="group" aria-label="${esc(t('choose_level'))}">${RF.LEVELS.map(l=>{const x=L(RF.LEVEL_TEXT[l.id]);return `<button class="lvl" data-level="${l.id}" aria-pressed="${l.id===S.level}"><span class="k">${esc(t('level'))} ${l.id}</span><b>${esc(x.n)}</b><small>${esc(x.w)}</small><small class="num">${esc(t('n_min',{n:routineMin(l)}))}</small></button>`}).join('')}</div>
    <p class="muted small">${esc(L(RF.LEVEL_TEXT[lv.id]).d)}</p>
  </section>
  <button class="btn btn-primary" data-go>▶&nbsp; ${esc(t('start_routine'))} · <span class="num">${esc(t('n_min',{n:routineMin(lv)}))}</span></button>
  <div class="settings">
    <div class="set"><label for="sIntro"><b>${esc(t('s_intro'))}</b><small>${esc(sessionCount()>=5&&S.intro?t('s_intro_off'):t('s_intro_d'))}</small></label><input type="checkbox" class="switch" id="sIntro" ${S.intro?'checked':''}></div>
    <div class="set"><label for="sVoice"><b>${esc(t('s_voice'))}</b><small>${esc(t('s_voice_d'))}</small></label><input type="checkbox" class="switch" id="sVoice" ${S.voice?'checked':''}></div>
    <div class="set"><label for="sTwo"><b>${esc(t('s_two'))}</b><small>${esc(t('s_two_d'))}</small></label><input type="checkbox" class="switch" id="sTwo" ${S.two?'checked':''}></div>
    <div class="set"><div><b>${esc(t('s_rest'))}</b><small>${esc(t('s_rest_d'))}</small></div><div class="seg mono" role="group" aria-label="${esc(t('s_rest'))}">${[10,15,20].map(x=>`<button data-rest="${x}" aria-pressed="${S.rest===x}">${x}</button>`).join('')}</div></div>
  </div>
  ${RF.GROUPS.map(g=>{const list=r.filter(e=>e.g===g),secs=list.reduce((a,e)=>a+e.s,0);
    return `<section class="section"><div class="section-head"><h2>${esc(t('g_'+g))}</h2><span class="muted num small">${fmt(secs)}</span></div><div class="exlist">${list.map(e=>{const m=MT(e.id);return `<button class="exrow" data-preview="${e.id}"><span class="idx">${String(r.indexOf(e)+1).padStart(2,'0')}</span><span class="tx"><b>${esc(m.n)}</b><span>${e.s} ${esc(t('sec'))} · ${esc(m.mus)}${RF.MOVES[e.id].sides?' · '+esc(t('both_sides')):''}</span></span><span class="play" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg></span></button>`}).join('')}</div></section>`}).join('')}
  </div>`},

recipes(){
  const list=RF.RECIPES.filter(r=>r.c===recFilter);
  return `<div class="view">${head(t('r_eyebrow'),t('r_title'),t('r_sub'))}
  <div class="chips" role="group">${RF.CATS.map(c=>`<button class="chip" data-cat="${c}" aria-pressed="${c===recFilter}">${esc(t('c_'+c))}</button>`).join('')}</div>
  <p class="muted" style="margin-top:-8px;font-size:14px">${esc(t('ch_'+recFilter))}</p>
  <div class="recipes">${list.map((r,i)=>{const x=L(r);return `<details class="recipe" ${i===0?'open':''}><summary><span><b>${esc(x.n)}</b><span>${esc([x.time,r.kcal?t('kcal_about',{n:r.kcal}):''].filter(Boolean).join(' · '))}</span></span><svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="body">${x.keeps?`<div class="tags"><span class="tag">${esc(x.keeps)}</span></div>`:''}
    <div><div class="eyebrow" style="margin-bottom:6px">${esc(t('ingredients'))}</div><ul>${x.ing.map(v=>`<li>${esc(v)}</li>`).join('')}</ul></div>
    <div><div class="eyebrow" style="margin-bottom:6px">${esc(t('steps'))}</div><ol>${x.st.map(v=>`<li>${esc(v)}</li>`).join('')}</ol></div></div></details>`}).join('')}</div>
  </div>`},

checklist(){
  const tl=todayLog(),ds=[...Array(7)].map((_,k)=>{const d=new Date();d.setDate(d.getDate()-(6-k));return d}),st=streaks();
  const w=weights.slice(-12),last=w[w.length-1],first=w[0];
  let spark='';if(w.length>1){const xs=w.map(x=>x.kg),mn=Math.min(...xs),mx=Math.max(...xs),rg=mx-mn||1;spark=`<svg width="140" height="40" viewBox="0 0 140 40" aria-hidden="true"><polyline fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" points="${xs.map((v,i)=>`${4+i*(132/(xs.length-1))},${34-(v-mn)/rg*28}`).join(' ')}"/><circle cx="136" cy="${34-(xs[xs.length-1]-mn)/rg*28}" r="3.5" fill="var(--accent)"/></svg>`}
  let bmi='';if(last&&S.height>0){const b=last.kg/Math.pow(S.height/100,2),k=b<18.5?'bmi_under':b<25?'bmi_ok':b<30?'bmi_over':'bmi_high';bmi=`<div><span class="eyebrow">${esc(t('k_bmi'))}</span><b class="num">${b.toFixed(1)}</b><span class="muted small">${esc(t(k))}</span></div>`}
  return `<div class="view">${head(new Date().toLocaleDateString(loc(),{weekday:'long',day:'numeric',month:'long'}),t('k_title'))}
  <div class="habits">${RF.HABITS.map((hb,i)=>{const x=L(hb);return `<button class="habit" data-habit="${i}" aria-pressed="${!!tl[i]}"><span class="box">${tl[i]?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>':''}</span><span><b>${esc(x.n)}</b><small>${esc(x.h)}</small></span></button>`}).join('')}</div>
  <section class="section"><h2>${esc(t('k_stats'))}</h2>
    <div class="stats"><div class="stat"><b class="num">${sessionCount()}</b><span>${esc(t('k_sessions'))}</span></div><div class="stat"><b>${esc(days(st.cur))}</b><span>${esc(t('k_streak'))}</span></div><div class="stat"><b>${esc(days(st.best))}</b><span>${esc(t('k_best'))}</span></div></div>
  </section>
  <section class="section"><h2>${esc(t('k_week'))}</h2><div class="week"><table><thead><tr><th scope="col">${esc(t('k_habit'))}</th>${ds.map(d=>`<th scope="col">${esc(d.toLocaleDateString(loc(),{weekday:'narrow'}))}<br><span class="num">${d.getDate()}</span></th>`).join('')}</tr></thead><tbody>${RF.HABITS.map((hb,i)=>`<tr><td>${esc(L(hb).n)}</td>${ds.map(d=>`<td><span class="dot ${(log[dayKey(d)]||{})[i]?'on':''}"></span></td>`).join('')}</tr>`).join('')}</tbody></table></div></section>
  <section class="section"><h2>${esc(t('k_weight'))}</h2><div class="weight">
    <div class="wstats">${last?`<div><span class="eyebrow">${esc(t('k_latest'))}</span><b class="num">${last.kg.toFixed(1)} kg</b></div>${first&&w.length>1?`<div><span class="eyebrow">${esc(t('k_change'))}</span><b class="num" style="color:${last.kg<=first.kg?'var(--go)':'var(--accent)'}">${(last.kg-first.kg>0?'+':'')+(last.kg-first.kg).toFixed(1)} kg</b></div>`:''}${bmi}${spark}`:`<span class="muted">${esc(t('k_wempty'))}</span>`}</div>
    ${last&&!(S.height>0)?`<p class="muted small">${esc(t('k_wheight'))}</p>`:''}
    <form id="wForm"><input class="field mono" id="wIn" type="number" inputmode="decimal" step="0.1" min="30" max="250" placeholder="${last?last.kg.toFixed(1):'0.0'}" aria-label="${esc(t('k_wlabel'))}"><button class="btn btn-primary btn-sm" type="submit">${esc(t('k_log'))}</button></form>
  </div></section>
  <p class="muted small">${esc(t('saved_local'))}</p>
  </div>`},

settings(){
  const seg=(key,opts)=>`<div class="seg" role="group">${opts.map(([v,lab])=>`<button data-set="${key}" data-val="${v}" aria-pressed="${S[key]===v}">${esc(lab)}</button>`).join('')}</div>`;
  return `<div class="view">${head('Ren Fit',t('st_title'))}
  <section class="section"><h2>${esc(t('st_profile'))}</h2><div class="settings">
    <div class="set"><label for="stName"><b>${esc(t('st_name'))}</b></label><input class="field" id="stName" style="max-width:170px" value="${esc(S.name||'')}" maxlength="24" autocomplete="off"></div>
    <div class="set"><label for="stHeight"><b>${esc(t('st_height'))}</b></label><input class="field mono" id="stHeight" style="max-width:110px" type="number" inputmode="numeric" min="120" max="230" value="${S.height||''}" placeholder="cm"></div>
    <div class="set"><div><b>${esc(t('st_lang'))}</b></div>${seg('lang',[['en','English'],['hr','Hrvatski']])}</div>
    <div class="set"><div><b>${esc(t('st_look'))}</b></div>${seg('theme',[['auto',t('st_auto')],['light',t('st_light')],['dark',t('st_dark')]])}</div>
  </div></section>
  <section class="section"><h2>${esc(t('st_rem'))}</h2><p class="muted small">${esc(t('st_rem_d'))}</p>
    <div class="card">${['workout','breakfast','snack','dinner','evening'].map(k=>`<div class="rem"><label for="rm_${k}"><b>${esc(t('rm_'+k))}</b><small>${esc(t(k==='breakfast'||k==='snack'?'rm_wk':'rm_daily'))}</small></label><input type="time" id="rm_${k}" data-remt="${k}" value="${esc(S.rem[k].t)}"><input type="checkbox" class="switch" data-remon="${k}" aria-label="${esc(t('rm_'+k))}" ${S.rem[k].on?'checked':''}></div>`).join('')}</div>
    <button class="btn btn-primary" id="remAdd">${esc(t('rm_add'))}</button>
    <p class="muted small">${esc(t(CAN_DOWNLOAD?'rm_note':'rm_blocked'))}</p>
  </section>
  <section class="section"><h2>${esc(t('st_backup'))}</h2><p class="muted small">${esc(t('st_backup_d'))}</p>
    <textarea class="field" id="bkText" placeholder="${esc(t('bk_ph'))}" spellcheck="false"></textarea>
    <div class="rowgap"><button class="btn btn-ghost btn-sm" id="bkCopy">${esc(t('bk_copy'))}</button><button class="btn btn-ghost btn-sm" id="bkRestore">${esc(t('bk_restore'))}</button></div>
  </section>
  <section class="section"><h2>${esc(t('st_install'))}</h2><p class="muted small">${esc(t('st_install_d'))}</p></section>
  <p class="muted small">${esc(t('st_about',{v:VERSION}))} · ${esc(t('saved_local'))}</p>
  </div>`}
};

const bind={
workout(){
  $('#sIntro').onchange=e=>{S.intro=e.target.checked;save();render(true)};
  $('#sVoice').onchange=e=>{S.voice=e.target.checked;save()};
  $('#sTwo').onchange=e=>{S.two=e.target.checked;save()};
  $$('[data-rest]').forEach(b=>b.onclick=()=>{S.rest=+b.dataset.rest;save();render(true)});
  $$('[data-level]').forEach(b=>b.onclick=()=>{S.level=+b.dataset.level;save();render(true)})},
recipes(){$$('[data-cat]').forEach(b=>b.onclick=()=>{recFilter=b.dataset.cat;render(true)})},
checklist(){
  $$('[data-habit]').forEach(b=>b.onclick=()=>{const i=+b.dataset.habit;setHabit(i,!todayLog()[i]);render(true)});
  $('#wForm').onsubmit=e=>{e.preventDefault();const v=parseFloat(String($('#wIn').value).replace(',','.'));if(!(v>30&&v<250))return;const k=dayKey();weights=weights.filter(x=>x.d!==k);weights.push({d:k,kg:Math.round(v*10)/10});weights.sort((a,b)=>a.d<b.d?-1:1);store.set('rf.weights',weights);render(true)}},
settings(){
  $('#stName').onchange=e=>{S.name=e.target.value.trim();save()};
  $('#stHeight').onchange=e=>{const v=parseInt(e.target.value,10);S.height=v>=120&&v<=230?v:null;save()};
  $$('[data-set]').forEach(b=>b.onclick=()=>{S[b.dataset.set]=b.dataset.val;save();if(b.dataset.set==='theme')applyTheme();render(true)});
  $$('[data-remt]').forEach(i=>i.onchange=()=>{if(/^\d\d:\d\d$/.test(i.value)){S.rem[i.dataset.remt].t=i.value;save()}});
  $$('[data-remon]').forEach(i=>i.onchange=()=>{S.rem[i.dataset.remon].on=i.checked;save()});
  $('#remAdd').onclick=()=>{if(!CAN_DOWNLOAD){toast(t('rm_blocked'));return}
    try{const blob=new Blob([buildICS()],{type:'text/calendar'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ren-fit-reminders.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}catch(e){toast(t('rm_blocked'))}};
  $('#bkCopy').onclick=()=>{const txt=JSON.stringify({app:'ren-fit',v:1,settings:S,log,weights,sessions}),ta=$('#bkText');ta.value=txt;
    const fallback=()=>{ta.focus();ta.select();toast(t('bk_select'))};
    try{navigator.clipboard.writeText(txt).then(()=>toast(t('bk_copied')),fallback)}catch(e){fallback()}};
  $('#bkRestore').onclick=()=>{try{const d=JSON.parse($('#bkText').value);if(!d||d.app!=='ren-fit')throw 0;
      Object.assign(S,DEF,d.settings||{});S.rem=Object.assign({},DEF.rem,S.rem||{});log=d.log||{};weights=d.weights||[];sessions=d.sessions||[];
      save();store.set('rf.log',log);store.set('rf.weights',weights);store.set('rf.sessions',sessions);applyTheme();render();toast(t('bk_done'))}
    catch(e){toast(t('bk_bad'))}}}
};
document.addEventListener('click',e=>{
  const lg=e.target.closest('[data-lang]');if(lg){S.lang=lg.dataset.lang;save();hush();render(true);if(pl.open)refreshPlayerText();return}
  if(!e.target.closest('#app'))return;
  if(e.target.closest('[data-go]')){startSession();return}
  const p=e.target.closest('[data-preview]');if(p){openPreview(p.dataset.preview);return}
  const tg=e.target.closest('[data-tabgo]');if(tg){tab=tg.dataset.tabgo;render();return}
  const ng=e.target.closest('[data-nudge]');if(ng){if(ng.dataset.nudge==='yes')S.level=Math.min(3,S.level+1);else S.nudgeOff[S.level]=true;save();render(true)}});
$$('.tab').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});

/* ---------- reminders as a calendar file ---------- */
function buildICS(){
  const pad=n=>String(n).padStart(2,'0'),stamp=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',ie=s=>s.replace(/([\\;,])/g,'\\$1');
  const f=d=>d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'T'+pad(d.getHours())+pad(d.getMinutes())+'00',ev=[];
  for(const k of['workout','breakfast','snack','dinner','evening']){const r=S.rem[k];if(!r.on)continue;
    const[h,m]=r.t.split(':').map(Number),wk=k==='breakfast'||k==='snack',st=new Date();st.setHours(h,m,0,0);
    if(wk)while(st.getDay()===0||st.getDay()===6)st.setDate(st.getDate()+1);
    const en=new Date(st.getTime()+(k==='workout'?20:10)*60000),title=ie(t('rt_'+k));
    ev.push('BEGIN:VEVENT','UID:renfit-'+k+'@ren-fit','DTSTAMP:'+stamp,'DTSTART:'+f(st),'DTEND:'+f(en),'RRULE:FREQ='+(wk?'WEEKLY;BYDAY=MO,TU,WE,TH,FR':'DAILY'),'SUMMARY:'+title,'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+title,'TRIGGER:PT0M','END:VALARM','END:VEVENT')}
  return['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Ren Fit//EN','CALSCALE:GREGORIAN',...ev,'END:VCALENDAR'].join('\r\n')+'\r\n'}
RF.buildICS=buildICS;

/* ---------- workout player ---------- */
const pl={open:false,mode:'session',steps:[],i:0,rem:0,paused:false,exT:0,animT:0,cueT:0,cueI:-1,lastBeep:99,halfSaid:false,item:null,elapsed:0,total:0,lock:null,from:null,blend:1,last:null,ext:0,type:''};
let ac=null,raf=0,lastNow=0,lastTag='',lastPhase=null;
function buildSteps(){const r=routine(),s=[];if(!S.intro)s.push({type:'rest',it:r[0],dur:5,ready:true});
  r.forEach((it,i)=>{if(S.intro)s.push({type:'intro',it,dur:introDur(it.id)});s.push({type:'work',it,dur:it.s});if(i<r.length-1)s.push({type:'rest',it:r[i+1],dur:S.rest})});return s}
function beep(f,len=.14,vol=.16){if(!ac)return;try{const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(vol,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+len);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+len)}catch(e){}}
function voice(){try{const vs=speechSynthesis.getVoices(),want=S.lang==='hr'?['hr']:['en-gb','en'];for(const p of want){const v=vs.find(v=>v.lang.replace('_','-').toLowerCase().startsWith(p));if(v)return v}}catch(e){}return null}
function say(txt){if(!S.voice||!('speechSynthesis' in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(txt),v=voice();u.lang=loc();if(v)u.voice=v;u.rate=.97;speechSynthesis.speak(u)}catch(e){}}
function hush(){try{speechSynthesis.cancel()}catch(e){}}
const speaking=()=>{try{return speechSynthesis.speaking}catch(e){return false}};
function wake(){try{if(navigator.wakeLock&&!pl.lock)navigator.wakeLock.request('screen').then(l=>{pl.lock=l;l.addEventListener('release',()=>{pl.lock=null})}).catch(()=>{})}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(pl.open&&document.visibilityState==='visible')wake()});
function openPlayer(mode){
  pl.open=true;pl.mode=mode;$('#player').hidden=false;$('#player').classList.toggle('preview',mode==='preview');$('#plDone').hidden=true;document.body.style.overflow='hidden';
  const ok=RF.initStage($('#stage'));$('#stageErr').hidden=ok;$('#stageHint').hidden=!ok;RF.resizeStage();
  pl.paused=false;pl.from=null;pl.blend=1;pl.last=null;updPauseBtn();updVoiceBtn();applyStatic();wake();
  lastNow=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame)}
function startSession(){try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();ac.resume&&ac.resume()}catch(e){}
  pl.steps=buildSteps();pl.total=pl.steps.reduce((a,s)=>a+s.dur,0);pl.elapsed=0;openPlayer('session');enterStep(0,true)}
function openPreview(id){pl.item=itemFor(id);pl.exT=0;pl.cueI=-1;pl.cueT=0;pl.type='preview';openPlayer('preview');RF.cam.uy=0;RF.cam.up=0;RF.camTo(RF.MOVES[id].cam,true);fillStatic()}
function closePlayer(){pl.open=false;$('#player').hidden=true;document.body.style.overflow='';hush();cancelAnimationFrame(raf);try{pl.lock&&pl.lock.release()}catch(e){}pl.lock=null;try{document.fullscreenElement&&document.exitFullscreen()}catch(e){}render(true)}
function fillStatic(){
  const type=pl.type,st=pl.mode==='session'?pl.steps[pl.i]:null,it=st?st.it:pl.item,m=MT(it.id),r=routine(),idx=r.findIndex(x=>x.id===it.id)+1,of=t('p_of',{i:idx,n:r.length});
  const eb=$('#plEyebrow');eb.className='pl-eyebrow'+(type==='rest'?' rest':type==='intro'?' intro':'');
  eb.textContent=type==='preview'?`${t('g_'+it.g)} · ${t('p_howdone')}`:type==='intro'?`${t('p_how')} · ${of}`:type==='rest'?(st.ready?t('p_ready'):t('p_rest')):`${t('g_'+it.g)} · ${of}`;
  $('#plName').textContent=m.n;
  $('#plText').hidden=type==='work';$('#plText').textContent=m.intro;
  $('#plCues').hidden=!(type==='intro'||type==='preview');$('#plCues').innerHTML=m.cues.map(c=>`<li>${esc(c)}</li>`).join('');
  $('#plCue').hidden=type!=='work';pl.cueI=-1;
  $('#plPhase').hidden=!(RF.MOVES[it.id].phase&&(type==='work'||type==='preview'));lastPhase=null;
  $('#plMus').innerHTML=`<i></i><span>${esc(t('p_working'))}: ${esc(m.mus)}</span>`;
  $('#plClock').hidden=type==='preview';
  const nx=st&&type==='work'?pl.steps.slice(pl.i+1).find(s=>s.type==='work'):null;
  $('#plNext').innerHTML=nx?`${esc(t('p_next'))}: <b>${esc(MT(nx.it.id).n)}</b>`:'';lastTag=''}
function refreshPlayerText(){applyStatic();updPauseBtn();fillStatic()}
function enterStep(i,first){
  if(i>=pl.steps.length){finish();return}
  pl.i=Math.max(0,i);const s=pl.steps[pl.i],m=MT(s.it.id),mv=RF.MOVES[s.it.id];pl.type=s.type;pl.rem=s.dur;pl.lastBeep=99;pl.halfSaid=false;pl.cueT=0;pl.ext=0;
  pl.elapsed=pl.steps.slice(0,pl.i).reduce((a,x)=>a+x.dur,0);pl.from=pl.last;pl.blend=pl.last?0:1;
  if(s.type==='work'){pl.exT=0;beep(880,.25,.2)}else pl.animT=0;
  RF.cam.uy=0;RF.cam.up=0;RF.camTo(mv.cam,first);fillStatic();
  if(s.type==='intro')say(m.n+'. '+m.intro);
  else if(s.type==='work')say(t('v_go')+' '+m.n+(mv.sides?', '+m.sides[0]:''));
  else say((s.ready?t('v_ready'):t('v_rest'))+' '+t('v_next')+' '+m.n)}
function finish(){hush();say(t('v_done'));beep(660,.2);setTimeout(()=>beep(990,.3),220);
  sessions.push({d:dayKey(),l:S.level,s:Math.round(pl.total)});store.set('rf.sessions',sessions);setHabit(0,true);
  $('#plDoneH').textContent=S.name?t('p_done_h',{name:S.name}):t('p_done_h0');
  $('#plDoneTx').textContent=t('p_done_t',{m:Math.round(pl.total/60),n:sessionCount()})+(sessionCount()>=5&&S.intro?' '+t('p_done_intro'):'');
  $('#plBar').style.width='100%';$('#plDone').hidden=false;pl.paused=true}
function updPauseBtn(){$('#plPauseTx').textContent=t(pl.paused?'p_resume':'p_pause');$('#plPauseIc').innerHTML=pl.paused?'<path d="M7 4v16l13-8z"/>':'<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>'}
function updVoiceBtn(){$('#plVoiceIc').querySelector('.wave').style.opacity=S.voice?1:.15;$('#plVoice').setAttribute('aria-pressed',String(S.voice))}
function togglePause(){if(pl.mode==='preview'||!$('#plDone').hidden)return;pl.paused=!pl.paused;updPauseBtn();try{pl.paused?speechSynthesis.pause():speechSynthesis.resume()}catch(e){}}
$('#plPause').onclick=togglePause;
$('#plPrev').onclick=()=>{if(pl.mode!=='session'||!$('#plDone').hidden)return;hush();enterStep(pl.rem<pl.steps[pl.i].dur-2?pl.i:pl.i-1)};
$('#plSkip').onclick=()=>{if(pl.mode!=='session'||!$('#plDone').hidden)return;hush();enterStep(pl.i+1)};
$('#plVoice').onclick=()=>{S.voice=!S.voice;save();updVoiceBtn();if(!S.voice)hush()};
$('#plClose').onclick=closePlayer;$('#plDoneBtn').onclick=()=>{tab='today';closePlayer()};
$('#plFs').onclick=()=>{try{if(document.fullscreenElement)document.exitFullscreen();else{const p=$('#player').requestFullscreen&&$('#player').requestFullscreen();p&&p.catch&&p.catch(()=>{})}}catch(e){}};
document.addEventListener('keydown',e=>{if(!pl.open)return;if(e.code==='Space'){e.preventDefault();togglePause()}else if(e.code==='ArrowRight')$('#plSkip').click();else if(e.code==='ArrowLeft')$('#plPrev').click();else if(e.code==='Escape')closePlayer()});

function frame(now){
  if(!pl.open)return;raf=requestAnimationFrame(frame);
  const dt=Math.min(.1,(now-lastNow)/1000);lastNow=now;
  let it,tt,type,force=0;
  if(pl.mode==='preview'){it=pl.item;type='preview';pl.exT=(pl.exT+dt)%it.s;tt=pl.exT;pl.cueT+=dt}
  else{const s=pl.steps[pl.i];it=s.it;type=s.type;
    if(!pl.paused&&$('#plDone').hidden){pl.rem-=dt;pl.elapsed+=dt;pl.cueT+=dt;
      if(type==='work')pl.exT+=dt;else pl.animT+=dt*(type==='rest'?.6:.8);
      const c=Math.ceil(pl.rem);if(type!=='intro'&&c<=3&&c>=1&&c!==pl.lastBeep){pl.lastBeep=c;beep(520)}
      if(type==='work'&&RF.MOVES[it.id].sides&&!pl.halfSaid&&pl.exT>=it.s/2-.9){pl.halfSaid=true;const m=MT(it.id);say(m.sw+'. '+m.sides[1]);beep(740,.2)}
      if(pl.rem<=0){if(type==='intro'&&S.voice&&speaking()&&pl.ext<6){pl.ext+=dt;pl.rem=0}else{enterStep(pl.i+1);return}}}
    tt=type==='work'?pl.exT:pl.animT%it.s;if(type!=='work')force=1;
    $('#plTime').textContent=type==='intro'?String(Math.max(0,Math.ceil(pl.rem))):fmt(pl.rem);
    const kind=RF.MOVES[it.id].kind;
    $('#plSub').textContent=type==='intro'?t('p_soon'):type==='rest'?t('p_restword'):kind==='reps'?t('p_rep')+' '+(Math.floor(pl.exT/RF.MOVES[it.id].p)+1):kind==='hold'?t('p_hold'):'';
    $('#plBar').style.width=Math.min(100,100*pl.elapsed/pl.total).toFixed(2)+'%'}
  const m=MT(it.id),mv=RF.MOVES[it.id];
  if(type==='work'||type==='preview'){const n=Math.floor(pl.cueT/5)%m.cues.length;if(n!==pl.cueI){pl.cueI=n;$('#plCue').textContent=m.cues[n]}
    const ph=RF.phaseOf(it.id,tt);if(ph!==lastPhase){lastPhase=ph;$('#plPhase').textContent=ph?t('ph_'+ph):''}}
  const side=RF.sideOf(it.id,tt,it.s,force);
  const tag=(mv.sides&&type!=='rest'?`<span class="side">${esc(m.sides[side>0?0:1])}</span>`:'')+(type==='rest'?`<span>${esc(t('p_nextup'))}</span>`:'');
  if(tag!==lastTag){lastTag=tag;$('#stageTag').innerHTML=tag}
  if(!RF.hasStage())return;
  let P=RF.evalPose(it.id,tt,it.s,force);
  if(pl.from&&pl.blend<1){pl.blend=Math.min(1,pl.blend+dt/.55);if(pl.blend<1)P=RF.lerpPose(pl.from,P,sm(pl.blend))}
  pl.last=P;RF.draw(it.id,P,side,now/1000,dt,type!=='rest',S.two)}

/* render one still frame (used for checks) */
RF.test={still(id,tt,lang){if(lang){S.lang=lang}const it=itemFor(id);pl.item=it;pl.type='preview';openPlayer('preview');cancelAnimationFrame(raf);fillStatic();
  const P=RF.evalPose(id,tt,it.s),side=RF.sideOf(id,tt,it.s);RF.cam.uy=0;RF.cam.up=0;RF.camTo(P.cam||RF.MOVES[id].cam,true);
  const ph=RF.phaseOf(id,tt);$('#plPhase').textContent=ph?t('ph_'+ph):'';$('#plCue').textContent=MT(id).cues[0];
  $('#stageTag').innerHTML=RF.MOVES[id].sides?`<span class="side">${esc(MT(id).sides[side>0?0:1])}</span>`:'';
  RF.draw(id,P,side,0,0,true,S.two);return true},
  moves:()=>Object.keys(RF.MOVES).map(id=>({id,p:RF.MOVES[id].p,s:itemFor(id).s,sides:!!RF.MOVES[id].sides}))};

applyTheme();render();
if(STANDALONE&&'serviceWorker' in navigator&&/^https?:$/.test(location.protocol))window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})});
})();
