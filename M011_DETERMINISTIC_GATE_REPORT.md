# M-011 — Deterministic Gate Report v1.0 (R1 Certified)

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Subfase:** `M-011.2 — Deterministic Asset Health & Risk Engine` (con Corrección `M-011.2-R1`)  
**Fecha de Certificación:** `2026-08-21`  
**Es IA:** `NO` (0 LLM calls, 0 tokens, $0.00 USD)  
**Runtime:** `Supabase Edge Functions / Deno 2.9.5`  
**Proveedor de Contexto:** `M-010 — Asset 360` (`M010-ASSET-CONTEXT-001`, `M010-1.0-FROZEN`)  
**Gate Ratificado:** `M011_DETERMINISTIC_GATE_PASS`  
**Subgate Aprobado:** `M011_SCORING_CONFIG_INTEGRITY_PASS`  
**Composite Model SHA-256:** `7bfff017f4564e8ab395ec612cb39a4c2274113be9f4555ece08bd25a6da4c40`  
**Freezes Congelados:** `M011-HEALTH-RISK-ENGINE-001`, `M011-SCORING-CONFIG-EVIDENCE-001`  
**Siguiente Subfase:** `M-011.3 — Final E2E Evaluation & Module Freeze`  

---

## 1. Evidencia Criptográfica de Integridad de Configuración (R1)

```text
================================================================================
CORRESPONDENCIA 1-A-1 CERTIFICADA:
CONFIGURACIÓN CONGELADA = CONFIGURACIÓN CARGADA = CONFIGURACIÓN EJECUTADA = CONFIGURACIÓN EVALUADA

COMPOSITE MODEL SHA-256: 7bfff017f4564e8ab395ec612cb39a4c2274113be9f4555ece08bd25a6da4c40
================================================================================
```

| Manifest / Configuración | Versión | Contenido Canónico / Valores Efectivos | Hash SHA-256 Individual |
| :--- | :---: | :--- | :--- |
| **`M011-FEATURE-CATALOG-001`** | `1.0` | 8 features cerradas (4 Health, 4 Risk) | `068e27c196f7c5e206037e96e73685e135cb582ffecf1a6ec711a3dbcaea7625` |
| **`M011-FEATURE-WINDOWS-001`** | `1.0` | 90d (Fallas/Paros/Hallazgos), YTD (Preventivo), Lifetime (Crit) | `b18ef9b2072f8544d6daebbb67eb81f8a84c81062089b33e215f79fbe549e3cf` |
| **`M011-FEATURE-NORMALIZATION-001`**| `1.0` | Reglas de normalización acotadas [0, 100] | `6a4392652b41bfec6354897f1f948aeef114b036cbcc9febe8b7b3a4a0e66a5c` |
| **`M011-HEALTH-FORMULA-001`** | `1.0` | Promedio ponderado de salud con re-pesaje ($\ge 60\%$) | `7385f9ef6a084c8ae6f564758d601d368e5904d9ea12b489d84bf8e9065a62e0` |
| **`M011-RISK-FORMULA-001`** | `1.0` | Promedio ponderado de exposición operacional ($\ge 60\%$) | `c0754877f02d08dc974e64f77a8a6552efaa8fc161f308dfc4883f3817109b0b` |
| **`M011-HEALTH-WEIGHTS-001`** | `1.0` | Fallas (0.30), Mant (0.30), Hallazgos (0.20), Paros (0.20) | `4ff8ce1205c0836ce6407d57d23d8c1eeae7d337f7d3e6db8f01b44ec93e78f9` |
| **`M011-RISK-WEIGHTS-001`** | `1.0` | Degradación (0.35), Criticidad (0.25), Recurrencia (0.20), Hallazgos (0.20) | `66870da938e550e504c5539d9fa733d3c8c7d039750058b76fbe6c4664fb9a57` |
| **`M011-HEALTH-THRESHOLDS-001`** | `1.0` | $\ge 85$: HEALTHY, $\ge 65$: WATCH, $\ge 40$: DEGRADED, $< 40$: CRITICAL | `8a2ca8fdbd2629b35b62b1a0302b1f8ef25b2933758a0b0d350ea262c5b36fa2` |
| **`M011-RISK-THRESHOLDS-001`** | `1.0` | $< 25$: LOW, $< 50$: MODERATE, $< 75$: HIGH, $\ge 75$: CRITICAL | `f57c5054ebdf8cce5e821815155f9a6af62569527ec56f3ce02047806509f6e6` |
| **`M011-DATA-SUFFICIENCY-001`** | `1.0` | Mínimo 65% peso activo + fuentes core requeridas | `565da24c0840b2efd489b6dc67664687d55f9df0f46c64e0da1ddff93cb33a92` |

---

## 2. Resultados de las Suites de Evaluación (204 Aserciones en Total)

```text
================================================================================
📊 1. SUITE DE INTEGRIDAD DE CONFIGURACIÓN R1 (30 ASERCIONES):
   - Formula Hash Integrity (4 aserciones):               4 /  4 PASS (100%)
   - Weight Integrity (4 aserciones):                     4 /  4 PASS (100%)
   - Threshold Integrity (4 aserciones):                  4 /  4 PASS (100%)
   - Normalization Integrity (4 aserciones):              4 /  4 PASS (100%)
   - Window Integrity (3 aserciones):                     3 /  3 PASS (100%)
   - Data Sufficiency Integrity (3 aserciones):           3 /  3 PASS (100%)
   - Health/Risk Isolation (4 aserciones):                4 /  4 PASS (100%)
   - Composite Fingerprint (4 aserciones):                4 /  4 PASS (100%)
   -----------------------------------------------------------------------------
   SUBTOTAL INTEGRIDAD R1:                                30 / 30 PASS (100.00%)
   SUBGATE STATUS:                                        M011_SCORING_CONFIG_INTEGRITY_PASS ✅

📊 2. SUITE DETERMINÍSTICA DE REGRESIÓN (174 ASERCIONES):
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
   SUBTOTAL DETERMINÍSTICO:                              174 / 174 PASS (100.00%)

📊 3. RUNTIME DENO 2.9.5:
   - Pipeline E2E en Edge Functions:                      PASS (DENO_EDGE_RUNTIME_TEST = PASS)
   - Composite Model Hash verificado en Deno:             7bfff017f4564e8ab395ec612cb39a4c2274113be9f4555ece08bd25a6da4c40
   -----------------------------------------------------------------------------
   TOTAL GLOBAL ASERCIONES:                              204 / 204 PASS (100.00%)
   LLAMADAS A LLM / TOKENS / COSTO IA:                   0 / 0 / $0.00 USD
   MUTACIONES A TABLAS FUENTE:                           0
================================================================================
🏆 VEREDICTO FINAL: M011_DETERMINISTIC_GATE_PASS RATIFICADO ✅
🔒 FREEZES CONCEDIDOS: M011-HEALTH-RISK-ENGINE-001 | M011-SCORING-CONFIG-EVIDENCE-001
```
