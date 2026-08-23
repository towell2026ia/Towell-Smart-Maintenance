# MASTER_PROVIDER_AGENT_MATRIX — Towell Smart Maintenance AI v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Fase:** `MASTER MULTI-AGENT ARCHITECTURE & PRODUCTION READINESS REVIEW`  
**Versión:** `1.0`  
**Fecha de Certificación:** 2026-08-23  
**Orquestador General:** `AG-001 — CAPATAZ`  

---

## 1. Matriz Integral de Gobernanza de Proveedores de IA

| Entidad / Agente | Nombre | Rama | Proveedor Autorizado | Modelo Configurado | Modelo Solicitado | Modelo Efectivo Certificado | Adaptador Central Utilizado | Requiere IA (`requires_ai`) | Estado de Conexión |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`AG-001`** | Capataz Orquestador | Core | `OpenAI` | `gpt-4o-mini` | `gpt-4o-mini` | `gpt-4o-mini` | `providers/openai-adapter.ts` | `true` | Ready |
| **`AG-002`** | Preventivo Anual | RAMA A | `Xiaomi MiMo` | `mimo-v2.5` | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | Certified |
| **`AG-003`** | Predictivo Mensual | RAMA A | `Xiaomi MiMo` | `mimo-v2.5` | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | Certified |
| **`AG-004`** | Autónomo Semanal | RAMA A | `Xiaomi MiMo` | `mimo-v2.5` | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | Certified |
| **`AG-005`** | Auditor de Bases | RAMA B | `NONE` | `NONE` | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | Certified |
| **`AG-006`** | Constructor de Formularios | RAMA B | `OpenAI` | `gpt-4o-mini` | `gpt-4o-mini` | `gpt-4o-mini` | `providers/openai-adapter.ts` | `true` | Evaluation (Pending Key) |
| **`AG-007`** | Presupuestos y Costos | RAMA C | `Xiaomi MiMo` | `mimo-v2.5` | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | Certified |
| **`AG-008`** | Fallas, Tendencias y Reincidencias | RAMA C | `Xiaomi MiMo` | `mimo-v2.5` | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | Certified |
| **`AG-009`** | Gestor Formularios–Solicitudes–OT | RAMA D | `NONE` | `NONE` | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | Certified |
| **`AG-009.1`** | Conector Preventivo | RAMA D | `NONE` | `NONE` | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | Certified |
| **`AG-009.2`** | Conector Autónomo | RAMA D | `NONE` | `NONE` | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | Certified |
| **`AG-009.3`** | Conector Correctivo | RAMA D | `NONE` | `NONE` | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | Certified |
| **`M-010`** | Expediente Único del Activo (Asset360) | RAMA E | `NONE` | `NONE` | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | Certified |
| **`M-011`** | Índice de Salud y Riesgo | RAMA E | `NONE` | `NONE` | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | Certified |
| **`AG-010`** | Cinco Porqués y Casos Anteriores | RAMA E | `Xiaomi MiMo` | `mimo-v2.5` | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | Certified |
| **`AG-011`** | Memoria Técnica | RAMA E | `OpenAI` | `gpt-4o-mini` | `gpt-4o-mini` | `gpt-4o-mini` | `providers/openai-adapter.ts` | `true` | Certified |
| **`M-012`** | Preparación de la OT | RAMA E | `NONE` | `NONE` | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | Certified |
| **`M-013`** | Control de Seguridad | RAMA E | `NONE` | `NONE` | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | Certified |
| **`AG-012`** | Reparar / Renovar / Reemplazar | RAMA E | `Xiaomi MiMo` | `mimo-v2.5` | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | Certified |
| **`AG-013`** | Analista de Malos Actores | RAMA E | `Xiaomi MiMo` | `mimo-v2.5` | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | Certified |

---

## 2. Invariantes de Seguridad y Adaptadores

- **Uso Exclusivo de Adaptadores Centrales:**
  - `central_openai_adapter_usage = 100%` (`providers/openai-adapter.ts`).
  - `central_mimo_adapter_usage = 100%` (`providers/mimo-adapter.ts`).
  - `direct_MiMo_HTTP_inside_agents = 0`.
  - `direct_OpenAI_HTTP_inside_agents = 0`.
- **Acceso a Secretos Físicos:**
  - `direct_MIMO_API_KEY_access_in_agents = 0`.
  - `direct_OPENAI_API_KEY_access_in_agents = 0`.
  - Las credenciales físicas son administradas exclusivamente en tiempo de ejecución por la Edge Function a través de `Deno.env` / `process.env`.
