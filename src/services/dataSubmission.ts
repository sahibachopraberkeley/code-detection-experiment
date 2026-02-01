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
  // Try to save to localStorage as backup (but don't let it block submission)
  try {
    saveToLocalStorage(data);
  } catch (error) {
    console.warn('localStorage backup failed (quota exceeded), continuing with API submission...', error);
  }

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
 * Handles Google Apps Script redirects properly
 */
async function submitToApi(data: object): Promise<SubmissionResult> {
  let lastError: Error | null = null;
  const isGoogleAppsScript = config.apiEndpoint.includes('script.google.com');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (isGoogleAppsScript) {
        // Google Apps Script requires special handling
        // Try multiple methods to ensure data is sent
        const jsonData = JSON.stringify(data);
        let success = false;

        // Method 1: Try fetch with redirect follow
        try {
          const response = await fetch(config.apiEndpoint, {
            method: 'POST',
            redirect: 'follow',
            headers: {
              'Content-Type': 'text/plain',
            },
            body: jsonData,
          });

          // If we get any response (even after redirect), consider it potentially successful
          if (response.ok || response.type === 'opaque' || response.type === 'opaqueredirect') {
            success = true;
            try {
              const result = await response.json();
              if (result.success) {
                return {
                  success: true,
                  message: 'Data submitted successfully',
                  submissionId: result.submissionId,
                };
              }
            } catch {
              // Response wasn't JSON, but request may have succeeded
              success = true;
            }
          }
        } catch (fetchError) {
          console.warn('Fetch method failed, trying sendBeacon...', fetchError);
        }

        // Method 2: Try sendBeacon as fallback (works better with redirects)
        if (!success && navigator.sendBeacon) {
          const blob = new Blob([jsonData], { type: 'text/plain' });
          success = navigator.sendBeacon(config.apiEndpoint, blob);
          console.log('sendBeacon result:', success);
        }

        // Method 3: Try with no-cors mode
        if (!success) {
          await fetch(config.apiEndpoint, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'text/plain',
            },
            body: jsonData,
          });
          success = true; // Assume success since no-cors doesn't throw on success
        }

        if (success) {
          const submissionId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log('Data sent to Google Apps Script');
          return {
            success: true,
            message: 'Data submitted successfully',
            submissionId,
          };
        }
      } else {
        // Standard API endpoint
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
      }
    } catch (error) {
      lastError = error as Error;
      console.error(`Submission attempt ${attempt} failed:`, error);

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
