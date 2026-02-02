import type { ExperimentData } from '../types';
import { config } from '../config';

export type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface SubmissionResult {
  success: boolean;
  message: string;
  submissionId?: string;
}

/**
 * Submit experiment data to Google Apps Script
 */
export async function submitExperimentData(data: ExperimentData): Promise<SubmissionResult> {
  console.log('[Submission] Starting submission...');
  console.log('[Submission] Type:', data?.submissionType || 'unknown');
  console.log('[Submission] Trials completed:', data?.trialsCompleted || 0);
  console.log('[Submission] Data received:', data ? 'yes' : 'no');

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

  const jsonData = JSON.stringify(enrichedData);

  // Check if API endpoint is configured
  if (!config.apiEndpoint || config.apiEndpoint === '/api/submit') {
    console.error('API endpoint not configured');
    throw new Error('API endpoint not configured. Please set VITE_API_ENDPOINT.');
  }

  console.log('Submitting to:', config.apiEndpoint);
  console.log('Data size:', jsonData.length, 'bytes');

  // Use sendBeacon for reliable delivery (works even if page is closing)
  // Note: Use text/plain for Google Apps Script compatibility
  if (navigator.sendBeacon) {
    const blob = new Blob([jsonData], { type: 'text/plain' });
    const sent = navigator.sendBeacon(config.apiEndpoint, blob);

    if (sent) {
      console.log('Data sent via sendBeacon');
      return {
        success: true,
        message: 'Data submitted successfully',
        submissionId: `beacon_${Date.now()}`,
      };
    }
    console.warn('sendBeacon returned false, trying fetch...');
  }

  // Fallback to fetch with no-cors (for Google Apps Script)
  try {
    await fetch(config.apiEndpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: jsonData,
    });

    console.log('Data sent via fetch (no-cors)');
    return {
      success: true,
      message: 'Data submitted successfully',
      submissionId: `fetch_${Date.now()}`,
    };
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}
