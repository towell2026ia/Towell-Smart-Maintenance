# AG-010 — Semantic Gate Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Subfase:** `AG-010.3 — MiMo Five Whys & Previous Case Interpretation Layer`  
**Fecha de Certificación:** `2026-08-21`  
**Proveedor IA:** `Xiaomi MiMo`  
**Modelo:** `mimo-v2.5`  
**Runtime:** `Supabase Edge Functions / Deno 2.9.5`  
**Orquestador:** `AG-001 — Capataz`  
**Motor Determinístico Previo:** `AG010-CASE-RETRIEVAL-ENGINE-001` (`cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee`)  
**Retrieval Config:** `AG010-RETRIEVAL-CONFIG-EVIDENCE-001`  
**Dataset Semántico:** `AG010-SEM-EVAL-001` (60 Casos: 36 Train, 12 Val, 12 Holdout)  
**Dataset SHA-256:** `6e9f7412bf44d98a07a85773cfacede2f16a205392984864f15ba94535c4af13`  
**Holdout SHA-256:** `ba6bdc1931442ae8fbd095698d4438b941462c6be2f8c7b7c21e8eb5f7fffd80`  
**Gate Aprobado:** `AG010_SEMANTIC_GATE_PASS`  
**Freeze Concedido:** `AG010-SEMANTIC-LAYER-001`  
**Siguiente Subfase:** `AG-010.4 — Final End-to-End Evaluation & Promotion Gate`  

---

## 1. Evidencia de Ejecución en Vivo con Xiaomi MiMo (Holdout 12 Casos)

```text
================================================================================
🌐 EVALUACIÓN EN VIVO CON XIAOMI MIMO (mimo-v2.5) — 12 CASOS HOLDOUT:
   - Casos Holdout Evaluados:     12 / 12 (100% PASS)
   - Casos Fast Path (0 Tokens):  1 caso (Ahorro 100%)
   - Casos con Llamada MiMo:      11 casos
   - Tokens de Entrada (Input):   20,636 tokens
   - Tokens de Salida (Output):   22,243 tokens
   - Tokens Totales Auditados:    42,879 tokens
   - Costo Total Auditado:        $0.009117 USD
   - Estado de Costo:             KNOWN ($0.14 / 1M in, $0.28 / 1M out)
   - Latencia Promedio:           29.79s por llamada real
   - Causas Confirmadas por IA:   0 (100% preservado como hipótesis para validación humana)
   - Invariante Protected Field:  100% MATCH (protected_field_diff = 0)
================================================================================
🏆 VEREDICTO HOLDOUT: REAL MIMO HOLDOUT PASS ✅
```

---

## 2. Resumen de Suites y Subgates

| Suite / Gate | Casos / Aserciones | Tasa de Aprobación | Veredicto |
| :--- | :---: | :---: | :---: |
| **Config Integrity Audit (R1)** | 32 aserciones | 32 / 32 (100.0%) | `AG010_RETRIEVAL_CONFIG_INTEGRITY_PASS` ✅ |
| **Retrieval Engine (172 casos)** | 1319 aserciones | 1319 / 1319 (100.0%) | `AG010_DETERMINISTIC_GATE_PASS` ✅ |
| **Mock Semantic Suite (60 casos)** | 556 aserciones | 556 / 556 (100.0%) | `AG010_SEMANTIC_MOCK_GATE_PASS` ✅ |
| **Real MiMo Holdout (12 casos)** | 12 casos | 12 / 12 (100.0%) | `REAL MIMO HOLDOUT PASS` ✅ |
| **Deno Edge Runtime (60 casos)** | 60 casos | 60 / 60 (100.0%) | `DENO_EDGE_RUNTIME_TEST = PASS` ✅ |

---

## 3. Matriz de Invariantes de Gobernanza Semántica

- **`PROTECTED_FIELD_DIFF`**: `0` (Identidades, hechos y ranking determinístico inalterados).
- **`AI_CONFIRMED_ROOT_CAUSES`**: `0` (La IA no puede auto-confirmar causas raíz; siempre emite hipótesis y `requires_human_validation = true`).
- **`FORCED_FIVE_WHYS`**: `0` (Soporte de detención temprana `STOP_EARLY` y Fast Path).
- **`INVENTED_EVIDENCE_REFERENCES`**: `0` (100% de referencias validadas contra el paquete de entrada).
- **`CONTRADICTING_EVIDENCE_SUPPRESSED`**: `0` (Preservación estricta de contradicciones).
- **`PROMPT_INJECTION_SUCCESS`**: `0` (Instrucciones en texto de usuario aisladas como datos no confiables).
- **`FOREIGN_DOMAIN_VIOLATIONS`**: `0` (Sin creación de OTs, sin cálculo de costos, sin decisiones de reemplazo).
