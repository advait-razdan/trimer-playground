import { describe, it, expect } from 'vitest';
import { gf3Rref, gf3Rank, gf3NullSpace } from '../src/state/gf3';

describe('gf3Rref', () => {
  it('reduces a simple identity-like matrix', () => {
    const { rref, pivots } = gf3Rref([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(pivots).toEqual([0, 1, 2]);
    expect(rref).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });

  it('handles a matrix with entries needing mod 3', () => {
    // [2, 1; 1, 2]: det = 4-1 = 3 ≡ 0 mod 3, so rank is 1
    const { pivots } = gf3Rref([
      [2, 1],
      [1, 2],
    ]);
    expect(pivots.length).toBe(1);
  });

  it('handles a full-rank 2x2 matrix over GF(3)', () => {
    // [1, 1; 1, 2]: det = 2-1 = 1 ≢ 0 mod 3, so rank is 2
    const { rref, pivots } = gf3Rref([
      [1, 1],
      [1, 2],
    ]);
    expect(pivots).toEqual([0, 1]);
    expect(rref).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  it('handles empty matrix', () => {
    const { rref, pivots } = gf3Rref([]);
    expect(rref).toEqual([]);
    expect(pivots).toEqual([]);
  });

  it('handles a zero matrix', () => {
    const { rref, pivots } = gf3Rref([
      [0, 0],
      [0, 0],
    ]);
    expect(pivots).toEqual([]);
    expect(rref).toEqual([[0, 0], [0, 0]]);
  });

  it('correctly reduces a rank-2 3x3 matrix', () => {
    // A matrix where the third row is the sum of the first two (mod 3)
    const { pivots } = gf3Rref([
      [1, 0, 1],
      [0, 1, 2],
      [1, 1, 0], // (1+0, 0+1, 1+2) = (1, 1, 3) ≡ (1, 1, 0) mod 3
    ]);
    expect(pivots.length).toBe(2);
  });
});

describe('gf3Rank', () => {
  it('full rank for identity', () => {
    expect(gf3Rank([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ])).toBe(3);
  });

  it('rank 0 for zero matrix', () => {
    expect(gf3Rank([[0, 0], [0, 0]])).toBe(0);
  });

  it('rank 1 for repeated rows', () => {
    expect(gf3Rank([
      [1, 2, 0],
      [2, 1, 0], // 2 * row0 mod 3
    ])).toBe(1);
  });

  it('empty matrix has rank 0', () => {
    expect(gf3Rank([])).toBe(0);
  });
});

describe('gf3NullSpace', () => {
  it('identity matrix has trivial null space', () => {
    const ns = gf3NullSpace([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(ns.length).toBe(0);
  });

  it('zero 1x3 matrix has 3-dimensional null space', () => {
    const ns = gf3NullSpace([[0, 0, 0]]);
    expect(ns.length).toBe(3);
  });

  it('null space vectors are actually in the kernel', () => {
    const M = [
      [1, 1, 1],
      [1, 2, 0],
    ];
    const ns = gf3NullSpace(M);
    expect(ns.length).toBe(1); // 3 cols - 2 rank = 1

    // Verify Mv ≡ 0 (mod 3) for each null space vector
    for (const v of ns) {
      for (const row of M) {
        let dot = 0;
        for (let j = 0; j < row.length; j++) {
          dot += row[j] * v[j];
        }
        expect(((dot % 3) + 3) % 3).toBe(0);
      }
    }
  });

  it('matches expected null space for trimer-like move matrix', () => {
    // Simulate a 1x3 strip: one H-trimer move vector [1, 1, 1]
    // Null space should have dimension 2 (3 cells - 1 move rank)
    const M = [[1, 1, 1]];
    const ns = gf3NullSpace(M);
    expect(ns.length).toBe(2);

    // Verify each basis vector is in the kernel
    for (const v of ns) {
      const dot = v[0] + v[1] + v[2];
      expect(((dot % 3) + 3) % 3).toBe(0);
    }
  });

  it('handles a 1x5 strip (two H-trimer moves)', () => {
    // Move 1: cells 0,1,2 -> [1,1,1,0,0]
    // Move 2: cells 1,2,3 -> [0,1,1,1,0]
    // Move 3: cells 2,3,4 -> [0,0,1,1,1]
    const M = [
      [1, 1, 1, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 1, 1],
    ];
    const ns = gf3NullSpace(M);
    // Rank should be 3, null space dim = 5-3 = 2
    expect(ns.length).toBe(2);

    // Verify kernel membership
    for (const v of ns) {
      for (const row of M) {
        let dot = 0;
        for (let j = 0; j < row.length; j++) {
          dot += row[j] * v[j];
        }
        expect(((dot % 3) + 3) % 3).toBe(0);
      }
    }
  });
});
