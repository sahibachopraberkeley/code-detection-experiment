import { useState, useEffect } from 'react';
import { useExperiment } from '../../context/ExperimentContext';
import { useBehaviorLogger } from '../../hooks/useBehaviorLogger';
import { CodeDisplay } from '../CodeDisplay';
import { ProgressBar } from '../ProgressBar';
import type { TrialResponses } from '../../types';
import { stimuli } from '../../data/stimuli';

export function TrialScreen() {
  const { state, dispatch, getCurrentStimulus, submitPartialData } = useExperiment();
  const behaviorLogger = useBehaviorLogger();

  const [responses, setResponses] = useState<TrialResponses>({
    aiDetection: null,
    aiConfidence: null,
    effortEstimate: null,
    effortConfidence: null,
    mergeWillingness: null,
  });

  const currentStimulus = getCurrentStimulus();
  const totalTrials = stimuli.length;
  const currentTrialNumber = state.currentTrialIndex + 1;
  const currentPhase = state.currentTrialPhase;

  // Get the question order for this stimulus (only applies to phases 1 and 2)
  const questionOrder = currentStimulus
    ? state.questionOrderAssignments[currentStimulus.id] || 'ai-first'
    : 'ai-first';

  // Phase 1 / 2: AI and effort questions in randomized order. Phase 3: merge slider (always last).
  const showAiQuestion =
    (currentPhase === 'question1' && questionOrder === 'ai-first') ||
    (currentPhase === 'question2' && questionOrder === 'effort-first');
  const showMergeQuestion = currentPhase === 'question3';

  // Randomize button order per trial
  const [buttonOrder, setButtonOrder] = useState<'human-first' | 'ai-first'>(() =>
    Math.random() < 0.5 ? 'human-first' : 'ai-first'
  );

  // Reset responses and logger when moving to a new stimulus
  useEffect(() => {
    setResponses({
      aiDetection: null,
      aiConfidence: null,
      effortEstimate: null,
      effortConfidence: null,
      mergeWillingness: null,
    });
    setButtonOrder(Math.random() < 0.5 ? 'human-first' : 'ai-first');
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

  const handleNext = async () => {
    if (!isPhaseComplete || !currentStimulus) return;

    if (currentPhase === 'question1' || currentPhase === 'question2') {
      // Move to next question page
      dispatch({ type: 'NEXT_TRIAL_PHASE' });
    } else {
      // All three questions answered, save trial data and move to next stimulus
      const log = behaviorLogger.finalize();

      dispatch({
        type: 'ADD_TRIAL_DATA',
        payload: {
          stimulusId: currentStimulus.id,
          condition: currentStimulus.condition,
          presentationOrder: currentTrialNumber,
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

      // Submit partial data to Google Sheets after each trial
      // Use setTimeout to ensure state has updated before submitting
      setTimeout(() => {
        submitPartialData();
      }, 100);

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

  // Calculate progress: each stimulus has 3 phases
  const totalPhases = totalTrials * 3;
  const phaseIndex = currentPhase === 'question1' ? 1 : currentPhase === 'question2' ? 2 : 3;
  const currentPhaseNumber = state.currentTrialIndex * 3 + phaseIndex;

  return (
    <div className="max-w-3xl mx-auto">
      <ProgressBar current={currentPhaseNumber} total={totalPhases} />

      <div className="text-sm text-gray-500 mb-4">
        Code snippet {currentTrialNumber} of {totalTrials} — Question {phaseIndex} of 3
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
        {showMergeQuestion ? (
          <MergeQuestionForm
            responses={responses}
            onChange={handleResponseChange}
          />
        ) : showAiQuestion ? (
          <AIQuestionForm
            responses={responses}
            onChange={handleResponseChange}
            humanFirst={buttonOrder === 'human-first'}
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
        {currentPhase !== 'question3' ? 'Next Question' : currentTrialNumber >= totalTrials ? 'Finish Trials' : 'Next Code Snippet'}
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

      {/* Question: Effort Confidence — labeled buttons */}
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
