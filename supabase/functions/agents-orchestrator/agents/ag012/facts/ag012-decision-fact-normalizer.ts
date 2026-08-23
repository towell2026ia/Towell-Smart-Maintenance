// supabase/functions/agents-orchestrator/agents/ag012/facts/ag012-decision-fact-normalizer.ts
// Decision Fact Normalizer mapping upstream signals into certified DecisionFacts (v1.0)
// Frozen under Token: AG012-DECISION-FACT-001

import type { DecisionFact } from '../types/ag012.types.ts';

export class AG012DecisionFactNormalizer {
  public static normalize(
    assetId: string,
    evaluationAt: string,
    assetData: any,
    healthRiskData: any,
    failureData: any,
    rcaData: any,
    memoryData: any,
    economicData: any
  ): DecisionFact[] {
    const facts: DecisionFact[] = [];

    // 1. Technical / Identity Facts
    facts.push({
      factor_id: 'FACT-TECH-01',
      category: 'TECHNICAL',
      name: 'asset_identity',
      value: assetId,
      source_agent: 'M-010',
      source_reference: `cat_maquinas:${assetId}`,
      timestamp: evaluationAt,
      quality: 'CERTIFIED'
    });

    if (assetData && assetData.year !== undefined) {
      facts.push({
        factor_id: 'FACT-TECH-02',
        category: 'TECHNICAL',
        name: 'manufacturing_year',
        value: assetData.year,
        source_agent: 'M-010',
        source_reference: `cat_maquinas.anio_fabricacion`,
        timestamp: evaluationAt,
        quality: 'CERTIFIED'
      });
    }

    // 2. Reliability Facts
    if (healthRiskData && healthRiskData.health_score !== undefined) {
      facts.push({
        factor_id: 'FACT-REL-01',
        category: 'RELIABILITY',
        name: 'health_score',
        value: healthRiskData.health_score,
        unit: 'points (0-100)',
        source_agent: 'M-011',
        source_reference: 'M011_HEALTH_EVALUATION',
        timestamp: evaluationAt,
        quality: 'CERTIFIED'
      });
    }

    if (healthRiskData && healthRiskData.risk_score !== undefined) {
      facts.push({
        factor_id: 'FACT-REL-02',
        category: 'RELIABILITY',
        name: 'risk_score',
        value: healthRiskData.risk_score,
        unit: 'points (0-100)',
        source_agent: 'M-011',
        source_reference: 'M011_RISK_EVALUATION',
        timestamp: evaluationAt,
        quality: 'CERTIFIED'
      });
    }

    if (failureData && failureData.failure_count_12m !== undefined) {
      facts.push({
        factor_id: 'FACT-REL-03',
        category: 'RELIABILITY',
        name: 'failure_count_12m',
        value: failureData.failure_count_12m,
        unit: 'failures',
        source_agent: 'AG-008',
        source_reference: 'AG008_FAILURE_INTEL',
        timestamp: evaluationAt,
        quality: 'CERTIFIED'
      });
    }

    // 3. RCA Facts
    if (rcaData && rcaData.has_confirmed_root_cause) {
      facts.push({
        factor_id: 'FACT-RCA-01',
        category: 'TECHNICAL',
        name: 'confirmed_root_cause',
        value: rcaData.root_cause_description || 'Confirmed Cause',
        source_agent: 'AG-010',
        source_reference: 'AG010_RCA_HUMAN_CONFIRMED',
        timestamp: evaluationAt,
        quality: 'CERTIFIED'
      });
    }

    // 4. Memory Facts
    if (memoryData && memoryData.has_approved_repair_procedure) {
      facts.push({
        factor_id: 'FACT-MEM-01',
        category: 'MAINTAINABILITY',
        name: 'approved_repair_procedure',
        value: true,
        source_agent: 'AG-011',
        source_reference: 'AG011_APPROVED_MEMORY',
        timestamp: evaluationAt,
        quality: 'CERTIFIED'
      });
    }

    // 5. Economic Facts
    if (economicData && economicData.recent_maintenance_cost_12m !== undefined) {
      facts.push({
        factor_id: 'FACT-ECON-01',
        category: 'ECONOMIC',
        name: 'recent_maintenance_cost_12m',
        value: economicData.recent_maintenance_cost_12m,
        unit: economicData.currency || 'MXN',
        source_agent: 'AG-007',
        source_reference: 'AG007_COST_NORMALIZED',
        timestamp: evaluationAt,
        quality: 'CERTIFIED'
      });
    }

    if (economicData && economicData.estimated_replacement_cost !== undefined) {
      facts.push({
        factor_id: 'FACT-ECON-02',
        category: 'ECONOMIC',
        name: 'estimated_replacement_cost',
        value: economicData.estimated_replacement_cost,
        unit: economicData.currency || 'MXN',
        source_agent: 'AG-007',
        source_reference: 'AG007_REPLACEMENT_ESTIMATE',
        timestamp: evaluationAt,
        quality: 'CERTIFIED'
      });
    }

    return facts;
  }
}
