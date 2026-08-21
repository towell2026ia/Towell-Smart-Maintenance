# AG-010 — Effective Retrieval Configuration & Cryptographic Lineage v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Subfase:** `AG-010.2-R1 — Retrieval Configuration Integrity & Certification Evidence`  
**Composite Retrieval Model SHA-256:** `cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee`  
**Freeze:** `AG010-RETRIEVAL-CONFIG-EVIDENCE-001`  

---

## 1. Evidencia Criptográfica y Resumen de Manifests

```text
================================================================================
COMPOSITE RETRIEVAL MODEL FINGERPRINT:
cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee

CORRESPONDENCIA CERTIFICADA:
CONFIGURACIÓN CONGELADA = CONFIGURACIÓN CARGADA = CONFIGURACIÓN EJECUTADA = CONFIGURACIÓN EVALUADA (100% MATCH)
================================================================================
```

---

## 2. Inventario de Configuraciones Efectivas y Hashes SHA-256

| Manifest ID | Versión | Parámetros / Factores Efectivos | Hash SHA-256 Canónico |
| :--- | :---: | :--- | :--- |
| **`AG010-CASE-RESOLVER-RULES-001`** | `1.0` | Prefijo `RCA`, formato `YYYYMMDDHHmmss`, primary asset policy `STRICT_SINGLE_PRIMARY` | `fafe4dc26a427f7c4fc9ce6a6a9b40fa9321ef77f152d192c75a0cbe6a6552bb` |
| **`AG010-EVIDENCE-RESOLVER-RULES-001`**| `1.0`| 12 tipos de evidencia y 6 clases ontológicas permitidas | `72b7a95610ec871c841bb2f4e0f523c5e8c3b7ea360155b9e07851259cbb105f` |
| **`AG010-PREVIOUS-CASE-BUILDER-001`** | `1.0` | Prioridad: `DIRECT_FK`, `OT_ID`, `FOLIO`, `FINDING_ID`, `STAGE_LOG` | `6e84fa17336f32e92c686ffb065ec0904a60114972e38c7f999908cfb24135e8` |
| **`AG010-RETRIEVAL-ENGINE-001`** | `1.0` | Filtro histórico `occurred_at <= evaluation_at`, max scanned `100` | `fcebe91cb976771d9d702d8f993d052b3fb319df4244c4836dc2d73fae491c7c` |
| **`AG010-RANKING-ENGINE-001`** | `1.0` | Pesos: Same Asset (40), Kw Match (15, max 30), Resolved (15), Recency (15). Top-N: `5`. Desempate: `OCCURRED_AT_DESC_THEN_CASE_ID_ASC` | `fbffc7283626359f139fb2b236166164d1f21db5976b92f7c00e1636ea1a9e5a` |
| **`AG010-CASE-DEDUPE-RULES-001`** | `1.0` | Clave de deduplicación: `previous_case_id` | `cfaefb8a927a7c6f092ae7021eb3e06180373fb2e3f5be764fb8ea85db1f9453` |
| **`AG010-EVIDENCE-DEDUPE-RULES-001`** | `1.0` | Clave de deduplicación: `evidence_id` | `f28a9b34ea6ef5db21d017beab67ff0c8227b2c5897c413b5bfeb09a80572b89` |
| **`AG010-EVALUATION-TIME-RULES-001`** | `1.0` | Política de fuga futura: `STRICT_EXCLUSION` | `c8306df14589d81373574c8526ee2c851c14cb831e13cb1017dfceaa8a5fbc40` |
| **`AG010-UNTRUSTED-CONTENT-GUARD-001`**| `1.0`| Política de sanitización: `ISOLATE_AS_UNTRUSTED_SOURCE_TEXT` | `fa7243c2c1a63c631a78e7bb0e95ff1df4ff1a0db2c918c50c0c7a5f36e4f3a7` |
| **`AG010-RETRIEVAL-AUDIT-001`** | `1.0` | Auditoría de ejecución en memoria no bloqueante | `50c057636e2f1c3f91e4e69b0db747c0e668c2d5d8fb85c986927da8a67e816a` |

---

## 3. Matriz de Invariantes de Recuperación y Similitud

- **`SIMILARITY_SCORE_MEANING`**: Relevancia de recuperación determinística (Rango $[0, 100]$).
- **`RETRIEVAL_SCORE_AS_CAUSE_PROBABILITY`**: `0` (Prohibido interpretar score como probabilidad de causa).
- **`SIMILAR_CASE_AS_SAME_CAUSE`**: `0` (Casos similares aportan contexto de soporte, no prueba de causa idéntica).
- **`UNREGISTERED_RETRIEVAL_FACTORS`**: `0`
- **`HIDDEN_TOP_N`**: `0` (Fijado estrictamente en $5$).
- **`FUTURE_CASE_LEAKAGE`**: `0`
- **`LLM_CALLS`**: `0`
- **`AI_COST`**: `$0.00 USD`
