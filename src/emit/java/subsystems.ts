// Hook for the Java subsystems. Each subsystem owns one module and adds its own
// assets, data, lang strings and recipes through the shared context.
import type { Assembled } from '../../creatures/assemble.js';
import type { OutDir } from '../writer.js';
import { emitJavaBlocks } from './blocks.js';
import { emitJavaGear } from './gear.js';
import { emitJavaVehicles } from './vehicles.js';

export interface JavaCtx {
  out: OutDir;
  en: Record<string, string>;
  da: Record<string, string>;
  assembled: Assembled[];
}

export async function emitSubsystems(ctx: JavaCtx) {
  await emitJavaBlocks(ctx);
  await emitJavaGear(ctx);
  await emitJavaVehicles(ctx);
}
