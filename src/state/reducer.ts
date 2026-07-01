import type { AppState, Grid, InteractionMode, CellPosition, MoveType, HistoryEntry } from './types';
import { applyMove, validateMove } from './moves';
import { computeFingerprints } from './fingerprints';
import type { Preset } from '../presets/presets';

export interface ImportedState {
  rows: number;
  cols: number;
  gridA: Grid;
  gridB?: Grid | null;
  liveGrid: Grid;
  history?: HistoryEntry[];
  historyIndex?: number;
}

// --- Helper ---

function createZeroGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

function randomGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(Math.random() * 3)),
  );
}

// --- Initial state ---

export function createInitialState(rows = 4, cols = 4): AppState {
  const gridA = createZeroGrid(rows, cols);
  return {
    rows,
    cols,
    gridA,
    gridB: null,
    liveGrid: cloneGrid(gridA),
    history: [],
    historyIndex: -1,
    currentMode: 'select',
    showTarget: false,
    showWorking: true,
    toastMessage: null,
  };
}

// --- Actions ---

export type AppAction =
  | { type: 'SET_DIMENSIONS'; rows: number; cols: number }
  | { type: 'EDIT_CELL_A'; row: number; col: number; value: number }
  | { type: 'EDIT_CELL_B'; row: number; col: number; value: number }
  | { type: 'APPLY_MOVE'; moveType: MoveType; position?: CellPosition; allowAbove3?: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET_TO_START' }
  | { type: 'RANDOMIZE_A' }
  | { type: 'CLEAR_A' }
  | { type: 'LOAD_PRESET'; preset: Preset }
  | { type: 'SET_MODE'; mode: InteractionMode }
  | { type: 'TOGGLE_TARGET' }
  | { type: 'TOGGLE_WORKING' }
  | { type: 'FILL_ALL_PLUS3'; allowAbove3?: boolean }
  | { type: 'DISMISS_TOAST' }
  | { type: 'IMPORT_STATE'; data: ImportedState };

// --- Reducer ---

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_DIMENSIONS': {
      const { rows, cols } = action;
      return createInitialState(rows, cols);
    }

    case 'EDIT_CELL_A': {
      // Only allow editing if no moves have been applied
      if (state.historyIndex >= 0) return state;
      const newGridA = cloneGrid(state.gridA);
      newGridA[action.row][action.col] = action.value;
      return {
        ...state,
        gridA: newGridA,
        liveGrid: cloneGrid(newGridA),
      };
    }

    case 'EDIT_CELL_B': {
      const newGridB = state.gridB ? cloneGrid(state.gridB) : createZeroGrid(state.rows, state.cols);
      newGridB[action.row][action.col] = action.value;
      return {
        ...state,
        gridB: newGridB,
        showTarget: true,
      };
    }

    case 'APPLY_MOVE': {
      const allowAbove3 = action.allowAbove3 ?? false;
      const validation = validateMove(state.liveGrid, action.moveType, action.position, allowAbove3);
      if (!validation.valid) {
        return { ...state, toastMessage: validation.reason ?? 'Invalid move' };
      }

      const { newGrid, move } = applyMove(state.liveGrid, action.moveType, action.position, allowAbove3);
      const entry: HistoryEntry = {
        move,
        gridBefore: state.liveGrid,
        gridAfter: newGrid,
        fingerprintsBefore: computeFingerprints(state.liveGrid),
        fingerprintsAfter: computeFingerprints(newGrid),
      };

      // Truncate forward history on new move
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
      if (state.historyIndex >= 0) return state;
      const rGrid = randomGrid(state.rows, state.cols);
      return {
        ...state,
        gridA: rGrid,
        liveGrid: cloneGrid(rGrid),
      };
    }

    case 'CLEAR_A': {
      if (state.historyIndex >= 0) return state;
      const zGrid = createZeroGrid(state.rows, state.cols);
      return {
        ...state,
        gridA: zGrid,
        liveGrid: cloneGrid(zGrid),
      };
    }

    case 'LOAD_PRESET': {
      const { preset } = action;
      const gridA = preset.gridA.map(row => [...row]);
      let liveGrid = cloneGrid(gridA);
      const history: HistoryEntry[] = [];
      let historyIndex = -1;

      // Replay move history if provided
      if (preset.moveHistory) {
        for (const move of preset.moveHistory) {
          const gridBefore = liveGrid;
          const result = applyMove(liveGrid, move.type, move.position);
          liveGrid = result.newGrid;
          history.push({
            move: result.move,
            gridBefore,
            gridAfter: liveGrid,
            fingerprintsBefore: computeFingerprints(gridBefore),
            fingerprintsAfter: computeFingerprints(liveGrid),
          });
          historyIndex++;
        }
      }

      return {
        ...state,
        rows: preset.rows,
        cols: preset.cols,
        gridA,
        gridB: preset.gridB ? preset.gridB.map(row => [...row]) : null,
        liveGrid,
        history,
        historyIndex,
        currentMode: 'select',
        showTarget: !!preset.gridB,
        toastMessage: null,
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
      const fillAllowAbove3 = action.allowAbove3 ?? false;
      let currentGrid = state.liveGrid;
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      let currentIndex = state.historyIndex;

      for (let i = 0; i < currentGrid.length; i++) {
        for (let j = 0; j < currentGrid[i].length; j++) {
          if (currentGrid[i][j] < 3) {
            const { newGrid, move } = applyMove(currentGrid, 'plus-3', { row: i, col: j }, fillAllowAbove3);
            const entry: HistoryEntry = {
              move,
              gridBefore: currentGrid,
              gridAfter: newGrid,
              fingerprintsBefore: computeFingerprints(currentGrid),
              fingerprintsAfter: computeFingerprints(newGrid),
            };
            newHistory.push(entry);
            currentIndex++;
            currentGrid = newGrid;
          }
        }
      }

      if (currentIndex === state.historyIndex) {
        // No cells needed +3
        return { ...state, toastMessage: 'All cells already have value \u2265 3.' };
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

    case 'IMPORT_STATE': {
      const { data } = action;
      return {
        rows: data.rows,
        cols: data.cols,
        gridA: data.gridA.map(row => [...row]),
        gridB: data.gridB ? data.gridB.map(row => [...row]) : null,
        liveGrid: data.liveGrid.map(row => [...row]),
        history: data.history ?? [],
        historyIndex: data.historyIndex ?? -1,
        currentMode: 'select',
        showTarget: !!data.gridB,
        showWorking: true,
        toastMessage: null,
      };
    }

    default:
      return state;
  }
}
