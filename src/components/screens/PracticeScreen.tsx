import { useState, useEffect, useMemo } from 'react';
import { useExperiment } from '../../context/ExperimentContext';
import { useBehaviorLogger } from '../../hooks/useBehaviorLogger';
import { CodeDisplay } from '../CodeDisplay';
import type { TrialResponses } from '../../types';

export function PracticeScreen() {
  const { dispatch, getPracticeStimulus } = useExperiment();
  const behaviorLogger = useBehaviorLogger();

  // Memoize the practice stimulus so it doesn't change on re-renders
  const practiceStimulus = useMemo(() => getPracticeStimulus(), []);

  // For practice, randomize which question comes first
  const [questionOrder] = useState<'ai-first' | 'effort-first'>(() =>
    Math.random() < 0.5 ? 'ai-first' : 'effort-first'
  );
  const [currentPhase, setCurrentPhase] = useState<'question1' | 'question2' | 'question3'>('question1');

  // Randomize button order for practice
  const [buttonOrder] = useState<'human-first' | 'ai-first'>(() =>
    Math.random() < 0.5 ? 'human-first' : 'ai-first'
  );

  const [responses, setResponses] = useState<TrialResponses>({
    aiDetection: null,
    aiConfidence: null,
    effortEstimate: null,
    effortConfidence: null,
    mergeWillingness: null,
  });

  useEffect(() => {
    behaviorLogger.reset();
  }, []);

  // Phase 1 / 2: AI and effort questions in randomized order. Phase 3: merge slider (always last).
  const showAiQuestion =
    (currentPhase === 'question1' && questionOrder === 'ai-first') ||
    (currentPhase === 'question2' && questionOrder === 'effort-first');
  const showMergeQuestion = currentPhase === 'question3';

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
            : field === 'effortConfidence'
              ? 'effortConfidence'
              : 'mergeWillingness';
    behaviorLogger.logResponseChange(logField, oldValue, value);
  };

  // Check if current phase is complete (every visible response must be set)
  const isPhaseComplete = showMergeQuestion
    ? responses.mergeWillingness !== null
    : showAiQuestion
      ? responses.aiDetection !== null && responses.aiConfidence !== null
      : responses.effortEstimate !== null && responses.effortConfidence !== null;

  const handleNext = () => {
    if (!isPhaseComplete) return;

    if (currentPhase === 'question1') {
      setCurrentPhase('question2');
    } else if (currentPhase === 'question2') {
      setCurrentPhase('question3');
    } else {
      // All three questions answered, save practice data
      const log = behaviorLogger.finalize();

      dispatch({
        type: 'SET_PRACTICE_DATA',
        payload: {
          stimulusId: practiceStimulus.id,
          condition: practiceStimulus.condition,
          presentationOrder: 0,
          questionOrder: questionOrder,
          buttonOrder: buttonOrder,
          responses: {
            aiDetection: responses.aiDetection!,
            aiConfidence: responses.aiConfidence!,
            effortEstimate: responses.effortEstimate!,
            effortConfidence: responses.effortConfidence!,
            mergeWillingness: responses.mergeWillingness!,
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
          Question {currentPhase === 'question1' ? '1' : currentPhase === 'question2' ? '2' : '3'} of 3
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
        {showMergeQuestion ? (
          <MergeQuestionForm responses={responses} onChange={handleResponseChange} />
        ) : showAiQuestion ? (
          <AIQuestionForm responses={responses} onChange={handleResponseChange} humanFirst={buttonOrder === 'human-first'} />
        ) : (
          <EffortQuestionForm responses={responses} onChange={handleResponseChange} />
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={!isPhaseComplete}
        className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {currentPhase === 'question3' ? 'Submit Practice Response' : 'Next Question'}
      </button>
    </div>
  );
}

// AI Detection Question Form
function AIQuestionForm({
  responses,
  onChange,
  humanFirst,
}: {
  responses: TrialResponses;
  onChange: (field: keyof TrialResponses, value: string | number) => void;
  humanFirst: boolean;
}) {
  const buttons = [
    { value: 'human' as const, label: 'Human', icon: '👤' },
    { value: 'ai' as const, label: 'AI', icon: '🤖' },
  ];
  const orderedButtons = humanFirst ? buttons : [buttons[1], buttons[0]];

  return (
    <div className="space-y-8">
      {/* Question: AI Detection — forced binary */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Was this code written by a human or by AI?
        </h3>
        <p className="text-sm text-gray-500 mb-3">Each snippet had a 50/50 chance of being either.</p>
        <div className="flex gap-4">
          {orderedButtons.map(({ value, label, icon }) => (
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
            onMouseDown={() => {
              if (responses.aiConfidence === null) onChange('aiConfidence', 75);
            }}
            onTouchStart={() => {
              if (responses.aiConfidence === null) onChange('aiConfidence', 75);
            }}
            onKeyDown={() => {
              if (responses.aiConfidence === null) onChange('aiConfidence', 75);
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500">50% — Just guessing</span>
            <span className="text-lg font-semibold text-blue-600">
              {responses.aiConfidence === null ? '—' : `${responses.aiConfidence}%`}
            </span>
            <span className="text-xs text-gray-500">100% — Completely certain</span>
          </div>
          {responses.aiConfidence === null && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              Move the slider to record your response.
            </p>
          )}
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
            value={responses.effortEstimate ?? 5}
            onChange={(e) => onChange('effortEstimate', parseInt(e.target.value))}
            onMouseDown={() => {
              if (responses.effortEstimate === null) onChange('effortEstimate', 5);
            }}
            onTouchStart={() => {
              if (responses.effortEstimate === null) onChange('effortEstimate', 5);
            }}
            onKeyDown={() => {
              if (responses.effortEstimate === null) onChange('effortEstimate', 5);
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500">1 = Trivial/minimal effort</span>
            <span className="text-lg font-semibold text-blue-600">
              {responses.effortEstimate === null ? '—' : `${responses.effortEstimate}/10`}
            </span>
            <span className="text-xs text-gray-500">10 = Substantial effort</span>
          </div>
          {responses.effortEstimate === null && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              Move the slider to record your response.
            </p>
          )}
        </div>
      </div>

      {/* Effort Confidence — labeled buttons */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          How confident are you in your effort estimate?
        </h3>
        <div className="flex gap-2">
          {([
            { value: 1, label: 'Not at all' },
            { value: 2, label: 'Slightly' },
            { value: 3, label: 'Moderately' },
            { value: 4, label: 'Very' },
            { value: 5, label: 'Extremely' },
          ]).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange('effortConfidence', value)}
              className={`flex-1 py-2 px-1 rounded-lg border text-sm font-medium transition-all ${
                responses.effortConfidence === value
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Merge Willingness Question Form (always shown last)
function MergeQuestionForm({
  responses,
  onChange,
}: {
  responses: TrialResponses;
  onChange: (field: keyof TrialResponses, value: string | number) => void;
}) {
  const value = responses.mergeWillingness;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Imagine this code was submitted to your team's repository as a pull request. How willing
          would you be to merge it as-is?
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          "As-is" means without requesting any changes from the contributor.
        </p>
        <div className="px-2">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={value ?? 50}
            onChange={(e) => onChange('mergeWillingness', parseInt(e.target.value))}
            onMouseDown={() => {
              if (value === null) onChange('mergeWillingness', 50);
            }}
            onTouchStart={() => {
              if (value === null) onChange('mergeWillingness', 50);
            }}
            onKeyDown={() => {
              if (value === null) onChange('mergeWillingness', 50);
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500">0 — Definitely would not merge</span>
            <span className="text-lg font-semibold text-blue-600">
              {value === null ? '—' : `${value}/100`}
            </span>
            <span className="text-xs text-gray-500">100 — Definitely would merge</span>
          </div>
          {value === null && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              Move the slider to record your response.
            </p>
          )}
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
        now begin. For each code snippet, you'll answer three questions on separate pages.
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
