// Ancient plants and prehistoric trees.
import type { PNG } from 'pngjs';
import { hex, darken, lighten, mix, shade } from '../texture/color.js';
import { fill, jitter, leaves, logSide, logTop, planks, sprite, type WoodPal } from '../texture/pixelart.js';
import { fbm, hash3 } from '../texture/noise.js';

export interface PlantDef {
  id: string;
  name: string;
  info: string;
  texture: () => PNG;
  mapColor: string;
  /** selection box height in px */
  height: number;
  /** blocks it may be placed on */
  soil?: string[];
  /** also an edible/compostable item for herbivores */
  food?: boolean;
}

export interface TreeDef {
  id: string;
  name: string;
  info: string;
  wood: WoodPal;
  leafColour: string;
  leafStyle: 'broad' | 'needle' | 'fan' | 'frond';
  sapling: () => PNG;
  mapColor: string;
}

export const SOIL = ['minecraft:grass_block', 'minecraft:dirt', 'minecraft:coarse_dirt', 'minecraft:podzol', 'minecraft:dirt_with_roots', 'minecraft:moss_block', 'minecraft:mud', 'minecraft:muddy_mangrove_roots', 'minecraft:farmland'];

const G = { d: '#1f4a1c', g: '#2f6b28', G: '#4f9a3a', l: '#7cc35a', y: '#b8d86a' };

export const PLANTS: PlantDef[] = [
  {
    id: 'fern',
    name: 'Prehistoric Fern',
    info: 'Ferns carpeted Mesozoic forest floors long before grasses evolved.',
    mapColor: '#3f7f2e',
    height: 12,
    food: true,
    texture: () =>
      jitter(
        sprite(
          [
            '................',
            '..l..........l..',
            '..gl........lg..',
            '...gl..l...lg...',
            '.l..gl.gl.lg..l.',
            '.gl..glgGlg..lg.',
            '..gGl.gGGg..Gg..',
            '...gGlgGGlgGg...',
            '.l..gGgGGgGg..l.',
            '.gGl.gGGGGg.lGg.',
            '..ggGlgGGglGgg..',
            '....gGGGGGGg....',
            '.....dgGGgd.....',
            '......dggd......',
            '.......dd.......',
            '.......dd.......',
          ],
          G,
        ),
        0.08,
        21,
      ),
  },
  {
    id: 'horsetail',
    name: 'Horsetail',
    info: 'Equisetum is a living fossil whose relatives grew as tall as trees in the Carboniferous.',
    mapColor: '#5c8f3a',
    height: 15,
    food: true,
    texture: () =>
      jitter(
        sprite(
          [
            '....y......y....',
            '....G..y...G....',
            '...lGl.G..lGl...',
            '....d..G...d....',
            '..l.G.lGl..G.l..',
            '...lGl.d..lGl...',
            '....d..G...d....',
            '..l.G.lGl..G.l..',
            '...lGl.d..lGl...',
            '....d..G...d....',
            '..l.G.lGl..G.l..',
            '...lGl.d..lGl...',
            '....d..G...d....',
            '....G.lGl..G....',
            '....G..d...G....',
            '....G..G...G....',
          ],
          G,
        ),
        0.06,
        22,
      ),
  },
  {
    id: 'cycad',
    name: 'Cycad',
    info: 'Cycads were so common in the Jurassic that it is sometimes called the Age of Cycads.',
    mapColor: '#4d7a2c',
    height: 14,
    food: true,
    texture: () =>
      jitter(
        sprite(
          [
            '................',
            '.l............l.',
            '.lgl........lgl.',
            '..lgGl.ll.lGgl..',
            '...lgGGllGGgl...',
            '.ll..lgGGgl..ll.',
            '.lgGl.lgGl.lGgl.',
            '...lgGGggGGgl...',
            '.....lgccgl.....',
            '......bBBb......',
            '......bBkb......',
            '......bkBb......',
            '......bBBb......',
            '......bBkb......',
            '......bkBb......',
            '.....bbBBbb.....',
          ],
          { ...G, c: '#d0702a', b: '#4a3a22', B: '#7a6438', k: '#5e4b2a' },
        ),
        0.06,
        23,
      ),
  },
  {
    id: 'club_moss',
    name: 'Club Moss',
    info: 'Lycopsids like club moss are among the oldest vascular plants on Earth.',
    mapColor: '#6a9a3a',
    height: 7,
    food: false,
    texture: () =>
      jitter(
        sprite(
          [
            '................',
            '................',
            '................',
            '................',
            '................',
            '................',
            '................',
            '................',
            '..y......y......',
            '..G...y..G...y..',
            '.lGl..G.lGl..G..',
            '..G..lGl.G..lGl.',
            '.lGl..G.lGl..G..',
            '..Gd.lGl.Gd.lGl.',
            '.dGd.dGd.Gd.dGd.',
            '.dgddgGddgdddgd.',
          ],
          G,
        ),
        0.06,
        24,
      ),
  },
  {
    id: 'williamsonia',
    name: 'Williamsonia',
    info: 'A cycad-like bennettitale whose star-shaped cones looked like flowers.',
    mapColor: '#c08a3a',
    height: 13,
    food: true,
    texture: () =>
      jitter(
        sprite(
          [
            '................',
            '.......o........',
            '...o..oYo..o....',
            '....o.oYo.o.....',
            '..ooooYrYoooo...',
            '....o.oYo.o.....',
            '...o..oYo..o....',
            '.......o........',
            '.......G........',
            '..l....G....l...',
            '..gl...G...lg...',
            '...gGl.G.lGg....',
            '....ggGGGgg.....',
            '.......G........',
            '.......G........',
            '......dGd.......',
          ],
          { ...G, o: '#c0661f', Y: '#f2c14a', r: '#7a2e14' },
        ),
        0.05,
        25,
      ),
  },
  {
    id: 'magnolia',
    name: 'Ancient Magnolia',
    info: 'Magnolias appeared in the Cretaceous and were pollinated by beetles before bees existed.',
    mapColor: '#e8c8d8',
    height: 13,
    food: false,
    texture: () =>
      jitter(
        sprite(
          [
            '................',
            '................',
            '.....wpw........',
            '....wWpWw.......',
            '...wWWyWWw......',
            '....wWWWw..wpw..',
            '.....wWw..wWyWw.',
            '...l..G....wWw..',
            '..lGl.G.....G...',
            '...g..G..l..G...',
            '.l..g.G.lGl.G...',
            '.gl..gG..g.gG...',
            '..gGlgGg..gG....',
            '....ggGGggG.....',
            '......dGGd......',
            '.......dd.......',
          ],
          { ...G, w: '#d9a7bd', W: '#fbeaf2', p: '#c4688f', y: '#f2d24a' },
        ),
        0.04,
        26,
      ),
  },
];

const sap = (rows: string[], extra: Record<string, string>, seed: number) => () => jitter(sprite(rows, { ...G, ...extra }), 0.06, seed);

export const TREES: TreeDef[] = [
  {
    id: 'ginkgo',
    name: 'Ginkgo',
    info: 'Ginkgo biloba is a living fossil, unchanged for over 200 million years.',
    wood: { bark: '#7a6a58', barkDark: '#4f4438', wood: '#d8c69a', woodDark: '#b39d6c', style: 'furrowed' },
    leafColour: '#6aa33a',
    leafStyle: 'fan',
    mapColor: '#6aa33a',
    sapling: sap(['................', '................', '....l.....l.....', '...lGl...lGl....', '....lGl.lGl.....', '..l..lGGGl..l...', '.lGl..lGl..lGl..', '..lGGl.G.lGGl...', '....lGlGlGl.....', '......lGl.......', '.......b........', '.......b........', '.......b........', '.......b........', '......bbb.......', '................'], { b: '#6a5a46' }, 31),
  },
  {
    id: 'araucaria',
    name: 'Araucaria',
    info: 'Monkey-puzzle trees were towering food for long-necked sauropods.',
    wood: { bark: '#6b5a4a', barkDark: '#3f3328', wood: '#cdb183', woodDark: '#a8895a', style: 'scales' },
    leafColour: '#2f5a2a',
    leafStyle: 'needle',
    mapColor: '#2f5a2a',
    sapling: sap(['................', '.......g........', '......gGg.......', '.....g.G.g......', '....gg.G.gg.....', '......gGg.......', '....g..G..g.....', '...gg.gGg.gg....', '......gGg.......', '...g...b...g....', '..gg...b...gg...', '.......b........', '.......b........', '.......b........', '......bbb.......', '................'], { b: '#5a4a3a' }, 32),
  },
  {
    id: 'dawn_redwood',
    name: 'Dawn Redwood',
    info: 'Metasequoia was known only from fossils until living trees were found in China in 1944.',
    wood: { bark: '#8a4a32', barkDark: '#5a2e1e', wood: '#d79a72', woodDark: '#b0704a', style: 'stringy' },
    leafColour: '#7fb04a',
    leafStyle: 'needle',
    mapColor: '#7fb04a',
    sapling: sap(['................', '.......l........', '......lGl.......', '.....l.G.l......', '....ll.G.ll.....', '......lGl.......', '...l...G...l....', '..ll.lGGGl.ll...', '.....l.G.l......', '.......b........', '.......b........', '.......b........', '.......b........', '.......b........', '......bbb.......', '................'], { b: '#7a3a26' }, 33),
  },
  {
    id: 'lepidodendron',
    name: 'Lepidodendron',
    info: 'Scale trees up to 40 m tall formed the coal swamps of the Carboniferous.',
    wood: { bark: '#5f6a4a', barkDark: '#3a4230', wood: '#b9b48a', woodDark: '#8d8860', style: 'scales' },
    leafColour: '#5c8a34',
    leafStyle: 'needle',
    mapColor: '#5c8a34',
    sapling: sap(['................', '................', '...y.y...y.y....', '....yGy.yGy.....', '.....yGGGy......', '......yGy.......', '.......b........', '.......B........', '.......b........', '.......B........', '.......b........', '.......B........', '.......b........', '.......B........', '......bBb.......', '................'], { b: '#3f4a30', B: '#6f7a54' }, 34),
  },
  {
    id: 'tree_fern',
    name: 'Tree Fern',
    info: 'Tree ferns with trunks of matted roots shaded the understory of Jurassic forests.',
    wood: { bark: '#4a3828', barkDark: '#2a2018', wood: '#8a6a48', woodDark: '#6a4e34', style: 'fibrous' },
    leafColour: '#4f9a3a',
    leafStyle: 'frond',
    mapColor: '#4f9a3a',
    sapling: sap(['................', '................', '.l...........l..', '.gl..l...l..lg..', '..gl.gl.lg.lg...', '...gGlgGglGg....', '.l..ggGGGgg..l..', '.glGlggGggglGlg.', '...gggGGGggg....', '......bBb.......', '.......b........', '......bBb.......', '.......b........', '......bBb.......', '.....bbbbb......', '................'], { b: '#3a2a1c', B: '#5a4430' }, 35),
  },
];

// ---------------------------------------------------------------- textures for trees and minerals

export const treeTextures = (t: TreeDef, seed: number) => ({
  log_side: logSide(t.wood, seed),
  log_top: logTop(t.wood, seed + 1),
  planks: planks(t.wood, seed + 2),
  leaves: leaves(t.leafColour, seed + 3, t.leafStyle),
});

const STONE = hex('#7d7d7d');
function stone(x: number, y: number, seed: number) {
  const n = fbm(x / 3, y / 3, 0, seed, 2);
  return shade(STONE, 0.85 + n * 0.3 + (hash3(x, y, seed) - 0.5) * 0.08);
}

export function fossilTexture(): PNG {
  const bone = sprite(
    [
      '................',
      '................',
      '..bb............',
      '..bBb...........',
      '...bBb..........',
      '....bBb.....bb..',
      '.....bBbbbbbBb..',
      '......bBBBBBb...',
      '.....bBbbbbb....',
      '....bBb.........',
      '...bBb.....bb...',
      '...bb.....bBBb..',
      '..........bBBb..',
      '...........bb...',
      '................',
      '................',
    ],
    { b: '#b8ad94', B: '#ece2c8' },
  );
  const out = fill(16, 16, (x, y) => stone(x, y, 41));
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const k = (y * 16 + x) * 4;
      if (bone.data[k + 3]) {
        out.data[k] = bone.data[k];
        out.data[k + 1] = bone.data[k + 1];
        out.data[k + 2] = bone.data[k + 2];
      }
    }
  return jitter(out, 0.05, 42);
}

export function amberOreTexture(deep = false): PNG {
  const amber = [hex('#a85a07'), hex('#f0a020'), hex('#ffd36a')];
  const base = deep ? hex('#4d4d52') : STONE;
  return fill(16, 16, (x, y) => {
    const n = fbm(x / 2.5, y / 2.5, 7, 43, 2);
    if (n > 0.66) return amber[n > 0.74 ? 2 : 1];
    if (n > 0.62) return amber[0];
    return shade(base, 0.85 + fbm(x / 3, y / 3, 0, 44) * 0.3);
  });
}

export function leafTint(c: string, t: number) {
  return lighten(hex(c), t);
}
export { darken, mix };
