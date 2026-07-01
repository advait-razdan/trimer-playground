import { useEffect, useState } from 'react';
import {
  welcomeTitle,
  welcomeIntro,
  welcomeTransition,
  welcomePoints,
  welcomeFooter,
  welcomeActions,
} from '../../content/welcome';

const STORAGE_KEY = 'polyomino-welcome-seen';

interface WelcomeCardProps {
  onAction: (action: 'tour' | 'glossary' | 'preset' | 'skip') => void;
  forceOpen?: boolean;
}

export function WelcomeCard({ onAction, forceOpen }: WelcomeCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setVisible(true);
      return;
    }
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setVisible(true);
    }
  }, [forceOpen]);

  function dismiss(action: 'tour' | 'glossary' | 'preset' | 'skip') {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    onAction(action);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-3">{welcomeTitle}</h2>

        <p className="text-sm text-gray-600 mb-3">{welcomeIntro}</p>
        <p className="text-sm text-gray-600 mb-2 font-medium">{welcomeTransition}</p>

        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1.5 mb-3 pl-1">
          {welcomePoints.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ol>

        <p className="text-sm text-gray-600 mb-4">{welcomeFooter}</p>

        <div className="flex flex-wrap gap-2">
          {welcomeActions.map(({ label, action }) => (
            <button
              key={action}
              className={
                action === 'skip'
                  ? 'px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded'
                  : 'px-3 py-1.5 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded'
              }
              onClick={() => dismiss(action)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
