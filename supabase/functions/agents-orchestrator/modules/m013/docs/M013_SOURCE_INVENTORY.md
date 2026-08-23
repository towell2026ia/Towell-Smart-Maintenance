# M-013 — Source Inventory v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Inventario de Fuentes de Requisitos y Evidencia de Seguridad

| Dominio | Objeto de BD / Componente | Identificador Clave | Relación con OT | Propósito en M-013 |
| :--- | :--- | :--- | :--- | :--- |
| **Paquete Preparación M-012**| `M012-1.0-FROZEN` | `work_order_id` | Raíz de preparación | Requisitos de seguridad identificados, tipo de mantenimiento, máquina y componente. |
| **Órdenes de Trabajo** | `public.ordenes_trabajo` | `id` / `folio` | Raíz del expediente | Estado de la OT, riesgos reportados en la solicitud, flags de paro operacional. |
| **Catálogo de Máquinas** | `public.cat_maquinas` | `codigo_maquina` | `maquina_id` | Identidad del activo, puntos de aislamiento de energía conocidos, guardas de seguridad. |
| **Checklists de Seguridad** | `public.respuestas_checklist_orden` | `id` | `orden_id` | Verificaciones previas en sitio (EPP portado, guardas cerradas, desenergización verificada). |
| **Bitácora de OT / Notas** | `public.bitacora_orden_trabajo` | `id` | `orden_id` | Confirmaciones técnicas de aislamiento y notas de seguridad humana. |
| **Memoria Técnica AG-011** | `AG011-1.0-FROZEN` | `memory_id` | Vía `asset_id` | Precauciones críticas validadas, procedimientos LOTO recomendados y limitaciones. |
| **Firmas y Permisos** | Metadatos de solicitud gobernada | `user_id` / `role` | `work_order_id` | Evidencia de confirmación humana autorizada para LOTO y permisos de alto riesgo. |

---

## 2. Invariante de Lectura Directa
M-013 evalúa la evidencia existente exclusivamente en modo lectura (`SELECT`), determinando el estado de los controles sin mutar registros operacionales ni auto-aprobar permisos.
