import type { ExperimentData } from '../types';
import { config } from '../config';

export type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface SubmissionResult {
  success: boolean;
  message: string;
  submissionId?: string;
}

// API Configuration
const API_CONFIG = {
  endpoint: import.meta.env.VITE_API_ENDPOINT || '/api/submit',
  apiKey: import.meta.env.VITE_API_KEY || '',
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  baseDelay: 1000, // 1 second base delay for exponential backoff
};

// Max events to keep per array in behaviorLog (keeps payload under size limits)
const MAX_SCROLL_EVENTS = 100;
const MAX_RESPONSE_CHANGES = 200;

/**
 * Trim behaviorLog arrays to prevent oversized payloads.
 * Keeps first and last N events, adds summary counts.
 */
function trimBehaviorLog(log: Record<string, unknown>): Record<string, unknown> {
  const trimmed = { ...log } as Record<string, unknown>;
  const scrollEvents = log.scrollEvents as unknown[] | undefined;
  if (scrollEvents && scrollEvents.length > MAX_SCROLL_EVENTS) {
    trimmed._scrollEventCount = scrollEvents.length;
    trimmed.scrollEvents = scrollEvents.slice(-MAX_SCROLL_EVENTS);
  }
  const responseChanges = log.responseChanges as unknown[] | undefined;
  if (responseChanges && responseChanges.length > MAX_RESPONSE_CHANGES) {
    trimmed._responseChangeCount = responseChanges.length;
    trimmed.responseChanges = responseChanges.slice(-MAX_RESPONSE_CHANGES);
  }
  return trimmed;
}

/**
 * Trim session tracking arrays to prevent oversized payloads.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function trimSessionTracking(tracking: any): Record<string, unknown> {
  const trimmed = { ...tracking } as Record<string, unknown>;
  const focusEvents = tracking.focusEvents as unknown[] | undefined;
  if (focusEvents && focusEvents.length > 200) {
    trimmed._focusEventCount = focusEvents.length;
    trimmed.focusEvents = focusEvents.slice(-200);
  }
  return trimmed;
}

// Queue for failed submissions (stored in localStorage)
const QUEUE_KEY = 'experiment_submission_queue';

interface QueuedSubmission {
  id: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number): number {
  return API_CONFIG.baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
}

/**
 * Get queued submissions from localStorage
 */
function getQueuedSubmissions(): QueuedSubmission[] {
  try {
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

/**
 * Save submission to queue for later retry
 */
function queueFailedSubmission(data: Record<string, unknown>): void {
  try {
    const queue = getQueuedSubmissions();
    queue.push({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log('[Submission] Queued failed submission for later retry');
  } catch (error) {
    console.error('[Submission] Failed to queue submission:', error);
  }
}

/**
 * Remove submission from queue
 */
function removeFromQueue(id: string): void {
  try {
    const queue = getQueuedSubmissions();
    const filtered = queue.filter(item => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[Submission] Failed to remove from queue:', error);
  }
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Submit data to S3 via API Gateway with retry logic
 */
async function submitToAPI(data: Record<string, unknown>): Promise<SubmissionResult> {
  if (!API_CONFIG.endpoint) {
    throw new Error('API endpoint not configured. Please set VITE_API_ENDPOINT.');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < API_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`[Submission] Attempt ${attempt + 1}/${API_CONFIG.maxRetries}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const response = await fetchWithTimeout(
        API_CONFIG.endpoint,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        },
        API_CONFIG.timeout
      );

      if (response.ok) {
        const result = await response.json();
        console.log('[Submission] Success:', result);
        return {
          success: true,
          message: 'Data submitted successfully',
          submissionId: result.submissionId || `s3_${Date.now()}`,
        };
      }

      // Handle specific error codes
      if (response.status === 400) {
        // Bad request - don't retry
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Bad request: ${errorData.error || response.statusText}`);
      }

      if (response.status === 403) {
        throw new Error('API key invalid or missing');
      }

      // For 5xx errors, retry
      if (response.status >= 500) {
        lastError = new Error(`Server error: ${response.status}`);
        console.warn(`[Submission] Server error, will retry:`, response.status);
      } else {
        throw new Error(`HTTP error: ${response.status}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[Submission] Request timed out');
        lastError = new Error('Request timed out');
      } else {
        console.warn(`[Submission] Attempt ${attempt + 1} failed:`, lastError.message);
      }
    }

    // Wait before retry (except on last attempt)
    if (attempt < API_CONFIG.maxRetries - 1) {
      const delay = calculateBackoff(attempt);
      console.log(`[Submission] Waiting ${Math.round(delay)}ms before retry...`);
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Submit experiment data to S3 via API Gateway
 */
export async function submitExperimentData(data: ExperimentData): Promise<SubmissionResult> {
  console.log('[Submission] Starting submission...');
  console.log('[Submission] Type:', data?.submissionType || 'unknown');
  console.log('[Submission] Trials completed:', data?.trialsCompleted || 0);
  console.log('[Submission] Data received:', data ? 'yes' : 'no');

  // Prepare submission data
  const submissionData = {
    participantId: data.participantId,
    submissionId: `${data.participantId}_${Date.now()}`,
    submissionType: data.submissionType || 'unknown',
    passedScreener: data.codeScreenerResponses?.passed || false,
    trialsCompleted: data.trialsCompleted || 0,
    yearsExperience: data.demographicResponses?.yearsExperience || null,
    aiToolUsage: data.demographicResponses?.aiToolUsage || null,
    trialData: data.trialData?.map(t => ({
      stimulusId: t.stimulusId,
      condition: t.condition,
      presentationOrder: t.presentationOrder,
      questionOrder: t.questionOrder,
      buttonOrder: t.buttonOrder,
      responses: t.responses,
      behaviorLog: trimBehaviorLog(t.behaviorLog as unknown as Record<string, unknown>),
    })) || [],
    practiceData: data.practiceData ? {
      stimulusId: data.practiceData.stimulusId,
      condition: data.practiceData.condition,
      buttonOrder: data.practiceData.buttonOrder,
      responses: data.practiceData.responses,
    } : null,
    demographicResponses: data.demographicResponses || {},
    postSurveyResponses: data.postSurveyResponses || {},
    screeningResponses: data.screeningResponses || {},
    codeScreenerResponses: data.codeScreenerResponses || {},
    sessionTracking: trimSessionTracking(data.sessionTracking || {} as object),
    bonusInfo: data.bonusInfo || {},
    startTime: data.startTime,
    endTime: data.endTime,
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

  console.log('[Submission] Data size:', JSON.stringify(submissionData).length, 'bytes');

  try {
    const result = await submitToAPI(submissionData);
    return result;
  } catch (error) {
    console.error('[Submission] Failed after retries:', error);

    // Queue for later retry
    queueFailedSubmission(submissionData);

    throw error;
  }
}

/**
 * Retry queued submissions (call this on app load or periodically)
 */
export async function retryQueuedSubmissions(): Promise<void> {
  const queue = getQueuedSubmissions();
  if (queue.length === 0) return;

  console.log(`[Submission] Found ${queue.length} queued submissions to retry`);

  for (const item of queue) {
    // Skip if too many retries
    if (item.retryCount >= 5) {
      console.warn(`[Submission] Abandoning submission ${item.id} after 5 retries`);
      removeFromQueue(item.id);
      continue;
    }

    try {
      await submitToAPI(item.data);
      removeFromQueue(item.id);
      console.log(`[Submission] Successfully retried queued submission ${item.id}`);
    } catch {
      // Update retry count
      const queue = getQueuedSubmissions();
      const updatedQueue = queue.map(q =>
        q.id === item.id ? { ...q, retryCount: q.retryCount + 1 } : q
      );
      localStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
    }
  }
}

/**
 * Get count of queued submissions
 */
export function getQueuedSubmissionCount(): number {
  return getQueuedSubmissions().length;
}
