import type { Grid } from '../../state/types';
import type { ShapeMask } from '../../state/polyomino';
import type { Recipe } from '../engine';
import { MiniGrid } from '../../components/shared/PopupPlayer';

interface ReturnRecipePanelProps {
  gridA: Grid;
  mask: ShapeMask;
  recipe: Recipe | null;
  /** Total forward moves placed (all four types). */
  forwardMoveCount: number;
  showEverySteps: boolean;
  onToggleShowEverySteps: () => void;
  onPlay: () => void;
}

/**
 * Live view of the mechanically-generated return recipe: frozen thumbnail of A,
 * stats line, display-mode toggle, and the button opening the popup player.
 */
export function ReturnRecipePanel({
  gridA,
  mask,
  recipe,
  forwardMoveCount,
  showEverySteps,
  onToggleShowEverySteps,
  onPlay,
}: ReturnRecipePanelProps) {
  const hasMoves = forwardMoveCount > 0;

  return (
    <div className="mt-4 border-t border-gray-200 pt-3 mb-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        Return Recipe
      </h3>

      <div className="flex flex-wrap items-start gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Starting grid A (frozen)</div>
          <MiniGrid grid={gridA} mask={mask} />
        </div>

        <div className="flex-1 min-w-[12rem]">
          {hasMoves && recipe ? (
            <>
              <p className="text-xs text-gray-600 mb-2 font-mono">
                Forward: {forwardMoveCount} move{forwardMoveCount !== 1 ? 's' : ''} &middot; Return:{' '}
                {recipe.stats.replaySteps} replay{recipe.stats.replaySteps !== 1 ? 's' : ''} +{' '}
                {recipe.stats.scaffoldRounds} scaffold round{recipe.stats.scaffoldRounds !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-500 mb-2 font-mono">
                {showEverySteps
                  ? `${recipe.stats.expandedStepCount} steps (every step shown)`
                  : `${recipe.stats.groupedStepCount} steps (scaffolding grouped)`}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400 italic mb-2">
              Place some moves on the live grid first — the return recipe will appear here.
            </p>
          )}

          <label className="flex items-start gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={showEverySteps}
              onChange={onToggleShowEverySteps}
              className="mt-0.5"
            />
            <span className="text-xs text-gray-700 leading-tight">
              Show every step (each +3 and each &minus;3 round individually)
            </span>
          </label>

          <button
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!hasMoves || !recipe}
            onClick={onPlay}
          >
            Play return recipe
          </button>
        </div>
      </div>
    </div>
  );
}
