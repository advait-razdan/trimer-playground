/**
 * Move-sequence search for polyomino trimer reachability.
 *
 * Works in the space of mod-3 cell vectors (one entry per active cell).
 *
 * `findMoveSequence` is A* with the heuristic h(x) = ceil(hamming(x, B) / 3).
 * A move changes exactly 3 cells, so it can close at most 3 mismatches against B;
 * h therefore never overestimates the remaining move count (admissible) and changes
 * by at most 1 across any edge (consistent). With unit edge costs that makes the
 * first pop of a state final, and the returned sequence a shortest one.
 *
 * This matters enormously in practice. Plain BFS from an all-zeros grid fans out by
 * ~96 successors per state and exhausts the 500k cap around depth 4 — it could never
 * reach a depth-8 target on a 6x6. Under h, the successors that scatter values away
 * from B are pruned immediately, so the same 8-move search expands single-digit nodes.
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

/**
 * Encode a mod-3 cell vector as a string key: one character per cell.
 * Much smaller than "0,2,1,..." (N chars instead of 2N-1) and cheaper to build.
 */
function encodeState(state: Int8Array): string {
  return String.fromCharCode(...state);
}

/** Decode a state key back into a reusable scratch buffer. */
function decodeInto(key: string, out: Int8Array): void {
  for (let i = 0; i < out.length; i++) out[i] = key.charCodeAt(i);
}

/** Extract a profile's mod-3 cell vector. */
function profileToState(profile: number[][], basis: InvariantBasis): Int8Array {
  const state = new Int8Array(basis.cells.length);
  for (let i = 0; i < basis.cells.length; i++) {
    const c = basis.cells[i];
    state[i] = mod3(profile[c.row][c.col]);
  }
  return state;
}

/**
 * Encode a profile directly as a state key.
 * Exported so callers can test membership in the set from `enumerateReachable`.
 */
export function encodeProfile(profile: number[][], basis: InvariantBasis): string {
  return encodeState(profileToState(profile, basis));
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

/** Search node: the edge that best reached this state, plus its cost from the start. */
interface Node {
  /** null for the start state. */
  prevKey: string | null;
  moveIndex: number;
  mult: number;
  g: number;
}

/**
 * A* for an actual sequence of trimer moves from profileA to profileB.
 * Operates in the mod-3 cell-vector space. Returns a shortest sequence.
 *
 * @param profileA - 2D grid (start)
 * @param profileB - 2D grid (target)
 * @param basis - the invariant basis for the shape
 * @param maxStates - cap on discovered states (default 500,000)
 */
export function findMoveSequence(
  profileA: number[][],
  profileB: number[][],
  basis: InvariantBasis,
  maxStates = 500_000,
): BfsResult {
  // Cheap necessary condition: the invariant words must agree.
  const wordA = computeWord(profileA, basis);
  const wordB = computeWord(profileB, basis);
  if (wordA.length !== wordB.length || !wordA.every((v, i) => v === wordB[i])) {
    return { status: 'unreachable' };
  }

  const target = profileToState(profileB, basis);
  const aKey = encodeProfile(profileA, basis);
  const bKey = encodeState(target);

  if (aKey === bKey) {
    return { status: 'identical' };
  }

  const N = basis.cells.length;
  const moves = basis.moves;
  const moveIndices = moves.map(getMoveIndices);
  const scratch = new Int8Array(N);

  /** ceil(hamming(state, target) / 3): admissible and consistent. */
  function heuristic(state: Int8Array): number {
    let mismatches = 0;
    for (let i = 0; i < N; i++) {
      if (state[i] !== target[i]) mismatches++;
    }
    return Math.ceil(mismatches / 3);
  }

  const nodes = new Map<string, Node>([[aKey, { prevKey: null, moveIndex: -1, mult: 0, g: 0 }]]);
  const closed = new Set<string>();

  // f-values are small non-negative integers and never decrease as the search
  // advances (h is consistent), so a bucket queue serves as an O(1) priority queue.
  const buckets: string[][] = [];
  function push(key: string, f: number): void {
    (buckets[f] ??= []).push(key);
  }
  push(aKey, heuristic(profileToState(profileA, basis)));

  for (let f = 0; f < buckets.length; f++) {
    const bucket = buckets[f];
    if (bucket === undefined) continue;

    while (bucket.length > 0) {
      const key = bucket.pop()!;
      if (closed.has(key)) continue; // superseded by a cheaper path
      closed.add(key);

      if (key === bKey) {
        return { status: 'found', sequence: reconstruct(key, nodes, moves) };
      }

      if (nodes.size > maxStates) {
        return { status: 'too_large' };
      }

      const g = nodes.get(key)!.g;
      decodeInto(key, scratch);

      for (let mi = 0; mi < moves.length; mi++) {
        const [i0, i1, i2] = moveIndices[mi];

        // Legality (D17): the 3 cells must be equal before the move.
        if (scratch[i0] !== scratch[i1] || scratch[i1] !== scratch[i2]) continue;

        for (let mult = 1; mult <= 2; mult++) {
          // Only 3 cells change. Mutate, measure, encode, restore.
          scratch[i0] = (scratch[i0] + mult) % 3;
          scratch[i1] = (scratch[i1] + mult) % 3;
          scratch[i2] = (scratch[i2] + mult) % 3;
          const nextKey = encodeState(scratch);
          const nextH = heuristic(scratch);
          const inv = 3 - mult;
          scratch[i0] = (scratch[i0] + inv) % 3;
          scratch[i1] = (scratch[i1] + inv) % 3;
          scratch[i2] = (scratch[i2] + inv) % 3;

          const nextG = g + 1;
          const known = nodes.get(nextKey);
          if (known !== undefined && nextG >= known.g) continue;

          nodes.set(nextKey, { prevKey: key, moveIndex: mi, mult, g: nextG });
          push(nextKey, nextG + nextH);
        }
      }
    }
  }

  // The open list drained without reaching B: every state reachable from A was
  // explored and B was not among them. No path exists, even though the invariant
  // words agreed. (The words ignore the equal-cells rule, so they are a necessary
  // but not always sufficient condition.)
  return { status: 'unreachable' };
}

/** Walk backpointers from the goal to the start, then reverse. */
function reconstruct(goal: string, nodes: Map<string, Node>, moves: TrimerMove[]): MoveStep[] {
  const sequence: MoveStep[] = [];
  for (let cur: string | null = goal; cur !== null; ) {
    const node: Node = nodes.get(cur)!;
    if (node.prevKey === null) break;
    const m = moves[node.moveIndex];
    sequence.push({ direction: m.direction, row: m.row, col: m.col, multiplicity: node.mult });
    cur = node.prevKey;
  }
  sequence.reverse();
  return sequence;
}

/**
 * Enumerate ALL states reachable from a profile.
 * Returns the set of reachable state keys (see `encodeProfile`) and the count.
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
  const N = basis.cells.length;
  const moves = basis.moves;
  const moveIndices = moves.map(getMoveIndices);

  const startKey = encodeProfile(profile, basis);
  const visited = new Set<string>([startKey]);
  const frontier: string[] = [startKey];
  const scratch = new Int8Array(N);

  while (frontier.length > 0) {
    if (visited.size > maxStates) {
      return { states: visited, capped: true };
    }

    const key = frontier.pop()!;
    decodeInto(key, scratch);

    for (let mi = 0; mi < moves.length; mi++) {
      const [i0, i1, i2] = moveIndices[mi];

      // Legality (D17): the 3 cells must be equal before the move.
      if (scratch[i0] !== scratch[i1] || scratch[i1] !== scratch[i2]) continue;

      for (let mult = 1; mult <= 2; mult++) {
        scratch[i0] = (scratch[i0] + mult) % 3;
        scratch[i1] = (scratch[i1] + mult) % 3;
        scratch[i2] = (scratch[i2] + mult) % 3;
        const newKey = encodeState(scratch);
        const inv = 3 - mult;
        scratch[i0] = (scratch[i0] + inv) % 3;
        scratch[i1] = (scratch[i1] + inv) % 3;
        scratch[i2] = (scratch[i2] + inv) % 3;

        if (!visited.has(newKey)) {
          visited.add(newKey);
          frontier.push(newKey);
        }
      }
    }
  }

  return { states: visited, capped: false };
}
