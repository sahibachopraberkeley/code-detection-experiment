import { useState } from 'react';
import { useExperiment } from '../../context/ExperimentContext';

export function ScreeningScreen() {
  const { dispatch } = useExperiment();
  const [hasCodedRecently, setHasCodedRecently] = useState<boolean | null>(null);
  const [showDisqualified, setShowDisqualified] = useState(false);

  const handleContinue = () => {
    if (hasCodedRecently === null) return;

    dispatch({
      type: 'SET_SCREENING_RESPONSES',
      payload: { hasCodedRecently },
    });

    if (hasCodedRecently) {
      dispatch({ type: 'SET_SCREEN', payload: 'demographics' });
    } else {
      setShowDisqualified(true);
    }
  };

  if (showDisqualified) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Thank You</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your interest, but this study requires recent programming experience.
        </p>
        <p className="text-gray-500 text-sm">
          You may close this window now.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Screening Question</h1>

      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Have you written any code in the last 12 months?
        </h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="hasCodedRecently"
              checked={hasCodedRecently === true}
              onChange={() => setHasCodedRecently(true)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Yes</span>
          </label>
          <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="hasCodedRecently"
              checked={hasCodedRecently === false}
              onChange={() => setHasCodedRecently(false)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">No</span>
          </label>
        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={hasCodedRecently === null}
        className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
