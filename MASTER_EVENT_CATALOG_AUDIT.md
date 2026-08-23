# MASTER_EVENT_CATALOG_AUDIT — Towell Smart Maintenance AI v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Fase:** `MASTER MULTI-AGENT ARCHITECTURE & PRODUCTION READINESS REVIEW`  
**Versión:** `1.0`  
**Fecha de Auditoría:** 2026-08-23  
**Orquestador General:** `AG-001 — CAPATAZ`  

---

## 1. Catálogo Canónico Oficial de Eventos y Destinos

| Código de Evento Canónico | Tipo de Enrutamiento | Agente / Módulo Destino | Propósito Funcional | Nivel de Autoridad |
| :--- | :---: | :---: | :--- | :---: |
| **`TEXTO_AMBIGUO`** | `AI_CLASSIFICATION_NANO` | `AG-001` (Orquestador) | Clasificación de intenciones no estructuradas del usuario | 0 (Informativo) |
| **`SOLICITUD_PLAN_PREVENTIVO_ANUAL`** | `DETERMINISTIC` | `AG-002` (Preventivo Anual) | Generación del plan anual de mantenimiento preventivo | 1 (Analítico) |
| **`SOLICITUD_PLAN_PREDICTIVO_MENSUAL`**| `DETERMINISTIC` | `AG-003` (Predictivo Mensual)| Generación del plan mensual predictivo y ventanas de inspección | 1 (Analítico) |
| **`SOLICITUD_PLAN_AUTONOMO_SEMANAL`**  | `DETERMINISTIC` | `AG-004` (Autónomo Semanal) | Generación del balance semanal de mantenimiento autónomo | 1 (Analítico) |
| **`EXCEL_BASE_CARGADA`**               | `DETERMINISTIC` | `AG-005` (Auditor de Bases) | Auditoría de integridad y estructura de bases cargadas | 1 (Analítico) |
| **`FORMULARIO_CARGADO`**               | `DETERMINISTIC` | `AG-006` (Formularios)      | Conversión de plantillas Excel en esquemas JSON de formulario | 1 (Analítico) |
| **`DESVIACION_PRESUPUESTO`**           | `DETERMINISTIC` | `AG-007` (Costos)           | Auditoría de desvíos de costos y gastos acumulados | 1 (Analítico) |
| **`FALLA_REINCIDENTE`**                | `DETERMINISTIC` | `AG-008` (Fallas)           | Detección de patrones de recurrencia y tendencias de falla | 1 (Analítico) |
| **`GENERAR_ORDEN_TRABAJO`**           | `DETERMINISTIC` | `AG-009` (Master Router D)  | Orquestación de creación y transición de órdenes de trabajo | 2 (Requiere Aprobación) |
| **`OT_PREVENTIVA_GENERADA`**          | `DETERMINISTIC` | `AG-009.1` (Preventivo)     | Enlace de levantamientos y checklists preventivos | 1 (Analítico) |
| **`OT_AUTONOMA_GENERADA`**            | `DETERMINISTIC` | `AG-009.2` (Autónomo)       | Enlace de checklists de mantenimiento autónomo de operarios | 1 (Analítico) |
| **`FALLA_REPORTADA`**                 | `DETERMINISTIC` | `AG-009.3` (Correctivo)     | Creación de solicitudes y OTs por fallas operativas | 1 (Analítico) |
| **`ASSET_360_REQUESTED`**             | `DETERMINISTIC` | `M-010` (Asset360)          | Resolución del expediente único integral del activo | 0 (Informativo) |
| **`ASSET_HEALTH_RISK_EVALUATION_REQUESTED`** | `DETERMINISTIC` | `M-011` (Salud & Riesgo) | Cálculo determinístico de salud ($0..100$) y riesgo | 0 (Informativo) |
| **`ROOT_CAUSE_ANALYSIS_REQUESTED`**   | `DETERMINISTIC` | `AG-010` (5 Porqués / RCA)  | Análisis estructurado de causa raíz y antecedentes | 1 (Analítico) |
| **`TECHNICAL_MEMORY_REGISTRATION_REQUESTED`** | `DETERMINISTIC` | `AG-011` (Memoria Técnica) | Registro y estructuración de memoria técnica histórica | 1 (Analítico) |
| **`WORK_ORDER_PREPARATION_REQUESTED`**| `DETERMINISTIC` | `M-012` (Preparación OT)    | Cálculo de impacto financiero y preparación de recursos | 0 (Informativo) |
| **`SAFETY_CLEARANCE_EVALUATION_REQUESTED`** | `DETERMINISTIC` | `M-013` (Control Seguridad) | Filtro de seguridad, LOTO y requerimientos de EPP | 0 (Informativo) |
| **`ASSET_INTERVENTION_STRATEGY_REQUESTED`** | `DETERMINISTIC` | `AG-012` (Ciclo de Vida) | Recomendación de Reparar, Renovar o Reemplazar | 1 (Analítico) |
| **`BAD_ACTOR_ANALYSIS_REQUESTED`**    | `DETERMINISTIC` | `AG-013` (Malos Actores)    | Clasificación y ranking de activos crónicos/malos actores | 1 (Analítico) |

---

## 2. Reconciliación de Aliases Históricos

- **`EVALUACION_CICLO_VIDA`**: Clasificado como **LEGACY ALIAS** compatible con el evento canónico `ASSET_INTERVENTION_STRATEGY_REQUESTED` (`AG-012`).
- **`EXCEL_BASE_AUDIT`**: Alias histórico retirado en favor de `EXCEL_BASE_CARGADA` (`AG-005`).
- **`CANONICAL RULE`**: En producción sólo se admite un evento canónico activo por intención operativa.

---

## 3. Auditoría de Seguridad de Parámetros y Control del Cliente

- **Despojo de Autoridad en Servidor (`executor.ts` & `validator.ts`):**
  - Cualquier intento del cliente o navegador de inyectar las siguientes claves es eliminado silenciosamente antes de la ejecución:
    `agent_id`, `provider`, `model`, `authority_level`, `approval_status`, `role_override`, `is_admin`, `skip_approval`, `force_route`, `force_execute`, `create_ot`, `close_ot`, `execute_sql`.
- **Eventos Desconocidos:**
  - Producen inmediatamente `status: INVALID_EVENT`.
  - **`UNKNOWN EVENT NEVER SENT TO LLM`** (protección contra costos innecesarios y alucinación de rutas).
- **Invocaciones Directas Prohibidas:**
  - `direct_agent_to_agent_calls = 0` (toda interacción está mediada por `AG-001`).
  - `direct_browser_agent_calls = 0` (el navegador solo emite eventos a `agents-orchestrator`).
