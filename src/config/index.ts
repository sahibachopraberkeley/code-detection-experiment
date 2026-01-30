// Configuration for the experiment
// In production, these should be set via environment variables

export const config = {
  // API endpoint for data submission
  // Set VITE_API_ENDPOINT in .env file or use the default
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || '/api/submit',

  // Prolific completion URL - replace XXXXXX with your actual completion code
  prolificCompletionUrl: import.meta.env.VITE_PROLIFIC_COMPLETION_URL || 'https://app.prolific.com/submissions/complete?cc=XXXXXX',

  // Completion code shown to participants
  completionCode: import.meta.env.VITE_COMPLETION_CODE || 'EFFORT2024',

  // Whether to use Prolific (extracts PROLIFIC_PID from URL)
  useProlific: import.meta.env.VITE_USE_PROLIFIC === 'true',

  // Study metadata
  studyName: 'code-detection-experiment',
  studyVersion: '1.0.0',
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
