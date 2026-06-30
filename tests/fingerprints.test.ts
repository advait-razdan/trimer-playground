import { describe, it, expect } from 'vitest';
import { computeFingerprints, computeF1, computeF2, computeF3, computeF4, traceF1, traceF2, traceF3, traceF4 } from '../src/state/fingerprints';
import { applyMove, validateMove } from '../src/state/moves';
import type { Grid, MoveType, CellPosition } from '../src/state/types';

function zeros(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function randomGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(Math.random() * 3)),
  );
}

// --- Basic fingerprint computation ---

describe('fingerprint computation', () => {
  it('computes (0,0,0,0) for all-zeros grid', () => {
    const g = zeros(4, 4);
    const fp = computeFingerprints(g);
    expect(fp).toEqual({ f1: 0, f2: 0, f3: 0, f4: 0 });
  });

  it('computes correct fingerprints for diagonal 4x4', () => {
    const g: Grid = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    const fp = computeFingerprints(g);
    // F1 = 4 mod 3 = 1
    // F2 = 0+1+2+3 = 6 mod 3 = 0
    // F3 = 0+1+2+3 = 6 mod 3 = 0
    // F4 = 0+1+4+9 = 14 mod 3 = 2
    expect(fp).toEqual({ f1: 1, f2: 0, f3: 0, f4: 2 });
  });

  it('computes correct fingerprints for anti-diagonal 4x4', () => {
    const g: Grid = [
      [0, 0, 0, 1],
      [0, 0, 1, 0],
      [0, 1, 0, 0],
      [1, 0, 0, 0],
    ];
    const fp = computeFingerprints(g);
    // F1 = 4 mod 3 = 1
    // F2 = 0*1 + 1*1 + 2*1 + 3*1 = 6 mod 3 = 0
    // F3 = 3+2+1+0 = 6 mod 3 = 0
    // F4 = 0+2+2+0 = 4 mod 3 = 1
    expect(fp).toEqual({ f1: 1, f2: 0, f3: 0, f4: 1 });
  });

  it('diagonal and anti-diagonal agree on F1,F2,F3 but disagree on F4', () => {
    const diag = computeFingerprints([
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]);
    const adiag = computeFingerprints([
      [0, 0, 0, 1],
      [0, 0, 1, 0],
      [0, 1, 0, 0],
      [1, 0, 0, 0],
    ]);
    expect(diag.f1).toBe(adiag.f1);
    expect(diag.f2).toBe(adiag.f2);
    expect(diag.f3).toBe(adiag.f3);
    expect(diag.f4).not.toBe(adiag.f4);
  });
});

// --- Preset fingerprint values ---

describe('preset fingerprint values', () => {
  it('slide 60 grid A has fingerprints (1,2,1,1)', () => {
    const g = zeros(6, 6);
    g[1][1] = 1;
    g[1][0] = 2;
    g[2][0] = 1;
    const fp = computeFingerprints(g);
    expect(fp).toEqual({ f1: 1, f2: 2, f3: 1, f4: 1 });
  });

  it('slide 60 grid B has fingerprints (2,2,2,2)', () => {
    const g = zeros(6, 6);
    g[1][1] = 2;
    const fp = computeFingerprints(g);
    expect(fp).toEqual({ f1: 2, f2: 2, f3: 2, f4: 2 });
  });

  it('3x3 walk-through starts with fingerprints (0,0,0,0) for all-2s', () => {
    const g: Grid = [[2, 2, 2], [2, 2, 2], [2, 2, 2]];
    const fp = computeFingerprints(g);
    // F1 = 18 mod 3 = 0
    // F2 = 0*(6) + 1*(6) + 2*(6) = 18 mod 3 = 0
    // F3 = same by symmetry = 0
    // F4 = ... = 0
    expect(fp).toEqual({ f1: 0, f2: 0, f3: 0, f4: 0 });
  });
});

// --- Fingerprint invariance under each move type ---

describe('fingerprint invariance under moves', () => {
  it('horizontal trimer preserves fingerprints', () => {
    const g: Grid = [[1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const before = computeFingerprints(g);
    const { newGrid } = applyMove(g, 'horizontal-trimer', { row: 0, col: 0 });
    const after = computeFingerprints(newGrid);
    expect(after).toEqual(before);
  });

  it('vertical trimer preserves fingerprints', () => {
    const g: Grid = [[2, 0], [2, 0], [2, 0]];
    const before = computeFingerprints(g);
    const { newGrid } = applyMove(g, 'vertical-trimer', { row: 0, col: 0 });
    const after = computeFingerprints(newGrid);
    expect(after).toEqual(before);
  });

  it('plus-3 preserves fingerprints', () => {
    const g: Grid = [[1, 2], [0, 1]];
    const before = computeFingerprints(g);
    const { newGrid } = applyMove(g, 'plus-3', { row: 0, col: 0 });
    const after = computeFingerprints(newGrid);
    expect(after).toEqual(before);
  });

  it('mod-3 preserves fingerprints', () => {
    const g: Grid = [[3, 4, 5], [6, 3, 4], [5, 6, 3]];
    const before = computeFingerprints(g);
    const { newGrid } = applyMove(g, 'mod-3');
    const after = computeFingerprints(newGrid);
    expect(after).toEqual(before);
  });
});

// --- Property-based test: random grids x random moves ---

describe('property-based invariance (1000 random grids)', () => {
  it('fingerprints are preserved for random legal moves', () => {
    for (let trial = 0; trial < 1000; trial++) {
      const rows = 2 + Math.floor(Math.random() * 5); // 2-6
      const cols = 3 + Math.floor(Math.random() * 5); // 3-7
      let grid = randomGrid(rows, cols);
      const fpBefore = computeFingerprints(grid);

      // Pick a random move type and try to apply it
      const moveTypes: MoveType[] = ['horizontal-trimer', 'vertical-trimer', 'plus-3'];
      const moveType = moveTypes[Math.floor(Math.random() * moveTypes.length)];

      let pos: CellPosition | undefined;
      if (moveType === 'horizontal-trimer') {
        pos = { row: Math.floor(Math.random() * rows), col: Math.floor(Math.random() * Math.max(1, cols - 2)) };
      } else if (moveType === 'vertical-trimer') {
        pos = { row: Math.floor(Math.random() * Math.max(1, rows - 2)), col: Math.floor(Math.random() * cols) };
      } else {
        pos = { row: Math.floor(Math.random() * rows), col: Math.floor(Math.random() * cols) };
      }

      const validation = validateMove(grid, moveType, pos);
      if (validation.valid) {
        const { newGrid } = applyMove(grid, moveType, pos);
        const fpAfter = computeFingerprints(newGrid);
        expect(fpAfter).toEqual(fpBefore);
      }

      // Also test mod-3 when applicable: boost all cells and apply mod-3
      const boosted = grid.map(row => row.map(v => v + 3));
      const fpBoosted = computeFingerprints(boosted);
      // +3 to each cell preserves fingerprints (since 3 ≡ 0 mod 3)
      expect(fpBoosted).toEqual(fpBefore);
      // Now apply mod-3
      const validation2 = validateMove(boosted, 'mod-3');
      expect(validation2.valid).toBe(true);
      const { newGrid: modded } = applyMove(boosted, 'mod-3');
      const fpModded = computeFingerprints(modded);
      expect(fpModded).toEqual(fpBefore);
    }
  });
});

// --- Working trace tests ---

describe('working traces', () => {
  it('F1 trace produces correct result', () => {
    const g: Grid = [[1, 2], [0, 1]];
    const trace = traceF1(g);
    expect(trace.result).toBe(computeF1(g));
    expect(trace.lines.length).toBeGreaterThan(0);
  });

  it('F2 trace shows row-by-row breakdown', () => {
    const g: Grid = [[1, 0, 0], [0, 2, 0], [1, 1, 1]];
    const trace = traceF2(g);
    expect(trace.result).toBe(computeF2(g));
    // Should have one line per row + total + mod line
    expect(trace.lines.length).toBe(3 + 2);
  });

  it('F3 trace shows column-by-column breakdown', () => {
    const g: Grid = [[1, 0], [2, 1], [0, 1]];
    const trace = traceF3(g);
    expect(trace.result).toBe(computeF3(g));
  });

  it('F4 trace shows non-zero contributions', () => {
    const g: Grid = [[0, 0, 0], [0, 2, 1], [0, 1, 2]];
    const trace = traceF4(g);
    expect(trace.result).toBe(computeF4(g));
    // Should mention cells (1,1), (1,2), (2,1), (2,2) since they have non-zero values and i,j > 0
    expect(trace.lines.some(l => l.includes('(1,1)'))).toBe(true);
  });
});

// --- 3x3 walk-through fingerprint invariance ---

describe('3x3 walk-through replay', () => {
  it('fingerprints stay (0,0,0,0) through all 7 moves', () => {
    let grid: Grid = [[2, 2, 2], [2, 2, 2], [2, 2, 2]];
    const expected = { f1: 0, f2: 0, f3: 0, f4: 0 };
    expect(computeFingerprints(grid)).toEqual(expected);

    // Move 1: H-trimer (0,0)
    ({ newGrid: grid } = applyMove(grid, 'horizontal-trimer', { row: 0, col: 0 }));
    expect(computeFingerprints(grid)).toEqual(expected);

    // Move 2: H-trimer (1,0)
    ({ newGrid: grid } = applyMove(grid, 'horizontal-trimer', { row: 1, col: 0 }));
    expect(computeFingerprints(grid)).toEqual(expected);

    // Move 3: H-trimer (2,0)
    ({ newGrid: grid } = applyMove(grid, 'horizontal-trimer', { row: 2, col: 0 }));
    expect(computeFingerprints(grid)).toEqual(expected);

    // Grid should now be all 3s
    expect(grid.every(row => row.every(v => v === 3))).toBe(true);

    // Move 4: mod-3
    ({ newGrid: grid } = applyMove(grid, 'mod-3'));
    expect(computeFingerprints(grid)).toEqual(expected);

    // Grid should now be all 0s
    expect(grid.every(row => row.every(v => v === 0))).toBe(true);

    // Move 5: V-trimer (0,0)
    ({ newGrid: grid } = applyMove(grid, 'vertical-trimer', { row: 0, col: 0 }));
    expect(computeFingerprints(grid)).toEqual(expected);

    // Move 6: +3 at (1,1)
    ({ newGrid: grid } = applyMove(grid, 'plus-3', { row: 1, col: 1 }));
    expect(computeFingerprints(grid)).toEqual(expected);

    // Move 7: +3 at (2,2)
    ({ newGrid: grid } = applyMove(grid, 'plus-3', { row: 2, col: 2 }));
    expect(computeFingerprints(grid)).toEqual(expected);

    // Final grid: [[1,0,0],[1,3,0],[1,0,3]]
    expect(grid).toEqual([[1, 0, 0], [1, 3, 0], [1, 0, 3]]);
  });
});
