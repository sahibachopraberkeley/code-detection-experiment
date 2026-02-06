// Configuration for the experiment
// In production, these should be set via environment variables

export const config = {
  // API configuration (S3 via API Gateway)
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || '',
  apiKey: import.meta.env.VITE_API_KEY || '',

  // Prolific completion URL
  prolificCompletionUrl: import.meta.env.VITE_PROLIFIC_COMPLETION_URL || 'https://app.prolific.com/submissions/complete?cc=C1DVUFOT',

  // Completion code shown to participants
  completionCode: import.meta.env.VITE_COMPLETION_CODE || 'C1DVUFOT',

  // Whether to use Prolific (extracts PROLIFIC_PID from URL)
  useProlific: import.meta.env.VITE_USE_PROLIFIC === 'true',

  // Study metadata
  studyName: 'code-detection-experiment',
  studyVersion: '1.1.0', // Updated for S3 migration
};

// Extract Prolific participant ID from URL parameters
export function getProlificParams(): {
  prolificPid: string | null;
  studyId: string | null;
  sessionId: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  return {
    prolificPid: params.get('PROLIFIC_PID'),
    studyId: params.get('STUDY_ID'),
    sessionId: params.get('SESSION_ID'),
  };
}

// Generate a unique participant ID if not using Prolific
export function generateParticipantId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `P_${timestamp}_${randomPart}`;
}
