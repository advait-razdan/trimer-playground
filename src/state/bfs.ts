/**
 * BFS move-sequence finder for polyomino trimer reachability.
 *
 * Ported from trimer_general.py's find_move_sequence.
 * Works in the space of mod-3 cell vectors (one entry per active cell).
 */

import type { InvariantBasis, TrimerMove } from './invariants';
import { computeWord } from './invariants';

/** Non-negative mod 3. */
function mod3(n: number): number {
  return ((n % 3) + 3) % 3;
}

/** Extract the 3 cell indices where the move vector has value 1. */
function getMoveIndices(move: TrimerMove): [number, number, number] {
  const indices: number[] = [];
  for (let i = 0; i < move.vector.length; i++) {
    if (move.vector[i] === 1) indices.push(i);
  }
  return indices as [number, number, number];
}

/** A single step in a move sequence. */
export interface MoveStep {
  direction: 'H' | 'V';
  row: number;
  col: number;
  /** 1 or 2 (multiplicity: +1 or +2 ≡ -1 mod 3) */
  multiplicity: number;
}

export type BfsResult =
  | { status: 'identical' }
  | { status: 'unreachable' }
  | { status: 'found'; sequence: MoveStep[] }
  | { status: 'too_large' };

/**
 * BFS for an actual sequence of trimer moves from profileA to profileB.
 * Operates in the mod-3 cell-vector space.
 *
 * @param profileA - 2D grid (start)
 * @param profileB - 2D grid (target)
 * @param basis - the invariant basis for the shape
 * @param maxStates - cap on visited states (default 500,000)
 */
export function findMoveSequence(
  profileA: number[][],
  profileB: number[][],
  basis: InvariantBasis,
  maxStates = 500_000,
): BfsResult {
  // Check reachability first
  const wordA = computeWord(profileA, basis);
  const wordB = computeWord(profileB, basis);
  if (wordA.length !== wordB.length || !wordA.every((v, i) => v === wordB[i])) {
    return { status: 'unreachable' };
  }

  // Convert to mod-3 cell vectors
  const a = basis.cells.map(c => mod3(profileA[c.row][c.col]));
  const b = basis.cells.map(c => mod3(profileB[c.row][c.col]));

  const aKey = a.join(',');
  const bKey = b.join(',');

  if (aKey === bKey) {
    return { status: 'identical' };
  }

  // BFS
  // visited maps state-key -> backpointer info (null for start)
  const visited = new Map<string, { prevKey: string; move: TrimerMove; mult: number } | null>();
  visited.set(aKey, null);
  const queue: string[] = [aKey];

  // Precompute the 3 cell indices for each move for legality checks
  const moveIndices = basis.moves.map(getMoveIndices);

  while (queue.length > 0) {
    if (visited.size > maxStates) {
      return { status: 'too_large' };
    }

    const stateKey = queue.shift()!;
    const state = stateKey.split(',').map(Number);

    for (let mi = 0; mi < basis.moves.length; mi++) {
      const move = basis.moves[mi];
      const [i0, i1, i2] = moveIndices[mi];

      // Legality check: the 3 cells must have equal values
      if (state[i0] !== state[i1] || state[i1] !== state[i2]) continue;

      for (const mult of [1, 2]) {
        const newState = state.slice();
        for (let i = 0; i < newState.length; i++) {
          newState[i] = mod3(newState[i] + mult * move.vector[i]);
        }
        const newKey = newState.join(',');

        if (!visited.has(newKey)) {
          visited.set(newKey, { prevKey: stateKey, move, mult });

          if (newKey === bKey) {
            // Reconstruct path
            const seq: MoveStep[] = [];
            let cur = newKey;
            while (visited.get(cur) !== null) {
              const info = visited.get(cur)!;
              seq.push({
                direction: info.move.direction,
                row: info.move.row,
                col: info.move.col,
                multiplicity: info.mult,
              });
              cur = info.prevKey;
            }
            seq.reverse();
            return { status: 'found', sequence: seq };
          }

          queue.push(newKey);
        }
      }
    }
  }

  // Should not reach here if reachability check passed, but just in case
  return { status: 'unreachable' };
}

/**
 * Enumerate ALL states reachable from a profile via BFS.
 * Returns the set of reachable state keys and the count.
 * Used for the "exhaustive proof" of unreachability on small shapes.
 *
 * @param profile - 2D grid (start)
 * @param basis - the invariant basis for the shape
 * @param maxStates - cap on visited states
 */
export function enumerateReachable(
  profile: number[][],
  basis: InvariantBasis,
  maxStates = 500_000,
): { states: Set<string>; capped: boolean } {
  const start = basis.cells.map(c => mod3(profile[c.row][c.col]));
  const startKey = start.join(',');

  const visited = new Set<string>();
  visited.add(startKey);
  const frontier: string[] = [startKey];

  // Precompute the 3 cell indices for each move for legality checks
  const moveIndices = basis.moves.map(getMoveIndices);

  while (frontier.length > 0) {
    if (visited.size > maxStates) {
      return { states: visited, capped: true };
    }

    const stateKey = frontier.pop()!;
    const state = stateKey.split(',').map(Number);

    for (let mi = 0; mi < basis.moves.length; mi++) {
      const move = basis.moves[mi];
      const [i0, i1, i2] = moveIndices[mi];

      // Legality check: the 3 cells must have equal values
      if (state[i0] !== state[i1] || state[i1] !== state[i2]) continue;

      for (const mult of [1, 2]) {
        const newState = state.slice();
        for (let i = 0; i < newState.length; i++) {
          newState[i] = mod3(newState[i] + mult * move.vector[i]);
        }
        const newKey = newState.join(',');

        if (!visited.has(newKey)) {
          visited.add(newKey);
          frontier.push(newKey);
        }
      }
    }
  }

  return { states: visited, capped: false };
}
