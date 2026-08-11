// supabase/functions/agents-orchestrator/index.ts
// Entrypoint for the agents-orchestrator Supabase Edge Function

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { executeAgentFlow } from './core/executor.ts';

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
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Obtener variables de configuración y secretos para los proveedores
    const secrets = {
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
      MIMO_API_KEY: Deno.env.get('MIMO_API_KEY'),
      AI_AGENTS_ENABLED: Deno.env.get('AI_AGENTS_ENABLED') || 'false'
    };

    // Lanzar el flujo del orquestador Capataz
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
