// supabase/functions/agents-orchestrator/modules/m011/tests/run_m011_2_deno_runtime_eval.ts
// Real Deno Edge Runtime Test Suite for M-011 (v1.0)
// Target: DENO_EDGE_RUNTIME_TEST = PASS

import { HealthRiskEngine } from '../core/health-risk-engine.ts';
import type { M011AssetInputContext } from '../contracts/m011-asset-input.contract.ts';

const testContext: M011AssetInputContext = {
  asset_id: 'TELAR-201',
  identity: {
    nombre: 'Telar Tsudakoma ZAX 201',
    depto: 'PF',
    tipo: 'TELAR DE AIRE',
    criticidad: 'ALTA',
    estatus: 'OPERANDO',
    activo: true
  },
  failure_metrics: {
    total_failures_90d: 0,
    failure_recurrence_score: 0,
    failure_trend: 'STABLE'
  },
  maintenance_history: {
    preventive_compliance_rate: 1.0,
    autonomous_compliance_rate: 1.0,
    overdue_maintenances_count: 0
  },
  findings: {
    active_critical_findings_count: 0,
    active_moderate_findings_count: 0,
    active_mild_findings_count: 0
  },
  downtime_history: {
    total_downtime_minutes_90d: 0,
    downtime_events_count_90d: 0
  },
  alerts: {
    active_critical_alerts: 0,
    active_warning_alerts: 0
  },
  source_references: [
    {
      source_name: 'cat_maquinas',
      source_table: 'public.cat_maquinas',
      source_id: 'MACH-01',
      retrieved_at: '2026-08-20T10:00:00Z',
      relationship_type: 'DIRECT_FK'
    }
  ]
};

async function runDenoRuntimeEvaluation() {
  console.log('================================================================================');
  console.log(`🦕 DENO RUNTIME SUITE: M-011 (Deno v${Deno.version.deno})`);
  console.log('================================================================================\n');

  console.log('1. Ejecutando pipeline determinístico de Health y Risk...');
  const res = await HealthRiskEngine.evaluateAssetHealthAndRisk({
    request_id: 'DENO-REQ-001',
    context: testContext,
    evaluation_at: '2026-08-20T12:00:00Z'
  });

  console.log(`   - Éxito:               ${res.success}`);
  console.log(`   - Activo ID:           ${res.asset_id}`);
  console.log(`   - Health Score:        ${res.health.health_score} (${res.health.health_state})`);
  console.log(`   - Risk Score:          ${res.risk.risk_score} (${res.risk.risk_state})`);
  console.log(`   - Componentes Health:  ${res.health.components.length}`);
  console.log(`   - Componentes Risk:    ${res.risk.components.length}`);
  console.log(`   - Fingerprint:         ${res.calculation_fingerprint}`);
  console.log(`   - Duración:            ${res.duration_ms}ms\n`);

  if (
    res.success === true &&
    res.health.health_score === 100.0 &&
    res.health.health_state === 'HEALTHY' &&
    res.risk.risk_score === 25.0 &&
    res.risk.risk_state === 'MODERATE'
  ) {
    console.log('🏆 VEREDICTO DENO RUNTIME: DENO_EDGE_RUNTIME_TEST = PASS ✅\n');
  } else {
    console.error('❌ VEREDICTO DENO RUNTIME: FAILED');
    Deno.exit(1);
  }
}

runDenoRuntimeEvaluation().catch(err => {
  console.error('Error fatal en Deno runtime evaluation:', err);
  Deno.exit(1);
});
