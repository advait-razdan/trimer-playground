/**
 * Invariant computation for polyomino shapes.
 *
 * Ported faithfully from trimer_general.py's PolyominoTrimer class:
 * - _build_moves: enumerate all legal H-trimer and V-trimer positions
 * - _compute_invariants: GF(3) null space of the move matrix
 * - _canonical_vecs: build F1-F4 weight vectors restricted to shape
 * - _classify_invariants: split invariant space into canonical + extras
 * - _clean_extra: minimize nonzero entries in extra vectors
 */

import type { ShapeMask, Cell } from './polyomino';
import { getActiveCells, buildCellIndex } from './polyomino';
import { gf3Rank, gf3NullSpace } from './gf3';

/** Non-negative mod 3 */
function mod3(n: number): number {
  return ((n % 3) + 3) % 3;
}

/** A named fingerprint: a name and a weight vector (one entry per active cell, mod 3). */
export interface NamedFingerprint {
  name: string;
  weights: number[];
}

/** A trimer move: direction, starting cell, and the move vector over active cells. */
export interface TrimerMove {
  direction: 'H' | 'V';
  row: number;
  col: number;
  vector: number[];
}

/** Full invariant basis for a shape. */
export interface InvariantBasis {
  /** Active cells in row-major order. */
  cells: Cell[];
  /** Cell index map: cellIndex[row][col] = index into cells, or -1. */
  cellIndex: number[][];
  /** All trimer moves possible on the shape. */
  moves: TrimerMove[];
  /** Canonical fingerprints that survive (subset of F1-F4). */
  canonical: NamedFingerprint[];
  /** Extra fingerprints beyond F1-F4. */
  extras: NamedFingerprint[];
  /** Which of F1-F4 collapsed (always zero on this shape). */
  collapsed: string[];
  /** Total word length = canonical.length + extras.length. */
  wordLength: number;
}

/** Build all legal trimer move vectors for the shape. */
function buildMoves(mask: ShapeMask, cells: Cell[], cellIndex: number[][]): TrimerMove[] {
  const moves: TrimerMove[] = [];
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;
  const N = cells.length;

  for (const { row: i, col: j } of cells) {
    // Horizontal trimer at (i, j), (i, j+1), (i, j+2)
    if (j + 2 < cols && mask[i][j + 1] && mask[i][j + 2]) {
      const v = new Array(N).fill(0);
      v[cellIndex[i][j]] = 1;
      v[cellIndex[i][j + 1]] = 1;
      v[cellIndex[i][j + 2]] = 1;
      moves.push({ direction: 'H', row: i, col: j, vector: v });
    }
    // Vertical trimer at (i, j), (i+1, j), (i+2, j)
    if (i + 2 < rows && mask[i + 1][j] && mask[i + 2][j]) {
      const v = new Array(N).fill(0);
      v[cellIndex[i][j]] = 1;
      v[cellIndex[i + 1][j]] = 1;
      v[cellIndex[i + 2][j]] = 1;
      moves.push({ direction: 'V', row: i, col: j, vector: v });
    }
  }

  return moves;
}

/** Build the four canonical fingerprint weight vectors restricted to the shape. */
function canonicalVecs(cells: Cell[]): { name: string; weights: number[] }[] {
  const F1 = cells.map(() => 1);
  const F2 = cells.map(c => mod3(c.row));
  const F3 = cells.map(c => mod3(c.col));
  const F4 = cells.map(c => mod3(c.row * c.col));
  return [
    { name: 'F1', weights: F1 },
    { name: 'F2', weights: F2 },
    { name: 'F3', weights: F3 },
    { name: 'F4', weights: F4 },
  ];
}

/**
 * Subtract combinations of `others` from `v` to minimize nonzero entries.
 * Matches _clean_extra from trimer_general.py.
 */
function cleanExtra(v: number[], others: number[][]): number[] {
  let best = v.map(x => mod3(x));
  const k = others.length;
  if (k > 6) return best;

  // Try all 3^k combinations of subtracting multiples of others
  const total = Math.pow(3, k);
  for (let combo = 0; combo < total; combo++) {
    const cand = v.slice();
    let c = combo;
    for (let idx = 0; idx < k; idx++) {
      const coeff = c % 3;
      c = Math.floor(c / 3);
      if (coeff !== 0) {
        for (let j = 0; j < cand.length; j++) {
          cand[j] = mod3(cand[j] - coeff * others[idx][j]);
        }
      }
    }
    const candMod = cand.map(x => mod3(x));
    const candNonzero = candMod.filter(x => x !== 0).length;
    const bestNonzero = best.filter(x => x !== 0).length;
    if (candNonzero < bestNonzero) {
      best = candMod;
    }
  }
  return best;
}

/**
 * Compute the full invariant basis for a shape.
 * This is the main entry point — call it once when the shape is locked.
 */
export function computeInvariantBasis(mask: ShapeMask): InvariantBasis {
  const cells = getActiveCells(mask);
  const cellIndex = buildCellIndex(mask);
  const N = cells.length;
  const moves = buildMoves(mask, cells, cellIndex);

  // Compute invariant space (null space of move matrix over GF(3))
  let invariants: number[][];
  if (moves.length === 0) {
    // No moves: every vector is an invariant
    invariants = Array.from({ length: N }, (_, i) => {
      const v = new Array(N).fill(0);
      v[i] = 1;
      return v;
    });
  } else {
    const moveMatrix = moves.map(m => m.vector.map(x => mod3(x)));
    invariants = gf3NullSpace(moveMatrix);
  }

  // Classify into canonical + extras
  const canonical4 = canonicalVecs(cells);
  const named: NamedFingerprint[] = [];
  const collapsed: string[] = [];
  const accum: number[][] = [];

  for (const { name, weights } of canonical4) {
    // Check if this canonical is all zeros (collapsed)
    if (weights.every(w => w === 0)) {
      collapsed.push(name);
      continue;
    }

    // Check if it adds rank to what we have so far
    if (accum.length === 0) {
      accum.push(weights.slice());
      named.push({ name, weights: weights.slice() });
    } else {
      const stackBefore = [...accum];
      const stackAfter = [...accum, weights];
      if (gf3Rank(stackAfter) > gf3Rank(stackBefore)) {
        accum.push(weights.slice());
        named.push({ name, weights: weights.slice() });
      } else {
        // This canonical is a linear combination of already-included ones
        collapsed.push(name);
      }
    }
  }

  // Collect extras: invariants not spanned by canonical
  const extras: NamedFingerprint[] = [];
  for (const inv of invariants) {
    const invMod = inv.map(x => mod3(x));
    const current = [...accum, ...extras.map(e => e.weights)];

    if (current.length === 0) {
      if (invMod.some(x => x !== 0)) {
        const clean = cleanExtra(invMod, canonical4.map(c => c.weights));
        extras.push({ name: `E${extras.length + 1}`, weights: clean });
      }
    } else {
      const rankBefore = gf3Rank(current);
      const rankAfter = gf3Rank([...current, invMod]);
      if (rankAfter > rankBefore) {
        const clean = cleanExtra(invMod, [...accum, ...extras.map(e => e.weights)]);
        extras.push({ name: `E${extras.length + 1}`, weights: clean });
      }
    }
  }

  return {
    cells,
    cellIndex,
    moves,
    canonical: named,
    extras,
    collapsed,
    wordLength: named.length + extras.length,
  };
}

/**
 * Compute the word (fingerprint tuple) of a profile given the invariant basis.
 * Profile is a 2D grid; only active cells are read.
 */
export function computeWord(
  profile: number[][],
  basis: InvariantBasis,
): number[] {
  // Extract values at active cells
  const vec = basis.cells.map(c => mod3(profile[c.row][c.col]));

  const allBasis = [...basis.canonical, ...basis.extras];
  return allBasis.map(({ weights }) => {
    let dot = 0;
    for (let i = 0; i < weights.length; i++) {
      dot += weights[i] * vec[i];
    }
    return mod3(dot);
  });
}

/**
 * Check if two profiles are reachable from each other.
 */
export function areReachable(
  profileA: number[][],
  profileB: number[][],
  basis: InvariantBasis,
): boolean {
  const wordA = computeWord(profileA, basis);
  const wordB = computeWord(profileB, basis);
  return wordA.length === wordB.length && wordA.every((v, i) => v === wordB[i]);
}
