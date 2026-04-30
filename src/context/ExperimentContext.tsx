import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import type {
  ExperimentState,
  ScreenType,
  ScreeningResponses,
  CodeScreenerResponses,
  DemographicResponses,
  TrialData,
  PostSurveyResponses,
  SessionTracking,
} from '../types';
import { stimuli, practiceStimulus } from '../data/stimuli';
import { initializeRandomization } from '../utils/randomization';
import { getProlificParams } from '../config';
import { submitExperimentData } from '../services/dataSubmission';
import { calculateTotalBonus } from '../utils/bonusCalculation';

type Action =
  | { type: 'SET_PARTICIPANT_ID'; payload: string }
  | { type: 'SET_SCREEN'; payload: ScreenType }
  | { type: 'SET_SCREENING_RESPONSES'; payload: ScreeningResponses }
  | { type: 'SET_CODE_SCREENER_RESPONSES'; payload: CodeScreenerResponses }
  | { type: 'SET_DEMOGRAPHIC_RESPONSES'; payload: DemographicResponses }
  | { type: 'ADD_TRIAL_DATA'; payload: TrialData }
  | { type: 'SET_PRACTICE_DATA'; payload: TrialData }
  | { type: 'NEXT_TRIAL' }
  | { type: 'NEXT_TRIAL_PHASE' }
  | { type: 'SET_POST_SURVEY_RESPONSES'; payload: PostSurveyResponses }
  | { type: 'UPDATE_SESSION_TRACKING'; payload: Partial<SessionTracking> }
  | { type: 'RESTORE_STATE'; payload: ExperimentState }
  | { type: 'CLEAR_SAVED_STATE' };

const STORAGE_KEY = 'code_detection_experiment_state';

function createInitialSessionTracking(): SessionTracking {
  const { prolificPid, studyId, sessionId } = getProlificParams();
  return {
    prolificPid,
    studyId,
    sessionId,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    screenWidth: typeof window !== 'undefined' ? window.screen.width : 0,
    screenHeight: typeof window !== 'undefined' ? window.screen.height : 0,
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    windowHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: typeof navigator !== 'undefined' ? navigator.language : '',
    platform: typeof navigator !== 'undefined' ? navigator.platform : '',
    sessionStart: Date.now(),
    sessionEnd: null,
    totalDuration: null,
    pageTimings: [],
    focusEvents: [],
    totalTimeAway: 0,
    blurCount: 0,
    mouseActivity: {
      totalMoves: 0,
      totalClicks: 0,
      clickPositions: [],
      lastMoveTime: null,
    },
    windowResizes: [],
    rapidResponses: 0,
  };
}

const initialState: ExperimentState = {
  participantId: null,
  startTime: new Date().toISOString(),
  conditionAssignments: {},
  questionOrderAssignments: {},
  stimulusOrder: [],
  currentScreen: 'welcome',
  currentTrialIndex: 0,
  currentTrialPhase: 'question1',
  screeningResponses: { hasCodedRecently: null },
  codeScreenerResponses: { answers: {}, correctCount: 0, passed: false },
  demographicResponses: {
    yearsExperience: '',
    primaryLanguages: [],
    aiToolUsage: '',
    github: { hasGitHub: null, githubUrl: '' },
  },
  trialData: [],
  practiceData: null,
  postSurveyResponses: { detectionCues: '', studyFeedback: '' },
  sessionTracking: createInitialSessionTracking(),
};

function experimentReducer(state: ExperimentState, action: Action): ExperimentState {
  switch (action.type) {
    case 'SET_PARTICIPANT_ID':
      return { ...state, participantId: action.payload };
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.payload };
    case 'SET_SCREENING_RESPONSES':
      return { ...state, screeningResponses: action.payload };
    case 'SET_CODE_SCREENER_RESPONSES':
      return { ...state, codeScreenerResponses: action.payload };
    case 'SET_DEMOGRAPHIC_RESPONSES':
      return { ...state, demographicResponses: action.payload };
    case 'ADD_TRIAL_DATA':
      return { ...state, trialData: [...state.trialData, action.payload] };
    case 'SET_PRACTICE_DATA':
      return { ...state, practiceData: action.payload };
    case 'NEXT_TRIAL':
      return { ...state, currentTrialIndex: state.currentTrialIndex + 1, currentTrialPhase: 'question1' };
    case 'NEXT_TRIAL_PHASE':
      return {
        ...state,
        currentTrialPhase: state.currentTrialPhase === 'question1' ? 'question2' : 'question3',
      };
    case 'SET_POST_SURVEY_RESPONSES':
      return { ...state, postSurveyResponses: action.payload };
    case 'UPDATE_SESSION_TRACKING':
      return {
        ...state,
        sessionTracking: { ...state.sessionTracking, ...action.payload },
      };
    case 'RESTORE_STATE':
      return action.payload;
    case 'CLEAR_SAVED_STATE':
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        // Ignore storage errors
      }
      return state;
    default:
      return state;
  }
}

interface ExperimentContextType {
  state: ExperimentState;
  dispatch: React.Dispatch<Action>;
  getCurrentStimulus: () => { id: string; context: string; code: string; condition: 'human' | 'ai' } | null;
  getPracticeStimulus: () => { id: string; context: string; code: string; condition: 'human' | 'ai' };
  recordPageEnter: (screen: ScreenType) => void;
  finalizeSessionTracking: () => SessionTracking;
  clearSavedState: () => void;
  hasSavedState: boolean;
  submitPartialData: () => Promise<void>;
}

// Helper functions for localStorage
function saveStateToStorage(state: ExperimentState): void {
  try {
    // Don't save if on completion screen (already submitted)
    if (state.currentScreen === 'completion') return;

    const { sessionTracking: _st, ...stateWithoutTracking } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithoutTracking));
    console.log('[Storage] State saved to localStorage');
  } catch (e) {
    console.warn('[Storage] Failed to save state:', e);
  }
}

function loadStateFromStorage(): ExperimentState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log('[Storage] Found saved state, screen:', parsed.currentScreen);
      return parsed;
    }
  } catch (e) {
    console.warn('[Storage] Failed to load state:', e);
  }
  return null;
}

function clearStateFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[Storage] Cleared saved state');
  } catch (e) {
    console.warn('[Storage] Failed to clear state:', e);
  }
}

const ExperimentContext = createContext<ExperimentContextType | null>(null);

export function ExperimentProvider({ children }: { children: ReactNode }) {
  const [hasSavedState, setHasSavedState] = React.useState(() => {
    return loadStateFromStorage() !== null;
  });

  const [state, dispatch] = useReducer(experimentReducer, initialState, (initial) => {
    // Check for saved state first
    const savedState = loadStateFromStorage();
    if (savedState) {
      console.log('[Init] Restoring saved state from localStorage');
      // Restore session tracking with fresh values
      return {
        ...savedState,
        sessionTracking: {
          ...createInitialSessionTracking(),
          // Preserve some important tracking data if available
          ...(savedState.sessionTracking ? {
            sessionStart: savedState.sessionTracking.sessionStart,
            pageTimings: savedState.sessionTracking.pageTimings || [],
          } : {}),
        },
      };
    }

    // Initialize randomization on first load
    const stimulusIds = stimuli.map((s) => s.id);
    const { order, conditions, questionOrders } = initializeRandomization(stimulusIds);
    return {
      ...initial,
      stimulusOrder: order,
      conditionAssignments: conditions,
      questionOrderAssignments: questionOrders,
      sessionTracking: createInitialSessionTracking(),
    };
  });

  const lastBlurTime = useRef<number | null>(null);

  // Auto-save state to localStorage whenever important data changes
  useEffect(() => {
    // Save after any meaningful state change (not just session tracking updates)
    if (state.currentScreen !== 'welcome') {
      saveStateToStorage(state);
    }
  }, [
    state.currentScreen,
    state.participantId,
    state.screeningResponses,
    state.codeScreenerResponses,
    state.demographicResponses,
    state.trialData,
    state.practiceData,
    state.postSurveyResponses,
    state.currentTrialIndex,
    state.currentTrialPhase,
  ]);

  // Clear saved state function
  const clearSavedState = useCallback(() => {
    clearStateFromStorage();
    setHasSavedState(false);
  }, []);

  // Submit partial data to Google Sheets (called after each trial)
  const submitPartialData = useCallback(async () => {
    // Only submit if we have trial data
    if (state.trialData.length === 0) {
      console.log('[PartialSubmit] No trial data to submit yet');
      return;
    }

    const now = Date.now();
    const bonus = calculateTotalBonus(state.trialData);

    const partialData = {
      participantId: state.participantId || 'unknown',
      startTime: state.startTime,
      endTime: new Date().toISOString(),
      screeningResponses: state.screeningResponses,
      codeScreenerResponses: state.codeScreenerResponses,
      demographicResponses: state.demographicResponses,
      trialData: state.trialData,
      practiceData: state.practiceData,
      postSurveyResponses: state.postSurveyResponses,
      sessionTracking: {
        ...state.sessionTracking,
        sessionEnd: now,
        totalDuration: now - state.sessionTracking.sessionStart,
      },
      bonusInfo: {
        totalBonus: bonus.totalBonus,
        totalScore: bonus.totalScore,
        maxPossibleScore: bonus.maxPossibleScore,
      },
      submissionType: 'partial' as const,
      trialsCompleted: state.trialData.length,
    };

    try {
      console.log(`[PartialSubmit] Submitting partial data (${state.trialData.length} trials completed)`);
      await submitExperimentData(partialData);
      console.log('[PartialSubmit] Partial data submitted successfully');
    } catch (error) {
      console.warn('[PartialSubmit] Failed to submit partial data:', error);
      // Don't throw - partial submission failure shouldn't break the experiment
    }
  }, [state.participantId, state.startTime, state.screeningResponses, state.codeScreenerResponses, state.demographicResponses, state.trialData, state.practiceData, state.postSurveyResponses, state.sessionTracking]);

  // Track focus/blur events globally
  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now();
      let timeAway: number | undefined;

      if (lastBlurTime.current !== null) {
        timeAway = now - lastBlurTime.current;
        dispatch({
          type: 'UPDATE_SESSION_TRACKING',
          payload: {
            totalTimeAway: state.sessionTracking.totalTimeAway + timeAway,
            focusEvents: [
              ...state.sessionTracking.focusEvents,
              { timestamp: now, type: 'focus' as const, timeAwayMs: timeAway },
            ],
          },
        });
      } else {
        dispatch({
          type: 'UPDATE_SESSION_TRACKING',
          payload: {
            focusEvents: [
              ...state.sessionTracking.focusEvents,
              { timestamp: now, type: 'focus' as const },
            ],
          },
        });
      }
      lastBlurTime.current = null;
    };

    const handleBlur = () => {
      const now = Date.now();
      lastBlurTime.current = now;
      dispatch({
        type: 'UPDATE_SESSION_TRACKING',
        payload: {
          blurCount: state.sessionTracking.blurCount + 1,
          focusEvents: [
            ...state.sessionTracking.focusEvents,
            { timestamp: now, type: 'blur' as const },
          ],
        },
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Record the beforeunload event
      const updatedFocusEvents = [
        ...state.sessionTracking.focusEvents,
        { timestamp: Date.now(), type: 'beforeunload' as const },
      ];

      // Try to save to localStorage
      try {
        localStorage.setItem('session_tracking_backup', JSON.stringify({
          ...state.sessionTracking,
          focusEvents: updatedFocusEvents,
        }));
      } catch (err) {
        // Ignore
      }

      if (state.currentScreen !== 'welcome' && state.currentScreen !== 'completion') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    // Mouse tracking
    let mouseMovesCount = 0;
    let mouseMoveTimeout: number | null = null;

    const handleMouseMove = () => {
      mouseMovesCount++;
      if (mouseMoveTimeout === null) {
        mouseMoveTimeout = window.setTimeout(() => {
          dispatch({
            type: 'UPDATE_SESSION_TRACKING',
            payload: {
              mouseActivity: {
                ...state.sessionTracking.mouseActivity,
                totalMoves: state.sessionTracking.mouseActivity.totalMoves + mouseMovesCount,
                lastMoveTime: Date.now(),
              },
            },
          });
          mouseMovesCount = 0;
          mouseMoveTimeout = null;
        }, 1000); // Batch every second
      }
    };

    const handleClick = (e: MouseEvent) => {
      const newClickPositions = state.sessionTracking.mouseActivity.clickPositions.length < 100
        ? [...state.sessionTracking.mouseActivity.clickPositions, { x: e.clientX, y: e.clientY, timestamp: Date.now() }]
        : state.sessionTracking.mouseActivity.clickPositions;

      dispatch({
        type: 'UPDATE_SESSION_TRACKING',
        payload: {
          mouseActivity: {
            ...state.sessionTracking.mouseActivity,
            totalClicks: state.sessionTracking.mouseActivity.totalClicks + 1,
            clickPositions: newClickPositions,
          },
        },
      });
    };

    const handleResize = () => {
      dispatch({
        type: 'UPDATE_SESSION_TRACKING',
        payload: {
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          windowResizes: [
            ...state.sessionTracking.windowResizes,
            { timestamp: Date.now(), width: window.innerWidth, height: window.innerHeight },
          ],
        },
      });
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
    };
  }, [state.currentScreen, state.sessionTracking]);

  const getCurrentStimulus = () => {
    if (state.currentTrialIndex >= state.stimulusOrder.length) return null;
    const stimulusId = state.stimulusOrder[state.currentTrialIndex];
    const stimulus = stimuli.find((s) => s.id === stimulusId);
    if (!stimulus) return null;
    const condition = state.conditionAssignments[stimulusId];
    const code = condition === 'human' ? stimulus.humanCode : stimulus.aiCode;
    return { id: stimulus.id, context: stimulus.context, code, condition };
  };

  const getPracticeStimulus = () => {
    const condition: 'human' | 'ai' = Math.random() < 0.5 ? 'human' : 'ai';
    const code = condition === 'human' ? practiceStimulus.humanCode : practiceStimulus.aiCode;
    return { id: practiceStimulus.id, context: practiceStimulus.context, code, condition };
  };

  // Record when entering a new page/screen
  const recordPageEnter = useCallback((screen: ScreenType) => {
    const now = Date.now();
    const pageTimings = [...state.sessionTracking.pageTimings];

    // Close out previous page if exists
    if (pageTimings.length > 0) {
      const lastPage = pageTimings[pageTimings.length - 1];
      if (lastPage.exitTime === null) {
        lastPage.exitTime = now;
        lastPage.duration = now - lastPage.enterTime;
      }
    }

    // Add new page
    pageTimings.push({
      screen,
      enterTime: now,
      exitTime: null,
      duration: null,
    });

    dispatch({
      type: 'UPDATE_SESSION_TRACKING',
      payload: { pageTimings },
    });
  }, [state.sessionTracking.pageTimings]);

  // Finalize session tracking for submission
  const finalizeSessionTracking = useCallback((): SessionTracking => {
    const now = Date.now();
    const pageTimings = [...state.sessionTracking.pageTimings];

    // Close out last page
    if (pageTimings.length > 0) {
      const lastPage = pageTimings[pageTimings.length - 1];
      if (lastPage.exitTime === null) {
        lastPage.exitTime = now;
        lastPage.duration = now - lastPage.enterTime;
      }
    }

    return {
      ...state.sessionTracking,
      sessionEnd: now,
      totalDuration: now - state.sessionTracking.sessionStart,
      pageTimings,
    };
  }, [state.sessionTracking]);

  return (
    <ExperimentContext.Provider value={{ state, dispatch, getCurrentStimulus, getPracticeStimulus, recordPageEnter, finalizeSessionTracking, clearSavedState, hasSavedState, submitPartialData }}>
      {children}
    </ExperimentContext.Provider>
  );
}

export function useExperiment() {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error('useExperiment must be used within an ExperimentProvider');
  }
  return context;
}
