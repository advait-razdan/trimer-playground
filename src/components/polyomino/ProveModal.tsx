import { useState, useEffect, useRef } from 'react';
import type { Grid } from '../../state/types';
import type { ShapeMask } from '../../state/polyomino';
import type { InvariantBasis } from '../../state/invariants';
import { prove } from '../../state/proof';
import type { ProofResult } from '../../state/proof';
import type { MoveStep } from '../../state/bfs';

interface ProveModalProps {
  liveGrid: Grid;
  targetGrid: Grid;
  mask: ShapeMask;
  basis: InvariantBasis;
  onClose: () => void;
}

const CELL_COLORS: Record<string, string> = {
  '0': '#f3f1ec',
  '1': '#c8dde3',
  '2': '#6fa3b0',
};

function getCellColor(val: number): string {
  if (val >= 3) return '#e8d5a3';
  return CELL_COLORS[String(val)] ?? '#f3f1ec';
}

/** Non-negative mod 3. */
function mod3(n: number): number {
  return ((n % 3) + 3) % 3;
}

/** Apply a single move step to a grid (in-place mod-3 space). Returns new grid. */
function applyMoveStep(grid: Grid, _mask: ShapeMask, step: MoveStep): Grid {
  const newGrid = grid.map(r => [...r]);
  const { direction, row, col, multiplicity } = step;

  if (direction === 'H') {
    newGrid[row][col] = mod3(newGrid[row][col] + multiplicity);
    newGrid[row][col + 1] = mod3(newGrid[row][col + 1] + multiplicity);
    newGrid[row][col + 2] = mod3(newGrid[row][col + 2] + multiplicity);
  } else {
    newGrid[row][col] = mod3(newGrid[row][col] + multiplicity);
    newGrid[row + 1][col] = mod3(newGrid[row + 1][col] + multiplicity);
    newGrid[row + 2][col] = mod3(newGrid[row + 2][col] + multiplicity);
  }
  return newGrid;
}

function MiniGrid({ grid, mask, highlightCells }: { grid: Grid; mask: ShapeMask; highlightCells?: Set<string> }) {
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
                  className="w-7 h-7 text-center text-xs font-mono border border-gray-200"
                  style={{
                    backgroundColor: active
                      ? highlighted
                        ? 'rgba(59, 130, 246, 0.3)'
                        : getCellColor(val)
                      : '#e5e7eb',
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

function ReachableDisplay({ sequence, liveGrid, mask }: { sequence: MoveStep[]; liveGrid: Grid; mask: ShapeMask }) {
  const [stepIndex, setStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute the grid state at the current step
  let currentGrid = liveGrid.map(r => [...r]);
  // Reduce to mod 3 first
  currentGrid = currentGrid.map((row, i) =>
    row.map((val, j) => mask[i]?.[j] ? mod3(val) : 0)
  );

  for (let s = 0; s <= stepIndex && s < sequence.length; s++) {
    currentGrid = applyMoveStep(currentGrid, mask, sequence[s]);
  }

  // Highlight cells for current step
  const highlightCells = new Set<string>();
  if (stepIndex >= 0 && stepIndex < sequence.length) {
    const step = sequence[stepIndex];
    if (step.direction === 'H') {
      highlightCells.add(`${step.row},${step.col}`);
      highlightCells.add(`${step.row},${step.col + 1}`);
      highlightCells.add(`${step.row},${step.col + 2}`);
    } else {
      highlightCells.add(`${step.row},${step.col}`);
      highlightCells.add(`${step.row + 1},${step.col}`);
      highlightCells.add(`${step.row + 2},${step.col}`);
    }
  }

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return;
    if (stepIndex >= sequence.length - 1) {
      setIsPlaying(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      setStepIndex(prev => prev + 1);
    }, 600);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, stepIndex, sequence.length]);

  if (sequence.length === 0) {
    return (
      <div className="text-sm text-gray-600">
        Words match, so these profiles are reachable. The move sequence is too long to display.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40"
          disabled={stepIndex <= -1}
          onClick={() => setStepIndex(-1)}
        >|&lt;</button>
        <button
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40"
          disabled={stepIndex <= -1}
          onClick={() => setStepIndex(prev => prev - 1)}
        >&lt;</button>
        {isPlaying ? (
          <button
            className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
            onClick={() => setIsPlaying(false)}
          >Stop</button>
        ) : (
          <button
            className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40"
            disabled={stepIndex >= sequence.length - 1}
            onClick={() => { setIsPlaying(true); if (stepIndex < 0) setStepIndex(0); }}
          >Play</button>
        )}
        <button
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40"
          disabled={stepIndex >= sequence.length - 1}
          onClick={() => setStepIndex(prev => prev + 1)}
        >&gt;</button>
        <button
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40"
          disabled={stepIndex >= sequence.length - 1}
          onClick={() => setStepIndex(sequence.length - 1)}
        >&gt;|</button>
        <span className="text-xs text-gray-500 ml-2">
          Step {stepIndex + 1} of {sequence.length}
        </span>
      </div>

      <MiniGrid grid={currentGrid} mask={mask} highlightCells={highlightCells} />

      {/* Move list */}
      <div className="max-h-40 overflow-y-auto text-xs font-mono space-y-0.5">
        {sequence.map((step, i) => (
          <div
            key={i}
            className={`px-2 py-0.5 rounded cursor-pointer ${
              i === stepIndex ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setStepIndex(i)}
          >
            {i + 1}. {step.direction}-trimer at ({step.row},{step.col}) {step.multiplicity === 2 ? '\u00d72' : ''}
          </div>
        ))}
      </div>

      <div className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
        Proved by demonstration: a real sequence of {sequence.length} legal trimer move{sequence.length !== 1 ? 's' : ''} takes A to B.
      </div>
    </div>
  );
}

export function ProveModal({ liveGrid, targetGrid, mask, basis, onClose }: ProveModalProps) {
  const [result, setResult] = useState<ProofResult | null>(null);
  const [computing, setComputing] = useState(true);

  useEffect(() => {
    // Run proof in next microtask to allow modal to render first
    const timer = setTimeout(() => {
      const r = prove(liveGrid, targetGrid, basis);
      setResult(r);
      setComputing(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [liveGrid, targetGrid, basis]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Georgia, serif' }}>
            Prove Reachability
          </h2>
          <button
            className="text-gray-400 hover:text-gray-600 text-xl"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {computing && (
          <div className="text-sm text-gray-500 py-8 text-center">
            Computing proof...
          </div>
        )}

        {result?.type === 'identical' && (
          <div className="text-sm text-gray-600">
            The live grid and target B are identical. No moves needed.
          </div>
        )}

        {result?.type === 'reachable' && (
          <ReachableDisplay sequence={result.sequence} liveGrid={liveGrid} mask={mask} />
        )}

        {result?.type === 'unreachable_exhaustive' && (
          <div className="space-y-2">
            <div className="text-sm text-gray-700">
              BFS enumerated <span className="font-semibold font-mono">{result.totalReachable}</span> states reachable from the live grid. Target B is <span className="font-semibold text-red-700">not among them</span>.
            </div>
            <div className="text-xs text-gray-600">
              Disagreeing fingerprints:
              {result.disagreeing.map(d => (
                <div key={d.name} className="ml-2">
                  {d.name}: live = {d.valueA}, B = {d.valueB}
                </div>
              ))}
            </div>
            <div className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded border border-red-200">
              Proved: no sequence of legal trimer moves can take A to B.
            </div>
          </div>
        )}

        {result?.type === 'unreachable_algebraic' && (
          <div className="space-y-2">
            {result.bfsCapped && (
              <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mb-2">
                Shape too large for exhaustive demonstration; here is the algebraic proof instead.
              </div>
            )}
            <div className="text-sm text-gray-700">
              The following fingerprint{result.disagreeing.length > 1 ? 's' : ''} disagree{result.disagreeing.length === 1 ? 's' : ''}:
            </div>
            {result.disagreeing.map(d => (
              <div key={d.name} className="text-sm ml-2 text-gray-700">
                <span className="font-semibold">{d.name}</span>: live = <span className="font-mono">{d.valueA}</span>, B = <span className="font-mono">{d.valueB}</span>
              </div>
            ))}
            <div className="text-xs text-gray-600 mt-2 bg-gray-50 px-3 py-2 rounded border border-gray-200">
              Every legal move (H-trimer, V-trimer, +3) changes each fingerprint by a multiple of 3, which is 0 mod 3.
              So every fingerprint is frozen — if the live grid has {result.disagreeing[0].name} = {result.disagreeing[0].valueA} and B has {result.disagreeing[0].name} = {result.disagreeing[0].valueB},
              no sequence of moves can ever bridge that gap.
            </div>
            <div className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded border border-red-200">
              Proved: no sequence of legal trimer moves can take A to B.
            </div>
          </div>
        )}

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
