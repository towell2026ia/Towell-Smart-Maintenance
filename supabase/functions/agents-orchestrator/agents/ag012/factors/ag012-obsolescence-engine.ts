// supabase/functions/agents-orchestrator/agents/ag012/factors/ag012-obsolescence-engine.ts
// Obsolescence Engine assessing manufacturer support & spare parts lifecycle (v1.0)
// Frozen under Token: AG012-OBSOLESCENCE-ENGINE-001

export class AG012ObsolescenceEngine {
  public static calculateScore(assetData: any, assetRaw?: any): {
    obsolescence_score: number; // 0 to 100 (100 = plenamente vigente, 0 = obsoleto total)
    is_critical_obsolescence: boolean;
    description: string;
  } {
    let score = 70; // vigente por defecto
    let isCritical = false;

    if (assetRaw && assetRaw.support_status === 'EOL') {
      score = 20;
      isCritical = true;
    } else if (assetRaw && assetRaw.support_status === 'DISCONTINUED') {
      score = 35;
    }

    if (assetData && assetData.year && assetData.year < 2010) {
      score -= 15;
    }

    const finalScore = Math.min(100, Math.max(0, score));

    return {
      obsolescence_score: finalScore,
      is_critical_obsolescence: isCritical || finalScore < 30,
      description: `Puntaje de vigencia tecnológica: ${finalScore}/100.`
    };
  }
}
