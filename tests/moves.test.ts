import { describe, it, expect } from 'vitest';
import { validateMove, applyMove, canApplyMod3 } from '../src/state/moves';
import type { Grid } from '../src/state/types';

function zeros(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

// --- Horizontal trimer validation ---

describe('horizontal trimer validation', () => {
  it('accepts three equal cells in a row, all < 3', () => {
    const g: Grid = [[1, 1, 1, 0], [0, 0, 0, 0]];
    const result = validateMove(g, 'horizontal-trimer', { row: 0, col: 0 });
    expect(result.valid).toBe(true);
  });

  it('accepts all-zeros', () => {
    const g = zeros(3, 4);
    const result = validateMove(g, 'horizontal-trimer', { row: 0, col: 0 });
    expect(result.valid).toBe(true);
  });

  it('rejects when cells are not all equal', () => {
    const g: Grid = [[1, 2, 1, 0]];
    const result = validateMove(g, 'horizontal-trimer', { row: 0, col: 0 });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not all equal');
  });

  it('rejects when a cell is >= 3', () => {
    const g: Grid = [[3, 3, 3, 0]];
    const result = validateMove(g, 'horizontal-trimer', { row: 0, col: 0 });
    expect(result.valid).toBe(false);
  });

  it('rejects out of bounds', () => {
    const g: Grid = [[1, 1]]; // only 2 cols, need 3
    const result = validateMove(g, 'horizontal-trimer', { row: 0, col: 0 });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('out of bounds');
  });
});

// --- Vertical trimer validation ---

describe('vertical trimer validation', () => {
  it('accepts three equal cells in a column, all < 3', () => {
    const g: Grid = [[2], [2], [2]];
    const result = validateMove(g, 'vertical-trimer', { row: 0, col: 0 });
    expect(result.valid).toBe(true);
  });

  it('rejects when cells are not all equal', () => {
    const g: Grid = [[0], [1], [0]];
    const result = validateMove(g, 'vertical-trimer', { row: 0, col: 0 });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not all equal');
  });

  it('rejects out of bounds', () => {
    const g: Grid = [[0], [0]]; // only 2 rows
    const result = validateMove(g, 'vertical-trimer', { row: 0, col: 0 });
    expect(result.valid).toBe(false);
  });

  it('rejects when a cell is >= 3', () => {
    const g: Grid = [[3], [3], [3]];
    const result = validateMove(g, 'vertical-trimer', { row: 0, col: 0 });
    expect(result.valid).toBe(false);
  });
});

// --- Plus-3 validation ---

describe('plus-3 validation', () => {
  it('accepts cell with value < 3', () => {
    const g: Grid = [[2, 0], [1, 0]];
    const result = validateMove(g, 'plus-3', { row: 0, col: 0 });
    expect(result.valid).toBe(true);
  });

  it('rejects cell with value >= 3', () => {
    const g: Grid = [[3, 0], [0, 0]];
    const result = validateMove(g, 'plus-3', { row: 0, col: 0 });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('already');
  });

  it('rejects out of bounds', () => {
    const g: Grid = [[0]];
    const result = validateMove(g, 'plus-3', { row: 1, col: 0 });
    expect(result.valid).toBe(false);
  });
});

// --- Mod-3 validation ---

describe('mod-3 validation', () => {
  it('accepts when all cells >= 3', () => {
    const g: Grid = [[3, 4], [5, 6]];
    const result = validateMove(g, 'mod-3');
    expect(result.valid).toBe(true);
  });

  it('rejects when any cell < 3', () => {
    const g: Grid = [[3, 2], [5, 6]];
    const result = validateMove(g, 'mod-3');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('< 3');
  });
});

// --- canApplyMod3 ---

describe('canApplyMod3', () => {
  it('returns true when all cells >= 3', () => {
    expect(canApplyMod3([[3, 5], [4, 6]])).toBe(true);
  });

  it('returns false when any cell < 3', () => {
    expect(canApplyMod3([[3, 2]])).toBe(false);
  });
});

// --- Move application correctness ---

describe('move application', () => {
  it('horizontal trimer adds 1 to three consecutive cells', () => {
    const g: Grid = [[1, 1, 1, 2], [0, 0, 0, 0]];
    const { newGrid, move } = applyMove(g, 'horizontal-trimer', { row: 0, col: 0 });
    expect(newGrid[0]).toEqual([2, 2, 2, 2]);
    expect(newGrid[1]).toEqual([0, 0, 0, 0]);
    expect(move.before).toEqual([1, 1, 1]);
    expect(move.after).toEqual([2, 2, 2]);
  });

  it('vertical trimer adds 1 to three consecutive cells in column', () => {
    const g: Grid = [[0, 1], [0, 2], [0, 0]];
    const { newGrid, move } = applyMove(g, 'vertical-trimer', { row: 0, col: 0 });
    expect(newGrid[0][0]).toBe(1);
    expect(newGrid[1][0]).toBe(1);
    expect(newGrid[2][0]).toBe(1);
    // Other cells unchanged
    expect(newGrid[0][1]).toBe(1);
    expect(newGrid[1][1]).toBe(2);
    expect(move.before).toEqual([0, 0, 0]);
    expect(move.after).toEqual([1, 1, 1]);
  });

  it('plus-3 adds 3 to the cell', () => {
    const g: Grid = [[2, 1], [0, 0]];
    const { newGrid, move } = applyMove(g, 'plus-3', { row: 0, col: 0 });
    expect(newGrid[0][0]).toBe(5);
    expect(newGrid[0][1]).toBe(1); // unchanged
    expect(move.before).toEqual([2]);
    expect(move.after).toEqual([5]);
  });

  it('mod-3 reduces all cells by mod 3', () => {
    const g: Grid = [[3, 4, 5], [6, 7, 8]];
    const { newGrid } = applyMove(g, 'mod-3');
    expect(newGrid).toEqual([[0, 1, 2], [0, 1, 2]]);
  });

  it('applyMove does not mutate original grid', () => {
    const g: Grid = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const original = g.map(row => [...row]);
    applyMove(g, 'horizontal-trimer', { row: 0, col: 0 });
    expect(g).toEqual(original);
  });

  it('throws on invalid move', () => {
    const g: Grid = [[1, 2, 1]];
    expect(() => applyMove(g, 'horizontal-trimer', { row: 0, col: 0 })).toThrow();
  });
});

// --- allowAbove3 toggle tests ---

describe('allowAbove3 toggle', () => {
  it('H-trimer on cells with value 4 is accepted when allowAbove3=true', () => {
    const g: Grid = [[4, 4, 4, 0]];
    const result = validateMove(g, 'horizontal-trimer', { row: 0, col: 0 }, true);
    expect(result.valid).toBe(true);
  });

  it('H-trimer on cells with value 4 is rejected when allowAbove3=false', () => {
    const g: Grid = [[4, 4, 4, 0]];
    const result = validateMove(g, 'horizontal-trimer', { row: 0, col: 0 }, false);
    expect(result.valid).toBe(false);
  });

  it('V-trimer on cells with value 5 is accepted when allowAbove3=true', () => {
    const g: Grid = [[5], [5], [5]];
    const result = validateMove(g, 'vertical-trimer', { row: 0, col: 0 }, true);
    expect(result.valid).toBe(true);
  });

  it('+3 on a cell with value 5 is accepted when allowAbove3=true', () => {
    const g: Grid = [[5, 0]];
    const result = validateMove(g, 'plus-3', { row: 0, col: 0 }, true);
    expect(result.valid).toBe(true);
  });

  it('+3 on a cell with value 5 is rejected when allowAbove3=false', () => {
    const g: Grid = [[5, 0]];
    const result = validateMove(g, 'plus-3', { row: 0, col: 0 }, false);
    expect(result.valid).toBe(false);
  });

  it('H-trimer still requires all cells equal even with allowAbove3=true', () => {
    const g: Grid = [[4, 5, 4, 0]];
    const result = validateMove(g, 'horizontal-trimer', { row: 0, col: 0 }, true);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not all equal');
  });

  it('applyMove works with allowAbove3 for H-trimer on value 4', () => {
    const g: Grid = [[4, 4, 4, 0]];
    const { newGrid } = applyMove(g, 'horizontal-trimer', { row: 0, col: 0 }, true);
    expect(newGrid[0]).toEqual([5, 5, 5, 0]);
  });
});
