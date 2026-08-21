# M-011 — Effective Scoring Configuration & Cryptographic Lineage v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Subfase:** `M-011.2-R1 — Scoring Configuration Integrity & Certification Evidence`  
**Composite Model SHA-256:** `7bfff017f4564e8ab395ec612cb39a4c2274113be9f4555ece08bd25a6da4c40`  
**Freeze:** `M011-SCORING-CONFIG-EVIDENCE-001`  

---

## 1. Evidencia Criptográfica y Resumen de Manifests

```text
================================================================================
COMPOSITE MODEL FINGERPRINT:
7bfff017f4564e8ab395ec612cb39a4c2274113be9f4555ece08bd25a6da4c40

CORRESPONDENCIA CERTIFICADA:
CONFIGURACIÓN CONGELADA = CONFIGURACIÓN CARGADA = CONFIGURACIÓN EJECUTADA = CONFIGURACIÓN EVALUADA (100% MATCH)
================================================================================
```

---

## 2. Inventario de Configuraciones Efectivas y Hashes SHA-256

| Manifest ID | Versión | Descripción / Propósito | Hash SHA-256 Canónico |
| :--- | :---: | :--- | :--- |
| **`M011-FEATURE-CATALOG-001`** | `1.0` | Catálogo cerrado de features (4 Health, 4 Risk) | `068e27c196f7c5e206037e96e73685e135cb582ffecf1a6ec711a3dbcaea7625` |
| **`M011-FEATURE-WINDOWS-001`** | `1.0` | Ventanas temporales (90d, YTD, Lifetime) | `b18ef9b2072f8544d6daebbb67eb81f8a84c81062089b33e215f79fbe549e3cf` |
| **`M011-FEATURE-NORMALIZATION-001`**| `1.0`| Reglas de normalización acotadas [0, 100] | `6a4392652b41bfec6354897f1f948aeef114b036cbcc9febe8b7b3a4a0e66a5c` |
| **`M011-HEALTH-FORMULA-001`** | `1.0` | Promedio ponderado de salud con re-pesaje | `7385f9ef6a084c8ae6f564758d601d368e5904d9ea12b489d84bf8e9065a62e0` |
| **`M011-RISK-FORMULA-001`** | `1.0` | Promedio ponderado de exposición de riesgo | `c0754877f02d08dc974e64f77a8a6552efaa8fc161f308dfc4883f3817109b0b` |
| **`M011-HEALTH-WEIGHTS-001`** | `1.0` | Pesos: Fallas 30%, Mant 30%, Hallazgos 20%, Paros 20% | `4ff8ce1205c0836ce6407d57d23d8c1eeae7d337f7d3e6db8f01b44ec93e78f9` |
| **`M011-RISK-WEIGHTS-001`** | `1.0` | Pesos: Degradación 35%, Crit 25%, Rec 20%, Hallazgos 20% | `66870da938e550e504c5539d9fa733d3c8c7d039750058b76fbe6c4664fb9a57` |
| **`M011-HEALTH-THRESHOLDS-001`** | `1.0` | Umbrales: $\ge 85$ Healthy, $\ge 65$ Watch, $\ge 40$ Degraded | `8a2ca8fdbd2629b35b62b1a0302b1f8ef25b2933758a0b0d350ea262c5b36fa2` |
| **`M011-RISK-THRESHOLDS-001`** | `1.0` | Umbrales: $< 25$ Low, $< 50$ Moderate, $< 75$ High, $\ge 75$ Critical | `f57c5054ebdf8cce5e821815155f9a6af62569527ec56f3ce02047806509f6e6` |
| **`M011-DATA-SUFFICIENCY-001`** | `1.0` | Mínimo 65% peso disponible + fuentes core | `565da24c0840b2efd489b6dc67664687d55f9df0f46c64e0da1ddff93cb33a92` |

---

## 3. Matriz de Aislamiento y No-Contaminación Cruzada

- **`HEALTH_RISK_CROSSOVER_VIOLATIONS`**: `0`
- **`HEALTH_FEATURES_IN_RISK`**: `0` (Degradación de salud se consume como valor numérico procesado, no como variable cruda).
- **`RISK_FEATURES_IN_HEALTH`**: `0` (Criticidad de máquina NO entra en la fórmula de salud).
- **`UNREGISTERED_SCORING_CONSTANTS`**: `0`
- **`LLM_CALLS`**: `0`
- **`TOKENS_CONSUMED`**: `0`
- **`AI_COST`**: `$0.00 USD`
