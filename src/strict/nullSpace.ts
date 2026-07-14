/**
 * Strict-model null space over GF(3).
 *
 * The loose model asks whether B - A lies in the GF(3) span of the trimer vectors.
 * The strict model additionally demands that the three cells of a trimer be *equal*
 * at the moment the trimer is placed. That equality constraint preserves quantities
 * the loose model cannot see, and they are quadratic in the profile values.
 *
 * Derivation. A strict move picks a triple T whose cells all hold the common value v,
 * and adds m to each (m = 1 or 2; m = 2 is just two successive m = 1 moves, since the
 * cells stay equal). For a candidate polynomial
 *
 *     P(a) = sum_p b_p a_p + sum_{p <= q} c_{p,q} a_p a_q
 *
 * the change induced by that move is
 *
 *     dP = m * sum_{p in T} b_p
 *        + (2vm + m^2) * S_T
 *        + m * sum_{l not in T} a_l * X_{T,l}
 *
 *     S_T   = sum_{p in T} c_{p,p} + sum_{p < q, both in T} c_{p,q}
 *     X_{T,l} = sum_{p in T} c_{min(p,l), max(p,l)}
 *
 * The cells outside T are unconstrained, so each a_l coefficient must vanish
 * independently: X_{T,l} = 0. With m = 1 and v = 1 the middle term is 3*S_T = 0, so
 * sum_{p in T} b_p = 0; feeding that back with v = 0 gives S_T = 0. Those three
 * families are exactly the strict-fingerprint constraints.
 *
 * Block structure. The linear constraints touch only b and the quadratic constraints
 * touch only c, so the combined constraint matrix is block diagonal and its null space
 * splits as V = L (+) C. We solve the two blocks separately. This is not merely an
 * optimisation: the combined matrix has N + N(N+1)/2 columns, and eliminating it whole
 * is intractable well before the shape editor's 12x12 ceiling. See MAX_STRICT_CELLS.
 *
 * `tests/strict-null-space.test.ts` cross-checks this splitting against a literal,
 * unsplit build of the combined matrix on small shapes.
 */

import type { InvariantBasis } from '../state/invariants';

/** Three cell indices forming a horizontal or vertical trimer, ascending. */
export type Triple = [number, number, number];

/**
 * Shapes above this many cells do not get strict fingerprints.
 *
 * The quadratic block has N(N+1)/2 unknowns, and the elimination below costs roughly
 * O(N^6) in the worst case but behaves far better in practice because the constraint
 * rows arrive sparse. Measured, single-threaded:
 *
 *     36 cells (6x6)     26ms       81 cells (9x9)     422ms
 *     64 cells (8x8)    185ms      100 cells (10x10)   1.1s
 *                                  144 cells (12x12)   8.0s
 *
 * 100 cells covers the Rectangular tab's entire editor range (it maxes at 10x10), so
 * that tab never has to say "not computed". Above it, the tabs render an explanatory
 * note. This is a latency budget, not a mathematical boundary: the constraints are
 * well defined at every N, and the fingerprint counts stay 4/4/10 throughout.
 */
export const MAX_STRICT_CELLS = 100;

/** Non-negative modulo 3. */
function mod3(n: number): number {
  return ((n % 3) + 3) % 3;
}

/** Number of quadratic variables c_{p,q} with p <= q. */
export function quadCount(N: number): number {
  return (N * (N + 1)) / 2;
}

/**
 * Index of c_{p,q} within the quadratic block, in lex order of (p, q) with p <= q.
 * Order matches the variable ordering in the strict-model spec.
 */
export function quadIndex(N: number, p: number, q: number): number {
  const a = p < q ? p : q;
  const b = p < q ? q : p;
  return a * N - (a * (a - 1)) / 2 + (b - a);
}

/** Recover the trimer triples from an invariant basis's move vectors. */
export function triplesFromBasis(basis: InvariantBasis): Triple[] {
  return basis.moves.map(move => {
    const idx: number[] = [];
    for (let i = 0; i < move.vector.length; i++) {
      if (move.vector[i] !== 0) idx.push(i);
    }
    return idx as Triple;
  });
}

/**
 * Rows of the linear block: sum_{p in T} b_p = 0, one row per triple, N columns.
 * This is the loose model -- its null space is what F1-F4 (and the E extras) span.
 */
export function buildLinearRows(N: number, triples: Triple[]): number[][] {
  return triples.map(t => {
    const row = new Array(N).fill(0);
    for (const p of t) row[p] += 1;
    return row;
  });
}

/**
 * Rows of the quadratic block over the N(N+1)/2 variables c_{p,q}.
 * One S_T row per triple, plus one X_{T,l} row per (triple, outside cell) pair.
 *
 * A generator, and it yields the *same* buffer every time. There are ~2N(N-2) rows of
 * N(N+1)/2 bytes each; materialising them all would cost 79MB at 10x10 and 356MB at
 * 12x12. `gf3NullSpaceRows` copies each row before touching it, so reuse is safe.
 */
export function* buildQuadRows(N: number, triples: Triple[]): Generator<Uint8Array> {
  const NQ = quadCount(N);
  const row = new Uint8Array(NQ);
  const inT = new Uint8Array(N);

  for (const t of triples) {
    inT.fill(0);
    for (const p of t) inT[p] = 1;

    // S_T: diagonal terms of T plus the three pair terms inside T.
    row.fill(0);
    for (const p of t) row[quadIndex(N, p, p)] = (row[quadIndex(N, p, p)] + 1) % 3;
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const k = quadIndex(N, t[i], t[j]);
        row[k] = (row[k] + 1) % 3;
      }
    }
    yield row;

    // X_{T,l}: for every cell outside T, the three cross terms joining it to T.
    for (let l = 0; l < N; l++) {
      if (inT[l]) continue;
      row.fill(0);
      for (const p of t) {
        const k = quadIndex(N, p, l);
        row[k] = (row[k] + 1) % 3;
      }
      yield row;
    }
  }
}

/**
 * Null space over GF(3) of a matrix given as dense Uint8Array rows.
 *
 * Incremental row-echelon insertion (rows arrive sparse, so most insertions cost
 * little), then a back-substitution pass over the pivot rows to reach reduced form,
 * then the standard free-column basis extraction. Equivalent to `gf3NullSpace` from
 * `state/gf3.ts`, but on typed arrays and without materialising the full matrix in
 * reduced form -- the quadratic block is far too big for that.
 */
export function gf3NullSpaceRows(rows: Iterable<Uint8Array>, ncols: number): number[][] {
  // pivotRow[c] is a row whose leading nonzero column is c, scaled to lead with 1.
  const pivotRow: (Uint8Array | null)[] = new Array(ncols).fill(null);

  for (const original of rows) {
    const row = Uint8Array.from(original);
    for (let c = 0; c < ncols; c++) {
      if (row[c] === 0) continue;
      const pr = pivotRow[c];
      if (pr === null) {
        // Scale to a leading 1 (inverse of x is x in GF(3)) and install as pivot.
        const inv = row[c];
        if (inv === 2) {
          for (let k = c; k < ncols; k++) row[k] = (row[k] * 2) % 3;
        }
        pivotRow[c] = row;
        break;
      }
      // Eliminate column c. Entries below c are all zero in pr, so start there.
      const f = row[c];
      if (f === 1) {
        for (let k = c; k < ncols; k++) row[k] = (row[k] + 2 * pr[k]) % 3;
      } else {
        for (let k = c; k < ncols; k++) row[k] = (row[k] + pr[k]) % 3;
      }
    }
  }

  const pivots: number[] = [];
  for (let c = 0; c < ncols; c++) if (pivotRow[c] !== null) pivots.push(c);

  // Back-substitute so each pivot column is zero in every other pivot row.
  for (let i = pivots.length - 1; i >= 0; i--) {
    const pc = pivots[i];
    const pr = pivotRow[pc]!;
    for (let j = 0; j < i; j++) {
      const target = pivotRow[pivots[j]]!;
      const f = target[pc];
      if (f === 0) continue;
      const mult = 3 - f;
      for (let k = pc; k < ncols; k++) target[k] = (target[k] + mult * pr[k]) % 3;
    }
  }

  const isPivot = new Uint8Array(ncols);
  for (const c of pivots) isPivot[c] = 1;

  const basis: number[][] = [];
  for (let f = 0; f < ncols; f++) {
    if (isPivot[f]) continue;
    const v = new Array(ncols).fill(0);
    v[f] = 1;
    for (const pc of pivots) v[pc] = mod3(-pivotRow[pc]![f]);
    basis.push(v);
  }
  return basis;
}

/** A strict fingerprint living entirely in the quadratic block. */
export interface StrictVector {
  /** Coefficients c_{p,q} in lex order of (p, q), p <= q. Length N(N+1)/2. */
  c: number[];
}

export interface StrictNullSpace {
  /** Number of active cells. */
  N: number;
  /** Dimension of the purely-linear part: the loose model, spanned by F1-F4 (+ extras). */
  linearDim: number;
  /** Quasi-linear vectors: nonzero only on the diagonal c_{p,p}. */
  quasi: StrictVector[];
  /** Cross-term vectors: at least one nonzero c_{p,q} with p != q. */
  cross: StrictVector[];
}

/**
 * Compute the strict-model null space and split it into the three classes.
 *
 * The split is a filtration and so is basis independent:
 *   purely linear = dim(V and {quadratic part = 0})
 *   quasi linear  = dim(V and {cross terms = 0}) - purely linear
 *   cross term    = dim(V) - dim(V and {cross terms = 0})
 *
 * Setting the cross terms to zero collapses S_T to sum_{p in T} c_{p,p} and kills every
 * X_{T,l} identically, so the diagonal obeys the *same* system as b. Hence the quasi
 * space is a second copy of the loose null space, carried on a_p^2 rather than a_p,
 * and there are exactly `linearDim` of them. We build them directly from the loose
 * basis rather than fishing them out of a generic null-space basis, which keeps their
 * names aligned with F1-F4/E1-E2 and makes the working display readable.
 *
 * Returns null when the shape exceeds MAX_STRICT_CELLS.
 */
export function computeStrictNullSpace(basis: InvariantBasis): StrictNullSpace | null {
  const N = basis.cells.length;
  if (N > MAX_STRICT_CELLS) return null;

  const triples = triplesFromBasis(basis);
  const NQ = quadCount(N);

  // The loose null space, reused from the existing invariant basis so that the Q
  // fingerprints inherit the F1-F4 / E1-E2 ordering the old tabs already display.
  const looseVecs = [...basis.canonical, ...basis.extras].map(f => f.weights);
  const linearDim = looseVecs.length;

  // No special case for a triple-free shape: with no constraint rows the solver below
  // returns the full standard basis, which is right -- if no move is ever legal then
  // every polynomial is trivially invariant.
  const quadBasis = gf3NullSpaceRows(buildQuadRows(N, triples), NQ);
  const quasi = looseVecs.map(w => diagVector(N, NQ, w));

  // Extend the quasi (diagonal) subspace to a basis of the quadratic null space.
  // Anything that raises the rank must carry a nonzero cross term, since a null-space
  // vector with no cross terms lies in the diagonal subspace by definition.
  const pivotOf: (number[] | null)[] = new Array(NQ).fill(null);

  /** Reduce `vec` against the pivots; install and return true if it is independent. */
  const addIfIndependent = (vec: number[]): boolean => {
    const row = vec.slice();
    for (let c = 0; c < NQ; c++) {
      if (row[c] === 0) continue;
      const pr = pivotOf[c];
      if (pr === null) {
        if (row[c] === 2) {
          for (let k = c; k < NQ; k++) row[k] = (row[k] * 2) % 3;
        }
        pivotOf[c] = row;
        return true;
      }
      const mult = 3 - row[c];
      for (let k = c; k < NQ; k++) row[k] = (row[k] + mult * pr[k]) % 3;
    }
    return false;
  };

  for (const v of quasi) addIfIndependent(v.c);

  const cross: StrictVector[] = [];
  for (const v of quadBasis) {
    if (addIfIndependent(v)) cross.push({ c: v });
  }

  return { N, linearDim, quasi, cross };
}

/** Lift a loose weight vector w onto the diagonal: c_{p,p} = w[p], no cross terms. */
function diagVector(N: number, NQ: number, w: number[]): StrictVector {
  const c = new Array(NQ).fill(0);
  for (let p = 0; p < N; p++) c[quadIndex(N, p, p)] = mod3(w[p]);
  return { c };
}
