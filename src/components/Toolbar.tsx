import type { InteractionMode } from '../state/types';

interface ToolbarProps {
  mode: InteractionMode;
  canUndo: boolean;
  canRedo: boolean;
  canMod3: boolean;
  hasHistory: boolean;
  onSetMode: (mode: InteractionMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onMod3: () => void;
  onFillPlus3: () => void;
  onReset: () => void;
  // Optional random auto-play controls (only rendered when onToggleAutoPlay is provided)
  isAutoPlaying?: boolean;
  autoSpeed?: number;
  onToggleAutoPlay?: () => void;
  onAutoSpeedChange?: (ms: number) => void;
}

/** Auto-play delay bounds (ms between random moves) */
const AUTO_SPEED_MIN = 100;
const AUTO_SPEED_MAX = 1500;

const MODE_BUTTONS: { mode: InteractionMode; label: string; shortcut: string; activeColor: string }[] = [
  { mode: 'horizontal-trimer', label: 'H-Trimer', shortcut: 'H', activeColor: 'bg-red-500 text-white border-red-600' },
  { mode: 'vertical-trimer', label: 'V-Trimer', shortcut: 'V', activeColor: 'bg-yellow-500 text-white border-yellow-600' },
  { mode: 'plus-3', label: '+3', shortcut: 'P', activeColor: 'bg-purple-500 text-white border-purple-600' },
];

export function Toolbar({
  mode,
  canUndo,
  canRedo,
  canMod3,
  hasHistory,
  onSetMode,
  onUndo,
  onRedo,
  onMod3,
  onFillPlus3,
  onReset,
  isAutoPlaying = false,
  autoSpeed = 500,
  onToggleAutoPlay,
  onAutoSpeedChange,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center py-2 px-3 bg-gray-50 rounded border border-gray-200">
      <span className="text-xs text-gray-500 mr-1">Mode:</span>
      {MODE_BUTTONS.map(({ mode: m, label, shortcut, activeColor }) => (
        <button
          key={m}
          className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
            mode === m
              ? activeColor
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
          }`}
          onClick={() => onSetMode(mode === m ? 'select' : m)}
          title={`${label} mode (${shortcut}). Click grid cell to apply.`}
        >
          {label} <span className={mode === m ? 'text-white/70' : 'text-gray-400'}>{shortcut}</span>
        </button>
      ))}

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <button
        className="px-3 py-1.5 text-xs font-semibold rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!canMod3}
        onClick={onMod3}
        title={canMod3 ? 'Apply mod-3 reduction to all cells (M)' : 'All cells must be >= 3 to apply mod-3'}
      >
        Mod-3 <span className="text-gray-400">M</span>
      </button>

      <button
        className="px-3 py-1.5 text-xs font-semibold rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
        onClick={onFillPlus3}
        title="Add +3 to every cell with value < 3"
      >
        Fill all +3
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <button
        className="px-2 py-1.5 text-xs rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!canUndo}
        onClick={onUndo}
        title="Undo last move (Ctrl+Z)"
      >
        Undo
      </button>
      <button
        className="px-2 py-1.5 text-xs rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!canRedo}
        onClick={onRedo}
        title="Redo undone move (Ctrl+Shift+Z)"
      >
        Redo
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <button
        className="px-2 py-1.5 text-xs rounded border bg-white text-red-600 border-gray-300 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!hasHistory}
        onClick={onReset}
        title="Reset live grid back to Grid A and clear all move history"
      >
        Reset to start
      </button>

      {/* Random auto-play controls */}
      {onToggleAutoPlay && (
        <>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
              isAutoPlaying
                ? 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600'
                : 'bg-green-600 text-white border-green-700 hover:bg-green-700'
            }`}
            onClick={onToggleAutoPlay}
            title={isAutoPlaying ? 'Pause random move placement' : 'Automatically place random legal trimer moves'}
          >
            {isAutoPlaying ? 'Pause' : 'Start random moves'}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Speed
            <input
              type="range"
              min={AUTO_SPEED_MIN}
              max={AUTO_SPEED_MAX}
              step={100}
              // Slider maps left→right to slow→fast, so invert the delay.
              value={AUTO_SPEED_MIN + AUTO_SPEED_MAX - autoSpeed}
              onChange={(e) => onAutoSpeedChange?.(AUTO_SPEED_MIN + AUTO_SPEED_MAX - Number(e.target.value))}
              className="w-24 accent-green-600"
              title={`${autoSpeed}ms between moves`}
            />
            <span className="tabular-nums text-gray-400 w-12">{autoSpeed}ms</span>
          </label>
        </>
      )}

      {/* Current mode indicator */}
      {mode !== 'select' && (
        <span className="text-xs text-gray-500 ml-2">
          Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Esc</kbd> to deselect
        </span>
      )}
    </div>
  );
}
