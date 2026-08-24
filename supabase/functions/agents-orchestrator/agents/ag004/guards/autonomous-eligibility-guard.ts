// supabase/functions/agents-orchestrator/agents/ag004/guards/autonomous-eligibility-guard.ts
// Strict Eligibility & Signal Guard for AG-004 (PRD-AG004-R1 §21-38, §84-90)
// Universe: Active Machines -> Real Failure History -> Recurrence OR Trend -> Eligible

import { 
  MachineRecord, 
  HistoricalFaultRecord, 
  TelegramEventRecord, 
  EligibilityStatus, 
  EligibilityReason,
  DepartmentCode 
} from '../types/ag004.types.ts';
import { normalizeActiveStatus, extractDepartment } from '../rules/eligibility.rules.ts';

export interface EligibilityEvaluation {
  isEligible: boolean;
  status: EligibilityStatus;
  machineId: string;
  department?: DepartmentCode;
  reason?: EligibilityReason;
  failureHistoryCount: number;
  hasRecurrence: boolean;
  hasTrend: boolean;
  rankingScore: number;
  description?: string;
}

export function evaluateAutonomousAssetEligibility(
  machine: MachineRecord | null | undefined,
  faults: HistoricalFaultRecord[] = [],
  telegramEvents: TelegramEventRecord[] = []
): EligibilityEvaluation {
  if (!machine || typeof machine !== 'object') {
    return {
      isEligible: false,
      status: 'INVALID_MACHINE_RECORD',
      machineId: 'UNKNOWN',
      reason: 'INACTIVE',
      failureHistoryCount: 0,
      hasRecurrence: false,
      hasTrend: false,
      rankingScore: 0,
      description: 'El registro de máquina proporcionado es nulo o inválido.'
    };
  }

  const rawId = machine.equipo_towell || machine.id_maquina;
  if (!rawId || typeof rawId !== 'string' || rawId.trim().length === 0) {
    return {
      isEligible: false,
      status: 'MACHINE_NOT_FOUND',
      machineId: 'UNKNOWN',
      reason: 'INACTIVE',
      failureHistoryCount: 0,
      hasRecurrence: false,
      hasTrend: false,
      rankingScore: 0,
      description: 'El identificador de máquina (equipo_towell) no está presente.'
    };
  }

  const normId = rawId.trim().toUpperCase();

  // 1. Check active status
  const isActive = normalizeActiveStatus(machine.activo);
  if (!isActive) {
    return {
      isEligible: false,
      status: 'MACHINE_INACTIVE',
      machineId: normId,
      reason: 'INACTIVE',
      failureHistoryCount: 0,
      hasRecurrence: false,
      hasTrend: false,
      rankingScore: 0,
      description: `La máquina ${normId} se encuentra inactiva o dada de baja.`
    };
  }

  // 2. Check department (PF, CF, TF, AF)
  const dept = extractDepartment(machine);
  if (!dept) {
    const rawDept = machine.departamento_codigo || machine.area || 'DESCONOCIDO';
    return {
      isEligible: false,
      status: 'INVALID_DEPARTMENT',
      machineId: normId,
      reason: 'INACTIVE',
      failureHistoryCount: 0,
      hasRecurrence: false,
      hasTrend: false,
      rankingScore: 0,
      description: `El departamento '${rawDept}' no pertenece a la cobertura oficial de AG-004 (PF, CF, TF, AF).`
    };
  }

  // 3. Historical Failures Evaluation (PRD-AG004-R1 §21-25)
  const machineFaults = faults.filter(f => String(f.maquina_id || '').trim().toUpperCase() === normId);
  const machineTelegram = telegramEvents.filter(t => String(t.maquina_id || '').trim().toUpperCase() === normId);
  const totalFailures = machineFaults.length + machineTelegram.length;

  if (totalFailures === 0) {
    return {
      isEligible: false,
      status: 'NO_FAILURE_HISTORY',
      machineId: normId,
      department: dept,
      reason: 'NO_FAILURE_HISTORY',
      failureHistoryCount: 0,
      hasRecurrence: false,
      hasTrend: false,
      rankingScore: 0,
      description: `La máquina ${normId} no tiene histórico de fallas registradas (no elegible para este método).`
    };
  }

  // 4. Recurrence and Trend Signal Detection (PRD-AG004-R1 §26-31)
  // Recurrence signal: repeated failures or category recurrence
  const hasExplicitRecurrence = machineFaults.some(f => f.es_recurrente === true);
  
  // Category clustering for recurrence
  const categoryMap: Record<string, number> = {};
  for (const f of machineFaults) {
    const cat = String(f.categoria_falla || f.falla || f.descripcion_falla || 'GENERAL').trim().toUpperCase();
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  }
  for (const t of machineTelegram) {
    const cat = String(t.falla || t.descripcion || 'TELEGRAM_FAULT').trim().toUpperCase();
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  }
  const hasClusteredRecurrence = Object.values(categoryMap).some(count => count >= 2);
  const hasRecurrence = hasExplicitRecurrence || hasClusteredRecurrence || (totalFailures >= 2);

  // Trend signal: increasing pattern, high failure frequency (>= 3) or recent events
  const hasHighFrequencyTrend = totalFailures >= 3;
  const hasRecentFailures = machineFaults.length >= 2 || machineTelegram.length >= 1;
  const hasTrend = hasHighFrequencyTrend || hasRecentFailures;

  // 5. Must have at least one signal (Recurrence OR Trend)
  if (!hasRecurrence && !hasTrend) {
    return {
      isEligible: false,
      status: 'NO_RECURRENCE_OR_TREND',
      machineId: normId,
      department: dept,
      reason: 'NO_RECURRENCE_OR_TREND',
      failureHistoryCount: totalFailures,
      hasRecurrence: false,
      hasTrend: false,
      rankingScore: totalFailures,
      description: `La máquina ${normId} tiene ${totalFailures} fallas pero sin señales de recurrencia ni tendencia activa.`
    };
  }

  let reason: EligibilityReason = 'RECURRENCE';
  if (hasRecurrence && hasTrend) {
    reason = 'RECURRENCE_AND_TREND';
  } else if (hasTrend) {
    reason = 'TREND';
  }

  // Canonical ranking score
  const score = (hasRecurrence ? 50 : 0) + (hasTrend ? 30 : 0) + Math.min(totalFailures * 5, 20);

  return {
    isEligible: true,
    status: 'ELIGIBLE',
    machineId: normId,
    department: dept,
    reason: reason,
    failureHistoryCount: totalFailures,
    hasRecurrence,
    hasTrend,
    rankingScore: score,
    description: `Máquina ${normId} elegible por ${reason} (${totalFailures} fallas históricas).`
  };
}

export function evaluateMachineEligibility(machine: MachineRecord | null | undefined): EligibilityEvaluation {
  return evaluateAutonomousAssetEligibility(machine, [], []);
}

