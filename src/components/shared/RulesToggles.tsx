import type { RuleToggles } from '../../state/rules';

interface Props {
  rules: RuleToggles;
  onToggle: (key: keyof RuleToggles) => void;
}

export function RulesToggles({ rules, onToggle }: Props) {
  return (
    <div className="border border-gray-200 rounded p-3 bg-gray-50">
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Rules</h3>
      <label className="flex items-start gap-2 cursor-pointer mb-2">
        <input
          type="checkbox"
          checked={rules.allowPlacementAbove3}
          onChange={() => onToggle('allowPlacementAbove3')}
          className="mt-0.5"
        />
        <span className="text-xs text-gray-700 leading-tight">
          Allow trimer placement on cells with value &ge; 3
        </span>
      </label>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={rules.allowStartAbove3}
          onChange={() => onToggle('allowStartAbove3')}
          className="mt-0.5"
        />
        <span className="text-xs text-gray-700 leading-tight">
          Allow start grid cells with value &ge; 3
        </span>
      </label>
    </div>
  );
}
