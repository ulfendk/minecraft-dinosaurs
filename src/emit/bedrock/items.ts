// Custom items (food, materials, field guide, eggs, vehicle placers).
import type { PNG } from 'pngjs';
import type { Assembled } from '../../creatures/assemble.js';
import { ICONS, eggColours, eggIcon } from '../../data/icons.js';
import { VEHICLES } from '../../data/park.js';
import { FORMAT, NS } from './constants.js';

export interface ItemOut {
  id: string;
  name: string;
  json: unknown;
  icon: PNG;
}

type Comp = Record<string, unknown>;

const item = (id: string, category: string, components: Comp, group?: string) => ({
  format_version: FORMAT.item,
  'minecraft:item': {
    description: { identifier: `${NS}:${id}`, menu_category: { category, ...(group ? { group } : {}) } },
    components: { 'minecraft:icon': { textures: { default: `${NS}_${id}` } }, 'minecraft:display_name': { value: `item.${NS}:${id}.name` }, ...components },
  },
});

const food = (nutrition: number, saturation: number, seconds = 1.6) => ({
  'minecraft:food': { nutrition, saturation_modifier: saturation },
  'minecraft:use_modifiers': { use_duration: seconds, movement_modifier: 0.35 },
  'minecraft:use_animation': 'eat',
});

const SIMPLE: { id: string; name: string; category: string; comp?: Comp; group?: string }[] = [
  { id: 'raw_dino_meat', name: 'Raw Dino Meat', category: 'nature', comp: food(4, 0.3), group: 'minecraft:itemGroup.name.miscFood' },
  { id: 'cooked_dino_meat', name: 'Dino Steak', category: 'nature', comp: food(9, 0.8), group: 'minecraft:itemGroup.name.miscFood' },
  { id: 'ginkgo_nut', name: 'Ginkgo Nut', category: 'nature', comp: food(2, 0.3, 1.0), group: 'minecraft:itemGroup.name.miscFood' },
  { id: 'cycad_cone', name: 'Cycad Cone', category: 'nature', comp: food(3, 0.4), group: 'minecraft:itemGroup.name.miscFood' },
  { id: 'dino_hide', name: 'Dino Hide', category: 'items' },
  { id: 'prehistoric_feather', name: 'Prehistoric Feather', category: 'items' },
  { id: 'armor_scute', name: 'Armour Scute', category: 'items' },
  { id: 'megalodon_tooth', name: 'Megalodon Tooth', category: 'items', comp: { 'minecraft:rarity': 'rare' } },
  { id: 'fossil_fragment', name: 'Fossil Fragment', category: 'items' },
  { id: 'amber', name: 'Amber', category: 'items' },
  { id: 'amber_mosquito', name: 'Mosquito in Amber', category: 'items', comp: { 'minecraft:rarity': 'epic', 'minecraft:glint': true } },
  { id: 'field_guide', name: 'Dino Field Guide', category: 'equipment', comp: { 'minecraft:max_stack_size': 1, 'minecraft:interact_button': 'action.interact.read' } },
];

export function buildItems(assembled: Assembled[]): ItemOut[] {
  const out: ItemOut[] = [];
  for (const s of SIMPLE) out.push({ id: s.id, name: s.name, json: item(s.id, s.category, s.comp ?? {}, s.group), icon: ICONS[s.id]() });

  // eggs: placing one spawns an egg entity that hatches into a tame baby
  assembled.forEach((x, i) => {
    if (!hasEgg(x)) return;
    const id = `${x.def.id}_egg`;
    const [base, spots] = eggColours(x.def.palette.side, x.def.palette.pattern?.colour ?? x.def.palette.back);
    out.push({
      id,
      name: `${x.def.name} Egg`,
      icon: eggIcon(base, spots, 200 + i),
      json: item(id, 'nature', { 'minecraft:max_stack_size': 16, 'minecraft:entity_placer': { entity: `${NS}:egg_${x.def.id}` } }, 'minecraft:itemGroup.name.mobEgg'),
    });
  });

  for (const v of VEHICLES)
    out.push({ id: v.id, name: v.name, icon: ICONS[v.id](), json: item(v.id, 'items', { 'minecraft:max_stack_size': 1, 'minecraft:entity_placer': { entity: `${NS}:${v.id}` } }) });
  return out;
}

export const hasEgg = (x: Assembled) => x.def.habitat !== 'water';
