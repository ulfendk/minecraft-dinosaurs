// Realistic Hunting support: when the hunting add-on is installed, every creature is game.
// This sends each creature's profile (game data and hit model, built into the bundle as
// __DINO_HUNTING__) on world load and whenever the hunting add-on asks for them; the entity
// side (dino:hunt_state, the carcass events) is in the entity files.
import { system, world, type Entity } from '@minecraft/server';
import { chunks, HELLO, REGISTER } from '../../tools/vendor/hunting-kit/protocol.js';

declare const __DINO_HUNTING__: { id: string }[];

/** True while the hunting add-on has made the creature a carcass: it lies still until field dressed. */
export function isCarcass(e: Entity) {
  try {
    return e.getProperty('dino:hunt_state') === 4;
  } catch {
    return false;
  }
}

function sendProfiles() {
  system.runJob(
    (function* () {
      for (const profile of __DINO_HUNTING__) {
        for (const message of chunks(profile) as string[]) {
          try {
            system.sendScriptEvent(REGISTER, message);
          } catch {
            return;
          }
          yield;
        }
      }
    })(),
  );
}

export function setupHunting() {
  system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === HELLO) sendProfiles();
  });
  world.afterEvents.worldLoad.subscribe(() => sendProfiles());
}
