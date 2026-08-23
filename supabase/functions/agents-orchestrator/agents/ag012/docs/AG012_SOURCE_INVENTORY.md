# AG-012 — Source Inventory v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Inventario de Fuentes de Datos para Decisión de Activos

| Dominio | Objeto de BD / Componente Upstream | Identificador Clave | Autoridad de Origen | Propósito en AG-012 |
| :--- | :--- | :--- | :--- | :--- |
| **Identidad y Timeline 360** | `M010-1.0-FROZEN` (`public.cat_maquinas`) | `codigo_maquina` / `asset_id` | `M-010 Asset360` | Identidad del activo, modelo, año, criticidad, historial de intervenciones. |
| **Salud y Riesgo del Activo** | `M011-1.0-FROZEN` (`modules/m011`) | `asset_id` | `M-011 Health/Risk` | Score de salud (0-100), índice de riesgo (0-100), señales por componente. |
| **Inteligencia de Fallas** | `AG008-1.0-FROZEN` (`agents/ag008`) | `maquina_id` | `AG-008 Fallas/Tendencias` | MTBF, MTTR, recurrencia, tasa de reincidencia, estacionalidad. |
| **Análisis de Causa Raíz** | `AG010-1.0-FROZEN` (`agents/ag010`) | `analisis_id` / `orden_id` | `AG-010 5 Porqués / RCA` | Causa raíz humana confirmada, fallas recurrentes similares. |
| **Memoria Técnica Aprobada** | `AG011-1.0-FROZEN` (`agents/ag011`) | `memory_id` | `AG-011 Memoria Técnica` | Lecciones aprendidas, procedimientos de reparación mayor, limitaciones conocidas. |
| **Hechos Económicos Certificados**| `AG007-1.0-FROZEN` (`agents/ag007`) | `cost_id` / `maquina_id` | `AG-007 Costos / Presupuesto`| Costo acumulado de mantenimiento, costo de refacciones, costo de mano de obra. |
| **Expediente de Órdenes de Trabajo**| `public.ordenes_trabajo` | `id` / `folio` | `AG-009 / Supabase` | Historial de tipo de mantenimiento, frecuencia de paros mayores. |

---

## 2. Invariante de Lectura Directa
AG-012 evalúa los factores de decisión exclusivamente en modo lectura (`SELECT`), sin reconstruir ni recalcular los hechos originados en sus componentes upstream autorizados.
