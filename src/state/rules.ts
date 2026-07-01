/**
 * Shared rule toggles — used by both Rectangular and Polyomino tabs.
 * Persisted to localStorage per tab.
 */

export interface RuleToggles {
  /** When ON, trimer placement is allowed on cells with value >= 3. */
  allowPlacementAbove3: boolean;
  /** When ON, start grid cells can have value >= 3 (up to 99). */
  allowStartAbove3: boolean;
}

export const DEFAULT_RULES: RuleToggles = {
  allowPlacementAbove3: false,
  allowStartAbove3: false,
};

const STORAGE_KEY_PREFIX = 'trimer-rules-';

/** Load rules from localStorage for a given tab. */
export function loadRules(tab: 'rectangular' | 'polyomino'): RuleToggles {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + tab);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        allowPlacementAbove3: typeof parsed.allowPlacementAbove3 === 'boolean'
          ? parsed.allowPlacementAbove3
          : DEFAULT_RULES.allowPlacementAbove3,
        allowStartAbove3: typeof parsed.allowStartAbove3 === 'boolean'
          ? parsed.allowStartAbove3
          : DEFAULT_RULES.allowStartAbove3,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_RULES };
}

/** Save rules to localStorage for a given tab. */
export function saveRules(tab: 'rectangular' | 'polyomino', rules: RuleToggles): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + tab, JSON.stringify(rules));
  } catch {
    // ignore storage errors
  }
}
