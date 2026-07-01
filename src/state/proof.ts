/**
 * Proof logic for trimer reachability.
 *
 * Three modes:
 * 1. Reachable: BFS finds a real move sequence (animate it).
 * 2. Unreachable + small shape: exhaustive BFS enumerates all reachable states,
 *    confirms target is not among them.
 * 3. Unreachable + large shape: algebraic proof via the first disagreeing fingerprint.
 */

import type { InvariantBasis } from './invariants';
import { computeWord } from './invariants';
import { findMoveSequence, enumerateReachable } from './bfs';
import type { MoveStep } from './bfs';

/** Non-negative mod 3. */
function mod3(n: number): number {
  return ((n % 3) + 3) % 3;
}

/** The cell count threshold below which we attempt exhaustive BFS. */
const EXHAUSTIVE_BFS_CELL_LIMIT = 15;

export interface DisagreeingFingerprint {
  name: string;
  valueA: number;
  valueB: number;
  index: number;
}

export type ProofResult =
  | {
      type: 'reachable';
      sequence: MoveStep[];
    }
  | {
      type: 'identical';
    }
  | {
      type: 'unreachable_exhaustive';
      totalReachable: number;
      disagreeing: DisagreeingFingerprint[];
    }
  | {
      type: 'unreachable_algebraic';
      disagreeing: DisagreeingFingerprint[];
      /** True if BFS was attempted but hit the cap. */
      bfsCapped: boolean;
    };

/**
 * Run the full proof flow for profiles A and B on the given shape.
 */
export function prove(
  profileA: number[][],
  profileB: number[][],
  basis: InvariantBasis,
): ProofResult {
  const wordA = computeWord(profileA, basis);
  const wordB = computeWord(profileB, basis);
  const allNames = [...basis.canonical, ...basis.extras];

  // Find disagreeing fingerprints
  const disagreeing: DisagreeingFingerprint[] = [];
  for (let i = 0; i < wordA.length; i++) {
    if (wordA[i] !== wordB[i]) {
      disagreeing.push({
        name: allNames[i].name,
        valueA: wordA[i],
        valueB: wordB[i],
        index: i,
      });
    }
  }

  // Case: words match -> reachable
  if (disagreeing.length === 0) {
    const bfsResult = findMoveSequence(profileA, profileB, basis);
    if (bfsResult.status === 'identical') {
      return { type: 'identical' };
    }
    if (bfsResult.status === 'found') {
      return { type: 'reachable', sequence: bfsResult.sequence };
    }
    if (bfsResult.status === 'too_large') {
      // Words match but BFS can't find the path — return reachable with empty sequence
      // (theoretically reachable but path too long to find)
      return { type: 'reachable', sequence: [] };
    }
    // Shouldn't happen if words match, but be safe
    return { type: 'reachable', sequence: [] };
  }

  // Case: words disagree -> unreachable
  // Try exhaustive BFS if shape is small enough
  if (basis.cells.length <= EXHAUSTIVE_BFS_CELL_LIMIT) {
    const enumResult = enumerateReachable(profileA, basis);
    if (!enumResult.capped) {
      // Check target is not in the set
      const targetVec = basis.cells.map(c => mod3(profileB[c.row][c.col]));
      const targetKey = targetVec.join(',');
      const targetInSet = enumResult.states.has(targetKey);

      if (!targetInSet) {
        return {
          type: 'unreachable_exhaustive',
          totalReachable: enumResult.states.size,
          disagreeing,
        };
      }
    }

    // BFS was capped — fall back to algebraic
    return {
      type: 'unreachable_algebraic',
      disagreeing,
      bfsCapped: true,
    };
  }

  // Large shape — algebraic proof only
  return {
    type: 'unreachable_algebraic',
    disagreeing,
    bfsCapped: false,
  };
}
