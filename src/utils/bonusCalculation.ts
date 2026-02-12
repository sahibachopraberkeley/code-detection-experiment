import type { TrialData } from '../types';

/**
 * Simple per-correct-answer bonus calculation.
 *
 * Participants earn a fixed bonus for each correctly classified code snippet.
 * A response is correct when aiDetection matches the actual condition:
 *   - aiDetection === 'ai' and condition === 'ai'
 *   - aiDetection === 'human' and condition === 'human'
 */

// Bonus per correct answer in dollars
const BONUS_PER_CORRECT = 0.25;

/**
 * Check if a single trial response is correct.
 */
export function isTrialCorrect(trial: TrialData): boolean {
  return trial.responses.aiDetection === trial.condition;
}

/**
 * Calculate total bonus for all trials.
 */
export function calculateTotalBonus(trialData: TrialData[]): {
  totalBonus: number;
  totalScore: number;
  maxPossibleScore: number;
  correctCount: number;
  trialScores: Array<{
    trialIndex: number;
    stimulusId: string;
    correct: boolean;
    actualCondition: 'ai' | 'human';
    response: 'ai' | 'human';
    confidence: number;
  }>;
} {
  const trialScores = trialData.map((trial, index) => ({
    trialIndex: index + 1,
    stimulusId: trial.stimulusId,
    correct: isTrialCorrect(trial),
    actualCondition: trial.condition,
    response: trial.responses.aiDetection,
    confidence: trial.responses.aiConfidence,
  }));

  const correctCount = trialScores.filter((t) => t.correct).length;
  const totalBonus = correctCount * BONUS_PER_CORRECT;

  return {
    totalBonus: Math.round(totalBonus * 100) / 100,
    totalScore: correctCount,
    maxPossibleScore: trialData.length,
    correctCount,
    trialScores,
  };
}

/**
 * Format bonus as currency string.
 */
export function formatBonus(bonus: number): string {
  return `$${bonus.toFixed(2)}`;
}
