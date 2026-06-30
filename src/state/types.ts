/** 2D grid of numbers. Row-major: Grid[row][col]. */
export type Grid = number[][];

export interface CellPosition {
  row: number;
  col: number;
}

export type MoveType = 'horizontal-trimer' | 'vertical-trimer' | 'plus-3' | 'mod-3';

export interface Move {
  type: MoveType;
  /** Starting cell for trimers / target cell for plus-3 / undefined for mod-3 */
  position?: CellPosition;
  /** Cell values before the move (affected cells only) */
  before: number[];
  /** Cell values after the move (affected cells only) */
  after: number[];
}

export interface Fingerprints {
  f1: number;
  f2: number;
  f3: number;
  f4: number;
}

export interface WorkingTrace {
  label: string;
  lines: string[];
  total: number;
  result: number;
}

export interface HistoryEntry {
  move: Move;
  gridBefore: Grid;
  gridAfter: Grid;
  fingerprintsBefore: Fingerprints;
  fingerprintsAfter: Fingerprints;
}

export type InteractionMode = 'select' | 'horizontal-trimer' | 'vertical-trimer' | 'plus-3';

export interface AppState {
  rows: number;
  cols: number;
  gridA: Grid;
  gridB: Grid | null;
  liveGrid: Grid;
  history: HistoryEntry[];
  historyIndex: number; // points to the last applied move (-1 = at start)
  currentMode: InteractionMode;
  showTarget: boolean;
  showWorking: boolean;
  toastMessage: string | null;
}
