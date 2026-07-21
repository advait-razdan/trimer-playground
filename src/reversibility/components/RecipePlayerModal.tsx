import { useState, useEffect, useRef } from 'react';
import type { Grid } from '../../state/types';
import type { ShapeMask } from '../../state/polyomino';
import { MiniGrid, PlayerTransport } from '../../components/shared/PopupPlayer';
import type { Recipe, RecipeStep, GroupedRecipeStep } from '../engine';
import { applyRecipeStep, applyGroupedStep, gridsEqual } from '../engine';

interface RecipePlayerModalProps {
  recipe: Recipe;
  /** Playback granularity: every individual step, or scaffold rounds grouped. */
  mode: 'expanded' | 'grouped';
  /** Copy of the grid the recipe starts from (B). Never the live grid itself. */
  startGrid: Grid;
  /** The frozen starting grid the recipe must return to. */
  gridA: Grid;
  mask: ShapeMask;
  onClose: () => void;
}

/** Highlight colors per step kind — consistent with the app's move-type colors. */
const STEP_COLORS = {
  triple: '#22c55e', // green, matches the existing player's move highlight
  plus3: '#a855f7',  // purple, matches the +3 pulse color
  renorm: '#6b7280', // gray, matches the mod-3 history dot
};

type PlaybackStep = RecipeStep | GroupedRecipeStep;

function stepColor(step: PlaybackStep): string {
  if (step.kind === 'triple') return STEP_COLORS.triple;
  if (step.kind === 'plus3') return STEP_COLORS.plus3;
  return STEP_COLORS.renorm;
}

function stepCells(step: PlaybackStep, rows: number, cols: number): Set<string> {
  const keys = new Set<string>();
  if (step.kind === 'triple') {
    for (const { row, col } of step.cells) keys.add(`${row},${col}`);
  } else if (step.kind === 'plus3') {
    keys.add(`${step.cell.row},${step.cell.col}`);
  } else {
    // renorm or grouped scaffold round: the whole grid is involved
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) keys.add(`${i},${j}`);
    }
  }
  return keys;
}

function stepLabel(step: PlaybackStep): string {
  switch (step.kind) {
    case 'triple':
      return `Replaying forward move #${step.forwardIndex + 1} (${
        step.replay === 1 ? 'first' : 'second'
      } of two extra times)`;
    case 'plus3':
      return `Scaffolding: +3 at (${step.cell.row},${step.cell.col})`;
    case 'renorm':
      return 'Scaffolding: −3 to every cell (renormalize)';
    case 'scaffold':
      return 'scaffolding (+3 below 3, then −3 all) — changes nothing mod 3.';
  }
}

function applyPlaybackStep(grid: Grid, step: PlaybackStep): Grid {
  return step.kind === 'scaffold' ? applyGroupedStep(grid, step) : applyRecipeStep(grid, step);
}

/**
 * The popup player for the return recipe. Same modal shell and transport
 * controls as the Prove Reachability player; animates the recipe on a copy of
 * the grid and never mutates the real one.
 */
export function RecipePlayerModal({ recipe, mode, startGrid, gridA, mask, onClose }: RecipePlayerModalProps) {
  const steps: PlaybackStep[] = mode === 'expanded' ? recipe.steps : recipe.groupedSteps;
  const [stepIndex, setStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(800);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rows = startGrid.length;
  const cols = startGrid[0]?.length ?? 0;

  // Grid state at the current step (recomputed per render, like the existing player)
  let currentGrid = startGrid.map(r => [...r]);
  for (let s = 0; s <= stepIndex && s < steps.length; s++) {
    currentGrid = applyPlaybackStep(currentGrid, steps[s]);
  }

  const currentStep = stepIndex >= 0 && stepIndex < steps.length ? steps[stepIndex] : null;
  const highlightCells = currentStep ? stepCells(currentStep, rows, cols) : undefined;
  const highlightColor = currentStep ? stepColor(currentStep) : undefined;

  const atEnd = stepIndex >= steps.length - 1;
  const backAtA = gridsEqual(currentGrid, gridA);

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return;
    if (stepIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      setStepIndex(prev => prev + 1);
    }, playbackSpeed);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, stepIndex, steps.length, playbackSpeed]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Georgia, serif' }}>
            Play Return Recipe
          </h2>
          <button
            className="text-gray-400 hover:text-gray-600 text-xl"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="space-y-3">
          <PlayerTransport
            stepIndex={stepIndex}
            stepCount={steps.length}
            isPlaying={isPlaying}
            speed={playbackSpeed}
            onSeek={setStepIndex}
            onPlay={() => { setIsPlaying(true); if (stepIndex < 0) setStepIndex(0); }}
            onPause={() => setIsPlaying(false)}
            onSpeedChange={setPlaybackSpeed}
          />

          <MiniGrid
            grid={currentGrid}
            mask={mask}
            highlightCells={highlightCells}
            highlightColor={highlightColor}
          />

          {currentStep && (
            <div className="text-xs text-gray-600 px-2 py-1 bg-gray-50 border border-gray-200 rounded">
              {stepLabel(currentStep)}
            </div>
          )}

          {/* Step list */}
          <div className="max-h-40 overflow-y-auto text-xs font-mono space-y-0.5">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  i === stepIndex ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setStepIndex(i)}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: stepColor(step) }}
                />
                {i + 1}. {stepLabel(step)}
              </div>
            ))}
          </div>

          {atEnd && backAtA && (
            <div className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
              <span className="font-semibold">Back at A — exact match.</span>{' '}
              Every cell equals the frozen starting grid, checked cell-for-cell.
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
