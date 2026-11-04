/**
 * The Tiny Toronto tile index (ported from toronto.rickyzhang.me's viewer):
 * which Deep Zoom tiles exist and their content-hashed file names. The
 * coarse levels come inside index.json, base64; the finer ones are files of
 * their own, fetched as the map first needs them.
 */

export type Bounds = readonly [x0: number, y0: number, x1: number, y1: number];

export interface IndexMeta {
  bounds: Bounds;
  build: string;
  /** Level files, by level: tiles/i/<hash>.bin. */
  files: Record<string, string>;
  /** Levels stored in index.json itself, base64. */
  inline: Record<string, string>;
  /** The finest level; level l is 2^l px across. */
  levels: number;
  tile: number;
  world: number;
}

interface LevelGrid {
  h: number;
  hashes: Uint8Array;
  tx0: number;
  ty0: number;
  w: number;
}

const HASH_BYTES = 6;
const MAGIC = 0x31_4c_54_54; // "TTL1", little-endian
const HEX = Array.from({ length: 256 }, (_, i) =>
  i.toString(16).padStart(2, "0")
);

const parseLevel = (buffer: ArrayBuffer): LevelGrid => {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC) {
    throw new Error("bad tile index level");
  }
  return {
    h: view.getUint32(16, true),
    hashes: new Uint8Array(buffer, 20),
    tx0: view.getInt32(4, true),
    ty0: view.getInt32(8, true),
    w: view.getUint32(12, true),
  };
};

const ok = (response: Response) => {
  if (!response.ok) {
    throw new Error(`${response.status} ${response.url}`);
  }
  return response;
};

const fetchChecked = (url: string) => fetch(url).then(ok);

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** Fetches `url`, retrying twice (after 1 s and 3 s) for flaky networks. */
const fetchRetrying = async (
  url: string,
  waits: readonly number[] = [1000, 3000]
): Promise<Response> => {
  const [next, ...rest] = waits;
  if (next === undefined) {
    return fetchChecked(url);
  }
  try {
    return await fetchChecked(url);
  } catch {
    await wait(next);
    return fetchRetrying(url, rest);
  }
};

export class TileIndex {
  readonly base: string;
  readonly meta: IndexMeta;
  private readonly grids: (LevelGrid | undefined)[];
  private readonly pending = new Map<number, Promise<void>>();
  private readonly onLevel: () => void;

  private constructor(meta: IndexMeta, base: string, onLevel: () => void) {
    this.base = base;
    this.meta = meta;
    this.onLevel = onLevel;
    this.grids = Array.from({ length: meta.levels + 1 });
    for (const [level, encoded] of Object.entries(meta.inline)) {
      this.grids[Number(level)] = parseLevel(
        Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)).buffer
      );
    }
  }

  /** `onLevel` runs whenever a finer level arrives: tiles there now exist. */
  static async load(base: string, onLevel: () => void) {
    const meta = (await fetch(`${base}tiles/index.json`, { cache: "no-cache" })
      .then(ok)
      .then((response) => response.json())) as IndexMeta;
    return new TileIndex(meta, base, onLevel);
  }

  /** Whether the level's grid is here; asking for one fetches it. */
  hasLevel(level: number) {
    if (this.grids[level]) {
      return true;
    }
    const hash = this.meta.files[String(level)];
    if (hash && !this.pending.has(level)) {
      this.pending.set(
        level,
        fetchRetrying(`${this.base}tiles/i/${hash}.bin`)
          .then((response) => response.arrayBuffer())
          .then((buffer) => {
            this.grids[level] = parseLevel(buffer);
            this.onLevel();
          })
          .catch(() => {
            // Left out: the level's tiles fall back to coarser ones.
          })
      );
    }
    return false;
  }

  private hashAt(level: number, x: number, y: number) {
    const grid = this.grids[level];
    if (!grid) {
      return -1;
    }
    const cx = x - grid.tx0;
    const cy = y - grid.ty0;
    if (cx < 0 || cy < 0 || cx >= grid.w || cy >= grid.h) {
      return -1;
    }
    const at = (cy * grid.w + cx) * HASH_BYTES;
    for (let i = 0; i < HASH_BYTES; i += 1) {
      if (grid.hashes[at + i] !== 0) {
        return at;
      }
    }
    return -1;
  }

  has(level: number, x: number, y: number) {
    return this.hashAt(level, x, y) >= 0;
  }

  url(level: number, x: number, y: number) {
    const at = this.hashAt(level, x, y);
    const grid = this.grids[level];
    if (at < 0 || !grid) {
      return "";
    }
    let name = "";
    for (let i = 0; i < HASH_BYTES; i += 1) {
      name += HEX[grid.hashes[at + i]];
    }
    return `${this.base}tiles/u/${name}.webp`;
  }
}
