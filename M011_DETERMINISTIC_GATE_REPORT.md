# M-011 — Deterministic Gate Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Subfase:** `M-011.2 — Deterministic Asset Health & Risk Engine`  
**Fecha de Certificación:** `2026-08-20`  
**Es IA:** `NO` (0 LLM calls, 0 tokens, $0.00 USD)  
**Runtime:** `Supabase Edge Functions / Deno 2.9.5`  
**Proveedor de Contexto:** `M-010 — Asset 360` (`M010-ASSET-CONTEXT-001`, `M010-1.0-FROZEN`)  
**Gate Esperado:** `M011_DETERMINISTIC_GATE_PASS`  
**Freeze Maestro:** `M011-HEALTH-RISK-ENGINE-001`  
**Siguiente Subfase:** `M-011.3 — Final E2E Evaluation & Module Freeze`  

---

## 1. Configuraciones Oficiales y Hashes de Certificación (§83, 211 PRD)

| Configuración / Manifest | Versión / Token | Configuración Efectiva / Valores Exactos | Hash SHA-256 / Checksum |
| :--- | :--- | :--- | :--- |
| **Dataset Evaluación** | `M011-DET-EVAL-001` | 3 perfiles maestros (Óptimo, Degradado, Insuficiente) | `e69b5773b03063fbea8ea11897d52dcf3be6142c0afd7bd0725f5aa5fd233b03` |
| **Health Formula** | `M011-HEALTH-FORMULA-001` | $\sum (NormVal_i \times W_i) / \sum W_i$ | `FORMULA-HEALTH-WEIGHTED-AVG-v1.0` |
| **Risk Formula** | `M011-RISK-FORMULA-001` | $\sum (NormVal_i \times W_i) / \sum W_i$ | `FORMULA-RISK-WEIGHTED-AVG-v1.0` |
| **Health Weights** | `M011-HEALTH-WEIGHTS-001` | `FAILURES: 0.30`, `MAINTENANCE: 0.30`, `FINDINGS: 0.20`, `DOWNTIME: 0.20` | `WEIGHTS-H-30-30-20-20` |
| **Risk Weights** | `M011-RISK-WEIGHTS-001` | `DEGRADATION: 0.35`, `CRITICALITY: 0.25`, `RECURRENCE_TREND: 0.20`, `FINDINGS: 0.20` | `WEIGHTS-R-35-25-20-20` |
| **Health Thresholds** | `M011-HEALTH-THRESHOLDS-001` | $\ge 85$: HEALTHY, $\ge 65$: WATCH, $\ge 40$: DEGRADED, $< 40$: CRITICAL | `THRESH-H-85-65-40` |
| **Risk Thresholds** | `M011-RISK-THRESHOLDS-001` | $< 25$: LOW, $< 50$: MODERATE, $< 75$: HIGH, $\ge 75$: CRITICAL | `THRESH-R-25-50-75` |
| **Data Sufficiency** | `M011-DATA-SUFFICIENCY-001` | Mínimo 65% peso activo + fuentes core requeridas | `SUFFICIENCY-THRESHOLD-65` |
| **Feature Windows** | `M011-FEATURE-WINDOWS-001` | `90_DAYS` (Fallas/Paros/Hallazgos), `CURRENT_YEAR` (Preventivo), `LIFETIME` (Criticidad) | `WINDOWS-90D-YTD-LIFE` |

---

## 2. Resultados de la Suite Determinística (174 Aserciones)

```text
================================================================================
📊 MATRIZ DE EVALUACIÓN DETERMINÍSTICA M-011.2 (174 ASERCIONES):
   - Input / M-010 Context (10 aserciones):               10 / 10 PASS (100%)
   - Evaluation Time / Windows (10 aserciones):           10 / 10 PASS (100%)
   - Feature Resolution (14 aserciones):                  14 / 14 PASS (100%)
   - Missing / Unknown Semantics (14 aserciones):         14 / 14 PASS (100%)
   - Data Sufficiency (12 aserciones):                    12 / 12 PASS (100%)
   - Normalization (12 aserciones):                       12 / 12 PASS (100%)
   - Health Components (14 aserciones):                   14 / 14 PASS (100%)
   - Health Score / Classification (12 aserciones):       12 / 12 PASS (100%)
   - Risk Components (14 aserciones):                     14 / 14 PASS (100%)
   - Risk Score / Classification (12 aserciones):         12 / 12 PASS (100%)
   - Health/Risk Separation (10 aserciones):              10 / 10 PASS (100%)
   - Traceability / Versioning (10 aserciones):           10 / 10 PASS (100%)
   - Boundaries / Security (16 aserciones):               16 / 16 PASS (100%)
   - Read-only / Audit / Deno (16 aserciones):            16 / 16 PASS (100%)
   -----------------------------------------------------------------------------
   TOTAL ASERCIONES EVALUADAS:                           174 / 174 PASS (100.00%)
   LLAMADAS A LLM:                                       0
   TOKENS CONSUMIDOS:                                    0
   COSTO IA TOTAL:                                       $0.00 USD
   MUTACIONES A TABLAS FUENTE:                           0
   RUNTIME DENO 2.9.5:                                   PASS (DENO_EDGE_RUNTIME_TEST = PASS)
================================================================================
🏆 VEREDICTO FINAL: M011_DETERMINISTIC_GATE_PASS ✅
🔒 FREEZE CONCEDIDO: M011-HEALTH-RISK-ENGINE-001
```

---

## 3. Tokens y Manifests Congelados

- `M011-DATA-MAP-001`
- `M011-FEATURE-RESOLVER-RULES-001`
- `M011-WINDOW-RESOLVER-RULES-001`
- `M011-NORMALIZATION-ENGINE-001`
- `M011-HEALTH-COMPONENT-ENGINE-001`
- `M011-RISK-COMPONENT-ENGINE-001`
- `M011-HEALTH-SCORING-ENGINE-001`
- `M011-RISK-SCORING-ENGINE-001`
- `M011-CLASSIFICATION-RULES-001`
- `M011-HEALTH-RISK-AUDIT-001`
- `M011-DET-EVAL-001`
- **Freeze Maestro:** **`M011-HEALTH-RISK-ENGINE-001`**
