import { useState } from 'react';
import { PRESETS } from '../presets/presets';
import type { Preset } from '../presets/presets';

interface PresetLoaderProps {
  onLoad: (preset: Preset) => void;
}

export function PresetLoader({ onLoad }: PresetLoaderProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const selectedPreset = selectedIdx !== null ? PRESETS[selectedIdx] : null;

  return (
    <div className="flex items-start gap-3">
      <div className="flex-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
          Load Preset
        </label>
        <select
          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
          value={selectedIdx !== null ? String(selectedIdx) : ''}
          onChange={(e) => {
            const idx = parseInt(e.target.value, 10);
            if (!isNaN(idx) && PRESETS[idx]) {
              setSelectedIdx(idx);
            }
          }}
        >
          <option value="" disabled>Choose an example...</option>
          {PRESETS.map((preset, idx) => (
            <option key={idx} value={idx}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>
      <button
        className="mt-5 px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
        disabled={selectedIdx === null}
        onClick={() => {
          if (selectedPreset) {
            onLoad(selectedPreset);
          }
        }}
      >
        Load
      </button>
      {selectedPreset && (
        <p className="mt-5 text-xs text-gray-500 max-w-xs">{selectedPreset.description}</p>
      )}
    </div>
  );
}
