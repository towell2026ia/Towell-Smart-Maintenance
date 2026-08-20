# M-011 — Architecture Gate Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Subfase:** `M-011.1 — Health & Risk Data Architecture, Scoring Model & Source Map`  
**Fecha de Certificación:** `2026-08-20`  
**Es IA:** `NO` (0 LLM calls, 0 tokens, $0.00 USD)  
**Proveedor de Contexto:** `M-010 — Asset 360` (`M010-ASSET-CONTEXT-001`, `M010-1.0-FROZEN`)  
**Veredicto:** `M011_ARCHITECTURE_GATE_PASS`  
**Freeze Concedido:** `M011-DATA-MAP-001`  
**Siguiente Subfase:** `M-011.2 — Deterministic Asset Health & Risk Engine`  

---

## 1. Resumen Ejecutivo del Modelo Arquitectónico

La arquitectura del módulo **M-011** establece las bases determinísticas para calcular independientemente la **Salud del Activo (Health Score)** y el **Riesgo Operacional (Risk Score)**:

1. **Separación Conceptual Inquebrantable (`HEALTH != RISK`):**
   - **Salud:** Condición/degradación física intrínseca del activo calculada a partir de fallas recientes, cumplimiento de mantenimientos preventivo/autónomo, minutos de paro acumulados y severidad de hallazgos físicos. Escala: 0 a 100 (100 = Óptimo, 0 = Degradación Crítica).
   - **Riesgo:** Exposición operacional calculada a partir del nivel de degradación de salud, la criticidad oficial del catálogo (`cat_maquinas`), la recurrencia/tendencia de fallas (`AG-008`) y la severidad de hallazgos abiertos. Escala: 0 a 100 (0 = Riesgo Mínimo, 100 = Riesgo Crítico).
2. **Criticidad $\neq$ Salud (`CRITICALITY != HEALTH`):**
   - La criticidad de la máquina no contamina la salud física. Una máquina con criticidad ALTA puede tener Salud = 100, mientras que su Riesgo será proporcional a su nivel de degradación y su importancia operativa.
3. **Consumo Certificado desde M-010:**
   - M-011 solicita únicamente las secciones necesarias mediante el contrato de contexto `M011-ASSET-INPUT-001` sin realizar consultas directas a base de datos.
4. **Semántica de Datos Faltantes (`MISSING != ZERO`, `UNKNOWN != HEALTHY`):**
   - La falta de datos críticos genera estado `INSUFFICIENT_DATA` y score `null`, sin inventar scores arbitrarios neutros como 50.
5. **Persistencia:**
   - Decisión formal: **`NO_M011_MIGRATION_REQUIRED`**. El motor opera on-demand de forma ultrarrápida (< 20ms).

---

## 2. Tokens y Manifests Congelados (`M011-DATA-MAP-001`)

- `M011-DATA-MAP-001`
- `M011-ASSET-INPUT-001`
- `M011-FEATURE-CATALOG-001`
- `M011-FEATURE-WINDOWS-001`
- `M011-DATA-SUFFICIENCY-001`
- `M011-HEALTH-MODEL-001`
- `M011-HEALTH-FORMULA-001`
- `M011-HEALTH-WEIGHTS-001`
- `M011-HEALTH-THRESHOLDS-001`
- `M011-RISK-MODEL-001`
- `M011-RISK-FORMULA-001`
- `M011-RISK-WEIGHTS-001`
- `M011-RISK-THRESHOLDS-001`

---

## 3. Matriz de Resultados de Evaluación Arquitectónica (131 Aserciones)

```text
================================================================================
📊 MATRIZ DE EVALUACIÓN ARQUITECTÓNICA M-011.1:
   - M-010 Input Contract (10 aserciones):                 10 / 10 PASS (100%)
   - Feature Catalog (12 aserciones):                      12 / 12 PASS (100%)
   - Source Authority (10 aserciones):                     10 / 10 PASS (100%)
   - Health/Risk Separation (12 aserciones):               12 / 12 PASS (100%)
   - Missing/Unknown Semantics (12 aserciones):            12 / 12 PASS (100%)
   - Failure/AG-008 Boundary (10 aserciones):              10 / 10 PASS (100%)
   - Criticality Interaction (8 aserciones):                8 /  8 PASS (100%)
   - Maintenance / Checklists / Findings (10 aserciones):  10 / 10 PASS (100%)
   - Downtime / AG-007 Boundary (8 aserciones):             8 /  8 PASS (100%)
   - Formula / Weight / Threshold Readiness (14 aserc.):   14 / 14 PASS (100%)
   - Data Sufficiency (10 aserciones):                     10 / 10 PASS (100%)
   - Traceability / Versioning (8 aserciones):              8 /  8 PASS (100%)
   - Security / No-LLM / No Mutations (10 aserciones):     10 / 10 PASS (100%)
   -----------------------------------------------------------------------------
   TOTAL ASERCIONES EVALUADAS:                            131 / 131 PASS (100.00%)
================================================================================
🏆 VEREDICTO FINAL: M011_ARCHITECTURE_GATE_PASS ✅
🔒 FREEZE CONCEDIDO: M011-DATA-MAP-001
```
