/**
 * Polyomino tab state and reducer.
 * Manages shape editing, locking, grid editing, and move application
 * with shape-mask-aware validation.
 */

import type { Grid, InteractionMode, CellPosition, MoveType, HistoryEntry, Move } from './types';
import type { ShapeMask } from './polyomino';
import { createFullMask, countActiveCells, validateToggle } from './polyomino';
import { computeFingerprints } from './fingerprints';
import type { InvariantBasis } from './invariants';
import { computeInvariantBasis } from './invariants';

// --- State ---

export interface PolyState {
  rows: number;
  cols: number;
  shapeMask: ShapeMask;
  shapeLocked: boolean;
  gridA: Grid;
  gridB: Grid | null;
  liveGrid: Grid;
  history: HistoryEntry[];
  historyIndex: number;
  currentMode: InteractionMode;
  showTarget: boolean;
  showWorking: boolean;
  toastMessage: string | null;
  invariantBasis: InvariantBasis | null;
}

// --- Helpers ---

function createZeroGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

function randomGridOnMask(mask: ShapeMask): Grid {
  return mask.map(row =>
    row.map(active => (active ? Math.floor(Math.random() * 3) : 0)),
  );
}

/** Validate a move on a polyomino shape (checks active cells + equality + bounds). */
function validatePolyMove(
  grid: Grid,
  mask: ShapeMask,
  moveType: MoveType,
  position?: CellPosition,
  allowAbove3 = false,
): { valid: boolean; reason?: string } {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  if (moveType === 'mod-3') {
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (mask[i][j] && grid[i][j] < 3) {
          return { valid: false, reason: `Cell (${i},${j}) has value ${grid[i][j]}, which is < 3. All active cells must be \u2265 3 for mod-3.` };
        }
      }
    }
    return { valid: true };
  }

  if (!position) return { valid: false, reason: 'No position specified.' };
  const { row, col } = position;

  if (moveType === 'plus-3') {
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return { valid: false, reason: `Position (${row},${col}) is out of bounds.` };
    }
    if (!mask[row][col]) {
      return { valid: false, reason: `Cell (${row},${col}) is not in the shape.` };
    }
    if (!allowAbove3 && grid[row][col] >= 3) {
      return { valid: false, reason: `Cell (${row},${col}) has value ${grid[row][col]}, which is already \u2265 3.` };
    }
    return { valid: true };
  }

  if (moveType === 'horizontal-trimer') {
    if (row < 0 || row >= rows || col < 0 || col + 2 >= cols) {
      return { valid: false, reason: `Horizontal trimer at (${row},${col}) goes out of bounds.` };
    }
    if (!mask[row][col] || !mask[row][col + 1] || !mask[row][col + 2]) {
      return { valid: false, reason: 'Not all cells are in the shape.' };
    }
    const v0 = grid[row][col], v1 = grid[row][col + 1], v2 = grid[row][col + 2];
    if (!allowAbove3 && (v0 >= 3 || v1 >= 3 || v2 >= 3)) {
      return { valid: false, reason: `Cells are ${v0}, ${v1}, ${v2} \u2014 at least one is \u2265 3.` };
    }
    if (v0 !== v1 || v1 !== v2) {
      return { valid: false, reason: `Cells are ${v0}, ${v1}, ${v2} \u2014 not all equal.` };
    }
    return { valid: true };
  }

  if (moveType === 'vertical-trimer') {
    if (col < 0 || col >= cols || row < 0 || row + 2 >= rows) {
      return { valid: false, reason: `Vertical trimer at (${row},${col}) goes out of bounds.` };
    }
    if (!mask[row][col] || !mask[row + 1][col] || !mask[row + 2][col]) {
      return { valid: false, reason: 'Not all cells are in the shape.' };
    }
    const v0 = grid[row][col], v1 = grid[row + 1][col], v2 = grid[row + 2][col];
    if (!allowAbove3 && (v0 >= 3 || v1 >= 3 || v2 >= 3)) {
      return { valid: false, reason: `Cells are ${v0}, ${v1}, ${v2} \u2014 at least one is \u2265 3.` };
    }
    if (v0 !== v1 || v1 !== v2) {
      return { valid: false, reason: `Cells are ${v0}, ${v1}, ${v2} \u2014 not all equal.` };
    }
    return { valid: true };
  }

  return { valid: false, reason: `Unknown move type: ${moveType}` };
}

/** Apply a move on a polyomino grid. Only active cells are affected by mod-3. */
function applyPolyMove(
  grid: Grid,
  mask: ShapeMask,
  moveType: MoveType,
  position?: CellPosition,
): { newGrid: Grid; move: Move } {
  const newGrid = cloneGrid(grid);

  if (moveType === 'mod-3') {
    const before: number[] = [];
    const after: number[] = [];
    for (let i = 0; i < newGrid.length; i++) {
      for (let j = 0; j < newGrid[i].length; j++) {
        if (mask[i][j]) {
          before.push(newGrid[i][j]);
          newGrid[i][j] = newGrid[i][j] % 3;
          after.push(newGrid[i][j]);
        }
      }
    }
    return { newGrid, move: { type: 'mod-3', before, after } };
  }

  if (moveType === 'plus-3') {
    const { row, col } = position!;
    const before = [grid[row][col]];
    newGrid[row][col] = grid[row][col] + 3;
    const after = [newGrid[row][col]];
    return { newGrid, move: { type: 'plus-3', position, before, after } };
  }

  if (moveType === 'horizontal-trimer') {
    const { row, col } = position!;
    const before = [grid[row][col], grid[row][col + 1], grid[row][col + 2]];
    newGrid[row][col] += 1;
    newGrid[row][col + 1] += 1;
    newGrid[row][col + 2] += 1;
    const after = [newGrid[row][col], newGrid[row][col + 1], newGrid[row][col + 2]];
    return { newGrid, move: { type: 'horizontal-trimer', position, before, after } };
  }

  // vertical-trimer
  const { row, col } = position!;
  const before = [grid[row][col], grid[row + 1][col], grid[row + 2][col]];
  newGrid[row][col] += 1;
  newGrid[row + 1][col] += 1;
  newGrid[row + 2][col] += 1;
  const after = [newGrid[row][col], newGrid[row + 1][col], newGrid[row + 2][col]];
  return { newGrid, move: { type: 'vertical-trimer', position, before, after } };
}

// --- Initial state ---

export function createPolyInitialState(rows = 5, cols = 5): PolyState {
  const gridA = createZeroGrid(rows, cols);
  return {
    rows,
    cols,
    shapeMask: createFullMask(rows, cols),
    shapeLocked: false,
    gridA,
    gridB: null,
    liveGrid: cloneGrid(gridA),
    history: [],
    historyIndex: -1,
    currentMode: 'select',
    showTarget: false,
    showWorking: true,
    toastMessage: null,
    invariantBasis: null,
  };
}

// --- Actions ---

export type PolyAction =
  | { type: 'SET_DIMENSIONS'; rows: number; cols: number }
  | { type: 'TOGGLE_CELL'; row: number; col: number }
  | { type: 'LOAD_SHAPE_PRESET'; mask: ShapeMask }
  | { type: 'LOCK_SHAPE' }
  | { type: 'UNLOCK_SHAPE' }
  | { type: 'EDIT_CELL_A'; row: number; col: number; value: number }
  | { type: 'EDIT_CELL_B'; row: number; col: number; value: number }
  | { type: 'APPLY_MOVE'; moveType: MoveType; position?: CellPosition; allowAbove3?: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET_TO_START' }
  | { type: 'RANDOMIZE_A' }
  | { type: 'CLEAR_A' }
  | { type: 'SET_MODE'; mode: InteractionMode }
  | { type: 'TOGGLE_TARGET' }
  | { type: 'TOGGLE_WORKING' }
  | { type: 'FILL_ALL_PLUS3'; allowAbove3?: boolean }
  | { type: 'DISMISS_TOAST' }
  | { type: 'LOAD_STATE'; state: PolyState }
  | { type: 'LOAD_PROFILE_B'; grid: Grid };

// --- Reducer ---

export function polyReducer(state: PolyState, action: PolyAction): PolyState {
  switch (action.type) {
    case 'SET_DIMENSIONS': {
      return createPolyInitialState(action.rows, action.cols);
    }

    case 'TOGGLE_CELL': {
      if (state.shapeLocked) return state;
      const validation = validateToggle(state.shapeMask, action.row, action.col);
      if (!validation.valid) {
        return { ...state, toastMessage: validation.reason ?? 'Invalid toggle' };
      }
      const newMask = state.shapeMask.map(r => [...r]);
      newMask[action.row][action.col] = !newMask[action.row][action.col];
      // Reset grids when shape changes
      const gridA = createZeroGrid(state.rows, state.cols);
      return {
        ...state,
        shapeMask: newMask,
        gridA,
        gridB: null,
        liveGrid: cloneGrid(gridA),
        history: [],
        historyIndex: -1,
        showTarget: false,
        toastMessage: null,
        invariantBasis: null,
      };
    }

    case 'LOAD_SHAPE_PRESET': {
      const mask = action.mask;
      const rows = mask.length;
      const cols = mask[0]?.length ?? 0;
      const gridA = createZeroGrid(rows, cols);
      return {
        ...state,
        rows,
        cols,
        shapeMask: mask.map(r => [...r]),
        shapeLocked: false,
        gridA,
        gridB: null,
        liveGrid: cloneGrid(gridA),
        history: [],
        historyIndex: -1,
        currentMode: 'select',
        showTarget: false,
        toastMessage: null,
        invariantBasis: null,
      };
    }

    case 'LOCK_SHAPE': {
      if (countActiveCells(state.shapeMask) < 1) {
        return { ...state, toastMessage: 'Shape must have at least one cell.' };
      }
      const basis = computeInvariantBasis(state.shapeMask);
      return { ...state, shapeLocked: true, invariantBasis: basis, toastMessage: null };
    }

    case 'UNLOCK_SHAPE': {
      const gridA = createZeroGrid(state.rows, state.cols);
      return {
        ...state,
        shapeLocked: false,
        gridA,
        gridB: null,
        liveGrid: cloneGrid(gridA),
        history: [],
        historyIndex: -1,
        currentMode: 'select',
        showTarget: false,
        invariantBasis: null,
        toastMessage: null,
      };
    }

    case 'EDIT_CELL_A': {
      if (!state.shapeLocked || state.historyIndex >= 0) return state;
      if (!state.shapeMask[action.row][action.col]) return state;
      const newGridA = cloneGrid(state.gridA);
      newGridA[action.row][action.col] = action.value;
      return {
        ...state,
        gridA: newGridA,
        liveGrid: cloneGrid(newGridA),
      };
    }

    case 'EDIT_CELL_B': {
      if (!state.shapeLocked) return state;
      if (!state.shapeMask[action.row][action.col]) return state;
      const newGridB = state.gridB ? cloneGrid(state.gridB) : createZeroGrid(state.rows, state.cols);
      newGridB[action.row][action.col] = action.value;
      return {
        ...state,
        gridB: newGridB,
        showTarget: true,
      };
    }

    case 'APPLY_MOVE': {
      if (!state.shapeLocked) return state;
      const allowAbove3 = action.allowAbove3 ?? false;
      const validation = validatePolyMove(
        state.liveGrid, state.shapeMask, action.moveType, action.position, allowAbove3,
      );
      if (!validation.valid) {
        return { ...state, toastMessage: validation.reason ?? 'Invalid move' };
      }

      const { newGrid, move } = applyPolyMove(
        state.liveGrid, state.shapeMask, action.moveType, action.position,
      );
      const entry: HistoryEntry = {
        move,
        gridBefore: state.liveGrid,
        gridAfter: newGrid,
        fingerprintsBefore: computeFingerprints(state.liveGrid),
        fingerprintsAfter: computeFingerprints(newGrid),
      };

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(entry);

      return {
        ...state,
        liveGrid: newGrid,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        toastMessage: null,
      };
    }

    case 'UNDO': {
      if (state.historyIndex < 0) return state;
      const entry = state.history[state.historyIndex];
      return {
        ...state,
        liveGrid: cloneGrid(entry.gridBefore),
        historyIndex: state.historyIndex - 1,
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const nextEntry = state.history[state.historyIndex + 1];
      return {
        ...state,
        liveGrid: cloneGrid(nextEntry.gridAfter),
        historyIndex: state.historyIndex + 1,
      };
    }

    case 'RESET_TO_START': {
      return {
        ...state,
        liveGrid: cloneGrid(state.gridA),
        history: [],
        historyIndex: -1,
        currentMode: 'select',
        toastMessage: null,
      };
    }

    case 'RANDOMIZE_A': {
      if (!state.shapeLocked || state.historyIndex >= 0) return state;
      const rGrid = randomGridOnMask(state.shapeMask);
      return {
        ...state,
        gridA: rGrid,
        liveGrid: cloneGrid(rGrid),
      };
    }

    case 'CLEAR_A': {
      if (!state.shapeLocked || state.historyIndex >= 0) return state;
      const zGrid = createZeroGrid(state.rows, state.cols);
      return {
        ...state,
        gridA: zGrid,
        liveGrid: cloneGrid(zGrid),
      };
    }

    case 'SET_MODE': {
      return { ...state, currentMode: action.mode };
    }

    case 'TOGGLE_TARGET': {
      const showTarget = !state.showTarget;
      return {
        ...state,
        showTarget,
        gridB: showTarget && !state.gridB ? createZeroGrid(state.rows, state.cols) : state.gridB,
      };
    }

    case 'TOGGLE_WORKING': {
      return { ...state, showWorking: !state.showWorking };
    }

    case 'FILL_ALL_PLUS3': {
      if (!state.shapeLocked) return state;
      const fillAllowAbove3 = action.allowAbove3 ?? false;
      let currentGrid = state.liveGrid;
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      let currentIndex = state.historyIndex;

      for (let i = 0; i < currentGrid.length; i++) {
        for (let j = 0; j < currentGrid[i].length; j++) {
          if (state.shapeMask[i][j] && currentGrid[i][j] < 3) {
            const validation = validatePolyMove(currentGrid, state.shapeMask, 'plus-3', { row: i, col: j }, fillAllowAbove3);
            if (!validation.valid) continue;
            const { newGrid, move } = applyPolyMove(currentGrid, state.shapeMask, 'plus-3', { row: i, col: j });
            newHistory.push({
              move,
              gridBefore: currentGrid,
              gridAfter: newGrid,
              fingerprintsBefore: computeFingerprints(currentGrid),
              fingerprintsAfter: computeFingerprints(newGrid),
            });
            currentIndex++;
            currentGrid = newGrid;
          }
        }
      }

      if (currentIndex === state.historyIndex) {
        return { ...state, toastMessage: 'All active cells already have value \u2265 3.' };
      }

      return {
        ...state,
        liveGrid: currentGrid,
        history: newHistory,
        historyIndex: currentIndex,
        toastMessage: null,
      };
    }

    case 'DISMISS_TOAST': {
      return { ...state, toastMessage: null };
    }

    case 'LOAD_PROFILE_B': {
      if (!state.shapeLocked) return state;
      return {
        ...state,
        gridB: action.grid.map(row => [...row]),
        showTarget: true,
      };
    }

    case 'LOAD_STATE': {
      return action.state;
    }

    default:
      return state;
  }
}

// Re-export for use by the route
export { validatePolyMove };
