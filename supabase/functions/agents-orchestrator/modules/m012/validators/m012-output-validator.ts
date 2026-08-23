// supabase/functions/agents-orchestrator/modules/m012/validators/m012-output-validator.ts
// Output Validator for M-012 Preparation Package (v1.0)
// Frozen under Token: M012-OUTPUT-001
// Invariant: Full structure and contract conformance (§96-97 PRD-M-012.2)

import type { OTPreparationPackage, M012ExecutionResponse } from '../types/m012.types.ts';
import { M012TraceabilityValidator } from './m012-traceability-validator.ts';

export class M012OutputValidator {
  public static validate(response: M012ExecutionResponse): void {
    if (!response.success) {
      return; // Error responses are handled separately
    }

    if (response.module_id !== 'M-012') {
      throw new Error('[M012_OUTPUT_ERROR] Identificador de módulo debe ser M-012.');
    }
    if (response.version !== '1.0') {
      throw new Error('[M012_OUTPUT_ERROR] Versión de módulo debe ser 1.0.');
    }

    const pkg: OTPreparationPackage = response.package;
    if (!pkg.work_order_id || !pkg.asset_id || !pkg.evaluation_at) {
      throw new Error('[M012_OUTPUT_ERROR] Metadatos principales de preparación faltantes.');
    }

    // Telemetry Zero AI assertion
    if (response.telemetry.llm_calls !== 0 || response.telemetry.tokens !== 0 || response.telemetry.cost_usd !== 0) {
      throw new Error('[M012_OUTPUT_ERROR] Telemetría Zero AI violada.');
    }

    // Traceability assertion
    const traceCheck = M012TraceabilityValidator.validate(pkg);
    if (!traceCheck.isTraceable) {
      throw new Error(`[M012_OUTPUT_ERROR] Paquete contiene ${traceCheck.untraceableCount} elementos sin trazabilidad.`);
    }
  }
}
