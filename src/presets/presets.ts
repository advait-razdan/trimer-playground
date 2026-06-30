import type { Grid, Move } from '../state/types';

export interface Preset {
  name: string;
  description: string;
  rows: number;
  cols: number;
  gridA: Grid;
  gridB?: Grid;
  /** Optional move history for replay */
  moveHistory?: Move[];
}

/** Create an all-zeros grid */
function zeros(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

/**
 * Empty 4x4 (default)
 */
const empty4x4: Preset = {
  name: 'Empty 4\u00d74',
  description: 'Default empty grid. Try placing some moves!',
  rows: 4,
  cols: 4,
  gridA: zeros(4, 4),
};

/**
 * Slide 60's 6x6 A and B — the canonical "not reachable" example.
 * A fingerprints: (1,2,1,1)
 * B fingerprints: (2,2,2,2)
 *
 * Grid A: value 1 at (1,1), value 2 at (1,0), value 1 at (2,0)
 * Grid B: value 2 at (1,1)
 */
const slide60: Preset = {
  name: 'Slide 60 (6\u00d76, unreachable)',
  description: 'Canonical example: A has fingerprints (1,2,1,1), B has (2,2,2,2). These differ, so B is unreachable from A.',
  rows: 6,
  cols: 6,
  gridA: (() => {
    const g = zeros(6, 6);
    g[1][1] = 1;
    g[1][0] = 2;
    g[2][0] = 1;
    return g;
  })(),
  gridB: (() => {
    const g = zeros(6, 6);
    g[1][1] = 2;
    return g;
  })(),
};

/**
 * Diagonal vs anti-diagonal 4x4.
 * Diagonal: 1s on main diagonal. FP = (1, 0, 0, 2)
 * Anti-diagonal: 1s on anti-diagonal. FP = (1, 0, 0, 1)
 * F1, F2, F3 match but F4 disagrees.
 */
const diagonalVsAntiDiagonal: Preset = {
  name: 'Diagonal vs Anti-diagonal (4\u00d74)',
  description: 'F1, F2, F3 all match but F4 disagrees (2 vs 1). Shows why the bilinear fingerprint matters.',
  rows: 4,
  cols: 4,
  gridA: [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ],
  gridB: [
    [0, 0, 0, 1],
    [0, 0, 1, 0],
    [0, 1, 0, 0],
    [1, 0, 0, 0],
  ],
};

/**
 * 3x3 walk-through with 7-move sequence.
 * Starts from all 2s, demonstrates all four move types:
 * 1. H-trimer (0,0): row 0 -> [3,3,3]
 * 2. H-trimer (1,0): row 1 -> [3,3,3]
 * 3. H-trimer (2,0): row 2 -> [3,3,3], all cells >= 3
 * 4. Mod-3: all 3s -> all 0s
 * 5. V-trimer (0,0): col 0 -> [1,1,1]
 * 6. Plus-3 at (1,1): 0 -> 3
 * 7. Plus-3 at (2,2): 0 -> 3
 * Fingerprints stay (0,0,0,0) throughout.
 */
const walkthrough3x3: Preset = {
  name: '3\u00d73 Walk-through (7 moves)',
  description: 'Demonstrates all four move types. Fingerprints stay (0,0,0,0) throughout. Start from all 2s.',
  rows: 3,
  cols: 3,
  gridA: [
    [2, 2, 2],
    [2, 2, 2],
    [2, 2, 2],
  ],
  moveHistory: [
    {
      type: 'horizontal-trimer',
      position: { row: 0, col: 0 },
      before: [2, 2, 2],
      after: [3, 3, 3],
    },
    {
      type: 'horizontal-trimer',
      position: { row: 1, col: 0 },
      before: [2, 2, 2],
      after: [3, 3, 3],
    },
    {
      type: 'horizontal-trimer',
      position: { row: 2, col: 0 },
      before: [2, 2, 2],
      after: [3, 3, 3],
    },
    {
      type: 'mod-3',
      before: [3, 3, 3, 3, 3, 3, 3, 3, 3],
      after: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      type: 'vertical-trimer',
      position: { row: 0, col: 0 },
      before: [0, 0, 0],
      after: [1, 1, 1],
    },
    {
      type: 'plus-3',
      position: { row: 1, col: 1 },
      before: [0],
      after: [3],
    },
    {
      type: 'plus-3',
      position: { row: 2, col: 2 },
      before: [0],
      after: [3],
    },
  ],
};

export const PRESETS: Preset[] = [
  empty4x4,
  slide60,
  diagonalVsAntiDiagonal,
  walkthrough3x3,
];
