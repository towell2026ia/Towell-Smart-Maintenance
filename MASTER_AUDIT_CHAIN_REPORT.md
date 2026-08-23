# MASTER_AUDIT_CHAIN_REPORT — Towell Smart Maintenance AI v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Fase:** `MASTER MULTI-AGENT ARCHITECTURE & PRODUCTION READINESS REVIEW`  
**Versión:** `1.0`  
**Fecha de Auditoría:** 2026-08-23  
**Orquestador General:** `AG-001 — CAPATAZ`  

---

## 1. Cadena de Correlación de Auditoría Integral

Cada petición u operación a través de `agents-orchestrator` genera y preserva la siguiente tupla de identidad unívoca:

```text
[REQUEST_ID] ──→ [EVENT_ID] ──→ [CORRELATION_ID] ──→ [AGENT_ID] ──→ [ATTEMPT_NUMBER]
```

### Estructura de Registro en `ejecuciones_agente`

1. **Ejecuciones Determinísticas (`requires_ai = false`):**
   ```json
   {
     "correlation_id": "CORR-20260823-XYZ",
     "agent_id": "M-011",
     "execution_type": "DETERMINISTIC_CALCULATION",
     "provider": "NONE",
     "model": "NONE",
     "tokens": { "input": 0, "output": 0, "total": 0 },
     "cost_usd": 0.0,
     "cost_status": "NOT_APPLICABLE",
     "duration_ms": 1.45,
     "status": "SUCCESS",
     "deterministic_model_sha256": "bb8844...",
     "result": { "health_score": 85.0, "risk_score": 15.0 }
   }
   ```

2. **Ejecuciones Semánticas / Híbridas (`requires_ai = true`):**
   ```json
   {
     "correlation_id": "CORR-20260823-ABC",
     "agent_id": "AG-013",
     "execution_type": "AGENT_EXECUTION",
     "provider": "Xiaomi MiMo",
     "model": "mimo-v2.5",
     "tokens": { "input": 1498, "output": 1530, "total": 3028 },
     "cost_usd": 0.00063510,
     "cost_status": "KNOWN",
     "duration_ms": 31356,
     "status": "SUCCESS",
     "deterministic_model_sha256": "a1aa2b51ec1ed66c4d5b0f818ba0f11d23f875751017dbb6816626551cc8feab",
     "semantic_model_sha256": "111f596f1de92aa31832dac45dab2ac1b4151cec911e064c3a6cda7a719799b3",
     "protected_field_diff": 0,
     "result": { "summary": "...", "population_insights": "..." }
   }
   ```

---

## 2. Arquitectura Asíncrona y Resiliencia para Operaciones de Larga Duración

Para mitigar el riesgo operacional derivado de latencias elevadas en proveedores de IA (como el P95 de MiMo observado en AG-013):

```text
CLIENTE / UI (Navegador)
       │  POST /agents-orchestrator (Header: Prefer: respond-async)
       ▼
ORQUESTADOR EDGE FUNCTION (AG-001)
       │  1. Genera correlation_id e inserta estado 'QUEUED'
       │  2. Retorna inmediatamente HTTP 202 Accepted { correlation_id, status: 'QUEUED' }
       ▼
WORKFLOW ASÍNCRONO EN BACKGROUND
       │  1. Transición a 'PROCESSING'
       │  2. Ejecuta motor determinístico (0.2 ms)
       │  3. Invoca MiMo v2.5 con Backoff Exponencial y Jitter (hasta 3 reintentos)
       │  4. En caso de fallo de IA, preserva resultado determinístico (Degradación Elegante)
       │  5. Registra telemetría exacta en ejecuciones_agente y actualiza estado a 'COMPLETED' / 'FAILED'
       ▼
CLIENTE / POLLING O SUPABASE REALTIME
          Actualización instantánea en UI sin colapsar la conexión HTTP
```

### Catálogo de Estados de Ejecución en UI:
- `QUEUED`: En cola de procesamiento.
- `PROCESSING`: En ejecución activa de análisis / LLM.
- `REQUIRES_APPROVAL`: Pausado formalmente esperando acción humana (Nivel 2 / 3).
- `COMPLETED`: Finalizado con éxito y resultado auditado.
- `FAILED`: Error registrado sin mutaciones corruptas.

---

## 3. Política de Degradación Elegante ante Falla del Proveedor de IA

Si la llamada al proveedor de IA falla tras agotar todos los reintentos:
- **`DETERMINISTIC RESULT = PRESERVED AND RETURNED`** (la clasificación, el score, los planes y el ranking matemático son 100% entregados al usuario).
- **`SEMANTIC EXPLANATION = FAILED / FALLBACK NOTATION`** (se documenta la indisponibilidad temporal de la explicación sin alterar los datos certificados).
