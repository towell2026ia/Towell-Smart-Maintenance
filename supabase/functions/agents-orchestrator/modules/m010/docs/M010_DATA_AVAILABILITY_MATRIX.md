# M-010 — Data Availability Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-010 — Expediente Único del Activo`  
**Token de Freeze:** `M010-DATA-MAP-001`  

---

## 1. Matriz de Disponibilidad de Datos por Sección del Expediente

| Sección del Expediente (`section`) | Estado de Disponibilidad en BD | Fuentes Principales | Comentarios |
| :--- | :--- | :--- | :--- |
| `IDENTITY` | **100% DISPONIBLE** | `cat_maquinas` | Datos maestros completos de máquinas |
| `WORK_ORDERS` | **100% DISPONIBLE** | `ordenes_trabajo` | Correctivos, preventivos y modificaciones |
| `SUBTASKS` | **100% DISPONIBLE** | `ordenes_trabajo` (parent_ot) | Subtareas especializadas vinculadas |
| `MAINTENANCE` | **100% DISPONIBLE** | Calendarios anuales y semanales | Planes preventivos, predictivos y autónomos |
| `CHECKLISTS` | **100% DISPONIBLE** | `respuestas_checklist_orden` | Formularios y respuestas de rutinas |
| `SURVEYS` | **100% DISPONIBLE** | `levantamientos_mantenimiento` | Inspecciones en campo |
| `FINDINGS` | **100% DISPONIBLE** | Hallazgos en checklists | Hallazgos predictivos y autónomos |
| `FAILURES` | **100% DISPONIBLE** | `stg_telegram` / OTs / AG-008 | Histórico certificado de eventos de falla |
| `PARTS` | **100% DISPONIBLE** | `refacciones_utilizadas` | Consumo de repuestos por OT |
| `DOWNTIME` | **100% DISPONIBLE** | `ordenes_trabajo` (tiempos) | Tiempos de paro y duración de intervención |
| `ALERTS` | **100% DISPONIBLE** | AG-008 / Alertas | Señales técnicas activas e históricas |
| `TIMELINE` | **100% DISPONIBLE** | Agregación cronológica | Línea de tiempo unificada 360° |
