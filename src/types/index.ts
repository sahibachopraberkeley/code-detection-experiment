export interface BehaviorLog {
  visibilityChanges: Array<{ timestamp: number; isVisible: boolean }>;
  scrollEvents: Array<{ timestamp: number; scrollTop: number; scrollHeight: number }>;
  copyAttempts: Array<{ timestamp: number; selectedText: string }>;
  responseChanges: Array<{
    timestamp: number;
    field: 'aiDetection' | 'aiConfidence' | 'effort' | 'effortConfidence';
    oldValue: string | number | null;
    newValue: string | number;
  }>;
  stimulusViewStart: number;
  stimulusViewEnd: number;
  timeToFirstInteraction: number | null;
}

export interface TrialResponses {
  aiDetection: 'yes' | 'no' | 'unsure' | null;
  aiConfidence: number | null; // 1-5
  effortEstimate: number; // 1-10
  effortConfidence: number | null; // 1-5
}

export interface TrialData {
  stimulusId: string;
  condition: 'human' | 'ai';
  presentationOrder: number;
  questionOrder: 'ai-first' | 'effort-first'; // Which question was shown first
  responses: {
    aiDetection: 'yes' | 'no' | 'unsure';
    aiConfidence: number;
    effortEstimate: number;
    effortConfidence: number;
  };
  behaviorLog: BehaviorLog;
}

export interface ScreeningResponses {
  hasCodedRecently: boolean | null;
}

export interface DemographicResponses {
  yearsExperience: string;
  primaryLanguages: string[];
  aiToolUsage: string;
}

export interface PostSurveyResponses {
  detectionCues: string;
}

export type ScreenType =
  | 'welcome'
  | 'screening'
  | 'demographics'
  | 'practice'
  | 'practice-feedback'
  | 'trial'
  | 'postsurvey'
  | 'completion';

export interface ExperimentState {
  participantId: string | null;
  startTime: string;

  // Randomization (set once at start)
  conditionAssignments: Record<string, 'human' | 'ai'>;
  questionOrderAssignments: Record<string, 'ai-first' | 'effort-first'>; // Per-stimulus question order
  stimulusOrder: string[];

  // Progress
  currentScreen: ScreenType;
  currentTrialIndex: number;
  currentTrialPhase: 'question1' | 'question2'; // Which question page within a trial

  // Collected data
  screeningResponses: ScreeningResponses;
  demographicResponses: DemographicResponses;
  trialData: TrialData[];
  practiceData: TrialData | null;
  postSurveyResponses: PostSurveyResponses;
}

export interface ExperimentData {
  participantId: string;
  startTime: string;
  endTime: string;
  screeningResponses: ScreeningResponses;
  demographicResponses: DemographicResponses;
  trialData: TrialData[];
  practiceData: TrialData | null;
  postSurveyResponses: PostSurveyResponses;
}
