# AG-010 — Deterministic Gate Report v1.0 (R1 Certified)

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Subfase:** `AG-010.2 — Deterministic Previous Case Retrieval & Evidence Engine` (con Corrección `AG-010.2-R1`)  
**Fecha de Certificación:** `2026-08-21`  
**Es IA:** `NO` (0 LLM calls, 0 tokens, $0.00 USD)  
**Runtime:** `Supabase Edge Functions / Deno 2.9.5`  
**Orquestador:** `AG-001 — Capataz`  
**Proveedor de Expediente:** `M-010 — Asset 360 v1.0` (`M010-1.0-FROZEN`)  
**Proveedor Health/Risk:** `M-011 v1.0` (`M011-1.0-FROZEN`)  
**Proveedor Failure Intelligence:** `AG-008 v1.0` (`AG008-1.0-FROZEN`)  
**Gate Ratificado:** `AG010_DETERMINISTIC_GATE_PASS`  
**Subgate Aprobado:** `AG010_RETRIEVAL_CONFIG_INTEGRITY_PASS`  
**Composite Retrieval Model SHA-256:** `cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee`  
**Freezes Congelados:** `AG010-CASE-RETRIEVAL-ENGINE-001`, `AG010-RETRIEVAL-CONFIG-EVIDENCE-001`  
**Siguiente Subfase:** `AG-010.3 — MiMo Five Whys & Previous Case Interpretation Layer`  

---

## 1. Evidencia Criptográfica de la Configuración de Recuperación (R1)

```text
================================================================================
CORRESPONDENCIA 1-A-1 CERTIFICADA:
CONFIGURACIÓN CONGELADA = CONFIGURACIÓN CARGADA = CONFIGURACIÓN EJECUTADA = CONFIGURACIÓN EVALUADA

COMPOSITE RETRIEVAL MODEL SHA-256: cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee
================================================================================
```

| Manifest ID | Versión | Propósito / Parámetros Clave | Hash SHA-256 Individual |
| :--- | :---: | :--- | :--- |
| **`AG010-CASE-RESOLVER-RULES-001`** | `1.0` | Prefijo `RCA`, fecha `YYYYMMDDHHmmss`, anclaje único | `fafe4dc26a427f7c4fc9ce6a6a9b40fa9321ef77f152d192c75a0cbe6a6552bb` |
| **`AG010-EVIDENCE-RESOLVER-RULES-001`**| `1.0` | 12 tipos de evidencia, 6 clases ontológicas | `72b7a95610ec871c841bb2f4e0f523c5e8c3b7ea360155b9e07851259cbb105f` |
| **`AG010-PREVIOUS-CASE-BUILDER-001`** | `1.0` | Derivación histórica desde OTs de M-010 | `6e84fa17336f32e92c686ffb065ec0904a60114972e38c7f999908cfb24135e8` |
| **`AG010-RETRIEVAL-ENGINE-001`** | `1.0` | Filtro `occurred_at <= evaluation_at`, max scanned `100` | `fcebe91cb976771d9d702d8f993d052b3fb319df4244c4836dc2d73fae491c7c` |
| **`AG010-RANKING-ENGINE-001`** | `1.0` | Factores: Same Asset (40), Kw Match (15, max 30), Resolved (15), Recency (15). Top-N: `5`. Desempate: `OCCURRED_AT_DESC_THEN_CASE_ID_ASC` | `fbffc7283626359f139fb2b236166164d1f21db5976b92f7c00e1636ea1a9e5a` |
| **`AG010-CASE-DEDUPE-RULES-001`** | `1.0` | Deduplicación por `previous_case_id` | `cfaefb8a927a7c6f092ae7021eb3e06180373fb2e3f5be764fb8ea85db1f9453` |
| **`AG010-EVIDENCE-DEDUPE-RULES-001`** | `1.0` | Deduplicación por `evidence_id` | `f28a9b34ea6ef5db21d017beab67ff0c8227b2c5897c413b5bfeb09a80572b89` |
| **`AG010-EVALUATION-TIME-RULES-001`** | `1.0` | Política de aislamiento temporal estricto | `c8306df14589d81373574c8526ee2c851c14cb831e13cb1017dfceaa8a5fbc40` |
| **`AG010-UNTRUSTED-CONTENT-GUARD-001`**| `1.0`| Aislamiento de texto de usuario / anti-injection | `fa7243c2c1a63c631a78e7bb0e95ff1df4ff1a0db2c918c50c0c7a5f36e4f3a7` |
| **`AG010-RETRIEVAL-AUDIT-001`** | `1.0` | Auditoría de ejecución en memoria no bloqueante | `50c057636e2f1c3f91e4e69b0db747c0e668c2d5d8fb85c986927da8a67e816a` |

---

## 2. Resultados de las Suites de Evaluación

```text
================================================================================
📊 1. SUITE DE INTEGRIDAD DE CONFIGURACIÓN R1 (32 ASERCIONES):
   - Retrieval Filter Integrity (4 aserciones):           4 /  4 PASS (100%)
   - Factor Integrity (4 aserciones):                     4 /  4 PASS (100%)
   - Formula Integrity (4 aserciones):                    4 /  4 PASS (100%)
   - Weight Integrity / Non-weighted Proof (4 aserciones):4 /  4 PASS (100%)
   - Top-N Integrity (3 aserciones):                      3 /  3 PASS (100%)
   - Tie-break Integrity (3 aserciones):                  3 /  3 PASS (100%)
   - Time/Cutoff Integrity (3 aserciones):                3 /  3 PASS (100%)
   - Dedupe/Data Quality Integrity (3 aserciones):        3 /  3 PASS (100%)
   - Composite/Runtime Fingerprint (4 aserciones):        4 /  4 PASS (100%)
   -----------------------------------------------------------------------------
   SUBTOTAL INTEGRIDAD R1:                                32 / 32 PASS (100.00%)
   SUBGATE STATUS:                                        AG010_RETRIEVAL_CONFIG_INTEGRITY_PASS ✅

📊 2. SUITE DETERMINÍSTICA DE REGRESIÓN (172 CASOS):
   - Node Evaluator (172 casos):                         1319 / 1319 PASS (100.00%)
   - Latencia Promedio:                                  0.28ms por caso
   - Registros de Auditoría:                             172 / 172 (100% Cobertura)

📊 3. RUNTIME DENO 2.9.5:
   - Deno Edge Runtime Test (172 casos):                 172 / 172 PASS (100.00%)
   - Latencia Promedio en Deno:                          0.35ms por caso
   - Composite Retrieval Hash en Deno:                   cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee
   -----------------------------------------------------------------------------
   STATUS DENO RUNTIME:                                  DENO_EDGE_RUNTIME_TEST = PASS ✅
================================================================================
🏆 VEREDICTO FINAL: AG010_DETERMINISTIC_GATE_PASS RATIFICADO ✅
🔒 FREEZES CONCEDIDOS: AG010-CASE-RETRIEVAL-ENGINE-001 | AG010-RETRIEVAL-CONFIG-EVIDENCE-001
```
