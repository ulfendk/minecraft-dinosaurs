// Shared food lists and vanilla sound sets.

/** Carnivore food: our meat plus vanilla raw meats. */
export const MEAT = ['dino:raw_dino_meat', 'minecraft:beef', 'minecraft:porkchop', 'minecraft:mutton', 'minecraft:chicken', 'minecraft:rabbit'];
/** Small carnivores / omnivores. */
export const SMALL_MEAT = ['dino:raw_dino_meat', 'minecraft:chicken', 'minecraft:rabbit', 'minecraft:cod', 'minecraft:salmon'];
/** Herbivore food: ancient plants plus vanilla greens. */
export const HERB = ['dino:fern', 'dino:ginkgo_nut', 'dino:cycad_cone', 'dino:horsetail', 'minecraft:wheat', 'minecraft:apple'];
/** Big herbivores also eat leaves. */
export const BROWSE = ['dino:ginkgo_leaves', 'dino:araucaria_leaves', ...HERB];
export const FISH = ['minecraft:cod', 'minecraft:salmon', 'minecraft:tropical_fish', 'dino:raw_dino_meat'];
export const SEEDS = ['minecraft:wheat_seeds', 'minecraft:melon_seeds', 'dino:ginkgo_nut'];

/** Vanilla sound events re-used (pitched) for creatures of a given voice. */
export const SND = {
  huge: { ambient: 'mob.ravager.ambient', hurt: 'mob.ravager.hurt', death: 'mob.ravager.death', step: 'mob.ravager.step', pitch: 0.55 },
  bigCarn: { ambient: 'mob.ravager.ambient', hurt: 'mob.ravager.hurt', death: 'mob.ravager.death', step: 'mob.ravager.step', pitch: 0.75 },
  raptor: { ambient: 'mob.parrot.idle', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', step: 'mob.chicken.step', pitch: 0.6 },
  small: { ambient: 'mob.chicken.say', hurt: 'mob.chicken.hurt', death: 'mob.chicken.hurt', step: 'mob.chicken.step', pitch: 0.8 },
  sauropod: { ambient: 'mob.cow.say', hurt: 'mob.cow.hurt', death: 'mob.cow.hurt', step: 'mob.ravager.step', pitch: 0.35 },
  herd: { ambient: 'mob.cow.say', hurt: 'mob.cow.hurt', death: 'mob.cow.hurt', step: 'mob.cow.step', pitch: 0.55 },
  hadrosaur: { ambient: 'mob.goat.ambient', hurt: 'mob.goat.hurt', death: 'mob.goat.death', step: 'mob.cow.step', pitch: 0.45 },
  armoured: { ambient: 'mob.hoglin.ambient', hurt: 'mob.hoglin.hurt', death: 'mob.hoglin.death', step: 'mob.hoglin.step', pitch: 0.55 },
  ptero: { ambient: 'mob.parrot.idle', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: 0.5 },
  sea: { ambient: 'mob.dolphin.idle', hurt: 'mob.dolphin.hurt', death: 'mob.dolphin.death', pitch: 0.45 },
  fish: { ambient: 'mob.guardian.ambient', hurt: 'mob.guardian.hit', death: 'mob.guardian.death', pitch: 0.5 },
  croc: { ambient: 'mob.hoglin.ambient', hurt: 'mob.hoglin.hurt', death: 'mob.hoglin.death', step: 'mob.hoglin.step', pitch: 0.4 },
  snake: { ambient: 'mob.cat.hiss', hurt: 'mob.hoglin.hurt', death: 'mob.hoglin.death', pitch: 0.4 },
};
