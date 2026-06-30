import type { Fingerprints } from '../state/types';

interface FingerprintPanelProps {
  liveFingerprints: Fingerprints;
  targetFingerprints: Fingerprints | null;
  showTarget: boolean;
}

const FP_LABELS = ['F1', 'F2', 'F3', 'F4'] as const;
const FP_DESCRIPTIONS = ['total', 'row-weighted', 'col-weighted', 'bilinear'] as const;

function getFpValue(fp: Fingerprints, key: typeof FP_LABELS[number]): number {
  return fp[key.toLowerCase() as keyof Fingerprints];
}

export function FingerprintPanel({ liveFingerprints, targetFingerprints, showTarget }: FingerprintPanelProps) {
  const hasTarget = showTarget && targetFingerprints !== null;
  const disagreements = hasTarget
    ? FP_LABELS.filter(k => getFpValue(liveFingerprints, k) !== getFpValue(targetFingerprints!, k))
    : [];
  const hasDisagreement = disagreements.length > 0;

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
        Fingerprints
      </h3>

      {/* Verdict banner */}
      {hasTarget && (
        <div className={`rounded px-3 py-2 mb-3 text-sm ${
          hasDisagreement
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-green-50 text-green-800 border border-green-200'
        }`}>
          {hasDisagreement
            ? (() => {
                const details = disagreements.map(k => {
                  const lv = getFpValue(liveFingerprints, k);
                  const tv = getFpValue(targetFingerprints!, k);
                  return `${k} (${lv} vs ${tv})`;
                });
                return `${details.join(', ')} disagree \u2014 B is unreachable from the live grid, no matter what moves you try.`;
              })()
            : 'Fingerprints match \u2192 live grid is potentially reachable to B.'}
        </div>
      )}

      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pr-4 pb-1"></th>
            <th className="pr-4 pb-1">Live</th>
            {hasTarget && <th className="pr-4 pb-1">Target B</th>}
            {hasTarget && <th className="pb-1">Match</th>}
          </tr>
        </thead>
        <tbody>
          {FP_LABELS.map((label, idx) => {
            const liveVal = getFpValue(liveFingerprints, label);
            const targetVal = hasTarget ? getFpValue(targetFingerprints!, label) : null;
            const matches = targetVal === null || liveVal === targetVal;
            return (
              <tr key={label} className="border-t border-gray-100">
                <td className="pr-4 py-1.5 text-gray-600">
                  {label} <span className="text-gray-400 text-xs">({FP_DESCRIPTIONS[idx]})</span>
                </td>
                <td className="pr-4 py-1.5 font-bold text-gray-800">{liveVal}</td>
                {hasTarget && <td className="pr-4 py-1.5 font-bold text-gray-800">{targetVal}</td>}
                {hasTarget && (
                  <td className={`py-1.5 font-bold ${matches ? 'text-green-600' : 'text-red-600'}`}>
                    {matches ? '\u2713' : '\u2717'}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
