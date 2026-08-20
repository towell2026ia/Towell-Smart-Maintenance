// supabase/functions/agents-orchestrator/modules/m011/core/health-risk-result-builder.ts
// Health & Risk Result Assembler for M-011 (v1.0)
// Frozen under Token: M011-RESULT-BUILDER-001

import { HEALTH_MODEL_VERSION } from '../contracts/m011-health-model.contract.ts';
import { RISK_MODEL_VERSION } from '../contracts/m011-risk-model.contract.ts';
import { HealthClassifier } from '../classification/health-classifier.ts';
import { RiskClassifier } from '../classification/risk-classifier.ts';
import { HealthRiskScoreGuard } from '../guards/health-risk-score-guard.ts';
import { HealthResultValidator } from '../validators/health-result-validator.ts';
import { RiskResultValidator } from '../validators/risk-result-validator.ts';
import type {
  HealthResult,
  RiskResult,
  ScoreComponent,
  DataSufficiencyEvaluation,
  AssetCriticality,
  AssetHealthAndRiskSummary,
  ScoreSourceReference
} from '../types/m011.types.ts';

export class HealthRiskResultBuilder {
  public static buildResults(params: {
    assetId: string;
    evaluationAt: string;
    criticality: AssetCriticality;
    healthScore: number | null;
    riskScore: number | null;
    healthComponents: ScoreComponent[];
    riskComponents: ScoreComponent[];
    healthSufficiency: DataSufficiencyEvaluation;
    riskSufficiency: DataSufficiencyEvaluation;
    sourceReferences: ScoreSourceReference[];
  }): {
    health: HealthResult;
    risk: RiskResult;
    summary: AssetHealthAndRiskSummary;
  } {
    // 1. Guard against numerical errors
    HealthRiskScoreGuard.validateScore(params.healthScore, 'HEALTH');
    HealthRiskScoreGuard.validateScore(params.riskScore, 'RISK');

    // 2. Classify States
    const healthState = HealthClassifier.classify(params.healthScore, params.healthSufficiency.is_sufficient);
    const riskState = RiskClassifier.classify(params.riskScore, params.riskSufficiency.is_sufficient);

    // 3. Assemble HealthResult
    const healthResult: HealthResult = {
      asset_id: params.assetId,
      evaluation_at: params.evaluationAt,
      health_score: params.healthScore,
      health_state: healthState,
      components: params.healthComponents,
      data_sufficiency: params.healthSufficiency,
      model_version: HEALTH_MODEL_VERSION,
      rule_versions: [
        'M011-HEALTH-MODEL-001',
        'M011-HEALTH-FORMULA-001',
        'M011-HEALTH-WEIGHTS-001',
        'M011-HEALTH-THRESHOLDS-001'
      ],
      source_references: params.sourceReferences
    };

    // 4. Assemble RiskResult
    const riskResult: RiskResult = {
      asset_id: params.assetId,
      evaluation_at: params.evaluationAt,
      risk_score: params.riskScore,
      risk_state: riskState,
      criticality: params.criticality,
      components: params.riskComponents,
      data_sufficiency: params.riskSufficiency,
      model_version: RISK_MODEL_VERSION,
      rule_versions: [
        'M011-RISK-MODEL-001',
        'M011-RISK-FORMULA-001',
        'M011-RISK-WEIGHTS-001',
        'M011-RISK-THRESHOLDS-001'
      ],
      source_references: params.sourceReferences
    };

    // 5. Validate Results
    const healthVal = HealthResultValidator.validate(healthResult);
    if (!healthVal.isValid) {
      throw new Error(`[M011_HEALTH_RESULT_INVALID] ${healthVal.errors.join(', ')}`);
    }

    const riskVal = RiskResultValidator.validate(riskResult);
    if (!riskVal.isValid) {
      throw new Error(`[M011_RISK_RESULT_INVALID] ${riskVal.errors.join(', ')}`);
    }

    // 6. Assemble Summary
    const summary: AssetHealthAndRiskSummary = {
      asset_id: params.assetId,
      evaluation_at: params.evaluationAt,
      health: {
        score: params.healthScore,
        state: healthState,
        main_degradation_factor: params.healthComponents.find(c => (c.normalized_value ?? 100) < 70)?.feature_name || null
      },
      risk: {
        score: params.riskScore,
        state: riskState,
        main_risk_driver: params.riskComponents.find(c => (c.normalized_value ?? 0) > 40)?.feature_name || null
      },
      data_sufficiency: {
        is_sufficient: params.healthSufficiency.is_sufficient && params.riskSufficiency.is_sufficient,
        confidence_level: (params.healthSufficiency.sufficiency_score >= 90) ? 'HIGH' : ((params.healthSufficiency.sufficiency_score >= 65) ? 'MEDIUM' : 'LOW')
      },
      model_versions: {
        health_model: HEALTH_MODEL_VERSION,
        risk_model: RISK_MODEL_VERSION
      }
    };

    return {
      health: healthResult,
      risk: riskResult,
      summary
    };
  }
}
