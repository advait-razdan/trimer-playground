import type { InvariantBasis } from '../../state/invariants';
import type { BridgeInfo } from '../../state/bridge-detector';
import type { ShapeCategory } from '../../content/shape-why-templates';

interface ShapeInfoCardProps {
  basis: InvariantBasis;
  bridgeInfo: BridgeInfo | null;
  rows: number;
  cols: number;
}

function classifyShape(
  basis: InvariantBasis,
  bridgeInfo: BridgeInfo | null,
  rows: number,
  cols: number,
): { category: ShapeCategory; line: string } {
  const bridges = bridgeInfo?.bridgeCount ?? 0;

  if (rows === 1 || cols === 1) {
    return {
      category: 'strip',
      line: `This is a thin strip \u2014 ${basis.collapsed.join(' and ')} collapse${basis.collapsed.length === 1 ? 's' : ''}. The word is just (${basis.canonical.map(f => f.name).join(', ')}).`,
    };
  }

  if (bridges > 0) {
    return {
      category: 'has-bridges',
      line: `This shape has ${bridges} width-1 fat bridge${bridges > 1 ? 's' : ''}. By the empirical bridge rule, each one adds 2 extras.`,
    };
  }

  if (basis.extras.length === 0 && basis.collapsed.length === 0) {
    return {
      category: 'rectangle',
      line: 'This is a rectangle \u2014 no extras, all four canonicals work. Same as the Rectangular Base tab.',
    };
  }

  return {
    category: 'no-bridges',
    line: 'This is a fat simply-connected shape with no width-1 bridges. F1\u2013F4 are enough.',
  };
}

export function ShapeInfoCard({ basis, bridgeInfo, rows, cols }: ShapeInfoCardProps) {
  const wordLen = basis.wordLength;
  const equivClasses = Math.pow(3, wordLen);
  const hasExtras = basis.extras.length > 0;
  const { line } = classifyShape(basis, bridgeInfo, rows, cols);

  return (
    <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-700">Shape Info</h3>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
            hasExtras ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {hasExtras ? 'Has extras beyond F1\u2013F4' : 'No extras'}
        </span>
      </div>
      <div className="text-xs text-gray-600 space-y-0.5">
        <div>Active cells: <span className="font-mono font-semibold">{basis.cells.length}</span></div>
        <div>Word length: <span className="font-mono font-semibold">{wordLen}</span></div>
        <div>
          Canonicals: <span className="font-mono">{basis.canonical.map(f => f.name).join(', ') || 'none'}</span>
          {basis.collapsed.length > 0 && (
            <span className="text-amber-600 ml-1">
              (collapsed: {basis.collapsed.join(', ')})
            </span>
          )}
        </div>
        {hasExtras && (
          <div>
            Extras: <span className="font-mono">{basis.extras.map(e => e.name).join(', ')}</span>
          </div>
        )}
        <div>Possible moves: <span className="font-mono">{basis.moves.length}</span></div>
        {bridgeInfo && bridgeInfo.bridgeCount > 0 && (
          <div>
            Fat bridges: <span className="font-mono font-semibold">{bridgeInfo.bridgeCount}</span>
            <span className="text-gray-400 ml-1">({bridgeInfo.bridgeCount * 2} extras predicted)</span>
          </div>
        )}
        <div>
          Equivalence classes: <span className="font-mono font-semibold">3<sup>{wordLen}</sup> = {equivClasses}</span>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 italic">
        {line}
      </div>
    </div>
  );
}
