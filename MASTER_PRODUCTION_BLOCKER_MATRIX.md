# MASTER_PRODUCTION_BLOCKER_MATRIX — Towell Smart Maintenance AI v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Fase:** `MASTER MULTI-AGENT ARCHITECTURE & PRODUCTION READINESS REVIEW`  
**Subfase:** `MASTER-001-R1 — Blocker Closure & Final Production Ratification`  
**Versión:** `1.0`  
**Fecha de Ratificación:** 2026-08-23  
**Orquestador General:** `AG-001 — CAPATAZ`  
**Estado de Arquitectura:** **`TSMAI_MASTER_ARCHITECTURE_PASS` ✅**  
**Estado Productivo:** **`TSMAI_MULTIAGENT_PRODUCTION_READY_BLOCKED` 🛑**  

---

## 1. Matriz Maestra de Bloqueadores y Riesgos de Producción

| ID | Blocker / Riesgo | Categoría | Componente Afectado | Impacto en Producción | Acción de Remediación Requerida | Prueba de Verificación | Evidencia Registrada | Estado |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- | :---: |
| **`MASTER-BLOCKER-AG006-001`** | Verificación real de proveedor OpenAI pendiente (`HTTP 401`) | **BLOCKER ABSOLUTO** | `AG-006` (Constructor de Formularios) | Impide declarar `READY` al 100% de los agentes. AG-006 opera con fallback determinístico funcional. | Suministrar una `OPENAI_API_KEY` válida en el entorno server-side y ejecutar el holdout real de 12 casos. | `tests/ag006_4_real_provider_test.js` | Adaptador central [`providers/openai-adapter.ts`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/providers/openai-adapter.ts) configurado a `gpt-4o-mini` (100% central). Credencial actual retorna `401 invalid_api_key`. | **`OPEN`** |
| **`MASTER-BLOCKER-SECURITY-001`** | Credencial de Servicio Histórica Expuesta en Scratch | **SEGURIDAD / CREDENCIALES** | Base de Datos Supabase / Auth | Riesgo de acceso no autorizado si la llave antigua siguiera activa. | 1. Considerar revocada/invalidad la llave antigua.<br>2. Rotar llave en Supabase Dashboard.<br>3. Almacenar llave nueva exclusivamente en secrets de Edge Functions.<br>4. Verificar 0 secretos en repositorio y cliente. | Scan de repositorio y cliente (`grep_search`) | `client_exposed_secrets = 0`<br>`repository_active_secrets = 0`<br>`old_service_role_key_active = false`<br>`git_history_status = HISTORY_CONTAINS_REVOKED_SECRET_CRYPTOGRAPHICALLY_INVALID` | **`CLOSED (TSMAI_SECRET_REMEDIATION_PASS)`** |
| **`MASTER-RISK-PERFORMANCE-001`** | Latencia P95 de Xiaomi MiMo (~15.6 min en AG-013) | **RESILIENCIA / OPERACIÓN** | `AG-013` (Malos Actores) / `AG-001` | Posible timeout en navegadores si las llamadas a LLM se ejecutan síncronamente. | 1. Implementar flujo asíncrono `HTTP 202 Accepted`.<br>2. Catálogo de estados en UI (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `REQUIRES_APPROVAL`).<br>3. Política de reintentos exponenciales con jitter (máx 3).<br>4. Degradación elegante (preservar cálculo determinístico si LLM falla). | `run_master_deno_e2e.ts` (Escenarios 17, 20) | Arquitectura asíncrona documentada en [`MASTER_AUDIT_CHAIN_REPORT.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/MASTER_AUDIT_CHAIN_REPORT.md) y validada en Deno 2.9.5. | **`CLOSED (ASYNC_RESILIENCE_PASS)`** |

---

## 2. Condición de Liberación del Production Readiness Gate

Para transformar el estado global de **`TSMAI_MULTIAGENT_PRODUCTION_READY_BLOCKED`** a **`TSMAI_MULTIAGENT_PRODUCTION_READY_PASS`**, se requiere exclusivamente:

1. **Cierre de `MASTER-BLOCKER-AG006-001`**:
   - Ingresar una clave válida de OpenAI (`OPENAI_API_KEY`) en el entorno de Supabase Edge Functions.
   - Ejecutar la suite real: `node supabase/functions/agents-orchestrator/tests/ag006_4_real_provider_test.js`.
   - Obtener `successful_real_provider_calls = 12 / 12` con `HTTP 200`.
   - Emitir `AG006_FINAL_GATE_PASS` y congelar `AG006-1.0-FROZEN`.
   - Promover `AG-006` en `cat_agentes` a `READY` (`activo = true`, `version = 1.0`).
