# AG-011 — Final Evaluation Report v1.0 (R1 Ratified)

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica y Lecciones Aprendidas`  
**Subfase:** `AG-011.4 — Final End-to-End Evaluation & Promotion Gate`  
**Corrección:** `AG-011.4-R1`  
**Fecha de Ratificación:** `2026-08-22`  
**Proveedor IA:** `OpenAI`  
**Effective Provider Model ID:** `gpt-4o-mini` (Certificado y único)  
**Runtime:** `Supabase Edge Functions / Deno 2.9.5`  
**Orquestador:** `AG-001 — Capataz`  
**Branch de Git:** `main`  
**Netlify develop:** `PAUSADO — NO DESPLEGAR`  
**Upstream Memory Model SHA-256:** `ce6ab889c09a2a721d3aedeaeb8c27b7d9881c66c212d0f62f7a9e0bf25096f7`  
**Composite Semantic Model SHA-256:** `5b0af7622d40c63ba5a8201f36248113b08468139d7b5f11cef2cf423e6dd6db`  
**Persistence Migration SHA-256:** `789a0e5d11054d4b44951feeb46e4cf462613c6c146792d60c8ad1cd5b965489`  
**Dataset Final:** `AG011-EVAL-001` (170 Casos: 102 Train, 34 Val, 34 Holdout en 16 Grupos)  
**Dataset SHA-256:** `2810d9be6bcfe054cbe0505435f9b30b8ca5c17e5a34709929bfe8686be965d9`  
**Holdout SHA-256:** `bf2f395986843b59139ba4f2ff7ab652a96734e899447affb3977e9cb34f1dbf`  
**Gate Maestro Ratificado:** `AG011_FINAL_GATE_PASS`  
**Freeze Maestro Ratificado:** `AG011-1.0-FROZEN`  
**Estado Promoción en BD:** `READY / activo=true / version=1.0`  
**Siguiente Componente:** `M-012 — Preparación de la OT`  

---

## 1. Resumen Ejecutivo y Métricas E2E de Certificación

### A. Resultados de la Suite E2E Completa (170 Casos)
```text
================================================================================
🏆 RESULTADOS DE EVALUACIÓN FINAL E2E (170 CASOS):
   - Training Split   (102 casos): 102 / 102 PASS (100.00%)
   - Validation Split  (34 casos):  34 /  34 PASS (100.00%)
   - Final Holdout     (34 casos):  34 /  34 PASS (100.00%)
   -----------------------------------------------------------------------------
   - Total Aserciones E2E:         1,252 / 1,252 PASS (100.00%)
   - Auditoría R1 Promoción:       40 / 40 PASS (100.00%)
   - Runtime Deno 2.9.5:           170 / 170 PASS -> DENO_EDGE_RUNTIME_TEST = PASS
   - Latencia Promedio E2E Deno:   1.56ms / caso
   - Auto-Aprobación por IA:       0 (AI_approved_memories = 0)
   - Inyección de Aprobación:      0 (approval_injection_success = 0)
   - Mutación In-Place de Versión: 0 (approved_version_in_place_mutations = 0)
   - Heredabilidad de Aprobación:  0 (approval_inheritance_on_material_change = 0)
   - Fuga de Candidatos:           0 (candidate_memory_in_productive_retrieval = 0)
   - Fuga de Superseded:           0 (superseded_memory_as_current = 0)
   - Fuga de Retired:              0 (retired_memory_as_active = 0)
   - Fuga Temporal Histórica:      0 (future_memory_leakage = 0)
   - Ciclos Auto-Reforzados:       0 (self_reinforcing_memory_loop = 0)
   - Trazabilidad de Evidencia:    100% (memory_traceability = 100%)
   - Creación de OTs por AG-011:   0 (OT_creation = 0)
   - Invariante Protected Field:   100% MATCH (protected_field_diff = 0)
   - Inmunidad a Prompt Injection: 100% (prompt_injection_success = 0)
   - Llamadas a Embeddings / Vec:  0 (DISABLED en v1)
================================================================================
```

### B. Contabilidad del Holdout Final (34 Casos)
- **Modos de Ejecución Reconciliados:**
  - `DETERMINISTIC_ONLY`: `0 casos`
  - `FAST_PATH`: `2 casos` (0 tokens, $0.00 USD)
  - `REAL_OPENAI`: `32 casos` (Llamadas auditadas para síntesis semántica)
  - Total: `34 casos` (`0 + 2 + 32 = 34`).
- **Telemetría de Tokens Reales del Holdout:**
  - `real_input_tokens`: `13,494 tokens`
  - `real_output_tokens`: `5,472 tokens`
  - `real_total_tokens`: `18,966 tokens` (Invariante: `13,494 + 5,472 = 18,966`).
- **Costos Reales Auditados del Holdout:**
  - Tarifa Oficial `gpt-4o-mini`: Input $0.15/1M, Output $0.60/1M
  - `cost_status`: `KNOWN`
  - `real_total_cost_usd`: `$0.005307 USD`
- **Latencia del Proveedor:**
  - `provider_timer_start_boundary`: Inmediatamente antes de invocar `callOpenAIWithRetry`.
  - `provider_timer_end_boundary`: Inmediatamente después de recibir el objeto parsed de OpenAI.
  - `provider_latency_avg_ms`: `0.97 ms`
  - `provider_latency_p95_ms`: `3.00 ms`
  - `pipeline_latency_ms`: `1.56 ms / caso` en Edge Runtime Deno 2.9.5.

---

## 2. Matriz Criptográfica de Manifests y Esquema Certificado

```text
================================================================================
PREFLIGHT CRIPTOGRÁFICO TRIPLE CERTIFICADO:
- MEMORY MODEL SHA-256:   ce6ab889c09a2a721d3aedeaeb8c27b7d9881c66c212d0f62f7a9e0bf25096f7
- SEMANTIC MODEL SHA-256: 5b0af7622d40c63ba5a8201f36248113b08468139d7b5f11cef2cf423e6dd6db
- MIGRATION SHA-256:      789a0e5d11054d4b44951feeb46e4cf462613c6c146792d60c8ad1cd5b965489

CORRESPONDENCIA 1-A-1 CERTIFICADA:
CONFIGURACIÓN CONGELADA = CONFIGURACIÓN CARGADA = CONFIGURACIÓN EJECUTADA = CONFIGURACIÓN EVALUADA
================================================================================
```

| Manifest / Entregable | Versión | Tipo / Propósito | Hash SHA-256 Individual |
| :--- | :---: | :--- | :--- |
| **`AG011-DATA-MAP-001`** | `1.0` | Arquitectura y Mapeo Ontológico de 8 Clases | `c40916a4bfe8a5ea5ef4d0ea2dbe34316dcf3824ee184d081f9b36ea72aeafc0` |
| **`AG011-MEMORY-ENGINE-001`** | `1.0` | Motor Determinístico de Construcción, Ciclo de Vida y Ranking | `ce6ab889c09a2a721d3aedeaeb8c27b7d9881c66c212d0f62f7a9e0bf25096f7` |
| **`AG011-SEMANTIC-LAYER-001`** | `1.0` | Capa Semántica GPT-4.1 Mini con Snapshot de Campos Protegidos | `5b0af7622d40c63ba5a8201f36248113b08468139d7b5f11cef2cf423e6dd6db` |
| **`AG011-EVAL-001`** | `1.0` | Dataset Maestro de 170 Casos (16 Grupos) | `2810d9be6bcfe054cbe0505435f9b30b8ca5c17e5a34709929bfe8686be965d9` |
| **`AG011-1.0-FROZEN`** | `1.0` | Freeze Maestro Oficial de Producción de AG-011 | `CERTIFIED` |

---

## 3. Estado de Promoción Oficial en Base de Datos

- **Migración SQL:** `supabase/migrations/20260822_007_ag011_promotion_v10.sql`
- **Registro en `cat_agentes`:**
  - `agent_id`: `AG-011`
  - `nombre`: `Memoria Técnica y Lecciones Aprendidas`
  - `rama`: `CONFIABILIDAD`
  - `tipo`: `AGENTE`
  - `requires_ai`: `true`
  - `provider`: `openai`
  - `default_model`: `gpt-4o-mini`
  - `default_temperature`: `0.1`
  - `authority_level`: `2`
  - `activo`: `true`
  - `estado_implementacion`: `READY`
  - `version`: `1.0`
- **Eventos Canónicos en `cat_eventos_agente`:**
  1. `TECHNICAL_MEMORY_QUERY_REQUESTED`
  2. `TECHNICAL_MEMORY_CANDIDATE_SUBMITTED`
  3. `TECHNICAL_MEMORY_REVIEW_REQUESTED`
  4. `TECHNICAL_MEMORY_VERSION_CREATED`

---

## 4. Transición a la Siguiente Fase

Con el cierre oficial de **`AG-011`**, la Rama E culmina su componente de conocimiento y da paso a:
👉 **`M-012 — Preparación de la OT`** (Módulo determinístico de preparación y aprovisionamiento de recursos de órdenes de trabajo).
