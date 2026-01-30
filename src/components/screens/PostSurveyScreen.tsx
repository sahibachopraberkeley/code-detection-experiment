import { useState } from 'react';
import { useExperiment } from '../../context/ExperimentContext';

export function PostSurveyScreen() {
  const { dispatch } = useExperiment();
  const [detectionCues, setDetectionCues] = useState('');

  const isValid = detectionCues.trim().length >= 10;

  const handleSubmit = () => {
    if (!isValid) return;

    dispatch({
      type: 'SET_POST_SURVEY_RESPONSES',
      payload: { detectionCues: detectionCues.trim() },
    });

    dispatch({ type: 'SET_SCREEN', payload: 'completion' });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Final Question</h1>

      <div className="mb-6">
        <label className="block text-lg font-medium text-gray-900 mb-3">
          What cues or signals did you use when trying to identify AI-generated code? Please
          describe your thought process.
        </label>
        <textarea
          value={detectionCues}
          onChange={(e) => setDetectionCues(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="Describe the patterns, characteristics, or signals you looked for..."
        />
        <p className="mt-2 text-sm text-gray-500">
          {detectionCues.length < 10
            ? `Please write at least 10 characters (${detectionCues.length}/10)`
            : `${detectionCues.length} characters`}
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid}
        className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Submit
      </button>
    </div>
  );
}
