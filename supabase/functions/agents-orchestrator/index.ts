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
    const { event_code, payload, correlation_id } = await req.json();

    if (!event_code) {
      return new Response(JSON.stringify({ error: 'event_code es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin }
      });
    }

    // Inicializar cliente Supabase del proyecto usando las variables de entorno inyectadas
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables (URL/ServiceRoleKey) missing in Edge Function.');
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
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
      MIMO_API_KEY: Deno.env.get('MIMO_API_KEY'),
      MULTIAGENT_ENABLED: Deno.env.get('MULTIAGENT_ENABLED'),
      LLM_CALLS_ENABLED: Deno.env.get('LLM_CALLS_ENABLED'),
      AI_ROUTER_ENABLED: Deno.env.get('AI_ROUTER_ENABLED'),
      OPENAI_ENABLED: Deno.env.get('OPENAI_ENABLED'),
      MIMO_ENABLED: Deno.env.get('MIMO_ENABLED')
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
        payload || {},
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
      payload || {},
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
