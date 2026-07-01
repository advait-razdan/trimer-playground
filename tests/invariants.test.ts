import { describe, it, expect } from 'vitest';
import { computeInvariantBasis, computeWord, areReachable } from '../src/state/invariants';
import { fromAscii, createFullMask } from '../src/state/polyomino';

describe('computeInvariantBasis', () => {
  it('3x3 rectangle: 4 canonical, 0 extras, word length 4', () => {
    const mask = createFullMask(3, 3);
    const basis = computeInvariantBasis(mask);
    expect(basis.canonical.length).toBe(4);
    expect(basis.extras.length).toBe(0);
    expect(basis.wordLength).toBe(4);
    expect(basis.collapsed.length).toBe(0);
    expect(basis.canonical.map(f => f.name)).toEqual(['F1', 'F2', 'F3', 'F4']);
  });

  it('5x5 rectangle: 4 canonical, 0 extras', () => {
    const mask = createFullMask(5, 5);
    const basis = computeInvariantBasis(mask);
    expect(basis.canonical.length).toBe(4);
    expect(basis.extras.length).toBe(0);
    expect(basis.wordLength).toBe(4);
  });

  it('P-shape (image 2): 4 canonical, 0 extras, word length 4', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    expect(basis.cells.length).toBe(6);
    expect(basis.canonical.length).toBe(4);
    expect(basis.extras.length).toBe(0);
    expect(basis.wordLength).toBe(4);
  });

  it('1x5 strip: F2 and F4 collapse, word length 2', () => {
    // 1 row, 5 cols
    const mask = createFullMask(1, 5);
    const basis = computeInvariantBasis(mask);
    // F2 uses row index i, which is always 0 -> collapses
    // F4 uses i*j, also always 0 -> collapses
    // F1 and F3 survive
    expect(basis.wordLength).toBe(2);
    expect(basis.canonical.length).toBe(2);
    expect(basis.extras.length).toBe(0);
    const names = basis.canonical.map(f => f.name);
    expect(names).toContain('F1');
    expect(names).toContain('F3');
    expect(basis.collapsed).toContain('F2');
    expect(basis.collapsed).toContain('F4');
  });

  it('plus sign (arm=1): 3 canonical, 0 extras, word length 3', () => {
    const mask = fromAscii(`
      .#.
      ###
      .#.
    `);
    const basis = computeInvariantBasis(mask);
    expect(basis.cells.length).toBe(5);
    expect(basis.wordLength).toBe(3);
    expect(basis.extras.length).toBe(0);
  });

  it('dumbbell 3x3 + width-1 bridge of length 2: 4 canonical, 2 extras, word length 6', () => {
    // Two 3x3 squares connected by a 1-wide bridge of length 2
    // Total cells: 9 + 2 + 9 = 20
    const mask: boolean[][] = [];
    const height = 3;
    const width = 3 + 2 + 3; // 8 cols
    for (let i = 0; i < height; i++) {
      const row: boolean[] = [];
      for (let j = 0; j < width; j++) {
        if (j < 3 || j >= 5) {
          // Left or right lobe
          row.push(true);
        } else {
          // Bridge: only middle row (row 1)
          row.push(i === 1);
        }
      }
      mask.push(row);
    }
    const basis = computeInvariantBasis(mask);
    expect(basis.cells.length).toBe(20);
    expect(basis.canonical.length).toBe(4);
    expect(basis.extras.length).toBe(2);
    expect(basis.wordLength).toBe(6);
  });

  it('L-shape (3x3 minus corner): 4 canonical, 0 extras', () => {
    // 3x3 minus one corner = 8 cells. Need explicit 3x3 L.
    const mask = [
      [true,  true,  true],
      [true,  true,  true],
      [true,  true,  false],
    ];
    const basis = computeInvariantBasis(mask);
    expect(basis.cells.length).toBe(8);
    expect(basis.canonical.length).toBe(4);
    expect(basis.extras.length).toBe(0);
    expect(basis.wordLength).toBe(4);
  });

  it('T-shape (4-wide top, 3-cell stem): 4 canonical, 0 extras', () => {
    // 4-wide top row + 3-cell stem below center
    const mask = fromAscii(`
      ####
      .#..
      .#..
      .#..
    `);
    const basis = computeInvariantBasis(mask);
    expect(basis.cells.length).toBe(7);
    // The T has both H and V trimer positions, well-connected
    // Need to check actual invariant count empirically
    expect(basis.extras.length).toBe(0);
    expect(basis.wordLength).toBe(basis.canonical.length);
  });
});

describe('computeWord', () => {
  it('all-zero profile on 3x3 rectangle gives word (0, 0, 0, 0)', () => {
    const mask = createFullMask(3, 3);
    const basis = computeInvariantBasis(mask);
    const profile = Array.from({ length: 3 }, () => Array(3).fill(0));
    const word = computeWord(profile, basis);
    expect(word).toEqual([0, 0, 0, 0]);
  });

  it('P-shape image-2 profile gives word (0, 2, 1, 2)', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    // Profile: 1 2 - / 0 0 1 / 2 - -
    const profile = [
      [1, 2, 0],
      [0, 0, 1],
      [2, 0, 0],
    ];
    const word = computeWord(profile, basis);
    // From the spec: word should be (0, 2, 1, 2)
    expect(word).toEqual([0, 2, 1, 2]);
  });

  it('all-zero profile on P-shape gives word (0, 0, 0, 0)', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const profile = Array.from({ length: 3 }, () => Array(3).fill(0));
    const word = computeWord(profile, basis);
    expect(word).toEqual([0, 0, 0, 0]);
  });
});

describe('areReachable', () => {
  it('same profile is always reachable', () => {
    const mask = createFullMask(3, 3);
    const basis = computeInvariantBasis(mask);
    const profile = Array.from({ length: 3 }, () => Array(3).fill(0));
    expect(areReachable(profile, profile, basis)).toBe(true);
  });

  it('P-shape: all zeros NOT reachable from image-2 profile', () => {
    const mask = fromAscii(`
      ##.
      ###
      #..
    `);
    const basis = computeInvariantBasis(mask);
    const zeros = Array.from({ length: 3 }, () => Array(3).fill(0));
    const imageProfile = [
      [1, 2, 0],
      [0, 0, 1],
      [2, 0, 0],
    ];
    expect(areReachable(zeros, imageProfile, basis)).toBe(false);
  });

  it('3x3 rectangle: two profiles with same F1-F4 are reachable', () => {
    const mask = createFullMask(3, 3);
    const basis = computeInvariantBasis(mask);
    const a = Array.from({ length: 3 }, () => Array(3).fill(0));
    // Apply an H-trimer at row 0, cols 0,1,2 (add 1 each) -> values become 1,1,1
    const b = a.map(r => [...r]);
    b[0][0] = 1;
    b[0][1] = 1;
    b[0][2] = 1;
    expect(areReachable(a, b, basis)).toBe(true);
  });
});
