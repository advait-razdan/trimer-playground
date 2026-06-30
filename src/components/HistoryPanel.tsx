import type { HistoryEntry, MoveType } from '../state/types';

interface HistoryPanelProps {
  history: HistoryEntry[];
  historyIndex: number;
  onJumpTo: (index: number) => void;
}

const MOVE_TYPE_COLORS: Record<MoveType, string> = {
  'horizontal-trimer': '#ef4444',
  'vertical-trimer': '#eab308',
  'plus-3': '#a855f7',
  'mod-3': '#6b7280',
};

function moveLabel(entry: HistoryEntry): string {
  const { move } = entry;
  switch (move.type) {
    case 'horizontal-trimer':
      return `H-trimer at (${move.position!.row},${move.position!.col})`;
    case 'vertical-trimer':
      return `V-trimer at (${move.position!.row},${move.position!.col})`;
    case 'plus-3':
      return `+3 at (${move.position!.row},${move.position!.col})`;
    case 'mod-3':
      return 'Mod-3 (all cells)';
  }
}

export function HistoryPanel({ history, historyIndex, onJumpTo }: HistoryPanelProps) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        Move History ({history.length} move{history.length !== 1 ? 's' : ''})
      </h3>
      {history.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No moves yet. Select a mode (H, V, or P) and click the live grid.</p>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {/* Start state entry */}
          <button
            className={`w-full text-left text-xs font-mono px-2 py-1 rounded transition-colors ${
              historyIndex === -1
                ? 'bg-blue-50 text-blue-800 border border-blue-300 ring-2 ring-blue-400'
                : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => onJumpTo(-1)}
          >
            Start (Grid A)
          </button>
          {history.map((entry, idx) => {
            const isActive = idx <= historyIndex;
            const isCurrent = idx === historyIndex;
            const color = MOVE_TYPE_COLORS[entry.move.type];

            return (
              <button
                key={idx}
                className={`w-full text-left text-xs font-mono px-2 py-1 rounded transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100'
                } ${isCurrent ? 'ring-2 ring-blue-400' : ''}`}
                onClick={() => {
                  if (idx > historyIndex) {
                    // Going forward truncates nothing, just redo
                    onJumpTo(idx);
                  } else {
                    onJumpTo(idx);
                  }
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: color }}
                />
                {idx + 1}. {moveLabel(entry)}
                <span className="ml-2 text-gray-400">
                  [{entry.move.before.slice(0, 4).join(',')}{entry.move.before.length > 4 ? '...' : ''} &rarr; {entry.move.after.slice(0, 4).join(',')}{entry.move.after.length > 4 ? '...' : ''}]
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
