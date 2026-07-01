/**
 * GF(3) linear algebra — arithmetic over the field with 3 elements.
 *
 * Ported faithfully from trimer_general.py's gf3_rref, gf3_rank, gf3_null_space.
 * All matrices are row-major number[][] with entries in {0, 1, 2}.
 */

/** Non-negative modulo 3. */
function mod3(n: number): number {
  return ((n % 3) + 3) % 3;
}

/** Modular inverse in GF(3): inv(1)=1, inv(2)=2. */
function inv3(n: number): number {
  // 1^{-1} = 1, 2^{-1} = 2 in GF(3)
  return n; // works because 1*1=1, 2*2=4≡1
}

/**
 * Reduced row echelon form over GF(3).
 * Returns { rref: the matrix in rref, pivots: column indices of pivots }.
 * Does not mutate the input.
 */
export function gf3Rref(matrix: number[][]): { rref: number[][]; pivots: number[] } {
  if (matrix.length === 0) return { rref: [], pivots: [] };

  const rows = matrix.length;
  const cols = matrix[0].length;

  // Deep copy with mod 3
  const A = matrix.map(row => row.map(v => mod3(v)));

  let r = 0;
  const pivots: number[] = [];

  for (let c = 0; c < cols; c++) {
    // Find pivot in column c, starting from row r
    let pivot = -1;
    for (let rr = r; rr < rows; rr++) {
      if (A[rr][c] !== 0) {
        pivot = rr;
        break;
      }
    }
    if (pivot === -1) continue;

    // Swap rows r and pivot
    [A[r], A[pivot]] = [A[pivot], A[r]];

    // Scale pivot row so leading entry is 1
    const scale = inv3(A[r][c]);
    for (let j = 0; j < cols; j++) {
      A[r][j] = mod3(A[r][j] * scale);
    }

    // Eliminate all other rows in column c
    for (let rr = 0; rr < rows; rr++) {
      if (rr !== r && A[rr][c] !== 0) {
        const factor = A[rr][c];
        for (let j = 0; j < cols; j++) {
          A[rr][j] = mod3(A[rr][j] - factor * A[r][j]);
        }
      }
    }

    pivots.push(c);
    r++;
  }

  return { rref: A, pivots };
}

/**
 * Rank of a matrix over GF(3).
 */
export function gf3Rank(matrix: number[][]): number {
  if (matrix.length === 0) return 0;
  if (matrix[0].length === 0) return 0;
  return gf3Rref(matrix).pivots.length;
}

/**
 * Null space (kernel) of a matrix over GF(3).
 * Returns a list of basis vectors, each of length = number of columns.
 * If the matrix is empty (0 rows), returns the standard basis (every vector is in the kernel).
 */
export function gf3NullSpace(matrix: number[][]): number[][] {
  if (matrix.length === 0) {
    // 0-row matrix: everything is in the null space
    const N = matrix[0]?.length ?? 0;
    return Array.from({ length: N }, (_, i) => {
      const v = new Array(N).fill(0);
      v[i] = 1;
      return v;
    });
  }

  const { rref: R, pivots } = gf3Rref(matrix);
  const N = matrix[0].length;
  const pivotSet = new Set(pivots);
  const free = [];
  for (let c = 0; c < N; c++) {
    if (!pivotSet.has(c)) free.push(c);
  }

  // Map pivot column -> pivot row index
  const pidx = new Map<number, number>();
  for (let i = 0; i < pivots.length; i++) {
    pidx.set(pivots[i], i);
  }

  const basis: number[][] = [];
  for (const fv of free) {
    const v = new Array(N).fill(0);
    v[fv] = 1;
    for (const pc of pivots) {
      v[pc] = mod3(-R[pidx.get(pc)!][fv]);
    }
    basis.push(v);
  }

  return basis;
}
