import { useEffect } from 'react';
import { ExperimentProvider, useExperiment } from './context/ExperimentContext';
import { MobileBlocker } from './components/MobileBlocker';
import { WelcomeScreen } from './components/screens/WelcomeScreen';
import { ScreeningScreen } from './components/screens/ScreeningScreen';
import { DemographicsScreen } from './components/screens/DemographicsScreen';
import { PracticeScreen, PracticeFeedbackScreen } from './components/screens/PracticeScreen';
import { TrialScreen } from './components/screens/TrialScreen';
import { PostSurveyScreen } from './components/screens/PostSurveyScreen';
import { CompletionScreen } from './components/screens/CompletionScreen';

function ExperimentRouter() {
  const { state, recordPageEnter } = useExperiment();

  // Track page timing whenever screen changes
  useEffect(() => {
    recordPageEnter(state.currentScreen);
  }, [state.currentScreen, recordPageEnter]);

  const renderScreen = () => {
    switch (state.currentScreen) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'screening':
        return <ScreeningScreen />;
      case 'demographics':
        return <DemographicsScreen />;
      case 'practice':
        return <PracticeScreen />;
      case 'practice-feedback':
        return <PracticeFeedbackScreen />;
      case 'trial':
        return <TrialScreen />;
      case 'postsurvey':
        return <PostSurveyScreen />;
      case 'completion':
        return <CompletionScreen />;
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">{renderScreen()}</div>
    </div>
  );
}

function App() {
  return (
    <MobileBlocker>
      <ExperimentProvider>
        <ExperimentRouter />
      </ExperimentProvider>
    </MobileBlocker>
  );
}

export default App;
