// Run: node plan.test.js — checks every possible quiz answer builds a valid plan.
const assert = require('assert');
const { buildPlan, PATTERNS } = require('./plan.js');
const ids = new Set(require('./exercises.json').map(e => e.id));

for (const id of Object.values(PATTERNS).flat()) assert(id === null || ids.has(id), `unknown exercise ${id}`);

const WEEK = [1, 2, 3, 4, 5, 6, 0];
let plans = 0;
for (let n = 2; n <= 6; n++)
  for (const exp of ['beginner', 'intermediate', 'advanced'])
    for (const goal of ['muscle', 'strength', 'fitness'])
      for (const focus of ['none', 'chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core'])
        for (const equip of ['gym', 'db', 'bw'])
          for (const alt of [false, true]) {
            const days = WEEK.slice(0, n), plan = buildPlan({ days, exp, goal, focus, equip, alt });
            assert.strictEqual(plan.length, n);
            plan.forEach((r, i) => {
              assert.deepStrictEqual(r.days, [days[i]]);
              assert(r.ex.length >= 3 && r.ex.length <= 8, `${r.name}: ${r.ex.length} exercises`);
              assert.strictEqual(new Set(r.ex.map(x => x.id)).size, r.ex.length, `${r.name}: duplicate exercise`);
              for (const x of r.ex) assert(x.t.s >= 2 && x.t.r, `${x.id}: bad target`);
            });
            plans++;
          }
console.log(`ok: ${plans} plans`);
