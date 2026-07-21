import type { HistoryEntry, MoveType } from '../../state/types';

interface MoveConsoleProps {
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
      return 'Renormalize (−3 all cells)';
  }
}

/** Key identifying a triple by its three cells; null for non-triple moves. */
function tripleKey(entry: HistoryEntry): string | null {
  const { move } = entry;
  if (move.type !== 'horizontal-trimer' && move.type !== 'vertical-trimer') return null;
  return `${move.type}:${move.position!.row},${move.position!.col}`;
}

/**
 * The forward move log — same visual language as the existing tabs' history,
 * plus a wrap counter: a triple placed N times is badged ×N, and whenever N is
 * a multiple of 3 the group is tagged "net zero" and dimmed, since three plays
 * of the same triple cancel out mod 3.
 */
export function MoveConsole({ history, historyIndex, onJumpTo }: MoveConsoleProps) {
  // Wrap counts over the moves actually placed (undone moves don't count).
  const tripleCounts = new Map<string, number>();
  for (let i = 0; i <= historyIndex; i++) {
    const key = tripleKey(history[i]);
    if (key) tripleCounts.set(key, (tripleCounts.get(key) ?? 0) + 1);
  }

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        Move Console ({history.length} move{history.length !== 1 ? 's' : ''})
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
            const key = tripleKey(entry);
            const wrapCount = isActive && key ? tripleCounts.get(key)! : 0;
            const netZero = wrapCount >= 3 && wrapCount % 3 === 0;

            return (
              <button
                key={idx}
                className={`w-full text-left text-xs font-mono px-2 py-1 rounded transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100'
                } ${isCurrent ? 'ring-2 ring-blue-400' : ''} ${netZero ? 'opacity-50' : ''}`}
                onClick={() => onJumpTo(idx)}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: color }}
                />
                {idx + 1}. {moveLabel(entry)}
                {wrapCount >= 2 && (
                  <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                    &times;{wrapCount}
                  </span>
                )}
                {netZero && (
                  <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-gray-200 text-gray-600 font-medium">
                    net zero
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
