import { useState } from 'react';
import { glossaryByTerm } from '../../content/glossary';

interface GlossaryTermProps {
  term: string;
  children?: React.ReactNode;
  onOpenGlossary?: (term: string) => void;
}

/**
 * Renders text with a dotted underline. Hovering shows the glossary one-liner;
 * clicking opens the glossary drawer scrolled to the entry.
 */
export function GlossaryTerm({ term, children, onOpenGlossary }: GlossaryTermProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const entry = glossaryByTerm.get(term.toLowerCase());

  if (!entry) {
    return <span>{children ?? term}</span>;
  }

  return (
    <span
      className="relative inline-block border-b border-dotted border-gray-400 cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => onOpenGlossary?.(term)}
    >
      {children ?? term}
      {showTooltip && (
        <span className="absolute bottom-full left-0 mb-1 z-50 bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg max-w-xs whitespace-normal pointer-events-none">
          {entry.definition}
        </span>
      )}
    </span>
  );
}
