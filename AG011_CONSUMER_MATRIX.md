# AG-011 — Consumer Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-CONSUMER-MATRIX-001`  

---

## 1. Matriz de Agentes y Módulos Consumidores

| Consumidor | Contexto de Consumo | Propósito del Consumo | Formato de Salida Requerido |
| :--- | :--- | :--- | :--- |
| **`TSM-AI UI`** | Consulta de ingeniería, manual interactivo de planta. | Asistir a supervisores y técnicos con lecciones aprendidas. | Documento completo estructurado con procedimiento y limitaciones. |
| **`M-012 — Preparación OT`** | Planificación de orden de trabajo correctiva/preventiva. | Sugerir procedimiento validado, herramientas y repuestos requeridos. | Bloque de procedimiento técnico, repuestos sugeridos y precauciones. |
| **`M-013 — Seguridad`** | Validación de riesgos antes de emitir permiso de trabajo. | Identificar advertencias de seguridad históricas asociadas al procedimiento. | Lista de `safety_warnings` y limitaciones operativas. |
| **`AG-012 — Reparar / Reemplazar`** | Evaluación de factibilidad de reparación mayor. | Analizar intervenciones históricas validadas y efectividad previa. | Historial de efectividad y limitaciones de procedimiento. |
| **`AG-013 — Malos Actores`** | Diagnóstico de activos con fallas crónicas. | Verificar si existen procedimientos aprobados no ejecutados en campo. | Catálogo de memorias aprobadas por familia/modelo. |
| **`AG-010 — Cinco Porqués`** | Diagnóstico y generación de hipótesis en nuevas averías. | Contextualizar causas históricas y verificaciones comprobadas. | Resumen de condiciones y causas confirmadas previas. |

---

## 2. Invariante de Resolución de Consumidor

$$\text{consumer\_identity\_resolved\_server\_side} = \text{true}$$

El cliente web no puede impersonar consumidores con privilegios elevados. La identidad del consumidor se resuelve y valida estrictamente en servidor vía `AG-001`.
