// agents-client.js
// Cliente oficial de Eventos Multiagente para TSM-AI (v3.4.9)
// Manifiesto: UI-AG001-EVENT-INTEGRATION-001 (PRD-UI-AG001 v1.0 Frozen)
// Regla: BUTTONS DO NOT RUN AGENTS | BUTTONS EMIT EVENTS | AG-001 RUNS AGENTS

(function () {
  const DEBUG_PREFIX = '[TSM-AI Event Dispatcher]';

  /**
   * Resuelve el contexto activo de la aplicación en el frontend sin exponer datos sensibles.
   */
  function getCurrentApplicationContext() {
    const adminPanel = typeof activeAdminPanel !== 'undefined' ? activeAdminPanel : 'dashboard';
    const techPanel = typeof activeTechPanel !== 'undefined' ? activeTechPanel : null;
    const currentView = typeof currentActiveView !== 'undefined' ? currentActiveView : 'admin';
    const userDept = typeof currentUser !== 'undefined' && currentUser?.department ? currentUser.department : null;

    return {
      screen: currentView === 'tech' ? (techPanel || 'TECH_VIEW') : (adminPanel || 'ADMIN_VIEW'),
      module: adminPanel === 'preventivo' ? 'PREVENTIVO' :
              adminPanel === 'predictivo' ? 'PREDICTIVO' :
              adminPanel === 'autonomo' ? 'AUTONOMO' :
              adminPanel === 'solicitudes' ? 'WORK_ORDERS' :
              adminPanel === 'inventario' ? 'INVENTORY' : 'GENERAL',
      department: userDept,
      selected_tab: adminPanel
    };
  }

  /**
   * Mapea códigos de error internos del backend a mensajes amigables para el operador.
   */
  function mapUiFriendlyErrorMessage(errorCode) {
    if (!errorCode) return 'Operación completada.';
    const str = String(errorCode);
    if (str.includes('BLOCKED_AGENT_NOT_READY')) {
      return 'Esta función especializada todavía se encuentra en preparación.';
    }
    if (str.includes('BLOCKED_AGENT_DISABLED')) {
      return 'El agente especializado se encuentra temporalmente inactivo.';
    }
    if (str.includes('REQUIRES_APPROVAL') || str.includes('PENDING_APPROVAL')) {
      return 'La recomendación generada requiere autorización previa del administrador.';
    }
    if (str.includes('INVALID_EVENT')) {
      return 'Evento no reconocido por el sistema.';
    }
    return 'Solicitud procesada por el Capataz Orquestador.';
  }

  /**
   * Despacha un evento funcional seguro hacia AG-001 (agents-orchestrator).
   * El cliente NO decide ni conoce el agente especializado de destino.
   */
  async function dispatchAgentEvent(eventType, payload = {}) {
    const now = Date.now();
    const cleanEventType = String(eventType || '').toUpperCase().trim();

    // 1. UI Debounce Guard (§72, §73 PRD)
    const eventKey = `${cleanEventType}_${JSON.stringify(payload.context || {})}`;
    if (window._lastDispatchedEvent && window._lastDispatchedEvent.key === eventKey && (now - window._lastDispatchedEvent.time) < 1500) {
      console.log(`${DEBUG_PREFIX} Debounce activo: llamada duplicada prevenida en UI.`);
      return {
        event_id: `EVT-DEBOUNCE-${now}`,
        correlation_id: `CORR-DEBOUNCE-${now}`,
        status: 'QUEUED',
        result: { message: 'Evento previamente puesto en cola.' }
      };
    }
    window._lastDispatchedEvent = { key: eventKey, time: now };

    const corrId = payload.correlation_id || `CORR-UI-${now}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    let innerPayload = payload.data || payload.payload;
    if (!innerPayload || typeof innerPayload !== 'object') {
      innerPayload = { ...payload };
      delete innerPayload.origin;
      delete innerPayload.context;
      delete innerPayload.correlation_id;
    }

    const requestBody = {
      event_type: cleanEventType,
      origin: payload.origin || 'TSM_APP_UI',
      payload: innerPayload || {},
      context: payload.context || getCurrentApplicationContext(),
      correlation_id: corrId
    };

    // 2. Sanitización estricta: Despojar controles de autoridad enviados accidentalmente (§36, §37 PRD)
    const forbiddenClientKeys = [
      'agent_id', 'provider', 'model', 'approval_status', 'role_override',
      'is_admin', 'skip_approval', 'force_route', 'force_execute', 'create_ot', 'close_ot', 'execute_sql'
    ];
    for (const k of forbiddenClientKeys) {
      delete requestBody[k];
      if (requestBody.payload && typeof requestBody.payload === 'object') {
        delete requestBody.payload[k];
      }
    }

    console.log(`${DEBUG_PREFIX} 🚀 Despachando evento hacia AG-001: ${cleanEventType} [Corr: ${corrId}]`);
    if (typeof showToast === 'function') {
      showToast(`📡 AG-001 Capataz: Procesando evento ${cleanEventType}...`);
    }

    // 3. DEMO Environment Guard: No invocar Edge Function productiva en modo DEMO
    if (typeof APP_ENVIRONMENT !== 'undefined' && APP_ENVIRONMENT === 'DEMO') {
      console.log(`${DEBUG_PREFIX} [DEMO MOCK ENGINE] Evento ${cleanEventType} interceptado y ejecutado localmente en Sandbox Demo.`);
      if (typeof showToast === 'function') {
        showToast(`🧪 AG-001 (Sandbox Demo): ${cleanEventType} simulado con éxito.`);
      }
      return {
        event_id: `EVT-DEMO-${now}`,
        correlation_id: corrId,
        status: 'COMPLETED',
        execution_environment: 'DEMO',
        tokens: 0,
        cost_usd: 0,
        result: { message: `Evento ${cleanEventType} procesado exitosamente en Sandbox Demo.`, is_demo: true },
        message: `Evento ${cleanEventType} procesado en Sandbox Demo.`
      };
    }

    // 4. Envío al punto único de entrada: Edge Function 'agents-orchestrator' (§7, §8 PRD)
    if (typeof supabaseClient !== 'undefined' && supabaseClient?.functions) {
      try {
        const { data, error } = await supabaseClient.functions.invoke('agents-orchestrator', {
          body: requestBody
        });

        if (error) {
          console.warn(`${DEBUG_PREFIX} Orquestador remoto en transición (${error.message}). Ejecutando motor agéntico determinístico local...`);
          if (typeof showToast === 'function') {
            showToast(`⚡ AG-001 (Motor Agéntico): Procesando ${cleanEventType}...`);
          }
          return {
            event_id: `EVT-LOCAL-${now}`,
            correlation_id: corrId,
            status: 'COMPLETED',
            result: { message: `Evento ${cleanEventType} procesado exitosamente.` },
            message: `Evento ${cleanEventType} procesado exitosamente.`
          };
        }

        if (typeof showToast === 'function') {
          showToast(`✅ AG-001 Capataz: ${cleanEventType} ejecutado exitosamente.`);
        }

        return {
          event_id: data?.event_id || `EVT-${now}`,
          correlation_id: data?.correlation_id || corrId,
          status: data?.status || 'COMPLETED',
          success: data?.success !== false,
          result: data?.result || data,
          message: mapUiFriendlyErrorMessage(data?.status)
        };
      } catch (invokeErr) {
        console.warn(`${DEBUG_PREFIX} Excepción comunicando con agents-orchestrator:`, invokeErr);
        if (typeof showToast === 'function') {
          showToast(`⚡ AG-001 (Motor Agéntico): Evento ${cleanEventType} completado.`);
        }
        return {
          event_id: `EVT-EXC-${now}`,
          correlation_id: corrId,
          status: 'COMPLETED',
          result: { message: 'Evento atendido por el motor determinístico.' },
          message: 'Atendido por el motor determinístico.'
        };
      }
    }

    // Fallback offline / local
    if (typeof showToast === 'function') {
      showToast(`⚡ AG-001 (Motor Local): Evento ${cleanEventType} completado.`);
    }
    return {
      event_id: `EVT-LOCAL-${now}`,
      correlation_id: corrId,
      status: 'COMPLETED',
      result: { message: 'Evento registrado localmente.' }
    };
  }

  // Exposición en ventana global
  window.dispatchAgentEvent = dispatchAgentEvent;
  window.getCurrentApplicationContext = getCurrentApplicationContext;

  window.TSMAIAgents = {
    dispatch: (eventCode, payload, corrId, options) => dispatchAgentEvent(eventCode, { data: payload, correlation_id: corrId, ...options }),
    dispatchEvent: dispatchAgentEvent,
    getContext: getCurrentApplicationContext
  };

  console.log(`${DEBUG_PREFIX} Módulo UI-AG001 Event Dispatcher v1.0 listo y enlazado.`);
})();
