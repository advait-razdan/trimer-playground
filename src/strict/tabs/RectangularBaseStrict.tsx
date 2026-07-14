/**
 * Rectangular Base (Strict).
 *
 * A copy of `routes/RectangularRoute.tsx` with two additions: the strict-rule
 * fingerprint panel, and a verdict panel that never claims reachability without a
 * witnessed move sequence. Everything else is the old tab, reusing its components
 * read-only. Nothing here writes to state the old tab reads.
 */

import { useReducer, useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { appReducer, createInitialState } from '../../state/reducer';
import { computeFingerprints, computeAllTraces } from '../../state/fingerprints';
import { canApplyMod3 } from '../../state/moves';
import { GridA } from '../../components/GridA';
import { LiveGrid } from '../../components/LiveGrid';
import { GridB } from '../../components/GridB';
import { FingerprintPanel } from '../../components/FingerprintPanel';
import { WorkingPanel } from '../../components/WorkingPanel';
import { HistoryPanel } from '../../components/HistoryPanel';
import { Toolbar } from '../../components/Toolbar';
import { PresetLoader } from '../../components/PresetLoader';
import { InvariantCard } from '../../components/InvariantCard';
import { RulesToggles } from '../../components/shared/RulesToggles';
import { ProveModal } from '../../components/polyomino/ProveModal';
import { computeInvariantBasis, computeWord } from '../../state/invariants';
import { loadStrictRules, saveStrictRules } from '../strictRules';
import type { RuleToggles } from '../../state/rules';
import type { CellPosition, InteractionMode, MoveType, AppState } from '../../state/types';
import { computeStrictBasis, strictVerdict } from '../fingerprints';
import { StrictFingerprintPanel } from '../components/StrictFingerprintPanel';
import { StrictVerdictPanel } from '../components/StrictVerdictPanel';

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

/** Serialize app state for export */
function exportState(state: AppState): string {
  return JSON.stringify({
    rows: state.rows,
    cols: state.cols,
    gridA: state.gridA,
    gridB: state.gridB,
    liveGrid: state.liveGrid,
    history: state.history,
    historyIndex: state.historyIndex,
  }, null, 2);
}

export function RectangularBaseStrict() {
  const [state, dispatch] = useReducer(appReducer, undefined, () => createInitialState());

  const {
    gridA,
    gridB,
    liveGrid,
    history,
    historyIndex,
    currentMode,
    showTarget,
    showWorking,
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

  // Import dialog state
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  // Dimension change pending
  const [pendingDims, setPendingDims] = useState<{ rows: number; cols: number } | null>(null);

  // Prove reachability state
  const [showProve, setShowProve] = useState(false);
  const rectMask = useMemo(() =>
    Array.from({ length: rows }, () => Array(cols).fill(true) as boolean[]),
    [rows, cols]
  );
  const rectBasis = useMemo(() => computeInvariantBasis(rectMask), [rectMask]);

  // Strict-model basis. Memoized on the shape alone; the heaviest case (10x10) is ~1.1s.
  const strictBasis = useMemo(() => computeStrictBasis(rectBasis), [rectBasis]);

  // Rule toggles
  const [rules, setRules] = useState<RuleToggles>(() => loadStrictRules('rectangular'));
  const handleRuleToggle = (key: keyof RuleToggles) => {
    setRules(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveStrictRules('rectangular', next);
      return next;
    });
  };

  // Step-through replay state
  const [replayTarget, setReplayTarget] = useState<number | null>(null);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        dispatch({ type: 'APPLY_MOVE', moveType: 'mod-3', allowAbove3: rules.allowPlacementAbove3 });
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
    [currentMode, rules.allowPlacementAbove3],
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

  // Derived state
  const liveFingerprints = computeFingerprints(liveGrid);
  const targetFingerprints = gridB ? computeFingerprints(gridB) : null;
  const traces = computeAllTraces(liveGrid);
  const locked = historyIndex >= 0;
  const mod3Available = canApplyMod3(liveGrid);

  // Strict verdict: loose check first, so it can never contradict the old tab.
  const verdict = useMemo(() => {
    if (!gridB) return null;
    return strictVerdict(
      strictBasis,
      rectBasis,
      liveGrid,
      gridB,
      computeWord(liveGrid, rectBasis),
      computeWord(gridB, rectBasis),
    );
  }, [strictBasis, rectBasis, liveGrid, gridB]);

  // Last move for invariant card
  const lastMove = historyIndex >= 0 && history[historyIndex] ? history[historyIndex].move : null;

  const handleLiveCellClick = (pos: CellPosition) => {
    if (currentMode === 'select') return;
    if (currentMode === 'plus-3') {
      dispatch({ type: 'APPLY_MOVE', moveType: 'plus-3', position: pos, allowAbove3: rules.allowPlacementAbove3 });
    } else if (currentMode === 'horizontal-trimer') {
      dispatch({ type: 'APPLY_MOVE', moveType: 'horizontal-trimer', position: pos, allowAbove3: rules.allowPlacementAbove3 });
    } else if (currentMode === 'vertical-trimer') {
      dispatch({ type: 'APPLY_MOVE', moveType: 'vertical-trimer', position: pos, allowAbove3: rules.allowPlacementAbove3 });
    }
  };

  const handleCellAClick = (row: number, col: number) => {
    const current = gridA[row][col];
    if (rules.allowStartAbove3) {
      dispatch({ type: 'EDIT_CELL_A', row, col, value: Math.min(current + 1, 99) });
    } else {
      dispatch({ type: 'EDIT_CELL_A', row, col, value: (current + 1) % 3 });
    }
  };

  const handleCellAShiftClick = (row: number, col: number) => {
    const current = gridA[row][col];
    if (rules.allowStartAbove3) {
      dispatch({ type: 'EDIT_CELL_A', row, col, value: Math.max(current - 1, 0) });
    } else {
      dispatch({ type: 'EDIT_CELL_A', row, col, value: (current + 2) % 3 });
    }
  };

  const handleCellBClick = (row: number, col: number) => {
    if (!gridB) return;
    const current = gridB[row][col];
    if (rules.allowStartAbove3) {
      dispatch({ type: 'EDIT_CELL_B', row, col, value: Math.min(current + 1, 99) });
    } else {
      dispatch({ type: 'EDIT_CELL_B', row, col, value: (current + 1) % 3 });
    }
  };

  const handleCellBShiftClick = (row: number, col: number) => {
    if (!gridB) return;
    const current = gridB[row][col];
    if (rules.allowStartAbove3) {
      dispatch({ type: 'EDIT_CELL_B', row, col, value: Math.max(current - 1, 0) });
    } else {
      dispatch({ type: 'EDIT_CELL_B', row, col, value: (current + 2) % 3 });
    }
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

  const handleExport = () => {
    const json = exportState(state);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(() => {
        dispatch({ type: 'DISMISS_TOAST' });
        alert('State copied to clipboard!');
      }).catch(() => {
        downloadJson(json);
      });
    } else {
      downloadJson(json);
    }
  };

  const downloadJson = (json: string) => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trimer-strict-state-${rows}x${cols}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setImportError('');
    try {
      const data = JSON.parse(importText);
      if (!data.rows || !data.cols || !data.gridA || !data.liveGrid) {
        setImportError('Invalid format: missing rows, cols, gridA, or liveGrid.');
        return;
      }
      dispatch({ type: 'IMPORT_STATE', data });
      setShowImport(false);
      setImportText('');
    } catch {
      setImportError('Invalid JSON. Please paste a valid exported state.');
    }
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

      {/* Prove reachability modal — the existing strict-legality search, unmodified */}
      {showProve && gridB && (
        <ProveModal
          liveGrid={liveGrid}
          targetGrid={gridB}
          mask={rectMask}
          basis={rectBasis}
          onClose={() => setShowProve(false)}
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

      {/* Import dialog */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="font-semibold text-gray-800 mb-2">Import State</h3>
            <p className="text-xs text-gray-500 mb-2">Paste exported JSON below:</p>
            <textarea
              className="w-full h-40 border border-gray-300 rounded p-2 font-mono text-xs"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"rows":4,"cols":4,...}'
            />
            {importError && <p className="text-xs text-red-600 mt-1">{importError}</p>}
            <div className="flex gap-2 justify-end mt-3">
              <button
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
                onClick={() => { setShowImport(false); setImportText(''); setImportError(''); }}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleImport}
              >
                Import
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
            <button
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
              onClick={() => dispatch({ type: 'TOGGLE_TARGET' })}
            >
              {showTarget ? 'Hide B' : 'Show B'}
            </button>
          </div>

          {/* Preset loader */}
          <PresetLoader onLoad={(preset) => dispatch({ type: 'LOAD_PRESET', preset })} />

          {/* Rule toggles */}
          <RulesToggles rules={rules} onToggle={handleRuleToggle} />

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
            onMod3={() => dispatch({ type: 'APPLY_MOVE', moveType: 'mod-3', allowAbove3: rules.allowPlacementAbove3 })}
            onFillPlus3={() => dispatch({ type: 'FILL_ALL_PLUS3', allowAbove3: rules.allowPlacementAbove3 })}
            onReset={() => {
              if (history.length > 0) {
                dispatch({ type: 'RESET_TO_START' });
              }
            }}
          />

          {/* Export/Import */}
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100"
              onClick={handleExport}
              title="Export current state as JSON"
            >
              Export
            </button>
            <button
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100"
              onClick={() => setShowImport(true)}
              title="Import state from JSON"
            >
              Import
            </button>
          </div>

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
            {showTarget && gridB && (
              <GridB
                grid={gridB}
                onCellClick={handleCellBClick}
                onCellShiftClick={handleCellBShiftClick}
              />
            )}
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

        {/* Right column: fingerprints + working + history (45%) */}
        <div className="lg:w-[45%] lg:border-l border-gray-200 bg-white p-6 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
          <FingerprintPanel
            liveFingerprints={liveFingerprints}
            targetFingerprints={targetFingerprints}
            showTarget={showTarget}
          />

          {/* Strict-rule fingerprints */}
          <StrictFingerprintPanel
            basis={rectBasis}
            strict={strictBasis}
            liveGrid={liveGrid}
            targetGrid={showTarget ? gridB : null}
          />

          {/* Verdict — replaces the old tab's bare "Prove Reachability" button */}
          <StrictVerdictPanel
            verdict={showTarget ? verdict : null}
            canProve={!!(showTarget && gridB)}
            onProve={() => setShowProve(true)}
          />

          {/* Invariant explanation card */}
          {lastMove && (
            <InvariantCard move={lastMove} />
          )}

          <button
            className="text-xs text-gray-500 hover:text-gray-700 mb-3 mt-2 underline"
            onClick={() => dispatch({ type: 'TOGGLE_WORKING' })}
          >
            {showWorking ? 'Hide working' : 'Show working'}
          </button>

          <WorkingPanel traces={traces} visible={showWorking} />

          <HistoryPanel
            history={history}
            historyIndex={historyIndex}
            onJumpTo={handleHistoryJump}
          />
        </div>
      </div>
    </>
  );
}
