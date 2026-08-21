# AG-011 — Memory Evidence Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-MEMORY-EVIDENCE-001`  

---

## 1. Clases de Evidencia para el Conocimiento Técnico

Toda afirmación técnica en una memoria debe estar respaldada por al menos una pieza de evidencia categorizada en una de las 8 clases ontológicas:

| Clase de Evidencia | Nivel de Autoridad | Descripción / Criterio de Inclusión | Capacidad de Publicación |
| :--- | :---: | :--- | :---: |
| **`CERTIFIED_FACT`** | **Nivel 1 (Máximo)** | Mediciones de telemetría calibrada, inspecciones visuales registradas en campo, catálogos de fabricante. | **ALTA** |
| **`HUMAN_CONFIRMED_CAUSE`** | **Nivel 1 (Máximo)** | Causa raíz validada y firmada por un ingeniero/técnico especialista tras investigación formal. | **ALTA** |
| **`VALIDATED_INTERVENTION`** | **Nivel 2 (Alto)** | Procedimiento de reparación ejecutado con registro de verificación y sin reincidencia documentada. | **ALTA** |
| **`DOCUMENTED_OUTCOME`** | **Nivel 2 (Alto)** | Resultado cuantitativo o cualitativo post-intervención registrado en la orden de trabajo. | **MEDIA-ALTA** |
| **`DERIVED_SIGNAL`** | **Nivel 3 (Medio)** | Señales estadísticas de degradación provistas por `AG-008` (tendencia, estacionalidad, reincidencia). | **MEDIA** (Contexto) |
| **`TECHNICIAN_STATEMENT`** | **Nivel 4 (Informativo)** | Observación o nota técnica de técnico sin medición instrumental certificada. | **BAJA** (Requiere soporte) |
| **`OPERATOR_STATEMENT`** | **Nivel 4 (Informativo)** | Comentario reportado por el operador de línea. | **BAJA** (Dato no confiable) |
| **`MODEL_HYPOTHESIS`** | **Nivel 5 (No Vinculante)** | Hipótesis generada por modelos de IA (`AG-010`, `GPT-4.1`). | **PROHIBIDO COMO HECHO** |

---

## 2. Invariante de Trazabilidad Total

$$\text{memory\_traceability} = 100\%$$

No se permite la publicación de memorias técnicas que contengan afirmaciones de causa o solución sin referencias de procedencia rastreables (`source_references`) a registros originales de `M-010` o `AG-010`.
