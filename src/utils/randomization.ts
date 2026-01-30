// Fisher-Yates shuffle
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Assign each stimulus to human or ai condition (50/50 random)
export function assignConditions(stimulusIds: string[]): Record<string, 'human' | 'ai'> {
  const assignments: Record<string, 'human' | 'ai'> = {};
  for (const id of stimulusIds) {
    assignments[id] = Math.random() < 0.5 ? 'human' : 'ai';
  }
  return assignments;
}

// Assign question order per stimulus (ai-first or effort-first, 50/50 random)
export function assignQuestionOrder(stimulusIds: string[]): Record<string, 'ai-first' | 'effort-first'> {
  const assignments: Record<string, 'ai-first' | 'effort-first'> = {};
  for (const id of stimulusIds) {
    assignments[id] = Math.random() < 0.5 ? 'ai-first' : 'effort-first';
  }
  return assignments;
}

// Call both at experiment start
export function initializeRandomization(stimulusIds: string[]) {
  return {
    order: shuffle(stimulusIds),
    conditions: assignConditions(stimulusIds),
    questionOrders: assignQuestionOrder(stimulusIds),
  };
}
