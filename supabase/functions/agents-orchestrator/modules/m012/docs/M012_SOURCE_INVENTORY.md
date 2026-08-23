# M-012 — Source Inventory v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Inventario de Fuentes de Verdad para la Preparación de la OT

| Dominio | Objeto de BD (Tabla / Módulo) | Primary Key / Ref | Relación con OT | Propósito en M-012 |
| :--- | :--- | :--- | :--- | :--- |
| **Órdenes de Trabajo** | `public.ordenes_trabajo` | `id` / `folio` | Raíz del expediente | Alcance del trabajo, tipo mantenimiento, fechas, estado inicial. |
| **Catálogo de Máquinas**| `public.cat_maquinas` | `id` / `codigo_maquina` | `maquina_id` | Identidad del activo, modelo, familia, departamento. |
| **Expediente 360** | `M-010 — Asset360` | `asset_id` | `maquina_id` | Historial técnico, intervenciones previas, timeline del activo. |
| **Salud y Riesgo** | `M-011 — Health/Risk` | `asset_id` | `maquina_id` | Índice de salud y riesgo técnico como contexto operativo. |
| **Memoria Técnica** | `AG-011 — Technical Memory` | `memory_id` | Vía `asset_id` / modelo | Memorias validadas, procedimientos recomendados, precauciones y límites. |
| **Bitácora Técnica** | `public.bitacora_orden_trabajo` | `id` | `orden_id` | Notas técnicas y antecedentes de la orden. |
| **Checklists de OT** | `public.respuestas_checklist_orden` | `id` | `orden_id` | Respuestas y formatos de checklist asociados a la OT. |
| **Refacciones Planificadas/Históricas** | `public.refacciones_utilizadas` / AG-002 | `id` | `orden_id` | Refacciones identificadas/planificadas vs historial técnico. |
| **Levantamientos** | `public.levantamientos_mantenimiento` | `id` | `maquina_id` | Hallazgos de inspecciones previas y datos de levantamiento. |
| **Alertas Técnicas** | `public.alertas_mantenimiento` / AG-008 | `signal_id` | `target_id` | Señales de fallas recurrentes o tendencias relacionadas. |

---

## 2. Invariante de Acceso
M-012 accede a estas fuentes exclusivamente en modo lectura (`SELECT`), consolidando el paquete de preparación sin modificar registros operacionales.
