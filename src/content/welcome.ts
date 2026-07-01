/** §5.0.1 welcome card copy — single source of truth. */

export const welcomeTitle = 'Welcome to the Polyomino Base tab.';

export const welcomeIntro =
  'Everything from the Rectangular Base tab still works here. The four legal moves are the same. F1, F2, F3, F4 are still F1, F2, F3, F4. The "matching word \u21D4 reachable" rule still holds.';

export const welcomeTransition =
  "What\u2019s new is that the shape matters now. Three things change:";

export const welcomePoints = [
  'Word length depends on the shape. Some shapes use 2 fingerprints, some 4, some 6, some more. The program computes the right number.',
  'Some shapes get "extras" beyond F1\u2013F4. Shapes with a thin width-1 bridge between fat lobes carry local patterns that F1\u2013F4 can\u2019t see. The program finds these automatically as E1, E2, \u2026',
  'Sometimes F2, F3, or F4 collapses to 0. On a 1\u00D7N strip every cell has i = 0, so F2 vanishes. The program marks collapsed canonicals with a badge.',
];

export const welcomeFooter =
  'Once you have a shape, edit profiles A and B, then click Prove to see either a real move sequence (when reachable) or proof of impossibility (when not).';

export const welcomeActions = [
  { label: 'Take a 60-second tour', action: 'tour' as const },
  { label: 'Open glossary', action: 'glossary' as const },
  { label: 'Load a preset to start exploring', action: 'preset' as const },
  { label: 'Skip', action: 'skip' as const },
];
