// supabase/functions/invite-user/index.ts
// Edge Function: Invitar usuario nuevo a TSM-AI via Supabase Auth Admin API
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://tsmail-towell.netlify.app",
  "http://localhost:5500",
  "http://localhost:3000",
  "http://127.0.0.1:5500"
];

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin }
    });
  }

  try {
    const { email, nombre, rol, redirectTo } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "email es requerido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || "https://tsmail-towell.netlify.app",
      data: { nombre_completo: nombre || "", rol: rol || "SOLICITANTE_PUBLICO" }
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin }
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: data.user?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": corsOrigin }
    });
  }
});
