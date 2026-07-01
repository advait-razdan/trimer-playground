import { useState } from 'react';
import type { Grid } from '../../state/types';
import type { InvariantBasis, NamedFingerprint } from '../../state/invariants';
import { computeWord } from '../../state/invariants';

interface InvariantPanelProps {
  basis: InvariantBasis;
  liveGrid: Grid;
  targetGrid: Grid | null;
}

/** Non-negative mod 3 */
function mod3(n: number): number {
  return ((n % 3) + 3) % 3;
}

/** Canonical formula descriptions */
const CANONICAL_FORMULAS: Record<string, { formula: string; desc: string; multiplier: (r: number, c: number) => number }> = {
  F1: { formula: '\u03a3 value', desc: 'total', multiplier: () => 1 },
  F2: { formula: '\u03a3 (i \u00b7 value)', desc: 'row-weighted', multiplier: (r) => r },
  F3: { formula: '\u03a3 (j \u00b7 value)', desc: 'col-weighted', multiplier: (_r: number, c: number) => c },
  F4: { formula: '\u03a3 (i\u00b7j \u00b7 value)', desc: 'bilinear', multiplier: (r, c) => r * c },
};

function CanonicalWorking({ fp, grid, basis }: { fp: NamedFingerprint; grid: Grid; basis: InvariantBasis }) {
  const info = CANONICAL_FORMULAS[fp.name];
  if (!info) return null;

  const rows = grid.length;
  // Group active cells by row
  const rowGroups: { row: number; cells: { col: number; value: number; mult: number }[] }[] = [];
  for (let i = 0; i < rows; i++) {
    const cells: { col: number; value: number; mult: number }[] = [];
    for (const cell of basis.cells) {
      if (cell.row === i) {
        cells.push({
          col: cell.col,
          value: grid[cell.row][cell.col],
          mult: info.multiplier(cell.row, cell.col),
        });
      }
    }
    if (cells.length > 0) {
      rowGroups.push({ row: i, cells });
    }
  }

  let grandTotal = 0;
  const lines: string[] = [];
  lines.push(`${fp.name} = ${info.formula}, mod 3`);
  lines.push('');

  for (const group of rowGroups) {
    const parts: string[] = [];
    let rowSum = 0;
    for (const c of group.cells) {
      const contribution = c.mult * c.value;
      rowSum += contribution;
      if (fp.name === 'F1') {
        parts.push(`${c.value}`);
      } else if (fp.name === 'F2') {
        parts.push(`${c.mult}\u00b7${c.value}`);
      } else if (fp.name === 'F3') {
        parts.push(`${c.mult}\u00b7${c.value}`);
      } else {
        parts.push(`${group.row}\u00b7${c.col}\u00b7${c.value}`);
      }
    }
    grandTotal += rowSum;

    lines.push(`Row ${group.row}: ${parts.join(' + ')} = ${rowSum}`);
  }

  lines.push(`${''.padStart(20, '\u2500')}`);
  lines.push(`Total = ${grandTotal}`);
  lines.push(`${grandTotal} mod 3 = ${mod3(grandTotal)}`);

  return (
    <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
      {lines.join('\n')}
    </pre>
  );
}

function ExtraWorking({ fp, grid, basis }: { fp: NamedFingerprint; grid: Grid; basis: InvariantBasis }) {
  const [showSkipped, setShowSkipped] = useState(false);

  let total = 0;
  const contributions: { row: number; col: number; weight: number; value: number; product: number }[] = [];

  for (let k = 0; k < basis.cells.length; k++) {
    const cell = basis.cells[k];
    const weight = fp.weights[k];
    const value = grid[cell.row][cell.col];
    const product = weight * value;
    total += product;
    contributions.push({ row: cell.row, col: cell.col, weight, value, product });
  }

  const nonzero = contributions.filter(c => c.product !== 0);

  return (
    <div className="space-y-2">
      {/* Weight grid visualization */}
      <div>
        <div className="text-xs text-gray-500 mb-1">{fp.name} weights on shape:</div>
        <table className="border-collapse">
          <tbody>
            {Array.from({ length: grid.length }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: grid[0].length }, (_, j) => {
                  const idx = basis.cellIndex[i]?.[j] ?? -1;
                  const active = idx >= 0;
                  const weight = active ? fp.weights[idx] : 0;
                  return (
                    <td
                      key={j}
                      className="w-7 h-7 text-center text-xs font-mono border border-gray-200"
                      style={{
                        backgroundColor: active
                          ? weight === 0 ? '#f9fafb' : weight === 1 ? '#dbeafe' : '#c7d2fe'
                          : '#e5e7eb',
                        backgroundImage: active ? 'none' : 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
                        opacity: active ? 1 : 0.3,
                      }}
                    >
                      {active ? weight : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dot product computation */}
      <div>
        <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
{`${fp.name} = \u03a3 (weight \u00b7 value), mod 3

${(showSkipped ? contributions : nonzero).map(c =>
  `(${c.row},${c.col}): ${c.weight} \u00b7 ${c.value} = ${c.product}${c.product === 0 ? '  \u2190 skipped' : ''}`
).join('\n')}
${''.padStart(20, '\u2500')}
Total = ${total}
${total} mod 3 = ${mod3(total)}`}
        </pre>
        {contributions.length !== nonzero.length && (
          <button
            className="text-[10px] text-gray-400 hover:text-gray-600 underline mt-1"
            onClick={() => setShowSkipped(!showSkipped)}
          >
            {showSkipped ? 'Hide zero contributions' : `Show all ${contributions.length} cells`}
          </button>
        )}
      </div>
    </div>
  );
}

function FingerprintRow({
  fp,
  liveVal,
  targetVal,
  isCollapsed,
  collapseReason,
  isExtra,
  grid,
  basis,
}: {
  fp: NamedFingerprint;
  liveVal: number;
  targetVal: number | null;
  isCollapsed: boolean;
  collapseReason?: string;
  isExtra: boolean;
  grid: Grid;
  basis: InvariantBasis;
}) {
  const [expanded, setExpanded] = useState(false);
  const matches = targetVal === null || liveVal === targetVal;

  return (
    <div className="border border-gray-200 rounded overflow-hidden">
      <button
        className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50"
        onClick={() => !isCollapsed && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold text-gray-700"
            title={isExtra
              ? "An extra fingerprint specific to this shape. The program found it by null-space search — it's preserved by every move just like F1–F4. Click for working."
              : "Same as the Rectangular Base tab. Click for working."}
          >{fp.name}</span>
          {isExtra && (
            <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1 rounded" title="An extra fingerprint specific to this shape. The program found it by null-space search — it's preserved by every move just like F1–F4. Click for working.">
              extra
            </span>
          )}
          {isCollapsed && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded" title={collapseReason || `${fp.name} is always 0 on this shape. It's still part of the word; it just doesn't carry information here.`}>
              collapsed
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-gray-800">{liveVal}</span>
          {targetVal !== null && (
            <>
              <span className="text-gray-400 text-xs">vs</span>
              <span className="font-mono text-sm font-bold text-gray-800">{targetVal}</span>
              <span className={`text-sm font-bold ${matches ? 'text-green-600' : 'text-red-600'}`}>
                {matches ? '\u2713' : '\u2717'}
              </span>
            </>
          )}
          {!isCollapsed && (
            <span className="text-gray-400 text-xs">{expanded ? '\u25B2' : '\u25BC'}</span>
          )}
        </div>
      </button>
      {expanded && !isCollapsed && (
        <div className="px-3 pb-3 border-t border-gray-200 pt-2 bg-gray-50">
          {isExtra
            ? <ExtraWorking fp={fp} grid={grid} basis={basis} />
            : <CanonicalWorking fp={fp} grid={grid} basis={basis} />
          }
        </div>
      )}
    </div>
  );
}

export function InvariantPanel({ basis, liveGrid, targetGrid }: InvariantPanelProps) {
  const liveWord = computeWord(liveGrid, basis);
  const targetWord = targetGrid ? computeWord(targetGrid, basis) : null;

  const allFps = [...basis.canonical, ...basis.extras];
  const wordsMatch = targetWord ? liveWord.every((v, i) => v === targetWord[i]) : null;

  // Build collapse reason lookup
  const collapseReasons: Record<string, string> = {};
  for (const name of basis.collapsed) {
    if (name === 'F2') collapseReasons[name] = 'F2 = 0 always because every cell has i = 0 (single row).';
    else if (name === 'F3') collapseReasons[name] = 'F3 = 0 always because every cell has j = 0 (single column).';
    else if (name === 'F4') collapseReasons[name] = 'F4 = 0 always because i\u00b7j = 0 on this shape.';
    else collapseReasons[name] = `${name} is always 0 on this shape.`;
  }

  return (
    <div className="mb-4">
      {/* Verdict banner */}
      {wordsMatch !== null && (
        <div className={`rounded px-3 py-2 mb-3 text-xs font-semibold ${
          wordsMatch
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {wordsMatch
            ? 'Words match \u2192 REACHABLE \u2014 click Prove to see an actual move sequence.'
            : (() => {
                const first = liveWord.findIndex((v, i) => v !== targetWord![i]);
                return `${allFps[first].name} disagrees (live = ${liveWord[first]}, B = ${targetWord![first]}) \u2014 B is UNREACHABLE from the live grid, no matter what moves you try.`;
              })()
          }
        </div>
      )}

      {/* Fingerprint rows */}
      <div className="space-y-1.5">
        {/* Active canonicals */}
        {basis.canonical.map((fp, i) => (
          <FingerprintRow
            key={fp.name}
            fp={fp}
            liveVal={liveWord[i]}
            targetVal={targetWord?.[i] ?? null}
            isCollapsed={false}
            isExtra={false}
            grid={liveGrid}
            basis={basis}
          />
        ))}

        {/* Collapsed canonicals */}
        {basis.collapsed.map(name => (
          <FingerprintRow
            key={name}
            fp={{ name, weights: [] }}
            liveVal={0}
            targetVal={targetWord ? 0 : null}
            isCollapsed={true}
            collapseReason={collapseReasons[name]}
            isExtra={false}
            grid={liveGrid}
            basis={basis}
          />
        ))}

        {/* Extras */}
        {basis.extras.map((fp, i) => (
          <FingerprintRow
            key={fp.name}
            fp={fp}
            liveVal={liveWord[basis.canonical.length + i]}
            targetVal={targetWord?.[basis.canonical.length + i] ?? null}
            isCollapsed={false}
            isExtra={true}
            grid={liveGrid}
            basis={basis}
          />
        ))}
      </div>

      {/* Word summary */}
      <div className="mt-3 text-xs text-gray-500">
        Word = ({liveWord.join(', ')})
        {targetWord && (
          <span className="ml-2">
            vs B = ({targetWord.join(', ')})
          </span>
        )}
      </div>
    </div>
  );
}
