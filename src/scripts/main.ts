// Behavior pack scripts (bundled to scripts/main.js).
// - sapling growth + bone meal, leaf decay
// - electric fences powered by fence generators (redstone or a right-click toggle)
// - egg hatching into a tame baby for whoever placed the egg
// - Dino Field Guide UI and a welcome gift
import { Block, Dimension, EntityDamageCause, GameMode, ItemStack, Player, system, world, type Entity, type Vector3 } from '@minecraft/server';
import { ActionFormData, MessageFormData } from '@minecraft/server-ui';
import type { GuideData } from './data.js';

declare const __DINO_DATA__: GuideData;
const DATA = __DINO_DATA__;

const NS = 'dino';
const FENCE = `${NS}:electric_fence`;
const GENERATOR = `${NS}:fence_generator`;
const DIRS: Vector3[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
];

const add = (a: Vector3, b: Vector3): Vector3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const key = (v: Vector3) => `${v.x},${v.y},${v.z}`;

function safeBlock(dim: Dimension, at: Vector3): Block | undefined {
  try {
    return dim.getBlock(at);
  } catch {
    return undefined; // unloaded chunk
  }
}

function heldItem(player: Player) {
  const inv = player.getComponent('minecraft:inventory');
  return inv?.container?.getItem(player.selectedSlotIndex);
}

function consumeHeld(player: Player) {
  if (player.getGameMode() === GameMode.Creative) return;
  const inv = player.getComponent('minecraft:inventory')?.container;
  const item = inv?.getItem(player.selectedSlotIndex);
  if (!inv || !item) return;
  if (item.amount > 1) {
    item.amount -= 1;
    inv.setItem(player.selectedSlotIndex, item);
  } else inv.setItem(player.selectedSlotIndex, undefined);
}

// ---------------------------------------------------------------- trees

function growTree(block: Block, tree: string): boolean {
  const variants = DATA.structures[tree];
  if (!variants?.length) return false;
  const v = variants[Math.floor(Math.random() * variants.length)];
  const dim = block.dimension;
  // need a clear trunk column
  for (let y = 1; y < Math.min(v.size[1], 8); y++) {
    const b = safeBlock(dim, { x: block.x, y: block.y + y, z: block.z });
    if (!b || !(b.isAir || b.typeId.endsWith('_leaves'))) return false;
  }
  block.setType('minecraft:air');
  world.structureManager.place(v.name, dim, { x: block.x - v.base[0], y: block.y, z: block.z - v.base[2] });
  return true;
}

function nearLog(block: Block, r: number) {
  for (let dx = -r; dx <= r; dx++)
    for (let dy = -r; dy <= r; dy++)
      for (let dz = -r; dz <= r; dz++) {
        const b = safeBlock(block.dimension, { x: block.x + dx, y: block.y + dy, z: block.z + dz });
        if (!b) return true; // unloaded: assume supported
        if (b.typeId.endsWith('_log')) return true;
      }
  return false;
}

// ---------------------------------------------------------------- electric fence network

function isGeneratorOn(b: Block | undefined) {
  return !!b && b.typeId === GENERATOR && b.permutation.getState('dino:on' as never) === 'on';
}

/** Re-evaluates the fence network touching `start` and sets every fence's powered state. */
function updateNetwork(dim: Dimension, start: Vector3) {
  const seen = new Set<string>();
  const fences: Block[] = [];
  const queue: Vector3[] = [start];
  let powered = false;
  while (queue.length && fences.length < 4096) {
    const at = queue.shift()!;
    const k = key(at);
    if (seen.has(k)) continue;
    seen.add(k);
    const b = safeBlock(dim, at);
    if (!b || b.typeId !== FENCE) continue;
    fences.push(b);
    for (const d of DIRS) {
      const n = add(at, d);
      const nb = safeBlock(dim, n);
      if (isGeneratorOn(nb)) powered = true;
      if (nb?.typeId === FENCE && !seen.has(key(n))) queue.push(n);
    }
  }
  for (const f of fences) {
    const want = powered ? 'on' : 'off';
    if (f.permutation.getState('dino:powered' as never) !== want) f.setPermutation(f.permutation.withState('dino:powered' as never, want as never));
  }
}

function updateAround(dim: Dimension, at: Vector3) {
  for (const d of DIRS) {
    const n = add(at, d);
    if (safeBlock(dim, n)?.typeId === FENCE) updateNetwork(dim, n);
  }
}

function setGenerator(block: Block, on: boolean) {
  const want = on ? 'on' : 'off';
  if (block.permutation.getState('dino:on' as never) === want) return;
  block.setPermutation(block.permutation.withState('dino:on' as never, want as never));
  block.dimension.playSound(on ? 'beacon.activate' : 'beacon.deactivate', block.location, { volume: 0.6 });
  updateAround(block.dimension, block.location);
}

system.run(() => console.log(`[dino] scripts loaded v${DATA.version} (${DATA.creatures.length} creatures)`));

// ---------------------------------------------------------------- custom block components

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent(`${NS}:sapling`, {
    onRandomTick({ block }, { params }) {
      if (Math.random() < 0.15) growTree(block, (params as { tree: string }).tree);
    },
    onPlayerInteract({ block, player, dimension }, { params }) {
      if (!player || heldItem(player)?.typeId !== 'minecraft:bone_meal') return;
      consumeHeld(player);
      dimension.spawnParticle('minecraft:crop_growth_emitter', { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 });
      if (Math.random() < 0.45) growTree(block, (params as { tree: string }).tree);
    },
  });
  blockComponentRegistry.registerCustomComponent(`${NS}:leaves`, {
    onRandomTick({ block }) {
      if (block.permutation.getState('dino:natural' as never) !== 'yes') return;
      if (!nearLog(block, 4)) block.dimension.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`);
    },
  });
  blockComponentRegistry.registerCustomComponent(`${NS}:electric_fence`, {
    onPlace({ block }) {
      system.run(() => updateNetwork(block.dimension, block.location));
    },
    onPlayerBreak({ block, dimension }) {
      const at = block.location;
      system.run(() => updateAround(dimension, at));
    },
  });
  blockComponentRegistry.registerCustomComponent(`${NS}:fence_generator`, {
    onPlayerInteract({ block, player }) {
      const on = block.permutation.getState('dino:on' as never) !== 'on';
      setGenerator(block, on);
      player?.onScreenDisplay.setActionBar(on ? '§eFence power: §aON' : '§eFence power: §cOFF');
    },
    onRedstoneUpdate({ block, powerLevel, previousPowerLevel }) {
      if ((powerLevel > 0) !== (previousPowerLevel > 0)) setGenerator(block, powerLevel > 0);
    },
    onPlayerBreak({ block, dimension }) {
      const at = block.location;
      system.run(() => updateAround(dimension, at));
    },
  });
});

// ---------------------------------------------------------------- fence contact: zap or break

const BIG = 'dino_large';
system.runInterval(() => {
  const seen = new Set<string>();
  for (const player of world.getPlayers()) {
    let nearby: Entity[] = [];
    try {
      nearby = player.dimension.getEntities({ location: player.location, maxDistance: 48, excludeFamilies: ['inanimate'], excludeTypes: ['minecraft:item', 'minecraft:xp_orb'] });
    } catch {
      continue;
    }
    for (const e of nearby) {
      if (seen.has(e.id) || !e.isValid) continue;
      seen.add(e.id);
      const big = e.matches({ families: [BIG] });
      const r = big ? 1.6 : 0.55;
      const loc = e.location;
      for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
        const at = { x: Math.floor(loc.x + dx), y: Math.floor(loc.y + 0.3), z: Math.floor(loc.z + dz) };
        const b = safeBlock(e.dimension, at);
        if (b?.typeId !== FENCE) continue;
        if (b.permutation.getState('dino:powered' as never) === 'on') {
          zap(e, dx, dz);
        } else if (big && e.matches({ families: ['carnivore'] }) && Math.random() < 0.08) {
          e.dimension.runCommand(`setblock ${at.x} ${at.y} ${at.z} air destroy`);
          e.dimension.playSound('random.break', at, { volume: 1.2, pitch: 0.6 });
        }
        break;
      }
    }
  }
}, 8);

function zap(e: Entity, dx: number, dz: number) {
  try {
    e.applyDamage(e.matches({ families: [BIG] }) ? 6 : 3, { cause: EntityDamageCause.lightning });
    const len = Math.hypot(dx, dz) || 1;
    e.applyKnockback({ x: (-dx / len) * 1.1, z: (-dz / len) * 1.1 }, 0.3);
    const p = e.location;
    e.dimension.spawnParticle('minecraft:electric_spark_particle', { x: p.x + dx * 0.6, y: p.y + 1, z: p.z + dz * 0.6 });
    e.dimension.playSound('random.fizz', p, { volume: 0.8, pitch: 1.6 });
  } catch {
    /* entity may have died */
  }
}

// ---------------------------------------------------------------- eggs

world.afterEvents.entitySpawn.subscribe(({ entity }) => {
  if (!entity.isValid || !entity.typeId.startsWith(`${NS}:egg_`)) return;
  let best: Player | undefined;
  let bestD = 64;
  for (const p of entity.dimension.getPlayers({ location: entity.location, maxDistance: 8 })) {
    const d = (p.location.x - entity.location.x) ** 2 + (p.location.z - entity.location.z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  if (best) entity.setDynamicProperty('dino:owner', best.id);
});

world.afterEvents.dataDrivenEntityTrigger.subscribe(({ entity, eventId }) => {
  if (eventId !== 'dino:hatch' || !entity.isValid || !entity.typeId.startsWith(`${NS}:egg_`)) return;
  const species = entity.typeId.slice(`${NS}:egg_`.length);
  const ownerId = entity.getDynamicProperty('dino:owner');
  const dim = entity.dimension;
  const at = entity.location;
  entity.remove();
  const owner = world.getPlayers().find((p) => p.id === ownerId);
  const baby = dim.spawnEntity(`${NS}:${species}`, at, { spawnEvent: 'dino:hatch_egg' });
  dim.spawnParticle('minecraft:egg_destroy_emitter', at);
  dim.playSound('block.turtle_egg.crack', at);
  if (owner)
    system.run(() => {
      if (!baby.isValid) return;
      baby.getComponent('minecraft:tameable')?.tame(owner);
      const name = DATA.creatures.find((c) => c.id === species)?.name ?? species;
      owner.sendMessage(`§aYour ${name} egg hatched!`);
    });
});

// ---------------------------------------------------------------- field guide

const PERIOD_ORDER = ['Devonian', 'Permian', 'Triassic', 'Jurassic', 'Cretaceous', 'Paleogene', 'Neogene'];
const GROUP_NAMES: Record<string, string> = {
  theropod: 'Theropods (meat-eaters)',
  sauropod: 'Sauropods (long-necks)',
  ornithopod: 'Ornithopods & duck-bills',
  ceratopsian: 'Horned dinosaurs',
  thyreophoran: 'Armoured & plated',
  pterosaur: 'Pterosaurs (flyers)',
  marine_reptile: 'Marine reptiles',
  fish: 'Prehistoric fish',
  crocodilian: 'Crocodilians',
  snake: 'Snakes',
  synapsid: 'Synapsids',
  bird: 'Early birds',
};

function creaturePage(player: Player, id: string, back: () => void) {
  const c = DATA.creatures.find((x) => x.id === id);
  if (!c) return;
  const tame = c.tame === 'egg' ? 'Only hatchlings: find an egg and place it.' : c.tame === 'feed' ? 'Feed it its favourite food.' : 'Cannot be tamed.';
  const ride = c.ride ? `Rideable (${c.ride === 'ground' ? 'on land' : c.ride === 'fly' ? 'flying' : 'swimming'}${c.seats > 1 ? `, ${c.seats} seats` : ''}) once tamed and saddled.` : 'Not rideable.';
  const body = [`§l${c.name}§r`, `§7${c.period} · ${c.lengthM} m · ${c.diet}§r`, '', c.info, '', `§6Temperament:§r ${c.temperament}`, `§6Taming:§r ${tame}`, `§6Riding:§r ${ride}`].join('\n');
  new MessageFormData()
    .title(c.name)
    .body(body)
    .button1('Back')
    .button2('Close')
    .show(player)
    .then((r) => {
      if (r.selection === 0) back();
    });
}

function groupPage(player: Player, group: string) {
  const list = DATA.creatures.filter((c) => c.group === group).sort((a, b) => PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period) || a.name.localeCompare(b.name));
  const form = new ActionFormData().title(GROUP_NAMES[group] ?? group).body(`${list.length} species`);
  for (const c of list) form.button(`${c.name}\n§8${c.period}`);
  form.show(player).then((r) => {
    if (r.canceled || r.selection === undefined) return showGuide(player);
    creaturePage(player, list[r.selection].id, () => groupPage(player, group));
  });
}

function textPage(player: Player, title: string, body: string) {
  new MessageFormData().title(title).body(body).button1('Back').button2('Close').show(player).then((r) => {
    if (r.selection === 0) showGuide(player);
  });
}

function showGuide(player: Player) {
  const groups = [...new Set(DATA.creatures.map((c) => c.group))];
  const form = new ActionFormData().title(`Dino Field Guide v${DATA.version}`).body(`§7${DATA.creatures.length} prehistoric creatures, ancient plants and park gear.`);
  for (const g of groups) form.button(GROUP_NAMES[g] ?? g);
  form.button('Ancient plants & trees');
  form.button('Taming, riding & eggs');
  form.button('Park gear: fences & vehicles');
  form.show(player).then((r) => {
    if (r.canceled || r.selection === undefined) return;
    if (r.selection < groups.length) return groupPage(player, groups[r.selection]);
    const extra = r.selection - groups.length;
    if (extra === 0)
      return textPage(player, 'Ancient plants', [...DATA.plants, ...DATA.trees].map((p) => `§a${p.name}§r\n${p.info}`).join('\n\n') + '\n\nSaplings grow on their own or with bone meal.');
    if (extra === 1)
      return textPage(
        player,
        'Taming, riding & eggs',
        [
          '§6Taming:§r hold a creature\'s favourite food (meat for carnivores, ferns, ginkgo nuts or cycad cones for herbivores, fish for sea and flying reptiles) and feed it until hearts appear.',
          '§6Apex predators§r such as T. rex can only be tamed as hatchlings. Adults lay eggs now and then: pick one up and place it, and the baby hatches tame for you after a few minutes.',
          '§6Riding:§r saddle a tamed adult of a rideable species (craft saddles from dino hide). Use WASD on land, look and move to fly or swim. Sneak to dismount; use shears to take the saddle off.',
          '§6Sitting:§r interact with a tamed creature to make it sit or follow.',
        ].join('\n\n'),
      );
    return textPage(
      player,
      'Park gear',
      [
        '§eElectric fence:§r one and a half blocks tall, so creatures cannot step over it, and it links up with its neighbours. Place a §eFence Generator§r touching the fence and switch it on (right-click, or power it with redstone). Powered fences shock anything that touches them.',
        'Big carnivores will smash through fences that have no power!',
        '§eVehicles:§r the Safari Truck and the Tour Car seat four, and the Gyrosphere seats two. Place them, climb in and drive with WASD. Hit one to pick it back up.',
      ].join('\n\n'),
    );
  });
}

world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
  if (itemStack.typeId === `${NS}:field_guide` && source instanceof Player) showGuide(source);
});

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn || player.hasTag('dino_welcomed')) return;
  player.addTag('dino_welcomed');
  system.runTimeout(() => {
    player.getComponent('minecraft:inventory')?.container?.addItem(new ItemStack(`${NS}:field_guide`, 1));
    player.sendMessage('§6[Prehistoric Dinosaurs]§r You received a §aDino Field Guide§r. Use it to learn about every creature!');
  }, 60);
});
