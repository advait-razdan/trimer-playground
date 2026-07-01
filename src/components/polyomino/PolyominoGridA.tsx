import type { Grid } from '../../state/types';
import type { ShapeMask } from '../../state/polyomino';

interface PolyominoGridAProps {
  grid: Grid;
  mask: ShapeMask;
  locked: boolean;
  onCellClick: (row: number, col: number) => void;
  onCellShiftClick: (row: number, col: number) => void;
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

export function PolyominoGridA({ grid, mask, locked, onCellClick, onCellShiftClick }: PolyominoGridAProps) {
  const cols = grid[0]?.length ?? 0;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">
        Starting Matrix A {locked && <span className="text-amber-600 text-xs normal-case">(locked)</span>}
      </h3>
      <table className="border-collapse" style={{ borderLeft: '3px solid #94a3b8' }}>
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
                const active = mask[i]?.[j] ?? false;
                return (
                  <td
                    key={j}
                    className="w-10 h-10 border border-gray-300 text-center font-mono text-sm select-none"
                    style={{
                      backgroundColor: active ? getCellColor(val) : '#e5e7eb',
                      backgroundImage: active ? 'none' : 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 6px)',
                      cursor: active && !locked ? 'pointer' : active ? 'not-allowed' : 'default',
                      opacity: active ? (locked ? 0.6 : 1) : 0.4,
                    }}
                    onClick={(e) => {
                      if (!active || locked) return;
                      if (e.shiftKey) {
                        onCellShiftClick(i, j);
                      } else {
                        onCellClick(i, j);
                      }
                    }}
                    title={
                      !active
                        ? 'Inactive cell'
                        : locked
                          ? 'Grid A is locked while moves are active. Reset to edit.'
                          : `Click to cycle value (Shift-click to reverse). Current: ${val}`
                    }
                  >
                    {active ? val : ''}
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
