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

// Most important first; experience decides how many of each list are used.
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
const PER_DAY = { beginner: 4, intermediate: 5, advanced: 6 };
const FOCUS = { chest: ['fly'], back: ['cablerow'], shoulders: ['lateral'], arms: ['curl', 'tri'], legs: ['quad'], glutes: ['glute'], core: ['core'] };
const REPS = { // [sets, reps] for compound / accessory lifts
  muscle:   { c: [3, '8–10'], a: [3, '10–12'] },
  strength: { c: [4, '4–6'], a: [3, '8–10'] },
  fitness:  { c: [3, '10–12'], a: [2, '12–15'] },
};

// days: weekday numbers (Date.getDay()) in the order they fall in the week.
const split = (n, alt) => (alt && ALT[n]) || SPLITS[n];

function buildPlan({ days, exp, goal, focus, equip, alt }) {
  const eq = { gym: 0, db: 1, bw: 2 }[equip];
  return split(days.length, alt).days.map((name, i) => {
    const pats = new Set([...DAY[name.replace(/ 2$/, '')].slice(0, PER_DAY[exp]), ...(FOCUS[focus] || [])]);
    const ex = [];
    for (const p of pats) {
      const id = PATTERNS[p][eq];
      if (!id || ex.some(x => x.id === id)) continue;
      const [s, r] = REPS[goal][COMPOUND.has(p) ? 'c' : 'a'];
      ex.push({ id, t: { s: exp === 'beginner' ? Math.min(s, 3) : s, r: id === 'Plank' ? '30–60 sec' : r } });
    }
    return { name, days: [days[i]], ex };
  });
}
const splitLabel = (n, alt) => split(n, alt).label;
const hasAlt = n => n in ALT;

if (typeof module !== 'undefined') module.exports = { buildPlan, PATTERNS };
