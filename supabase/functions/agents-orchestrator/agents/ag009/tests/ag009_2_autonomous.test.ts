// supabase/functions/agents-orchestrator/agents/ag009/tests/ag009_2_autonomous.test.ts
// Deno / Edge Runtime Test Suite for AG-009.2 Conector Autónomo v1.0

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { processAutonomousScheduleItem } from '../ag009_2/core/autonomous-connector.ts';

const mockMachines = [
  { equipo_towell: 'TELAR-01', departamento_codigo: 'PF', area: 'Producción', activo: true, criticidad: 'A' },
  { equipo_towell: 'COS-OVER-03', departamento_codigo: 'CF', area: 'Costura', activo: true, criticidad: 'B' },
  { equipo_towell: 'JET-02', departamento_codigo: 'TF', area: 'Tintorería', activo: true, criticidad: 'A' },
  { equipo_towell: 'COMP-01', departamento_codigo: 'AF', area: 'Servicios Auxiliares', activo: true, criticidad: 'B' },
  { equipo_towell: 'TELAR-INACTIVO', departamento_codigo: 'PF', area: 'Producción', activo: false, criticidad: 'C' }
];

const mockExistingSurveys = [
  {
    survey_id: 'LEV-AUT-TELAR-01-W33-2026',
    machine_id: 'TELAR-01',
    week_reference: 33,
    year: 2026,
    calendar_reference: 'CAL-AUT-2026-W33-TELAR-01',
    status: 'EJECUTADO'
  }
];

const cleanResponses = [
  { item_code: 'VIB-01', block: 'Vibración' as const, question_text: 'Vibración', response_type: 'NUMERIC' as const, value: 3.2, unit: 'mm/s', reference_max: 7.0, required: true },
  { item_code: 'LIM-01', block: 'Limpieza' as const, question_text: 'Limpieza', response_type: 'YES_NO' as const, value: 'SI', required: true },
  { item_code: 'LUB-01', block: 'Lubricación' as const, question_text: 'Lubricación', response_type: 'NUMERIC' as const, value: 55.0, unit: 'PSI', reference_min: 30.0, reference_max: 100.0, required: true },
  { item_code: 'TMP-01', block: 'Temperatura' as const, question_text: 'Temperatura', response_type: 'NUMERIC' as const, value: 52.0, unit: '°C', reference_max: 70.0, required: true },
  { item_code: 'CAB-01', block: 'Cableado' as const, question_text: 'Cableado', response_type: 'YES_NO' as const, value: 'SI', required: true }
];

const findingsResponses = [
  { item_code: 'VIB-01', block: 'Vibración' as const, question_text: 'Vibración', response_type: 'NUMERIC' as const, value: 8.8, unit: 'mm/s', reference_max: 7.0, required: true },
  { item_code: 'LIM-01', block: 'Limpieza' as const, question_text: 'Limpieza', response_type: 'YES_NO' as const, value: 'NO', required: true },
  { item_code: 'LUB-01', block: 'Lubricación' as const, question_text: 'Lubricación', response_type: 'NUMERIC' as const, value: 15.0, unit: 'PSI', reference_min: 30.0, reference_max: 100.0, required: true },
  { item_code: 'TMP-01', block: 'Temperatura' as const, question_text: 'Temperatura', response_type: 'NUMERIC' as const, value: 85.5, unit: '°C', reference_max: 70.0, required: true },
  { item_code: 'CAB-01', block: 'Cableado' as const, question_text: 'Cableado', response_type: 'YES_NO' as const, value: 'NO', required: true }
];

Deno.test('AG-009.2: Clean Survey Execution (0 Findings, Survey Completed)', async () => {
  const result = await processAutonomousScheduleItem(
    null,
    {
      machine_id: 'TELAR-01',
      scheduled_date: '2026-08-20',
      week_reference: 34,
      year: 2026,
      calendar_reference: 'CAL-01',
      source_reference: 'AUTONOMO',
      responses: cleanResponses
    },
    'corr-deno-clean',
    'EVT-DENO-01',
    {
      localCatalogs: {
        machines: mockMachines,
        existingSurveys: mockExistingSurveys
      }
    }
  );

  assertEquals(result.success, true);
  assertEquals(result.workflow_state, 'AUTONOMOUS_SURVEY_COMPLETED');
  assertEquals(result.findings?.length, 0);
  assertExists(result.survey_execution);
  assertEquals(result.survey_execution.department, 'PF');
});

Deno.test('AG-009.2: Survey with Findings (Emits AUTONOMOUS-FINDING-001, 0 OT created)', async () => {
  const result = await processAutonomousScheduleItem(
    null,
    {
      machine_id: 'TELAR-01',
      scheduled_date: '2026-08-20',
      week_reference: 34,
      year: 2026,
      calendar_reference: 'CAL-01',
      source_reference: 'AUTONOMO',
      responses: findingsResponses
    },
    'corr-deno-fnd',
    'EVT-DENO-02',
    {
      localCatalogs: {
        machines: mockMachines,
        existingSurveys: mockExistingSurveys
      }
    }
  );

  assertEquals(result.success, true);
  assertEquals(result.workflow_state, 'AUTONOMOUS_FINDING_DETECTED');
  assertEquals(result.findings?.length, 5);
  assertEquals(result.ot_created, undefined);
  assertEquals(result.findings![0].contract_id, 'AUTONOMOUS-FINDING-001');
});
