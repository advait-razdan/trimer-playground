import { useState } from 'react';
import type { InvariantBasis } from '../../state/invariants';
import type { BridgeInfo } from '../../state/bridge-detector';
import { buildShapeWhyText, shapeWhyFooter, type ShapeCategory } from '../../content/shape-why-templates';

interface ShapeWhyDiagnosticProps {
  basis: InvariantBasis;
  bridgeInfo: BridgeInfo | null;
  rows: number;
  cols: number;
  onOpenGlossary?: (term: string) => void;
}

function classifyShape(
  basis: InvariantBasis,
  bridgeInfo: BridgeInfo | null,
  rows: number,
  cols: number,
): { category: ShapeCategory; text: string } {
  const bridges = bridgeInfo?.bridgeCount ?? 0;

  if (rows === 1 || cols === 1) {
    return {
      category: 'strip',
      text: buildShapeWhyText({
        category: 'strip',
        collapsed: basis.collapsed,
        surviving: basis.canonical.map((f) => f.name),
        coord: rows === 1 ? 'i' : 'j',
      }),
    };
  }

  if (bridges > 0) {
    return {
      category: 'has-bridges',
      text: buildShapeWhyText({ category: 'has-bridges', bridgeCount: bridges }),
    };
  }

  if (basis.extras.length === 0 && basis.collapsed.length === 0) {
    return { category: 'rectangle', text: buildShapeWhyText({ category: 'rectangle' }) };
  }

  return { category: 'no-bridges', text: buildShapeWhyText({ category: 'no-bridges' }) };
}

export function ShapeWhyDiagnostic({ basis, bridgeInfo, rows, cols, onOpenGlossary }: ShapeWhyDiagnosticProps) {
  const [open, setOpen] = useState(false);
  const { text } = classifyShape(basis, bridgeInfo, rows, cols);

  return (
    <span className="relative inline-block">
      <button
        className="ml-1 text-blue-400 hover:text-blue-600 text-xs"
        title="Why does this shape have these fingerprints?"
        onClick={() => setOpen(!open)}
      >
        &#9432;
      </button>
      {open && (
        <div className="absolute top-6 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3 max-w-sm">
          <p className="text-xs text-gray-700 mb-2">{text}</p>
          <p className="text-[10px] text-blue-500">
            {shapeWhyFooter.split(/(bridge|fat bridge|lobe|collapsed canonical)/gi).map((part, i) => {
              const lower = part.toLowerCase();
              if (['bridge', 'fat bridge', 'lobe', 'collapsed canonical'].includes(lower)) {
                return (
                  <span
                    key={i}
                    className="font-semibold border-b border-dotted border-blue-400 cursor-pointer"
                    onClick={() => onOpenGlossary?.(part)}
                  >
                    {part}
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </p>
          <button
            className="mt-2 text-[10px] text-gray-400 hover:text-gray-600"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      )}
    </span>
  );
}
