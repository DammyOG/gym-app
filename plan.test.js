// Run: node plan.test.js — checks every possible quiz answer builds a valid plan.
const assert = require('assert');
const { buildPlan, PATTERNS, STRETCH, CARDIO } = require('./plan.js');
const ids = new Set(require('./exercises.json').map(e => e.id));

for (const id of [...Object.values(PATTERNS).flat(), ...Object.values(STRETCH), ...Object.values(CARDIO).flat()]) assert(id === null || ids.has(id), `unknown exercise ${id}`);

const WEEK = [1, 2, 3, 4, 5, 6, 0];
let plans = 0;
for (let n = 2; n <= 6; n++)
  for (const exp of ['beginner', 'intermediate', 'advanced'])
    for (const goals of [['muscle'], ['strength'], ['endurance'], ['mobility'], ['fatloss'], ['muscle', 'strength'], ['muscle', 'strength', 'endurance', 'mobility', 'fatloss']])
      for (const focus of [[], ['glutes'], ['arms'], ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core']])
        for (const equip of ['gym', 'db', 'bw'])
          for (const alt of [false, true])
          for (const perDay of [4, 6, 8, 10]) {
            const days = WEEK.slice(0, n), plan = buildPlan({ days, exp, goals, focus, equip, alt, perDay });
            assert.strictEqual(plan.length, n);
            plan.forEach((r, i) => {
              assert.deepStrictEqual(r.days, [days[i]]);
              assert(r.ex.length >= 3 && r.ex.length <= perDay, `${r.name}: ${r.ex.length} exercises, budget ${perDay}`);
              if (perDay >= 6 && goals.includes('mobility')) assert(r.ex.some(x => x.t.r === '30 sec'), `${r.name}: no stretch`);
              if (perDay >= 5 && goals.includes('endurance')) assert(r.ex.at(-1).t.s === 1, `${r.name}: no cardio`);
              assert.strictEqual(new Set(r.ex.map(x => x.id)).size, r.ex.length, `${r.name}: duplicate exercise`);
              for (const x of r.ex) assert(x.t.s >= 1 && x.t.r, `${x.id}: bad target`);
            });
            if (focus.length === 1 && equip === 'gym' && perDay >= 6) {
              const want = PATTERNS[{ glutes: 'glute', arms: 'curl' }[focus[0]]][0];
              assert(plan.some(r => r.ex.some(x => x.id === want)), `focus ${focus[0]} missing from the week`);
            }
            for (const r of plan.filter(r => /^(Legs|Lower)/.test(r.name)))
              assert(!r.ex.some(x => x.id === 'Triceps_Pushdown' || x.id === 'Barbell_Curl'), `${r.name}: arm work on leg day`);
            plans++;
          }
console.log(`ok: ${plans} plans`);
