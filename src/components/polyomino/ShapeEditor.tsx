import type { ShapeMask } from '../../state/polyomino';
import type { PolyominoPreset } from '../../presets/polyominoPresets';
import { POLYOMINO_PRESETS } from '../../presets/polyominoPresets';

interface ShapeEditorProps {
  rows: number;
  cols: number;
  mask: ShapeMask;
  locked: boolean;
  bridgeCells?: Set<string>;
  onToggleCell: (row: number, col: number) => void;
  onSetDimensions: (rows: number, cols: number) => void;
  onLockShape: () => void;
  onUnlockShape: () => void;
  onLoadPreset: (mask: ShapeMask) => void;
}

export function ShapeEditor({
  rows,
  cols,
  mask,
  locked,
  bridgeCells,
  onToggleCell,
  onSetDimensions,
  onLockShape,
  onUnlockShape,
  onLoadPreset,
}: ShapeEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Shape Editor
        </h3>
        {locked && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded" title="Editing the shape would reset all profiles and history. Click 'Edit shape' if you want to do that.">
            Shape is locked
          </span>
        )}
      </div>

      {/* Dimension controls + presets */}
      {!locked && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="text-gray-600">
            Rows:
            <input
              type="number"
              min={2}
              max={12}
              value={rows}
              onChange={(e) => {
                const val = Math.min(12, Math.max(2, parseInt(e.target.value) || 5));
                onSetDimensions(val, cols);
              }}
              className="ml-1 w-14 border border-gray-300 rounded px-2 py-0.5 text-center"
            />
          </label>
          <label className="text-gray-600">
            Cols:
            <input
              type="number"
              min={2}
              max={12}
              value={cols}
              onChange={(e) => {
                const val = Math.min(12, Math.max(2, parseInt(e.target.value) || 5));
                onSetDimensions(rows, val);
              }}
              className="ml-1 w-14 border border-gray-300 rounded px-2 py-0.5 text-center"
            />
          </label>
          <select
            className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
            value=""
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              if (!isNaN(idx)) {
                onLoadPreset(POLYOMINO_PRESETS[idx].mask);
              }
            }}
          >
            <option value="">Load shape preset...</option>
            {POLYOMINO_PRESETS.map((p: PolyominoPreset, i: number) => (
              <option key={i} value={i}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Shape canvas */}
      <div>
        <table className="border-collapse" style={{ borderLeft: `3px solid ${locked ? '#d97706' : '#6b7280'}` }}>
          <thead>
            <tr>
              <th className="w-8 h-8" />
              {Array.from({ length: cols }, (_, j) => (
                <th key={j} className="w-10 h-6 text-xs text-gray-400 font-mono">{j}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mask.map((row, i) => (
              <tr key={i}>
                <td className="text-xs text-gray-400 font-mono text-right pr-1">{i}</td>
                {row.map((active, j) => {
                  const isBridge = locked && bridgeCells?.has(`${i},${j}`);
                  return (
                  <td
                    key={j}
                    className="w-10 h-10 text-center select-none"
                    style={{
                      backgroundColor: active ? '#f3f1ec' : '#e5e7eb',
                      backgroundImage: active ? 'none' : 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 6px)',
                      cursor: locked ? 'default' : 'pointer',
                      opacity: locked ? 0.7 : 1,
                      border: isBridge ? '2px solid #e11d48' : '1px solid #d1d5db',
                    }}
                    onClick={() => {
                      if (!locked) onToggleCell(i, j);
                    }}
                    title={
                      locked
                        ? (active ? 'Active cell' : 'Inactive cell')
                        : (active ? 'Click to remove from shape' : 'Click to add to shape')
                    }
                  >
                    {!locked && (
                      <span className="text-xs text-gray-400">
                        {active ? '\u2713' : ''}
                      </span>
                    )}
                    {isBridge && (
                      <span className="text-[8px] text-red-500" title="Width-1 bridge cell">B</span>
                    )}
                  </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lock/unlock button */}
      <div className="flex gap-2" data-tour="lock-button">
        {!locked ? (
          <button
            className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700"
            onClick={onLockShape}
          >
            Lock shape
          </button>
        ) : (
          <button
            className="px-3 py-1.5 text-xs border border-amber-600 text-amber-600 rounded hover:bg-amber-50"
            onClick={() => {
              if (window.confirm('Editing the shape will reset all profiles and move history. Continue?')) {
                onUnlockShape();
              }
            }}
          >
            Edit shape
          </button>
        )}
      </div>
    </div>
  );
}
