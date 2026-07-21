/**
 * Plain-English explainer for the reversibility theorem. The copy is fixed by
 * the feature spec — do not rewrite the math.
 */
export function Explainer() {
  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        How This Works
      </h3>
      <div className="text-xs text-gray-600 leading-relaxed space-y-2">
        <p className="font-semibold text-gray-700">Why can you always get back?</p>
        <p>
          Notice that in this game you never remove anything. Every move adds — the only
          exception is the subtract-3 rule, and it only fires when every cell has at least
          3 to give.
        </p>
        <p>Three facts make the return trip possible:</p>
        <ol className="list-decimal ml-4 space-y-1">
          <li>
            Adding 3 to one cell leaves no lasting mark. A later subtract-3 round takes
            back exactly what it gave.
          </li>
          <li>The subtract-3 rule itself leaves no lasting mark, for the same reason in reverse.</li>
          <li>
            A +1 triple, played <strong>three times in total</strong>, adds 3 to each of
            its cells — which, by fact 1, is no lasting mark either.
          </li>
        </ol>
        <p>
          So the only moves that truly change the grid are the +1 triples, and each one
          erases itself if you play it two more times.
        </p>
        <p>
          That gives the recipe: take the list of triple moves you made on the way from A
          to B, go through it <strong>backwards</strong>, and play each one{' '}
          <strong>two more times</strong>. If a move is ever blocked because a cell reached
          3, apply the automatic filler — add 3 to every cell still below 3, then subtract
          3 from everything — and continue. The filler changes nothing of substance; it
          just clears the blockage.
        </p>
        <p>
          You never undo a single move. You keep going <strong>forward</strong> until the
          grid wraps around to where it began — like walking forward around a circle and
          arriving back at your starting point.
        </p>
      </div>
    </div>
  );
}
