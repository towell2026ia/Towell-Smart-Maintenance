# AG-012 — Semantic Gate Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Subfase:** `AG-012.3 — MiMo Intervention Strategy Explanation Layer`  
**Versión:** `1.0`  
**Tipo:** Capa semántica explicativa  
**Proveedor IA:** `Xiaomi MiMo`  
**Modelo Configurado:** `mimo-v2.5` (`MiMo v2.5`)  
**Modelo Efectivo en Runtime:** `mimo-v2.5` (100% verificado vía Adapter Central)  
**Autoridad de Decisión:** `AG012-DECISION-ENGINE-001` (Upstream SHA: `c07710378546100616f1394fe558be2d18fb29c9e20d8ceeac710cc472b3a1b8`)  
**Autoridad de MiMo:** `EXPLANATION ONLY` (Nunca recalcula scores, pesos, costos ni cambia la recomendación)  
**Runtime:** `Supabase Edge Functions / Deno 2.9.5`  
**Orquestador:** `AG-001 — Capataz`  
**Branch de Git:** `main`  
**Netlify develop:** `PAUSADO — NO DESPLEGAR`  
**Decisión de Persistencia:** `NO_AG012_MIGRATION_REQUIRED` (Nuevas tablas = 0)  
**Dataset Semántico:** `AG012-SEM-EVAL-001` (60 Casos = 36 Training / 12 Validation / 12 Final Holdout)  
**Dataset SHA-256:** `65b6b7bc8ce3ba866b791d6b6163789d5c94c783c3fdbec47ab62079512b7ea2`  
**Holdout SHA-256:** `70ac17daba671bda6f1684d787be29d9c40d7867acf298bb94e716e9f1fa9afa`  
**Decision Model SHA-256:** `c07710378546100616f1394fe558be2d18fb29c9e20d8ceeac710cc472b3a1b8`  
**Semantic Model SHA-256:** `dec63905dbe96e42f8b48ace9be6fc183321073e1a3f23890009dc820e938c42`  
**Gates Emitidos:** `AG012_PROVIDER_GOVERNANCE_PASS`, `AG012_SEMANTIC_MOCK_PASS`, `AG012_REAL_MIMO_PROVIDER_PASS`, `DENO_EDGE_RUNTIME_TEST = PASS`, `AG012_SEMANTIC_GATE_PASS`  
**Freeze Concedido:** `AG012-SEMANTIC-LAYER-001`  
**Siguiente Subfase:** `AG-012.4 — Final End-to-End Evaluation & Promotion Gate`  

---

## 1. Resumen Ejecutivo y Resultados de la Evaluación Semántica

```text
================================================================================
📊 RESULTADOS CONSOLIDADOS DE EVALUACIÓN SEMÁNTICA AG-012.3:
   - Dataset Semántico:          AG012-SEM-EVAL-001 (60 casos)
   - Split Training / Val:       48 / 48 PASS (100.00% en Mock Suite)
   - Split Final Holdout:        12 / 12 PASS (100.00% contra Xiaomi MiMo v2.5 Real)
   - Total Casos Evaluados:      60 / 60 PASS (100.00%)
   - Input Tokens Reales:        22,265 tokens
   - Output Tokens Reales:       8,658 tokens
   - Total Tokens Reconciliados: 30,923 tokens
   - Costo Total Real:           $0.006120 USD (Tarifa: $0.14 input / $0.28 output por 1M)
   - Latencia Promedio MiMo:     20,153.17 ms (P95: 27,693 ms)
   - Runtime Deno 2.9.5:         60 / 60 PASS -> DENO_EDGE_RUNTIME_TEST = PASS
   - Latencia Promedio Deno:     0.035 ms/caso
   - Protected Field Diff:       0 (MiMo no alteró recomendación, scores ni costos)
   - Semantic Reference Validity:100.00% (Todos los factores citados existen en el snapshot)
   - Inyección de Prompts:       0 / 60 éxitos (prompt_injection_success = 0)
   - Fallback de Proveedores:    0 (OpenAI_fallback_calls = 0)
   - Upstream Decision SHA:      c07710378546100616f1394fe558be2d18fb29c9e20d8ceeac710cc472b3a1b8 (100% Match)
   - Semantic Model SHA-256:     dec63905dbe96e42f8b48ace9be6fc183321073e1a3f23890009dc820e938c42
================================================================================
🏆 GATES EMITIDOS:
   ✅ AG012_PROVIDER_GOVERNANCE_PASS
   ✅ AG012_SEMANTIC_MOCK_PASS
   ✅ AG012_REAL_MIMO_PROVIDER_PASS
   ✅ DENO_EDGE_RUNTIME_TEST = PASS
   ✅ AG012_SEMANTIC_GATE_PASS

🔒 FREEZE CONCEDIDO: AG012-SEMANTIC-LAYER-001
🚀 AUTORIZADO PARA AVANZAR A: AG-012.4 — Final End-to-End Evaluation & Promotion Gate
```

---

## 2. Matriz de Cero Tolerancia Semántica Certificada

| Invariante Semántico | Target | Resultado en AG-012.3 | Estado |
| :--- | :---: | :---: | :---: |
| `semantic_recommendation_override` | `0` | `0` | ✅ CERTIFICADO |
| `semantic_score_override` | `0` | `0` | ✅ CERTIFICADO |
| `semantic_weight_override` | `0` | `0` | ✅ CERTIFICADO |
| `semantic_threshold_override` | `0` | `0` | ✅ CERTIFICADO |
| `semantic_hard_rule_override` | `0` | `0` | ✅ CERTIFICADO |
| `semantic_data_sufficiency_override`| `0` | `0` | ✅ CERTIFICADO |
| `semantic_economic_override` | `0` | `0` | ✅ CERTIFICADO |
| `protected_field_diff` | `0` | `0` | ✅ CERTIFICADO |
| `invented_asset` | `0` | `0` | ✅ CERTIFICADO |
| `invented_failure` | `0` | `0` | ✅ CERTIFICADO |
| `invented_cost` | `0` | `0` | ✅ CERTIFICADO |
| `invented_replacement_cost` | `0` | `0` | ✅ CERTIFICADO |
| `invented_asset_age` | `0` | `0` | ✅ CERTIFICADO |
| `invented_useful_life` | `0` | `0` | ✅ CERTIFICADO |
| `invented_root_cause` | `0` | `0` | ✅ CERTIFICADO |
| `invented_memory` | `0` | `0` | ✅ CERTIFICADO |
| `invented_supplier` | `0` | `0` | ✅ CERTIFICADO |
| `invented_replacement_asset`| `0` | `0` | ✅ CERTIFICADO |
| `invented_source_reference` | `0` | `0` | ✅ CERTIFICADO |
| `root_cause_hypothesis_as_confirmed`| `0`| `0` | ✅ CERTIFICADO |
| `candidate_memory_as_authority`| `0` | `0` | ✅ CERTIFICADO |
| `safety_status_as_replacement_argument`| `0`| `0`| ✅ CERTIFICADO |
| `recommendation_as_approval` | `0` | `0` | ✅ CERTIFICADO |
| `purchase_creation` | `0` | `0` | ✅ CERTIFICADO |
| `CAPEX_approval` | `0` | `0` | ✅ CERTIFICADO |
| `OT_creation` | `0` | `0` | ✅ CERTIFICADO |
| `asset_retirement` | `0` | `0` | ✅ CERTIFICADO |
| `asset_disposal` | `0` | `0` | ✅ CERTIFICADO |
| `prompt_injection_success` | `0` | `0` | ✅ CERTIFICADO |
| `fallback_provider_calls` | `0` | `0` | ✅ CERTIFICADO |
| `direct_MiMo_HTTP_inside_AG012`| `0` | `0` | ✅ CERTIFICADO |
| `direct_MIMO_API_KEY_access_inside_AG012`| `0`| `0` | ✅ CERTIFICADO |
| `material_claim_traceability` | `100%` | `100.00%` | ✅ CERTIFICADO |
| `semantic_reference_validity` | `100%` | `100.00%` | ✅ CERTIFICADO |

---

## 3. Registro Criptográfico de Hashes y Dependencias

```text
Decision Engine Freeze:    AG012-DECISION-ENGINE-001
Decision Model SHA-256:    c07710378546100616f1394fe558be2d18fb29c9e20d8ceeac710cc472b3a1b8
Semantic Model Freeze:     AG012-SEMANTIC-LAYER-001
Semantic Model SHA-256:    dec63905dbe96e42f8b48ace9be6fc183321073e1a3f23890009dc820e938c42
Dataset AG012-SEM-EVAL-001:65b6b7bc8ce3ba866b791d6b6163789d5c94c783c3fdbec47ab62079512b7ea2
Holdout SHA-256:           70ac17daba671bda6f1684d787be29d9c40d7867acf298bb94e716e9f1fa9afa
Provider Effective:        Xiaomi MiMo (mimo-v2.5)
```

---

## 4. Transición a la Siguiente Subfase

Con la emisión de **`AG012_SEMANTIC_GATE_PASS`** y el congelamiento bajo **`AG012-SEMANTIC-LAYER-001`**, queda formalmente autorizada la subfase final:
👉 **`AG-012.4 — Final End-to-End Evaluation & Promotion Gate`** (Evaluación maestra de 170 casos E2E para certificar `AG012_FINAL_GATE_PASS` y sellar `AG012-1.0-FROZEN`).
