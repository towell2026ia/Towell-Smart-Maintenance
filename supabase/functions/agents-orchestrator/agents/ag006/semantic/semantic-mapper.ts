// supabase/functions/agents-orchestrator/agents/ag006/semantic/semantic-mapper.ts
// Semantic Mapping Orchestrator for AG-006.4 (GPT-4.1 Mini + Structured Outputs) v1.0

import type { FormDefinitionContract } from '../form-definition/form-definition.types.ts';
import type { WorkbookIR } from '../intermediate/intermediate.types.ts';
import type { SemanticExecutionResult, SemanticOutputPackage } from './semantic-output.types.ts';

import { buildSemanticContext } from './semantic-context.ts';
import { validateSemanticOutputPackage } from './semantic-validator.ts';
import { mergeSemanticDecisions } from './semantic-merge.ts';

import { AG006_SYSTEM_PROMPT, AG006_PROMPT_VERSION } from '../prompts/AG006-PROMPT-001.ts';
import { callOpenAIWithRetry } from '../../../providers/openai-adapter.ts';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEMANTIC_SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, 'semantic-output.schema.json'), 'utf8'));

export interface SemanticMapperOptions {
  multiagentEnabled?: boolean;
  llmCallsEnabled?: boolean;
  openaiEnabled?: boolean;
  apiKey?: string;
  mockResponse?: any;
}

// Tariff Model Snapshot for gpt-4o-mini ($0.15 / 1M input tokens, $0.60 / 1M output tokens)
const TARIFF_SNAPSHOT = {
  model: 'gpt-4o-mini',
  price_input_per_1m: 0.15,
  price_output_per_1m: 0.60
};

function getEnvVar(key: string): string | undefined {
  try {
    const envPath = path.resolve(__dirname, '../../../../../../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(new RegExp(`^${key}=([^\\r\\n]+)`, 'm'));
      if (match && match[1].trim()) return match[1].trim();
    }
  } catch (_) {}

  if (typeof Deno !== 'undefined' && Deno.env) {
    return Deno.env.get(key);
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

export async function processSemanticMapping(
  formDraft: FormDefinitionContract,
  ir?: WorkbookIR,
  options: SemanticMapperOptions = {}
): Promise<{ result: SemanticExecutionResult; updatedContract: FormDefinitionContract }> {
  const startTime = Date.now();

  const multiagentEnabled = options.multiagentEnabled ?? (getEnvVar('MULTIAGENT_ENABLED') !== 'false');
  const llmCallsEnabled = options.llmCallsEnabled ?? (getEnvVar('LLM_CALLS_ENABLED') !== 'false');
  const openaiEnabled = options.openaiEnabled ?? (getEnvVar('OPENAI_ENABLED') !== 'false');
  const apiKey = options.apiKey || getEnvVar('OPENAI_API_KEY');

  // Build minimized context package
  const contextPkg = buildSemanticContext(formDraft, ir);
  const ambiguousCount = contextPkg.ambiguous_elements.length;

  // Deterministic Zero-Token Check: If NO elements require AI, return early with 0 cost
  if (ambiguousCount === 0) {
    return {
      result: {
        status: 'SEMANTIC_MAPPING_COMPLETE',
        agent_id: 'AG-006',
        ambiguous_elements_received: 0,
        resolved_by_ai: 0,
        remaining_ambiguous: 0,
        semantic_repairs: 0,
        technical_retries: 0,
        requires_human_review: false,
        llm_used: false,
        provider: null,
        model: null,
        tokens: { input_tokens: 0, output_tokens: 0, cached_input_tokens: 0, estimated_cost_usd: 0 },
        latency_ms: Date.now() - startTime
      },
      updatedContract: formDraft
    };
  }

  // Graceful Fallback Mode (No API Key or Feature Flag Disabled)
  if (!multiagentEnabled || !llmCallsEnabled || !openaiEnabled || (!apiKey && !options.mockResponse)) {
    console.log('[AG-006 Semantic Mapper] IA deshabilitada o sin API Key. Retornando HUMAN_REVIEW_REQUIRED sin llamada de red.');
    return {
      result: {
        status: !openaiEnabled ? 'PROVIDER_DISABLED' : 'HUMAN_REVIEW_REQUIRED',
        agent_id: 'AG-006',
        ambiguous_elements_received: ambiguousCount,
        resolved_by_ai: 0,
        remaining_ambiguous: ambiguousCount,
        semantic_repairs: 0,
        technical_retries: 0,
        requires_human_review: true,
        llm_used: false,
        provider: null,
        model: null
      },
      updatedContract: formDraft
    };
  }

  let rawOutputPkg: any = null;
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let technicalRetries = 0;
  let semanticRepairs = 0;

  try {
    if (options.mockResponse) {
      // Execute with Mock Response for offline suite
      rawOutputPkg = options.mockResponse;
    } else {
      // Execute real GPT-4.1 Mini API Call
      const userPrompt = `SEMANTIC_CONTEXT:\n${JSON.stringify(contextPkg, null, 2)}`;
      const aiRes = await callOpenAIWithRetry(
        apiKey!,
        TARIFF_SNAPSHOT.model,
        AG006_SYSTEM_PROMPT,
        userPrompt,
        SEMANTIC_SCHEMA.schema,
        2
      );

      rawOutputPkg = aiRes.parsedOutput;
      inputTokens += aiRes.inputTokens;
      outputTokens += aiRes.outputTokens;
      cachedTokens += aiRes.cachedInputTokens;
    }

    // Step 1: Validate Model Output against FORM-SEM-VAL-001
    let valResult = validateSemanticOutputPackage(rawOutputPkg, contextPkg, formDraft);

    // Step 2: Controlled Semantic Repair Attempt (Max 1 Attempt if repairable)
    if (!valResult.isValid && !options.mockResponse && apiKey) {
      console.warn('[AG-006 Semantic Mapper] Primer intento falló validación semántica. Ejecutando 1 intento de reparación...');
      semanticRepairs++;

      const repairPrompt = `EL INTENTO ANTERIOR FUE RECHAZADO POR EL VALIDADOR CON LOS SIGUIENTES ERRORES:\n${JSON.stringify(valResult.errors, null, 2)}\n\nPOR FAVOR CORRIGE LA RESPUESTA CUMPLIENDO EL CONTRATO:\nSEMANTIC_CONTEXT:\n${JSON.stringify(contextPkg, null, 2)}`;
      
      const repairRes = await callOpenAIWithRetry(
        apiKey,
        TARIFF_SNAPSHOT.model,
        AG006_SYSTEM_PROMPT,
        repairPrompt,
        SEMANTIC_SCHEMA.schema,
        1
      );

      rawOutputPkg = repairRes.parsedOutput;
      inputTokens += repairRes.inputTokens;
      outputTokens += repairRes.outputTokens;

      valResult = validateSemanticOutputPackage(rawOutputPkg, contextPkg, formDraft);
    }

    // If validation fails after repair, return HUMAN_REVIEW_REQUIRED safely
    if (!valResult.isValid || !valResult.sanitizedPackage) {
      console.warn('[AG-006 Semantic Mapper] Validación semántica falló definitivamente:', valResult.errors);
      return {
        result: {
          status: 'HUMAN_REVIEW_REQUIRED',
          agent_id: 'AG-006',
          ambiguous_elements_received: ambiguousCount,
          resolved_by_ai: 0,
          remaining_ambiguous: ambiguousCount,
          semantic_repairs: semanticRepairs,
          technical_retries: technicalRetries,
          requires_human_review: true,
          llm_used: true,
          provider: 'OPENAI',
          model: TARIFF_SNAPSHOT.model
        },
        updatedContract: formDraft
      };
    }

    // Step 3: Execute Deterministic Semantic Merge
    const { updatedContract, mergedCount } = mergeSemanticDecisions(formDraft, valResult.sanitizedPackage);

    // Calculate Estimated USD Cost based on Tariff Model Snapshot
    const costInput = (inputTokens / 1_000_000) * TARIFF_SNAPSHOT.price_input_per_1m;
    const costOutput = (outputTokens / 1_000_000) * TARIFF_SNAPSHOT.price_output_per_1m;
    const estimatedCostUsd = Number((costInput + costOutput).toFixed(6));

    return {
      result: {
        status: 'SEMANTIC_MAPPING_COMPLETE',
        agent_id: 'AG-006',
        ambiguous_elements_received: ambiguousCount,
        resolved_by_ai: mergedCount,
        remaining_ambiguous: Math.max(ambiguousCount - mergedCount, 0),
        semantic_repairs: semanticRepairs,
        technical_retries: technicalRetries,
        requires_human_review: true,
        llm_used: true,
        provider: 'OPENAI',
        model: TARIFF_SNAPSHOT.model,
        output_package: valResult.sanitizedPackage,
        tokens: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cached_input_tokens: cachedTokens,
          estimated_cost_usd: estimatedCostUsd
        },
        latency_ms: Date.now() - startTime
      },
      updatedContract
    };

  } catch (err: any) {
    console.error('[AG-006 Semantic Mapper] Error técnico no recuperable:', err.message);
    return {
      result: {
        status: 'FAILED_RETRYABLE',
        agent_id: 'AG-006',
        ambiguous_elements_received: ambiguousCount,
        resolved_by_ai: 0,
        remaining_ambiguous: ambiguousCount,
        semantic_repairs: semanticRepairs,
        technical_retries: technicalRetries,
        requires_human_review: true,
        llm_used: true,
        provider: 'OPENAI',
        model: TARIFF_SNAPSHOT.model
      },
      updatedContract: formDraft
    };
  }
}
