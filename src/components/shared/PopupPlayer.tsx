/**
 * Shared pieces of the popup move player, extracted verbatim from ProveModal so
 * other tabs can reuse the exact same grid rendering and transport controls.
 * Behavior and markup are unchanged for the existing tabs.
 */

import type { Grid } from '../../state/types';
import type { ShapeMask } from '../../state/polyomino';

const CELL_COLORS: Record<string, string> = {
  '0': '#f3f1ec',
  '1': '#c8dde3',
  '2': '#6fa3b0',
};

function getCellColor(val: number): string {
  if (val >= 3) return '#e8d5a3';
  return CELL_COLORS[String(val)] ?? '#f3f1ec';
}

export function MiniGrid({
  grid,
  mask,
  highlightCells,
  highlightColor = '#22c55e',
}: {
  grid: Grid;
  mask: ShapeMask;
  highlightCells?: Set<string>;
  highlightColor?: string;
}) {
  return (
    <table className="border-collapse">
      <tbody>
        {grid.map((row, i) => (
          <tr key={i}>
            {row.map((val, j) => {
              const active = mask[i]?.[j] ?? false;
              const highlighted = highlightCells?.has(`${i},${j}`);
              return (
                <td
                  key={j}
                  className="w-7 h-7 text-center text-xs font-mono"
                  style={{
                    backgroundColor: active ? getCellColor(val) : '#e5e7eb',
                    border: highlighted
                      ? `2px solid ${highlightColor}`
                      : '1px solid #d1d5db',
                    backgroundImage: active ? 'none' : 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
                    opacity: active ? 1 : 0.3,
                    transition: 'background-color 0.3s ease',
                  }}
                >
                  {active ? val : ''}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface PlayerTransportProps {
  /** Current step, -1 = before the first step. */
  stepIndex: number;
  stepCount: number;
  isPlaying: boolean;
  /** Delay between steps in ms. */
  speed: number;
  onSeek: (index: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSpeedChange: (ms: number) => void;
}

/** The Start / Prev / Play-Pause / Next / End row with speed slider and counter. */
export function PlayerTransport({
  stepIndex,
  stepCount,
  isPlaying,
  speed,
  onSeek,
  onPlay,
  onPause,
  onSpeedChange,
}: PlayerTransportProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40"
        disabled={stepIndex <= -1}
        onClick={() => onSeek(-1)}
      >|&lt;</button>
      <button
        className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40"
        disabled={stepIndex <= -1}
        onClick={() => onSeek(stepIndex - 1)}
      >&lt;</button>
      {isPlaying ? (
        <button
          className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
          onClick={onPause}
        >Stop</button>
      ) : (
        <button
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40"
          disabled={stepIndex >= stepCount - 1}
          onClick={onPlay}
        >Play</button>
      )}
      <button
        className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40"
        disabled={stepIndex >= stepCount - 1}
        onClick={() => onSeek(stepIndex + 1)}
      >&gt;</button>
      <button
        className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40"
        disabled={stepIndex >= stepCount - 1}
        onClick={() => onSeek(stepCount - 1)}
      >&gt;|</button>
      <label className="flex items-center gap-1 ml-2 text-xs text-gray-500">
        Speed
        <input
          type="range"
          min={100}
          max={5000}
          step={100}
          value={5100 - speed}
          onChange={e => onSpeedChange(5100 - Number(e.target.value))}
          className="w-20 h-3 accent-blue-500"
        />
      </label>
      <span className="text-xs text-gray-500 ml-2">
        Step {stepIndex + 1} of {stepCount}
      </span>
    </div>
  );
}
