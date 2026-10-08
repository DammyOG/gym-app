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
let EX = [], byId = new Map(), tab = 'All', query = '', flash = null;

const db = (() => { try { return JSON.parse(localStorage.getItem('rep')) } catch { return null } })()
  || { workouts: [], active: null, custom: [] };
let view = db.active ? 'workout' : 'home';

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
  const a = db.active;
  return `
  <header class="bar"><h1 class="mark">Rep</h1></header>
  <button class="go" data-act="start">${a ? 'Resume workout' : 'Start workout'}${a ? `<small>Started ${time(a.start)}</small>` : ''}</button>
  <h2 class="sec">History</h2>
  ${db.workouts.length ? `<ul class="hist">${db.workouts.map((w, i) => `
    <li><button data-act="past" data-i="${i}">
      <span class="d">${day(w.start)}</span>
      <span class="names">${esc(w.ex.map(x => x.n).join(', '))}</span>
      <span class="stat"><b>${setCount(w)}</b>sets</span>
    </button></li>`).join('')}</ul>`
    : `<p class="empty">Your finished workouts will show up here.</p>`}`;
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
  const seed = x.sets.at(-1) || prev?.sets[0] || { w: '', r: '' };
  return `<section class="ex">
    <div class="ex-head">
      <button class="thumb" data-act="info" data-id="${esc(x.id)}" aria-label="About ${esc(x.n)}">${thumb(find(x.id))}</button>
      <div>
        <h3>${esc(x.n)}</h3>
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
    <div class="ttl"><span>${day(a.start)}</span><small id="elapsed">${dur(a.start)}</small></div>
    <button class="pill" data-act="finish">Finish</button>
  </header>
  ${a.ex.map(block).join('') || '<p class="empty">Add an exercise to start logging sets.</p>'}
  <button class="add-ex" data-act="pick">+ Add exercise</button>`;
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

function render() {
  app.dataset.view = view;
  app.innerHTML = { home, workout, picker }[view]();
  flash = null;
}
function go(v) { view = v; render(); scrollTo(0, 0) }

// --- sheets ---
function open(html) {
  sheet.innerHTML = `<div class="sheet-in"><div class="grab"${html.includes('autofocus') ? '' : ' tabindex="-1" autofocus'}></div>${html}</div>`;
  sheet.showModal();
  sheet.scrollTop = 0;
}
sheet.addEventListener('click', e => e.target === sheet && sheet.close());

function info(id) {
  const e = find(id);
  open(`
    <div class="media">${e.i ? `<img src="${IMG + e.i[0]}" crossorigin="anonymous" alt="${esc(e.n)}, start position"><img class="b" src="${IMG + e.i[1]}" crossorigin="anonymous" alt="${esc(e.n)}, end position">` : thumb(e)}</div>
    <h2>${esc(e.n)}</h2>
    ${e.m ? `<ul class="chips">${[...e.m, e.e].filter(Boolean).map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    ${e.s?.length ? `<ol class="steps">${e.s.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
    <div class="sheet-foot">${view === 'picker'
      ? `<button class="go" data-act="add" data-id="${esc(id)}">Add to workout</button>`
      : '<button class="ghost" data-act="close">Close</button>'}</div>`);
}

function addEx(e) {
  db.active.ex.push({ id: e.id, n: e.n, sets: [] });
  save(); sheet.close(); go('workout');
  scrollTo(0, document.body.scrollHeight);
}

// --- actions ---
const act = {
  start() { db.active ||= { start: new Date().toISOString(), ex: [] }; save(); go('workout') },
  pick() { query = ''; tab = 'All'; go('picker') },
  back() { go('workout') },
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
      <div class="sheet-foot"><button class="go">Add to workout</button></div>
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
  past(b) {
    const w = db.workouts[b.dataset.i];
    open(`
      <h2>${day(w.start, true)}</h2>
      <p class="sub">${time(w.start)}, ${dur(w.start, w.end)}</p>
      ${w.ex.map(x => `<section class="past"><h3>${esc(x.n)}</h3>${setRows(x, -1, false)}</section>`).join('')}
      <div class="sheet-foot"><button class="ghost danger" data-act="del-past" data-i="${b.dataset.i}">Delete workout</button></div>`);
  },
  'del-past'(b) {
    if (!confirm("Delete this workout? This can't be undone.")) return;
    db.workouts.splice(b.dataset.i, 1); save(); sheet.close(); render(); toast('Workout deleted');
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
  }
});

document.addEventListener('input', e => {
  if (e.target.id !== 'q') return;
  query = e.target.value;
  document.getElementById('grid').innerHTML = grid();
});

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
