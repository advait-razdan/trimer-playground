import { describe, it, expect } from 'vitest';
import { createFullMask } from '../src/state/polyomino';
import { computeInvariantBasis, computeWord } from '../src/state/invariants';
import { gf3NullSpace } from '../src/state/gf3';
import {
  quadCount,
  quadIndex,
  triplesFromBasis,
  buildLinearRows,
  buildQuadRows,
  type Triple,
} from '../src/strict/nullSpace';
import {
  computeStrictBasis,
  evalAllStrict,
  evalStrict,
  cellValues,
  strictVerdict,
} from '../src/strict/fingerprints';

function rectBasis(rows: number, cols: number) {
  return computeInvariantBasis(createFullMask(rows, cols));
}

/**
 * Reference implementation: build the combined constraint matrix literally as the
 * strict-model spec describes it, over N + N(N+1)/2 columns, with no exploitation of
 * the block structure. Slow, but it is the definition, so it is what the fast path
 * must agree with.
 */
function buildCombinedMatrix(N: number, triples: Triple[]): number[][] {
  const NQ = quadCount(N);
  const width = N + NQ;
  const rows: number[][] = [];

  for (const t of triples) {
    // Linear: sum_{p in T} b_p = 0
    const lin = new Array(width).fill(0);
    for (const p of t) lin[p] += 1;
    rows.push(lin);

    // Quadratic (a): S_T = 0
    const s = new Array(width).fill(0);
    for (const p of t) s[N + quadIndex(N, p, p)] += 1;
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) s[N + quadIndex(N, t[i], t[j])] += 1;
    }
    rows.push(s);

    // Quadratic (b): X_{T,l} = 0 for every cell outside T
    for (let l = 0; l < N; l++) {
      if (t.includes(l)) continue;
      const x = new Array(width).fill(0);
      for (const p of t) x[N + quadIndex(N, p, l)] += 1;
      rows.push(x);
    }
  }
  return rows;
}

/** Dimensions of the three nested classes, from the literal combined matrix. */
function referenceClassDims(N: number, triples: Triple[]) {
  const NQ = quadCount(N);
  const width = N + NQ;
  const M = buildCombinedMatrix(N, triples);

  const pin = (predicate: (p: number, q: number) => boolean) => {
    const extra: number[][] = [];
    for (let p = 0; p < N; p++) {
      for (let q = p; q < N; q++) {
        if (!predicate(p, q)) continue;
        const row = new Array(width).fill(0);
        row[N + quadIndex(N, p, q)] = 1;
        extra.push(row);
      }
    }
    return gf3NullSpace([...M, ...extra]).length;
  };

  const dimV = gf3NullSpace(M).length;
  const dimL = pin(() => true); // all quadratic coordinates zero
  const dimD = pin((p, q) => p !== q); // cross terms zero
  return { purelyLinear: dimL, quasi: dimD - dimL, cross: dimV - dimD, total: dimV };
}

describe('combined constraint matrix (reference) vs block-split fast path', () => {
  for (const [r, c] of [
    [2, 3],
    [3, 3],
    [2, 4],
    [3, 4],
  ] as const) {
    it(`${r}x${c}: fast path reproduces the literal combined matrix`, () => {
      const basis = rectBasis(r, c);
      const triples = triplesFromBasis(basis);
      const ref = referenceClassDims(basis.cells.length, triples);

      const strict = computeStrictBasis(basis)!;
      expect(strict.linearDim).toBe(ref.purelyLinear);
      expect(strict.quasiDim).toBe(ref.quasi);
      expect(strict.crossDim).toBe(ref.cross);
      expect(strict.linearDim + strict.quasiDim + strict.crossDim).toBe(ref.total);
    });
  }
});

describe('strict fingerprint counts (spec table)', () => {
  const table: [number, number, number, number, number][] = [
    // rows, cols, purely linear, quasi, cross
    [3, 3, 4, 4, 10],
    [3, 4, 4, 4, 10],
    [3, 6, 4, 4, 10],
    [4, 4, 4, 4, 10],
    [4, 5, 4, 4, 10],
    [5, 5, 4, 4, 10],
    [6, 6, 4, 4, 10],
    [2, 3, 4, 4, 10],
    [2, 6, 4, 4, 12],
    [2, 9, 4, 4, 12],
  ];

  for (const [r, c, L, Q, X] of table) {
    it(`${r}x${c} -> ${L} linear, ${Q} quasi, ${X} cross (total ${L + Q + X})`, () => {
      const basis = rectBasis(r, c);
      const strict = computeStrictBasis(basis)!;
      expect(strict.linearDim).toBe(L);
      expect(strict.quasiDim).toBe(Q);
      expect(strict.crossDim).toBe(X);
      expect(strict.linearDim + strict.quasiDim + strict.crossDim).toBe(L + Q + X);
    });
  }
});

describe('every strict fingerprint really is invariant under strict moves', () => {
  // Exhaustive over shapes, triples, common values v, and multipliers m.
  for (const [r, c] of [
    [3, 3],
    [2, 6],
    [3, 4],
  ] as const) {
    it(`${r}x${c}: values are unchanged by every legal trimer placement`, () => {
      const basis = rectBasis(r, c);
      const strict = computeStrictBasis(basis)!;
      const triples = triplesFromBasis(basis);
      const N = basis.cells.length;

      // A profile whose values we control per cell index.
      const makeProfile = (a: number[]) => {
        const g = Array.from({ length: r }, () => new Array(c).fill(0));
        basis.cells.forEach((cell, i) => {
          g[cell.row][cell.col] = a[i];
        });
        return g;
      };

      // A few pseudo-random starting profiles, plus all-zeros.
      const seeds: number[][] = [new Array(N).fill(0)];
      for (let s = 1; s <= 5; s++) {
        seeds.push(Array.from({ length: N }, (_, i) => (i * s * 7 + s) % 3));
      }

      for (const seed of seeds) {
        for (const t of triples) {
          for (let v = 0; v < 3; v++) {
            // Force the triple's cells to the common value v -> the move is legal.
            const a = seed.slice();
            for (const p of t) a[p] = v;
            const before = evalAllStrict(strict, makeProfile(a), basis);

            for (const m of [1, 2]) {
              const after = a.slice();
              for (const p of t) after[p] = (after[p] + m) % 3;
              expect(evalAllStrict(strict, makeProfile(after), basis)).toEqual(before);
            }
          }
        }
      }
    });
  }
});

describe('all-zeros profile', () => {
  for (const [r, c] of [
    [3, 3],
    [4, 5],
    [2, 9],
  ] as const) {
    it(`${r}x${c}: every strict fingerprint evaluates to 0`, () => {
      const basis = rectBasis(r, c);
      const strict = computeStrictBasis(basis)!;
      const zeros = Array.from({ length: r }, () => new Array(c).fill(0));
      const vals = evalAllStrict(strict, zeros, basis);
      expect(vals.every(v => v === 0)).toBe(true);
      expect(vals.length).toBe(strict.fingerprints.length);
    });
  }
});

describe('+3 and mod-3 leave strict fingerprints alone', () => {
  it('adding 3 to a cell, and reducing mod 3, are invisible', () => {
    const basis = rectBasis(3, 4);
    const strict = computeStrictBasis(basis)!;
    const p = [
      [1, 0, 2, 1],
      [0, 2, 1, 0],
      [2, 1, 0, 2],
    ];
    const base = evalAllStrict(strict, p, basis);

    const plus3 = p.map(row => row.slice());
    plus3[1][2] += 3;
    expect(evalAllStrict(strict, plus3, basis)).toEqual(base);

    const raised = p.map(row => row.map(v => v + 6));
    expect(evalAllStrict(strict, raised, basis)).toEqual(base);
  });
});

describe('3x3 rectangle sanity', () => {
  const profile = [
    [1, 0, 2],
    [0, 1, 0],
    [2, 0, 1],
  ];

  it('loose F1-F4 are (1, 1, 1, 2), matching the old tab', () => {
    const basis = rectBasis(3, 3);
    expect(basis.canonical.map(f => f.name)).toEqual(['F1', 'F2', 'F3', 'F4']);
    expect(computeWord(profile, basis)).toEqual([1, 1, 1, 2]);
  });

  it('quasi-linear Q1-Q4 are (2, 2, 2, 2)', () => {
    const basis = rectBasis(3, 3);
    const strict = computeStrictBasis(basis)!;
    const vals = evalAllStrict(strict, profile, basis);
    const quasi = strict.fingerprints
      .map((f, i) => ({ f, v: vals[i] }))
      .filter(({ f }) => f.kind === 'quasi');
    expect(quasi.map(({ f }) => f.name)).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    expect(quasi.map(({ v }) => v)).toEqual([2, 2, 2, 2]);
  });

  it('each Q carries the weights of the loose fingerprint it is named for', () => {
    const basis = rectBasis(3, 3);
    const strict = computeStrictBasis(basis)!;
    const quasi = strict.fingerprints.filter(f => f.kind === 'quasi');
    expect(quasi.map(f => f.source)).toEqual(['F1', 'F2', 'F3', 'F4']);

    // Q_i on a profile equals F_i applied to the indicator of the nonzero cells.
    const a = cellValues(profile, basis);
    const indicator = a.map(v => (v === 0 ? 0 : 1));
    quasi.forEach((f, i) => {
      const w = basis.canonical[i].weights;
      const expected = w.reduce((s, wp, p) => s + wp * indicator[p], 0) % 3;
      expect(evalStrict(f.c, a)).toBe(expected);
    });
  });
});

describe('2x9 counterexample', () => {
  const A = [
    [1, 0, 0, 1, 0, 1, 0, 1, 0],
    [1, 0, 0, 1, 0, 1, 0, 1, 0],
  ];
  const B = [
    [1, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 0],
  ];

  it('A is a strict fixed point: no three consecutive cells are ever equal', () => {
    const basis = rectBasis(2, 9);
    const a = cellValues(A, basis);
    for (const t of triplesFromBasis(basis)) {
      const equal = a[t[0]] === a[t[1]] && a[t[1]] === a[t[2]];
      expect(equal).toBe(false);
    }
  });

  it('the loose model sees no obstruction (this is the bug being fixed)', () => {
    const basis = rectBasis(2, 9);
    expect(computeWord(A, basis)).toEqual(computeWord(B, basis));
  });

  it('the quasi-linear fingerprints also agree — only cross terms separate A from B', () => {
    const basis = rectBasis(2, 9);
    const strict = computeStrictBasis(basis)!;
    const valsA = evalAllStrict(strict, A, basis);
    const valsB = evalAllStrict(strict, B, basis);

    const disagree = strict.fingerprints.filter((_, i) => valsA[i] !== valsB[i]);
    expect(disagree.length).toBeGreaterThan(0);
    expect(disagree.every(f => f.kind === 'cross')).toBe(true);
  });

  it('the verdict is a strict-fingerprint mismatch', () => {
    const basis = rectBasis(2, 9);
    const strict = computeStrictBasis(basis)!;
    const verdict = strictVerdict(
      strict,
      basis,
      A,
      B,
      computeWord(A, basis),
      computeWord(B, basis),
    );
    expect(verdict.type).toBe('strict-mismatch');
    if (verdict.type === 'strict-mismatch') {
      expect(verdict.disagreeing.length).toBeGreaterThan(0);
      expect(verdict.disagreeing.every(n => n.startsWith('X'))).toBe(true);
    }
  });
});

describe('backward compatibility with the loose verdict', () => {
  it('a loose mismatch is always reported as a loose mismatch, never overridden', () => {
    const basis = rectBasis(3, 3);
    const strict = computeStrictBasis(basis)!;
    const A = [
      [1, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const B = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const verdict = strictVerdict(strict, basis, A, B, computeWord(A, basis), computeWord(B, basis));
    expect(verdict.type).toBe('loose-mismatch');
  });

  it('identical profiles are always consistent', () => {
    const basis = rectBasis(4, 4);
    const strict = computeStrictBasis(basis)!;
    const A = [
      [1, 2, 0, 1],
      [0, 0, 2, 2],
      [1, 1, 1, 0],
      [2, 0, 1, 2],
    ];
    const verdict = strictVerdict(strict, basis, A, A, computeWord(A, basis), computeWord(A, basis));
    expect(verdict.type).toBe('consistent');
  });

  it('over random profile pairs, a strict mismatch never occurs without loose agreement', () => {
    const basis = rectBasis(3, 4);
    const strict = computeStrictBasis(basis)!;
    let seed = 12345;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % 3;
    };
    const mk = () => Array.from({ length: 3 }, () => Array.from({ length: 4 }, rnd));

    for (let trial = 0; trial < 200; trial++) {
      const A = mk();
      const B = mk();
      const wA = computeWord(A, basis);
      const wB = computeWord(B, basis);
      const verdict = strictVerdict(strict, basis, A, B, wA, wB);
      const looseAgrees = wA.every((v, i) => v === wB[i]);
      if (!looseAgrees) {
        expect(verdict.type).toBe('loose-mismatch');
      } else {
        expect(['strict-mismatch', 'consistent']).toContain(verdict.type);
      }
    }
  });
});

describe('linear block is exactly the loose model', () => {
  it('null space of the linear rows equals the shape word length', () => {
    for (const [r, c] of [
      [3, 3],
      [2, 9],
      [4, 5],
    ] as const) {
      const basis = rectBasis(r, c);
      const N = basis.cells.length;
      const rows = buildLinearRows(N, triplesFromBasis(basis));
      expect(gf3NullSpace(rows).length).toBe(basis.wordLength);
    }
  });

  it('quadratic rows have the expected shape', () => {
    const basis = rectBasis(3, 3);
    const N = basis.cells.length;
    const triples = triplesFromBasis(basis);
    // The generator reuses its buffer, so snapshot each row before counting.
    const rows = [...buildQuadRows(N, triples)].map(r => Uint8Array.from(r));
    // One S_T row plus (N - 3) X rows per triple.
    expect(rows.length).toBe(triples.length * (1 + (N - 3)));
    expect(rows[0].length).toBe(quadCount(N));
  });
});

describe('degenerate shape with no legal trimer', () => {
  it('2x2: no move is ever legal, so every polynomial is invariant', () => {
    const basis = rectBasis(2, 2);
    expect(triplesFromBasis(basis).length).toBe(0);

    const strict = computeStrictBasis(basis)!;
    const N = basis.cells.length;
    // The whole quadratic space is the null space; the diagonal part is the Q's.
    expect(strict.quasiDim).toBe(strict.linearDim);
    expect(strict.quasiDim + strict.crossDim).toBe(quadCount(N));
  });
});
