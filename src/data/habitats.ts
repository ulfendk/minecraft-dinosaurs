// Habitats: every creature belongs to one habitat (used to group it on the website and in
// the field guide) and "lives in" one or more biomes (where it spawns), like the
// minecraft-safari-animals mod.
import type { CreatureDef, SpawnBiome } from './types.js';

export type HabitatId = 'forests' | 'jungles' | 'plains' | 'savannas' | 'deserts' | 'swamps' | 'oceans' | 'skies';

/** Display order with English and Danish names. */
export const HABITATS: { id: HabitatId; en: string; da: string }[] = [
  { id: 'forests', en: 'Forests & taiga', da: 'Skove og taiga' },
  { id: 'jungles', en: 'Jungles', da: 'Jungler' },
  { id: 'plains', en: 'Plains', da: 'Sletter' },
  { id: 'savannas', en: 'Savannas', da: 'Savanner' },
  { id: 'deserts', en: 'Deserts & badlands', da: 'Ørkener og badlands' },
  { id: 'swamps', en: 'Swamps & rivers', da: 'Sumpe og floder' },
  { id: 'oceans', en: 'Oceans', da: 'Have' },
  { id: 'skies', en: 'Skies & cliffs', da: 'Himmel og klipper' },
];

/** Names of the biomes a creature can live in. */
export const BIOME_LABELS: Record<SpawnBiome, { en: string; da: string }> = {
  prehistoric: { en: 'Prehistoric Jungle', da: 'Forhistorisk jungle' },
  jungle: { en: 'Jungle', da: 'Jungle' },
  swamp: { en: 'Swamp', da: 'Sump' },
  savanna: { en: 'Savanna', da: 'Savanne' },
  plains: { en: 'Plains', da: 'Slette' },
  forest: { en: 'Forest', da: 'Skov' },
  taiga: { en: 'Taiga', da: 'Taiga' },
  desert: { en: 'Desert', da: 'Ørken' },
  mesa: { en: 'Badlands', da: 'Badlands' },
  mountain: { en: 'Mountains', da: 'Bjerge' },
  beach: { en: 'Beaches', da: 'Strande' },
  river: { en: 'Rivers', da: 'Floder' },
  ocean: { en: 'Ocean', da: 'Hav' },
  warm_ocean: { en: 'Warm ocean', da: 'Varmt hav' },
  deep_ocean: { en: 'Deep ocean', da: 'Dybhav' },
};

const BY_BIOME: Partial<Record<SpawnBiome, HabitatId>> = {
  forest: 'forests',
  taiga: 'forests',
  jungle: 'jungles',
  plains: 'plains',
  savanna: 'savannas',
  desert: 'deserts',
  mesa: 'deserts',
  swamp: 'swamps',
  river: 'swamps',
  ocean: 'oceans',
  warm_ocean: 'oceans',
  deep_ocean: 'oceans',
  mountain: 'skies',
  beach: 'skies',
};

/** The one habitat a creature is listed under. */
export function habitatOf(c: CreatureDef): HabitatId {
  if (c.habitat === 'water') return 'oceans';
  if (c.habitat === 'air') return 'skies';
  if (c.habitat === 'amphibious') return 'swamps';
  const first = c.spawn?.biomes.find((b) => b !== 'prehistoric');
  return (first && BY_BIOME[first]) || 'jungles';
}

/** Biomes the creature spawns in (the Prehistoric Jungle last; it is Bedrock-only). */
export function livesIn(c: CreatureDef): SpawnBiome[] {
  const biomes = [...new Set(c.spawn?.biomes ?? [])];
  return [...biomes.filter((b) => b !== 'prehistoric'), ...biomes.filter((b) => b === 'prehistoric')];
}

export const habitatName = (id: HabitatId, lang: 'en' | 'da') => HABITATS.find((h) => h.id === id)![lang];
