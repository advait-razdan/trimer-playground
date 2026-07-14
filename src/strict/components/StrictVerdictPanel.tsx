import type { StrictVerdict } from '../fingerprints';

interface Props {
  verdict: StrictVerdict | null;
  /** Opens the (unmodified) Prove modal, whose search enforces the strict equal-cells rule. */
  onProve: () => void;
  /** False when there is no target B to compare against. */
  canProve: boolean;
}

/**
 * The strict tabs' verdict.
 *
 * Note what is deliberately absent: there is no positive "reachable" state here.
 * Agreeing fingerprints only say that no invariant we know of separates A from B.
 * A positive answer has to be witnessed by an actual move sequence, which is what
 * "Prove reachability" runs.
 */
export function StrictVerdictPanel({ verdict, onProve, canProve }: Props) {
  if (!canProve || verdict === null) {
    return (
      <div className="mt-4 border-t border-gray-200 pt-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Prove reachability</h3>
        <span
          className="inline-block px-4 py-2 text-sm font-semibold bg-gray-300 text-gray-500 rounded cursor-not-allowed"
          title="Set up grid B first."
        >
          Prove reachability
        </span>
      </div>
    );
  }

  const body = () => {
    switch (verdict.type) {
      case 'loose-mismatch':
        return (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm font-semibold text-red-700">NOT reachable (loose fingerprint mismatch).</p>
            <p className="text-xs text-red-600 mt-1">
              Disagreeing:{' '}
              <span className="font-mono font-semibold">{verdict.disagreeing.join(', ')}</span>
            </p>
          </div>
        );
      case 'strict-mismatch':
        return (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm font-semibold text-red-700">NOT reachable (strict fingerprint mismatch).</p>
            <p className="text-xs text-red-600 mt-1">
              Every loose fingerprint agrees, but the strict-rule fingerprints do not. Disagreeing:{' '}
              <span className="font-mono font-semibold">{verdict.disagreeing.join(', ')}</span>
            </p>
          </div>
        );
      case 'unavailable':
        return (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded">
            <p className="text-sm font-semibold text-gray-700">
              Loose fingerprints agree. Strict fingerprints were not computed for this shape.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Reachability is not ruled out, and not proven.
            </p>
          </div>
        );
      case 'consistent':
        return (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm font-semibold text-amber-800">Fingerprints are consistent.</p>
            <p className="text-xs text-amber-700 mt-1">
              Reachability is not ruled out, but not proven — some hidden invariants may still
              separate A and B.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Prove reachability</h3>
      {body()}
      <button
        className="mt-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={onProve}
        title="Search for an actual move sequence under the strict equal-cells rule"
      >
        Search for a move sequence
      </button>
      <p className="text-[10px] text-gray-400 mt-1">
        Only an explicit move sequence proves reachability.
      </p>
    </div>
  );
}
