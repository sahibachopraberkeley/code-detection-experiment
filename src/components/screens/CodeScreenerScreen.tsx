import { useState } from 'react';
import { useExperiment } from '../../context/ExperimentContext';

interface ScreenerQuestion {
  id: string;
  code: string;
  question: string;
  options: { value: string; label: string }[];
  correctAnswer: string;
}

const screenerQuestions: ScreenerQuestion[] = [
  {
    id: 'commented-assignment',
    code: `count = 0
# count = count + 5
count += 1
// count = 10
print(count)`,
    question: 'What is the final value of count?',
    options: [
      { value: 'A', label: '0' },
      { value: 'B', label: '1' },
      { value: 'C', label: '11' },
      { value: 'D', label: '16' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 'reference-trap',
    code: `listA = [1, 2, 3]
listB = listA
listB.push(4)`,
    question: 'What is the length of listA now?',
    options: [
      { value: 'A', label: '3' },
      { value: 'B', label: '4' },
      { value: 'C', label: '7' },
      { value: 'D', label: 'Error' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 'infinite-loop',
    code: `for (int i = 10; i > 0; i++) {
    print("Hello");
    if (i > 100) break;
}`,
    question: 'How many times will "Hello" print?',
    options: [
      { value: 'A', label: '10' },
      { value: 'B', label: '91' },
      { value: 'C', label: '0' },
      { value: 'D', label: 'More than 91' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 'character-count',
    code: `username = "usr_dev_admin_99"`,
    question: 'What is username[6]?',
    options: [
      { value: 'A', label: 'd' },
      { value: 'B', label: 'v' },
      { value: 'C', label: 'e' },
      { value: 'D', label: '_' },
    ],
    correctAnswer: 'B',
  },
  {
    id: 'boolean-double-negative',
    code: `x = True
y = False
result = not(not x or y)`,
    question: 'What is result?',
    options: [
      { value: 'A', label: 'True' },
      { value: 'B', label: 'False' },
      { value: 'C', label: 'None' },
      { value: 'D', label: 'Error' },
    ],
    correctAnswer: 'A',
  },
];

const REQUIRED_CORRECT = 4;

export function CodeScreenerScreen() {
  const { dispatch } = useExperiment();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showDisqualified, setShowDisqualified] = useState(false);

  const allAnswered = screenerQuestions.every((q) => answers[q.id]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    if (!allAnswered) return;

    const correctCount = screenerQuestions.filter(
      (q) => answers[q.id] === q.correctAnswer
    ).length;

    const passed = correctCount >= REQUIRED_CORRECT;

    dispatch({
      type: 'SET_CODE_SCREENER_RESPONSES',
      payload: {
        answers,
        correctCount,
        passed,
      },
    });

    if (passed) {
      dispatch({ type: 'SET_SCREEN', payload: 'demographics' });
    } else {
      setShowDisqualified(true);
    }
  };

  if (showDisqualified) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Thank You</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your interest. Unfortunately, this study requires participants
          who can demonstrate programming knowledge. Based on your responses, you did not
          meet the required threshold.
        </p>
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Screenout Code</h2>
          <p className="text-3xl font-mono font-bold text-gray-600">CLS1F0CN</p>
        </div>
        <a
          href="https://app.prolific.com/submissions/complete?cc=CLS1F0CN"
          className="inline-block w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Return to Prolific
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Code Knowledge Check</h1>
      <p className="text-gray-600 mb-6">
        Please answer the following questions to verify your programming knowledge.
        You need to answer at least {REQUIRED_CORRECT} out of {screenerQuestions.length} correctly to continue.
      </p>

      <div className="space-y-8">
        {screenerQuestions.map((q, index) => (
          <div key={q.id} className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Question {index + 1} of {screenerQuestions.length}
            </h3>

            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto text-sm font-mono">
              {q.code}
            </pre>

            <p className="text-gray-800 font-medium mb-3">{q.question}</p>

            <div className="space-y-2">
              {q.options.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    answers[q.id] === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={option.value}
                    checked={answers[q.id] === option.value}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">
                    {option.value}) {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Submit Answers
        </button>
        {!allAnswered && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            Please answer all questions to continue
          </p>
        )}
      </div>
    </div>
  );
}
