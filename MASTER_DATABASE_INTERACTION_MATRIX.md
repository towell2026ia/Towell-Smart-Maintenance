# MASTER_DATABASE_INTERACTION_MATRIX — Towell Smart Maintenance AI v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Fase:** `MASTER MULTI-AGENT ARCHITECTURE & PRODUCTION READINESS REVIEW`  
**Versión:** `1.0`  
**Fecha de Auditoría:** 2026-08-23  
**Orquestador General:** `AG-001 — CAPATAZ`  

---

## 1. Matriz de Lectura, Escritura y Propiedad de Tablas

| Tabla / Vista de Base de Datos | Propietario de Datos | Agentes con Acceso de Lectura | Agentes con Acceso de Escritura | Decisión de Persistencia |
| :--- | :--- | :--- | :--- | :--- |
| **`cat_maquinas`** | Catálogo Maestro Planta | Todos los Agentes (`AG-001`..`AG-013`, `M-010`..`M-013`) | Solo Administrador / `AG-005` (Vía Staging) | Core Catalog |
| **`ordenes_trabajo`** | Operaciones de Mantenimiento | `AG-007`, `AG-008`, `AG-009`, `M-010`..`M-013`, `AG-012`, `AG-013` | `AG-009` (Transición de Estados) / Técnico / Admin | Core Operational |
| **`solicitudes_mantenimiento`** | Solicitantes / Producción | `AG-009`, `AG-009.3`, `M-010` | `AG-009.3` / Solicitante | Core Operational |
| **`cat_refacciones`** | Inventario / Compras | `AG-007`, `M-010`, `M-012`, `AG-012` | Administrador / `AG-005` | Core Catalog |
| **`cat_usuarios_roles`** | Seguridad / Auth | `AG-001` (Validador de Roles) | Administrador | Core Security |
| **`cat_formularios_dinamicos`** | Gobernanza de Formularios | `AG-006`, `AG-009`, UI | `AG-006` (Constructor de Formularios) | `20260813_003_ag006_formularios_v10.sql` |
| **`cat_secciones_formulario`** | Estructura de Formularios | `AG-006`, `AG-009`, UI | `AG-006` (Constructor de Formularios) | `20260813_003_ag006_formularios_v10.sql` |
| **`cat_campos_formulario`** | Campos Dinámicos | `AG-006`, `AG-009`, UI | `AG-006` (Constructor de Formularios) | `20260813_003_ag006_formularios_v10.sql` |
| **`cat_agentes`** | Gobernanza Multiagente | `AG-001` (Router / Executor) | Migraciones de Promoción (`AG-001`..`AG-013`) | Multiagent Governance |
| **`cat_eventos_agente`** | Bus de Eventos | `AG-001` (Router / Executor) | Migraciones de Gobernanza | Multiagent Governance |
| **`eventos_agente`** | Bitácora de Eventos | `AG-001`, Dashboard | `AG-001` (Registro de Eventos) | Multiagent Governance |
| **`ejecuciones_agente`** | Auditoría y Telemetría | `AG-001`, Cost Tracker | `AG-001` (Auditoría Centralizada) | Multiagent Governance |
| **`aprobaciones_agente`** | Gestión de Aprobaciones | `AG-001`, UI Aprobador | `AG-001` (Solicitudes de Aprobación) | Multiagent Governance |

---

## 2. Certificación de Ausencia de Tablas Fantasma

Se audita y certifica expresamente que **NO EXISTEN** tablas funcionales clandestinas o no autorizadas:
- `phantom_bad_actors_table = 0` (`NO_AG013_MIGRATION_REQUIRED`)
- `phantom_safety_controls_table = 0` (`NO_M013_MIGRATION_REQUIRED`)
- `phantom_replacement_plans_table = 0` (`NO_AG012_MIGRATION_REQUIRED`)
- `phantom_agent_decisions_table = 0`
- `phantom_unauthorized_tables = 0`

---

## 3. Niveles de Autoridad y Barreras Críticas de Seguridad

| Nivel de Autoridad | Tipo | Componentes Asignados | Comportamiento en Runtime |
| :---: | :--- | :--- | :--- |
| **0** | Informativo | `AG-001`, `M-010`, `M-011`, `M-012`, `M-013` | Ejecución pura de consulta / cálculo sin persistencia ni efectos colaterales. |
| **1** | Analítico / Borrador | `AG-002`, `AG-003`, `AG-004`, `AG-005`, `AG-006`, `AG-007`, `AG-008`, `AG-009.1`, `AG-009.2`, `AG-009.3`, `AG-010`, `AG-011`, `AG-012`, `AG-013` | Generación de análisis, planes, rankings o borradores que requieren confirmación humana o de AG-009. |
| **2** | Requiere Aprobación Formal | `AG-009` (Creación / Transición Crítica de OTs) | Se crea registro formal en `aprobaciones_agente` con hash SHA-256 canónico antes de mutar estado. |
| **3** | Autoridad Exclusivamente Humana | Operador / Supervisor / Jefe de Mantenimiento | **Estrictamente bloqueado para cualquier IA o agente automático.** |

---

## 4. Matriz de Prohibiciones Operacionales Absolutas para Agentes

```text
automatic_purchase_approval       = 0
automatic_CAPEX_approval          = 0
automatic_final_OT_closure        = 0
automatic_safety_authorization    = 0
automatic_machine_stop_start      = 0
automatic_asset_retirement        = 0
automatic_inventory_disposal      = 0
automatic_critical_rule_override  = 0
```
