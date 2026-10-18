import type { Rig } from '../model/rigs.js';
import type { Palette } from '../texture/painter.js';

export type Period = 'Devonian' | 'Permian' | 'Triassic' | 'Jurassic' | 'Cretaceous' | 'Paleogene' | 'Neogene';
export type Diet = 'carnivore' | 'herbivore' | 'piscivore' | 'omnivore' | 'insectivore';
export type Temperament = 'passive' | 'skittish' | 'neutral' | 'aggressive';
export type Habitat = 'land' | 'water' | 'air' | 'amphibious';
export type Group =
  | 'theropod'
  | 'sauropod'
  | 'ceratopsian'
  | 'thyreophoran'
  | 'ornithopod'
  | 'pterosaur'
  | 'marine_reptile'
  | 'crocodilian'
  | 'fish'
  | 'snake'
  | 'synapsid'
  | 'bird';

/** Biome groups used by spawn rules (mapped to biome tags in the emitter). */
export type SpawnBiome = 'prehistoric' | 'jungle' | 'swamp' | 'savanna' | 'plains' | 'forest' | 'taiga' | 'desert' | 'mesa' | 'mountain' | 'beach' | 'river' | 'ocean' | 'warm_ocean' | 'deep_ocean';

export interface RideSpec {
  mode: 'ground' | 'fly' | 'swim';
  seats: number;
  /** movement speed when ridden (blocks/tick-ish value like vanilla 'movement') */
  speed?: number;
  jump?: number;
}

export interface CreatureDef {
  id: string;
  name: string;
  /** one line of field guide trivia */
  info: string;
  period: Period;
  group: Group;
  diet: Diet;
  temperament: Temperament;
  habitat: Habitat;
  /** real length in metres (field guide) */
  lengthM: number;
  /** render scale applied to the model (model px → in-game) */
  scale: number;
  build(): Rig;
  palette: Palette;
  health: number;
  attack?: number;
  speed: number;
  /** collision box override in blocks; computed from the model if omitted */
  hitbox?: { width: number; height: number };
  /** taming: items that tame it, or 'egg' when only hatchlings can be tamed */
  tame?: { items: string[] } | 'egg';
  ride?: RideSpec;
  spawn: { biomes: SpawnBiome[]; weight: number; herd: [number, number] } | null;
  /** vanilla sound events used for this creature + pitch */
  sounds: { ambient: string; hurt: string; death: string; step?: string; pitch: number };
  /** food items used to heal / breed */
  food: string[];
  /** tags used by predators to pick prey */
  prey?: boolean;
  /** extra loot */
  drops?: { item: string; min: number; max: number; chance?: number }[];
}
