# AG-010 — Deterministic Gate Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Subfase:** `AG-010.2 — Deterministic Previous Case Retrieval & Evidence Engine`  
**Fecha de Certificación:** `2026-08-21`  
**Es IA:** `NO` (0 LLM calls, 0 tokens, $0.00 USD)  
**Runtime:** `Supabase Edge Functions / Deno 2.9.5`  
**Orquestador:** `AG-001 — Capataz`  
**Proveedor de Expediente:** `M-010 — Asset 360 v1.0` (`M010-1.0-FROZEN`)  
**Proveedor Health/Risk:** `M-011 v1.0` (`M011-1.0-FROZEN`)  
**Proveedor Failure Intelligence:** `AG-008 v1.0` (`AG008-1.0-FROZEN`)  
**Composite Retrieval Model SHA-256:** `cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee`  
**Dataset:** `AG010-DET-EVAL-001` (172 Casos)  
**Gate Aprobado:** `AG010_DETERMINISTIC_GATE_PASS`  
**Freeze Concedido:** `AG010-CASE-RETRIEVAL-ENGINE-001`  
**Siguiente Subfase:** `AG-010.3 — MiMo Five Whys & Previous Case Interpretation Layer`  

---

## 1. Evidencia Criptográfica de la Configuración de Recuperación

```text
================================================================================
COMPOSITE RETRIEVAL MODEL SHA-256:
cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee

CORRESPONDENCIA CERTIFICADA:
CONFIGURACIÓN CONGELADA = CONFIGURACIÓN CARGADA = CONFIGURACIÓN EJECUTADA (100% MATCH)
================================================================================
```

| Manifest ID | Versión | Propósito / Parámetros Clave | Hash SHA-256 Canónico |
| :--- | :---: | :--- | :--- |
| **`AG010-CASE-RESOLVER-RULES-001`** | `1.0` | Prefijo `RCA`, fecha `YYYYMMDDHHmmss`, anclaje único | `fafe4dc26a427f7c4fc9ce6a6a9b40fa9321ef77f152d192c75a0cbe6a6552bb` |
| **`AG010-EVIDENCE-RESOLVER-RULES-001`**| `1.0` | 12 tipos de evidencia, 6 clases ontológicas | `72b7a95610ec871c841bb2f4e0f523c5e8c3b7ea360155b9e07851259cbb105f` |
| **`AG010-PREVIOUS-CASE-BUILDER-001`** | `1.0` | Derivación histórica desde OTs de M-010 | `6e84fa17336f32e92c686ffb065ec0904a60114972e38c7f999908cfb24135e8` |
| **`AG010-RETRIEVAL-ENGINE-001`** | `1.0` | Filtro `occurred_at <= evaluation_at` | `fcebe91cb976771d9d702d8f993d052b3fb319df4244c4836dc2d73fae491c7c` |
| **`AG010-RANKING-ENGINE-001`** | `1.0` | Ponderación (+40 activo, +15 kw, +15 res, +15 año), Top 5 | `fbffc7283626359f139fb2b236166164d1f21db5976b92f7c00e1636ea1a9e5a` |
| **`AG010-CASE-DEDUPE-RULES-001`** | `1.0` | Deduplicación por `previous_case_id` | `cfaefb8a927a7c6f092ae7021eb3e06180373fb2e3f5be764fb8ea85db1f9453` |
| **`AG010-EVIDENCE-DEDUPE-RULES-001`** | `1.0` | Deduplicación por `evidence_id` | `f28a9b34ea6ef5db21d017beab67ff0c8227b2c5897c413b5bfeb09a80572b89` |
| **`AG010-EVALUATION-TIME-RULES-001`** | `1.0` | Política de aislamiento temporal estricto | `c8306df14589d81373574c8526ee2c851c14cb831e13cb1017dfceaa8a5fbc40` |
| **`AG010-UNTRUSTED-CONTENT-GUARD-001`**| `1.0`| Aislamiento de texto de usuario / anti-injection | `fa7243c2c1a63c631a78e7bb0e95ff1df4ff1a0db2c918c50c0c7a5f36e4f3a7` |
| **`AG010-RETRIEVAL-AUDIT-001`** | `1.0` | Auditoría de ejecución en memoria no bloqueante | `50c057636e2f1c3f91e4e69b0db747c0e668c2d5d8fb85c986927da8a67e816a` |

---

## 2. Resumen de Evaluación Determinística (`AG010-DET-EVAL-001`)

```text
================================================================================
📊 RESULTADOS DETERMINÍSTICOS (AG010-DET-EVAL-001 - 172 CASOS):
   - Total Aserciones Evaluadas: 1319 / 1319 PASS (100.00%)
   - Latencia Promedio:          0.28ms en Node / 0.35ms en Deno Edge Runtime
   - Registros de Auditoría:     172 / 172 (100% Cobertura)
   - Runtime Deno 2.9.5:         PASS (DENO_EDGE_RUNTIME_TEST = PASS)
   - Llamadas a LLM:             0
   - Tokens Consumidos:          0
   - Costo IA Total:             $0.00 USD
   - Mutaciones a Tablas:        0
   - Inyección de Prompt:        0 ejecutadas (100% aisladas como texto no verificado)
   - Causa Raíz Confirmada:      0 emitidas (Reservado para validación humana)
   - Cinco Porqués Semánticos:   0 emitidos (Reservado para AG-010.3)
================================================================================
🏆 VEREDICTO DETERMINÍSTICO: AG010_DETERMINISTIC_GATE_PASS ✅
🔒 FREEZE CONCEDIDO: AG010-CASE-RETRIEVAL-ENGINE-001
```
