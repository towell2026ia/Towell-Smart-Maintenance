// supabase/functions/agents-orchestrator/modules/m013/validators/m013-output-validator.ts
// Output Validator checking structure & Zero AI Telemetry for M-013 (v1.0)
// Frozen under Token: M013-OUTPUT-001

import type { M013ExecutionResponse } from '../types/m013.types.ts';

export class M013OutputValidator {
  public static validate(output: M013ExecutionResponse): void {
    if (!output || typeof output !== 'object') {
      throw new Error('[M013_OUTPUT_ERROR] La respuesta de salida es inválida.');
    }
    if (output.module_id !== 'M-013' || output.version !== '1.0') {
      throw new Error('[M013_OUTPUT_ERROR] module_id o version no coinciden con M-013 v1.0.');
    }
    if (!output.telemetry || output.telemetry.llm_calls !== 0 || output.telemetry.tokens !== 0 || output.telemetry.cost_usd !== 0) {
      throw new Error('[M013_OUTPUT_ERROR] Telemetría Zero AI violada (LLMs/Tokens/Cost deben ser 0).');
    }
    if (output.package && output.package.status === 'CONTROLS_COMPLETE' && output.package.is_blocked === true) {
      throw new Error('[M013_OUTPUT_ERROR] Inconsistencia: CONTROLS_COMPLETE no puede estar marcado como is_blocked.');
    }
  }
}
