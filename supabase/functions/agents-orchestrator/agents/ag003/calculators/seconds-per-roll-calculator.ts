// supabase/functions/agents-orchestrator/agents/ag003/calculators/seconds-per-roll-calculator.ts
// Seconds Per Roll and Defect Rate Calculator (§24, §25 PRD)

export interface SecondsPerRollResult {
  totalSegundas: number;
  totalRolls: number;
  totalPzas?: number;
  segundasPerRoll: number;
  defectPercentage: number;
  hasSufficientSample: boolean;
}

export function calculateSecondsPerRoll(
  totalSegundas: number,
  totalRolls: number,
  totalPzas?: number
): SecondsPerRollResult {
  const segundas = Math.max(0, totalSegundas || 0);
  const rolls = Math.max(0, totalRolls || 0);
  const pzas = Math.max(0, totalPzas || 0);

  if (rolls === 0 && pzas === 0) {
    return {
      totalSegundas: segundas,
      totalRolls: 0,
      totalPzas: 0,
      segundasPerRoll: 0,
      defectPercentage: 0,
      hasSufficientSample: false
    };
  }

  const rate = rolls > 0 ? Number((segundas / rolls).toFixed(2)) : 0;
  const defectPct = pzas > 0 ? Number(((segundas / pzas) * 100).toFixed(2)) : rate;

  return {
    totalSegundas: segundas,
    totalRolls: rolls,
    totalPzas: pzas,
    segundasPerRoll: rate,
    defectPercentage: defectPct,
    hasSufficientSample: rolls >= 3 || pzas >= 10
  };
}
