// agents-client.js
// Cliente oficial de Agentes de TSM-AI (v3.3.6)
// Provee la interfaz desacoplada para interactuar con la infraestructura multiagente

(function () {
  const DEBUG_PREFIX = '[TSM-AI Agentes]';

  window.TSMAIAgents = {
    /**
     * Envía un evento a la cola del Capataz Orquestador.
     * @param {string} eventCode Código de evento en cat_eventos_agente (ej. 'PREVENTIVO_GENERAR')
     * @param {object} payload Datos del evento
     * @param {string|null} correlationId ID de correlación opcional para enlazar flujos
     * @param {object} options Opciones adicionales (ej: { async: true })
     * @returns {Promise<object>} Respuesta del servidor
     */
    dispatch: async function (eventCode, payload = {}, correlationId = null, options = {}) {
      console.log(`${DEBUG_PREFIX} Despachando evento:`, eventCode, payload);

      if (!useLiveDatabase || !supabaseClient) {
        console.warn(`${DEBUG_PREFIX} Modo Demo o Supabase desconectado. Simulando respuesta local.`);
        return {
          success: true,
          status: 'COMPLETADO_DEMO',
          correlation_id: correlationId || 'CORR-MOCK-LOCAL',
          result: {
            mensaje: 'Ejecutado localmente sin conexión a Supabase.'
          }
        };
      }

      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const accessToken = session?.access_token || '';

        const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
        const endpoint = supabaseUrl.replace('.supabase.co', '.supabase.co') + '/functions/v1/agents-orchestrator';

        const body = {
          event_code: eventCode.toUpperCase(),
          payload: payload,
          correlation_id: correlationId
        };

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : ''
        };

        // Si se solicita explícitamente procesamiento asíncrono (Punto 11)
        if (options.async === true) {
          headers['prefer'] = 'respond-async';
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(body)
        });

        const result = await response.json();
        
        if (!response.ok) {
          console.error(`${DEBUG_PREFIX} Error del servidor:`, result.error);
          return {
            success: false,
            status: 'FALLIDO',
            correlation_id: correlationId || 'CORR-FAILED',
            error: result.error || 'Error de enrutamiento en servidor'
          };
        }

        console.log(`${DEBUG_PREFIX} Respuesta recibida con éxito [Status: ${response.status}]:`, result);
        return result;

      } catch (err) {
        console.error(`${DEBUG_PREFIX} Excepción en el despacho del evento:`, err);
        return {
          success: false,
          status: 'FALLIDO',
          correlation_id: correlationId || 'CORR-EXCEPTION',
          error: err.message
        };
      }
    }
  };

  console.log(`${DEBUG_PREFIX} Módulo cargado e instalado en window.TSMAIAgents.`);
})();
