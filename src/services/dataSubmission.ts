import { createClient } from '@supabase/supabase-js';
import type { ExperimentData } from '../types';
import { config } from '../config';

export type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface SubmissionResult {
  success: boolean;
  message: string;
  submissionId?: string;
}

// Initialize Supabase client
const supabase = config.supabaseUrl && config.supabaseKey
  ? createClient(config.supabaseUrl, config.supabaseKey)
  : null;

/**
 * Submit experiment data to Supabase
 */
export async function submitExperimentData(data: ExperimentData): Promise<SubmissionResult> {
  console.log('[Submission] Starting submission...');
  console.log('[Submission] Type:', data?.submissionType || 'unknown');
  console.log('[Submission] Trials completed:', data?.trialsCompleted || 0);
  console.log('[Submission] Data received:', data ? 'yes' : 'no');

  // Check if Supabase is configured
  if (!supabase) {
    console.error('Supabase not configured');
    throw new Error('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_KEY.');
  }

  // Extract key fields for separate columns (for easier querying)
  // Store the full data in raw_data as backup
  const submissionData = {
    participant_id: data.participantId,
    submission_id: `${data.participantId}_${Date.now()}`,
    passed_screener: data.codeScreenerResponses?.passed || false,
    years_experience: data.demographicResponses?.yearsExperience || null,
    ai_tool_usage: data.demographicResponses?.aiToolUsage || null,
    trial_data: data.trialData?.map(t => ({
      stimulusId: t.stimulusId,
      condition: t.condition,
      presentationOrder: t.presentationOrder,
      questionOrder: t.questionOrder,
      responses: t.responses,
    })) || [],
    demographic_responses: data.demographicResponses || {},
    post_survey_responses: data.postSurveyResponses || {},
    raw_data: {
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
    },
  };

  console.log('Submitting to Supabase...');
  console.log('Data size:', JSON.stringify(submissionData).length, 'bytes');

  try {
    const { data: result, error } = await supabase
      .from('responses')
      .insert([submissionData])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    console.log('Data submitted successfully, ID:', result?.id);
    return {
      success: true,
      message: 'Data submitted successfully',
      submissionId: result?.id || `supabase_${Date.now()}`,
    };
  } catch (error) {
    console.error('Submission failed:', error);
    throw error;
  }
}
