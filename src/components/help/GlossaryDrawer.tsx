import { useEffect, useMemo, useRef, useState } from 'react';
import { glossary } from '../../content/glossary';
import { ReferencePatternTable } from './ReferencePatternTable';

interface GlossaryDrawerProps {
  open: boolean;
  onClose: () => void;
  scrollToTerm?: string | null;
}

export function GlossaryDrawer({ open, onClose, scrollToTerm }: GlossaryDrawerProps) {
  const [search, setSearch] = useState('');
  const termRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const filtered = useMemo(() => {
    if (!search.trim()) return glossary;
    const q = search.toLowerCase();
    return glossary.filter(
      (e) =>
        e.term.toLowerCase().includes(q) ||
        e.definition.toLowerCase().includes(q),
    );
  }, [search]);

  useEffect(() => {
    if (open && scrollToTerm) {
      const key = scrollToTerm.toLowerCase();
      // Small delay to let the drawer render
      requestAnimationFrame(() => {
        const el = termRefs.current.get(key);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('bg-yellow-100');
          setTimeout(() => el.classList.remove('bg-yellow-100'), 1500);
        }
      });
    }
  }, [open, scrollToTerm]);

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-2xl border-l border-gray-200 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-700">Glossary</h2>
        <button
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          onClick={onClose}
          aria-label="Close glossary"
        >
          &times;
        </button>
      </div>

      <div className="px-3 py-2 border-b border-gray-100">
        <input
          type="text"
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="Search glossary\u2026"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filtered.map((entry) => (
          <div
            key={entry.term}
            ref={(el) => {
              if (el) termRefs.current.set(entry.term.toLowerCase(), el);
            }}
            className="transition-colors duration-300 rounded p-2 -mx-2"
          >
            <div className="text-sm font-semibold text-gray-800">{entry.term}</div>
            <div className="text-xs text-gray-600 mt-0.5">{entry.definition}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-4">No matching terms.</div>
        )}

        {/* Reference pattern table */}
        {!search.trim() && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Reference Patterns</h3>
            <p className="text-[10px] text-gray-400 mb-2">
              Tested shapes with their fingerprint counts. The pattern "width-1 bridge → +2 extras" is visible in the data.
            </p>
            <ReferencePatternTable />
          </div>
        )}
      </div>
    </div>
  );
}
