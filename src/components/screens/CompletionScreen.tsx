import { useEffect, useState, useRef } from 'react';
import { useExperiment } from '../../context/ExperimentContext';
import { config } from '../../config';
import { submitExperimentData, type SubmissionStatus, type SubmissionResult } from '../../services/dataSubmission';
import type { ExperimentData } from '../../types';

export function CompletionScreen() {
  const { state } = useExperiment();
  const [copied, setCopied] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const submissionAttempted = useRef(false);

  const experimentData: ExperimentData = {
    participantId: state.participantId || 'unknown',
    startTime: state.startTime,
    endTime: new Date().toISOString(),
    screeningResponses: state.screeningResponses,
    demographicResponses: state.demographicResponses,
    trialData: state.trialData,
    practiceData: state.practiceData,
    postSurveyResponses: state.postSurveyResponses,
  };

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
  }, []);

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
    setSubmissionStatus('submitting');
    try {
      const result = await submitExperimentData(experimentData);
      setSubmissionResult(result);
      setSubmissionStatus(result.success ? 'success' : 'error');
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
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center gap-3">
          <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-blue-700">Submitting your responses...</span>
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

      {submissionStatus === 'success' && submissionResult?.fallbackUsed && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">{submissionResult.message}</p>
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

      <p className="text-sm text-gray-500">
        {submissionStatus === 'success' && !submissionResult?.fallbackUsed
          ? 'Your data has been successfully submitted.'
          : 'Your data has been saved locally as a backup.'}
      </p>

      {submissionResult?.submissionId && (
        <p className="text-xs text-gray-400 mt-2">
          Submission ID: {submissionResult.submissionId}
        </p>
      )}
    </div>
  );
}
