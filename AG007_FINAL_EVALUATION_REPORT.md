# AG-007 — Master End-to-End Evaluation & Promotion Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-007 — Presupuestos y Costos`  
**Subfase:** `AG-007.4 — Final End-to-End Evaluation & Promotion Gate`  
**Fecha de Evaluación:** `2026-08-20`  
**Proveedor IA:** `Xiaomi MiMo (mimo-v2.5)`  
**API Auth:** `MIMO_API_KEY (Server-Side Protegido)`  
**Orquestador:** `AG-001 — Capataz`  
**Veredicto Final:** `AG007_FINAL_GATE_PASS`  
**Dictamen de Promoción:** `PROMOTION_TO_READY_RECOMMENDED`  
**Freeze Token Maestro:** `AG007-1.0-FROZEN`

---

## 1. Resumen Ejecutivo del Cierre y Promoción de AG-007

Se ha completado formalmente la evaluación integral End-to-End del agente **AG-007 — Presupuestos y Costos**, certificando en una sola arquitectura consolidada:
- La normalización y linaje reproducible del 100% de los eventos económicos (`EconomicEvents`).
- El cálculo matemático determinístico de gasto real, presupuestos, variaciones y forecast ($Unknown \neq 0$, división entre cero protegida, $MXN$ canónico).
- La deduplicación exacta de fuentes (OTs > Bitácora > Excel) y el respeto a la frontera del Plan Preventivo de `AG-002` (0 doble contabilización).
- La capa semántica controlada con Xiaomi MiMo (`mimo-v2.5`) con protección de campos protegidos (`protected_field_diff = 0`), rechazo de sobreescrituras numéricas y mitigación total de inyecciones de prompt.
- El enrutamiento exclusivo a través de `AG-001 (Capataz)` para eventos `SYSTEM_ALERTS_REQUESTED` y `AI_RECOMMENDATIONS_REQUESTED` con 0 llamadas directas desde el navegador.

---

## 2. Matriz de Evidencia de Todos los Gates del Ciclo de Vida

| Subfase / Gate | Criterio / Entregable | Aserciones / Casos | Resultado | Estatus |
| :--- | :--- | :---: | :---: | :---: |
| **AG-007.1** Architecture Gate | Data Map, Linaje, Fuentes y Frontera AG-002 | 14 Fuentes Auditadas | `AG007_ARCHITECTURE_GATE_PASS` | ✅ PASS |
| **AG-007.2** Deterministic Engine | Consolidación, Variaciones, Forecast, Alertas | 154 / 154 Aserciones | `AG007_DETERMINISTIC_GATE_PASS` | ✅ PASS |
| **AG-007.3** Semantic Mock Gate | Esquema Estricto, Catálogo Cerrado, Merge Guard | 60 / 60 Casos | `AG007_SEMANTIC_MOCK_GATE_PASS` | ✅ PASS |
| **AG-007.3** Real MiMo Gate | Telemetría Xiaomi MiMo (35,810 tokens, $0.01218 USD) | 12 / 12 Casos Holdout | `AG007_REAL_PROVIDER_GATE_PASS` | ✅ PASS |
| **AG-007.3** Deno Runtime Gate | Compatibilidad y Pipeline en Deno Edge Functions | 25 Módulos TypeScript | `DENO_EDGE_RUNTIME_TEST = PASS` | ✅ PASS |
| **AG-007.4** Final Master E2E | Evaluación Integral End-to-End (`AG007-EVAL-001`) | 170 / 170 Casos | `AG007_FINAL_GATE_PASS` | ✅ PASS |

---

## 3. Resultados de la Evaluación Maestro E2E (`AG007-EVAL-001`)

- **Dataset Maestro:** `AG007-EVAL-001` (170 Casos)
- **Dataset SHA-256:** `2921198389b1b499a8ad6f0db9763945c47c8ec3e6e573c3262d2231773c78bd`
- **Holdout SHA-256:** `9a143face4b8371dd08f87e040ad23a9a05b4ca45d8f766559294fd7f83035d3`

```text
================================================================================
📊 MATRIZ DE RESULTADOS POR SPLIT (AG007-EVAL-001):
================================================================================
   - Training Split:      102 / 102 PASS (100.00%)
   - Validation Split:    34 / 34 PASS (100.00%)
   - Final Holdout Split: 34 / 34 PASS (100.00%)
   -----------------------------------------------------------------------------
   TOTAL CASOS EVALUADOS: 170 / 170 PASS (100.00%)
================================================================================
```

---

## 4. Tabla de Invariantes de Cero Tolerancia (§186 PRD-AG-007.4)

| Invariante de Gobernanza / Seguridad | Límite Permitido | Obtenido | Estatus |
| :--- | :---: | :---: | :---: |
| Dinero inventado (`invented_money`) | 0 | **0** | ✅ CUMPLIDO |
| Desconocido a cero (`UNKNOWN_to_zero`) | 0 | **0** | ✅ CUMPLIDO |
| Cifras sin linaje (`untraceable_money`) | 0 | **0** | ✅ CUMPLIDO |
| Doble conteo financiero (`financial_double_count`) | 0 | **0** | ✅ CUMPLIDO |
| Doble conteo plan preventivo AG-002 (`AG002_double_count`)| 0 | **0** | ✅ CUMPLIDO |
| Operaciones multi-moneda no autorizadas (`cross_currency_sum`)| 0 | **0** | ✅ CUMPLIDO |
| Precios históricos sobreescritos | 0 | **0** | ✅ CUMPLIDO |
| Costo parcial presentado como total completo | 0 | **0** | ✅ CUMPLIDO |
| División por cero en variaciones porcentuales | 0 | **0** | ✅ CUMPLIDO |
| Sobreescrituras monetarias de MiMo aceptadas | 0 | **0** | ✅ CUMPLIDO |
| Autorizaciones de gasto generadas por AG-007 | 0 | **0** | ✅ CUMPLIDO |
| Órdenes de compra generadas por AG-007 | 0 | **0** | ✅ CUMPLIDO |
| Órdenes de trabajo creadas por AG-007 | 0 | **0** | ✅ CUMPLIDO |
| Mutaciones de inventario por AG-007 | 0 | **0** | ✅ CUMPLIDO |
| Inyecciones de prompt exitosas | 0 | **0** | ✅ CUMPLIDO |
| Invocaciones directas de UI a AG-007 (`direct_UI_to_AG007`)| 0 | **0** | ✅ CUMPLIDO |
| Exposición de secretos o API Keys (`MIMO_API_KEY`) | 0 | **0** | ✅ CUMPLIDO |

---

## 5. Tokens de Congelamiento Congelados Bajo `AG007-1.0-FROZEN`

1. `AG007-DATA-MAP-001`
2. `AG007-COST-DOMAIN-MAP-001`
3. `AG007-SOURCE-OF-TRUTH-001`
4. `AG007-COST-LINEAGE-001`
5. `AG007-AG002-BOUNDARY-001`
6. `AG007-DETERMINISTIC-ENGINE-001`
7. `AG007-ECONOMIC-EVENT-RULES-001`
8. `AG007-COST-DOMAIN-RULES-001`
9. `AG007-COST-ACCRUAL-RULES-001`
10. `AG007-CURRENCY-RULES-001`
11. `AG007-ROUNDING-RULES-001`
12. `AG007-DEDUPE-RULES-001`
13. `AG007-ATTRIBUTION-RULES-001`
14. `AG007-COMPLETENESS-RULES-001`
15. `AG007-BUDGET-RULES-001`
16. `AG007-VARIANCE-RULES-001`
17. `AG007-FORECAST-RULES-001`
18. `AG007-ALERT-THRESHOLD-RULES-001`
19. `AG007-SEMANTIC-LAYER-001`
20. `AG007-PROVIDER-VERIFICATION-001`
21. `AG007-PROMPT-001`
22. `AG007-SEMANTIC-INPUT-001`
23. `AG007-SEMANTIC-001`
24. `AG007-PATTERN-CATALOG-001`
25. `AG007-SEMANTIC-CALL-RULES-001`
26. `AG007-EVAL-001`
27. `AG007-1.0-FROZEN`

---

## 6. Dictamen de Promoción y Transición

```text
==============================================================================
               VEREDICTO FINAL: AG007_FINAL_GATE_PASS
==============================================================================
El Agente AG-007 — Presupuestos y Costos queda oficialmente promovido a:
                           ESTADO: READY
                           ACTIVO: TRUE
                          VERSIÓN: 1.0
Freeze Maestro Concedido: AG007-1.0-FROZEN.

Rama C — Alertas:
  AG-007 — Presupuestos y Costos: ✅ READY (Producción)
  AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad: ⏳ SIGUIENTE
==============================================================================
```
