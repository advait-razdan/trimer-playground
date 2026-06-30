import { useState, useCallback } from 'react';
import type { Grid, InteractionMode, CellPosition } from '../state/types';
import { validateMove } from '../state/moves';

interface LiveGridProps {
  grid: Grid;
  mode: InteractionMode;
  onCellClick: (pos: CellPosition) => void;
  /** Set of "row,col" keys that should pulse after a move */
  pulseCells?: Set<string>;
  pulseColor?: string;
}

const CELL_COLORS: Record<string, string> = {
  '0': '#f3f1ec',
  '1': '#c8dde3',
  '2': '#6fa3b0',
};

function getCellColor(val: number): string {
  if (val >= 3) return '#e8d5a3'; // sandy tan
  return CELL_COLORS[String(val)] ?? '#f3f1ec';
}

const MODE_LABELS: Record<InteractionMode, string> = {
  'select': '',
  'horizontal-trimer': 'H-Trimer mode',
  'vertical-trimer': 'V-Trimer mode',
  'plus-3': '+3 mode',
};

/** Given hover position and mode, return the list of cells that would be affected */
function getAffectedCells(
  mode: InteractionMode,
  row: number,
  col: number,
): CellPosition[] {
  if (mode === 'horizontal-trimer') {
    return [
      { row, col },
      { row, col: col + 1 },
      { row, col: col + 2 },
    ];
  }
  if (mode === 'vertical-trimer') {
    return [
      { row, col },
      { row: row + 1, col },
      { row: row + 2, col },
    ];
  }
  if (mode === 'plus-3') {
    return [{ row, col }];
  }
  return [];
}

export function LiveGrid({ grid, mode, onCellClick, pulseCells, pulseColor }: LiveGridProps) {
  const cols = grid[0]?.length ?? 0;
  const [hoverCell, setHoverCell] = useState<CellPosition | null>(null);

  const handleMouseEnter = useCallback((row: number, col: number) => {
    setHoverCell({ row, col });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
  }, []);

  // Compute hover preview
  let previewCells: Set<string> = new Set();
  let previewLegal = false;

  if (hoverCell && mode !== 'select') {
    const affected = getAffectedCells(mode, hoverCell.row, hoverCell.col);
    const moveType = mode === 'horizontal-trimer' ? 'horizontal-trimer'
      : mode === 'vertical-trimer' ? 'vertical-trimer'
      : 'plus-3';
    const validation = validateMove(grid, moveType, hoverCell);
    previewLegal = validation.valid;
    for (const cell of affected) {
      previewCells.add(`${cell.row},${cell.col}`);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">
        Live Grid
        {mode !== 'select' && (
          <span className="ml-2 text-blue-600 normal-case">({MODE_LABELS[mode]})</span>
        )}
      </h3>
      <table className="border-collapse" style={{ borderLeft: '3px solid #3b82f6' }} onMouseLeave={handleMouseLeave}>
        <thead>
          <tr>
            <th className="w-8 h-8" />
            {Array.from({ length: cols }, (_, j) => (
              <th key={j} className="w-10 h-6 text-xs text-gray-400 font-mono">{j}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, i) => (
            <tr key={i}>
              <td className="text-xs text-gray-400 font-mono text-right pr-1">{i}</td>
              {row.map((val, j) => {
                const cellKey = `${i},${j}`;
                const isPreview = previewCells.has(cellKey);
                const isPulse = pulseCells?.has(cellKey);

                // Border style for hover preview
                let borderStyle = '1px solid #d1d5db'; // default gray-300
                if (isPreview) {
                  borderStyle = previewLegal
                    ? '2px solid #22c55e' // green
                    : '2px solid #ef4444'; // red
                }

                // Pulse animation
                let bgColor = getCellColor(val);
                if (isPulse && pulseColor) {
                  bgColor = pulseColor;
                }

                const cursor = mode === 'select' ? 'default' : 'pointer';

                return (
                  <td
                    key={j}
                    className="w-10 h-10 text-center font-mono text-sm select-none"
                    style={{
                      backgroundColor: bgColor,
                      border: borderStyle,
                      cursor,
                      transition: 'background-color 0.3s ease',
                    }}
                    onMouseEnter={() => handleMouseEnter(i, j)}
                    onClick={() => onCellClick({ row: i, col: j })}
                  >
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
