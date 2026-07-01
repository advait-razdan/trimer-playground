/** §6.8.1 reference pattern table data — verbatim from spec / trimer_general_demo.py. */

export interface ReferencePatternRow {
  shape: string;
  cells: number;
  wordLen: number;
  canonical: number;
  canonicalNote?: string;
  extras: number;
}

export const referencePatternTable: ReferencePatternRow[] = [
  { shape: 'Rectangle 3\u00D73', cells: 9, wordLen: 4, canonical: 4, extras: 0 },
  { shape: 'Rectangle 5\u00D75', cells: 25, wordLen: 4, canonical: 4, extras: 0 },
  { shape: 'L (3\u00D73 minus corner)', cells: 7, wordLen: 4, canonical: 4, extras: 0 },
  { shape: 'T-shape (4-wide top)', cells: 8, wordLen: 4, canonical: 4, extras: 0 },
  { shape: 'Plus sign (arm = 1)', cells: 5, wordLen: 3, canonical: 3, extras: 0 },
  { shape: 'Staircase (n = 4)', cells: 10, wordLen: 4, canonical: 4, extras: 0 },
  { shape: 'P-shape (image 2 example)', cells: 6, wordLen: 4, canonical: 4, extras: 0 },
  { shape: '3\u00D73 + spike of length 3', cells: 12, wordLen: 4, canonical: 4, extras: 0 },
  {
    shape: '1\u00D75 strip',
    cells: 5,
    wordLen: 2,
    canonical: 2,
    canonicalNote: 'F1, F3',
    extras: 0,
  },
  {
    shape: 'Dumbbell 3\u00D73, bridge 2\u00D71 (width 1)',
    cells: 20,
    wordLen: 6,
    canonical: 4,
    extras: 2,
  },
  {
    shape: 'Dumbbell 3\u00D73, bridge 5\u00D71 (width 1)',
    cells: 23,
    wordLen: 6,
    canonical: 4,
    extras: 2,
  },
  {
    shape: 'Dumbbell 3\u00D73, bridge 2\u00D72 (width 2)',
    cells: 22,
    wordLen: 4,
    canonical: 4,
    extras: 0,
  },
  {
    shape: 'Chain of 3 lobes, 2 width-1 bridges',
    cells: 31,
    wordLen: 8,
    canonical: 4,
    extras: 4,
  },
  {
    shape: 'Chain of 4 lobes, 3 width-1 bridges',
    cells: 42,
    wordLen: 10,
    canonical: 4,
    extras: 6,
  },
];
