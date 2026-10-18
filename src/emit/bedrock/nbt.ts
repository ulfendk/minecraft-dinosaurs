// Minimal little-endian NBT writer (Bedrock .mcstructure format).

export type Tag =
  | { t: 'byte'; v: number }
  | { t: 'int'; v: number }
  | { t: 'string'; v: string }
  | { t: 'list'; of: Tag['t']; v: Tag[] }
  | { t: 'compound'; v: Record<string, Tag> };

const ID: Record<Tag['t'], number> = { byte: 1, int: 3, string: 8, list: 9, compound: 10 };

export const byte = (v: number): Tag => ({ t: 'byte', v });
export const int = (v: number): Tag => ({ t: 'int', v });
export const str = (v: string): Tag => ({ t: 'string', v });
export const list = (of: Tag['t'], v: Tag[]): Tag => ({ t: 'list', of, v });
export const compound = (v: Record<string, Tag>): Tag => ({ t: 'compound', v });

class Buf {
  private chunks: Buffer[] = [];
  u8(n: number) {
    const b = Buffer.alloc(1);
    b.writeInt8(n);
    this.chunks.push(b);
  }
  i16(n: number) {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(n);
    this.chunks.push(b);
  }
  i32(n: number) {
    const b = Buffer.alloc(4);
    b.writeInt32LE(n);
    this.chunks.push(b);
  }
  s(v: string) {
    const b = Buffer.from(v, 'utf8');
    this.i16(b.length);
    this.chunks.push(b);
  }
  done() {
    return Buffer.concat(this.chunks);
  }
}

function payload(b: Buf, tag: Tag) {
  switch (tag.t) {
    case 'byte':
      b.u8(tag.v);
      break;
    case 'int':
      b.i32(tag.v);
      break;
    case 'string':
      b.s(tag.v);
      break;
    case 'list':
      b.u8(tag.v.length ? ID[tag.of] : tag.of === 'compound' ? ID.compound : ID[tag.of]);
      b.i32(tag.v.length);
      for (const x of tag.v) payload(b, x);
      break;
    case 'compound':
      for (const [k, x] of Object.entries(tag.v)) {
        b.u8(ID[x.t]);
        b.s(k);
        payload(b, x);
      }
      b.u8(0);
      break;
  }
}

export function writeNbt(root: Record<string, Tag>): Buffer {
  const b = new Buf();
  b.u8(ID.compound);
  b.s('');
  payload(b, compound(root));
  return b.done();
}

/** Block placed in a structure: name + states (bool → byte, number → int, string). */
export interface SBlock {
  name: string;
  states?: Record<string, boolean | number | string>;
}

const BLOCK_VERSION = (1 << 24) | (26 << 16) | (40 << 8);

/** Builds a .mcstructure from a sparse voxel map; unset cells are structure void. */
export function mcstructure(size: [number, number, number], blocks: Map<string, SBlock>): Buffer {
  const [sx, sy, sz] = size;
  const palette: SBlock[] = [];
  const keyOf = (b: SBlock) => JSON.stringify(b);
  const pIndex = new Map<string, number>();
  const indices: Tag[] = [];
  const water: Tag[] = [];
  for (let x = 0; x < sx; x++)
    for (let y = 0; y < sy; y++)
      for (let z = 0; z < sz; z++) {
        const b = blocks.get(`${x},${y},${z}`);
        if (!b) {
          indices.push(int(-1));
        } else {
          const k = keyOf(b);
          let i = pIndex.get(k);
          if (i === undefined) {
            i = palette.length;
            palette.push(b);
            pIndex.set(k, i);
          }
          indices.push(int(i));
        }
        water.push(int(-1));
      }
  const pal = palette.map((b) =>
    compound({
      name: str(b.name),
      states: compound(Object.fromEntries(Object.entries(b.states ?? {}).map(([k, v]) => [k, typeof v === 'boolean' ? byte(v ? 1 : 0) : typeof v === 'number' ? int(v) : str(v)]))),
      version: int(BLOCK_VERSION),
    }),
  );
  return writeNbt({
    format_version: int(1),
    size: list('int', size.map(int)),
    structure: compound({
      block_indices: list('list', [list('int', indices), list('int', water)]),
      entities: list('compound', []),
      palette: compound({ default: compound({ block_palette: list('compound', pal), block_position_data: compound({}) }) }),
    }),
    structure_world_origin: list('int', [int(0), int(0), int(0)]),
  });
}
