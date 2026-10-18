import type { CreatureDef } from './types.js';
import { theropods } from './creatures/theropods.js';
import { theropodsSmall } from './creatures/theropods_small.js';
import { theropodsLarge } from './creatures/theropods_large.js';
import { sauropodsOrnithopods } from './creatures/sauropods_ornithopods.js';
import { ceratopsiansArmoured } from './creatures/ceratopsians_armoured.js';
import { prehistoricOthers } from './creatures/prehistoric_others.js';

export const CREATURES: CreatureDef[] = [...theropods, ...theropodsSmall, ...theropodsLarge, ...sauropodsOrnithopods, ...ceratopsiansArmoured, ...prehistoricOthers];

const ids = new Set<string>();
for (const c of CREATURES) {
  if (ids.has(c.id)) throw new Error(`duplicate creature id ${c.id}`);
  ids.add(c.id);
}
