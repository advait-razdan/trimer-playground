import { useState } from 'react';
import type { Move } from '../state/types';

interface InvariantCardProps {
  move: Move;
}

function getExplanation(move: Move): { title: string; lines: string[] } {
  if (move.type === 'horizontal-trimer' && move.position) {
    const { row: i, col: j } = move.position;
    return {
      title: `H-trimer at (${i}, ${j})`,
      lines: [
        `F1 changes by 1+1+1 = 3 \u2261 0 (mod 3)`,
        `F2 changes by ${i}+${i}+${i} = ${3 * i} = 3\u00b7${i} \u2261 0 (mod 3)`,
        `F3 changes by ${j}+(${j}+1)+(${j}+2) = ${3 * j + 3} = 3\u00b7${j + 1} \u2261 0 (mod 3)`,
        `F4 changes by ${i}\u00b7${j} + ${i}\u00b7${j + 1} + ${i}\u00b7${j + 2} = ${i}\u00b7(${j}+${j + 1}+${j + 2}) = ${i}\u00b7${3 * j + 3} = 3\u00b7${i}\u00b7${j + 1} \u2261 0 (mod 3)`,
      ],
    };
  }

  if (move.type === 'vertical-trimer' && move.position) {
    const { row: i, col: j } = move.position;
    return {
      title: `V-trimer at (${i}, ${j})`,
      lines: [
        `F1 changes by 1+1+1 = 3 \u2261 0 (mod 3)`,
        `F2 changes by ${i}+(${i}+1)+(${i}+2) = ${3 * i + 3} = 3\u00b7${i + 1} \u2261 0 (mod 3)`,
        `F3 changes by ${j}+${j}+${j} = ${3 * j} = 3\u00b7${j} \u2261 0 (mod 3)`,
        `F4 changes by ${i}\u00b7${j} + ${i + 1}\u00b7${j} + ${i + 2}\u00b7${j} = ${j}\u00b7(${i}+${i + 1}+${i + 2}) = ${j}\u00b7${3 * i + 3} = 3\u00b7${j}\u00b7${i + 1} \u2261 0 (mod 3)`,
      ],
    };
  }

  if (move.type === 'plus-3' && move.position) {
    const { row: i, col: j } = move.position;
    return {
      title: `+3 at (${i}, ${j})`,
      lines: [
        `F1 changes by 3 \u2261 0 (mod 3)`,
        `F2 changes by ${i}\u00b73 = ${3 * i} \u2261 0 (mod 3)`,
        `F3 changes by ${j}\u00b73 = ${3 * j} \u2261 0 (mod 3)`,
        `F4 changes by ${i}\u00b7${j}\u00b73 = ${3 * i * j} \u2261 0 (mod 3)`,
      ],
    };
  }

  if (move.type === 'mod-3') {
    return {
      title: 'Mod-3 reduction',
      lines: [
        'Every cell had value \u2265 3. The mod-3 operation subtracts a multiple of 3 from each cell.',
        'Since each cell changes by a multiple of 3, all four fingerprints (which are sums mod 3) are unchanged.',
        'F1: each cell loses 3k, total change = 3\u00b7(sum of k_ij) \u2261 0',
        'F2: change = \u03a3 i\u00b73k_ij = 3\u00b7\u03a3 i\u00b7k_ij \u2261 0',
        'F3: change = \u03a3 j\u00b73k_ij = 3\u00b7\u03a3 j\u00b7k_ij \u2261 0',
        'F4: change = \u03a3 ij\u00b73k_ij = 3\u00b7\u03a3 ij\u00b7k_ij \u2261 0',
      ],
    };
  }

  return { title: 'Move', lines: [] };
}

export function InvariantCard({ move }: InvariantCardProps) {
  const [expanded, setExpanded] = useState(true);
  const { title, lines } = getExplanation(move);

  if (lines.length === 0) return null;

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
        <div className="px-3 pb-3">
          {lines.map((line, idx) => (
            <div key={idx} className="text-xs font-mono text-amber-900 leading-relaxed">
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
