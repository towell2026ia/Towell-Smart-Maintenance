# M-010 — Source of Truth Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-010 — Expediente Único del Activo`  
**Token de Freeze:** `M010-DATA-MAP-001`  

---

## 1. Matriz de Autoridades por Dominio Técnico

| Dominio Técnico | Autoridad Exclusiva de Verdad | Rol de M-010 |
| :--- | :--- | :--- |
| **Identidad del Activo / Criticidad** | `public.cat_maquinas` | Lectura y resolución canónica (`asset_id`) |
| **Órdenes de Trabajo y Subtareas** | `public.ordenes_trabajo` / `AG-009` | Lectura cronológica y asociación a máquina |
| **Plan Preventivo Anual** | `AG-002 — Planificador Preventivo` | Lectura de fechas y cumplimiento anual |
| **Levantamientos Predictivos** | `AG-003 — Conector Predictivo` | Lectura de mediciones y hallazgos |
| **Levantamientos Autónomos** | `AG-004 — Conector Autónomo` | Lectura de 5 bloques y hallazgos |
| **Consumo de Refacciones** | `public.refacciones_utilizadas` | Lectura de repuestos vinculados a OTs |
| **Costos y Presupuestos** | `AG-007 — Presupuestos y Costos` | Lectura de importes económicos certificados |
| **Señales de Falla y Tendencias** | `AG-008 — Fallas y Tendencias` | Lectura de recurrencia y series históricas |
| **Salud y Riesgo del Activo** | `M-011 — Índice de Salud y Riesgo` | M-010 **NO** calcula salud (provee datos) |
| **Causa Raíz / 5 Porqués** | `AG-010 — Cinco Porqués` | M-010 **NO** infiere causas (provee contexto) |
| **Memoria Técnica** | `AG-011 — Memoria Técnica` | M-010 **NO** redacta memoria |
| **Preparación de la OT** | `M-012 — Preparación de la OT` | M-010 **NO** prepara OTs |
| **Decisión Reparar / Reemplazar** | `AG-012 — Reparar/Renovar/Reemplazar` | M-010 **NO** decide reemplazo |
| **Clasificación de Bad Actors** | `AG-013 — Analista de Malos Actores` | M-010 **NO** clasifica malos actores |

---

## 2. Invariante de Fronteras
M-010 respeta la autoridad de cada agente y módulo. Si se requiere un cálculo o análisis especializado, se delega al agente correspondiente a través de AG-001.
