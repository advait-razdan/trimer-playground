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
import { findMoveSequence, enumerateReachable, encodeProfile } from './bfs';
import type { MoveStep } from './bfs';

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

  // Case: words match -> the fingerprints permit reachability. Search for a path.
  if (disagreeing.length === 0) {
    const bfsResult = findMoveSequence(profileA, profileB, basis);
    if (bfsResult.status === 'identical') {
      return { type: 'identical' };
    }
    if (bfsResult.status === 'found') {
      return { type: 'reachable', sequence: bfsResult.sequence };
    }
    if (bfsResult.status === 'unreachable') {
      // The search exhausted every state reachable from A within budget and never
      // found B. That is a proof: the fingerprints ignore the equal-cells rule, so
      // matching words are necessary but not always sufficient.
      return {
        type: 'unreachable_exhaustive',
        totalReachable: enumerateReachable(profileA, basis).states.size,
        disagreeing,
      };
    }
    // too_large: words match, but the search hit the state cap before finding a path.
    return { type: 'reachable', sequence: [] };
  }

  // Case: words disagree -> unreachable
  // Try exhaustive BFS if shape is small enough
  if (basis.cells.length <= EXHAUSTIVE_BFS_CELL_LIMIT) {
    const enumResult = enumerateReachable(profileA, basis);
    if (!enumResult.capped) {
      // Check target is not in the set
      const targetInSet = enumResult.states.has(encodeProfile(profileB, basis));

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
