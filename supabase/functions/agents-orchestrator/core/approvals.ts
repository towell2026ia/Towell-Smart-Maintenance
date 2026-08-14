// supabase/functions/agents-orchestrator/core/approvals.ts
// Approvals Manager implementing Governance v1.2 SHA-256 Canonical JSON Hashing.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AgentApproval } from '../types/agents.types.ts';

/**
 * Pure TypeScript Canonical JSON Stringifier (Governance v1.2)
 * Recursively sorts object keys alphabetically.
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalizeJson(item)).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys.map(key => JSON.stringify(key) + ':' + canonicalizeJson(obj[key]));
  return '{' + parts.join(',') + '}';
}

/**
 * Generates SHA-256 hex string using Web Crypto API (Deno compatible)
 */
export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Creates an approval request row in aprobaciones_agente with SHA-256 action hash (Level 2 Only).
 */
export async function createApprovalRequest(
  supabase: SupabaseClient | null,
  approval: {
    correlation_id: string;
    execution_id?: string;
    event_id?: string;
    agent_id: string;
    action_type: string;
    payload_snapshot: any;
  }
): Promise<{ success: boolean; id?: string; action_hash?: string; error?: string }> {
  try {
    const canonical = canonicalizeJson({
      action_type: approval.action_type,
      payload_snapshot: approval.payload_snapshot
    });

    const actionHash = await sha256Hex(canonical);

    const dbRow = {
      correlation_id: approval.correlation_id,
      execution_id: approval.execution_id || null,
      event_id: approval.event_id || null,
      agent_id: approval.agent_id,
      action_type: approval.action_type,
      action_hash: actionHash,
      payload_snapshot: approval.payload_snapshot,
      estatus: 'PENDIENTE_APROBACION',
      hash_algorithm: 'SHA-256',
      canonicalization_version: 'CANONICAL_JSON_V1'
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('aprobaciones_agente')
        .insert([dbRow])
        .select('id_aprobacion')
        .single();

      if (error) {
        console.error('[Approvals] Error inserting approval request:', error.message);
        return { success: false, action_hash: actionHash, error: error.message };
      }

      if (approval.event_id) {
        await supabase
          .from('eventos_agente')
          .update({ estatus: 'REQUIERE_APROBACION', fecha_actualizacion: new Date().toISOString() })
          .eq('id_evento', approval.event_id);
      }

      return { success: true, id: data.id_aprobacion, action_hash: actionHash };
    }

    return { success: true, id: `APP-LOCAL-${Date.now()}`, action_hash: actionHash };
  } catch (err: any) {
    console.error('[Approvals] Exception in createApprovalRequest:', err);
    return { success: false, error: err.message };
  }
}
