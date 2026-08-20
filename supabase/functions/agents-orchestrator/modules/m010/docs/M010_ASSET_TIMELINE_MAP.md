# M-010 — Asset Timeline Map v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-010 — Expediente Único del Activo`  
**Token de Freeze:** `M010-DATA-MAP-001`  

---

## 1. Semántica Temporal de la Línea de Vida del Activo

Cada evento en la línea de tiempo del activo se mapea a su fecha de ocurrencia técnica real:

| Tipo de Evento (`event_type`) | Fuente de Origen | Campo de Fecha Utilizado | Calidad Temporal |
| :--- | :--- | :--- | :--- |
| `WORK_ORDER` | `ordenes_trabajo` | `fecha_creacion` (inicio) / `fecha_cierre` | `EXACT` |
| `SUBTASK` | `ordenes_trabajo` | `fecha_creacion` | `EXACT` |
| `FAILURE` | `stg_telegram_ordenes_telares` / OT | `fecha` + `hora` | `EXACT` / `APPROXIMATED` |
| `PREVENTIVE` | `calendario_preventivo_anual` | `fecha_programada` / fecha OT | `EXACT` |
| `PREDICTIVE_SURVEY` | `levantamientos_mantenimiento` | `fecha` | `EXACT` |
| `AUTONOMOUS_SURVEY` | `levantamientos_mantenimiento` | `fecha` | `EXACT` |
| `PHYSICAL_FINDING` | Respuestas de checklist | `created_at` | `EXACT` |
| `CHECKLIST` | `respuestas_checklist_orden` | `created_at` | `EXACT` |
| `PART` | `refacciones_utilizadas` | `created_at` / fecha OT | `EXACT` |
| `DOWNTIME` | Bitácoras / OTs | `fecha_inicio` $\to$ `fecha_cierre` | `EXACT` |
| `ALERT` | AG-008 / Alertas | `created_at` | `EXACT` |
| `TECHNICAL_NOTE` | `bitacora_orden_trabajo` | `fecha` | `EXACT` |

---

## 2. Invariante de Fecha Real (`no_created_at_pollution`)
No se utiliza ciegamente `created_at` cuando la fecha física del evento de mantenimiento sea anterior. Se respeta la fecha operacional registrada por técnicos y supervisores.
