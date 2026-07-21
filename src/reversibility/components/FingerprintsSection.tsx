import { useState } from 'react';
import type { Grid } from '../../state/types';
import type { InvariantBasis } from '../../state/invariants';
import { computeWord } from '../../state/invariants';
import type { StrictBasis } from '../../strict/fingerprints';
import { evalAllStrict } from '../../strict/fingerprints';

interface FingerprintsSectionProps {
  basis: InvariantBasis;
  strict: StrictBasis | null;
  gridA: Grid;
  liveGrid: Grid;
}

/**
 * Collapsed-by-default accordion showing the strict-model fingerprint word
 * (F, Q, X — the rectangular-strict computation) of grid A and of the current
 * grid, side by side. They always match; that match is the whole point.
 */
export function FingerprintsSection({ basis, strict, gridA, liveGrid }: FingerprintsSectionProps) {
  const [collapsed, setCollapsed] = useState(true);

  const looseNames = [...basis.canonical, ...basis.extras].map(f => f.name);
  const names = [...looseNames, ...(strict ? strict.fingerprints.map(f => f.name) : [])];
  const valsA = [...computeWord(gridA, basis), ...(strict ? evalAllStrict(strict, gridA, basis) : [])];
  const valsLive = [...computeWord(liveGrid, basis), ...(strict ? evalAllStrict(strict, liveGrid, basis) : [])];
  const allMatch = valsA.every((v, i) => v === valsLive[i]);

  return (
    <div className="mt-4 border-t border-gray-200 pt-3 mb-4">
      <button
        type="button"
        className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-2"
        onClick={() => setCollapsed(c => !c)}
      >
        <span className="text-gray-400 text-[10px]">{collapsed ? '▸' : '▾'}</span>
        Fingerprints
      </button>

      {collapsed ? (
        <p className="text-xs text-gray-500">
          {names.length} fingerprints (F, Q, X) — expand to compare A with the current grid
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-0.5 text-xs font-mono max-w-xs">
            <span></span>
            <span className="text-gray-400 text-right">A</span>
            <span></span>
            <span className="text-gray-400 text-right">current</span>
            {names.map((name, i) => {
              const match = valsA[i] === valsLive[i];
              return (
                <div key={name} className="contents">
                  <span className="font-semibold text-gray-700">{name}</span>
                  <span className={`text-right ${match ? 'text-green-700' : 'text-red-600'}`}>{valsA[i]}</span>
                  <span className="text-gray-300">{match ? '=' : '≠'}</span>
                  <span className={`text-right ${match ? 'text-green-700' : 'text-red-600'}`}>{valsLive[i]}</span>
                </div>
              );
            })}
          </div>
          {allMatch && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1.5 mt-2">
              All {names.length} fingerprints match.
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            These never change under any legal move — which is why the way back always exists.
          </p>
        </>
      )}
    </div>
  );
}
