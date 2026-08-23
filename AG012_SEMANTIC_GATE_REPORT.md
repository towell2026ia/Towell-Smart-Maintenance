# AG-012 — Semantic Gate Report v1.0 (Reconciled R1)

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Subfase:** `AG-012.3 / AG-012.3-R1 — MiMo Intervention Strategy Explanation Layer & Cost Reconciliation`  
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
**Gates Emitidos:** `AG012_PROVIDER_COST_RECONCILIATION_PASS`, `AG012_PROVIDER_GOVERNANCE_PASS`, `AG012_SEMANTIC_MOCK_PASS`, `AG012_REAL_MIMO_PROVIDER_PASS`, `DENO_EDGE_RUNTIME_TEST = PASS`, `AG012_SEMANTIC_GATE_PASS`  
**Freeze Concedido & Ratificado:** `AG012-SEMANTIC-LAYER-001`  
**Siguiente Subfase:** `AG-012.4 — Final End-to-End Evaluation & Promotion Gate`  

---

## 1. Resumen Ejecutivo y Resultados de la Evaluación Semántica Reconciliada

```text
================================================================================
📊 RESULTADOS CONSOLIDADOS DE EVALUACIÓN SEMÁNTICA AG-012.3-R1:
   - Dataset Semántico:          AG012-SEM-EVAL-001 (60 casos)
   - Split Training / Val:       48 / 48 PASS (100.00% en Mock Suite)
   - Split Final Holdout:        12 / 12 PASS (100.00% contra Xiaomi MiMo v2.5 Real)
   - Total Casos Evaluados:      60 / 60 PASS (100.00%)
   - Llamadas Reales a MiMo:     12 / 12 (REAL_MIMO = 12, FAST_PATH = 0)
   - Input Tokens Reconciliados: 22,265 tokens ($0.00311710 USD)
   - Output Tokens Reconciliados: 8,658 tokens ($0.00242424 USD)
   - Total Tokens Reconciliados: 30,923 tokens
   - Costo Total Real Reconciliado: $0.00554134 USD (Tarifa: $0.14 input / $0.28 output por 1M)
   - Cost Status:                KNOWN (Certificado con tarifa central y ledger exacto)
   - Latencia Promedio MiMo:     20,153.17 ms (Mediana: 19,990 ms, P95: 27,693 ms)
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
   ✅ AG012_PROVIDER_COST_RECONCILIATION_PASS
   ✅ AG012_PROVIDER_GOVERNANCE_PASS
   ✅ AG012_SEMANTIC_MOCK_PASS
   ✅ AG012_REAL_MIMO_PROVIDER_PASS
   ✅ DENO_EDGE_RUNTIME_TEST = PASS
   ✅ AG012_SEMANTIC_GATE_PASS

🔒 FREEZE CONCEDIDO & RATIFICADO: AG012-SEMANTIC-LAYER-001
🚀 AUTORIZADO PARA AVANZAR A: AG-012.4 — Final End-to-End Evaluation & Promotion Gate
```

---

## 2. Matriz de Reconciliación Exacta de Costos (§2-12 PRD-AG-012.3-R1)

| Dimensión de Telemetría | Valor Reconciliado | Tarifa Oficial | Costo USD Exacto |
| :--- | :---: | :---: | :---: |
| **Input Tokens** | `22,265` | `$0.14 / 1,000,000` | `$0.00311710 USD` |
| **Output Tokens** | `8,658` | `$0.28 / 1,000,000` | `$0.00242424 USD` |
| **Total Reconciliado** | `30,923` | *N/A* | **`$0.00554134 USD`** |

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
Cost Status:               KNOWN
```
