// Behavior pack scripts (bundled to scripts/main.js).
// - sapling growth + bone meal, leaf decay
// - electric fences powered by fence generators (redstone or a right-click toggle)
// - egg hatching into a tame baby for whoever placed the egg
// - Dino Field Guide UI and a welcome gift
import { Block, Dimension, EntityDamageCause, GameMode, ItemStack, Player, system, world, type Entity, type RawMessage, type Vector3 } from '@minecraft/server';
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

// wires: each fence links to neighbouring fences and generators on the four sides
const LINKS: [string, Vector3][] = [
  ['dino:link_n', { x: 0, y: 0, z: -1 }],
  ['dino:link_e', { x: 1, y: 0, z: 0 }],
  ['dino:link_s', { x: 0, y: 0, z: 1 }],
  ['dino:link_w', { x: -1, y: 0, z: 0 }],
];

function relink(dim: Dimension, at: Vector3) {
  const b = safeBlock(dim, at);
  if (b?.typeId !== FENCE) return;
  let perm = b.permutation;
  for (const [state, d] of LINKS) {
    const n = safeBlock(dim, add(at, d))?.typeId;
    perm = perm.withState(state as never, (n === FENCE || n === GENERATOR ? 'yes' : 'no') as never);
  }
  if (perm !== b.permutation) b.setPermutation(perm);
}

function relinkAround(dim: Dimension, at: Vector3) {
  relink(dim, at);
  for (const [, d] of LINKS) relink(dim, add(at, d));
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
      const dim = block.dimension;
      const at = block.location;
      system.run(() => {
        relinkAround(dim, at);
        updateNetwork(dim, at);
      });
    },
    onPlayerBreak({ block, dimension }) {
      const at = block.location;
      system.run(() => {
        relinkAround(dimension, at);
        updateAround(dimension, at);
      });
    },
  });
  blockComponentRegistry.registerCustomComponent(`${NS}:fence_generator`, {
    onPlace({ block }) {
      const dim = block.dimension;
      const at = block.location;
      system.run(() => relinkAround(dim, at));
    },
    onPlayerInteract({ block, player }) {
      const on = block.permutation.getState('dino:on' as never) !== 'on';
      setGenerator(block, on);
      player?.onScreenDisplay.setActionBar(tr(on ? 'msg.fence_on' : 'msg.fence_off'));
    },
    onRedstoneUpdate({ block, powerLevel, previousPowerLevel }) {
      if ((powerLevel > 0) !== (previousPowerLevel > 0)) setGenerator(block, powerLevel > 0);
    },
    onPlayerBreak({ block, dimension }) {
      const at = block.location;
      system.run(() => {
        relinkAround(dimension, at);
        updateAround(dimension, at);
      });
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
      owner.sendMessage(tr('msg.hatched', [{ translate: `entity.${NS}:${species}.name` }]));
    });
});

// ---------------------------------------------------------------- field guide
// All text comes from the resource pack lang files (en_US, da_DK) so it follows the player's language.

const tr = (key: string, with_: (RawMessage | string)[] = []): RawMessage => ({
  translate: `dino.ui.${key}`,
  with: { rawtext: with_.map((w) => (typeof w === 'string' ? { text: w } : w)) },
});
const t = (translate: string): RawMessage => ({ translate });
const txt = (text: string): RawMessage => ({ text });
const lines = (...parts: RawMessage[]): RawMessage => ({ rawtext: parts });
const NL = txt('\n');
const PERIOD_ORDER = ['Devonian', 'Permian', 'Triassic', 'Jurassic', 'Cretaceous', 'Paleogene', 'Neogene'];

function creaturePage(player: Player, id: string, back: () => void) {
  const c = DATA.creatures.find((x) => x.id === id);
  if (!c) return;
  const name = t(`entity.${NS}:${c.id}.name`);
  const ride = c.ride ? lines(tr(`ride.${c.ride}`), ...(c.seats > 1 ? [tr('ride.seats', [String(c.seats)])] : [])) : tr('ride.no');
  const body = lines(
    txt('§l'), name, txt('§r'), NL,
    txt('§7'), t(`dino.term.${c.period}`), txt(` · ${c.lengthM} m · `), t(`dino.term.${c.diet}`), txt('§r'), NL, NL,
    t(`dino.info.${c.id}`), NL, NL,
    txt('§6'), tr('page.temperament'), txt('§r '), t(`dino.term.${c.temperament}`), NL,
    txt('§6'), tr('page.taming'), txt('§r '), tr(`tame.${c.tame}`), NL,
    txt('§6'), tr('page.riding'), txt('§r '), ride,
  );
  new MessageFormData()
    .title(name)
    .body(body)
    .button1(tr('guide.back'))
    .button2(tr('guide.close'))
    .show(player)
    .then((r) => {
      if (r.selection === 0) back();
    });
}

function groupPage(player: Player, group: string) {
  const list = DATA.creatures.filter((c) => c.group === group).sort((a, b) => PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period) || a.name.localeCompare(b.name));
  const form = new ActionFormData().title(t(`dino.group.${group}`)).body(tr('guide.species', [String(list.length)]));
  for (const c of list) form.button(lines(t(`entity.${NS}:${c.id}.name`), txt('\n§8'), t(`dino.term.${c.period}`)));
  form.show(player).then((r) => {
    if (r.canceled || r.selection === undefined) return showGuide(player);
    creaturePage(player, list[r.selection].id, () => groupPage(player, group));
  });
}

function textPage(player: Player, title: RawMessage, body: RawMessage) {
  new MessageFormData().title(title).body(body).button1(tr('guide.back')).button2(tr('guide.close')).show(player).then((r) => {
    if (r.selection === 0) showGuide(player);
  });
}

function showGuide(player: Player) {
  const groups = [...new Set(DATA.creatures.map((c) => c.group))];
  const form = new ActionFormData().title(tr('guide.title', [DATA.version])).body(lines(txt('§7'), tr('guide.body', [String(DATA.creatures.length)])));
  for (const g of groups) form.button(t(`dino.group.${g}`));
  form.button(tr('guide.plants'));
  form.button(tr('guide.taming'));
  form.button(tr('guide.park'));
  form.show(player).then((r) => {
    if (r.canceled || r.selection === undefined) return;
    if (r.selection < groups.length) return groupPage(player, groups[r.selection]);
    const extra = r.selection - groups.length;
    if (extra === 0) {
      const parts: RawMessage[] = [];
      for (const p of [...DATA.plants, ...DATA.trees]) parts.push(txt('§a'), t(`dino.plant.${p.id}.name`), txt('§r\n'), t(`dino.plant.${p.id}.info`), NL, NL);
      return textPage(player, tr('guide.plants'), lines(...parts, tr('guide.saplings')));
    }
    if (extra === 1) return textPage(player, tr('guide.taming'), lines(tr('help.taming1'), NL, NL, tr('help.taming2'), NL, NL, tr('help.taming3'), NL, NL, tr('help.taming4')));
    return textPage(player, tr('guide.park'), lines(tr('help.park1'), NL, NL, tr('help.park2'), NL, NL, tr('help.park3')));
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
    player.sendMessage(tr('msg.welcome'));
  }, 60);
});
