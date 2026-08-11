// supabase/functions/agents-orchestrator/types/agents.types.ts

export interface Agent {
  agent_id: string;
  nombre: string;
  rama: 'ORCHESTRATION' | 'PLANEACION' | 'DATOS' | 'VIGILANCIA' | 'INTEGRACION' | 'CONFIABILIDAD';
  tipo: 'AGENTE' | 'MODULO';
  requires_ai: boolean;
  provider: 'openai' | 'mimo' | 'none';
  default_model: string;
  fallback_model: string | null;
  authority_level: number; // 0, 1, 2, 3
  activo: boolean;
  version: string;
}

export interface EventCatalogEntry {
  event_code: string;
  nombre_evento: string;
  agent_id_destino: string;
  es_conocido: boolean;
  datos_requeridos: string[]; // Array of strings inside JSONB
}

export interface AgentEvent {
  id_evento: string;
  event_id: string;
  correlation_id: string;
  idempotency_key: string;
  event_code: string;
  payload: Record<string, any>;
  estatus: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'FALLIDO' | 'REQUIERE_APROBACION';
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface AgentExecution {
  id_ejecucion?: string;
  execution_id: string;
  event_id: string; // UUID references eventos_agente
  correlation_id: string;
  agent_id: string;
  execution_type: 'ROUTING_RULE' | 'AGENT_EXECUTION';
  provider: 'openai' | 'mimo' | 'none' | null;
  model: string | null;
  key_alias: 'AI_ROUTER_OPENAI' | 'AI_DOCUMENT_OPENAI' | 'AI_CORE_MIMO' | 'NONE' | null;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  reasoning_tokens: number;
  price_input_usd: number;
  price_output_usd: number;
  price_cache_usd: number;
  pricing_version: string;
  estimated_cost_usd: number;
  status: 'SUCCESS' | 'FAILED' | 'FAILED_RETRYABLE' | 'REJECTED_VALIDATOR';
  confidence: number | null;
  result: any;
  error_message: string | null;
}

export interface AgentApproval {
  id_aprobacion?: string;
  correlation_id: string;
  event_id: string; // UUID
  agent_id: string;
  tipo_accion: string;
  propuesta_payload: any;
  estatus: 'PENDIENTE_APROBACION' | 'APROBADO' | 'RECHAZADO';
  aprobado_por?: string | null;
  fecha_respuesta?: string | null;
  comentarios?: string | null;
}
