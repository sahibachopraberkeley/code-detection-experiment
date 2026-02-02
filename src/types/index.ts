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

// Track time spent on each page/screen
export interface PageTiming {
  screen: ScreenType;
  enterTime: number;
  exitTime: number | null;
  duration: number | null; // in milliseconds
}

// Track window focus/blur events globally
export interface FocusEvent {
  timestamp: number;
  type: 'focus' | 'blur' | 'beforeunload';
  timeAwayMs?: number; // How long they were away (for blur->focus pairs)
}

// Mouse activity tracking for bot detection
export interface MouseActivity {
  totalMoves: number;
  totalClicks: number;
  clickPositions: Array<{ x: number; y: number; timestamp: number }>;
  lastMoveTime: number | null;
}

// Comprehensive session tracking for quality/bot detection
export interface SessionTracking {
  // Prolific metadata
  prolificPid: string | null;
  studyId: string | null;
  sessionId: string | null;

  // Device/browser info
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  timezone: string;
  language: string;
  platform: string;

  // Session timing
  sessionStart: number;
  sessionEnd: number | null;
  totalDuration: number | null;

  // Page timings
  pageTimings: PageTiming[];

  // Focus/attention tracking
  focusEvents: FocusEvent[];
  totalTimeAway: number; // Total time window was not focused
  blurCount: number; // How many times they left the window

  // Mouse activity (bot detection)
  mouseActivity: MouseActivity;

  // Quality signals
  windowResizes: Array<{ timestamp: number; width: number; height: number }>;
  rapidResponses: number; // Count of responses made in < 1 second
}

export interface TrialResponses {
  aiDetection: 'yes' | 'no' | null;
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
    aiDetection: 'yes' | 'no';
    aiConfidence: number;
    effortEstimate: number;
    effortConfidence: number;
  };
  behaviorLog: BehaviorLog;
}

export interface ScreeningResponses {
  hasCodedRecently: boolean | null;
}

export interface CodeScreenerResponses {
  answers: Record<string, string>; // questionId -> selected answer
  correctCount: number;
  passed: boolean;
}

export interface GitHubInfo {
  hasGitHub: boolean | null;
  githubUrl: string;
}

export interface DemographicResponses {
  yearsExperience: string;
  primaryLanguages: string[];
  aiToolUsage: string;
  github: GitHubInfo;
}

export interface PostSurveyResponses {
  detectionCues: string;
}

export type ScreenType =
  | 'welcome'
  | 'screening'
  | 'code-screener'
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
  codeScreenerResponses: CodeScreenerResponses;
  demographicResponses: DemographicResponses;
  trialData: TrialData[];
  practiceData: TrialData | null;
  postSurveyResponses: PostSurveyResponses;
  sessionTracking: SessionTracking;
}

export interface BonusInfo {
  totalBonus: number;
  totalScore: number;
  maxPossibleScore: number;
}

export interface ExperimentData {
  participantId: string;
  startTime: string;
  endTime: string;
  screeningResponses: ScreeningResponses;
  codeScreenerResponses: CodeScreenerResponses;
  demographicResponses: DemographicResponses;
  trialData: TrialData[];
  practiceData: TrialData | null;
  postSurveyResponses: PostSurveyResponses;
  sessionTracking: SessionTracking;
  bonusInfo: BonusInfo;
  submissionType: 'partial' | 'final';
  trialsCompleted: number; // How many trials completed at time of submission
}
