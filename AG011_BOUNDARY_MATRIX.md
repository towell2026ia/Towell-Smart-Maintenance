# AG-011 — Boundary Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-BOUNDARY-MATRIX-001`  

---

## 1. Matriz de Fronteras Funcionales

| Agente / Módulo | Responsabilidad Propia | Relación con AG-011 | Prohibición en AG-011 |
| :--- | :--- | :--- | :--- |
| **`AG-001 — Capataz`** | Orquestación, enrutamiento y autenticación. | Despacha eventos hacia AG-011. | AG-011 no se auto-enruta ni se auto-promueve. |
| **`M-010 — Asset 360`** | Expediente operativo integral del activo. | Proveedor de historial, OTs, bitácoras y hallazgos. | AG-011 no reconstruye el expediente desde tablas base. |
| **`AG-010 — Cinco Porqués`** | Análisis de causa raíz de averías puntuales. | Proveedor de hipótesis y causas confirmadas. | AG-011 no ejecuta Cinco Porqués ni genera hipótesis causales. |
| **`AG-008 — Fallas`** | Detección de patrones y métricas de falla. | Proveedor de contexto estadístico. | AG-011 no calcula MTBF, MTTR ni tendencias. |
| **`M-011 — Salud y Riesgo`** | Evaluación de degradación física y riesgo. | Proveedor de contexto de criticidad. | AG-011 no recalcula salud ni riesgo. |
| **`AG-007 — Costos`** | Cálculo y seguimiento de costos de mantenimiento. | Aporta datos económicos certificados. | AG-011 no calcula costos de mano de obra ni repuestos. |
| **`AG-012 — Reparar/Renovar`**| Decisiones de ciclo de vida de activos. | Consume memoria técnica para evaluar intervenciones. | AG-011 no decide si un activo debe repararse o reemplazarse. |
| **`AG-013 — Malos Actores`** | Identificación de activos críticos deficientes. | Consume memorias de fallas recurrentes. | AG-011 no clasifica activos como malos actores. |
| **`M-012 — Prep. OT`** | Preparación de órdenes de trabajo específicas. | Consume procedimientos validados de AG-011. | AG-011 no crea ni despacha órdenes de trabajo. |
| **`M-013 — Seguridad`** | Gobernanza de permisos de trabajo y seguridad. | Consume referencias de advertencias de seguridad. | AG-011 no autoriza permisos de trabajo ni LOTO. |

---

## 2. Invariante de Fronteras Externas

$$\text{foreign\_domain\_actions\_by\_AG011} = 0$$
