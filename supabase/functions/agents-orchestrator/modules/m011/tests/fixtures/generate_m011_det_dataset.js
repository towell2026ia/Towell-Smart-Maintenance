// supabase/functions/agents-orchestrator/modules/m011/tests/fixtures/generate_m011_det_dataset.js
// Generator for M011-DET-EVAL-001 Deterministic Evaluation Dataset (v1.0)
// Frozen under Token: M011-DET-EVAL-001

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const assetsContext = [
  {
    asset_id: 'TELAR-201',
    description: 'Activo con salud óptima y criticidad alta',
    context: {
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
        { source_name: 'cat_maquinas', source_table: 'public.cat_maquinas', source_id: 'MACH-01', retrieved_at: '2026-08-20T10:00:00Z', relationship_type: 'DIRECT_FK' }
      ]
    },
    expected: {
      health_score: 100.0,
      health_state: 'HEALTHY',
      risk_score: 25.0, // Health degradation = 0 (35%*0=0), Criticality = 100 (25%*100=25), Rec = 0, Find = 0 -> 25.0
      risk_state: 'MODERATE'
    }
  },
  {
    asset_id: 'TELAR-202',
    description: 'Activo con degradación moderada y criticidad alta',
    context: {
      asset_id: 'TELAR-202',
      identity: {
        nombre: 'Telar Tsudakoma ZAX 202',
        depto: 'PF',
        tipo: 'TELAR DE AIRE',
        criticidad: 'ALTA',
        estatus: 'OPERANDO',
        activo: true
      },
      failure_metrics: {
        total_failures_90d: 2,
        failure_recurrence_score: 40,
        failure_trend: 'UP'
      },
      maintenance_history: {
        preventive_compliance_rate: 1.0,
        autonomous_compliance_rate: 0.8,
        overdue_maintenances_count: 0
      },
      findings: {
        active_critical_findings_count: 0,
        active_moderate_findings_count: 1,
        active_mild_findings_count: 0
      },
      downtime_history: {
        total_downtime_minutes_90d: 120,
        downtime_events_count_90d: 1
      },
      alerts: {
        active_critical_alerts: 0,
        active_warning_alerts: 1
      },
      source_references: [
        { source_name: 'cat_maquinas', source_table: 'public.cat_maquinas', source_id: 'MACH-02', retrieved_at: '2026-08-20T10:00:00Z', relationship_type: 'DIRECT_FK' }
      ]
    },
    expected: {
      health_state: 'WATCH',
      risk_state: 'HIGH'
    }
  },
  {
    asset_id: 'CARDA-01',
    description: 'Activo con datos insuficientes (inactivo / sin mantenimiento)',
    context: {
      asset_id: 'CARDA-01',
      identity: {
        nombre: 'Carda Trutzschler 1',
        depto: 'PF',
        tipo: 'CARDA',
        criticidad: 'MEDIA',
        estatus: 'INACTIVA',
        activo: false
      }
    },
    expected: {
      health_score: null,
      health_state: 'INSUFFICIENT_DATA',
      risk_score: null,
      risk_state: 'INSUFFICIENT_DATA'
    }
  }
];

const dataset = {
  version: 'M011-DET-EVAL-001',
  generated_at: new Date().toISOString(),
  assets: assetsContext
};

const targetPath = path.join(__dirname, 'm011-det-eval-001.json');
fs.writeFileSync(targetPath, JSON.stringify(dataset, null, 2), 'utf8');

const hash = crypto.createHash('sha256').update(fs.readFileSync(targetPath)).digest('hex');
console.log(`✅ Dataset M011-DET-EVAL-001 generado en: ${targetPath}`);
console.log(`🔒 SHA-256: ${hash}`);
