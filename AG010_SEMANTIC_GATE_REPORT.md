# AG-010 — Semantic Gate Report v1.0 (R1 Certified)

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Subfase:** `AG-010.3 — MiMo Five Whys & Previous Case Interpretation Layer` (con Corrección `AG-010.3-R1`)  
**Fecha de Certificación:** `2026-08-21`  
**Proveedor IA:** `Xiaomi MiMo`  
**Modelo:** `mimo-v2.5`  
**Runtime:** `Supabase Edge Functions / Deno 2.9.5`  
**Orquestador:** `AG-001 — Capataz`  
**Motor Determinístico Previo:** `AG010-CASE-RETRIEVAL-ENGINE-001` (`cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee`)  
**Retrieval Config:** `AG010-RETRIEVAL-CONFIG-EVIDENCE-001`  
**Composite Semantic Model SHA-256:** `f982ae8f0595caa2fd98c999ad75262472183b33773b46f6d6bd91ddeac26998`  
**Dataset Semántico:** `AG010-SEM-EVAL-001` (60 Casos: 36 Train, 12 Val, 12 Holdout)  
**Dataset SHA-256:** `6e9f7412bf44d98a07a85773cfacede2f16a205392984864f15ba94535c4af13`  
**Holdout SHA-256:** `ba6bdc1931442ae8fbd095698d4438b941462c6be2f8c7b7c21e8eb5f7fffd80`  

---

## 1. Subgates Emitidos y Master Gate Ratificado

| Subgate / Master Gate | Requisito / Cobertura | Estado |
| :--- | :--- | :---: |
| **`AG010_PROVIDER_GOVERNANCE_PASS`** | Delegación central en `providers/mimo-adapter.ts`, 0 fetch directos, 0 secretos en dominio | ✅ EMITIDO |
| **`AG010_SEMANTIC_CERTIFICATION_PASS`** | Invariante `protected_field_diff = 0`, 100% referencias válidas, `AI_confirmed = 0` | ✅ EMITIDO |
| **`AG010_SEMANTIC_TELEMETRY_PASS`** | Conciliación tokens (20,636 in + 22,243 out = 42,879), costo $0.009117, latencia auditada | ✅ EMITIDO |
| **`AG010_SEMANTIC_MOCK_GATE_PASS`** | 60/60 casos evaluados (556/556 aserciones aprobadas) | ✅ RATIFICADO |
| **`REAL_MIMO_HOLDOUT_PASS`** | 12/12 casos de holdout evaluados contra MiMo en vivo | ✅ RATIFICADO |
| **`DENO_EDGE_RUNTIME_TEST`** | Ejecución nativa en Deno 2.9.5 Edge Runtime | ✅ PASS |
| **`AG010_SEMANTIC_GATE_PASS`** | **Master Gate Semántico Oficial** | 🏆 **RATIFICADO** |

**Freeze Oficial Concedido:** `AG010-SEMANTIC-LAYER-001`  
**Siguiente Subfase:** `AG-010.4 — Final End-to-End Evaluation & Promotion Gate`  

---

## 2. Evidencia Criptográfica de Manifests Semánticos

```text
================================================================================
COMPOSITE SEMANTIC MODEL SHA-256:
f982ae8f0595caa2fd98c999ad75262472183b33773b46f6d6bd91ddeac26998

CORRESPONDENCIA 1-A-1 CERTIFICADA:
CONFIGURACIÓN CONGELADA = CONFIGURACIÓN CARGADA = CONFIGURACIÓN EJECUTADA = CONFIGURACIÓN EVALUADA
================================================================================
```

| Manifest ID | Versión | Parámetros / Invariantes Efectivos | Hash SHA-256 Individual |
| :--- | :---: | :--- | :--- |
| **`AG010-FIVE-WHYS-PROMPT-001`** | `1.0` | Aislamiento estricto de texto no verificado, prohibición de acciones operativas | `f7ebecb78ea9c817296ff3156cfd5952f4c4a45a3294c73335e39665bc7bf841` |
| **`AG010-SEMANTIC-RULES-001`** | `1.0` | Profundidad máxima 5, parada temprana (`STOP_EARLY`), hipótesis causal únicamente | `7a88562e2d93e17b8782f91be3855a82fa08e7d23d8c11eebad05f8846c4fc7f` |
| **`AG010-MIMO-POLICY-001`** | `1.0` | Xiaomi MiMo (`mimo-v2.5`), Fast Path ante datos insuficientes, tarifas ($0.14 / $0.28) | `e99f16b2a0c4f828a2a0753086eb2ca0c441b02652b083b482b6be00aa006c0d` |
| **`AG010-SEMANTIC-INPUT-001`** | `1.0` | Entrada derivada exclusivamente de `AG010-EVIDENCE-PACKAGE-001` | `5c614568e64cbe394bc8c962b9a7beec3cfa76e93895e62f558b7608b6ee7ee5` |
| **`AG010-SEMANTIC-OUTPUT-001`** | `1.0` | JSON estricto (`additionalProperties: false`), `CONFIRMED` prohibido para IA | `d8fe5a0349b14f6b0f983a54df24a357eb26ebc8702c2e0ee254cf9659b83b3e` |

---

## 3. Conciliación de Telemetría y Consumo en Holdout Real (12 Casos)

```text
================================================================================
📊 AUDITORÍA Y CONCILIACIÓN DE TELEMETRÍA (12 CASOS HOLDOUT):
   - Casos Totales de Holdout:    12 casos
   - Casos Fast Path (0 Tokens):  1 caso (Ahorro 100% ante datos insuficientes)
   - Casos con Llamada Real MiMo: 11 casos
   -----------------------------------------------------------------------------
   - Tokens de Entrada (Input):   20,636 tokens
   - Tokens de Salida (Output):   22,243 tokens
   - Tokens Totales Conciliados:  42,879 tokens (20,636 + 22,243 = 42,879)
   - Costo Total Auditado:        $0.009117 USD
   - Tarifa de Facturación:       KNOWN ($0.14 USD / 1M in, $0.28 USD / 1M out)
   -----------------------------------------------------------------------------
   - Latencia Promedio:           29.8s por llamada real
   - Causas Confirmadas por IA:   0 (100% preservado como hipótesis para validación humana)
   - Invariante Protected Field:  100% MATCH (protected_field_diff = 0)
   - Trazabilidad de Afirmaciones:100% (material_claim_traceability = 100%)
================================================================================
```
