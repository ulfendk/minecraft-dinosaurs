import type { Assembled } from '../../creatures/assemble.js';
import type { OutDir } from '../writer.js';

export interface WorldCtx {
  bp: OutDir;
  rp: OutDir;
  lang: string[];
  sounds: Record<string, unknown>;
  assembled: Assembled[];
}

export async function emitWorld(_ctx: WorldCtx) {}
