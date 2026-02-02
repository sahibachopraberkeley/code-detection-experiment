// Configuration for the experiment
// In production, these should be set via environment variables

export const config = {
  // API endpoint for data submission
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || 'https://script.google.com/macros/s/AKfycbwwvnJXXWSTef73xEMnSG8HYdJbsVjzKkLCZA8llN2k7-Ww3uaViiPg_FSEcJhGkqv-/exec',

  // Prolific completion URL
  prolificCompletionUrl: 'https://app.prolific.com/submissions/complete?cc=C1CBDIGP',

  // Completion code shown to participants
  completionCode: 'C1CBDIGP',

  // Whether to use Prolific (extracts PROLIFIC_PID from URL)
  useProlific: true,

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
// Trigger deploy Sun Feb  1 15:28:45 PST 2026
