/**
 * Naming, evaluation and working displays for the strict-model fingerprints.
 *
 * Q1, Q2, ... are the quasi-linear fingerprints: weights on a_p^2. Over GF(3) the
 * square of a value is its indicator (0^2 = 0, 1^2 = 1, 2^2 = 4 = 1), so a Q is a
 * weighted count of the nonzero cells. Each Q carries the weights of one loose
 * fingerprint (F1-F4, or an E extra), which is why there are exactly as many Q's as
 * there are loose fingerprints on the shape.
 *
 * X1, X2, ... are the cross-term fingerprints. They are basis vectors of a quotient
 * space and have no clean closed form; they are not individually meaningful, only
 * their values are.
 */

import type { InvariantBasis } from '../state/invariants';
import type { StrictNullSpace } from './nullSpace';
import { computeStrictNullSpace, quadIndex } from './nullSpace';

/** Non-negative modulo 3. */
function mod3(n: number): number {
  return ((n % 3) + 3) % 3;
}

export interface NamedStrictFingerprint {
  /** Q1, Q2, ... or X1, X2, ... */
  name: string;
  kind: 'quasi' | 'cross';
  /** For a Q, the loose fingerprint whose weights it carries (F1, E2, ...). */
  source?: string;
  /** Coefficients c_{p,q}, lex order over p <= q. */
  c: number[];
}

export interface StrictBasis {
  /** Number of active cells. */
  N: number;
  /** The named quasi-linear and cross-term fingerprints, in display order. */
  fingerprints: NamedStrictFingerprint[];
  /** Dimension of the purely-linear part (the loose model). */
  linearDim: number;
  quasiDim: number;
  crossDim: number;
}

/**
 * Build the named strict fingerprints for a shape.
 * Returns null when the shape is too large (see MAX_STRICT_CELLS).
 */
export function computeStrictBasis(basis: InvariantBasis): StrictBasis | null {
  const ns: StrictNullSpace | null = computeStrictNullSpace(basis);
  if (ns === null) return null;

  const looseNames = [...basis.canonical, ...basis.extras].map(f => f.name);

  const fingerprints: NamedStrictFingerprint[] = [
    ...ns.quasi.map((v, i) => ({
      name: `Q${i + 1}`,
      kind: 'quasi' as const,
      source: looseNames[i],
      c: v.c,
    })),
    ...ns.cross.map((v, i) => ({
      name: `X${i + 1}`,
      kind: 'cross' as const,
      c: v.c,
    })),
  ];

  return {
    N: ns.N,
    fingerprints,
    linearDim: ns.linearDim,
    quasiDim: ns.quasi.length,
    crossDim: ns.cross.length,
  };
}

/** Read a profile's active-cell values, reduced mod 3. */
export function cellValues(profile: number[][], basis: InvariantBasis): number[] {
  return basis.cells.map(c => mod3(profile[c.row][c.col]));
}

/** Evaluate a quadratic fingerprint on a profile's cell values. */
export function evalStrict(c: number[], a: number[]): number {
  const N = a.length;
  let total = 0;
  for (let p = 0; p < N; p++) {
    if (a[p] === 0) continue;
    for (let q = p; q < N; q++) {
      if (a[q] === 0) continue;
      const coeff = c[quadIndex(N, p, q)];
      if (coeff === 0) continue;
      total += coeff * a[p] * a[q];
    }
  }
  return mod3(total);
}

/** Evaluate every strict fingerprint on a profile. */
export function evalAllStrict(
  strict: StrictBasis,
  profile: number[][],
  basis: InvariantBasis,
): number[] {
  const a = cellValues(profile, basis);
  return strict.fingerprints.map(f => evalStrict(f.c, a));
}

export interface StrictTrace {
  name: string;
  /** One line per contributing term. */
  lines: string[];
  /** Number of terms omitted from `lines`. */
  omitted: number;
  total: number;
  result: number;
}

/** Maximum term lines shown in a working display before truncating. */
const MAX_TRACE_LINES = 24;

/**
 * Working display for one strict fingerprint on a profile.
 * Only terms that actually contribute (nonzero coefficient and nonzero cells) appear.
 */
export function computeStrictTrace(
  fp: NamedStrictFingerprint,
  profile: number[][],
  basis: InvariantBasis,
): StrictTrace {
  const a = cellValues(profile, basis);
  const N = a.length;
  const lines: string[] = [];
  let total = 0;
  let omitted = 0;

  const label = (i: number) => {
    const cell = basis.cells[i];
    return `(${cell.row},${cell.col})`;
  };

  for (let p = 0; p < N; p++) {
    if (a[p] === 0) continue;
    for (let q = p; q < N; q++) {
      if (a[q] === 0) continue;
      const coeff = fp.c[quadIndex(N, p, q)];
      if (coeff === 0) continue;

      const term = coeff * a[p] * a[q];
      total += term;

      if (lines.length < MAX_TRACE_LINES) {
        if (p === q) {
          // a^2 is the indicator of "cell is nonzero" over GF(3).
          lines.push(`${label(p)}: a=${a[p]}, a²=${mod3(a[p] * a[p])}, w=${coeff} → ${term}`);
        } else {
          lines.push(`${label(p)}·${label(q)}: ${a[p]}·${a[q]}, c=${coeff} → ${term}`);
        }
      } else {
        omitted++;
      }
    }
  }

  return { name: fp.name, lines, omitted, total, result: mod3(total) };
}

export type StrictVerdict =
  | { type: 'loose-mismatch'; disagreeing: string[] }
  | { type: 'strict-mismatch'; disagreeing: string[] }
  | { type: 'consistent' }
  | { type: 'unavailable' };

/**
 * The verdict shown by the strict tabs.
 *
 * Deliberately never returns a positive "reachable". Matching fingerprints only mean
 * that no invariant we know of separates A from B. A positive answer requires an
 * actual move sequence, which is what the Prove modal's strict search produces.
 *
 * The loose check runs first, so a strict tab can never contradict the loose verdict
 * shown by the old tabs -- it can only refine "no loose obstruction" into
 * "no loose obstruction, but a strict one".
 */
export function strictVerdict(
  strict: StrictBasis | null,
  basis: InvariantBasis,
  profileA: number[][],
  profileB: number[][],
  looseWordA: number[],
  looseWordB: number[],
): StrictVerdict {
  const looseNames = [...basis.canonical, ...basis.extras].map(f => f.name);
  const looseBad = looseNames.filter((_, i) => looseWordA[i] !== looseWordB[i]);
  if (looseBad.length > 0) return { type: 'loose-mismatch', disagreeing: looseBad };

  if (strict === null) return { type: 'unavailable' };

  const valsA = evalAllStrict(strict, profileA, basis);
  const valsB = evalAllStrict(strict, profileB, basis);
  const strictBad = strict.fingerprints
    .filter((_, i) => valsA[i] !== valsB[i])
    .map(f => f.name);

  if (strictBad.length > 0) return { type: 'strict-mismatch', disagreeing: strictBad };
  return { type: 'consistent' };
}
