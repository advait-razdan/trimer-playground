import { useState } from 'react';
import type { Grid } from '../../state/types';
import type { InvariantBasis } from '../../state/invariants';
import type { StrictBasis, NamedStrictFingerprint } from '../fingerprints';
import { computeStrictTrace, evalAllStrict } from '../fingerprints';
import { MAX_STRICT_CELLS } from '../nullSpace';

interface Props {
  basis: InvariantBasis;
  strict: StrictBasis | null;
  liveGrid: Grid;
  targetGrid: Grid | null;
}

const INFO_TEXT =
  'These fingerprints come from the strict-move rule, not from shape geometry. ' +
  'Unlike E1, E2, they exist on every shape including plain rectangles. They arise ' +
  'because a trimer placement requires the three cells to be equal at the moment of ' +
  'the move — a constraint the loose GF(3) model ignores.';

function InfoPopover() {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-label="About strict-rule fingerprints"
        className="w-4 h-4 rounded-full border border-gray-400 text-gray-500 text-[10px] leading-none hover:bg-gray-100"
        onClick={() => setOpen(o => !o)}
      >
        i
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <span className="absolute left-0 top-6 z-20 block w-80 p-3 bg-white border border-gray-300 rounded shadow-lg text-xs text-gray-600 font-normal leading-relaxed">
            {INFO_TEXT}
          </span>
        </>
      )}
    </span>
  );
}

function Working({
  fp,
  grid,
  basis,
  label,
}: {
  fp: NamedStrictFingerprint;
  grid: Grid;
  basis: InvariantBasis;
  label: string;
}) {
  const trace = computeStrictTrace(fp, grid, basis);
  const formula =
    fp.kind === 'quasi'
      ? `${fp.name} = Σ ${fp.source} weight · a², mod 3`
      : `${fp.name} = Σ c(p,q) · a_p · a_q, mod 3`;

  return (
    <div className="mt-1 mb-2 ml-2 p-2 bg-gray-50 border border-gray-200 rounded font-mono text-[10px] text-gray-600 leading-relaxed">
      <div className="text-gray-500 mb-1">
        {label}: {formula}
      </div>
      {trace.lines.length === 0 ? (
        <div className="text-gray-400">no contributing terms (every term has a zero cell)</div>
      ) : (
        trace.lines.map((line, i) => <div key={i}>{line}</div>)
      )}
      {trace.omitted > 0 && (
        <div className="text-gray-400">… {trace.omitted} more contributing terms</div>
      )}
      <div className="mt-1 pt-1 border-t border-gray-200">
        total = {trace.total} → {trace.total} mod 3 = <span className="font-semibold">{trace.result}</span>
      </div>
    </div>
  );
}

export function StrictFingerprintPanel({ basis, strict, liveGrid, targetGrid }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (strict === null) {
    return (
      <div className="mt-4 border-t border-gray-200 pt-3">
        <div className="flex items-center gap-1 mb-1">
          <h3 className="text-sm font-semibold text-gray-700">Strict-rule fingerprints</h3>
          <InfoPopover />
        </div>
        <p className="text-xs text-gray-500">
          Not computed: this shape has {basis.cells.length} cells, above the {MAX_STRICT_CELLS}-cell
          budget. The quadratic system has N(N+1)/2 unknowns, so solving it here would block the
          page for several seconds. The fingerprints are still well defined — only the computation
          is skipped.
        </p>
      </div>
    );
  }

  const liveVals = evalAllStrict(strict, liveGrid, basis);
  const targetVals = targetGrid ? evalAllStrict(strict, targetGrid, basis) : null;

  const quasi = strict.fingerprints.filter(f => f.kind === 'quasi');
  const cross = strict.fingerprints.filter(f => f.kind === 'cross');
  const indexOf = (fp: NamedStrictFingerprint) => strict.fingerprints.indexOf(fp);

  const renderGroup = (title: string, sub: string, group: NamedStrictFingerprint[]) => (
    <div className="mb-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">{title}</div>
      <div className="text-[10px] text-gray-400 mb-1.5">{sub}</div>
      {group.map(fp => {
        const i = indexOf(fp);
        const live = liveVals[i];
        const target = targetVals ? targetVals[i] : null;
        const mismatch = target !== null && live !== target;
        const isOpen = expanded === fp.name;

        return (
          <div key={fp.name}>
            <button
              type="button"
              className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-gray-50 ${
                mismatch ? 'bg-red-50' : ''
              }`}
              onClick={() => setExpanded(isOpen ? null : fp.name)}
              title="Show working"
            >
              <span className="flex items-center gap-1.5">
                <span className="text-gray-400 text-[9px] w-2">{isOpen ? '▾' : '▸'}</span>
                <span className="font-mono font-semibold text-gray-700">{fp.name}</span>
                {fp.source && <span className="text-gray-400 text-[10px]">from {fp.source}</span>}
              </span>
              <span className="flex items-center gap-2 font-mono">
                <span className={mismatch ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                  {live}
                </span>
                {target !== null && (
                  <>
                    <span className="text-gray-300">vs</span>
                    <span className={mismatch ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                      {target}
                    </span>
                    {mismatch && <span className="text-red-500 text-[10px]">≠</span>}
                  </>
                )}
              </span>
            </button>
            {isOpen && (
              <>
                <Working fp={fp} grid={liveGrid} basis={basis} label="live" />
                {targetGrid && <Working fp={fp} grid={targetGrid} basis={basis} label="target B" />}
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  const mismatches = targetVals
    ? strict.fingerprints.filter((_, i) => liveVals[i] !== targetVals[i]).map(f => f.name)
    : [];

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <div className="flex items-center gap-1 mb-2">
        <button
          type="button"
          className="text-sm font-semibold text-gray-700 flex items-center gap-1"
          onClick={() => setCollapsed(c => !c)}
        >
          <span className="text-gray-400 text-[10px]">{collapsed ? '▸' : '▾'}</span>
          Strict-rule fingerprints
        </button>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
          strict
        </span>
        <InfoPopover />
      </div>

      {collapsed ? (
        <p className="text-xs text-gray-500">
          {strict.quasiDim} quasi-linear, {strict.crossDim} cross-term
          {mismatches.length > 0 && (
            <span className="text-red-600 font-medium"> — {mismatches.length} disagree with B</span>
          )}
        </p>
      ) : (
        <>
          {renderGroup(
            `Quasi-linear (Q1–Q${strict.quasiDim})`,
            'weights on a², i.e. a weighted count of the nonzero cells',
            quasi,
          )}
          {cross.length > 0 &&
            renderGroup(
              `Cross-term (X1–X${strict.crossDim})`,
              'null-space basis vectors of the quadratic constraints; no closed form',
              cross,
            )}
          {mismatches.length > 0 && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              Disagreeing with B: <span className="font-mono font-semibold">{mismatches.join(', ')}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
