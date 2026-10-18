// Minimal big-endian NBT writer for Java Edition structure files (.nbt, gzipped).
import zlib from 'node:zlib';

export type JTag =
  | { t: 'int'; v: number }
  | { t: 'string'; v: string }
  | { t: 'list'; of: JTag['t']; v: JTag[] }
  | { t: 'compound'; v: Record<string, JTag> };

const ID: Record<JTag['t'], number> = { int: 3, string: 8, list: 9, compound: 10 };

export const jint = (v: number): JTag => ({ t: 'int', v });
export const jstr = (v: string): JTag => ({ t: 'string', v });
export const jlist = (of: JTag['t'], v: JTag[]): JTag => ({ t: 'list', of, v });
export const jcompound = (v: Record<string, JTag>): JTag => ({ t: 'compound', v });

function payload(out: number[], tag: JTag) {
  const i32 = (n: number) => {
    const b = Buffer.alloc(4);
    b.writeInt32BE(n);
    out.push(...b);
  };
  const str = (s: string) => {
    const b = Buffer.from(s, 'utf8');
    out.push((b.length >> 8) & 0xff, b.length & 0xff, ...b);
  };
  switch (tag.t) {
    case 'int':
      i32(tag.v);
      break;
    case 'string':
      str(tag.v);
      break;
    case 'list':
      out.push(tag.v.length ? ID[tag.of] : 0);
      i32(tag.v.length);
      for (const x of tag.v) payload(out, x);
      break;
    case 'compound':
      for (const [k, x] of Object.entries(tag.v)) {
        out.push(ID[x.t]);
        str(k);
        payload(out, x);
      }
      out.push(0);
      break;
  }
}

/** Gzipped NBT file with an unnamed root compound. */
export function writeJavaNbt(root: Record<string, JTag>): Buffer {
  const out: number[] = [ID.compound, 0, 0];
  payload(out, jcompound(root));
  return zlib.gzipSync(Buffer.from(out));
}

export interface JBlock {
  name: string;
  properties?: Record<string, string>;
}

/** Java structure template (only the listed blocks are placed; everything else is left untouched). */
export function javaStructure(size: [number, number, number], blocks: Map<string, JBlock>, dataVersion: number): Buffer {
  const palette: JBlock[] = [];
  const index = new Map<string, number>();
  const list: JTag[] = [];
  for (const [key, b] of blocks) {
    const k = JSON.stringify(b);
    let i = index.get(k);
    if (i === undefined) {
      i = palette.length;
      palette.push(b);
      index.set(k, i);
    }
    const [x, y, z] = key.split(',').map(Number);
    list.push(jcompound({ pos: jlist('int', [jint(x), jint(y), jint(z)]), state: jint(i) }));
  }
  return writeJavaNbt({
    DataVersion: jint(dataVersion),
    size: jlist('int', size.map(jint)),
    palette: jlist(
      'compound',
      palette.map((b) =>
        jcompound({
          id: jstr(b.name),
          ...(b.properties ? { properties: jcompound(Object.fromEntries(Object.entries(b.properties).map(([k, v]) => [k, jstr(v)]))) } : {}),
        }),
      ),
    ),
    blocks: jlist('compound', list),
    entities: jlist('compound', []),
  });
}
