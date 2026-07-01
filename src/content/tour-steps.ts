/** §5.0.2 guided tour steps — 5 highlight-then-tooltip steps. */

export interface TourStep {
  /** CSS selector for the element to highlight. */
  target: string;
  title: string;
  content: string;
}

export const tourSteps: TourStep[] = [
  {
    target: '[data-tour="shape-editor"]',
    title: 'Shape editor',
    content:
      'Click any cell to toggle it in or out of the shape. The shape must stay connected and hole-free.',
  },
  {
    target: '[data-tour="lock-button"]',
    title: 'Locking',
    content:
      'Place your first trimer to lock the shape. Want to change it later? Click \u201CEdit shape\u201D (this clears history).',
  },
  {
    target: '[data-tour="fingerprint-panel"]',
    title: 'Fingerprint panel',
    content:
      'These are the fingerprints \u2014 together they form the word. Click the arrow to see the full step-by-step working. Extras (E1, E2\u2026) appear automatically for some shapes.',
  },
  {
    target: '[data-tour="prove-button"]',
    title: 'Prove button',
    content:
      'When A and B have matching words, click Prove to see an actual move sequence. When they don\u2019t, the program proves no sequence exists.',
  },
  {
    target: '[data-tour="rules-toggles"]',
    title: 'Rules toggles',
    content:
      'The two toggles let you relax the \u201Cvalue < 3\u201D rule or allow starting values above 2 \u2014 for research, not for the standard rules.',
  },
];
