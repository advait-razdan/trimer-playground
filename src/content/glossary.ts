/** §1.5 glossary entries — single source of truth for all tooltips and the glossary drawer. */

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const glossary: GlossaryEntry[] = [
  {
    term: 'Polyomino',
    definition:
      'A shape made of unit squares glued along full edges. Two cells touching only at a corner are not connected.',
  },
  {
    term: 'Simply connected',
    definition:
      'One connected piece with no holes inside. This tool only handles simply-connected polyominoes; shapes with holes will arrive in a later version.',
  },
  {
    term: 'Edge-adjacency',
    definition:
      'Cells share a side, not just a corner (a.k.a. 4-connectivity). The only kind of adjacency that counts in this tool.',
  },
  {
    term: 'Fingerprint',
    definition:
      'A linear combination of cell values, taken mod 3, that does not change when you apply any legal move. F1\u2013F4 are the four canonical fingerprints; E1, E2, \u2026 are "extras" that exist only for some shapes.',
  },
  {
    term: 'Word',
    definition:
      "The full tuple of fingerprint values for a profile, in fixed order. The word's length depends on the shape. Matching words \u21D4 reachable.",
  },
  {
    term: 'Profile',
    definition:
      'The assignment of an integer value to every cell of the shape (a.k.a. height function). Values are nominally 0, 1, or 2; with the rule toggle on, they can be anything.',
  },
  {
    term: 'Lobe',
    definition:
      'A "fat" part of a polyomino \u2014 a sub-region that contains both H-trimers and V-trimers. A dumbbell has two lobes.',
  },
  {
    term: 'Bridge',
    definition:
      'A thin (width-1 or width-2) corridor of cells connecting two lobes. Width-1 fat bridges are the ones that cause extras; wider bridges don\u2019t.',
  },
  {
    term: 'Fat bridge',
    definition:
      'A width-1 bridge whose removal would split the shape into two pieces, each having both H-trimers and V-trimers. The empirical rule says each fat bridge adds 2 extras to the word.',
  },
  {
    term: 'Spike',
    definition:
      'A 1\u00D7N protrusion sticking off a fat shape (a.k.a. tail). Looks bridge-like but does not add extras \u2014 one side of a spike\u2019s "cut" is too thin to support trimers in both directions.',
  },
  {
    term: 'Collapsed canonical',
    definition:
      'A canonical fingerprint (F2, F3, or F4) that evaluates to 0 on every possible profile of the shape, because the shape has no variation in the relevant coordinate.',
  },
  {
    term: 'GF(3) null space',
    definition:
      'The math the program runs to find all fingerprints. The principle is "the program automatically finds every invariant for the shape \u2014 no rule-guessing required."',
  },
  {
    term: 'Reachable',
    definition:
      'Profile A is reachable to profile B if some sequence of legal moves takes A to B. This happens if and only if word(A) = word(B).',
  },
  {
    term: 'The Prove feature',
    definition:
      'For reachable pairs, a real move sequence is constructed by BFS. For unreachable pairs on small shapes, BFS enumerates every reachable state from A and confirms B isn\u2019t there. For large shapes, the program falls back to the algebraic argument.',
  },
];

/** Map from lowercase term to entry for quick lookup. */
export const glossaryByTerm = new Map<string, GlossaryEntry>(
  glossary.map((entry) => [entry.term.toLowerCase(), entry]),
);
