// supabase/functions/agents-orchestrator/agents/ag012/decision/ag012-score-engine.ts
// Decision Score Engine calculating 100% weighted multi-criteria scores (v1.0)
// Frozen under Token: AG012-SCORE-ENGINE-001

import type { DecisionScore } from '../types/ag012.types.ts';

export class AG012ScoreEngine {
  public static calculateScores(
    reliabilityScore: number,
    economicScore: number,
    technicalScore: number,
    maintainabilityScore: number,
    obsolescenceScore: number
  ): DecisionScore[] {
    const weights = {
      reliability: 25,
      economic: 25,
      technical: 20,
      maintainability: 15,
      obsolescence: 15
    };

    const scores: DecisionScore[] = [
      {
        dimension: 'Confiabilidad y Frecuencia de Fallas',
        weight_percentage: weights.reliability,
        raw_score: reliabilityScore,
        weighted_score: Number(((reliabilityScore * weights.reliability) / 100).toFixed(2)),
        description: `Score de confiabilidad: ${reliabilityScore}/100.`
      },
      {
        dimension: 'Carga Económica de Mantenimiento',
        weight_percentage: weights.economic,
        raw_score: economicScore,
        weighted_score: Number(((economicScore * weights.economic) / 100).toFixed(2)),
        description: `Score de sostenibilidad económica: ${economicScore}/100.`
      },
      {
        dimension: 'Viabilidad Técnica y Reparabilidad',
        weight_percentage: weights.technical,
        raw_score: technicalScore,
        weighted_score: Number(((technicalScore * weights.technical) / 100).toFixed(2)),
        description: `Score técnico de reparación: ${technicalScore}/100.`
      },
      {
        dimension: 'Mantenibilidad y Soporte de Servicio',
        weight_percentage: weights.maintainability,
        raw_score: maintainabilityScore,
        weighted_score: Number(((maintainabilityScore * weights.maintainability) / 100).toFixed(2)),
        description: `Score de mantenibilidad: ${maintainabilityScore}/100.`
      },
      {
        dimension: 'Vigencia Tecnológica y Ciclo de Vida',
        weight_percentage: weights.obsolescence,
        raw_score: obsolescenceScore,
        weighted_score: Number(((obsolescenceScore * weights.obsolescence) / 100).toFixed(2)),
        description: `Score de ciclo de vida / obsolescencia: ${obsolescenceScore}/100.`
      }
    ];

    return scores;
  }
}
