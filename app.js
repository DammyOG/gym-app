const IMG = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';
const GROUPS = {
  All: null,
  Chest: ['chest'],
  Back: ['lats', 'middle back', 'lower back', 'traps'],
  Legs: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abductors', 'adductors'],
  Shoulders: ['shoulders', 'neck'],
  Arms: ['biceps', 'triceps', 'forearms'],
  Core: ['abdominals'],
};
// Common lifts float to the top of every tab; the rest stay alphabetical.
const POPULAR = ['Barbell_Bench_Press_-_Medium_Grip', 'Barbell_Squat', 'Barbell_Deadlift', 'Pullups', 'Standing_Military_Press',
  'Bent_Over_Barbell_Row', 'Dumbbell_Bench_Press', 'Incline_Dumbbell_Press', 'Wide-Grip_Lat_Pulldown', 'Leg_Press',
  'Romanian_Deadlift', 'Dumbbell_Shoulder_Press', 'Dumbbell_Bicep_Curl', 'Barbell_Curl', 'Alternate_Hammer_Curl',
  'Triceps_Pushdown', 'Dips_-_Chest_Version', 'Seated_Cable_Rows', 'Lying_Leg_Curls', 'Leg_Extensions',
  'Side_Lateral_Raise', 'Face_Pull', 'Barbell_Hip_Thrust', 'Barbell_Walking_Lunge', 'Standing_Calf_Raises',
  'Chin-Up', 'Pushups', 'Plank', 'Hanging_Leg_Raise', 'Crunches'];
const rank = id => { const i = POPULAR.indexOf(id); return i < 0 ? POPULAR.length : i };

const app = document.getElementById('app');
const sheet = document.getElementById('sheet');
let EX = [], byId = new Map(), tab = 'All', query = '', flash = null, draft = null, pickFor = 'workout', selDay = null, quiz = null;

const db = (() => { try { return JSON.parse(localStorage.getItem('rep')) } catch { return null } })()
  || { workouts: [], active: null, custom: [] };
db.routines ||= [];
let view = db.active ? 'workout' : 'home';
if (!db.active && !db.onboarded && !db.workouts.length && !db.routines.length) { quiz = { step: 0, days: [] }; view = 'quiz' }

function save() {
  try { localStorage.setItem('rep', JSON.stringify(db)) }
  catch { alert("Couldn't save. Storage for Rep on this phone is full.") }
}

// --- helpers ---
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const find = id => byId.get(id) || db.custom.find(e => e.id === id);
const lbs = w => (w > 0 ? String(w) : 'BW');
const day = (iso, long) => new Date(iso).toLocaleDateString(undefined, long
  ? { weekday: 'long', month: 'long', day: 'numeric' }
  : { weekday: 'short', month: 'short', day: 'numeric' });
const time = iso => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
function dur(a, b = Date.now()) {
  const m = Math.max(1, Math.round((new Date(b) - new Date(a)) / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
const DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon first; numbers match Date.getDay()
const dayName = d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d];
const daysText = days => days.length ? DAYS.filter(d => days.includes(d)).map(dayName).join(', ') : 'No days set';
const dayKey = d => new Date(d).toLocaleDateString('en-CA'); // local YYYY-MM-DD
const monday = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x };
const tgt = t => `${t.s} × ${t.r}`;
const setCount = w => w.ex.reduce((n, x) => n + x.sets.length, 0);
const lastTime = id => db.workouts.find(w => w.ex.some(x => x.id === id))?.ex.find(x => x.id === id);
const thumb = e => e?.i
  ? `<img src="${IMG + e.i[0]}" crossorigin="anonymous" loading="lazy" alt="">`
  : `<div class="ph">${esc((e?.n || '?')[0])}</div>`;

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
  document.body.append(t);
  setTimeout(() => t.remove(), 2200);
}

// --- views ---
function home() {
  const a = db.active, due = a ? [] : db.routines.filter(r => r.days.includes(new Date().getDay()));
  return `
  <header class="bar"><h1 class="mark">Rep</h1></header>
  ${due.map(r => `<button class="go" data-act="run" data-id="${r.id}">Today: ${esc(r.name)}<small>${r.ex.length} exercises</small></button>`).join('')}
  <button class="${due.length ? 'ghost' : 'go'}" data-act="start">${a ? 'Resume workout' : due.length ? 'Start empty workout' : 'Start workout'}${a ? `<small>Started ${time(a.start)}</small>` : ''}</button>
  <h2 class="sec">Routines</h2>
  ${db.routines.length ? `<ul class="hist">${db.routines.map(r => `
    <li><button data-act="routine" data-id="${r.id}">
      <span class="d">${esc(r.name)}</span>
      <span class="names">${daysText(r.days)}</span>
      <span class="stat"><b>${r.ex.length}</b>exercises</span>
    </button></li>`).join('')}</ul>` : ''}
  <button class="add-ex" data-act="new-routine">+ New routine</button>
  <button class="link" data-act="quiz">Get a recommended plan</button>
  ${tabbar()}`;
}

function tabbar() {
  const tab = (v, label, icon) => `<button data-act="nav" data-v="${v}"${view === v ? ' aria-current="page"' : ''}>
    <svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>${label}</button>`;
  return `<nav class="tabbar">
    ${tab('home', 'Home', '<path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z"/>')}
    ${tab('history', 'History', '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>')}
  </nav>`;
}

// Week strip: swipe sideways between weeks (CSS scroll-snap), tap a day to see its workouts.
function history() {
  const today = dayKey(Date.now());
  selDay ||= db.workouts.length ? dayKey(db.workouts[0].start) : today;
  const done = new Set(db.workouts.map(w => dayKey(w.start)));
  const last = monday(Date.now()), first = monday(db.workouts.at(-1)?.start ?? Date.now());
  const start = new Date(Math.min(first, new Date(last).setDate(last.getDate() - 7 * 7))); // at least 8 weeks
  const weeks = [];
  for (const w = new Date(start); w <= last; w.setDate(w.getDate() + 7)) weeks.push(new Date(w));
  const month = d => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const sel = new Date(selDay + 'T12:00');
  const list = db.workouts.map((w, i) => [w, i]).filter(([w]) => dayKey(w.start) === selDay);
  return `
  <header class="bar"><h1 class="mark">History</h1></header>
  <h2 class="sec" id="month">${month(sel)}</h2>
  <div class="strip" id="strip">${weeks.map(m => {
    const thu = new Date(m); thu.setDate(m.getDate() + 3);
    return `<div class="week" data-m="${month(thu)}">${[0, 1, 2, 3, 4, 5, 6].map(n => {
      const d = new Date(m); d.setDate(m.getDate() + n);
      const k = dayKey(d);
      return `<button data-act="sel" data-k="${k}" aria-pressed="${k === selDay}"${k === today ? ' class="today"' : ''}${k > today ? ' disabled' : ''}
        aria-label="${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${done.has(k) ? ', workout logged' : ''}">
        <small>${dayName(d.getDay())}</small><b>${d.getDate()}</b><i${done.has(k) ? ' class="dot"' : ''}></i></button>`;
    }).join('')}</div>`;
  }).join('')}</div>
  <h2 class="sec">${selDay === today ? 'Today' : day(sel, true)}</h2>
  ${list.length ? list.map(([w, i]) => `<section class="day-w">
    <h3>${esc(w.name || 'Workout')}</h3>
    <p class="sub">${time(w.start)}, ${dur(w.start, w.end)}, ${setCount(w)} sets</p>
    ${pexList(w)}
    <button class="txt danger" data-act="del-past" data-i="${i}">Delete workout</button>
  </section>`).join('') : '<p class="empty">No workout logged.</p>'}
  ${tabbar()}`;
}

function pexList(w) {
  return w.ex.map(x => {
    const top = x.sets.reduce((a, b) => (b.w > a.w || (b.w === a.w && b.r > a.r) ? b : a));
    return `<details class="pex">
      <summary>
        <span class="thumb">${thumb(find(x.id))}</span>
        <span><b>${esc(x.n)}</b><small>${x.sets.length} ${x.sets.length === 1 ? 'set' : 'sets'}, top ${lbs(top.w)} × ${top.r}</small></span>
      </summary>
      ${setRows(x, -1, false)}
    </details>`;
  }).join('');
}

function setRows(x, i, editable) {
  return `<ol class="sets">${x.sets.map((s, j) => `
    <li${flash && flash[0] === i && flash[1] === j ? ' class="new"' : ''}>
      <span class="n">${j + 1}</span><b>${lbs(s.w)}</b><small>${s.w > 0 ? 'lbs' : ''}</small><i>×</i><b>${s.r}</b><small>reps</small>
      ${editable ? `<button class="x" data-act="rm-set" data-i="${i}" data-j="${j}" aria-label="Delete set ${j + 1}">×</button>` : ''}
    </li>`).join('')}</ol>`;
}

function block(x, i) {
  const prev = lastTime(x.id);
  const seed = x.sets.at(-1) || prev?.sets[0] || { w: '', r: parseInt(x.t?.r) || '' };
  return `<section class="ex">
    <div class="ex-head">
      <button class="thumb" data-act="info" data-id="${esc(x.id)}" aria-label="About ${esc(x.n)}">${thumb(find(x.id))}</button>
      <div>
        <h3>${esc(x.n)}</h3>
        ${x.t ? `<p class="prev tgt">Target ${tgt(x.t)}, ${x.sets.length} of ${x.t.s} done</p>` : ''}
        ${prev ? `<p class="prev">Last time ${prev.sets.map(s => `${lbs(s.w)}×${s.r}`).join(', ')}</p>` : ''}
      </div>
      <button class="x" data-act="rm-ex" data-i="${i}" aria-label="Remove ${esc(x.n)}">×</button>
    </div>
    ${x.sets.length ? setRows(x, i, true) : ''}
    <form class="log" data-i="${i}">
      <label><input name="w" inputmode="decimal" pattern="\\d*\\.?\\d*" value="${seed.w || ''}" placeholder="0" aria-label="Weight in lbs, empty for bodyweight"><span>lbs</span></label>
      <label><input name="r" inputmode="numeric" pattern="[1-9]\\d*" required value="${seed.r}" placeholder="0" aria-label="Reps"><span>reps</span></label>
      <button>Add set</button>
    </form>
  </section>`;
}

function workout() {
  const a = db.active;
  return `
  <header class="bar">
    <button class="txt" data-act="discard">Discard</button>
    <div class="ttl"><span>${a.name ? esc(a.name) : day(a.start)}</span><small id="elapsed">${dur(a.start)}</small></div>
    <button class="pill" data-act="finish">Finish</button>
  </header>
  ${a.ex.map(block).join('') || '<p class="empty">Add an exercise to start logging sets.</p>'}
  <button class="add-ex" data-act="pick">+ Add exercise</button>`;
}

function routine() {
  const r = draft;
  return `
  <header class="bar">
    <button class="txt" data-act="home">Cancel</button>
    <div class="ttl"><span>${r.id ? 'Edit routine' : 'New routine'}</span></div>
    <button class="pill" form="rf">Save</button>
  </header>
  <form id="rf" class="rf">
    <input id="rname" value="${esc(r.name)}" placeholder="Name, e.g. Push" required pattern=".*\\S.*" maxlength="40" aria-label="Routine name">
  </form>
  <h2 class="sec">Days</h2>
  <div class="days">${DAYS.map(d => `<button data-act="day" data-d="${d}" aria-pressed="${r.days.includes(d)}">${dayName(d)}</button>`).join('')}</div>
  <h2 class="sec">Exercises</h2>
  ${rexList(r.ex, true)}
  <button class="add-ex" data-act="pick">+ Add exercise</button>
  ${r.id ? '<button class="ghost danger" data-act="del-routine">Delete routine</button>' : ''}`;
}

function rexList(ex, editable) {
  return ex.length ? `<ul class="rex">${ex.map((x, i) => `<li>
    <button class="thumb" data-act="info" data-id="${esc(x.id)}" aria-label="About ${esc(x.n)}">${thumb(find(x.id))}</button>
    <span>${esc(x.n)}${editable
      ? `<span class="tg"><input data-i="${i}" data-f="s" inputmode="numeric" value="${x.t?.s ?? ''}" placeholder="3" aria-label="Target sets for ${esc(x.n)}">sets ×
         <input data-i="${i}" data-f="r" value="${esc(x.t?.r ?? '')}" placeholder="8–12" aria-label="Target reps for ${esc(x.n)}">reps</span>`
      : x.t ? `<small>${tgt(x.t)}</small>` : ''}</span>
    ${editable ? `<button class="x" data-act="rm-rex" data-i="${i}" aria-label="Remove ${esc(x.n)}">×</button>` : ''}
  </li>`).join('')}</ul>` : '';
}

function picker() {
  return `<div class="pick-head">
    <header class="bar">
      <button class="txt" data-act="back">Cancel</button>
      <div class="ttl"><span>Add exercise</span></div>
      <span></span>
    </header>
    <input type="search" id="q" placeholder="Search ${EX.length} exercises" value="${esc(query)}" autocomplete="off" enterkeyhint="search">
    <nav class="tabs">${Object.keys(GROUPS).map(t =>
      `<button data-act="tab" data-t="${t}" aria-pressed="${t === tab}">${t}</button>`).join('')}</nav>
  </div>
  <div class="grid" id="grid">${grid()}</div>`;
}

function grid() {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean), g = GROUPS[tab];
  const list = [...db.custom, ...EX].filter(e =>
    (!g || e.m?.some(m => g.includes(m))) && terms.every(t => e.n.toLowerCase().includes(t)));
  return (list.length ? '' : `<p class="empty">No exercises match “${esc(query.trim())}”.</p>`)
    + list.map(e => `<button class="card" data-act="info" data-id="${esc(e.id)}">${thumb(e)}<span>${esc(e.n)}</span></button>`).join('')
    + `<button class="custom" data-act="custom">Can't find it?<b>Add ${terms.length ? `“${esc(query.trim())}”` : 'your own exercise'}</b></button>`;
}

const QUIZ = [
  { k: 'exp', q: 'How long have you been lifting?', o: [['beginner', 'Under 6 months'], ['intermediate', '6 months to 2 years'], ['advanced', 'More than 2 years']] },
  { k: 'goal', q: "What's your main goal?", o: [['muscle', 'Build muscle'], ['strength', 'Get stronger'], ['fitness', 'Get fit and stay active']] },
  { k: 'focus', q: 'Anything you want to prioritize?', o: [['none', 'No, keep it balanced'], ['chest', 'Chest'], ['back', 'Back'], ['shoulders', 'Shoulders'], ['arms', 'Arms'], ['legs', 'Legs'], ['glutes', 'Glutes'], ['core', 'Core']] },
  { k: 'equip', q: 'What equipment do you have?', o: [['gym', 'A full gym'], ['db', 'Dumbbells only'], ['bw', 'Just my bodyweight']] },
];
const makePlan = () => buildPlan({ ...quiz, days: DAYS.filter(d => quiz.days.includes(d)) })
  .map((r, i) => ({ ...r, id: `r${Date.now()}${i}`, ex: r.ex.map(x => ({ ...x, n: find(x.id)?.n || x.id })) }));

function quizView() {
  const st = quiz.step, last = QUIZ.length + 1;
  const head = `<header class="bar">
    <button class="txt" data-act="${st ? 'q-back' : 'q-skip'}">${st ? 'Back' : 'Skip'}</button>
    <div class="ttl"><span class="prog"><i style="width:${(st + 1) / (last + 1) * 100}%"></i></span></div>
    <span></span>
  </header>`;
  if (st === 0) {
    const n = quiz.days.length;
    return `${head}
    <h1 class="q">Which days can you train?</h1>
    <p class="sub">Pick 2 to 6. Your plan is built around them.</p>
    <div class="days q-days">${DAYS.map(d => `<button data-act="q-day" data-d="${d}" aria-pressed="${quiz.days.includes(d)}">${dayName(d)}</button>`).join('')}</div>
    <div class="foot"><button class="go" data-act="q-next"${n >= 2 && n <= 6 ? '' : ' disabled'}>Continue</button></div>`;
  }
  if (st < last) {
    const { k, q, o } = QUIZ[st - 1];
    return `${head}
    <h1 class="q">${q}</h1>
    <div class="opts">${o.map(([v, l]) => `<button data-act="q-pick" data-v="${v}" aria-pressed="${quiz[k] === v}">${l}</button>`).join('')}</div>`;
  }
  const plan = makePlan();
  return `${head}
  <h1 class="q">Your plan</h1>
  <p class="sub">${splitLabel(plan.length, quiz.alt)}, ${plan.length} days a week. You can change anything after saving.</p>
  ${hasAlt(plan.length) ? `<nav class="tabs seg">
    <button data-act="q-alt" aria-pressed="${!quiz.alt}">${splitLabel(plan.length)}</button>
    <button data-act="q-alt" data-alt="1" aria-pressed="${!!quiz.alt}">${splitLabel(plan.length, true)}</button>
  </nav>` : ''}
  ${plan.map(r => `<section class="plan-r"><h3>${esc(r.name)}<span>${daysText(r.days)}</span></h3>${rexList(r.ex, false)}</section>`).join('')}
  <div class="foot${db.routines.length ? ' two' : ''}">${db.routines.length
    ? '<button class="ghost" data-act="q-use" data-mode="add">Add to mine</button><button class="go" data-act="q-use">Replace my routines</button>'
    : '<button class="go" data-act="q-use">Use this plan</button>'}</div>`;
}

function render() {
  app.dataset.view = view;
  app.innerHTML = { home, workout, picker, routine, history, quiz: quizView }[view]();
  const strip = document.getElementById('strip');
  if (strip) strip.scrollLeft = strip.querySelector('[aria-pressed=true]').parentElement.offsetLeft;
  flash = null;
}
function go(v) { view = v; render(); scrollTo(0, 0) }

// --- sheets ---
function open(html) {
  sheet.innerHTML = `<div class="sheet-in">
    <div class="sheet-top"><button class="x" data-act="close" aria-label="Close">×</button></div>
    <div class="grab"${html.includes('autofocus') ? '' : ' tabindex="-1" autofocus'}></div>${html}</div>`;
  sheet.showModal();
  sheet.scrollTop = 0;
}
sheet.addEventListener('click', e => e.target === sheet && sheet.close());

// Drag down to close, but only from the top; otherwise the sheet's own content scrolls.
let drag = null;
sheet.addEventListener('touchstart', e => {
  drag = sheet.scrollTop <= 0 ? { y: e.touches[0].clientY, dy: 0 } : null;
}, { passive: true });
sheet.addEventListener('touchmove', e => {
  if (!drag) return;
  drag.dy = e.touches[0].clientY - drag.y;
  if (drag.dy < 0) { drag = null; sheet.style.transform = ''; return }
  e.preventDefault();
  sheet.style.transform = `translateY(${drag.dy}px)`;
}, { passive: false });
sheet.addEventListener('touchend', () => {
  if (!drag) return;
  const shut = drag.dy > 90;
  drag = null;
  sheet.style.transition = 'transform .2s';
  sheet.style.transform = shut ? 'translateY(100%)' : '';
  setTimeout(() => {
    sheet.style.transition = '';
    if (shut) { sheet.close(); sheet.style.transform = '' }
  }, 200);
});

function info(id) {
  const e = find(id);
  open(`
    <div class="media">${e.i ? `<img src="${IMG + e.i[0]}" crossorigin="anonymous" alt="${esc(e.n)}, start position"><img class="b" src="${IMG + e.i[1]}" crossorigin="anonymous" alt="${esc(e.n)}, end position">` : thumb(e)}</div>
    <h2>${esc(e.n)}</h2>
    ${e.m ? `<ul class="chips">${[...e.m, e.e].filter(Boolean).map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    ${e.s?.length ? `<ol class="steps">${e.s.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
    <div class="sheet-foot">${view === 'picker'
      ? `<button class="go" data-act="add" data-id="${esc(id)}">Add to ${pickFor}</button>`
      : '<button class="ghost" data-act="close">Close</button>'}</div>`);
}

function addEx(e) {
  if (pickFor === 'routine') draft.ex.push({ id: e.id, n: e.n });
  else { db.active.ex.push({ id: e.id, n: e.n, sets: [] }); save() }
  sheet.close(); go(pickFor);
  scrollTo(0, document.body.scrollHeight);
}

// --- actions ---
const act = {
  start() { db.active ||= { start: new Date().toISOString(), ex: [] }; save(); go('workout') },
  pick() { pickFor = view; query = ''; tab = 'All'; go('picker') },
  back() { go(pickFor) },
  home() { go('home') },
  'new-routine'() { draft = { name: '', days: [], ex: [] }; go('routine') },
  'edit-routine'(b) { draft = structuredClone(db.routines.find(r => r.id === b.dataset.id)); sheet.close(); go('routine') },
  routine(b) {
    const r = db.routines.find(r => r.id === b.dataset.id);
    open(`
      <h2>${esc(r.name)}</h2>
      <p class="sub">${daysText(r.days)}</p>
      ${rexList(r.ex, false)}
      <div class="sheet-foot two">
        <button class="ghost" data-act="edit-routine" data-id="${r.id}">Edit</button>
        <button class="go" data-act="run" data-id="${r.id}">Start workout</button>
      </div>`);
  },
  run(b) {
    sheet.close();
    if (db.active) { go('workout'); return toast('Finish this workout first') }
    const r = db.routines.find(r => r.id === b.dataset.id);
    db.active = { start: new Date().toISOString(), name: r.name, ex: r.ex.map(x => ({ id: x.id, n: x.n, t: x.t, sets: [] })) };
    save(); go('workout');
  },
  day(b) {
    const d = +b.dataset.d;
    draft.days = draft.days.includes(d) ? draft.days.filter(x => x !== d) : [...draft.days, d];
    b.setAttribute('aria-pressed', draft.days.includes(d));
  },
  'rm-rex'(b) { draft.ex.splice(b.dataset.i, 1); render() },
  'del-routine'() {
    if (!confirm(`Delete the ${draft.name} routine? Past workouts stay in History.`)) return;
    db.routines = db.routines.filter(r => r.id !== draft.id); save(); go('home'); toast('Routine deleted');
  },
  close() { sheet.close() },
  info(b) { info(b.dataset.id) },
  add(b) { addEx(find(b.dataset.id)) },
  tab(b) {
    tab = b.dataset.t;
    document.querySelectorAll('.tabs button').forEach(t => t.setAttribute('aria-pressed', t === b));
    document.getElementById('grid').innerHTML = grid();
    scrollTo(0, 0);
  },
  custom() {
    open(`<form class="new">
      <h2>Add your own exercise</h2>
      <input name="n" value="${esc(query.trim())}" placeholder="Exercise name" autofocus required maxlength="60" aria-label="Exercise name">
      <div class="sheet-foot"><button class="go">Add to ${pickFor}</button></div>
    </form>`);
  },
  'rm-ex'(b) {
    const x = db.active.ex[b.dataset.i];
    if (x.sets.length && !confirm(`Remove ${x.n} and its ${x.sets.length} sets?`)) return;
    db.active.ex.splice(b.dataset.i, 1); save(); render();
  },
  'rm-set'(b) { db.active.ex[b.dataset.i].sets.splice(b.dataset.j, 1); save(); render() },
  discard() {
    if (setCount(db.active) && !confirm("Discard this workout? Its sets won't be saved.")) return;
    db.active = null; save(); go('home');
  },
  finish() {
    const a = db.active;
    if (!setCount(a)) return act.discard();
    a.ex = a.ex.filter(x => x.sets.length);
    a.end = new Date().toISOString();
    db.workouts.unshift(a); db.active = null; save();
    go('home'); toast('Workout saved');
  },
  nav(b) { go(b.dataset.v) },
  quiz() { quiz = { step: 0, days: [] }; go('quiz') },
  'q-skip'() { db.onboarded = true; save(); quiz = null; go('home') },
  'q-back'() { quiz.step--; go('quiz') },
  'q-next'() { quiz.step++; go('quiz') },
  'q-day'(b) {
    const d = +b.dataset.d;
    quiz.days = quiz.days.includes(d) ? quiz.days.filter(x => x !== d) : [...quiz.days, d];
    render();
  },
  'q-alt'(b) { quiz.alt = !!b.dataset.alt; render() },
  'q-pick'(b) { quiz[QUIZ[quiz.step - 1].k] = b.dataset.v; quiz.step++; go('quiz') },
  'q-use'(b) {
    const plan = makePlan();
    db.routines = b.dataset.mode === 'add' ? [...db.routines, ...plan] : plan;
    db.onboarded = true; quiz = null; save();
    go('home'); toast('Plan saved');
  },
  sel(b) { selDay = b.dataset.k; render() },
  'del-past'(b) {
    if (!confirm("Delete this workout? This can't be undone.")) return;
    db.workouts.splice(b.dataset.i, 1); save(); render(); toast('Workout deleted');
  },
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b) act[b.dataset.act](b);
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, d = new FormData(f);
  if (f.classList.contains('log')) {
    const i = +f.dataset.i, x = db.active.ex[i];
    x.sets.push({ w: parseFloat(d.get('w')) || 0, r: parseInt(d.get('r'), 10) });
    flash = [i, x.sets.length - 1];
    save(); render();
  } else if (f.classList.contains('new')) {
    const n = d.get('n').trim();
    let c = db.custom.find(x => x.n.toLowerCase() === n.toLowerCase());
    if (!c) db.custom.push(c = { id: 'custom-' + Date.now(), n });
    addEx(c);
  } else if (f.id === 'rf') {
    if (!draft.ex.length) return toast('Add at least one exercise');
    draft.name = draft.name.trim();
    draft.ex.forEach(x => { if (!x.t?.s || !x.t?.r) delete x.t });
    const i = db.routines.findIndex(r => r.id === draft.id);
    if (i < 0) db.routines.push({ ...draft, id: 'r' + Date.now() }); else db.routines[i] = draft;
    save(); go('home'); toast('Routine saved');
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'rname') draft.name = e.target.value;
  const { f, i } = e.target.dataset;
  if (f && draft) {
    const x = draft.ex[i];
    x.t = { ...x.t, [f]: f === 's' ? parseInt(e.target.value) || '' : e.target.value.trim() };
  }
  if (e.target.id !== 'q') return;
  query = e.target.value;
  document.getElementById('grid').innerHTML = grid();
});

// Keep the month label in step with the week you've swiped to.
document.addEventListener('scroll', e => {
  if (e.target.id !== 'strip') return;
  const wk = e.target.children[Math.round(e.target.scrollLeft / e.target.clientWidth)];
  if (wk) document.getElementById('month').textContent = wk.dataset.m;
}, true);

// Offline or missing photo: show the grey tile instead of a broken-image icon.
document.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.style.visibility = 'hidden' }, true);

setInterval(() => {
  const el = document.getElementById('elapsed');
  if (el && db.active) el.textContent = dur(db.active.start);
}, 30000);

render();
fetch('exercises.json').then(r => r.json()).then(d => {
  EX = d.sort((a, b) => rank(a.id) - rank(b.id)); byId = new Map(d.map(e => [e.id, e]));
  render();
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
