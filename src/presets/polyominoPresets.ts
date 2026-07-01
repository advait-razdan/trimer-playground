import type { ShapeMask } from '../state/polyomino';
import type { Grid } from '../state/types';

export interface PolyominoPreset {
  name: string;
  description: string;
  mask: ShapeMask;
}

export interface ProfilePreset {
  name: string;
  description: string;
  /** Shape preset name this profile applies to, or null for any shape. */
  forShape: string | null;
  /** Grid A values; inactive cells should be 0. */
  gridA?: Grid;
  /** Grid B values; if provided, both grids are set. */
  gridB?: Grid;
}

function maskFromRows(...rows: string[]): ShapeMask {
  return rows.map(r => [...r].map(c => c === '#'));
}

export const POLYOMINO_PRESETS: PolyominoPreset[] = [
  {
    name: 'Rectangle 5\u00d75',
    description: 'Default rectangle. Same as the Rectangular Base tab \u2014 F1\u2013F4, no extras.',
    mask: maskFromRows(
      '#####',
      '#####',
      '#####',
      '#####',
      '#####',
    ),
  },
  {
    name: 'L-shape',
    description: '3\u00d73 minus one corner. F1\u2013F4 survive, no extras.',
    mask: maskFromRows(
      '##.',
      '###',
      '###',
    ),
  },
  {
    name: 'T-shape',
    description: '4-wide top + 3-cell stem. F1\u2013F4 survive, no extras.',
    mask: maskFromRows(
      '####',
      '.#..',
      '.#..',
      '.#..',
    ),
  },
  {
    name: 'Plus sign',
    description: 'Arm length 1. F1\u2013F4 survive, no extras.',
    mask: maskFromRows(
      '.#.',
      '###',
      '.#.',
    ),
  },
  {
    name: 'Staircase (n=4)',
    description: '4-step staircase. F1\u2013F4 survive, no extras.',
    mask: maskFromRows(
      '####',
      '###.',
      '##..',
      '#...',
    ),
  },
  {
    name: 'P-shape',
    description: 'The canonical shape from Image 2. 6 cells, 4 canonicals, 0 extras, word length 4.',
    mask: maskFromRows(
      '##.',
      '###',
      '#..',
    ),
  },
  {
    name: 'Dumbbell',
    description: 'Two 3\u00d73 lobes + width-1 bridge of length 2. 4 canonicals + 2 extras \u2014 the canonical "extras emerge" example.',
    mask: maskFromRows(
      '###..###',
      '########',
      '###..###',
    ),
  },
];

/**
 * Profile presets — shape-specific configurations for A and/or B grids.
 * Inactive cells must be 0 in the grid arrays.
 */
export const PROFILE_PRESETS: ProfilePreset[] = [
  {
    name: 'P-shape Image 2',
    description: 'The canonical "not reachable from zero" example from Image 2.',
    forShape: 'P-shape',
    gridB: [
      [1, 2, 0],
      [0, 0, 1],
      [2, 0, 0],
    ],
  },
  {
    name: 'Dumbbell extras demo',
    description: 'F1–F4 match all-zeros but extras disagree — proves extras matter.',
    forShape: 'Dumbbell',
    gridB: [
      [1, 1, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
];
