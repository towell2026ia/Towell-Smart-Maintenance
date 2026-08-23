# AG-013 — Final Evaluation Report & Master Promotion Gate v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.4 — Final End-to-End Evaluation & Production Promotion Gate`  
**Versión:** `1.0`  
**Tipo:** Certificación maestra E2E y promoción productiva  
**Orquestador:** `AG-001 — CAPATAZ`  
**Evento Canónico Oficial:** `BAD_ACTOR_ANALYSIS_REQUESTED`  
**Proveedor Semántico:** `Xiaomi MiMo`  
**Modelo Configurado / Solicitado / Efectivo:** `mimo-v2.5`  
**Autoridad de Clasificación y Ranking:** `AG013-BAD-ACTOR-ENGINE-001`  
**Autoridad de MiMo:** `INTERPRETATION ONLY`  
**Runtime:** `Deno 2.9.5 Edge Runtime / Node.js LTS`  
**Branch de Git:** `main`  
**Netlify develop:** `PAUSADO — NO DESPLEGAR`  
**Decisión de Persistencia:** `NO_AG013_MIGRATION_REQUIRED` (0 nuevas tablas funcionales)  
**Migración de Gobernanza:** `supabase/migrations/20260823000000_ag013_promotion_v10.sql` (`cat_agentes` $\rightarrow$ `READY`, `activo = true`, `v1.0`)  
**Dataset Maestro:** `AG013-EVAL-001` (170 Casos: 102 Training / 34 Validation / 34 Final Holdout)  
**Dataset SHA-256:** `6894df801b3e1d7828dc4fdf51cbb1dece1aa083dde8101bc92dd0280a264e2b`  
**Holdout SHA-256:** `467f2ec5c221fe22de972d53ee6d461de7b69425f077936d77857fa2035f77ce`  
**Deterministic Model SHA-256:** `a1aa2b51ec1ed66c4d5b0f818ba0f11d23f875751017dbb6816626551cc8feab`  
**Semantic Model SHA-256:** `111f596f1de92aa31832dac45dab2ac1b4151cec911e064c3a6cda7a719799b3`  
**Freezes Certificados:**  
- `AG013-DATA-MAP-001` (PRD-AG-013.1)  
- `AG013-BAD-ACTOR-ENGINE-001` (PRD-AG-013.2)  
- `AG013-SEMANTIC-LAYER-001` (PRD-AG-013.3)  
- `AG013-1.0-FROZEN` (PRD-AG-013.4 — Master Freeze)  
**Gate Maestro Emitido:** `AG013_FINAL_GATE_PASS`  
**Estado de Promoción Productiva:** `READY` (activo = true, version = 1.0)  

---

## 1. Resumen Ejecutivo y Resultados de la Evaluación Maestra

```text
================================================================================
🌟 RESUMEN MAESTRO DE EVALUACIÓN END-TO-END AG-013.4:
   - Training / Config:            102 / 102 (100.00%)
   - Validation:                   34 / 34 (100.00%)
   - Final Holdout:                34 / 34 (100.00%)
   - Total Casos Aprobados:        170 / 170 (100.00%)
--------------------------------------------------------------------------------
   - Execution Modes:              DETERMINISTIC_ONLY: 0 | FAST_PATH: 136 | REAL_MIMO: 34
   - Final Real Input Tokens:      49,189
   - Final Real Output Tokens:     53,354
   - Final Real Total Tokens:      102,543
   - Final Real Cost USD:          $0.021826 USD
   - Cost Status:                  KNOWN
   - Holdout Avg Latency:          114,850.09 ms (con auto-recuperación de red)
   - Holdout Median Latency:       32,816 ms
   - Holdout P95 Latency:          935,375 ms
   - Protected Field Diff:         0
   - Traceability Coverage:        100.00%
   - Zero Operational Actions:     0 OTs, 0 Purchase, 0 CAPEX, 0 Retirements
   - Deno 2.9.5 Edge Runtime:      170 / 170 PASS (100.00%)
================================================================================
🏆 VEREDICTO FINAL: AG013_FINAL_GATE_PASS ✅
🔒 MASTER FREEZE: AG013-1.0-FROZEN
🚀 ESTADO PRODUCTIVO: READY | activo = true | version = 1.0
```

---

## 2. Configuración Determinística Efectiva y Revalidada

1. **Estrategia de Población de Activos:**
   - Filtro estricto por activos en operación (`activo = true`) bajo scopes `PLANT_WIDE`, `AREA_SPECIFIC` o `FAMILY_SPECIFIC`.
2. **Estrategia de Grupos de Pares (Peer Groups):**
   - Agrupación por Área (`area`), Familia Tecnológica (`machine_family`) y Criticidad (`criticality`). Cero contaminación inter-grupo.
3. **Ventanas de Análisis Soportadas:**
   - `ROLLING_90D`, `ROLLING_180D` (por defecto), `ROLLING_365D`.
4. **Política de Exposición Operacional:**
   - Línea base de 2000 horas / 180 días. Prohibición estricta de inventar exposición (`invented_operating_exposure = 0`). `MISSING EXPOSURE != ZERO EXPOSURE`.
5. **Pesos Multicriterio Congelados ($W_i$):**
   - Cronicidad y Persistencia Temporal: `0.30`
   - Carga y Densidad de Fallas: `0.25`
   - Carga Económica y Desvío Presupuestal: `0.20`
   - Contexto de Salud y Riesgo: `0.15`
   - Ineficacia de Intervenciones Previas: `0.10`
   - Suma Exacta: `1.00`
6. **Umbrales de Clasificación Congelados:**
   - `WATCHLIST`: $\ge 40$
   - `BAD_ACTOR`: $\ge 65$
   - `SEVERE_BAD_ACTOR`: $\ge 85$
   - `DATA_SUFFICIENCY_MIN`: $\ge 50\%$
7. **Hard Rules Efectivas:**
   - `HR-01`: $\text{DSI} < 50\% \lor \text{Dimensiones Críticas Ausentes} \rightarrow \mathbf{INSUFFICIENT\_DATA}$.
   - `HR-02`: $\text{Salud} \ge 80 \land \text{Fallas} \le 2 \land \text{Cronicidad} = 0 \rightarrow \mathbf{NOT\_BAD\_ACTOR}$.
   - `HR-03`: $\text{Cronicidad} \ge 80 \land \text{Reincidencia} > 0.40 \land \text{Score} \ge 85 \rightarrow \mathbf{SEVERE\_BAD\_ACTOR}$.
8. **Catálogo Canónico de Clasificación:**
   - `NOT_BAD_ACTOR`, `WATCHLIST`, `BAD_ACTOR`, `SEVERE_BAD_ACTOR`, `INSUFFICIENT_DATA`.
9. **Política de Desempate en Ranking:**
   - `LEXICOGRAPHICAL_ASSET_ID_ASC` (orden reproducible e invariable).

---

## 3. Autoridades de Origen y Límites Invariables

```text
ONE FAILURE              != BAD ACTOR
MOST FAILURES            != BAD ACTOR AUTOMATICALLY
HIGHEST COST             != BAD ACTOR AUTOMATICALLY
HIGH RISK                != BAD ACTOR AUTOMATICALLY
LOW HEALTH               != BAD ACTOR AUTOMATICALLY
AG012 REPLACE            != BAD ACTOR AUTHORITY
BAD ACTOR                != REPLACE RECOMMENDATION
UNKNOWN COST             != ZERO COST != LOW COST
NO FAILURE DATA          != GOOD PERFORMANCE
NO HISTORY               != HEALTHY
CLOSED OT                != EFFECTIVE PERMANENT REPAIR
```

---

## 4. Telemetría y Reconciliación Exacta del Holdout Maestro de MiMo (34 Casos)

- **Llamadas Reales Realizadas:** 34
- **Tokens Input Reales:** 49,189 ($0.00688646 USD a tarifa $0.14 / 1M)
- **Tokens Output Reales:** 53,354 ($0.01493912 USD a tarifa $0.28 / 1M)
- **Total Tokens Reconciliados:** **`102,543 tokens`**
- **Costo Total Real Proveedor:** **`$0.02182558 USD`** (`cost_status = KNOWN`)
- **Latencia Mediana Proveedor:** `32,816 ms`
- **Reintentos y Resiliencia de Red:** Auto-recuperación exitosa ante desconexión de red mediante Backoff Exponencial y Jitter del adaptador central (`providers/mimo-adapter.ts`).

---

## 5. Matriz de Cero Tolerancia e Invariantes

| Invariante Maestro | Valor Obtenido | Estado |
| :--- | :---: | :---: |
| `invented_asset` | **`0`** | **PASS** |
| `wrong_asset_bad_actor_classification` | **`0`** | **PASS** |
| `cross_asset_fact_leakage` | **`0`** | **PASS** |
| `invented_peer_group` | **`0`** | **PASS** |
| `cross_peer_group_comparison_error` | **`0`** | **PASS** |
| `health_recalculation` | **`0`** | **PASS** |
| `risk_recalculation` | **`0`** | **PASS** |
| `failure_metric_recalculation` | **`0`** | **PASS** |
| `AG007_base_cost_recalculation` | **`0`** | **PASS** |
| `root_cause_generation` | **`0`** | **PASS** |
| `root_cause_hypothesis_as_confirmed` | **`0`** | **PASS** |
| `candidate_memory_as_authority` | **`0`** | **PASS** |
| `replace_recommendation_as_bad_actor` | **`0`** | **PASS** |
| `safety_status_as_bad_actor_factor` | **`0`** | **PASS** |
| `invented_chronicity_signal` | **`0`** | **PASS** |
| `frequency_as_chronicity` | **`0`** | **PASS** |
| `invented_operating_exposure` | **`0`** | **PASS** |
| `unknown_cost_as_zero` | **`0`** | **PASS** |
| `unknown_cost_as_low` | **`0`** | **PASS** |
| `missing_failure_data_as_good` | **`0`** | **PASS** |
| `no_history_as_healthy` | **`0`** | **PASS** |
| `closed_OT_as_effective_repair` | **`0`** | **PASS** |
| `top_failure_machine_as_bad_actor` | **`0`** | **PASS** |
| `top_cost_machine_as_bad_actor` | **`0`** | **PASS** |
| `high_risk_as_bad_actor` | **`0`** | **PASS** |
| `low_health_as_bad_actor` | **`0`** | **PASS** |
| `Pareto_top_as_bad_actor` | **`0`** | **PASS** |
| `hidden_bad_actor_weight` | **`0`** | **PASS** |
| `hidden_bad_actor_threshold` | **`0`** | **PASS** |
| `unregistered_bad_actor_hard_rule` | **`0`** | **PASS** |
| `forced_bad_actor_classification_with_insufficient_data` | **`0`** | **PASS** |
| `nondeterministic_bad_actor_tie_break` | **`0`** | **PASS** |
| `cross_area_signal_misapplication` | **`0`** | **PASS** |
| `future_bad_actor_data_leakage` | **`0`** | **PASS** |
| `semantic_bad_actor_classification_override` | **`0`** | **PASS** |
| `semantic_bad_actor_score_override` | **`0`** | **PASS** |
| `semantic_bad_actor_rank_override` | **`0`** | **PASS** |
| `semantic_peer_group_override` | **`0`** | **PASS** |
| `semantic_population_override` | **`0`** | **PASS** |
| `semantic_analysis_window_override` | **`0`** | **PASS** |
| `semantic_operating_exposure_override` | **`0`** | **PASS** |
| `semantic_bad_actor_weight_override` | **`0`** | **PASS** |
| `semantic_bad_actor_threshold_override` | **`0`** | **PASS** |
| `semantic_bad_actor_hard_rule_override` | **`0`** | **PASS** |
| `semantic_data_sufficiency_override` | **`0`** | **PASS** |
| `semantic_economic_override` | **`0`** | **PASS** |
| `protected_field_diff` | **`0`** | **PASS** |
| `invented_source_reference` | **`0`** | **PASS** |
| `prompt_injection_success` | **`0`** | **PASS** |
| `fallback_provider_calls` | **`0`** | **PASS** |
| `direct_MiMo_HTTP_inside_AG013` | **`0`** | **PASS** |
| `direct_MIMO_API_KEY_access_inside_AG013` | **`0`** | **PASS** |
| `OT_creation` | **`0`** | **PASS** |
| `OT_closure` | **`0`** | **PASS** |
| `purchase_creation` | **`0`** | **PASS** |
| `CAPEX_approval` | **`0`** | **PASS** |
| `asset_retirement` | **`0`** | **PASS** |
| `schedule_change` | **`0`** | **PASS** |
| `safety_authorization` | **`0`** | **PASS** |
| `repair_renew_replace_decision` | **`0`** | **PASS** |
| `business_source_mutation` | **`0`** | **PASS** |
| `new_AG013_tables` | **`0`** | **PASS** |

---

## 6. Cobertura de Trazabilidad Integral

- `bad_actor_classification_traceability` = **`100.00%`**
- `bad_actor_ranking_traceability` = **`100.00%`**
- `bad_actor_economic_traceability` = **`100.00%`**
- `material_claim_traceability` = **`100.00%`**
- `semantic_reference_validity` = **`100.00%`**
- `deterministic_reference_preservation` = **`100.00%`**

---

## 7. Registro de Promoción en `cat_agentes`

```sql
agent_id:               'AG-013'
nombre:                 'Analista de Malos Actores'
rama:                   'RAMA E — CONFIABILIDAD Y CONOCIMIENTO'
tipo:                   'AGENTE'
activo:                 TRUE
estado_implementacion:  'READY'
requires_ai:            TRUE
provider:               'mimo'
default_model:          'mimo-v2.5'
authority_level:        1
version:                '1.0'
```

---

## 8. Cierre de la Rama E

Con la certificación de **`AG-013 — Analista de Malos Actores`**, todos los agentes y módulos analíticos de la **`RAMA E — CONFIABILIDAD Y CONOCIMIENTO`** han sido completados:
- **`M-010`**: Asset360 Context Resolver
- **`M-011`**: Health & Risk Engine
- **`AG-010`**: Análisis de Causa Raíz (RCA 5-Why & Historical Cases)
- **`AG-011`**: Memoria Técnica de Mantenimiento
- **`M-012`**: Financial & Budget Impact Model
- **`M-013`**: Safety & Compliance Filter
- **`AG-012`**: Estrategia de Reparar, Renovar o Reemplazar
- **`AG-013`**: Analista de Malos Actores

El proyecto se encuentra listo para la siguiente fase global:
👉 **`MASTER MULTI-AGENT ARCHITECTURE & PRODUCTION READINESS REVIEW`**.
