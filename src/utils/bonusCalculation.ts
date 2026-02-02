import type { TrialData } from '../types';

/**
 * Quadratic Scoring Rule for incentivizing honest probability reporting.
 *
 * The quadratic scoring rule rewards participants for:
 * 1. Being correct in their predictions
 * 2. Being appropriately confident (confident when right, uncertain when unsure)
 *
 * Formula:
 * - If actual condition is AI: score = 2p - p² where p is reported probability of AI
 * - If actual condition is Human: score = 1 - p² (equivalent to 2(1-p) - (1-p)²)
 *
 * This scoring rule is "proper" - participants maximize expected score by reporting
 * their true beliefs.
 */

// Maximum bonus in dollars
const MAX_BONUS = 1.50;

// Number of trials
const NUM_TRIALS = 6;

// Maximum score per trial (when p=1 and correct, score = 2*1 - 1² = 1)
const MAX_SCORE_PER_TRIAL = 1.0;

/**
 * Convert AI detection response + confidence to a probability estimate.
 *
 * Response mapping:
 * - "yes" (thinks it's AI) + confidence 1-5 → 0.6 to 1.0
 * - "unsure" → 0.5
 * - "no" (thinks it's human) + confidence 1-5 → 0.4 to 0.0
 */
export function responseToProbability(
  aiDetection: 'yes' | 'no' | 'unsure',
  aiConfidence: number
): number {
  if (aiDetection === 'unsure') {
    return 0.5;
  }

  // Confidence is 1-5, map to probability offset
  // Confidence 1 = barely confident (closer to 0.5)
  // Confidence 5 = very confident (closer to 0 or 1)
  const confidenceOffset = (aiConfidence - 1) / 4; // 0 to 1

  if (aiDetection === 'yes') {
    // Think it's AI: probability ranges from 0.6 (conf=1) to 1.0 (conf=5)
    return 0.6 + (0.4 * confidenceOffset);
  } else {
    // Think it's human: probability ranges from 0.4 (conf=1) to 0.0 (conf=5)
    return 0.4 - (0.4 * confidenceOffset);
  }
}

/**
 * Calculate quadratic score for a single trial.
 *
 * @param probability - Reported probability that the code is AI-generated (0-1)
 * @param actualCondition - Whether the code was actually AI or human
 * @returns Score between 0 and 1
 */
export function calculateQuadraticScore(
  probability: number,
  actualCondition: 'ai' | 'human'
): number {
  if (actualCondition === 'ai') {
    // Score = 2p - p²
    return 2 * probability - probability * probability;
  } else {
    // Score = 1 - p² (rewards low probability when it's actually human)
    return 1 - probability * probability;
  }
}

/**
 * Calculate total bonus for all trials.
 *
 * @param trialData - Array of trial data with responses and conditions
 * @returns Object with total bonus, individual scores, and breakdown
 */
export function calculateTotalBonus(trialData: TrialData[]): {
  totalBonus: number;
  totalScore: number;
  maxPossibleScore: number;
  trialScores: Array<{
    trialIndex: number;
    stimulusId: string;
    probability: number;
    actualCondition: 'ai' | 'human';
    score: number;
    maxScore: number;
  }>;
} {
  const trialScores = trialData.map((trial, index) => {
    const probability = responseToProbability(
      trial.responses.aiDetection,
      trial.responses.aiConfidence
    );

    const score = calculateQuadraticScore(probability, trial.condition);

    return {
      trialIndex: index + 1,
      stimulusId: trial.stimulusId,
      probability,
      actualCondition: trial.condition,
      score,
      maxScore: MAX_SCORE_PER_TRIAL,
    };
  });

  const totalScore = trialScores.reduce((sum, t) => sum + t.score, 0);
  const maxPossibleScore = NUM_TRIALS * MAX_SCORE_PER_TRIAL;

  // Scale to bonus amount
  const totalBonus = (totalScore / maxPossibleScore) * MAX_BONUS;

  return {
    totalBonus: Math.round(totalBonus * 100) / 100, // Round to cents
    totalScore,
    maxPossibleScore,
    trialScores,
  };
}

/**
 * Format bonus as currency string
 */
export function formatBonus(bonus: number): string {
  return `$${bonus.toFixed(2)}`;
}
