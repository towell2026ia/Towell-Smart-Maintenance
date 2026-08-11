// supabase/functions/agents-orchestrator/core/validator.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AuthValidationResult {
  isAuthenticated: boolean;
  userEmail: string | null;
  userRole: string | null;
  isAuthorized: boolean;
  error: string | null;
}

// Lista de eventos reservados únicamente para el Super Administrador
const ADMIN_RESERVED_EVENTS = [
  'PREVENTIVO_GENERAR',
  'PREDICTIVO_GENERAR',
  'AUTONOMO_GENERAR',
  'EXCEL_BASE_CARGADA',
  'EXCEL_FORMULARIO_CARGADO'
];

/**
 * Valida la autenticidad del JWT recibido y comprueba los roles y permisos (P-05)
 */
export async function validateUserAuthentication(
  supabase: SupabaseClient,
  authHeader: string | null,
  eventCode: string
): Promise<AuthValidationResult> {
  const cleanCode = (eventCode || "").toUpperCase().trim();

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      isAuthenticated: false,
      userEmail: null,
      userRole: null,
      isAuthorized: false,
      error: 'Token de autenticación Bearer faltante o inválido.'
    };
  }

  const token = authHeader.substring(7);

  try {
    // 1. Obtener el usuario autenticado desde Supabase Auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    
    if (authErr || !user) {
      return {
        isAuthenticated: false,
        userEmail: null,
        userRole: null,
        isAuthorized: false,
        error: authErr?.message || 'Usuario no autenticado o sesión expirada.'
      };
    }

    const email = user.email || '';

    // 2. Consultar el rol del usuario en la tabla cat_usuarios_roles
    const { data: userRoleRow, error: roleErr } = await supabase
      .from('cat_usuarios_roles')
      .select('rol')
      .eq('correo', email.toLowerCase().trim())
      .eq('activo', true)
      .maybeSingle();

    if (roleErr) {
      return {
        isAuthenticated: true,
        userEmail: email,
        userRole: null,
        isAuthorized: false,
        error: `Error al obtener rol del usuario: ${roleErr.message}`
      };
    }

    const role = userRoleRow?.rol || 'SOLICITANTE_PUBLICO';

    // 3. Matriz de permisos: Validar si el rol puede invocar este evento específico
    let isAuthorized = true;
    if (ADMIN_RESERVED_EVENTS.includes(cleanCode)) {
      isAuthorized = (role === 'SUPER_ADMINISTRADOR');
    }

    return {
      isAuthenticated: true,
      userEmail: email,
      userRole: role,
      isAuthorized: isAuthorized,
      error: isAuthorized ? null : `El usuario con rol '${role}' no está autorizado para ejecutar la acción '${cleanCode}'.`
    };

  } catch (err: any) {
    return {
      isAuthenticated: false,
      userEmail: null,
      userRole: null,
      isAuthorized: false,
      error: `Excepción durante validación de seguridad: ${err.message}`
    };
  }
}

/**
 * Validador determinístico de payloads del cliente para eventos conocidos
 */
export function validateEventPayload(
  eventCode: string,
  payload: Record<string, any>,
  requiredFields: string[]
): { isValid: boolean; error: string | null } {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, error: 'El payload no es un objeto válido.' };
  }

  // Filtrado de seguridad: Ignorar cualquier campo que intente alterar la lógica del Capataz (P-08)
  const maliciousKeys = ['agent_id', 'authority_level', 'requires_approval', 'provider', 'model'];
  for (const k of maliciousKeys) {
    if (k in payload) {
      delete payload[k]; // Se eliminan para evitar inyecciones de control desde el cliente
    }
  }

  for (const field of requiredFields) {
    if (!(field in payload) || payload[field] === undefined || payload[field] === null || payload[field] === '') {
      return {
        isValid: false,
        error: `Falta el campo obligatorio '${field}' requerido para el evento '${eventCode}'.`
      };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Validador determinístico de salidas generadas por agentes de IA (P-16)
 * Valida la firma del contrato y niveles mínimos de confianza.
 */
export function validateAgentOutput(
  agentId: string,
  output: any
): { isValid: boolean; error: string | null; confidence: number } {
  if (!output || typeof output !== 'object') {
    return { isValid: false, error: 'La respuesta del agente no es un JSON válido.', confidence: 0 };
  }

  // Validar campos del contrato obligatorio de cada agente
  const requiredKeys = ['status', 'findings', 'recommendations', 'requires_action', 'requires_approval'];
  for (const k of requiredKeys) {
    if (!(k in output)) {
      return {
        isValid: false,
        error: `La respuesta del agente no contiene la clave requerida '${k}'.`,
        confidence: 0
      };
    }
  }

  // Validar nivel de confianza semántica
  const confidence = typeof output.confidence === 'number' ? output.confidence : 1.0;
  if (confidence < 0.80) {
    return {
      isValid: false,
      error: `Confianza insuficiente del clasificador (${confidence} < 0.80).`,
      confidence
    };
  }

  return { isValid: true, error: null, confidence };
}
