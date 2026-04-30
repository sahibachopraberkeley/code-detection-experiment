import { useState } from 'react';
import { useExperiment } from '../../context/ExperimentContext';
import type { DemographicResponses } from '../../types';

const experienceOptions = ['Less than 1 year', '1-2 years', '2-4 years', '5-9 years', '10+ years'];

const languageOptions = [
  'Python',
  'JavaScript/TypeScript',
  'Java',
  'C/C++',
  'Go',
  'Rust',
  'Other',
];

const aiUsageOptions = [
  'Never',
  'Less than once a month',
  'About once a month',
  'A few times a month',
  'About once a week',
  'A few times a week',
  'About once a day',
  'Multiple times a day',
];

export function DemographicsScreen() {
  const { dispatch } = useExperiment();
  const [responses, setResponses] = useState<DemographicResponses>({
    yearsExperience: '',
    primaryLanguages: [],
    aiToolUsage: '',
    github: { hasGitHub: null, githubUrl: '' },
  });

  const handleLanguageToggle = (language: string) => {
    setResponses((prev) => ({
      ...prev,
      primaryLanguages: prev.primaryLanguages.includes(language)
        ? prev.primaryLanguages.filter((l) => l !== language)
        : [...prev.primaryLanguages, language],
    }));
  };

  const isValid =
    responses.yearsExperience &&
    responses.primaryLanguages.length > 0 &&
    responses.aiToolUsage &&
    responses.github.hasGitHub !== null;

  const handleContinue = () => {
    if (!isValid) return;
    dispatch({ type: 'SET_DEMOGRAPHIC_RESPONSES', payload: responses });
    dispatch({ type: 'SET_SCREEN', payload: 'practice' });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Background Questions</h1>

      <div className="space-y-8">
        {/* Years of Experience */}
        <div>
          <label className="block text-lg font-medium text-gray-900 mb-3">
            How many years of programming experience do you have?
          </label>
          <select
            value={responses.yearsExperience}
            onChange={(e) => setResponses((prev) => ({ ...prev, yearsExperience: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select...</option>
            {experienceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Primary Languages */}
        <div>
          <label className="block text-lg font-medium text-gray-900 mb-3">
            What programming languages do you primarily use? (Select all that apply)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {languageOptions.map((language) => (
              <label
                key={language}
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={responses.primaryLanguages.includes(language)}
                  onChange={() => handleLanguageToggle(language)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <span className="text-gray-700">{language}</span>
              </label>
            ))}
          </div>
        </div>

        {/* AI Tool Usage */}
        <div>
          <label className="block text-lg font-medium text-gray-900 mb-3">
            How often do you use AI coding tools (e.g., GitHub Copilot, ChatGPT for coding)?
          </label>
          <select
            value={responses.aiToolUsage}
            onChange={(e) => setResponses((prev) => ({ ...prev, aiToolUsage: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select...</option>
            {aiUsageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* GitHub Account */}
        <div>
          <label className="block text-lg font-medium text-gray-900 mb-3">
            Do you have a GitHub account?
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="hasGitHub"
                checked={responses.github.hasGitHub === true}
                onChange={() =>
                  setResponses((prev) => ({
                    ...prev,
                    github: { ...prev.github, hasGitHub: true },
                  }))
                }
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Yes</span>
            </label>
            <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="hasGitHub"
                checked={responses.github.hasGitHub === false}
                onChange={() =>
                  setResponses((prev) => ({
                    ...prev,
                    github: { hasGitHub: false, githubUrl: '' },
                  }))
                }
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">No</span>
            </label>
          </div>

        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={!isValid}
        className="w-full mt-8 py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
