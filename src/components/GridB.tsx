import type { Grid } from '../state/types';

interface GridBProps {
  grid: Grid;
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

export function GridB({ grid, onCellClick, onCellShiftClick }: GridBProps) {
  const cols = grid[0]?.length ?? 0;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">
        Target Matrix B
      </h3>
      <table className="border-collapse" style={{ borderLeft: '3px solid #f59e0b' }}>
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
              {row.map((val, j) => (
                <td
                  key={j}
                  className="w-10 h-10 border border-gray-300 text-center font-mono text-sm cursor-pointer select-none"
                  style={{ backgroundColor: getCellColor(val) }}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      onCellShiftClick(i, j);
                    } else {
                      onCellClick(i, j);
                    }
                  }}
                  title={`Click to cycle value (Shift-click to reverse). Current: ${val}`}
                >
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
