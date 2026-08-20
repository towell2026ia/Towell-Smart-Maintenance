# AG-008 — Semantic Gate Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad`  
**Subfase:** `AG-008.3 — MiMo Failure Intelligence Interpretation Layer`  
**Fecha de Evaluación:** `2026-08-20`  
**Proveedor de IA:** `Xiaomi MiMo`  
**Modelo:** `mimo-v2.5`  
**Secret:** `MIMO_API_KEY` (Exclusivamente Server-Side)  
**Orquestador:** `AG-001 — Capataz`  
**Dataset Semántico:** `AG008-SEM-EVAL-001` (60 Casos: 36 Training / 12 Validation / 12 Holdout)  
**Runtime:** `Supabase Edge Functions / Deno` (`DENO_EDGE_RUNTIME_TEST = PASS`)  
**Veredicto Final:** `AG008_SEMANTIC_GATE_PASS`  
**Freeze Maestro:** `AG008-SEMANTIC-LAYER-001`  

---

## 1. Resumen Ejecutivo de la Capa Semántica

Se ha implementado y certificado la capa de interpretación semántica para **AG-008**, permitiendo convertir las señales del motor determinístico (`AG008-DETERMINISTIC-ENGINE-001`) en resúmenes técnicos estructurados y ejecutivos para la supervisión de mantenimiento, con las siguientes garantías:
1. **Regla Fundamental:** `AG-008.2 DETECTS. MiMo EXPLAINS.` MiMo no es autoridad matemática ni financiera.
2. **Campos Protegidos Inmutables (`protected_field_diff = 0`):** Conteo de fallas, estatus de recurrencia, reincidencia, pendientes de tendencia, estacionalidad y severidades de alerta no pueden ser alterados por MiMo.
3. **Merge Guard Determinístico:** Cualquier discrepancia o intento de sobreescritura es interceptada y rechazada (`overrides_rejected = 0`).
4. **Fronteras Operativas y Causalidad:** 0 causas raíz inferidas (AG-010), 0 clasificaciones de Bad Actor como autoridad final (AG-013), 0 cálculos de dinero (AG-007) y 0 órdenes de trabajo creadas (AG-009).

---

## 2. Resultados de las Evaluaciones Semánticas

### A. Mock Semantic Gate (60 Casos)
- **Training Split (36 casos):** 36 / 36 PASS (100.00%)
- **Validation Split (12 casos):** 12 / 12 PASS (100.00%)
- **Holdout Split (12 casos):** 12 / 12 PASS (100.00%)
- **Total Mock:** 60 / 60 PASS (100.00%)
- **Veredicto Mock:** `AG008_SEMANTIC_MOCK_GATE_PASS` ✅

### B. Real Provider Gate con Xiaomi MiMo `mimo-v2.5` (12 Casos Holdout Congelado)
```text
================================================================================
📊 TELEMETRÍA Y AUDITORÍA DE PROVEEDOR REAL (AG008-SEM-EVAL-001 HOLDOUT):
   - Casos Holdout Evaluados:     12
   - Casos Fast Path:             3 (100% con 0 llamadas HTTP, 0 tokens, $0.00 USD)
   - Casos Semantic Required:     9 (100% llamadas reales a Xiaomi MiMo)
   - Llamadas Reales a MiMo:      9
   - Tokens de Entrada:           16,110
   - Tokens de Salida:            8,203
   - Total Tokens Consumidos:     24,313
   - Latencia Promedio:           8,231 ms
   - Latencia Mediana:            8,276 ms
   - Latencia P95:                8,975 ms
   - Latencia Máxima:             8,975 ms
   - Estatus de Costo:            KNOWN
   - Costo Total en USD:          $0.00827 USD
   - Aprobados (PASS):            12 / 12 (100.00%)
================================================================================
🏆 VEREDICTO PROVEEDOR REAL: AG008_REAL_PROVIDER_GATE_PASS ✅
```

### C. Deno Edge Runtime Verification
```text
================================================================================
🦕 VERIFICACIÓN DE RUNTIME DENO / EDGE FUNCTIONS — AG-008.3
================================================================================
Test Case A (Fast Path): NO_AI_FAST_PATH | Calls: 0
Test Case B (Semantic Required): REAL_PROVIDER_REQUIRED | Calls: 1
✅ DENO_EDGE_RUNTIME_TEST = PASS
```

---

## 3. Matriz de Invariantes de Cero Tolerancia

| Invariante Semántico / Gobernanza | Límite Permitido | Obtenido | Estatus |
| :--- | :---: | :---: | :---: |
| Sobreescritura de conteo de fallas (`failure_count_override`) | 0 | **0** | ✅ CUMPLIDO |
| Sobreescritura de recurrencia (`recurrence_override`) | 0 | **0** | ✅ CUMPLIDO |
| Sobreescritura de reincidencia (`reincidence_override`) | 0 | **0** | ✅ CUMPLIDO |
| Sobreescritura de tendencia (`trend_override`) | 0 | **0** | ✅ CUMPLIDO |
| Sobreescritura de estacionalidad (`seasonality_override`) | 0 | **0** | ✅ CUMPLIDO |
| Sobreescritura de calidad de datos (`data_quality_override`) | 0 | **0** | ✅ CUMPLIDO |
| Modificación o invención de alertas | 0 | **0** | ✅ CUMPLIDO |
| Inferencia de causa raíz o Cinco Porqués (AG-010) | 0 | **0** | ✅ CUMPLIDO |
| Declaración de Malos Actores como autoridad final (AG-013) | 0 | **0** | ✅ CUMPLIDO |
| Cálculos monetarios o costos (AG-007) | 0 | **0** | ✅ CUMPLIDO |
| Creación de órdenes de trabajo (AG-009) | 0 | **0** | ✅ CUMPLIDO |
| Éxito de inyecciones de prompt | 0 | **0** | ✅ CUMPLIDO |
| Exposición de API Key en frontend o reportes | 0 | **0** | ✅ CUMPLIDO |
| Trazabilidad de afirmaciones materiales | 100% | **100%** | ✅ CUMPLIDO |

---

## 4. Manifests Congelados Bajo `AG008-SEMANTIC-LAYER-001`

- `AG008-SEMANTIC-LAYER-001`
- `AG008-PROMPT-001`
- `AG008-SEMANTIC-INPUT-001`
- `AG008-SEMANTIC-001`
- `AG008-PATTERN-CATALOG-001`
- `AG008-SEMANTIC-CALL-RULES-001`
- `AG008-SEM-EVAL-001` (`dataset_sha256: c0c19454...`, `holdout_sha256: 58b808a1...`)

---

## 5. Dictamen de Transición hacia AG-008.4

```text
==============================================================================
                 VEREDICTO: AG008_SEMANTIC_GATE_PASS
==============================================================================
La capa semántica de MiMo para AG-008 queda 100% certificada y congelada bajo
el token AG008-SEMANTIC-LAYER-001. El agente queda formalmente habilitado para:
AG-008.4 — Final End-to-End Evaluation & Promotion Gate.
==============================================================================
```
