import { useState, useEffect } from 'react';
import { useExperiment } from '../../context/ExperimentContext';
import { useBehaviorLogger } from '../../hooks/useBehaviorLogger';
import { CodeDisplay } from '../CodeDisplay';
import { ProgressBar } from '../ProgressBar';
import type { TrialResponses } from '../../types';
import { stimuli } from '../../data/stimuli';

const confidenceLevels = [
  { value: 1, label: 'Not at all confident' },
  { value: 2, label: 'Slightly confident' },
  { value: 3, label: 'Moderately confident' },
  { value: 4, label: 'Very confident' },
  { value: 5, label: 'Extremely confident' },
];

export function TrialScreen() {
  const { state, dispatch, getCurrentStimulus } = useExperiment();
  const behaviorLogger = useBehaviorLogger();

  const [responses, setResponses] = useState<TrialResponses>({
    aiDetection: null,
    aiConfidence: null,
    effortEstimate: 5,
    effortConfidence: null,
  });

  const currentStimulus = getCurrentStimulus();
  const totalTrials = stimuli.length;
  const currentTrialNumber = state.currentTrialIndex + 1;
  const currentPhase = state.currentTrialPhase;

  // Get the question order for this stimulus
  const questionOrder = currentStimulus
    ? state.questionOrderAssignments[currentStimulus.id] || 'ai-first'
    : 'ai-first';

  // Determine which question type to show based on phase and randomized order
  const showAiQuestion =
    (currentPhase === 'question1' && questionOrder === 'ai-first') ||
    (currentPhase === 'question2' && questionOrder === 'effort-first');

  // Reset responses and logger when moving to a new stimulus
  useEffect(() => {
    setResponses({
      aiDetection: null,
      aiConfidence: null,
      effortEstimate: 5,
      effortConfidence: null,
    });
    behaviorLogger.reset();
  }, [state.currentTrialIndex]);

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
    ? responses.aiDetection !== null && responses.aiConfidence !== null
    : responses.effortConfidence !== null;

  const handleNext = () => {
    if (!isPhaseComplete || !currentStimulus) return;

    if (currentPhase === 'question1') {
      // Move to second question page
      dispatch({ type: 'NEXT_TRIAL_PHASE' });
    } else {
      // Both questions answered, save trial data and move to next stimulus
      const log = behaviorLogger.finalize();

      dispatch({
        type: 'ADD_TRIAL_DATA',
        payload: {
          stimulusId: currentStimulus.id,
          condition: currentStimulus.condition,
          presentationOrder: currentTrialNumber,
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

      if (currentTrialNumber >= totalTrials) {
        dispatch({ type: 'SET_SCREEN', payload: 'postsurvey' });
      } else {
        dispatch({ type: 'NEXT_TRIAL' });
      }
    }
  };

  if (!currentStimulus) {
    return <div>Loading...</div>;
  }

  // Calculate progress: each stimulus has 2 phases
  const totalPhases = totalTrials * 2;
  const currentPhaseNumber = (state.currentTrialIndex * 2) + (currentPhase === 'question1' ? 1 : 2);

  return (
    <div className="max-w-3xl mx-auto">
      <ProgressBar current={currentPhaseNumber} total={totalPhases} />

      <div className="text-sm text-gray-500 mb-4">
        Code snippet {currentTrialNumber} of {totalTrials} — Question {currentPhase === 'question1' ? '1' : '2'} of 2
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Context</h2>
        <p className="text-gray-600">{currentStimulus.context}</p>
      </div>

      <div className="mb-8">
        <CodeDisplay
          code={currentStimulus.code}
          onScroll={behaviorLogger.handleScroll}
          onCopy={behaviorLogger.handleCopy}
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        {showAiQuestion ? (
          <AIQuestionForm
            responses={responses}
            onChange={handleResponseChange}
          />
        ) : (
          <EffortQuestionForm
            responses={responses}
            onChange={handleResponseChange}
          />
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={!isPhaseComplete}
        className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {currentPhase === 'question1' ? 'Next Question' : currentTrialNumber >= totalTrials ? 'Finish Trials' : 'Next Code Snippet'}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
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
      {/* Question: AI Detection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Do you think this code was written with AI assistance?
        </h3>
        <div className="flex gap-6">
          {(['yes', 'no', 'unsure'] as const).map((option) => (
            <label key={option} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="aiDetection"
                value={option}
                checked={responses.aiDetection === option}
                onChange={(e) => onChange('aiDetection', e.target.value)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700 capitalize">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Question: AI Confidence */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          How confident are you in your answer?
        </h3>
        <div className="flex flex-wrap gap-4">
          {confidenceLevels.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="aiConfidence"
                value={value}
                checked={responses.aiConfidence === value}
                onChange={(e) => onChange('aiConfidence', parseInt(e.target.value))}
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
      {/* Question: Effort Estimate */}
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

      {/* Question: Effort Confidence */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          How confident are you in your answer?
        </h3>
        <div className="flex flex-wrap gap-4">
          {confidenceLevels.map(({ value, label }) => (
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
