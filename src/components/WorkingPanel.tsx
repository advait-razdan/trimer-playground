import { useState } from 'react';
import type { WorkingTrace } from '../state/types';

interface WorkingPanelProps {
  traces: WorkingTrace[];
  visible: boolean;
}

function TraceCard({ trace }: { trace: WorkingTrace }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-gray-50 rounded border border-gray-200 overflow-hidden">
      <button
        className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-100"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs font-semibold text-gray-600">{trace.label}</span>
        <span className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold text-gray-800">= {trace.result}</span>
          <span className="text-gray-400 text-xs">{expanded ? '\u25B2' : '\u25BC'}</span>
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-200 pt-2">
          <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
            {trace.lines.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}

export function WorkingPanel({ traces, visible }: WorkingPanelProps) {
  if (!visible) return null;

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        Step-by-step Working
      </h3>
      <div className="space-y-2">
        {traces.map((trace, idx) => (
          <TraceCard key={idx} trace={trace} />
        ))}
      </div>
    </div>
  );
}
