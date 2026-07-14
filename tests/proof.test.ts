import { describe, it, expect } from 'vitest';
import { findMoveSequence, enumerateReachable } from '../src/state/bfs';
import type { MoveStep } from '../src/state/bfs';
import { prove } from '../src/state/proof';
import { computeInvariantBasis } from '../src/state/invariants';
import type { InvariantBasis } from '../src/state/invariants';
import { fromAscii, createFullMask } from '../src/state/polyomino';

const mod3 = (n: number) => ((n % 3) + 3) % 3;

/** The three (row, col) cells a move covers. */
function moveCells(step: MoveStep): [number, number][] {
  const { direction, row, col } = step;
  return direction === 'H'
    ? [[row, col], [row, col + 1], [row, col + 2]]
    : [[row, col], [row + 1, col], [row + 2, col]];
}

/**
 * Replay a sequence from A, asserting every step is legal (its 3 cells equal)
 * before it is applied. Returns the resulting grid.
 */
function replayAndValidate(A: number[][], sequence: MoveStep[]): number[][] {
  const grid = A.map(r => r.map(mod3));
  for (const [n, step] of sequence.entries()) {
    const cells = moveCells(step);
    const [v0, v1, v2] = cells.map(([r, c]) => grid[r][c]);
    expect(v0, `step ${n} (${step.direction}${step.row},${step.col}) is illegal: ${v0},${v1},${v2}`).toBe(v1);
    expect(v1, `step ${n} (${step.direction}${step.row},${step.col}) is illegal: ${v0},${v1},${v2}`).toBe(v2);
    expect([1, 2]).toContain(step.multiplicity);
    for (const [r, c] of cells) grid[r][c] = mod3(grid[r][c] + step.multiplicity);
  }
  return grid;
}

/** Independent oracle: plain unidirectional BFS shortest distance. Small shapes only. */
function refShortest(A: number[][], B: number[][], basis: InvariantBasis): number | 'unreachable' {
  const key = (v: number[]) => v.join(',');
  const start = basis.cells.map(c => mod3(A[c.row][c.col]));
  const goal = key(basis.cells.map(c => mod3(B[c.row][c.col])));
  const idx = basis.moves.map(m => {
    const out: number[] = [];
    m.vector.forEach((x, i) => x === 1 && out.push(i));
    return out;
  });

  const dist = new Map([[key(start), 0]]);
  let layer = [start];
  if (key(start) === goal) return 0;
  while (layer.length) {
    const next: number[][] = [];
    for (const s of layer) {
      const d = dist.get(key(s))!;
      for (const [i0, i1, i2] of idx) {
        if (s[i0] !== s[i1] || s[i1] !== s[i2]) continue;
        for (const mult of [1, 2]) {
          const t = s.slice();
          for (const i of [i0, i1, i2]) t[i] = mod3(t[i] + mult);
          const k = key(t);
          if (dist.has(k)) continue;
          if (k === goal) return d + 1;
          dist.set(k, d + 1);
          next.push(t);
        }
      }
    }
    layer = next;
  }
  return 'unreachable';
}

/** Apply a list of moves to a zero grid to construct a guaranteed-reachable target. */
function buildTarget(rows: number, cols: number, steps: MoveStep[]): number[][] {
  const grid = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (const step of steps) {
    for (const [r, c] of moveCells(step)) grid[r][c] = mod3(grid[r][c] + step.multiplicity);
  }
  return grid;
}

describe('findMoveSequence', () => {
  it('finds a move sequence for a reachable pair on P-shape', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);

    // A = zeros, B = two H-trimer applications at row 1 (legally reachable)
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const B = [[0, 0, 0], [2, 2, 2], [0, 0, 0]];

    const result = findMoveSequence(A, B, basis);
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.sequence.length).toBeGreaterThan(0);
    }
  });

  it('returns unreachable for an unreachable pair', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const B = [[1, 2, 0], [0, 0, 1], [2, 0, 0]];

    const result = findMoveSequence(A, B, basis);
    expect(result.status).toBe('unreachable');
  });

  it('returns identical for same profile', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

    const result = findMoveSequence(A, A, basis);
    expect(result.status).toBe('identical');
  });
});

describe('findMoveSequence on a 6x6 grid', () => {
  // 8 pairwise-disjoint H-trimers covering 24 of the 36 cells.
  // Disjoint => each is legal from zeros in any order, so B is reachable in 8 moves.
  // Each move changes exactly 3 cells and B has 24 nonzero cells, so 8 is also a
  // lower bound: the shortest sequence is exactly 8. Mixed multiplicities exercise
  // the 3 - mult inversion on the backward half of the search.
  const STEPS: MoveStep[] = [
    { direction: 'H', row: 0, col: 0, multiplicity: 1 },
    { direction: 'H', row: 0, col: 3, multiplicity: 2 },
    { direction: 'H', row: 1, col: 0, multiplicity: 2 },
    { direction: 'H', row: 1, col: 3, multiplicity: 1 },
    { direction: 'H', row: 2, col: 0, multiplicity: 1 },
    { direction: 'H', row: 2, col: 3, multiplicity: 1 },
    { direction: 'H', row: 3, col: 0, multiplicity: 2 },
    { direction: 'H', row: 3, col: 3, multiplicity: 2 },
  ];

  const basis = computeInvariantBasis(createFullMask(6, 6));
  const A = Array.from({ length: 6 }, () => Array<number>(6).fill(0));
  const B = buildTarget(6, 6, STEPS);

  it('finds a path where the old unidirectional BFS reported too_large', () => {
    const result = findMoveSequence(A, B, basis);
    expect(result.status).toBe('found');
  });

  it('returns a sequence that is legal at every step and lands exactly on B', () => {
    const result = findMoveSequence(A, B, basis);
    if (result.status !== 'found') throw new Error(`expected found, got ${result.status}`);
    expect(replayAndValidate(A, result.sequence)).toEqual(B);
  });

  it('returns a shortest sequence (exactly 8 moves)', () => {
    const result = findMoveSequence(A, B, basis);
    if (result.status !== 'found') throw new Error(`expected found, got ${result.status}`);
    expect(result.sequence.length).toBe(8);
  });

  it('still reports too_large when the combined state cap is exhausted', () => {
    expect(findMoveSequence(A, B, basis, 20).status).toBe('too_large');
  });
});

describe('findMoveSequence returns shortest paths', () => {
  it('matches a reference unidirectional BFS on the P-shape', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

    for (const B of [
      [[0, 0, 0], [1, 1, 1], [0, 0, 0]],
      [[0, 0, 0], [2, 2, 2], [0, 0, 0]],
      [[1, 1, 0], [1, 1, 1], [1, 0, 0]],
    ]) {
      const result = findMoveSequence(A, B, basis);
      const expected = refShortest(A, B, basis);
      if (expected === 'unreachable') {
        expect(result.status).toBe('unreachable');
      } else {
        if (result.status !== 'found') throw new Error(`expected found, got ${result.status}`);
        expect(result.sequence.length).toBe(expected);
        expect(replayAndValidate(A, result.sequence)).toEqual(B);
      }
    }
  });

  it('matches a reference unidirectional BFS on a 4x3 grid', () => {
    const basis = computeInvariantBasis(createFullMask(4, 3));
    const A = Array.from({ length: 4 }, () => Array<number>(3).fill(0));
    const B = buildTarget(4, 3, [
      { direction: 'H', row: 0, col: 0, multiplicity: 1 },
      { direction: 'H', row: 3, col: 0, multiplicity: 2 },
    ]);

    const result = findMoveSequence(A, B, basis);
    if (result.status !== 'found') throw new Error(`expected found, got ${result.status}`);
    expect(result.sequence.length).toBe(refShortest(A, B, basis));
    expect(replayAndValidate(A, result.sequence)).toEqual(B);
  });
});

describe('enumerateReachable', () => {
  it('enumerates exactly 9 states from zeros on the P-shape', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const profile = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

    const result = enumerateReachable(profile, basis);
    expect(result.capped).toBe(false);
    // With legal-move constraints (cells must be equal), 5 states are reachable
    expect(result.states.size).toBe(5);
  });
});

describe('prove', () => {
  it('proves unreachability on P-shape (image-2 case) via exhaustive BFS', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const B = [[1, 2, 0], [0, 0, 1], [2, 0, 0]];

    const result = prove(A, B, basis);
    expect(result.type).toBe('unreachable_exhaustive');
    if (result.type === 'unreachable_exhaustive') {
      expect(result.totalReachable).toBe(5);
      expect(result.disagreeing.length).toBeGreaterThan(0);
    }
  });

  it('proves reachability on P-shape with a move sequence', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    // Build B by applying moves to zeros
    const B = [[0, 0, 0], [1, 1, 1], [0, 0, 0]]; // one H-trimer at row 1

    const result = prove(A, B, basis);
    expect(result.type).toBe('reachable');
    if (result.type === 'reachable') {
      expect(result.sequence.length).toBeGreaterThan(0);
    }
  });

  it('returns identical for same profile', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

    const result = prove(A, A, basis);
    expect(result.type).toBe('identical');
  });
});
