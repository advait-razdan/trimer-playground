import { describe, it, expect } from 'vitest';
import { glossary, glossaryByTerm } from '../src/content/glossary';
import { welcomeTitle, welcomePoints, welcomeActions } from '../src/content/welcome';
import { tourSteps } from '../src/content/tour-steps';
import { shapeWhyTemplates, buildShapeWhyText } from '../src/content/shape-why-templates';
import { proveWhatCases } from '../src/content/prove-what-templates';
import { referencePatternTable } from '../src/content/reference-pattern-table';

describe('Glossary content (§1.5)', () => {
  const requiredTerms = [
    'Polyomino', 'Simply connected', 'Edge-adjacency', 'Fingerprint',
    'Word', 'Profile', 'Lobe', 'Bridge', 'Fat bridge', 'Spike',
    'Collapsed canonical', 'GF(3) null space', 'Reachable', 'The Prove feature',
  ];

  it('has all §1.5 required terms', () => {
    for (const term of requiredTerms) {
      expect(glossaryByTerm.has(term.toLowerCase()), `Missing: ${term}`).toBe(true);
    }
  });

  it('has exactly 14 entries', () => {
    expect(glossary.length).toBe(14);
  });

  it('every entry has non-empty term and definition', () => {
    for (const entry of glossary) {
      expect(entry.term.length).toBeGreaterThan(0);
      expect(entry.definition.length).toBeGreaterThan(0);
    }
  });
});

describe('Welcome content (§5.0.1)', () => {
  it('has correct title', () => {
    expect(welcomeTitle).toBe('Welcome to the Polyomino Base tab.');
  });

  it('has 3 points', () => {
    expect(welcomePoints.length).toBe(3);
  });

  it('has 4 action buttons', () => {
    expect(welcomeActions.length).toBe(4);
    expect(welcomeActions.map(a => a.action)).toEqual(['tour', 'glossary', 'preset', 'skip']);
  });
});

describe('Tour steps (§5.0.2)', () => {
  it('has exactly 5 steps', () => {
    expect(tourSteps.length).toBe(5);
  });

  it('steps target the right elements', () => {
    expect(tourSteps[0].target).toBe('[data-tour="shape-editor"]');
    expect(tourSteps[1].target).toBe('[data-tour="lock-button"]');
    expect(tourSteps[2].target).toBe('[data-tour="fingerprint-panel"]');
    expect(tourSteps[3].target).toBe('[data-tour="prove-button"]');
    expect(tourSteps[4].target).toBe('[data-tour="rules-toggles"]');
  });
});

describe('Shape why templates (§5.0.5)', () => {
  it('has all 4 categories', () => {
    expect(Object.keys(shapeWhyTemplates).sort()).toEqual(
      ['has-bridges', 'no-bridges', 'rectangle', 'strip'],
    );
  });

  it('builds strip text with placeholders filled', () => {
    const text = buildShapeWhyText({
      category: 'strip',
      collapsed: ['F2', 'F4'],
      surviving: ['F1', 'F3'],
      coord: 'i',
    });
    expect(text).toContain('F2, F4');
    expect(text).toContain('F1, F3');
    expect(text).toContain('i = 0');
  });

  it('builds has-bridges text with count', () => {
    const text = buildShapeWhyText({ category: 'has-bridges', bridgeCount: 2 });
    expect(text).toContain('2 width-1 fat bridges');
    expect(text).toContain('Total extras: 4');
  });
});

describe('Prove what templates (§5.0.6)', () => {
  it('has exactly 3 cases', () => {
    expect(proveWhatCases.length).toBe(3);
  });
});

describe('Reference pattern table (§6.8.1)', () => {
  it('has 14 rows', () => {
    expect(referencePatternTable.length).toBe(14);
  });

  it('Rectangle 3×3 has word length 4, 0 extras', () => {
    const rect = referencePatternTable[0];
    expect(rect.cells).toBe(9);
    expect(rect.wordLen).toBe(4);
    expect(rect.extras).toBe(0);
  });

  it('Dumbbell 3×3 bridge 2×1 has word length 6, 2 extras', () => {
    const dumb = referencePatternTable.find(r => r.shape.includes('bridge 2×1'));
    expect(dumb).toBeDefined();
    expect(dumb!.wordLen).toBe(6);
    expect(dumb!.extras).toBe(2);
  });

  it('1×5 strip has word length 2, canonical note F1,F3', () => {
    const strip = referencePatternTable.find(r => r.shape.includes('1×5'));
    expect(strip).toBeDefined();
    expect(strip!.wordLen).toBe(2);
    expect(strip!.canonicalNote).toBe('F1, F3');
  });

  it('Chain of 3 lobes has 4 extras', () => {
    const chain3 = referencePatternTable.find(r => r.shape.includes('3 lobes'));
    expect(chain3).toBeDefined();
    expect(chain3!.extras).toBe(4);
  });
});
