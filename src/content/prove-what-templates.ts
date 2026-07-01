/** §5.0.6 "What is Prove doing?" copy — verbatim from spec. */

export const proveWhatTitle = 'What is Prove doing?';

export const proveWhatIntro =
  'Prove runs one of three procedures, picked automatically based on the situation:';

export const proveWhatCases = [
  {
    label: 'If words match',
    text: 'BFS searches through trimer move sequences from A. As soon as it finds one ending at B, it animates each step in a replay grid. The sequence is real, legal, and demonstrates reachability by construction.',
  },
  {
    label: "If words don\u2019t match and the shape is small (\u2264 ~15 cells)",
    text: "BFS enumerates every state reachable from A \u2014 typically a few hundred to a few thousand states. The program confirms B is not among them, and confirms every reachable state has the same word as A. This is an exhaustive proof of impossibility.",
  },
  {
    label: "If words don\u2019t match and the shape is too large for exhaustive BFS",
    text: "The program picks the first disagreeing fingerprint and shows the algebraic argument that every legal move preserves it. So if A\u2019s value of that fingerprint is 0 and B\u2019s is 2, no sequence of moves can ever take A\u2019s 0 to B\u2019s 2.",
  },
];
