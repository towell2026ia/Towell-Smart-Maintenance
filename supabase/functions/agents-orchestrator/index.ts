// supabase/functions/agents-orchestrator/index.ts
// Entrypoint for the agents-orchestrator Supabase Edge Function (v1.2)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { executeAgentFlow } from './core/executor.ts';
import { validateUserAuthentication } from './core/validator.ts';

const ALLOWED_ORIGINS = [
  'https://tsmail-towell.netlify.app',
  'http://localhost:5500',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://localhost:8080'
];

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  // 1. Manejo de peticiones preflight CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin }
    });
  }

  try {
    const rawBody = await req.json();
    const event_code = rawBody.event_code || rawBody.event_type;
    const correlation_id = rawBody.correlation_id;

    if (!event_code) {
      return new Response(JSON.stringify({ error: 'event_code o event_type es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin }
      });
    }

    // Sanitización y extracción de payload y context (despojando controles de autoridad del cliente)
    const clientPayload = { ...(rawBody.payload || {}), context: rawBody.context || {} };
    const forbiddenClientKeys = [
      'agent_id', 'provider', 'model', 'approval_status', 'role_override',
      'is_admin', 'skip_approval', 'force_route', 'force_execute', 'create_ot', 'close_ot', 'execute_sql'
    ];
    for (const k of forbiddenClientKeys) {
      delete clientPayload[k];
      if (rawBody[k] !== undefined) delete rawBody[k];
    }

    // Inicializar cliente Supabase del proyecto usando las variables de entorno inyectadas
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://xqfpsavkefhrxfbtqzec.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || 'sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i';
    
    if (!supabaseUrl) {
      throw new Error('Supabase environment variable SUPABASE_URL missing in Edge Function.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Validación estricta del JWT de autenticación y rol de usuario en Servidor (P-05)
    const authHeader = req.headers.get('Authorization');
    const authValidation = await validateUserAuthentication(supabaseAdmin, authHeader, event_code);

    if (!authValidation.isAuthorized) {
      console.warn(`[Orchestrator] Bloqueado acceso no autorizado: ${authValidation.error}`);
      return new Response(JSON.stringify({ error: authValidation.error || 'No autorizado' }), {
        status: authValidation.isAuthenticated ? 403 : 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin }
      });
    }

    // Obtener variables de configuración y secretos para los proveedores
    const secrets = {
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') || '',
      MIMO_API_KEY: Deno.env.get('MIMO_API_KEY') || '',
      MULTIAGENT_ENABLED: Deno.env.get('MULTIAGENT_ENABLED') || 'true',
      LLM_CALLS_ENABLED: Deno.env.get('LLM_CALLS_ENABLED') || 'true',
      AI_ROUTER_ENABLED: Deno.env.get('AI_ROUTER_ENABLED') || 'true',
      OPENAI_ENABLED: Deno.env.get('OPENAI_ENABLED') || 'true',
      MIMO_ENABLED: Deno.env.get('MIMO_ENABLED') || 'true'
    };

    // 3. Dispatch Asíncrono (202 Accepted) si el cliente lo prefiere (Header 'Prefer: respond-async')
    // o por defecto para eventos que requieren IA / llamadas de larga duración.
    const preferAsync = req.headers.get('prefer') === 'respond-async' || event_code.toUpperCase() === 'TEXTO_AMBIGUO';

    if (preferAsync) {
      // Generar ID de correlación y evento temporal rápido
      const corrId = correlation_id || `CORR-ASYNC-${Date.now()}`.toUpperCase();
      const humanEventId = `EVT-ASYNC-${Date.now()}`.toUpperCase();

      console.log(`[Orchestrator] Dispatch Asíncrono (202 Accepted) para: ${event_code}`);
      
      // Iniciar el flujo de agentes en segundo plano
      executeAgentFlow(
        supabaseAdmin,
        event_code,
        clientPayload,
        corrId,
        secrets
      ).catch(err => {
        console.error('[Orchestrator] Error en background executeAgentFlow:', err);
      });

      return new Response(JSON.stringify({
        success: true,
        status: 'PENDIENTE',
        event_code: event_code.toUpperCase(),
        correlation_id: corrId,
        event_id: humanEventId,
        message: 'Evento recibido y puesto en cola de procesamiento asíncrono.'
      }), {
        status: 202, // 202 Accepted
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin }
      });
    }

    // Ejecución Síncrona normal (para reglas deterministicas de 0 tokens)
    const flowResult = await executeAgentFlow(
      supabaseAdmin,
      event_code,
      clientPayload,
      correlation_id || null,
      secrets
    );

    return new Response(JSON.stringify(flowResult), {
      status: flowResult.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin }
    });

  } catch (err: any) {
    console.error('[AgentsOrchestrator] Error en Deno.serve:', err);
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin }
    });
  }
});
