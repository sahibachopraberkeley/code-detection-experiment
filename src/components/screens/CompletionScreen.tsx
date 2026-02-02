import { useEffect, useState, useRef, useMemo } from 'react';
import { useExperiment } from '../../context/ExperimentContext';
import { config } from '../../config';
import { submitExperimentData, type SubmissionStatus, type SubmissionResult } from '../../services/dataSubmission';
import { calculateTotalBonus, formatBonus } from '../../utils/bonusCalculation';
import type { ExperimentData } from '../../types';

export function CompletionScreen() {
  const { state, finalizeSessionTracking, clearSavedState } = useExperiment();
  const [copied, setCopied] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const submissionAttempted = useRef(false);
  const experimentDataRef = useRef<ExperimentData | null>(null);

  // Calculate bonus based on trial responses
  const bonusInfo = useMemo(() => {
    if (state.trialData.length === 0) {
      return { totalBonus: 0, totalScore: 0, maxPossibleScore: 6, trialScores: [] };
    }
    return calculateTotalBonus(state.trialData);
  }, [state.trialData]);

  // Build experiment data once on mount
  if (experimentDataRef.current === null) {
    const sessionTracking = finalizeSessionTracking();
    const bonus = state.trialData.length > 0
      ? calculateTotalBonus(state.trialData)
      : { totalBonus: 0, totalScore: 0, maxPossibleScore: 6, trialScores: [] };

    experimentDataRef.current = {
      participantId: state.participantId || 'unknown',
      startTime: state.startTime,
      endTime: new Date().toISOString(),
      screeningResponses: state.screeningResponses,
      codeScreenerResponses: state.codeScreenerResponses,
      demographicResponses: state.demographicResponses,
      trialData: state.trialData,
      practiceData: state.practiceData,
      postSurveyResponses: state.postSurveyResponses,
      sessionTracking,
      bonusInfo: {
        totalBonus: bonus.totalBonus,
        totalScore: bonus.totalScore,
        maxPossibleScore: bonus.maxPossibleScore,
      },
    };
  }

  const experimentData = experimentDataRef.current;

  useEffect(() => {
    // Prevent duplicate submissions
    if (submissionAttempted.current) return;
    submissionAttempted.current = true;

    // Log to console for debugging
    console.log('=== EXPERIMENT DATA ===');
    console.log(JSON.stringify(experimentData, null, 2));

    // Submit data
    const submitData = async () => {
      setSubmissionStatus('submitting');
      try {
        const result = await submitExperimentData(experimentData);
        setSubmissionResult(result);
        setSubmissionStatus(result.success ? 'success' : 'error');
        console.log('Submission result:', result);
        // Clear saved state after successful submission
        if (result.success) {
          clearSavedState();
          console.log('[Completion] Cleared saved state after successful submission');
        }
      } catch (error) {
        console.error('Submission error:', error);
        setSubmissionStatus('error');
        setSubmissionResult({
          success: false,
          message: 'Failed to submit data. Your responses have been saved locally.',
        });
      }
    };

    submitData();
  }, [clearSavedState]);

  const handleCopyData = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(experimentData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRetry = async () => {
    console.log('[Retry] Button clicked, attempting retry...');
    console.log('[Retry] experimentData:', experimentData ? 'exists' : 'null');
    setSubmissionStatus('submitting');
    try {
      const result = await submitExperimentData(experimentData);
      setSubmissionResult(result);
      setSubmissionStatus(result.success ? 'success' : 'error');
      // Clear saved state after successful retry
      if (result.success) {
        clearSavedState();
        console.log('[Retry] Cleared saved state after successful submission');
      }
    } catch (error) {
      console.error('Retry submission error:', error);
      setSubmissionStatus('error');
      setSubmissionResult({
        success: false,
        message: 'Failed to submit data. Your responses have been saved locally.',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      {/* Submission Status Banner */}
      {submissionStatus === 'submitting' && (
        <div className="mb-6 p-6 bg-red-50 border-2 border-red-300 rounded-lg">
          <div className="flex items-center justify-center gap-3 mb-3">
            <svg className="w-6 h-6 text-red-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-red-700 font-semibold text-lg">Saving your responses...</span>
          </div>
          <p className="text-red-600 font-medium text-center">
            Please DO NOT refresh or close this page until the submission is complete.
          </p>
        </div>
      )}

      {submissionStatus === 'error' && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-yellow-700 font-medium">Submission Issue</span>
          </div>
          <p className="text-yellow-600 text-sm mb-3">{submissionResult?.message}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Retry Submission
          </button>
        </div>
      )}

      <div className="mb-6">
        <svg
          className="w-20 h-20 mx-auto text-green-500"
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

      <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You for Participating!</h1>

      <p className="text-gray-600 mb-8">
        Your responses have been recorded. We appreciate your time and thoughtful participation in
        this study.
      </p>

      {/* Payment Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-green-800 mb-4">Your Payment</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-green-700">Base payment:</span>
            <span className="font-semibold text-green-800">$2.50</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-green-700">Performance bonus:</span>
            <span className="font-semibold text-green-800">{formatBonus(bonusInfo.totalBonus)}</span>
          </div>
          <div className="border-t border-green-300 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-green-800 font-medium">Total:</span>
              <span className="text-xl font-bold text-green-800">
                {formatBonus(2.50 + bonusInfo.totalBonus)}
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-green-600 mt-3">
          Bonus calculated using quadratic scoring based on accuracy and confidence.
          Your bonus will be paid via Prolific within a few days.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Completion Code</h2>
        <p className="text-3xl font-mono font-bold text-blue-600">{config.completionCode}</p>
      </div>

      <div className="space-y-4 mb-8">
        <button
          onClick={handleCopyData}
          className="w-full py-3 px-6 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy Data to Clipboard
            </>
          )}
        </button>

        {config.useProlific && (
          <a
            href={config.prolificCompletionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Prolific
          </a>
        )}
      </div>

      {submissionStatus === 'success' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 font-medium">
            Your data has been successfully submitted. You may now close this page.
          </p>
        </div>
      )}

      {submissionStatus === 'error' && (
        <p className="text-sm text-gray-500">
          There was an issue submitting your data. Please try clicking "Retry Submission" above.
        </p>
      )}

      {submissionResult?.submissionId && (
        <p className="text-xs text-gray-400 mt-2">
          Submission ID: {submissionResult.submissionId}
        </p>
      )}
    </div>
  );
}
