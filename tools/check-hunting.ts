// Checks every creature's Realistic Hunting profile without the game:
//   npx tsx tools/check-hunting.ts [-v] [ids...]
// A broadside heart shot must grade perfect, a quartering shot must reach the vitals, a shot
// over the back must miss (see tools/vendor/hunting-kit/check.mjs).
import { assemble } from '../src/creatures/assemble.js';
import { CREATURES } from '../src/data/registry.js';
import { huntingProfile } from '../src/hunting.js';
import { checkProfile } from './vendor/hunting-kit/check.mjs';

export function checkHunting({ only = [] as string[], verbose = false } = {}): string[] {
  const failures: string[] = [];
  for (const def of CREATURES) {
    if (only.length && !only.includes(def.id)) continue;
    const p = huntingProfile(assemble(def));
    const r = checkProfile(p);
    failures.push(...r.failures);
    if (verbose || r.failures.length) console.log(`${p.id} (${p.game.class}, ${p.game.minEnergy} J, ${p.game.weight[1]} kg, ${p.hitModel.organs.length} organs)\n${r.lines.join('\n')}`);
  }
  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const failures = checkHunting({ only: args.filter((x) => !x.startsWith('-')), verbose: args.includes('-v') });
  if (failures.length) {
    console.error(`${failures.length} hunting check(s) failed:\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  console.log('Hunting profiles OK');
}
