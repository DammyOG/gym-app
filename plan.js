// Recommended plans: the number of training days picks a split, each day is a list of
// movement patterns, and each pattern resolves to an exercise for the user's equipment.

// [full gym, dumbbells only, bodyweight]; null = no good option, so the slot is skipped.
const PATTERNS = {
  squat:    ['Barbell_Squat', 'Dumbbell_Squat', 'Bodyweight_Squat'],
  hinge:    ['Romanian_Deadlift', 'Stiff-Legged_Dumbbell_Deadlift', 'Single_Leg_Glute_Bridge'],
  dead:     ['Barbell_Deadlift', 'Stiff-Legged_Dumbbell_Deadlift', 'Single_Leg_Glute_Bridge'],
  press:    ['Barbell_Bench_Press_-_Medium_Grip', 'Dumbbell_Bench_Press', 'Pushups'],
  incline:  ['Incline_Dumbbell_Press', 'Incline_Dumbbell_Press', 'Decline_Push-Up'],
  ohp:      ['Standing_Military_Press', 'Dumbbell_Shoulder_Press', 'Push-Ups_With_Feet_Elevated'],
  row:      ['Bent_Over_Barbell_Row', 'One-Arm_Dumbbell_Row', 'Inverted_Row'],
  cablerow: ['Seated_Cable_Rows', 'Bent_Over_Two-Dumbbell_Row_With_Palms_In', 'Inverted_Row'],
  pulldown: ['Wide-Grip_Lat_Pulldown', 'Bent_Over_Two-Dumbbell_Row_With_Palms_In', 'Pullups'],
  legpress: ['Leg_Press', 'Dumbbell_Step_Ups', 'Split_Squats'],
  lunge:    ['Barbell_Walking_Lunge', 'Dumbbell_Lunges', 'Bodyweight_Walking_Lunge'],
  quad:     ['Leg_Extensions', 'Dumbbell_Step_Ups', 'Split_Squats'],
  ham:      ['Lying_Leg_Curls', 'Stiff-Legged_Dumbbell_Deadlift', 'Single_Leg_Glute_Bridge'],
  glute:    ['Barbell_Hip_Thrust', 'Single_Leg_Glute_Bridge', 'Single_Leg_Glute_Bridge'],
  calf:     ['Standing_Calf_Raises', 'Standing_Dumbbell_Calf_Raise', null],
  lateral:  ['Side_Lateral_Raise', 'Side_Lateral_Raise', null],
  rear:     ['Face_Pull', 'Reverse_Flyes', null],
  fly:      ['Cable_Crossover', 'Dumbbell_Flyes', 'Pushups'],
  curl:     ['Barbell_Curl', 'Dumbbell_Bicep_Curl', 'Chin-Up'],
  hammer:   ['Alternate_Hammer_Curl', 'Alternate_Hammer_Curl', 'Chin-Up'],
  tri:      ['Triceps_Pushdown', 'Lying_Dumbbell_Tricep_Extension', 'Bench_Dips'],
  core:     ['Hanging_Leg_Raise', 'Crunches', 'Plank'],
};
const COMPOUND = new Set(['squat', 'hinge', 'dead', 'press', 'incline', 'ohp', 'row', 'cablerow', 'pulldown', 'legpress', 'lunge', 'glute']);

// Most important first; the exercises-per-session budget decides how many are used.
const DAY = {
  'Full body A': ['squat', 'press', 'row', 'hinge', 'lateral', 'curl', 'core'],
  'Full body B': ['dead', 'ohp', 'pulldown', 'lunge', 'tri', 'calf', 'core'],
  'Full body C': ['legpress', 'incline', 'cablerow', 'glute', 'rear', 'hammer', 'core'],
  'Upper A': ['press', 'row', 'ohp', 'pulldown', 'lateral', 'curl', 'tri'],
  'Upper B': ['incline', 'pulldown', 'cablerow', 'ohp', 'rear', 'hammer', 'tri'],
  'Lower A': ['squat', 'hinge', 'quad', 'ham', 'calf', 'core'],
  'Lower B': ['dead', 'legpress', 'lunge', 'glute', 'calf', 'core'],
  Push: ['press', 'ohp', 'incline', 'lateral', 'tri', 'fly'],
  Pull: ['pulldown', 'row', 'hinge', 'rear', 'curl', 'hammer'],
  Legs: ['squat', 'legpress', 'ham', 'lunge', 'quad', 'calf'],
};
const SPLITS = {
  2: { label: 'Full body', days: ['Full body A', 'Full body B'] },
  3: { label: 'Full body', days: ['Full body A', 'Full body B', 'Full body C'] },
  4: { label: 'Upper / lower', days: ['Upper A', 'Lower A', 'Upper B', 'Lower B'] },
  5: { label: 'Upper / lower + push / pull / legs', days: ['Upper A', 'Lower A', 'Push', 'Pull', 'Legs'] },
  6: { label: 'Push / pull / legs, twice a week', days: ['Push', 'Pull', 'Legs', 'Push 2', 'Pull 2', 'Legs 2'] },
};
const ALT = { 3: { label: 'Push / pull / legs', days: ['Push', 'Pull', 'Legs'] } }; // offered as a switch on the plan screen
const FOCUS = { chest: ['fly'], back: ['cablerow'], shoulders: ['lateral'], arms: ['curl', 'tri'], legs: ['quad'], glutes: ['glute'], core: ['core'] };
// Focus extras only go on days where they belong (no triceps on leg day). Full body takes anything.
const FITS = {
  Upper: ['fly', 'cablerow', 'lateral', 'curl', 'tri', 'core'], Lower: ['quad', 'glute', 'core'],
  Push: ['fly', 'lateral', 'tri', 'core'], Pull: ['cablerow', 'curl', 'core'], Legs: ['quad', 'glute', 'core'],
};
const MAX_FOCUS = 2; // extra exercises per day, so picking every muscle doesn't double the session

// Endurance / fat loss finisher, rotated across the week. Machines at the gym, bodyweight elsewhere.
const CARDIO = { gym: ['Rowing_Stationary', 'Bicycling_Stationary', 'Stairmaster', 'Elliptical_Trainer'], other: ['Mountain_Climbers', 'Star_Jump', 'Fast_Skipping'] };
// Mobility: a stretch for each area the day's lifts worked, first three kept.
const STRETCH = {
  squat: 'All_Fours_Quad_Stretch', legpress: 'All_Fours_Quad_Stretch', quad: 'All_Fours_Quad_Stretch', lunge: 'All_Fours_Quad_Stretch',
  hinge: 'Hamstring_Stretch', dead: 'Hamstring_Stretch', ham: 'Hamstring_Stretch', glute: 'Seated_Glute', calf: 'Calf_Stretch_Hands_Against_Wall',
  press: 'Dynamic_Chest_Stretch', incline: 'Dynamic_Chest_Stretch', fly: 'Dynamic_Chest_Stretch',
  ohp: 'Seated_Front_Deltoid', lateral: 'Seated_Front_Deltoid', rear: 'Seated_Front_Deltoid',
  row: 'One_Arm_Against_Wall', cablerow: 'One_Arm_Against_Wall', pulldown: 'One_Arm_Against_Wall',
  curl: 'Seated_Biceps', hammer: 'Seated_Biceps', tri: 'Triceps_Stretch', core: 'Cat_Stretch',
};

// [sets, reps] for compound (c) and accessory (a) lifts from any mix of goals.
function targets(goals, exp) {
  const g = new Set(goals);
  const c = g.has('strength') ? [4, '4–6'] : g.has('muscle') ? [3, '8–10'] : [3, '10–12'];
  const a = g.has('fatloss') ? [3, '12–15']
    : g.has('muscle') ? [3, g.has('strength') ? '8–12' : '10–12']
    : g.has('strength') ? [3, '8–10'] : [2, '12–15'];
  if (exp === 'beginner') c[0] = Math.min(c[0], 3);
  return { c, a };
}

// days: weekday numbers (Date.getDay()) in the order they fall in the week.
const split = (n, alt) => (alt && ALT[n]) || SPLITS[n];

// goals and focus are arrays (multi-select); focus may be empty for a balanced plan.
// perDay is the whole session: lifts, stretches and cardio all share it.
function buildPlan({ days, exp, goals, focus, equip, alt, perDay = 6 }) {
  const eq = { gym: 0, db: 1, bw: 2 }[equip], reps = targets(goals, exp);
  const extra = [...new Set(focus.flatMap(f => FOCUS[f]))];
  // Finishers take a slot each; lifts always keep at least 3, so small sessions drop stretches first, then cardio.
  let nStretch = goals.includes('mobility') ? (perDay >= 8 ? 2 : 1) : 0;
  let nCardio = goals.includes('endurance') || goals.includes('fatloss') ? 1 : 0;
  const lifts = Math.max(3, perDay - nStretch - nCardio);
  if (lifts + nStretch + nCardio > perDay) nStretch = 0;
  if (lifts + nStretch + nCardio > perDay) nCardio = 0;

  return split(days.length, alt).days.map((name, i) => {
    const base = DAY[name.replace(/ 2$/, '')];
    // Rotate through the focus list so every chosen muscle gets extra work somewhere in the week.
    const fits = FITS[name.split(' ')[0]], ok = extra.filter(p => !fits || fits.includes(p));
    // Focus patterns already in the day are promoted rather than added again.
    const add = [...new Set([...ok.slice(i * MAX_FOCUS % (ok.length || 1)), ...ok])].slice(0, MAX_FOCUS);
    // Priority: the day's top 3 lifts, then focus extras, then the rest of the day.
    const picked = [];
    for (const p of new Set([...base.slice(0, 3), ...add, ...base.slice(3)])) {
      const id = PATTERNS[p][eq];
      if (picked.length === lifts) break;
      if (id && !picked.some(x => x.id === id)) picked.push({ id, p });
    }
    picked.sort((a, b) => COMPOUND.has(b.p) - COMPOUND.has(a.p)); // big lifts first
    const ex = picked.map(({ id, p }) => {
      const [s, r] = reps[COMPOUND.has(p) ? 'c' : 'a'];
      return { id, t: { s, r: id === 'Plank' ? '30–60 sec' : r } };
    });
    for (const id of [...new Set(picked.map(x => STRETCH[x.p]))].slice(0, nStretch)) ex.push({ id, t: { s: 2, r: '30 sec' } });
    if (nCardio) {
      const list = CARDIO[equip === 'gym' ? 'gym' : 'other'];
      ex.push({ id: list[i % list.length], t: { s: 1, r: equip === 'gym' ? '10–15 min' : '3 × 40 sec' } });
    }
    return { name, days: [days[i]], ex };
  });
}
const splitLabel = (n, alt) => split(n, alt).label;
const hasAlt = n => n in ALT;

if (typeof module !== 'undefined') module.exports = { buildPlan, PATTERNS, STRETCH, CARDIO };
