import { useState } from 'react';
import { proveWhatTitle, proveWhatIntro, proveWhatCases } from '../../content/prove-what-templates';

export function ProveWhatItDoes() {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        className="ml-1 text-blue-400 hover:text-blue-600 text-xs"
        title="What is Prove doing?"
        onClick={() => setOpen(!open)}
      >
        &#9432;
      </button>
      {open && (
        <div className="absolute top-6 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3 max-w-sm">
          <h4 className="text-xs font-semibold text-gray-800 mb-1">{proveWhatTitle}</h4>
          <p className="text-xs text-gray-600 mb-2">{proveWhatIntro}</p>
          <ul className="space-y-2">
            {proveWhatCases.map((c, i) => (
              <li key={i} className="text-xs">
                <span className="font-semibold text-gray-700">{c.label}:</span>{' '}
                <span className="text-gray-600">{c.text}</span>
              </li>
            ))}
          </ul>
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
