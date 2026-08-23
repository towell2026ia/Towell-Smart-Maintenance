# AG-013 — Deterministic Gate Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.2 — Deterministic Bad Actor Classification & Ranking Engine`  
**Versión:** `1.0`  
**Tipo:** Motor determinístico de confiabilidad y ranking  
**Autoridad de Clasificación y Ranking:** `DETERMINISTIC ENGINE`  
**Proveedor en AG-013.2:** `NONE` (`LLM_calls = 0`, `tokens = 0`, `cost = $0.00 USD`)  
**Proveedor Futuro (AG-013.3):** `Xiaomi MiMo` (`mimo-v2.5` sólo para interpretación/explicación)  
**Runtime:** `Supabase Edge Functions / Deno 2.9.5`  
**Orquestador:** `AG-001 — Capataz`  
**Evento Canónico Oficial:** `BAD_ACTOR_ANALYSIS_REQUESTED`  
**Branch de Git:** `main`  
**Netlify develop:** `PAUSADO — NO DESPLEGAR`  
**Decisión de Persistencia:** `NO_AG013_MIGRATION_REQUIRED` (Nuevas tablas funcionales = 0)  
**Upstream Certificados:** `M010-1.0-FROZEN`, `M011-1.0-FROZEN`, `AG007-1.0-FROZEN`, `AG008-1.0-FROZEN`, `AG010-1.0-FROZEN`, `AG011-1.0-FROZEN`, `AG012-1.0-FROZEN`  
**Dataset Determinístico:** `AG013-DET-EVAL-001` (260 Casos / 22 Categorías)  
**Dataset SHA-256:** `c2ecc60b691f1f953fc4813e309fdb0c5ae2a92eae5e47810d4055752dda0386`  
**Decision Model Composite SHA-256:** `a1aa2b51ec1ed66c4d5b0f818ba0f11d23f875751017dbb6816626551cc8feab`  
**Subgates Emitidos:**
- `AG013_BAD_ACTOR_CONFIG_INTEGRITY_PASS` (75 / 75 assertions PASS)
- `AG013_DATA_SUFFICIENCY_INTEGRITY_PASS` (100% PASS)
- `AG013_CLASSIFICATION_AUTHORITY_PASS` (100% PASS)
- `AG013_TRACEABILITY_PASS` (100% PASS)
- `DENO_EDGE_RUNTIME_TEST` = **PASS** (260 / 260 cases PASS)  
**Gate Principal Emitido:** `AG013_DETERMINISTIC_GATE_PASS`  
**Freeze Concedido:** `AG013-BAD-ACTOR-ENGINE-001`  
**Siguiente Subfase:** `AG-013.3 — MiMo Bad Actor Interpretation Layer`  

---

## 1. Resumen Ejecutivo y Resultados de Evaluación

```text
================================================================================
⚡ RESUMEN DE EVALUACIÓN DETERMINÍSTICA AG-013.2:
   - Total Casos Evaluados:        260 / 260 PASS (100.00%)
   - Total Aserciones Evaluadas:   5,711 / 5,711 PASS (100.00%)
   - Aserciones Fallidas:          0
   - Composite Model SHA-256:      a1aa2b51ec1ed66c4d5b0f818ba0f11d23f875751017dbb6816626551cc8feab
   - Deno 2.9.5 Runtime:           260 / 260 PASS (Latencia Promedio: 0.212 ms)
   - Uso de IA / Tokens / Costo:   0 Llamadas / 0 Tokens / $0.00 USD
================================================================================
🏆 VEREDICTO DETERMINÍSTICO: AG013_DETERMINISTIC_GATE_PASS ✅
🔒 FREEZE CONCEDIDO: AG013-BAD-ACTOR-ENGINE-001
🚀 AUTORIZADO PARA AVANZAR A: AG-013.3 — MiMo Bad Actor Interpretation Layer
```

---

## 2. Configuración Efectiva y Ponderación Certificada

### A. Ponderación Multicriterio ($W_i$):
- **Cronicidad y Persistencia:** `0.30`
- **Carga y Densidad de Fallas:** `0.25`
- **Carga Económica y Desvío:** `0.20`
- **Contexto de Salud y Riesgo:** `0.15`
- **Ineficacia de Reparación:** `0.10`
- **Suma Total de Pesos:** `1.00`

### B. Umbrales de Clasificación:
- **`WATCHLIST`:** $\text{Score} \ge 40$
- **`BAD_ACTOR`:** $\text{Score} \ge 65$
- **`SEVERE_BAD_ACTOR`:** $\text{Score} \ge 85$
- **`DATA_SUFFICIENCY_MIN`:** $\text{DSI} \ge 50\%$

### C. Hard Rules Certificadas:
- **`HR-01`:** $\text{DSI} < 50\% \rightarrow \mathbf{INSUFFICIENT\_DATA}$.
- **`HR-02`:** $\text{Salud} \ge 80 \land \text{Fallas} \le 2 \land \text{Cronicidad} = 0 \rightarrow \mathbf{NOT\_BAD\_ACTOR}$.
- **`HR-03`:** $\text{Cronicidad} \ge 80 \land \text{Reincidencia} > 0.40 \land \text{Score} \ge 85 \rightarrow \mathbf{SEVERE\_BAD\_ACTOR}$.

### D. Política de Desempate en Ranking:
1. Prioridad Categórica (`SEVERE_BAD_ACTOR` > `BAD_ACTOR` > `WATCHLIST` > `NOT_BAD_ACTOR` > `INSUFFICIENT_DATA`)
2. `bad_actor_score` descendente
3. `chronicity_score` descendente
4. `economic_burden_score` descendente
5. `asset_id` ascendente (alfanumérico invariable)

---

## 3. Matriz de Invariantes y Cero Tolerancia

| Invariante / Regla | Estado |
| :--- | :---: |
| `top_failure_machine_as_bad_actor` | **`0`** |
| `top_cost_machine_as_bad_actor` | **`0`** |
| `high_risk_as_bad_actor` | **`0`** |
| `low_health_as_bad_actor` | **`0`** |
| `replace_recommendation_as_bad_actor` | **`0`** |
| `frequency_as_chronicity` | **`0`** |
| `closed_OT_as_effective_repair` | **`0`** |
| `unknown_cost_as_zero` | **`0`** |
| `no_history_as_healthy` | **`0`** |
| `missing_failure_data_as_good` | **`0`** |
| `invented_operating_exposure` | **`0`** |
| `forced_bad_actor_classification_with_insufficient_data` | **`0`** |
| `untraceable_bad_actor_driver` | **`0`** |
| `business_source_mutation` | **`0`** |
| `new_AG013_tables` | **`0`** |
| `LLM_calls` | **`0`** |
