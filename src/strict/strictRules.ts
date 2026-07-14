/**
 * Rule-toggle persistence for the strict tabs.
 *
 * A near-copy of `state/rules.ts`, existing only so the strict tabs keep their own
 * localStorage keys. `loadRules` there is typed to the literal union
 * 'rectangular' | 'polyomino', so reusing it would mean either widening that type
 * (editing a file the old tabs depend on) or sharing storage keys with them, which
 * would let a toggle in a strict tab silently change an old tab's saved preference.
 *
 * The RuleToggles type itself is imported, not redefined -- it is a pure type.
 */

import { DEFAULT_RULES } from '../state/rules';
import type { RuleToggles } from '../state/rules';

const STORAGE_KEY_PREFIX = 'trimer-rules-strict-';

export function loadStrictRules(tab: 'rectangular' | 'polyomino'): RuleToggles {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + tab);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        allowPlacementAbove3:
          typeof parsed.allowPlacementAbove3 === 'boolean'
            ? parsed.allowPlacementAbove3
            : DEFAULT_RULES.allowPlacementAbove3,
        allowStartAbove3:
          typeof parsed.allowStartAbove3 === 'boolean'
            ? parsed.allowStartAbove3
            : DEFAULT_RULES.allowStartAbove3,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_RULES };
}

export function saveStrictRules(tab: 'rectangular' | 'polyomino', rules: RuleToggles): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + tab, JSON.stringify(rules));
  } catch {
    // ignore storage errors
  }
}
