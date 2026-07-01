import { useState } from 'react';
import type { Move } from '../../state/types';
import type { InvariantBasis, NamedFingerprint } from '../../state/invariants';

interface PolyInvariantCardProps {
  move: Move;
  basis: InvariantBasis;
}

/** Non-negative mod 3 */
function mod3(n: number): number {
  return ((n % 3) + 3) % 3;
}

function getCanonicalLines(move: Move): string[] {
  if (move.type === 'horizontal-trimer' && move.position) {
    const { row: i, col: j } = move.position;
    return [
      `F1 changes by 1+1+1 = 3 \u2261 0 (mod 3) \u2713`,
      `F2 changes by ${i}+${i}+${i} = ${3 * i} = 3\u00b7${i} \u2261 0 (mod 3) \u2713`,
      `F3 changes by ${j}+(${j + 1})+(${j + 2}) = ${3 * j + 3} = 3\u00b7${j + 1} \u2261 0 (mod 3) \u2713`,
      `F4 changes by ${i}\u00b7${j}+${i}\u00b7${j + 1}+${i}\u00b7${j + 2} = 3\u00b7${i}\u00b7${j + 1} \u2261 0 (mod 3) \u2713`,
    ];
  }
  if (move.type === 'vertical-trimer' && move.position) {
    const { row: i, col: j } = move.position;
    return [
      `F1 changes by 1+1+1 = 3 \u2261 0 (mod 3) \u2713`,
      `F2 changes by ${i}+(${i + 1})+(${i + 2}) = ${3 * i + 3} = 3\u00b7${i + 1} \u2261 0 (mod 3) \u2713`,
      `F3 changes by ${j}+${j}+${j} = ${3 * j} = 3\u00b7${j} \u2261 0 (mod 3) \u2713`,
      `F4 changes by ${i}\u00b7${j}+(${i + 1})\u00b7${j}+(${i + 2})\u00b7${j} = 3\u00b7${j}\u00b7${i + 1} \u2261 0 (mod 3) \u2713`,
    ];
  }
  if (move.type === 'plus-3' && move.position) {
    const { row: i, col: j } = move.position;
    return [
      `F1 changes by 3 \u2261 0 (mod 3) \u2713`,
      `F2 changes by ${i}\u00b73 = ${3 * i} \u2261 0 (mod 3) \u2713`,
      `F3 changes by ${j}\u00b73 = ${3 * j} \u2261 0 (mod 3) \u2713`,
      `F4 changes by ${i}\u00b7${j}\u00b73 = ${3 * i * j} \u2261 0 (mod 3) \u2713`,
    ];
  }
  if (move.type === 'mod-3') {
    return [
      'Each cell changes by a multiple of 3, so all fingerprints change by 0 mod 3. \u2713',
    ];
  }
  return [];
}

function getExtraLine(move: Move, fp: NamedFingerprint, basis: InvariantBasis): string {
  if (move.type === 'mod-3') {
    return `${fp.name}: each cell changes by 3k, weighted change = 3\u00b7\u03a3(w_k\u00b7k) \u2261 0 (mod 3) \u2713`;
  }
  if (move.type === 'plus-3' && move.position) {
    const { row, col } = move.position;
    const idx = basis.cellIndex[row]?.[col] ?? -1;
    const weight = idx >= 0 ? fp.weights[idx] : 0;
    return `${fp.name}: weight at (${row},${col}) = ${weight}, change = ${weight}\u00b73 = ${weight * 3} \u2261 0 (mod 3) \u2713`;
  }

  // Trimer moves
  const cells: { row: number; col: number }[] = [];
  if (move.type === 'horizontal-trimer' && move.position) {
    const { row, col } = move.position;
    cells.push({ row, col }, { row, col: col + 1 }, { row, col: col + 2 });
  } else if (move.type === 'vertical-trimer' && move.position) {
    const { row, col } = move.position;
    cells.push({ row, col }, { row: row + 1, col }, { row: row + 2, col });
  }

  const weights = cells.map(c => {
    const idx = basis.cellIndex[c.row]?.[c.col] ?? -1;
    return idx >= 0 ? fp.weights[idx] : 0;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  const weightStr = weights.map((w) => `${w}`).join('+');

  return `${fp.name}: weights = ${weightStr}, change = ${sum} \u2261 ${mod3(sum)} (mod 3) \u2713`;
}

export function PolyInvariantCard({ move, basis }: PolyInvariantCardProps) {
  const [expanded, setExpanded] = useState(true);
  const canonicalLines = getCanonicalLines(move);

  if (canonicalLines.length === 0) return null;

  const title = move.type === 'horizontal-trimer' && move.position
    ? `H-trimer at (${move.position.row}, ${move.position.col})`
    : move.type === 'vertical-trimer' && move.position
      ? `V-trimer at (${move.position.row}, ${move.position.col})`
      : move.type === 'plus-3' && move.position
        ? `+3 at (${move.position.row}, ${move.position.col})`
        : 'Mod-3 reduction';

  return (
    <div className="mb-3 border border-amber-200 bg-amber-50 rounded overflow-hidden">
      <button
        className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Why does this preserve fingerprints? ({title})</span>
        <span className="text-amber-500">{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1">
          {canonicalLines.map((line, idx) => (
            <div key={idx} className="text-xs font-mono text-amber-900 leading-relaxed">
              {line}
            </div>
          ))}
          {basis.extras.length > 0 && (
            <>
              <div className="text-xs text-amber-700 font-semibold mt-2">Extras:</div>
              {basis.extras.map(fp => (
                <div key={fp.name} className="text-xs font-mono text-amber-900 leading-relaxed">
                  {getExtraLine(move, fp, basis)}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
