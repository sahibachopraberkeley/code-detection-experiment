import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
  ExperimentState,
  ScreenType,
  ScreeningResponses,
  DemographicResponses,
  TrialData,
  PostSurveyResponses,
} from '../types';
import { stimuli, practiceStimulus } from '../data/stimuli';
import { initializeRandomization } from '../utils/randomization';

type Action =
  | { type: 'SET_PARTICIPANT_ID'; payload: string }
  | { type: 'SET_SCREEN'; payload: ScreenType }
  | { type: 'SET_SCREENING_RESPONSES'; payload: ScreeningResponses }
  | { type: 'SET_DEMOGRAPHIC_RESPONSES'; payload: DemographicResponses }
  | { type: 'ADD_TRIAL_DATA'; payload: TrialData }
  | { type: 'SET_PRACTICE_DATA'; payload: TrialData }
  | { type: 'NEXT_TRIAL' }
  | { type: 'NEXT_TRIAL_PHASE' }
  | { type: 'SET_POST_SURVEY_RESPONSES'; payload: PostSurveyResponses };

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
  demographicResponses: {
    yearsExperience: '',
    primaryLanguages: [],
    aiToolUsage: '',
  },
  trialData: [],
  practiceData: null,
  postSurveyResponses: { detectionCues: '' },
};

function experimentReducer(state: ExperimentState, action: Action): ExperimentState {
  switch (action.type) {
    case 'SET_PARTICIPANT_ID':
      return { ...state, participantId: action.payload };
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.payload };
    case 'SET_SCREENING_RESPONSES':
      return { ...state, screeningResponses: action.payload };
    case 'SET_DEMOGRAPHIC_RESPONSES':
      return { ...state, demographicResponses: action.payload };
    case 'ADD_TRIAL_DATA':
      return { ...state, trialData: [...state.trialData, action.payload] };
    case 'SET_PRACTICE_DATA':
      return { ...state, practiceData: action.payload };
    case 'NEXT_TRIAL':
      return { ...state, currentTrialIndex: state.currentTrialIndex + 1, currentTrialPhase: 'question1' };
    case 'NEXT_TRIAL_PHASE':
      return { ...state, currentTrialPhase: 'question2' };
    case 'SET_POST_SURVEY_RESPONSES':
      return { ...state, postSurveyResponses: action.payload };
    default:
      return state;
  }
}

interface ExperimentContextType {
  state: ExperimentState;
  dispatch: React.Dispatch<Action>;
  getCurrentStimulus: () => { id: string; context: string; code: string; condition: 'human' | 'ai' } | null;
  getPracticeStimulus: () => { id: string; context: string; code: string; condition: 'human' | 'ai' };
}

const ExperimentContext = createContext<ExperimentContextType | null>(null);

export function ExperimentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(experimentReducer, initialState, (initial) => {
    // Initialize randomization on first load
    const stimulusIds = stimuli.map((s) => s.id);
    const { order, conditions, questionOrders } = initializeRandomization(stimulusIds);
    return {
      ...initial,
      stimulusOrder: order,
      conditionAssignments: conditions,
      questionOrderAssignments: questionOrders,
    };
  });

  // Warn before leaving mid-experiment
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.currentScreen !== 'welcome' && state.currentScreen !== 'completion') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.currentScreen]);

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

  return (
    <ExperimentContext.Provider value={{ state, dispatch, getCurrentStimulus, getPracticeStimulus }}>
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
