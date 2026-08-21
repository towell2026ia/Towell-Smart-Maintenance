# AG-011 — Data Availability Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-DATA-MAP-001`  

---

## 1. Matriz de Disponibilidad Real de Datos en TSM-AI

| Campo / Registro Técnico | Origen / Tabla | Estado de Disponibilidad | Manejo en AG-011 ante Ausencia |
| :--- | :--- | :---: | :--- |
| `asset_id`, `nombre`, `tipo`, `depto` | `cat_maquinas` (vía M-010) | **ALTA (100%)** | Error fatal si no existe activo válido. |
| `falla_descripcion`, `solucion_aplicada` | `ordenes_trabajo` (vía M-010) | **ALTA (>95%)** | Campo base para extraer observaciones y procedimientos. |
| `refacciones_consumidas` | `ot_repuestos` (vía M-010) | **MEDIA-ALTA (~85%)** | Opcional en contenido técnico (`required_parts = []`). |
| `hallazgos_fisicos` | `hallazgos_tecnicos` (vía M-010) | **MEDIA (~70%)** | Incorporado como `CERTIFIED_FACT` si existe. |
| `arbol_5_porques` | `AG-010` (RCA) | **VARIABLE (~40-60%)** | Opcional; una memoria puede nacer de un SOP sin RCA. |
| `causa_confirmada_humano` | `AG-010 / Validación Humana` | **CRÍTICA (~30%)** | Si no está confirmada, la causa es `null` o hipótesis no vinculante. |
| `component_id` (Taxonomía Formal) | `cat_componentes` | **PARCIAL (~50%)** | Si no existe catálogo formal, se usa `COMPONENT_ID = UNKNOWN`. |
| `calificacion_salud_riesgo` | `M-011` | **ALTA (>90%)** | Contexto de severidad en candidatos. |

---

## 2. Invariante de No-Inversión de Hechos

Si un campo o medición no está presente en el expediente original (`M-010`), AG-011 tiene estrictamente prohibido asumir o inventar valores. Se registrará formalmente como dato faltante o no aplicable.
