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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Code Review Study</h1>

      <div className="space-y-6 mb-8">
        {/* Study Overview */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">What You'll Do</h2>
          <p className="text-gray-600">
            You will review several code snippets and answer questions about each one.
            No coding is required — you will only read and evaluate code.
          </p>
        </div>

        {/* Study Structure */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Study Structure</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Coding knowledge check (5 questions)</li>
            <li>Background questions</li>
            <li>One practice trial</li>
            <li>6 main evaluation trials</li>
            <li>A brief final question</li>
          </ul>
          <p className="text-gray-500 text-sm mt-2">Estimated time: 10-15 minutes</p>
        </div>

        {/* Requirements */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Requirements</h2>
          <ul className="list-disc list-inside space-y-1 text-yellow-700">
            <li><span className="font-medium">Python programming experience</span> (all code snippets are in Python)</li>
            <li>Desktop or laptop computer</li>
            <li>Must pass the coding knowledge check to continue</li>
          </ul>
        </div>

        {/* No LLM Warning */}
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Important</h2>
          <p className="text-red-700">
            <span className="font-medium">Do not use any AI tools or LLMs</span> (e.g., ChatGPT, Claude, Copilot)
            to assist with this study. We have methods to detect AI-assisted responses, and any responses
            found to be AI-assisted will be <span className="font-medium">void and unpaid</span>.
          </p>
        </div>

        {/* Payment Information */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-green-800 mb-2">Payment</h2>
          <div className="space-y-2 text-green-700">
            <p><span className="font-medium">Base payment:</span> $2.50</p>
            <p><span className="font-medium">Performance bonus:</span> Up to $1.50</p>
            <p className="text-sm text-green-600 mt-2">
              Your bonus is calculated based on the accuracy and confidence of your responses.
              Being confident and correct earns the highest bonus. Being uncertain is better than
              being confidently wrong.
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700">
            <span className="font-medium">Tip:</span> Please give your initial impressions —
            don't overthink any single response.
          </p>
        </div>
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

      {/* Consent Notice */}
      <div className="mb-6 p-4 bg-gray-100 border border-gray-300 rounded-lg">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Consent:</span> By clicking "Begin" below, you confirm that you have
          read and understood the information above, and you voluntarily agree to participate in this research study.
          Your participation is voluntary and you may withdraw at any time.
        </p>
      </div>

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
