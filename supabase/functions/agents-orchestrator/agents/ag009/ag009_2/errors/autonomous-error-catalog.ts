// supabase/functions/agents-orchestrator/agents/ag009/ag009_2/errors/autonomous-error-catalog.ts
// Standard Error Catalog for AG-009.2 Conector Autónomo v1.0 (§53 PRD)

export interface AutonomousErrorDetail {
  code: string;
  category: 'CONTRACT' | 'CATALOG' | 'SCHEDULE' | 'CHECKLIST' | 'RESPONSE' | 'FINDING' | 'STATE' | 'SYSTEM' | 'SECURITY';
  isRetryable: boolean;
  defaultMessage: string;
}

export const AUTONOMOUS_ERROR_CATALOG: Record<string, AutonomousErrorDetail> = {
  INVALID_EVENT: {
    code: 'INVALID_EVENT',
    category: 'CONTRACT',
    isRetryable: false,
    defaultMessage: 'El evento proporcionado no cumple con el formato o encabezado requerido.'
  },
  INVALID_CONTRACT: {
    code: 'INVALID_CONTRACT',
    category: 'CONTRACT',
    isRetryable: false,
    defaultMessage: 'El payload no se adhiere al contrato AUTONOMOUS-SCHEDULE-001 o AUTONOMOUS-FINDING-001.'
  },
  INVALID_SOURCE: {
    code: 'INVALID_SOURCE',
    category: 'CONTRACT',
    isRetryable: false,
    defaultMessage: 'La fuente del evento no es válida para el flujo de Mantenimiento Autónomo (debe ser AUTONOMO).'
  },
  MACHINE_NOT_FOUND: {
    code: 'MACHINE_NOT_FOUND',
    category: 'CATALOG',
    isRetryable: false,
    defaultMessage: 'La máquina solicitada no existe en el catálogo maestro cat_maquinas.'
  },
  MACHINE_INACTIVE: {
    code: 'MACHINE_INACTIVE',
    category: 'CATALOG',
    isRetryable: false,
    defaultMessage: 'La máquina solicitada se encuentra inactiva (activo = false).'
  },
  AUTONOMOUS_SCHEDULE_NOT_FOUND: {
    code: 'AUTONOMOUS_SCHEDULE_NOT_FOUND',
    category: 'SCHEDULE',
    isRetryable: false,
    defaultMessage: 'No se encontró la programación semanal en el calendario autónomo para la semana y máquina indicadas.'
  },
  AUTONOMOUS_EXECUTION_DUPLICATE: {
    code: 'AUTONOMOUS_EXECUTION_DUPLICATE',
    category: 'SCHEDULE',
    isRetryable: false,
    defaultMessage: 'Ya existe un levantamiento autónomo ejecutado para esta misma máquina en la misma semana.'
  },
  AUTONOMOUS_CHECKLIST_NOT_FOUND: {
    code: 'AUTONOMOUS_CHECKLIST_NOT_FOUND',
    category: 'CHECKLIST',
    isRetryable: false,
    defaultMessage: 'No se encontró el checklist de mantenimiento autónomo activo.'
  },
  AUTONOMOUS_CHECKLIST_INCOMPLETE: {
    code: 'AUTONOMOUS_CHECKLIST_INCOMPLETE',
    category: 'CHECKLIST',
    isRetryable: false,
    defaultMessage: 'El checklist no cubre los 5 bloques obligatorios (Vibración, Limpieza, Lubricación, Temperatura, Cableado).'
  },
  TEMPERATURE_BLOCK_MISSING: {
    code: 'TEMPERATURE_BLOCK_MISSING',
    category: 'CHECKLIST',
    isRetryable: false,
    defaultMessage: 'El bloque obligatorio de Temperatura no está presente en el checklist autónomo.'
  },
  MISSING_REQUIRED_RESPONSE: {
    code: 'MISSING_REQUIRED_RESPONSE',
    category: 'RESPONSE',
    isRetryable: false,
    defaultMessage: 'Falta respuesta en un campo obligatorio del checklist autónomo.'
  },
  INVALID_RESPONSE_TYPE: {
    code: 'INVALID_RESPONSE_TYPE',
    category: 'RESPONSE',
    isRetryable: false,
    defaultMessage: 'El tipo de dato de la respuesta no coincide con el tipo esperado (YES_NO, NUMERIC, SELECT, TEXT).'
  },
  OUT_OF_RANGE_RESPONSE: {
    code: 'OUT_OF_RANGE_RESPONSE',
    category: 'RESPONSE',
    isRetryable: false,
    defaultMessage: 'El valor numérico de la respuesta excede los rangos operativos de referencia.'
  },
  INVALID_FINDING: {
    code: 'INVALID_FINDING',
    category: 'FINDING',
    isRetryable: false,
    defaultMessage: 'La estructura del hallazgo no cumple con el contrato AUTONOMOUS-FINDING-001.'
  },
  DUPLICATE_FINDING: {
    code: 'DUPLICATE_FINDING',
    category: 'FINDING',
    isRetryable: false,
    defaultMessage: 'El hallazgo ya ha sido emitido y registrado previamente en el sistema.'
  },
  INVALID_STATE_TRANSITION: {
    code: 'INVALID_STATE_TRANSITION',
    category: 'STATE',
    isRetryable: false,
    defaultMessage: 'Transición de estado del flujo autónomo inválida o no permitida.'
  },
  UNAUTHORIZED_ACTION_ATTEMPT: {
    code: 'UNAUTHORIZED_ACTION_ATTEMPT',
    category: 'SECURITY',
    isRetryable: false,
    defaultMessage: 'Intento de escalamiento de privilegios o parámetro de autoridad no permitido detectado.'
  },
  DIRECT_OT_CREATION_BLOCKED: {
    code: 'DIRECT_OT_CREATION_BLOCKED',
    category: 'SECURITY',
    isRetryable: false,
    defaultMessage: 'El flujo Autónomo tiene estrictamente prohibido crear directamente una Orden de Trabajo.'
  },
  PERSISTENCE_ERROR: {
    code: 'PERSISTENCE_ERROR',
    category: 'SYSTEM',
    isRetryable: true,
    defaultMessage: 'Error al persistir la información del flujo autónomo en la base de datos.'
  },
  AGENT_CONNECTOR_DISABLED: {
    code: 'AGENT_CONNECTOR_DISABLED',
    category: 'SYSTEM',
    isRetryable: false,
    defaultMessage: 'El conector AG-009.2 se encuentra deshabilitado por Feature Flag.'
  }
};

export class AutonomousConnectorError extends Error {
  public readonly code: string;
  public readonly category: string;
  public readonly isRetryable: boolean;
  public readonly details?: Record<string, any>;

  constructor(code: string, customMessage?: string, details?: Record<string, any>) {
    const errorDef = AUTONOMOUS_ERROR_CATALOG[code] || {
      code,
      category: 'SYSTEM',
      isRetryable: false,
      defaultMessage: customMessage || 'Error no catalogado en conector autónomo.'
    };

    super(customMessage || errorDef.defaultMessage);
    this.name = 'AutonomousConnectorError';
    this.code = errorDef.code;
    this.category = errorDef.category;
    this.isRetryable = errorDef.isRetryable;
    this.details = details;
  }
}
