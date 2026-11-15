import { describe, it, expect } from 'vitest';
import { encodeQr } from '../src/ui/qr.js';

const dark = (size: number, modules: Uint8Array, x: number, y: number): boolean =>
  (modules[y * size + x] ?? 0) === 1;

describe('QR version boundaries', () => {
  it('picks the documented version boundaries', () => {
    expect(encodeQr('a'.repeat(14)).version).toBe(1);
    expect(encodeQr('a'.repeat(15)).version).toBe(2);
    expect(encodeQr('a'.repeat(26)).version).toBe(2);
    expect(encodeQr('a'.repeat(27)).version).toBe(3);
    expect(encodeQr('a'.repeat(84)).version).toBe(5);
    expect(encodeQr('a'.repeat(85)).version).toBe(6);
    expect(encodeQr('a'.repeat(213)).version).toBe(10);
    expect(() => encodeQr('a'.repeat(214))).toThrow(/too long/);
  });
});

describe('QR symbol structure', () => {
  it('is well formed with finder patterns', () => {
    for (const length of [5, 45, 122, 180]) {
      const matrix = encodeQr(`https://wanaka.studio/?room=${'x'.repeat(length)}`);
      const size = matrix.size;
      expect(size).toBe(matrix.version * 4 + 17);
      expect(matrix.modules.length).toBe(size * size);
      for (const [ox, oy] of [
        [0, 0],
        [size - 7, 0],
        [0, size - 7],
      ] as const) {
        for (let dy = 0; dy < 7; dy += 1) {
          for (let dx = 0; dx < 7; dx += 1) {
            const expected =
              dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
            expect(dark(size, matrix.modules, ox + dx, oy + dy)).toBe(expected);
          }
        }
      }
      // The dark module below the top-left format strip is always on.
      expect(dark(size, matrix.modules, 8, size - 8)).toBe(true);
    }
  });
});

describe('QR format information', () => {
  it('both format copies decode to level M and the chosen mask', () => {
    for (const text of ['https://a.b/?room=AB12CD', 'zz', 'https://x.y/' + 'q'.repeat(90)]) {
      const matrix = encodeQr(text);
      const size = matrix.size;
      let bits = 0;
      const read = (x: number, y: number, bit: number): void => {
        if (dark(size, matrix.modules, x, y)) {
          bits |= 1 << bit;
        }
      };
      for (let i = 0; i < 6; i += 1) read(8, i, i);
      read(8, 7, 6);
      read(8, 8, 7);
      read(7, 8, 8);
      for (let i = 9; i < 15; i += 1) read(14 - i, 8, i);
      const first = bits;

      bits = 0;
      for (let i = 0; i < 8; i += 1) read(size - 1 - i, 8, i);
      for (let i = 8; i < 15; i += 1) read(8, size - 15 + i, i);
      const second = bits;

      expect(first).toBe(second);
      const data = (first ^ 0x5412) >>> 10;
      expect(data >> 3).toBe(0);
      expect(data & 0x7).toBe(matrix.mask);
    }
  });
});
