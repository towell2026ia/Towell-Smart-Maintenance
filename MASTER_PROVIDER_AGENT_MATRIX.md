# MASTER_PROVIDER_AGENT_MATRIX — Towell Smart Maintenance AI v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Fase:** `MASTER MULTI-AGENT ARCHITECTURE & PRODUCTION READINESS REVIEW`  
**Subfase:** `MASTER-001-R2 — Final Consistency Reconciliation & Production Ratification`  
**Versión:** `1.0`  
**Fecha de Certificación:** 2026-08-23  
**Orquestador General:** `AG-001 — CAPATAZ`  
**Estado de Arquitectura:** **`TSMAI_MASTER_ARCHITECTURE_PASS` ✅**  
**Estado de Producción:** **`TSMAI_MULTIAGENT_PRODUCTION_READY_PASS` 🚀**  

---

## 1. Matriz Integral de Gobernanza de Proveedores de IA (20 Entidades — 100% READY)

| Entidad / Agente | Nombre | Rama | Proveedor Autorizado | Modo de Ejecución | Modelo Configurado / Primario | Modelo Fallback / Efectivo | Adaptador Central Utilizado | Requiere IA (`requires_ai`) | Estado de Certificación |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`AG-001`** | Capataz Orquestador | Core | `OpenAI` | Estructurado: Determinístico (0 LLM)<br>Ambiguo: Router Semántico | `gpt-4.1-nano` / `gpt-4o-mini` | `gpt-4.1-mini` / `gpt-4o-mini` | `providers/openai-adapter.ts` | `true` (para texto ambiguo) | **`READY`** |
| **`AG-002`** | Preventivo Anual | RAMA A | `Xiaomi MiMo` | Semántico / Explicativo | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | **`READY`** |
| **`AG-003`** | Predictivo Mensual | RAMA A | `Xiaomi MiMo` | Semántico / Explicativo | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | **`READY`** |
| **`AG-004`** | Autónomo Semanal | RAMA A | `Xiaomi MiMo` | Semántico / Explicativo | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | **`READY`** |
| **`AG-005`** | Auditor de Bases | RAMA B | `NONE` | 100% Determinístico | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | **`READY`** |
| **`AG-006`** | Constructor de Formularios | RAMA B | `OpenAI` | Semántico con Fallback Determinístico | `gpt-4o-mini` | `gpt-4o-mini` | `providers/openai-adapter.ts` | `true` | **`READY (12/12 Real PASS)`** |
| **`AG-007`** | Presupuestos y Costos | RAMA C | `Xiaomi MiMo` | Semántico / Explicativo | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | **`READY`** |
| **`AG-008`** | Fallas, Tendencias y Reincidencias | RAMA C | `Xiaomi MiMo` | Semántico / Explicativo | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | **`READY`** |
| **`AG-009`** | Gestor Formularios–Solicitudes–OT | RAMA D | `NONE` | 100% Determinístico | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | **`READY`** |
| **`AG-009.1`** | Conector Preventivo | RAMA D | `NONE` | 100% Determinístico | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | **`READY`** |
| **`AG-009.2`** | Conector Autónomo | RAMA D | `NONE` | 100% Determinístico | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | **`READY`** |
| **`AG-009.3`** | Conector Correctivo | RAMA D | `NONE` | 100% Determinístico | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | **`READY`** |
| **`M-010`** | Expediente Único del Activo (Asset360) | RAMA E | `NONE` | 100% Determinístico | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | **`READY`** |
| **`M-011`** | Índice de Salud y Riesgo | RAMA E | `NONE` | 100% Determinístico | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | **`READY`** |
| **`AG-010`** | Cinco Porqués y Casos Anteriores | RAMA E | `Xiaomi MiMo` | Semántico / Explicativo | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | **`READY`** |
| **`AG-011`** | Memoria Técnica | RAMA E | `OpenAI` | Semántico / Explicativo | `gpt-4o-mini` | `gpt-4o-mini` | `providers/openai-adapter.ts` | `true` | **`READY`** |
| **`M-012`** | Preparación de la OT | RAMA E | `NONE` | 100% Determinístico | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | **`READY`** |
| **`M-013`** | Control de Seguridad | RAMA E | `NONE` | 100% Determinístico | `NONE` | `NONE` | `NONE (Deterministic)` | `false` | **`READY`** |
| **`AG-012`** | Reparar / Renovar / Reemplazar | RAMA E | `Xiaomi MiMo` | Semántico / Explicativo | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | **`READY`** |
| **`AG-013`** | Analista de Malos Actores | RAMA E | `Xiaomi MiMo` | Semántico / Explicativo | `mimo-v2.5` | `mimo-v2.5` | `providers/mimo-adapter.ts` | `true` | **`READY`** |

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
