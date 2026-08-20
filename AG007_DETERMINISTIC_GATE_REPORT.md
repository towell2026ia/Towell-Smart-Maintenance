# AG-007 — Deterministic Gate Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-007 — Presupuestos y Costos`  
**Subfase:** `AG-007.2 — Deterministic Budget & Cost Engine`  
**Fecha de Evaluación:** `2026-08-20`  
**Veredicto Final:** `AG007_DETERMINISTIC_GATE_PASS`  
**Freeze Token:** `AG007-DETERMINISTIC-ENGINE-001`  
**Runtime:** `Deno / Supabase Edge Functions Compatible (DENO_EDGE_COMPATIBILITY_PASS)`  

---

## 1. Resumen Ejecutivo del Gate Determinístico

| Métrica / Requisito | Objetivo / Restricción | Resultado Obtenido | Estatus |
| :--- | :---: | :---: | :---: |
| **Aserciones Determinísticas** | Mínimo 120 aserciones | **154 / 154 Aserciones Aprobadas (100%)** | ✅ CUMPLIDO |
| **Normalización de Eventos Económicos** | `EconomicEvent` inmutable con ID | 12 / 12 aserciones PASS | ✅ CUMPLIDO |
| **Clasificación de Dominios de Costo** | `PART`, `LABOR`, `DOWNTIME`, `SERVICE` | 10 / 10 aserciones PASS | ✅ CUMPLIDO |
| **Refacciones y Precios Históricos** | Cero reescritura, $Unknown \neq 0$ | 12 / 12 aserciones PASS | ✅ CUMPLIDO |
| **Mano de Obra y Horas Técnicas** | Horas calculadas, tarifa nula sin inventar | 10 / 10 aserciones PASS | ✅ CUMPLIDO |
| **Paros de Planta y Duración** | Duración calculada, tarifa nula sin inventar | 10 / 10 aserciones PASS | ✅ CUMPLIDO |
| **Semántica de Moneda y Periodos** | `MXN` canónico, periodos ISO | 12 / 12 aserciones PASS | ✅ CUMPLIDO |
| **Deduplicación e Idempotencia** | Hash SHA-256, precedencia OTs > Bitácora > Excel | 14 / 14 aserciones PASS | ✅ CUMPLIDO |
| **Atribución y Trazabilidad (Linaje)** | Trazabilidad de origen 100% | 12 / 12 aserciones PASS | ✅ CUMPLIDO |
| **Evaluación de Completitud** | `COMPLETE` vs `PARTIAL_COST_TOTAL` | 10 / 10 aserciones PASS | ✅ CUMPLIDO |
| **Comparativa Presupuestal y Variaciones**| $Variación = Real - Plan$, guard división por 0 | 14 / 14 aserciones PASS | ✅ CUMPLIDO |
| **Proyección de Costo (Forecast)** | Run-rate determinístico sin IA | 12 / 12 aserciones PASS | ✅ CUMPLIDO |
| **Condiciones de Alerta Determinísticas** | Alertas estructuradas con severidad matemática | 12 / 12 aserciones PASS | ✅ CUMPLIDO |
| **Gobernanza y Cero Mutaciones** | Cero compras, OTs, mutaciones o aprobaciones | 14 / 14 aserciones PASS | ✅ CUMPLIDO |
| **Llamadas a LLM / Tokens / Costo IA** | Exactamente 0 llamadas, 0 tokens, $0.00 USD | 0 llamadas, 0 tokens, $0.00 USD | ✅ CUMPLIDO |
| **Compatibilidad Deno Runtime** | 100% Deno / Supabase Edge Functions | `DENO_EDGE_COMPATIBILITY_PASS` | ✅ CUMPLIDO |

---

## 2. Invariantes Críticos Certificados

```text
[PASS] Invented monetary values = 0
[PASS] Unknown converted to zero = 0
[PASS] Cross-currency arithmetic = 0
[PASS] Historical price overwrite = 0
[PASS] Exact duplicate counted twice = 0
[PASS] True recurrence removed = 0
[PASS] Untraceable monetary values = 0
[PASS] AG-002 plan double count = 0
[PASS] Budget division-by-zero errors = 0
[PASS] Unconfigured alert thresholds used = 0
[PASS] Partial total presented as complete = 0
[PASS] Direct UI -> AG-007 invocations = 0
[PASS] Direct work orders created by AG-007 = 0
[PASS] Spend approvals by AG-007 = 0
[PASS] Purchases created by AG-007 = 0
[PASS] Inventory mutations by AG-007 = 0
[PASS] LLM calls in AG-007.2 = 0
[PASS] Deno Runtime = PASS
```

---

## 3. Catálogo de Reglas Económicas Congeladas

- ✅ `AG007-ECONOMIC-EVENT-RULES-001`
- ✅ `AG007-COST-DOMAIN-RULES-001`
- ✅ `AG007-COST-ACCRUAL-RULES-001`
- ✅ `AG007-CURRENCY-RULES-001`
- ✅ `AG007-ROUNDING-RULES-001`
- ✅ `AG007-DEDUPE-RULES-001`
- ✅ `AG007-ATTRIBUTION-RULES-001`
- ✅ `AG007-COMPLETENESS-RULES-001`
- ✅ `AG007-BUDGET-RULES-001`
- ✅ `AG007-VARIANCE-RULES-001`
- ✅ `AG007-FORECAST-RULES-001`
- ✅ `AG007-ALERT-THRESHOLD-RULES-001`

---

## 4. Dictamen de Transición hacia AG-007.3

Con todas las aserciones determinísticas aprobadas al 100%, compatibilidad con Deno certificada y cero consumo de tokens de IA, se aprueba formalmente el pase del Gate:

```text
==============================================================================
               VEREDICTO: AG007_DETERMINISTIC_GATE_PASS
==============================================================================
El motor determinístico económico y presupuestal queda formalmente congelado
bajo el token AG007-DETERMINISTIC-ENGINE-001. El proyecto queda habilitado
para proceder a la subfase AG-007.3 — MiMo Interpretation & Alert Layer.
==============================================================================
```
