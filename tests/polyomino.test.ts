import { describe, it, expect } from 'vitest';
import {
  createFullMask,
  countActiveCells,
  getActiveCells,
  buildCellIndex,
  isConnected,
  hasHoles,
  validateToggle,
  fromAscii,
} from '../src/state/polyomino';

describe('createFullMask', () => {
  it('creates an all-true mask of the right size', () => {
    const mask = createFullMask(3, 4);
    expect(mask.length).toBe(3);
    expect(mask[0].length).toBe(4);
    expect(mask.every(row => row.every(v => v))).toBe(true);
  });
});

describe('countActiveCells', () => {
  it('counts all cells in a full mask', () => {
    expect(countActiveCells(createFullMask(3, 4))).toBe(12);
  });

  it('counts correctly with some inactive', () => {
    const mask = [
      [true, true, false],
      [true, false, false],
    ];
    expect(countActiveCells(mask)).toBe(3);
  });
});

describe('getActiveCells', () => {
  it('returns cells in row-major order', () => {
    const mask = [
      [true, false],
      [true, true],
    ];
    const cells = getActiveCells(mask);
    expect(cells).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);
  });
});

describe('buildCellIndex', () => {
  it('assigns sequential indices to active cells', () => {
    const mask = [
      [true, false],
      [true, true],
    ];
    const idx = buildCellIndex(mask);
    expect(idx[0][0]).toBe(0);
    expect(idx[0][1]).toBe(-1);
    expect(idx[1][0]).toBe(1);
    expect(idx[1][1]).toBe(2);
  });
});

describe('isConnected', () => {
  it('full rectangle is connected', () => {
    expect(isConnected(createFullMask(3, 3))).toBe(true);
  });

  it('L-shape is connected', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    expect(isConnected(mask)).toBe(true);
  });

  it('disconnected shape is not connected', () => {
    const mask = [
      [true, false, true],
      [false, false, false],
    ];
    expect(isConnected(mask)).toBe(false);
  });

  it('single cell is connected', () => {
    expect(isConnected([[true]])).toBe(true);
  });

  it('diagonal cells are not connected (4-connectivity)', () => {
    const mask = [
      [true, false],
      [false, true],
    ];
    expect(isConnected(mask)).toBe(false);
  });
});

describe('hasHoles', () => {
  it('full rectangle has no holes', () => {
    expect(hasHoles(createFullMask(3, 3))).toBe(false);
  });

  it('donut shape has a hole', () => {
    const mask = [
      [true, true, true],
      [true, false, true],
      [true, true, true],
    ];
    expect(hasHoles(mask)).toBe(true);
  });

  it('U-shape has no holes (open to border)', () => {
    const mask = [
      [true, false, true],
      [true, true, true],
    ];
    expect(hasHoles(mask)).toBe(false);
  });

  it('L-shape has no holes', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    expect(hasHoles(mask)).toBe(false);
  });
});

describe('validateToggle', () => {
  it('rejects toggle that disconnects shape', () => {
    // A straight line: removing the middle disconnects it
    const mask = [
      [true, true, true],
    ];
    const result = validateToggle(mask, 0, 1);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('disconnect');
  });

  it('rejects toggle that creates a hole', () => {
    // 3x3 all active, toggling center ON would need... actually need to toggle center OFF to create hole
    // Actually 3x3 all active, center is active. If we toggle it off -> donut -> hole
    const mask = createFullMask(3, 3);
    const result = validateToggle(mask, 1, 1);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('hole');
  });

  it('accepts valid toggle', () => {
    const mask = createFullMask(3, 3);
    // Removing a corner is safe
    const result = validateToggle(mask, 0, 0);
    expect(result.valid).toBe(true);
  });
});

describe('fromAscii', () => {
  it('parses the P-shape correctly', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    expect(mask).toEqual([
      [true, true, false],
      [true, true, true],
      [true, false, false],
    ]);
    expect(countActiveCells(mask)).toBe(6);
  });

  it('parses a rectangle', () => {
    const mask = fromAscii('###\n###');
    expect(mask).toEqual([
      [true, true, true],
      [true, true, true],
    ]);
  });

  it('parses a plus shape', () => {
    const mask = fromAscii(`
      .#.
      ###
      .#.
    `);
    expect(countActiveCells(mask)).toBe(5);
    expect(mask[0][1]).toBe(true);
    expect(mask[0][0]).toBe(false);
    expect(mask[1][0]).toBe(true);
  });
});
