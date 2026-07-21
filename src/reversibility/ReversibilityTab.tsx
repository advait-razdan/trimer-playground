/**
 * Reversibility tab.
 *
 * Demonstrates that any strict-rule move sequence A → B can be continued, with
 * more legal moves, back to A — and that the continuation can be written down
 * mechanically from the forward move list (see engine.ts). The left side is the
 * Rectangular Base (v1) interaction under fixed strict rules; the right panel
 * shows the forward move console, the live return recipe, the strict
 * fingerprints of A vs the current grid, and a plain-English explainer.
 *
 * Everything this tab needs lives under src/reversibility/; deleting that
 * folder and the registration lines in App.tsx reverts the feature.
 */

import { useReducer, useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { appReducer, createInitialState } from '../state/reducer';
import { canApplyMod3, findLegalMoves } from '../state/moves';
import { GridA } from '../components/GridA';
import { LiveGrid } from '../components/LiveGrid';
import { Toolbar } from '../components/Toolbar';
import { computeInvariantBasis } from '../state/invariants';
import { computeStrictBasis } from '../strict/fingerprints';
import type { CellPosition, InteractionMode, MoveType, Grid } from '../state/types';
import { computeRecipe } from './engine';
import type { Recipe, ForwardMove } from './engine';
import { MoveConsole } from './components/MoveConsole';
import { ReturnRecipePanel } from './components/ReturnRecipePanel';
import { FingerprintsSection } from './components/FingerprintsSection';
import { Explainer } from './components/Explainer';
import { RecipePlayerModal } from './components/RecipePlayerModal';

/** Pulse color per move type */
const PULSE_COLORS: Record<MoveType, string> = {
  'horizontal-trimer': 'rgba(239, 68, 68, 0.45)', // red
  'vertical-trimer': 'rgba(234, 179, 8, 0.45)',    // gold
  'plus-3': 'rgba(168, 85, 247, 0.45)',             // purple
  'mod-3': 'rgba(156, 163, 175, 0.35)',             // gray fade
};

/** Get the set of cell keys affected by a move */
function getMoveCellKeys(move: { type: MoveType; position?: CellPosition }, rows: number, cols: number): Set<string> {
  const keys = new Set<string>();
  if (move.type === 'mod-3') {
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        keys.add(`${i},${j}`);
      }
    }
  } else if (move.position) {
    const { row, col } = move.position;
    if (move.type === 'horizontal-trimer') {
      keys.add(`${row},${col}`);
      keys.add(`${row},${col + 1}`);
      keys.add(`${row},${col + 2}`);
    } else if (move.type === 'vertical-trimer') {
      keys.add(`${row},${col}`);
      keys.add(`${row + 1},${col}`);
      keys.add(`${row + 2},${col}`);
    } else if (move.type === 'plus-3') {
      keys.add(`${row},${col}`);
    }
  }
  return keys;
}

export function ReversibilityTab() {
  const [state, dispatch] = useReducer(appReducer, undefined, () => createInitialState());

  const {
    gridA,
    liveGrid,
    history,
    historyIndex,
    currentMode,
    toastMessage,
    rows,
    cols,
  } = state;

  // Pulse animation state
  const [pulseCells, setPulseCells] = useState<Set<string>>(new Set());
  const [pulseColor, setPulseColor] = useState<string>('');
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track historyIndex to detect new moves
  const prevHistoryIndexRef = useRef(historyIndex);

  // Dimension change pending
  const [pendingDims, setPendingDims] = useState<{ rows: number; cols: number } | null>(null);

  // Recipe display mode + popup player
  const [showEverySteps, setShowEverySteps] = useState(false);
  const [player, setPlayer] = useState<{ recipe: Recipe; startGrid: Grid; mode: 'expanded' | 'grouped' } | null>(null);

  // Step-through replay state
  const [replayTarget, setReplayTarget] = useState<number | null>(null);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Random auto-play state
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoSpeed, setAutoSpeed] = useState(500);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rectMask = useMemo(() =>
    Array.from({ length: rows }, () => Array(cols).fill(true) as boolean[]),
    [rows, cols]
  );
  const rectBasis = useMemo(() => computeInvariantBasis(rectMask), [rectMask]);
  // Strict-model basis. Memoized on the shape alone; the heaviest case (10x10) is ~1.1s.
  const strictBasis = useMemo(() => computeStrictBasis(rectBasis), [rectBasis]);

  // The forward move log = the moves actually placed (undo pops the log).
  const moveLog: ForwardMove[] = useMemo(
    () => history.slice(0, historyIndex + 1).map(e => ({ type: e.move.type, position: e.move.position })),
    [history, historyIndex],
  );

  // Live return recipe: recomputed after every forward move or undo.
  const recipe = useMemo(
    () => computeRecipe(gridA, moveLog, liveGrid),
    [gridA, moveLog, liveGrid],
  );

  // Detect when a new move is applied and trigger pulse
  useEffect(() => {
    const prevIdx = prevHistoryIndexRef.current;
    prevHistoryIndexRef.current = historyIndex;

    if (historyIndex > prevIdx && historyIndex >= 0 && history[historyIndex]) {
      const entry = history[historyIndex];
      const keys = getMoveCellKeys(entry.move, rows, cols);
      const color = PULSE_COLORS[entry.move.type];

      setPulseCells(keys);
      setPulseColor(color);

      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(() => {
        setPulseCells(new Set());
        setPulseColor('');
      }, 350);
    }
  }, [historyIndex, history, rows, cols]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        dispatch({ type: 'SET_MODE', mode: currentMode === 'horizontal-trimer' ? 'select' : 'horizontal-trimer' });
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        dispatch({ type: 'SET_MODE', mode: currentMode === 'vertical-trimer' ? 'select' : 'vertical-trimer' });
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        dispatch({ type: 'SET_MODE', mode: currentMode === 'plus-3' ? 'select' : 'plus-3' });
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        dispatch({ type: 'APPLY_MOVE', moveType: 'mod-3', allowAbove3: false });
      } else if (e.key === 'Escape') {
        dispatch({ type: 'SET_MODE', mode: 'select' });
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
    },
    [currentMode],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => dispatch({ type: 'DISMISS_TOAST' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Step-through replay effect
  useEffect(() => {
    if (replayTarget === null) return;
    if (historyIndex === replayTarget) {
      setReplayTarget(null);
      return;
    }

    replayTimerRef.current = setTimeout(() => {
      if (historyIndex < replayTarget) {
        dispatch({ type: 'REDO' });
      } else {
        dispatch({ type: 'UNDO' });
      }
    }, 600);

    return () => {
      if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    };
  }, [replayTarget, historyIndex]);

  // Random auto-play effect: schedule the next random legal move (+3, H-trimer,
  // or V-trimer). Re-runs whenever liveGrid changes, forming a self-rescheduling
  // loop that only stops when the user pauses.
  useEffect(() => {
    if (!isAutoPlaying) return;

    const legalMoves = findLegalMoves(liveGrid, false);

    autoTimerRef.current = setTimeout(() => {
      if (legalMoves.length === 0) {
        // No legal move left: fill any remaining cells to +3, renormalize,
        // then keep going (the reset opens up fresh legal moves).
        dispatch({ type: 'FILL_ALL_PLUS3', allowAbove3: false });
        dispatch({ type: 'APPLY_MOVE', moveType: 'mod-3', allowAbove3: false });
        return;
      }
      const pick = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      dispatch({
        type: 'APPLY_MOVE',
        moveType: pick.type,
        position: pick.position,
        allowAbove3: false,
      });
    }, autoSpeed);

    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [isAutoPlaying, autoSpeed, liveGrid]);

  const handleToggleAutoPlay = () => {
    setIsAutoPlaying(prev => {
      if (!prev) setReplayTarget(null); // stop step-replay so timers don't fight
      return !prev;
    });
  };

  // Derived state
  const locked = historyIndex >= 0;
  const mod3Available = canApplyMod3(liveGrid);

  const handleLiveCellClick = (pos: CellPosition) => {
    if (currentMode === 'select') return;
    if (currentMode === 'plus-3') {
      dispatch({ type: 'APPLY_MOVE', moveType: 'plus-3', position: pos, allowAbove3: false });
    } else if (currentMode === 'horizontal-trimer') {
      dispatch({ type: 'APPLY_MOVE', moveType: 'horizontal-trimer', position: pos, allowAbove3: false });
    } else if (currentMode === 'vertical-trimer') {
      dispatch({ type: 'APPLY_MOVE', moveType: 'vertical-trimer', position: pos, allowAbove3: false });
    }
  };

  // Cell editing is constrained to 0/1/2 (A must start in range): cycle 0→1→2→0.
  const handleCellAClick = (row: number, col: number) => {
    const current = gridA[row][col];
    dispatch({ type: 'EDIT_CELL_A', row, col, value: (current + 1) % 3 });
  };

  const handleCellAShiftClick = (row: number, col: number) => {
    const current = gridA[row][col];
    dispatch({ type: 'EDIT_CELL_A', row, col, value: (current + 2) % 3 });
  };

  const handleHistoryJump = (index: number) => {
    if (index === historyIndex) return;
    if (index < historyIndex) {
      for (let i = historyIndex; i > index; i--) {
        dispatch({ type: 'UNDO' });
      }
    } else {
      for (let i = historyIndex; i < index; i++) {
        dispatch({ type: 'REDO' });
      }
    }
  };

  const handleDimensionChange = (newRows: number, newCols: number) => {
    const hasState = history.length > 0 || gridA.some(row => row.some(v => v !== 0));
    if (hasState) {
      setPendingDims({ rows: newRows, cols: newCols });
    } else {
      dispatch({ type: 'SET_DIMENSIONS', rows: newRows, cols: newCols });
    }
  };

  const handlePlayRecipe = () => {
    // Snapshot the current grid (B) and recipe: the popup animates a copy and
    // never mutates the real grid.
    setPlayer({
      recipe,
      startGrid: liveGrid.map(r => [...r]),
      mode: showEverySteps ? 'expanded' : 'grouped',
    });
  };

  // Replay controls
  const handleReplayToEnd = () => {
    if (historyIndex < history.length - 1) {
      setReplayTarget(history.length - 1);
    }
  };

  const handleReplayToStart = () => {
    if (historyIndex > -1) {
      setReplayTarget(-1);
    }
  };

  const handleStepForward = () => {
    if (historyIndex < history.length - 1) {
      dispatch({ type: 'REDO' });
    }
  };

  const handleStepBack = () => {
    if (historyIndex >= 0) {
      dispatch({ type: 'UNDO' });
    }
  };

  const handleStopReplay = () => {
    setReplayTarget(null);
  };

  const isReplaying = replayTarget !== null;

  return (
    <>
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm px-4 py-2 rounded shadow-lg max-w-lg">
          {toastMessage}
        </div>
      )}

      {/* Return recipe popup player */}
      {player && (
        <RecipePlayerModal
          recipe={player.recipe}
          mode={player.mode}
          startGrid={player.startGrid}
          gridA={gridA}
          mask={rectMask}
          onClose={() => setPlayer(null)}
        />
      )}

      {/* Dimension change confirmation */}
      {pendingDims && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Change dimensions?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Changing dimensions to {pendingDims.rows}x{pendingDims.cols} will reset all grids and clear move history. Continue?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
                onClick={() => setPendingDims(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => {
                  dispatch({ type: 'SET_DIMENSIONS', rows: pendingDims.rows, cols: pendingDims.cols });
                  setPendingDims(null);
                }}
              >
                Reset & Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main layout: two columns */}
      <div className="flex flex-col lg:flex-row">
        {/* Left column: grids + controls (55%) */}
        <div className="lg:w-[55%] p-6 space-y-4">
          {/* Dimension controls + grid buttons */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="text-gray-600">
              Rows:
              <input
                type="number"
                min={2}
                max={10}
                value={rows}
                onChange={(e) => {
                  const val = Math.min(10, Math.max(2, parseInt(e.target.value) || 4));
                  handleDimensionChange(val, cols);
                }}
                className="ml-1 w-14 border border-gray-300 rounded px-2 py-0.5 text-center"
              />
            </label>
            <label className="text-gray-600">
              Cols:
              <input
                type="number"
                min={2}
                max={10}
                value={cols}
                onChange={(e) => {
                  const val = Math.min(10, Math.max(2, parseInt(e.target.value) || 4));
                  handleDimensionChange(rows, val);
                }}
                className="ml-1 w-14 border border-gray-300 rounded px-2 py-0.5 text-center"
              />
            </label>
            <button
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
              disabled={locked}
              onClick={() => dispatch({ type: 'CLEAR_A' })}
              title="Set all cells in A to 0"
            >
              Set all to 0
            </button>
            <button
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
              disabled={locked}
              onClick={() => dispatch({ type: 'RANDOMIZE_A' })}
              title="Fill A with random 0/1/2 values"
            >
              Randomize
            </button>
          </div>

          {/* Toolbar */}
          <Toolbar
            mode={currentMode}
            canUndo={historyIndex >= 0}
            canRedo={historyIndex < history.length - 1}
            canMod3={mod3Available}
            hasHistory={history.length > 0}
            onSetMode={(mode: InteractionMode) => dispatch({ type: 'SET_MODE', mode })}
            onUndo={() => dispatch({ type: 'UNDO' })}
            onRedo={() => dispatch({ type: 'REDO' })}
            onMod3={() => dispatch({ type: 'APPLY_MOVE', moveType: 'mod-3', allowAbove3: false })}
            onFillPlus3={() => dispatch({ type: 'FILL_ALL_PLUS3', allowAbove3: false })}
            onReset={() => {
              setIsAutoPlaying(false);
              if (history.length > 0) {
                dispatch({ type: 'RESET_TO_START' });
              }
            }}
            isAutoPlaying={isAutoPlaying}
            autoSpeed={autoSpeed}
            onToggleAutoPlay={handleToggleAutoPlay}
            onAutoSpeedChange={setAutoSpeed}
          />

          {/* Grids */}
          <div className="flex flex-wrap gap-6">
            <GridA
              grid={gridA}
              locked={locked}
              onCellClick={handleCellAClick}
              onCellShiftClick={handleCellAShiftClick}
            />
            <LiveGrid
              grid={liveGrid}
              mode={currentMode}
              onCellClick={handleLiveCellClick}
              pulseCells={pulseCells}
              pulseColor={pulseColor}
            />
          </div>

          {/* Replay controls when there is history */}
          {history.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-gray-500 mr-2">
                Step {historyIndex + 1} of {history.length}
              </span>
              <button
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                disabled={historyIndex < 0 || isReplaying}
                onClick={handleReplayToStart}
                title="Replay to start"
              >
                |&lt;
              </button>
              <button
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                disabled={historyIndex < 0 || isReplaying}
                onClick={handleStepBack}
                title="Step back"
              >
                &lt;
              </button>
              {isReplaying ? (
                <button
                  className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                  onClick={handleStopReplay}
                >
                  Stop
                </button>
              ) : (
                <button
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                  disabled={historyIndex >= history.length - 1}
                  onClick={handleReplayToEnd}
                  title="Play all remaining moves"
                >
                  Play
                </button>
              )}
              <button
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                disabled={historyIndex >= history.length - 1 || isReplaying}
                onClick={handleStepForward}
                title="Step forward"
              >
                &gt;
              </button>
              <button
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                disabled={historyIndex >= history.length - 1 || isReplaying}
                onClick={() => {
                  for (let i = historyIndex; i < history.length - 1; i++) {
                    dispatch({ type: 'REDO' });
                  }
                }}
                title="Jump to end"
              >
                &gt;|
              </button>
            </div>
          )}
        </div>

        {/* Right column: move console + recipe + fingerprints + explainer (45%) */}
        <div className="lg:w-[45%] lg:border-l border-gray-200 bg-white p-6 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
          <MoveConsole
            history={history}
            historyIndex={historyIndex}
            onJumpTo={handleHistoryJump}
          />

          <ReturnRecipePanel
            gridA={gridA}
            mask={rectMask}
            recipe={recipe}
            forwardMoveCount={moveLog.length}
            showEverySteps={showEverySteps}
            onToggleShowEverySteps={() => setShowEverySteps(v => !v)}
            onPlay={handlePlayRecipe}
          />

          <FingerprintsSection
            basis={rectBasis}
            strict={strictBasis}
            gridA={gridA}
            liveGrid={liveGrid}
          />

          <Explainer />
        </div>
      </div>
    </>
  );
}
