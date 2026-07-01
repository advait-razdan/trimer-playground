import { useCallback, useEffect, useState } from 'react';
import { tourSteps } from '../../content/tour-steps';

interface GuidedTourProps {
  active: boolean;
  onEnd: () => void;
}

export function GuidedTour({ active, onEnd }: GuidedTourProps) {
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!active) return;
    const current = tourSteps[step];
    const el = document.querySelector(current.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    } else {
      setPos(null);
    }
  }, [active, step]);

  useEffect(() => {
    if (!active) return;
    setStep(0);
  }, [active]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [updatePosition]);

  if (!active) return null;

  const current = tourSteps[step];
  const isLast = step === tourSteps.length - 1;

  // Position tooltip below the highlighted element
  const tooltipTop = pos ? pos.top + pos.height + 12 : 200;
  const elementCenter = pos ? pos.left + pos.width / 2 : 0;
  const isRightSide = pos ? elementCenter > window.innerWidth / 2 : false;
  const tooltipLeft = pos
    ? isRightSide
      ? Math.max(16, pos.left + pos.width - 320)
      : Math.max(16, Math.min(pos.left, window.innerWidth - 340))
    : 100;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/30 pointer-events-auto" />

      {/* Highlight ring */}
      {pos && (
        <div
          className="fixed z-50 border-2 border-blue-400 rounded pointer-events-none"
          style={{
            top: pos.top - 4,
            left: pos.left - 4,
            width: pos.width + 8,
            height: pos.height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-xl p-4 max-w-xs"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="text-xs text-gray-400 mb-1">
          Step {step + 1} of {tourSteps.length}
        </div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">{current.title}</h3>
        <p className="text-sm text-gray-600 mb-3">{current.content}</p>
        <div className="flex justify-between">
          <button
            className="text-xs text-gray-400 hover:text-gray-600"
            onClick={onEnd}
          >
            Skip
          </button>
          <button
            className="px-3 py-1 text-xs text-white bg-blue-500 hover:bg-blue-600 rounded"
            onClick={() => {
              if (isLast) {
                onEnd();
              } else {
                setStep(step + 1);
              }
            }}
          >
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}
