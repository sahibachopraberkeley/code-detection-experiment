import { useState, useEffect, useMemo } from 'react';
import { useExperiment } from '../../context/ExperimentContext';
import { useBehaviorLogger } from '../../hooks/useBehaviorLogger';
import { CodeDisplay } from '../CodeDisplay';
import type { TrialResponses } from '../../types';

const effortConfidenceLevels = [
  { value: 1, label: 'Not at all confident' },
  { value: 2, label: 'Slightly confident' },
  { value: 3, label: 'Moderately confident' },
  { value: 4, label: 'Very confident' },
  { value: 5, label: 'Extremely confident' },
];

export function PracticeScreen() {
  const { dispatch, getPracticeStimulus } = useExperiment();
  const behaviorLogger = useBehaviorLogger();

  // Memoize the practice stimulus so it doesn't change on re-renders
  const practiceStimulus = useMemo(() => getPracticeStimulus(), []);

  // For practice, randomize which question comes first
  const [questionOrder] = useState<'ai-first' | 'effort-first'>(() =>
    Math.random() < 0.5 ? 'ai-first' : 'effort-first'
  );
  const [currentPhase, setCurrentPhase] = useState<'question1' | 'question2'>('question1');

  const [responses, setResponses] = useState<TrialResponses>({
    aiDetection: null,
    aiConfidence: 75,
    effortEstimate: 5,
    effortConfidence: null,
  });

  useEffect(() => {
    behaviorLogger.reset();
  }, []);

  // Determine which question type to show based on phase and randomized order
  const showAiQuestion =
    (currentPhase === 'question1' && questionOrder === 'ai-first') ||
    (currentPhase === 'question2' && questionOrder === 'effort-first');

  const handleResponseChange = (field: keyof TrialResponses, value: string | number) => {
    const oldValue = responses[field];
    setResponses((prev) => ({ ...prev, [field]: value }));

    const logField =
      field === 'aiDetection'
        ? 'aiDetection'
        : field === 'aiConfidence'
          ? 'aiConfidence'
          : field === 'effortEstimate'
            ? 'effort'
            : 'effortConfidence';
    behaviorLogger.logResponseChange(logField, oldValue, value);
  };

  // Check if current phase is complete
  const isPhaseComplete = showAiQuestion
    ? responses.aiDetection !== null
    : responses.effortConfidence !== null;

  const handleNext = () => {
    if (!isPhaseComplete) return;

    if (currentPhase === 'question1') {
      // Move to second question page
      setCurrentPhase('question2');
    } else {
      // Both questions answered, save practice data
      const log = behaviorLogger.finalize();

      dispatch({
        type: 'SET_PRACTICE_DATA',
        payload: {
          stimulusId: practiceStimulus.id,
          condition: practiceStimulus.condition,
          presentationOrder: 0,
          questionOrder: questionOrder,
          responses: {
            aiDetection: responses.aiDetection!,
            aiConfidence: responses.aiConfidence!,
            effortEstimate: responses.effortEstimate,
            effortConfidence: responses.effortConfidence!,
          },
          behaviorLog: log,
        },
      });

      dispatch({ type: 'SET_SCREEN', payload: 'practice-feedback' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
          Practice Trial
        </span>
        <span className="ml-3 text-sm text-gray-500">
          Question {currentPhase === 'question1' ? '1' : '2'} of 2
        </span>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Context</h2>
        <p className="text-gray-600">{practiceStimulus.context}</p>
      </div>

      <div className="mb-8">
        <CodeDisplay
          code={practiceStimulus.code}
          onScroll={behaviorLogger.handleScroll}
          onCopy={behaviorLogger.handleCopy}
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        {showAiQuestion ? (
          <AIQuestionForm responses={responses} onChange={handleResponseChange} />
        ) : (
          <EffortQuestionForm responses={responses} onChange={handleResponseChange} />
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={!isPhaseComplete}
        className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {currentPhase === 'question1' ? 'Next Question' : 'Submit Practice Response'}
      </button>
    </div>
  );
}

// AI Detection Question Form
function AIQuestionForm({
  responses,
  onChange,
}: {
  responses: TrialResponses;
  onChange: (field: keyof TrialResponses, value: string | number) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Question: AI Detection — forced binary */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Was this code written by a human or by AI?
        </h3>
        <p className="text-sm text-gray-500 mb-3">Each snippet had a 50/50 chance of being either.</p>
        <div className="flex gap-4">
          {([
            { value: 'human', label: 'Human', icon: '👤' },
            { value: 'ai', label: 'AI', icon: '🤖' },
          ] as const).map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange('aiDetection', value)}
              className={`flex-1 py-4 px-6 rounded-lg border-2 font-medium text-lg transition-all ${
                responses.aiDetection === value
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-2xl mb-1 block">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Question: Confidence — 50% to 100% slider */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          How confident are you?
        </h3>
        <div className="px-2">
          <input
            type="range"
            min="50"
            max="100"
            step="1"
            value={responses.aiConfidence ?? 75}
            onChange={(e) => onChange('aiConfidence', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500">50% — Just guessing</span>
            <span className="text-lg font-semibold text-blue-600">{responses.aiConfidence ?? 75}%</span>
            <span className="text-xs text-gray-500">100% — Completely certain</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Effort Estimate Question Form
function EffortQuestionForm({
  responses,
  onChange,
}: {
  responses: TrialResponses;
  onChange: (field: keyof TrialResponses, value: string | number) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          How much effort do you estimate went into writing this code?
        </h3>
        <div className="px-2">
          <input
            type="range"
            min="1"
            max="10"
            value={responses.effortEstimate}
            onChange={(e) => onChange('effortEstimate', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500">1 = Trivial/minimal effort</span>
            <span className="text-lg font-semibold text-blue-600">{responses.effortEstimate}/10</span>
            <span className="text-xs text-gray-500">10 = Substantial effort</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          How confident are you in your answer?
        </h3>
        <div className="flex flex-wrap gap-4">
          {effortConfidenceLevels.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="effortConfidence"
                value={value}
                checked={responses.effortConfidence === value}
                onChange={(e) => onChange('effortConfidence', parseInt(e.target.value))}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700 text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PracticeFeedbackScreen() {
  const { dispatch } = useExperiment();

  const handleContinue = () => {
    dispatch({ type: 'SET_SCREEN', payload: 'trial' });
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-6">
        <svg
          className="w-16 h-16 mx-auto text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-4">Practice Complete!</h1>

      <p className="text-gray-600 mb-8">
        Great! That was a practice trial to familiarize you with the interface. The main study will
        now begin. For each code snippet, you'll answer two questions on separate pages.
      </p>

      <button
        onClick={handleContinue}
        className="py-3 px-8 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Start Main Study
      </button>
    </div>
  );
}
