import { theropod } from '../../model/rigs.js';
import * as F from '../../creatures/features.js';
import type { CreatureDef } from '../types.js';
import { MEAT, HERB, SND } from '../common.js';

const carn = { diet: 'carnivore' as const, group: 'theropod' as const, habitat: 'land' as const, food: MEAT };

export const theropods: CreatureDef[] = [
  {
    ...carn,
    id: 'tyrannosaurus',
    name: 'Tyrannosaurus rex',
    info: 'The tyrant lizard king had the strongest bite of any land animal ever, strong enough to crush bone.',
    period: 'Cretaceous',
    lengthM: 12.3,
    scale: 1.7,
    temperament: 'aggressive',
    health: 160,
    attack: 18,
    speed: 0.26,
    tame: 'egg',
    ride: { mode: 'ground', seats: 2, jump: 0.6 },
    spawn: { biomes: ['prehistoric', 'plains', 'forest'], weight: 2, herd: [1, 1] },
    sounds: SND.huge,
    palette: {
      back: '#4a4f34', side: '#6c6b45', belly: '#c4b48a', accent: '#8b3a25', eye: '#e8a42a',
      pattern: { type: 'stripes', colour: '#33361f', scale: 7, coverage: 0.42 }, teeth: true, spine: true,
    },
    build() {
      const r = theropod('tyrannosaurus', {
        hipY: 30,
        body: { len: 34, w: 15, h: 18, chest: 3 },
        neck: { len: 8, w: 11, h: 13, angle: 26 },
        head: { len: 12, w: 13, h: 14, snoutLen: 10, snoutW: 10, snoutH: 8, jawH: 5, cheek: 2 },
        tail: { len: 46, segments: 5, lift: 3 },
        arms: { len: 6, w: 2, angle: -45 },
        legs: { thighW: 9, footLen: 9, footW: 6 },
      });
      // heavy brow bosses over the eyes
      F.hornPair(r, { fromTip: 13, len: 2, w: 2, tilt: 70, splay: 0, up: 0 });
      return r;
    },
  },
];

void HERB;
