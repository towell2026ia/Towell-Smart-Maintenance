// supabase/functions/agents-orchestrator/agents/ag003/calculators/seconds-per-roll-calculator.ts
// Seconds Per Roll Calculator (§24, §25 PRD)

export interface SecondsPerRollResult {
  totalSegundas: number;
  totalRolls: number;
  segundasPerRoll: number;
  hasSufficientSample: boolean;
}

export function calculateSecondsPerRoll(
  totalSegundas: number,
  totalRolls: number
): SecondsPerRollResult {
  const segundas = Math.max(0, totalSegundas || 0);
  const rolls = Math.max(0, totalRolls || 0);

  if (rolls === 0) {
    return {
      totalSegundas: segundas,
      totalRolls: 0,
      segundasPerRoll: 0,
      hasSufficientSample: false
    };
  }

  const rate = Number((segundas / rolls).toFixed(2));
  return {
    totalSegundas: segundas,
    totalRolls: rolls,
    segundasPerRoll: rate,
    hasSufficientSample: rolls >= 3
  };
}
