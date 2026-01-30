import { useState, useEffect } from 'react';
import { useExperiment } from '../../context/ExperimentContext';
import { config, getProlificParams, generateParticipantId } from '../../config';

export function WelcomeScreen() {
  const { dispatch } = useExperiment();
  const [participantId, setParticipantId] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isProlificUser, setIsProlificUser] = useState(false);

  useEffect(() => {
    if (config.useProlific) {
      // Try to get Prolific ID from URL
      const { prolificPid } = getProlificParams();
      if (prolificPid) {
        setParticipantId(prolificPid);
        setIsProlificUser(true);
      } else {
        // Generate a participant ID for non-Prolific users
        setParticipantId(generateParticipantId());
        setShowManualInput(true);
      }
    } else {
      // Not using Prolific, check URL params or generate ID
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get('PROLIFIC_PID') || params.get('participant_id');
      if (urlId) {
        setParticipantId(urlId);
      } else {
        setParticipantId(generateParticipantId());
        setShowManualInput(true);
      }
    }
  }, []);

  const handleBegin = () => {
    if (participantId.trim()) {
      dispatch({ type: 'SET_PARTICIPANT_ID', payload: participantId.trim() });
      dispatch({ type: 'SET_SCREEN', payload: 'screening' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Code Evaluation Study</h1>

      <div className="prose prose-lg text-gray-600 mb-8">
        <p>
          In this study, you will view code snippets and answer questions about them. There are no
          right or wrong answers—we're interested in your judgment.
        </p>
        <p>The study consists of:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>A few background questions</li>
          <li>One practice trial</li>
          <li>5 main evaluation trials</li>
          <li>A brief final question</li>
        </ul>
      </div>

      {showManualInput && (
        <div className="mb-6">
          <label htmlFor="participantId" className="block text-sm font-medium text-gray-700 mb-2">
            Please enter your participant ID:
          </label>
          <input
            type="text"
            id="participantId"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your ID"
          />
        </div>
      )}

      {!showManualInput && participantId && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            {isProlificUser ? 'Prolific ID: ' : 'Participant ID: '}
            <span className="font-mono font-medium">{participantId}</span>
          </p>
        </div>
      )}

      <button
        onClick={handleBegin}
        disabled={!participantId.trim()}
        className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Begin
      </button>
    </div>
  );
}
