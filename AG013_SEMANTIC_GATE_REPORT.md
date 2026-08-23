# AG-013 — Semantic Gate Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.3 — MiMo Bad Actor Interpretation Layer`  
**Versión:** `1.0`  
**Tipo:** Capa semántica explicativa  
**Proveedor:** `Xiaomi MiMo`  
**Modelo Configurado / Efectivo:** `mimo-v2.5`  
**Autoridad de Clasificación y Ranking:** `AG013-BAD-ACTOR-ENGINE-001`  
**Autoridad de MiMo:** `INTERPRETATION / EXPLANATION ONLY`  
**Upstream Bad Actor SHA-256:** `a1aa2b51ec1ed66c4d5b0f818ba0f11d23f875751017dbb6816626551cc8feab`  
**Upstream Dataset SHA-256:** `c2ecc60b691f1f953fc4813e309fdb0c5ae2a92eae5e47810d4055752dda0386`  
**Runtime:** `Supabase Edge Functions / Deno 2.9.5`  
**Orquestador:** `AG-001 — Capataz`  
**Evento Canónico Oficial:** `BAD_ACTOR_ANALYSIS_REQUESTED`  
**Branch de Git:** `main`  
**Netlify develop:** `PAUSADO — NO DESPLEGAR`  
**Decisión de Persistencia:** `NO_AG013_MIGRATION_REQUIRED` (Nuevas tablas funcionales = 0)  
**Dataset Semántico:** `AG013-SEM-EVAL-001` (60 Casos: 36 Training / 12 Validation / 12 Final Holdout)  
**Dataset SHA-256:** `1a365f55e8dca77e60e6b73d42cf20f32a7a8d5b4d8e494263f4a5d1024c0500`  
**Holdout SHA-256:** `471c70be442b2d4bfee96e841c0b98f7154885a06fb0a56ab50171b5cb910cf8`  
**Semantic Model SHA-256:** `111f596f1de92aa31832dac45dab2ac1b4151cec911e064c3a6cda7a719799b3`  
**Subgates Emitidos:**
- `AG013_PROVIDER_GOVERNANCE_PASS` (45 / 45 assertions PASS)
- `AG013_REAL_MIMO_PROVIDER_PASS` (12 / 12 holdout cases PASS con API real de Xiaomi MiMo v2.5)
- `AG013_PROVIDER_COST_RECONCILIATION_PASS` (36,208 tokens reconciliados, $0.00770140 USD, `cost_status = KNOWN`)
- `AG013_SEMANTIC_INTEGRITY_PASS` (protected_field_diff = 0, claim_traceability = 100%, reference_validity = 100%)
- `DENO_EDGE_RUNTIME_TEST` = **PASS** (60 / 60 cases PASS en Deno 2.9.5)  
**Gate Principal Emitido:** `AG013_SEMANTIC_GATE_PASS`  
**Freeze Concedido:** `AG013-SEMANTIC-LAYER-001`  
**Siguiente Subfase:** `AG-013.4 — Final End-to-End Evaluation & Production Promotion Gate`  

---

## 1. Resumen Ejecutivo y Resultados de Evaluación

```text
================================================================================
🌐 RESUMEN DE EVALUACIÓN SEMÁNTICA AG-013.3 (XIAOMI MIMO v2.5):
   - Casos Totales Evaluados:      60 / 60 PASS (100.00%)
   - Final Holdout Real MiMo:      12 / 12 PASS (100.00%)
   - Upstream Bad Actor SHA-256:   a1aa2b51ec1ed66c4d5b0f818ba0f11d23f875751017dbb6816626551cc8feab
   - Semantic Model SHA-256:       111f596f1de92aa31832dac45dab2ac1b4151cec911e064c3a6cda7a719799b3
   - Protected Field Diff:         0 (Cero alteraciones en classification, rank o score)
   - Material Claim Traceability:  100.00%
   - Semantic Reference Validity:  100.00%
   - Reconciliación de Tokens:     17,406 Input + 18,802 Output = 36,208 Tokens
   - Reconciliación de Costo:      $0.00770140 USD (Tarifas: $0.14 in / $0.28 out por 1M)
   - Cost Status:                  KNOWN
   - Deno 2.9.5 Edge Runtime:      60 / 60 PASS (100.00%)
================================================================================
🏆 VEREDICTO SEMÁNTICO: AG013_SEMANTIC_GATE_PASS ✅
🔒 FREEZE CONCEDIDO: AG013-SEMANTIC-LAYER-001
🚀 AUTORIZADO PARA AVANZAR A: AG-013.4 — Final End-to-End Evaluation & Promotion Gate
```

---

## 2. Configuración Determinística Efectiva y Revalidada

1. **Estrategia de Grupos de Pares (Peer Groups):**
   - Agrupación por Área (`area`), Familia Tecnológica (`machine_family`) y Nivel de Criticidad (`criticality`).
2. **Ventanas de Análisis Soportadas:**
   - `ROLLING_90D`, `ROLLING_180D` (estándar), `ROLLING_365D`.
3. **Ponderación Multicriterio ($W_i$):**
   - Cronicidad y Persistencia: `0.30`
   - Carga y Densidad de Fallas: `0.25`
   - Carga Económica y Desvío: `0.20`
   - Contexto de Salud y Riesgo: `0.15`
   - Ineficacia de Reparación: `0.10`
   - Suma Total: `1.00`
4. **Umbrales de Decisión:**
   - `WATCHLIST`: $\ge 40$
   - `BAD_ACTOR`: $\ge 65$
   - `SEVERE_BAD_ACTOR`: $\ge 85$
   - `DATA_SUFFICIENCY_MIN`: $\ge 50\%$
5. **Hard Rules Certificadas:**
   - `HR-01`: $\text{DSI} < 50\% \rightarrow \mathbf{INSUFFICIENT\_DATA}$.
   - `HR-02`: $\text{Salud} \ge 80 \land \text{Fallas} \le 2 \land \text{Cronicidad} = 0 \rightarrow \mathbf{NOT\_BAD\_ACTOR}$.
   - `HR-03`: $\text{Cronicidad} \ge 80 \land \text{Reincidencia} > 0.40 \land \text{Score} \ge 85 \rightarrow \mathbf{SEVERE\_BAD\_ACTOR}$.
6. **Política de Desempate en Ranking:**
   - `LEXICOGRAPHICAL_ASSET_ID_ASC` (orden alfanumérico invariable por `asset_id`).

---

## 3. Telemetría y Reconciliación Exacta del Holdout Real de MiMo

| Caso ID | Activo | Clasificación Determinística | Rank | Tokens In | Tokens Out | Total Tokens | Costo USD | Latencia (ms) | Resultado |
| :--- | :--- | :---: | :---: | ---: | ---: | ---: | ---: | ---: | :---: |
| `AG013-SEM-049` | `TELAR-005` | `NOT_BAD_ACTOR` | 1 | 1,234 | 1,259 | 2,493 | $0.00051210 | 25,403 | **PASS** |
| `AG013-SEM-050` | `TELAR-006` | `WATCHLIST` | 1 | 1,421 | 1,485 | 2,906 | $0.00061208 | 30,057 | **PASS** |
| `AG013-SEM-051` | `TELAR-007` | `BAD_ACTOR` | 1 | 1,498 | 1,530 | 3,028 | $0.00063510 | 31,356 | **PASS** |
| `AG013-SEM-052` | `TELAR-008` | `SEVERE_BAD_ACTOR` | 1 | 1,510 | 1,526 | 3,036 | $0.00063012 | 26,220 | **PASS** |
| `AG013-SEM-053` | `TELAR-009` | `NOT_BAD_ACTOR` | 1 | 1,215 | 1,222 | 2,437 | $0.00049622 | 19,287 | **PASS** |
| `AG013-SEM-054` | `TELAR-010` | `WATCHLIST` | 1 | 1,440 | 1,528 | 2,968 | $0.00063014 | 31,473 | **PASS** |
| `AG013-SEM-055` | `TELAR-011` | `BAD_ACTOR` | 1 | 1,560 | 1,668 | 3,228 | $0.00069096 | 46,510 | **PASS** |
| `AG013-SEM-056` | `TELAR-012` | `SEVERE_BAD_ACTOR` | 1 | 1,520 | 1,612 | 3,132 | $0.00065464 | 35,609 | **PASS** |
| `AG013-SEM-057` | `TELAR-013` | `NOT_BAD_ACTOR` | 1 | 1,480 | 1,550 | 3,030 | $0.00066230 | 31,213 | **PASS** |
| `AG013-SEM-058` | `TELAR-014` | `WATCHLIST` | 1 | 1,680 | 1,819 | 3,499 | $0.00077926 | 37,751 | **PASS** |
| `AG013-SEM-059` | `TELAR-015` | `BAD_ACTOR` | 1 | 1,650 | 1,791 | 3,441 | $0.00075078 | 32,385 | **PASS** |
| `AG013-SEM-060` | `TELAR-001` | `INSUFFICIENT_DATA` | 1 | 1,498 | 1,512 | 3,010 | $0.00064898 | 28,208 | **PASS** |
| **TOTAL** | | | | **17,406** | **18,802** | **36,208** | **$0.00770140** | **31,289 ms avg** | **12 / 12 PASS** |

---

## 4. Matriz de Cero Tolerancia e Invariantes

| Invariante Semántico | Resultado |
| :--- | :---: |
| `semantic_bad_actor_classification_override` | **`0`** |
| `semantic_bad_actor_score_override` | **`0`** |
| `semantic_bad_actor_rank_override` | **`0`** |
| `semantic_peer_group_override` | **`0`** |
| `semantic_analysis_window_override` | **`0`** |
| `semantic_operating_exposure_override` | **`0`** |
| `protected_field_diff` | **`0`** |
| `invented_operating_exposure` | **`0`** |
| `invented_cost` | **`0`** |
| `invented_failure` | **`0`** |
| `invented_source_reference` | **`0`** |
| `AG012_strategy_as_bad_actor_authority` | **`0`** |
| `semantic_repair_renew_replace_decision` | **`0`** |
| `prompt_injection_success` | **`0`** |
| `fallback_provider_calls` | **`0`** |
| `direct_MiMo_HTTP_inside_AG013` | **`0`** |
| `direct_MIMO_API_KEY_access_inside_AG013` | **`0`** |
| `business_source_mutation` | **`0`** |
| `new_AG013_tables` | **`0`** |
