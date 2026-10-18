import type { Assembled } from '../../creatures/assemble.js';
import { toHex, hex, mix } from '../../texture/color.js';
import { FORMAT, NS } from './constants.js';

export const RENDER_CONTROLLER = 'controller.render.dino.default';

export function clientEntity(x: Assembled) {
  const { def, anims } = x;
  const animations: Record<string, string> = {};
  for (const full of Object.keys(anims.animations)) animations[full.split('.').pop()!] = full;
  return {
    format_version: FORMAT.clientEntity,
    'minecraft:client_entity': {
      description: {
        identifier: `${NS}:${def.id}`,
        materials: { default: 'entity_alphatest' },
        textures: { default: `textures/entity/dino/${def.id}` },
        geometry: { default: `geometry.dino.${def.id}` },
        animations,
        scripts: {
          scale: String(def.scale),
          pre_animation: anims.pre,
          animate: anims.animate,
        },
        render_controllers: [RENDER_CONTROLLER],
        spawn_egg: { base_color: def.palette.side, overlay_color: toHex(mix(hex(def.palette.pattern?.colour ?? def.palette.back), hex(def.palette.accent), 0.35)) },
      },
    },
  };
}

export function animationFile(x: Assembled) {
  return { format_version: FORMAT.animation, animations: x.anims.animations };
}

export function renderControllers() {
  return {
    format_version: FORMAT.renderController,
    render_controllers: {
      [RENDER_CONTROLLER]: {
        geometry: 'Geometry.default',
        materials: [{ '*': 'Material.default' }],
        textures: ['Texture.default'],
        part_visibility: [{ '*': true }, { saddle: 'query.is_saddled' }],
      },
    },
  };
}
