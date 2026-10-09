// Rebuild wger.json from the wger.de API: node tools/build-wger.mjs
// wger data is CC-BY-SA (credited in the app), so wger.json is CC-BY-SA too.
import { writeFileSync } from 'node:fs';

const MUSCLE = { // wger muscle id -> the muscle names free-exercise-db uses
  1: 'biceps', 2: 'shoulders', 3: 'chest', 4: 'chest', 5: 'triceps', 6: 'abdominals', 7: 'calves', 8: 'glutes',
  9: 'traps', 10: 'quadriceps', 11: 'hamstrings', 12: 'lats', 13: 'biceps', 14: 'abdominals', 15: 'calves',
};
const ENGLISH = 2;
const text = html => html.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

const out = [];
for (let url = 'https://wger.de/api/v2/exerciseinfo/?limit=100'; url;) {
  const page = await (await fetch(url)).json();
  for (const x of page.results) {
    const en = x.translations.find(t => t.language === ENGLISH);
    if (!en?.name?.trim()) continue;
    const steps = text(en.description || '').split('\n').map(s => s.trim()).filter(s => s.length > 3);
    out.push({
      id: `wger-${x.id}`,
      n: en.name.trim(),
      m: [...new Set(x.muscles.map(m => MUSCLE[m.id]).filter(Boolean))],
      e: x.equipment.map(e => e.name.replace('none (bodyweight exercise)', 'body only')).join(', ').toLowerCase(),
      i: x.images.sort((a, b) => b.is_main - a.is_main).slice(0, 2).map(i => i.image),
      s: steps,
    });
  }
  url = page.next;
}
writeFileSync(new URL('../wger.json', import.meta.url), JSON.stringify(out));
console.log(`wger.json: ${out.length} exercises, ${out.filter(e => e.i.length).length} with images`);
