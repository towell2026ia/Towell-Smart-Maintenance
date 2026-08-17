// supabase/functions/agents-orchestrator/agents/ag009/tests/ag009_1_preventive.test.ts
// Deno Test Suite for AG-009.1 Conector Preventivo v1.0

import { assertEquals, assertRejects } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { validatePreventiveScheduleContract } from '../ag009_1/contracts/preventive-schedule.contract.ts';
import { validateMachineGuard } from '../ag009_1/guards/machine-guard.ts';
import { validateYearlyPreventiveGuard } from '../ag009_1/guards/yearly-preventive-guard.ts';
import { validateServiceGuard } from '../ag009_1/guards/service-guard.ts';
import { resolveChecklistForService } from '../ag009_1/resolvers/checklist-resolver.ts';
import { buildPreventiveOTDraft } from '../ag009_1/builders/preventive-ot-builder.ts';
import { computeCanonicalHash, verifyApprovalBinding } from '../ag009_1/core/approval-binding.ts';
import { processPreventiveScheduleItem } from '../ag009_1/core/preventive-connector.ts';

const fixtures = JSON.parse(await Deno.readTextFile(new URL('./fixtures/preventive-cases.json', import.meta.url)));

Deno.test('AG-009.1 - Contract Validation', () => {
  const invalid = validatePreventiveScheduleContract({});
  assertEquals(invalid.isValid, false);
  assertEquals(invalid.errorCode, 'MISSING_REQUIRED_DATA');

  const valid = validatePreventiveScheduleContract({
    machine_id: 'COS-01',
    scheduled_date: '2026-06-15',
    year: 2026,
    service_code: 'SRV-LUBI-01',
    calendar_reference: 'PLAN-2026-001'
  });
  assertEquals(valid.isValid, true);
  assertEquals(valid.cleanedPayload?.contract_id, 'PREVENTIVE-SCHEDULE-001');
});

Deno.test('AG-009.1 - Machine Guard', async () => {
  const m = await validateMachineGuard(null, 'COS-01', fixtures.machines);
  assertEquals(m.department, 'CF');
  assertEquals(m.activo, true);

  await assertRejects(
    async () => await validateMachineGuard(null, 'INACTIVA-01', fixtures.machines),
    Error
  );
});

Deno.test('AG-009.1 - Yearly Duplicate Guard', async () => {
  await assertRejects(
    async () => await validateYearlyPreventiveGuard(null, 'COS-01', 2026, fixtures.existingOrders),
    Error
  );

  const allowed2027 = await validateYearlyPreventiveGuard(null, 'COS-01', 2027, fixtures.existingOrders);
  assertEquals(allowed2027.canCreate, true);
});

Deno.test('AG-009.1 - End-to-End Pipeline Execution', async () => {
  const options = { localCatalogs: fixtures, sequenceNum: 10 };
  const res = await processPreventiveScheduleItem(
    null,
    {
      machine_id: 'JET-01',
      scheduled_date: '2026-08-20',
      year: 2026,
      service_code: 'SRV-LUBI-01',
      calendar_reference: 'PLAN-2026-JET-01'
    },
    'CORR-DENO-TEST',
    'EVT-DENO-01',
    options
  );

  assertEquals(res.success, true);
  assertEquals(res.workflow_state, 'PENDING_APPROVAL');
  assertEquals(res.ot_draft?.folio_propuesto, 'TF00010');
  assertEquals(res.ot_draft?.tipo_orden, 'Preventivo');
});
