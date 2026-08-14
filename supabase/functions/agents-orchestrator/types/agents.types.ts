// supabase/functions/agents-orchestrator/types/agents.types.ts

export type AgentRama = 'ORCHESTRATION' | 'PLANEACION' | 'DATOS' | 'VIGILANCIA' | 'INTEGRACION' | 'CONFIABILIDAD';
export type AgentTipo = 'AGENTE' | 'MODULO';
export type AgentState = 'REGISTERED' | 'ROUTING_ONLY' | 'TRAINING' | 'EVALUATION' | 'READY' | 'SUSPENDED';

export interface Agent {
  agent_id: string;
  nombre: string;
  rama: AgentRama;
  tipo: AgentTipo;
  requires_ai: boolean;
  provider: 'openai' | 'mimo' | 'none';
  default_model: string;
  fallback_model: string | null;
  authority_level: number; // 0, 1, 2, 3
  activo: boolean;
  estado_implementacion?: AgentState;
  version: string;
}

export interface EventCatalogEntry {
  event_code: string;
  nombre_evento: string;
  agent_id_destino: string;
  es_conocido: boolean;
  datos_requeridos: string[]; // Array of strings
  secuencia_destinos?: string[]; // Optional multi-agent sequence, e.g. ["AG-009.2", "AG-009.3"]
}

export interface AgentEvent {
  id_evento?: string;
  event_id: string;
  correlation_id: string;
  idempotency_key: string;
  event_code: string;
  payload: Record<string, any>;
  estatus: 'PENDIENTE' | 'EN_PROCESO' | 'ENRUTADO' | 'COMPLETADO' | 'FALLIDO' | 'REQUIERE_APROBACION' | 'BLOQUEADO';
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export type ExecutionType = 
  | 'ROUTING_RULE' 
  | 'AI_CLASSIFICATION_NANO' 
  | 'AI_CLASSIFICATION_MINI' 
  | 'VALIDATION' 
  | 'APPROVAL_REQUEST' 
  | 'ROUTING_BLOCKED' 
  | 'AGENT_EXECUTION';

export interface AgentExecution {
  id_ejecucion?: string;
  execution_id: string;
  parent_execution_id?: string | null;
  event_id?: string | null; // UUID references eventos_agente
  correlation_id: string;
  agent_id: string;
  execution_type: ExecutionType;
  provider: 'openai' | 'mimo' | 'none' | null;
  model: string | null;
  key_alias?: 'AI_ROUTER_OPENAI' | 'AI_DOCUMENT_OPENAI' | 'AI_CORE_MIMO' | 'NONE' | null;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  reasoning_tokens: number;
  price_input_usd?: number;
  price_output_usd?: number;
  price_cache_usd?: number;
  pricing_version: string;
  estimated_cost_usd: number;
  status: 'SUCCESS' | 'FAILED' | 'FAILED_RETRYABLE' | 'REJECTED_VALIDATOR' | 'REQUIRES_HUMAN_ACTION';
  confidence?: number | null;
  reason_code?: string | null;
  target_agent?: string | null;
  result?: any;
  error_message?: string | null;
  agent_version?: string;
  prompt_version?: string;
  schema_version?: string;
  validator_version?: string;
  route_version?: string;
}

export interface AgentApproval {
  id_aprobacion?: string;
  correlation_id: string;
  execution_id?: string;
  event_id?: string; // UUID
  agent_id: string;
  action_type: string;
  action_hash?: string;
  payload_snapshot: any;
  estatus: 'PENDIENTE_APROBACION' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';
  aprobado_por?: string | null;
  fecha_respuesta?: string | null;
  comentarios?: string | null;
  hash_algorithm?: string;
  canonicalization_version?: string;
}

export interface NanoOutputFormat {
  event_code: string;
  target_agent: string;
  confidence: number;
  missing_fields: string[];
  risk_flags: string[];
  model_recommends_approval: boolean;
  reason_code: string;
}

export type RoutingStatusResult =
  | 'ENRUTADO'
  | 'BLOCKED_AGENT_DISABLED'
  | 'BLOCKED_AGENT_NOT_READY'
  | 'BLOCKED_AGENT_SUSPENDED'
  | 'INVALID_ROUTE'
  | 'INVALID_PAYLOAD'
  | 'INVALID_EVENT'
  | 'REQUIRES_INFORMATION'
  | 'PENDING_APPROVAL'
  | 'REQUIRES_HUMAN_ACTION'
  | 'DUPLICATE';
