# AG-008 — Deterministic Gate Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad`  
**Subfase:** `AG-008.2 — Deterministic Failure Trend & Recurrence Engine`  
**Fecha de Evaluación:** `2026-08-20`  
**Uso de IA:** `NO` (0 Tokens, $0.00 USD)  
**Orquestador:** `AG-001 — Capataz`  
**Dataset Evaluado:** `AG008-DET-EVAL-001` (160 Casos)  
**Runtime:** `Supabase Edge Functions / Deno` (`DENO_EDGE_RUNTIME_TEST = PASS`)  
**Veredicto Final:** `AG008_DETERMINISTIC_GATE_PASS`  
**Freeze Maestro:** `AG008-DETERMINISTIC-ENGINE-001`  

---

## 1. Resumen Ejecutivo del Motor Determinístico de Fallas

Se ha construido y certificado formalmente el motor determinístico de inteligencia de fallas para **AG-008**, compuesto por:
- **Normalización Estricta (`AG008-FAILURE-NORMALIZATION-RULES-001`):** Catálogo cerrado de sinónimos técnicos (`FALLA_TRAMA`, `FALLA_URDIMBRE`, `VIBRACION_EXCESIVA`, `FUGA_ACEITE`, `FUGA_AIRE_NEUMATICA`, `SOBRECALENTAMIENTO_MOTOR`, `PARO_EMERGENCIA_ACTIVADO`, `FALLA_VARIADOR_FRECUENCIA`, `RUIDO_ANORMAL`), con inmutabilidad del texto crudo (`raw_failure_overwrite = 0`).
- **Deduplicación Criptográfica SHA-256 (`AG008-DEDUPE-RULES-001`):** Consolidación de duplicados exactos y cross-source (Telegram $\leftrightarrow$ OT), preservando el 100% de las recurrencias reales.
- **Motor de Recurrencia y Reincidencia (`AG008-RECURRENCE-RULES-001`, `AG008-REINCIDENCE-RULES-001`):** Detección matemática de recurrencias ($\ge 3$ en $\le 30$ días) y reincidencias técnicas post-reparación ($\le 15$ días tras cierre de OT previa).
- **Motor de Tendencia y Estacionalidad (`AG008-TREND-RULES-001`, `AG008-SEASONALITY-RULES-001`):** Regresión lineal de pendientes y detección estacional con guard de suficiencia ($\ge 12$ meses continuos, $Missing \neq Zero$).
- **Patrones Transversales y Concentración (`AG008-CROSS-MACHINE-RULES-001`, `AG008-CONCENTRATION-RULES-001`):** Detección de patrones entre máquinas sin inferencia de causa común y concentración con frontera de Bad Actor protegida.
- **Motor de Condiciones de Alerta (`AG008-ALERT-THRESHOLD-RULES-001`):** Emisión determinística de alertas estructuradas (`FAILURE_RECURRENCE_ALERT`, `FAILURE_REINCIDENCE_ALERT`, `FAILURE_TREND_UP`, `FAILURE_CONCENTRATION_ALERT`, `CROSS_MACHINE_PATTERN_ALERT`, `DATA_QUALITY_ALERT`).

---

## 2. Resultados de la Evaluación Automatizada (171 Aserciones)

```text
================================================================================
📊 RESUMEN DE EVALUACIÓN DETERMINÍSTICA AG-008.2:
   Total Aserciones Evaluadas: 171
   Aprobadas (PASS):           171 (100.00%)
   Fallidas  (FAIL):           0
   Llamadas a LLM:             0
   Tokens Consumidos:          0
   Costo IA Total:             $0.00 USD
================================================================================
🏆 VEREDICTO FINAL: AG008_DETERMINISTIC_GATE_PASS ✅
🔒 FREEZE MAESTRO CONCEDIDO: AG008-DETERMINISTIC-ENGINE-001
🦕 PRUEBA DE RUNTIME DENO: PASS
```

---

## 3. Matriz de Invariantes de Cero Tolerancia Certificados

| Invariante de Gobernanza / Determinismo | Límite Permitido | Obtenido | Estatus |
| :--- | :---: | :---: | :---: |
| Eventos de falla inventados (`invented_failure_event`)| 0 | **0** | ✅ CUMPLIDO |
| Sobreescritura de texto original (`raw_failure_overwrite`)| 0 | **0** | ✅ CUMPLIDO |
| Doble conteo de fallas duplicadas | 0 | **0** | ✅ CUMPLIDO |
| Recurrencias reales borradas como duplicados | 0 | **0** | ✅ CUMPLIDO |
| Reincidencia declarada sin prueba de reparación | 0 | **0** | ✅ CUMPLIDO |
| Tendencia inventada sin datos suficientes | 0 | **0** | ✅ CUMPLIDO |
| Estacionalidad inventada sin datos suficientes ($\ge 12\text{m}$)| 0 | **0** | ✅ CUMPLIDO |
| Datos faltantes interpretados como cero fallas | 0 | **0** | ✅ CUMPLIDO |
| Hallazgos físicos inventados por AG-008 | 0 | **0** | ✅ CUMPLIDO |
| Causas raíz inventadas por AG-008 (AG-010) | 0 | **0** | ✅ CUMPLIDO |
| Clasificación de Malos Actores como autoridad (AG-013)| 0 | **0** | ✅ CUMPLIDO |
| Cálculos monetarios o costos por AG-008 (AG-007)| 0 | **0** | ✅ CUMPLIDO |
| Solicitudes correctivas u OTs creadas por AG-008 | 0 | **0** | ✅ CUMPLIDO |
| Invocaciones directas de UI o Scheduler a AG-008 | 0 | **0** | ✅ CUMPLIDO |
| Llamadas a LLM / Tokens / Costo de IA | 0 | **0** | ✅ CUMPLIDO |

---

## 4. Manifests Congelados Bajo `AG008-DETERMINISTIC-ENGINE-001`

1. `AG008-FAILURE-IDENTITY-RULES-001`
2. `AG008-FAILURE-NORMALIZATION-RULES-001`
3. `AG008-DEDUPE-RULES-001`
4. `AG008-SERIES-RULES-001`
5. `AG008-FREQUENCY-RULES-001`
6. `AG008-RECURRENCE-RULES-001`
7. `AG008-REINCIDENCE-RULES-001`
8. `AG008-TREND-RULES-001`
9. `AG008-CONCENTRATION-RULES-001`
10. `AG008-CROSS-MACHINE-RULES-001`
11. `AG008-SEASONALITY-RULES-001`
12. `AG008-DATA-QUALITY-RULES-001`
13. `AG008-ALERT-THRESHOLD-RULES-001`
14. `AG008-DETERMINISTIC-ENGINE-001`

---

## 5. Dictamen de Transición hacia AG-008.3

```text
==============================================================================
               VEREDICTO: AG008_DETERMINISTIC_GATE_PASS
==============================================================================
El motor determinístico de AG-008 queda 100% certificado y congelado bajo el
token AG008-DETERMINISTIC-ENGINE-001. El agente queda habilitado para:
AG-008.3 — MiMo Failure Intelligence Interpretation Layer.
==============================================================================
```
