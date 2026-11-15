/**
 * ui/qr.ts — Encodeur QR minimal (byte mode, correction d'erreur M, versions 1-10)
 * Écrit en projet pour que le lobby dessine un QR de rejoindre sans requête réseau.
 */

export interface QrMatrix {
  readonly size: number;
  readonly version: number;
  readonly mask: number;
  /** Modules ligne par colonne, size * size ; 1 = module sombre */
  readonly modules: Uint8Array;
}

interface QrTable {
  readonly ecPerBlock: number;
  readonly blocks: number;
  readonly dataCodewords: number;
  readonly totalCodewords: number;
}

const TABLE: readonly QrTable[] = [
  { ecPerBlock: 0, blocks: 0, dataCodewords: 0, totalCodewords: 0 },
  { ecPerBlock: 10, blocks: 1, dataCodewords: 16, totalCodewords: 26 },
  { ecPerBlock: 16, blocks: 1, dataCodewords: 28, totalCodewords: 44 },
  { ecPerBlock: 26, blocks: 1, dataCodewords: 44, totalCodewords: 70 },
  { ecPerBlock: 18, blocks: 2, dataCodewords: 64, totalCodewords: 100 },
  { ecPerBlock: 24, blocks: 2, dataCodewords: 86, totalCodewords: 134 },
  { ecPerBlock: 16, blocks: 4, dataCodewords: 108, totalCodewords: 172 },
  { ecPerBlock: 18, blocks: 4, dataCodewords: 124, totalCodewords: 196 },
  { ecPerBlock: 22, blocks: 4, dataCodewords: 154, totalCodewords: 242 },
  { ecPerBlock: 22, blocks: 5, dataCodewords: 182, totalCodewords: 292 },
  { ecPerBlock: 26, blocks: 5, dataCodewords: 216, totalCodewords: 346 },
];

const ALIGNMENT: readonly (readonly number[])[] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if ((x & 0x100) !== 0) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255] ?? 0;
}

const gfExp = (value: number): number => EXP[value] ?? 0;
const gfLog = (value: number): number => LOG[value] ?? 0;

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return gfExp(gfLog(a) + gfLog(b));
}

function rsGenerator(degree: number): number[] {
  let poly: number[] = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      const coefficient = poly[j] ?? 0;
      next[j] = (next[j] ?? 0) ^ coefficient;
      next[j + 1] = (next[j + 1] ?? 0) ^ gfMul(coefficient, gfExp(i));
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data: readonly number[], degree: number): number[] {
  const generator = rsGenerator(degree);
  const remainder = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ (remainder[0] ?? 0);
    remainder.shift();
    remainder.push(0);
    for (let i = 0; i < degree; i++) {
      remainder[i] = (remainder[i] ?? 0) ^ gfMul(generator[i + 1] ?? 0, factor);
    }
  }
  return remainder;
}

function byteCapacity(version: number): number {
  const table = TABLE[version];
  if (!table) return 0;
  const countBits = version <= 9 ? 8 : 16;
  return Math.floor((table.dataCodewords * 8 - 4 - countBits) / 8);
}

function buildCodewords(payload: Uint8Array, version: number): number[] {
  const table = TABLE[version];
  if (!table) throw new Error(`unsupported QR version ${version}`);
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(payload.length, version <= 9 ? 8 : 16);
  for (const byte of payload) push(byte, 8);
  const capacityBits = table.dataCodewords * 8;
  const terminator = Math.min(4, capacityBits - bits.length);
  for (let i = 0; i < terminator; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] ?? 0);
    data.push(byte);
  }
  let pad = 0;
  while (data.length < table.dataCodewords) {
    data.push(pad % 2 === 0 ? 0xec : 0x11);
    pad++;
  }

  const shortLength = Math.floor(table.dataCodewords / table.blocks);
  const longBlocks = table.dataCodewords % table.blocks;
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;
  for (let i = 0; i < table.blocks; i++) {
    const length = shortLength + (i >= table.blocks - longBlocks ? 1 : 0);
    dataBlocks.push(data.slice(offset, offset + length));
    offset += length;
    ecBlocks.push(rsRemainder(dataBlocks[dataBlocks.length - 1], table.ecPerBlock));
  }
  const result: number[] = [];
  for (let i = 0; i <= shortLength; i++) {
    for (const block of dataBlocks) {
      const value = block[i];
      if (value !== undefined) result.push(value);
    }
  }
  for (let i = 0; i < table.ecPerBlock; i++) {
    for (const block of ecBlocks) result.push(block[i] ?? 0);
  }
  return result;
}

function formatBits(mask: number): number {
  let remainder = mask;
  for (let i = 0; i < 10; i++) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  }
  return ((mask << 10) | remainder) ^ 0x5412;
}

function versionBits(version: number): number {
  let remainder = version;
  for (let i = 0; i < 12; i++) {
    remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  }
  return (version << 12) | remainder;
}

interface Grid {
  readonly size: number;
  readonly modules: Uint8Array;
  readonly reserved: Uint8Array;
}

const slot = (grid: Grid, x: number, y: number): number => y * grid.size + x;
const isReserved = (grid: Grid, x: number, y: number): boolean =>
  (grid.reserved[slot(grid, x, y)] ?? 0) === 1;
const setModule = (grid: Grid, x: number, y: number, value: boolean): void => {
  grid.modules[slot(grid, x, y)] = value ? 1 : 0;
};
const reserve = (grid: Grid, x: number, y: number): void => {
  grid.reserved[slot(grid, x, y)] = 1;
};

function placeFinder(grid: Grid, x: number, y: number): void {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || py < 0 || px >= grid.size || py >= grid.size) continue;
      const inRing =
        (dx >= 0 && dx <= 6 && (dy === 0 || dy === 6)) ||
        (dy >= 0 && dy <= 6 && (dx === 0 || dx === 6));
      const inCore = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
      setModule(grid, px, py, inRing || inCore);
      reserve(grid, px, py);
    }
  }
}

function placeAlignment(grid: Grid, cx: number, cy: number): void {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px < 0 || py < 0 || px >= grid.size || py >= grid.size) continue;
      if (isReserved(grid, px, py)) continue;
      const ring = Math.max(Math.abs(dx), Math.abs(dy));
      setModule(grid, px, py, ring !== 1);
      reserve(grid, px, py);
    }
  }
}

function baseGrid(version: number): Grid {
  const size = version * 4 + 17;
  const grid: Grid = {
    size,
    modules: new Uint8Array(size * size),
    reserved: new Uint8Array(size * size),
  };

  placeFinder(grid, 0, 0);
  placeFinder(grid, size - 7, 0);
  placeFinder(grid, 0, size - 7);

  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    setModule(grid, i, 6, dark);
    reserve(grid, i, 6);
    setModule(grid, 6, i, dark);
    reserve(grid, 6, i);
  }

  const centres = ALIGNMENT[version] ?? [];
  for (let i = 0; i < centres.length; i++) {
    for (let j = 0; j < centres.length; j++) {
      const cx = centres[i] ?? 0;
      const cy = centres[j] ?? 0;
      if (
        (cx === 6 && cy === 6) ||
        (cx === 6 && cy === size - 7) ||
        (cx === size - 7 && cy === 6)
      ) {
        continue;
      }
      placeAlignment(grid, cx, cy);
    }
  }

  for (let i = 0; i < 9; i++) {
    reserve(grid, i, 8);
    reserve(grid, 8, i);
  }
  for (let i = 0; i < 8; i++) {
    reserve(grid, size - 1 - i, 8);
    reserve(grid, 8, size - 1 - i);
  }

  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        reserve(grid, size - 11 + j, i);
        reserve(grid, i, size - 11 + j);
      }
    }
  }
  return grid;
}

function placeData(grid: Grid, codewords: readonly number[]): void {
  const bits: number[] = [];
  for (const byte of codewords) {
    for (let i = 7; i >= 0; i--) bits.push((byte >>> i) & 1);
  }
  let index = 0;
  let upward = true;
  for (let right = grid.size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < grid.size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = upward ? grid.size - 1 - vert : vert;
        if (isReserved(grid, x, y)) continue;
        setModule(grid, x, y, (bits[index] ?? 0) === 1);
        index++;
      }
    }
    upward = !upward;
  }
}

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return false;
  }
}

function applyMask(grid: Grid, mask: number): void {
  for (let y = 0; y < grid.size; y++) {
    for (let x = 0; x < grid.size; x++) {
      if (isReserved(grid, x, y)) continue;
      if (maskBit(mask, x, y)) {
        const index = slot(grid, x, y);
        grid.modules[index] = (grid.modules[index] ?? 0) === 1 ? 0 : 1;
      }
    }
  }
}

function writeFormat(grid: Grid, mask: number): void {
  const bits = formatBits(mask);
  const size = grid.size;
  const bit = (index: number): boolean => ((bits >>> index) & 1) === 1;
  for (let i = 0; i < 6; i++) setModule(grid, 8, i, bit(i));
  setModule(grid, 8, 7, bit(6));
  setModule(grid, 8, 8, bit(7));
  setModule(grid, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) setModule(grid, 14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) setModule(grid, size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) setModule(grid, 8, size - 15 + i, bit(i));
  setModule(grid, 8, size - 8, true);
}

function writeVersion(grid: Grid, version: number): void {
  if (version < 7) return;
  const bits = versionBits(version);
  for (let i = 0; i < 18; i++) {
    const value = ((bits >>> i) & 1) === 1;
    const a = grid.size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setModule(grid, a, b, value);
    setModule(grid, b, a, value);
  }
}

function penalty(grid: Grid): number {
  const size = grid.size;
  const dark = (x: number, y: number): boolean => (grid.modules[slot(grid, x, y)] ?? 0) === 1;
  let score = 0;
  const scanLine = (get: (i: number) => boolean): void => {
    let run = 1;
    for (let i = 1; i < size; i++) {
      if (get(i) === get(i - 1)) {
        run += 1;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else run = 1;
    }
    for (let i = 0; i + 10 < size; i++) {
      const pattern =
        get(i) &&
        !get(i + 1) &&
        get(i + 2) &&
        get(i + 3) &&
        get(i + 4) &&
        !get(i + 5) &&
        get(i + 6) &&
        !get(i + 7) &&
        !get(i + 8) &&
        !get(i + 9) &&
        !get(i + 10);
      const inverse =
        !get(i) &&
        !get(i + 1) &&
        !get(i + 2) &&
        !get(i + 3) &&
        get(i + 4) &&
        !get(i + 5) &&
        get(i + 6) &&
        get(i + 7) &&
        get(i + 8) &&
        !get(i + 9) &&
        get(i + 10);
      if (pattern || inverse) score += 40;
    }
  };
  for (let y = 0; y < size; y++) scanLine((i) => dark(i, y));
  for (let x = 0; x < size; x++) scanLine((i) => dark(x, i));
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const value = dark(x, y);
      if (
        value === dark(x + 1, y) &&
        value === dark(x, y + 1) &&
        value === dark(x + 1, y + 1)
      ) {
        score += 3;
      }
    }
  }
  let darkCount = 0;
  for (const module of grid.modules) darkCount += module;
  const total = size * size;
  score += Math.floor(Math.abs(darkCount * 20 - total * 10) / total) * 10;
  return score;
}

/** Encode `text` en symbole QR byte mode, correction d'erreur M. */
export function encodeQr(text: string): QrMatrix {
  const payload = new TextEncoder().encode(text);
  let version = 1;
  while (version <= 10 && byteCapacity(version) < payload.length) version++;
  if (version > 10) throw new Error('QR payload too long');
  const codewords = buildCodewords(payload, version);

  let best: { grid: Grid; mask: number; score: number } | null = null;
  for (let mask = 0; mask < 8; mask++) {
    const grid = baseGrid(version);
    placeData(grid, codewords);
    applyMask(grid, mask);
    writeFormat(grid, mask);
    writeVersion(grid, version);
    const score = penalty(grid);
    if (best === null || score < best.score) {
      best = { grid, mask, score };
    }
  }
  if (best === null) throw new Error('QR masking failed');
  return {
    size: best.grid.size,
    version,
    mask: best.mask,
    modules: best.grid.modules,
  };
}

/** Dessine une matrice QR sur un canvas avec zone silencieuse, pour le HUD du lobby. */
export function drawQr(
  canvas: HTMLCanvasElement,
  matrix: QrMatrix,
  cssSize = 190,
  dark = '#141018',
  light = '#f8f5ee',
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const ratio = Math.min(3, Math.max(1, globalThis.devicePixelRatio ?? 1));
  const quiet = 2;
  const modules = matrix.size + quiet * 2;
  const scale = Math.max(2, Math.floor((cssSize * ratio) / modules));
  const drawn = modules * scale;
  canvas.width = drawn;
  canvas.height = drawn;
  canvas.style.width = `${Math.round(drawn / ratio)}px`;
  canvas.style.height = `${Math.round(drawn / ratio)}px`;
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, drawn, drawn);
  ctx.fillStyle = dark;
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if ((matrix.modules[y * matrix.size + x] ?? 0) === 1) {
        ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
      }
    }
  }
}
