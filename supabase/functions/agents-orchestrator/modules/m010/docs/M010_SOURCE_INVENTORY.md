# M-010 — Source Inventory v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-010 — Expediente Único del Activo`  
**Token de Freeze:** `M010-DATA-MAP-001`  

---

## 1. Inventario de Fuentes de Verdad para el Expediente del Activo

| Nombre de Fuente | Objeto de BD (Tabla / Vista) | Primary Key | Llave de Máquina | Referencia OT | Campo de Fecha | Tipo de Evento |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Catálogo de Máquinas** | `public.cat_maquinas` | `id` / `codigo_maquina` | `codigo_maquina` | N/A | `created_at` | `IDENTITY` |
| **Órdenes de Trabajo** | `public.ordenes_trabajo` | `id` / `folio` | `maquina_id` | `folio` | `fecha_creacion` / `fecha_cierre` | `WORK_ORDER` |
| **Bitácora de OT** | `public.bitacora_orden_trabajo` | `id` | Vía `ordenes_trabajo` | `orden_id` | `fecha` | `TECHNICAL_NOTE` |
| **Checklists de OT** | `public.respuestas_checklist_orden` | `id` | Vía `ordenes_trabajo` | `orden_id` | `created_at` | `CHECKLIST` |
| **Levantamientos Mantenimiento**| `public.levantamientos_mantenimiento` | `id` | `maquina_id` | Opcional | `fecha` | `SURVEY` |
| **Checklist Predictivo** | `public.respuestas_checklist_predictivo` | `id` | Vía `levantamiento_id` | Vía hallazgo | `created_at` | `PREDICTIVE_SURVEY` |
| **Checklist Autónomo** | `public.respuestas_checklist_autonomo` | `id` | Vía `levantamiento_id` | Vía hallazgo | `created_at` | `AUTONOMOUS_SURVEY` |
| **Calendario Preventivo** | `public.calendario_preventivo_anual` | `id` | `maquina_id` | N/A | `fecha_programada` | `PREVENTIVE` |
| **Calendario Predictivo** | `public.calendario_predictivo_semanal` | `id` | `maquina_id` | N/A | `fecha_programada` | `PREDICTIVE_SURVEY` |
| **Calendario Autónomo** | `public.calendario_autonomo_semanal` | `id` | `maquina_id` | N/A | `fecha_programada` | `AUTONOMOUS_SURVEY` |
| **Refacciones Utilizadas** | `public.refacciones_utilizadas` | `id` | Vía `ordenes_trabajo` | `orden_id` | `created_at` | `PART` |
| **Fallas Telegram Staging** | `public.stg_telegram_ordenes_telares` | `id` | `id_telar` | Vía matching | `fecha` + `hora` | `FAILURE` |
| **Alertas Técnicas** | `public.alertas_mantenimiento` / AG-008 | `signal_id` | `target_id` | Vía evidencia | `created_at` | `ALERT` |

---

## 2. Invariante de Lectura Directa
M-010 no crea tablas paralelas ni almacena copias redundantes. Todas las consultas se consolidan server-side mediante relaciones canónicas directas.
