/**
 * Polyomino (Strict).
 *
 * A copy of `routes/PolyominoRoute.tsx` with two additions: the strict-rule fingerprint
 * panel, and a verdict panel that never claims reachability without a witnessed move
 * sequence. Everything else is the old tab, reusing its components read-only. Nothing
 * here writes to state the old tab reads.
 */

import { useReducer, useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { polyReducer, createPolyInitialState } from '../../state/polyReducer';
import { ShapeEditor } from '../../components/polyomino/ShapeEditor';
import { PolyominoGridA } from '../../components/polyomino/PolyominoGridA';
import { PolyominoLiveGrid } from '../../components/polyomino/PolyominoLiveGrid';
import { PolyominoGridB } from '../../components/polyomino/PolyominoGridB';
import { InvariantPanel } from '../../components/polyomino/InvariantPanel';
import { ProveModal } from '../../components/polyomino/ProveModal';
import { PolyInvariantCard } from '../../components/polyomino/PolyInvariantCard';
import { ShapeInfoCard } from '../../components/polyomino/ShapeInfoCard';
import { ShapeWalker } from '../../components/polyomino/ShapeWalker';
import { Toolbar } from '../../components/Toolbar';
import { HistoryPanel } from '../../components/HistoryPanel';
import { RulesToggles } from '../../components/shared/RulesToggles';
import { loadStrictRules, saveStrictRules } from '../strictRules';
import type { RuleToggles } from '../../state/rules';
import { detectBridges } from '../../state/bridge-detector';
import { computeInvariantBasis, computeWord } from '../../state/invariants';
import { POLYOMINO_PRESETS, PROFILE_PRESETS } from '../../presets/polyominoPresets';
import { ShapeWhyDiagnostic } from '../../components/help/ShapeWhyDiagnostic';
import { GlossaryDrawer } from '../../components/help/GlossaryDrawer';
import { WelcomeCard } from '../../components/help/WelcomeCard';
import { GuidedTour } from '../../components/help/GuidedTour';
import type { CellPosition, InteractionMode, MoveType } from '../../state/types';
import { computeStrictBasis, strictVerdict } from '../fingerprints';
import { StrictFingerprintPanel } from '../components/StrictFingerprintPanel';
import { StrictVerdictPanel } from '../components/StrictVerdictPanel';

/** Pulse color per move type */
const PULSE_COLORS: Record<MoveType, string> = {
  'horizontal-trimer': 'rgba(239, 68, 68, 0.45)',
  'vertical-trimer': 'rgba(234, 179, 8, 0.45)',
  'plus-3': 'rgba(168, 85, 247, 0.45)',
  'mod-3': 'rgba(156, 163, 175, 0.35)',
};

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

/** Check if every active cell has value >= 3 */
function canApplyMod3OnMask(grid: number[][], mask: boolean[][]): boolean {
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      if (mask[i]?.[j] && grid[i][j] < 3) return false;
    }
  }
  return true;
}

export function PolyominoStrict() {
  const [state, dispatch] = useReducer(polyReducer, undefined, () => createPolyInitialState());

  const {
    rows, cols, shapeMask, shapeLocked,
    gridA, gridB, liveGrid,
    history, historyIndex, currentMode,
    showTarget,
    toastMessage, invariantBasis,
  } = state;

  // Pulse animation
  const [pulseCells, setPulseCells] = useState<Set<string>>(new Set());
  const [pulseColor, setPulseColor] = useState('');
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHistoryIndexRef = useRef(historyIndex);

  // Prove modal
  const [showProve, setShowProve] = useState(false);

  // Rules
  const [rules, setRules] = useState<RuleToggles>(() => loadStrictRules('polyomino'));
  const handleRuleToggle = (key: keyof RuleToggles) => {
    setRules(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveStrictRules('polyomino', next);
      return next;
    });
  };

  // Shape walker
  const [showWalker, setShowWalker] = useState(false);

  // Help state
  const [tourActive, setTourActive] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [glossaryScrollTo, setGlossaryScrollTo] = useState<string | null>(null);

  const handleWelcomeAction = (action: 'tour' | 'glossary' | 'preset' | 'skip') => {
    if (action === 'tour') setTourActive(true);
    else if (action === 'glossary') setGlossaryOpen(true);
  };

  const openGlossaryTo = (term: string) => {
    setGlossaryScrollTo(term);
    setGlossaryOpen(true);
  };

  // Strict-model basis, memoized on the locked shape's invariant basis.
  const strictBasis = useMemo(
    () => (invariantBasis ? computeStrictBasis(invariantBasis) : null),
    [invariantBasis],
  );

  // Detect new moves and trigger pulse
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
      if (!shapeLocked) return;

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
    [currentMode, shapeLocked, rules.allowPlacementAbove3],
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

  // Derived state
  const locked = historyIndex >= 0;
  const mod3Available = shapeLocked && canApplyMod3OnMask(liveGrid, shapeMask);
  const lastMove = historyIndex >= 0 && history[historyIndex] ? history[historyIndex].move : null;
  const bridgeInfo = shapeLocked ? detectBridges(shapeMask) : null;

  // Strict verdict: loose check first, so it can never contradict the old tab.
  const verdict = useMemo(() => {
    if (!invariantBasis || !gridB) return null;
    return strictVerdict(
      strictBasis,
      invariantBasis,
      liveGrid,
      gridB,
      computeWord(liveGrid, invariantBasis),
      computeWord(gridB, invariantBasis),
    );
  }, [strictBasis, invariantBasis, liveGrid, gridB]);

  // Detect current shape preset name for profile preset filtering
  const currentShapeName = POLYOMINO_PRESETS.find(p =>
    p.mask.length === rows && p.mask[0]?.length === cols &&
    p.mask.every((row, i) => row.every((v, j) => v === shapeMask[i]?.[j]))
  )?.name ?? null;

  const availableProfiles = PROFILE_PRESETS.filter(
    p => p.forShape === null || p.forShape === currentShapeName,
  );

  const handleLiveCellClick = (pos: CellPosition) => {
    if (currentMode === 'select') return;
    dispatch({
      type: 'APPLY_MOVE',
      moveType: currentMode === 'plus-3' ? 'plus-3' : currentMode,
      position: pos,
      allowAbove3: rules.allowPlacementAbove3,
    });
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
      for (let i = historyIndex; i > index; i--) dispatch({ type: 'UNDO' });
    } else {
      for (let i = historyIndex; i < index; i++) dispatch({ type: 'REDO' });
    }
  };

  // Export state
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  const handleExport = () => {
    // Encode shape mask as compact string: "110101..." (1=active, 0=inactive)
    const maskStr = shapeMask.map(row => row.map(v => v ? '1' : '0').join('')).join('');
    const json = JSON.stringify({
      rows, cols, maskStr,
      shapeLocked,
      gridA, gridB, liveGrid,
      history, historyIndex,
    }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polyomino-strict-state-${rows}x${cols}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importText);
      if (!data.rows || !data.cols || !data.maskStr) {
        setImportError('Invalid format — missing rows, cols, or maskStr.');
        return;
      }
      // Decode mask
      const mask: boolean[][] = [];
      let idx = 0;
      for (let i = 0; i < data.rows; i++) {
        const row: boolean[] = [];
        for (let j = 0; j < data.cols; j++) {
          row.push(data.maskStr[idx++] === '1');
        }
        mask.push(row);
      }
      const basis = data.shapeLocked ? computeInvariantBasis(mask) : null;
      dispatch({
        type: 'LOAD_STATE',
        state: {
          rows: data.rows, cols: data.cols,
          shapeMask: mask, shapeLocked: data.shapeLocked ?? false,
          gridA: data.gridA, gridB: data.gridB ?? null,
          liveGrid: data.liveGrid,
          history: data.history ?? [], historyIndex: data.historyIndex ?? -1,
          currentMode: 'select', showTarget: !!data.gridB,
          showWorking: false, toastMessage: null,
          invariantBasis: basis,
        },
      });
      setShowImport(false);
      setImportText('');
      setImportError('');
    } catch {
      setImportError('Invalid JSON.');
    }
  };

  return (
    <>
      {/* Help overlays. Routes are exclusive, so only one copy of these ever mounts. */}
      <WelcomeCard onAction={handleWelcomeAction} />
      <GuidedTour active={tourActive} onEnd={() => setTourActive(false)} />
      <GlossaryDrawer
        open={glossaryOpen}
        onClose={() => { setGlossaryOpen(false); setGlossaryScrollTo(null); }}
        scrollToTerm={glossaryScrollTo}
      />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm px-4 py-2 rounded shadow-lg max-w-lg">
          {toastMessage}
        </div>
      )}

      {/* Prove modal — the existing strict-legality search, unmodified */}
      {showProve && invariantBasis && gridB && (
        <ProveModal
          liveGrid={liveGrid}
          targetGrid={gridB}
          mask={shapeMask}
          basis={invariantBasis}
          onClose={() => setShowProve(false)}
        />
      )}

      {/* Main layout */}
      <div className="flex flex-col md:flex-row">
        {/* Left column */}
        <div className="md:w-[55%] p-6 space-y-4">
          {/* Help toolbar */}
          <div className="flex items-center gap-2 text-xs">
            <button
              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
              onClick={() => setGlossaryOpen(true)}
            >
              Glossary
            </button>
            <button
              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
              onClick={() => setTourActive(true)}
            >
              Tour
            </button>
            <span className="text-gray-300">|</span>
            <button
              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
              onClick={handleExport}
              disabled={!shapeLocked}
            >
              Export
            </button>
            <button
              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
              onClick={() => setShowImport(!showImport)}
            >
              Import
            </button>
          </div>

          {/* Import panel */}
          {showImport && (
            <div className="p-3 bg-gray-50 rounded border border-gray-200 text-xs space-y-2">
              <p className="text-gray-500">Paste exported JSON below:</p>
              <textarea
                className="w-full h-20 p-2 border border-gray-300 rounded font-mono text-[10px]"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              {importError && <p className="text-red-500">{importError}</p>}
              <button
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleImport}
              >
                Load
              </button>
            </div>
          )}

          {/* Shape editor */}
          <div data-tour="shape-editor">
          <ShapeEditor
            rows={rows}
            cols={cols}
            mask={shapeMask}
            locked={shapeLocked}
            bridgeCells={bridgeInfo?.bridgeCells}
            onToggleCell={(r, c) => dispatch({ type: 'TOGGLE_CELL', row: r, col: c })}
            onSetDimensions={(r, c) => dispatch({ type: 'SET_DIMENSIONS', rows: r, cols: c })}
            onLockShape={() => dispatch({ type: 'LOCK_SHAPE' })}
            onUnlockShape={() => dispatch({ type: 'UNLOCK_SHAPE' })}
            onLoadPreset={(mask) => dispatch({ type: 'LOAD_SHAPE_PRESET', mask })}
          />
          </div>

          {/* Controls visible when shape is locked */}
          {shapeLocked && (
            <>
              {/* Grid buttons */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <button
                  className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                  disabled={locked}
                  onClick={() => dispatch({ type: 'CLEAR_A' })}
                >
                  Set all to 0
                </button>
                <button
                  className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                  disabled={locked}
                  onClick={() => dispatch({ type: 'RANDOMIZE_A' })}
                >
                  Randomize
                </button>
                <button
                  className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
                  onClick={() => dispatch({ type: 'TOGGLE_TARGET' })}
                >
                  {showTarget ? 'Hide B' : 'Show B'}
                </button>
                {availableProfiles.length > 0 && (
                  <select
                    className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                    value=""
                    onChange={(e) => {
                      const idx = parseInt(e.target.value);
                      if (!isNaN(idx)) {
                        const preset = availableProfiles[idx];
                        if (preset.gridB) {
                          dispatch({ type: 'LOAD_PROFILE_B', grid: preset.gridB });
                        }
                      }
                    }}
                  >
                    <option value="">Load profile preset...</option>
                    {availableProfiles.map((p, i) => (
                      <option key={i} value={i}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Rule toggles */}
              <div data-tour="rules-toggles">
                <RulesToggles rules={rules} onToggle={handleRuleToggle} />
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
                onMod3={() => dispatch({ type: 'APPLY_MOVE', moveType: 'mod-3', allowAbove3: rules.allowPlacementAbove3 })}
                onFillPlus3={() => dispatch({ type: 'FILL_ALL_PLUS3', allowAbove3: rules.allowPlacementAbove3 })}
                onReset={() => {
                  if (history.length > 0) dispatch({ type: 'RESET_TO_START' });
                }}
              />

              {/* Grids */}
              <div className="flex flex-wrap gap-6">
                <PolyominoGridA
                  grid={gridA}
                  mask={shapeMask}
                  locked={locked}
                  onCellClick={handleCellAClick}
                  onCellShiftClick={handleCellAShiftClick}
                />
                <PolyominoLiveGrid
                  grid={liveGrid}
                  mask={shapeMask}
                  mode={currentMode}
                  onCellClick={handleLiveCellClick}
                  pulseCells={pulseCells}
                  pulseColor={pulseColor}
                />
                {showTarget && gridB && (
                  <PolyominoGridB
                    grid={gridB}
                    mask={shapeMask}
                    onCellClick={handleCellBClick}
                    onCellShiftClick={handleCellBShiftClick}
                  />
                )}
              </div>

              {/* Replay controls */}
              {history.length > 0 && (
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-gray-500 mr-2">
                    Step {historyIndex + 1} of {history.length}
                  </span>
                  <button
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                    disabled={historyIndex < 0}
                    onClick={() => { for (let i = historyIndex; i >= 0; i--) dispatch({ type: 'UNDO' }); }}
                  >|&lt;</button>
                  <button
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                    disabled={historyIndex < 0}
                    onClick={() => dispatch({ type: 'UNDO' })}
                  >&lt;</button>
                  <button
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                    disabled={historyIndex >= history.length - 1}
                    onClick={() => dispatch({ type: 'REDO' })}
                  >&gt;</button>
                  <button
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
                    disabled={historyIndex >= history.length - 1}
                    onClick={() => { for (let i = historyIndex; i < history.length - 1; i++) dispatch({ type: 'REDO' }); }}
                  >&gt;|</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right column: fingerprints + history */}
        <div className="md:w-[45%] md:border-l border-gray-200 bg-white p-6 md:sticky md:top-0 md:h-screen md:overflow-y-auto">
          {shapeLocked && invariantBasis ? (
            <>
              {/* Shape info summary */}
              <ShapeInfoCard
                basis={invariantBasis}
                bridgeInfo={bridgeInfo}
                rows={rows}
                cols={cols}
              />

              {/* Fingerprint panel with working displays */}
              <div data-tour="fingerprint-panel">
                <div className="flex items-center gap-1 mb-1">
                  <h3 className="text-sm font-semibold text-gray-700">Fingerprints</h3>
                  <ShapeWhyDiagnostic
                    basis={invariantBasis}
                    bridgeInfo={bridgeInfo}
                    rows={rows}
                    cols={cols}
                    onOpenGlossary={openGlossaryTo}
                  />
                </div>
                <InvariantPanel
                  basis={invariantBasis}
                  liveGrid={liveGrid}
                  targetGrid={showTarget ? gridB : null}
                />
              </div>

              {/* Strict-rule fingerprints */}
              <StrictFingerprintPanel
                basis={invariantBasis}
                strict={strictBasis}
                liveGrid={liveGrid}
                targetGrid={showTarget ? gridB : null}
              />

              {/* Verdict — replaces the old tab's bare "Prove reachability" button */}
              <div data-tour="prove-button">
              <StrictVerdictPanel
                verdict={showTarget ? verdict : null}
                canProve={!!(showTarget && gridB)}
                onProve={() => setShowProve(true)}
              />
              </div>

              {/* Invariant explanation card */}
              {lastMove && invariantBasis && (
                <PolyInvariantCard move={lastMove} basis={invariantBasis} />
              )}

              {/* History */}
              <HistoryPanel
                history={history}
                historyIndex={historyIndex}
                onJumpTo={handleHistoryJump}
              />
            </>
          ) : (
            <div className="py-8 space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  {shapeLocked
                    ? 'Computing invariants...'
                    : 'Define a shape and lock it to begin.'}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Click cells to toggle them in/out of the shape, or choose a preset.
                </p>
              </div>
              {!shapeLocked && showWalker && (
                <ShapeWalker
                  mask={shapeMask}
                  rows={rows}
                  cols={cols}
                  currentWordLen={(() => { try { return computeInvariantBasis(shapeMask).wordLength; } catch { return 0; } })()}
                  onToggle={(r, c) => dispatch({ type: 'TOGGLE_CELL', row: r, col: c })}
                />
              )}
              {!shapeLocked && (
                <div className="text-center">
                  <button
                    className="text-xs text-blue-500 hover:text-blue-700 underline"
                    onClick={() => setShowWalker(!showWalker)}
                  >
                    {showWalker ? 'Hide shape walker' : 'Show shape walker'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
