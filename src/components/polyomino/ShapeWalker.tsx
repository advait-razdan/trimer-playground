import { useMemo } from 'react';
import type { ShapeMask } from '../../state/polyomino';
import { validateToggle } from '../../state/polyomino';
import { computeInvariantBasis } from '../../state/invariants';

interface ShapeWalkerProps {
  mask: ShapeMask;
  rows: number;
  cols: number;
  currentWordLen: number;
  onToggle: (row: number, col: number) => void;
}

interface CellDelta {
  row: number;
  col: number;
  active: boolean;
  canToggle: boolean;
  wordLen: number | null;
}

export function ShapeWalker({ mask, rows, cols, currentWordLen, onToggle }: ShapeWalkerProps) {
  const deltas = useMemo(() => {
    const results: CellDelta[] = [];
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const active = mask[i][j];
        const v = validateToggle(mask, i, j);
        if (!v.valid) {
          results.push({ row: i, col: j, active, canToggle: false, wordLen: null });
          continue;
        }
        // Create toggled mask
        const newMask = mask.map(r => [...r]);
        newMask[i][j] = !newMask[i][j];
        try {
          const basis = computeInvariantBasis(newMask);
          results.push({ row: i, col: j, active, canToggle: true, wordLen: basis.wordLength });
        } catch {
          results.push({ row: i, col: j, active, canToggle: true, wordLen: null });
        }
      }
    }
    return results;
  }, [mask, rows, cols]);

  return (
    <div className="p-3 bg-gray-50 rounded border border-gray-200">
      <h4 className="text-xs font-semibold text-gray-600 mb-2">
        Shape Walker <span className="font-normal text-gray-400">(current word length: {currentWordLen})</span>
      </h4>
      <p className="text-[10px] text-gray-400 mb-2">
        Toggle one cell to see how the word length changes. Green = increases, red = decreases.
      </p>
      <table className="border-collapse">
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i}>
              {Array.from({ length: cols }, (_, j) => {
                const d = deltas[i * cols + j];
                if (!d) return <td key={j} />;
                const delta = d.wordLen !== null ? d.wordLen - currentWordLen : null;
                return (
                  <td
                    key={j}
                    className="w-8 h-8 text-center text-[10px] font-mono border border-gray-200 select-none"
                    style={{
                      backgroundColor: !d.canToggle
                        ? '#f3f4f6'
                        : delta === null
                        ? '#f3f4f6'
                        : delta > 0
                        ? '#dcfce7'
                        : delta < 0
                        ? '#fecaca'
                        : '#fef3c7',
                      cursor: d.canToggle ? 'pointer' : 'not-allowed',
                      opacity: d.canToggle ? 1 : 0.4,
                    }}
                    onClick={() => d.canToggle && onToggle(i, j)}
                    title={
                      !d.canToggle
                        ? 'Cannot toggle (would disconnect or create hole)'
                        : d.wordLen !== null
                        ? `Word len: ${d.wordLen} (${delta! > 0 ? '+' : ''}${delta})`
                        : 'Error computing'
                    }
                  >
                    {d.canToggle && d.wordLen !== null
                      ? (delta === 0 ? '=' : delta! > 0 ? `+${delta}` : `${delta}`)
                      : d.active ? '\u00B7' : ''}
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
