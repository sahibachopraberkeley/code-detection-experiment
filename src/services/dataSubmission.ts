import type { ExperimentData } from '../types';
import { config } from '../config';

export type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface SubmissionResult {
  success: boolean;
  message: string;
  submissionId?: string;
  fallbackUsed?: boolean;
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Submit experiment data to the backend
 * Tries multiple methods with fallbacks:
 * 1. Primary API endpoint
 * 2. Local storage (always as backup)
 */
export async function submitExperimentData(data: ExperimentData): Promise<SubmissionResult> {
  // Always save to localStorage first as backup
  saveToLocalStorage(data);

  // Add metadata to the submission
  const enrichedData = {
    ...data,
    metadata: {
      studyName: config.studyName,
      studyVersion: config.studyVersion,
      submittedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  // Try primary API endpoint
  if (config.apiEndpoint && config.apiEndpoint !== '/api/submit') {
    try {
      const result = await submitToApi(enrichedData);
      if (result.success) {
        markAsSubmitted(data.participantId);
        return result;
      }
    } catch (error) {
      console.warn('API submission failed, trying fallbacks...', error);
    }
  }

  // If we get here, only localStorage worked
  console.log('Using localStorage as fallback');
  return {
    success: true,
    message: 'Data saved locally. Please ensure you have a stable connection for future submissions.',
    fallbackUsed: true,
  };
}

/**
 * Submit to REST API endpoint with retries
 */
async function submitToApi(data: object): Promise<SubmissionResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          message: 'Data submitted successfully',
          submissionId: result.id || result.submissionId,
        };
      }

      // Non-retryable errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        const errorText = await response.text();
        throw new Error(`Server rejected submission: ${response.status} - ${errorText}`);
      }

      // Retryable errors (5xx)
      lastError = new Error(`Server error: ${response.status}`);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on network errors that indicate no connection
      if (error instanceof TypeError && error.message.includes('fetch')) {
        break;
      }
    }

    // Wait before retrying
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError || new Error('Unknown error during API submission');
}

/**
 * Save data to localStorage
 */
function saveToLocalStorage(data: ExperimentData): void {
  const key = `experiment_${config.studyName}_${data.participantId}`;
  const existingData = localStorage.getItem('experiment_submissions') || '[]';
  const submissions = JSON.parse(existingData);

  // Add new submission
  submissions.push({
    key,
    data,
    savedAt: new Date().toISOString(),
    submitted: false,
  });

  localStorage.setItem('experiment_submissions', JSON.stringify(submissions));
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Mark a submission as successfully sent to server
 */
function markAsSubmitted(participantId: string): void {
  const existingData = localStorage.getItem('experiment_submissions') || '[]';
  const submissions = JSON.parse(existingData);

  const updated = submissions.map((s: { data: ExperimentData; submitted: boolean }) => {
    if (s.data.participantId === participantId) {
      return { ...s, submitted: true, submittedAt: new Date().toISOString() };
    }
    return s;
  });

  localStorage.setItem('experiment_submissions', JSON.stringify(updated));
}

/**
 * Get all unsubmitted data from localStorage (for manual recovery)
 */
export function getUnsubmittedData(): ExperimentData[] {
  const existingData = localStorage.getItem('experiment_submissions') || '[]';
  const submissions = JSON.parse(existingData);
  return submissions
    .filter((s: { submitted: boolean }) => !s.submitted)
    .map((s: { data: ExperimentData }) => s.data);
}

/**
 * Export all local data as JSON (for researcher data recovery)
 */
export function exportAllLocalData(): string {
  const existingData = localStorage.getItem('experiment_submissions') || '[]';
  return existingData;
}
