# AG-010 — Final End-to-End Evaluation & Promotion Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Subfase:** `AG-010.4 — Final End-to-End Evaluation & Promotion Gate`  
**Fecha de Certificación:** `2026-08-21`  
**Proveedor IA:** `Xiaomi MiMo`  
**Modelo:** `mimo-v2.5`  
**Runtime:** `Supabase Edge Functions / Deno 2.9.5`  
**Orquestador:** `AG-001 — Capataz`  
**Dataset Maestro:** `AG010-EVAL-001` (170 Casos: 102 Train, 34 Val, 34 Final Holdout)  
**Dataset SHA-256:** `be32e99e6f67164b3187a5b06e65fbae6aab7a7255b4f91ae3dfde689bca97e7`  
**Holdout SHA-256:** `1e1635bf5168283be3d7d41ed7fd4517f1adbda3ac02d8743078e93d5af97de9`  
**Composite Retrieval SHA-256:** `cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee`  
**Composite Semantic SHA-256:** `f982ae8f0595caa2fd98c999ad75262472183b33773b46f6d6bd91ddeac26998`  
**Gate Maestro Obtenido:** `AG010_FINAL_GATE_PASS`  
**Freeze Maestro Concedido:** `AG010-1.0-FROZEN`  
**Estado Promovido:** `READY / activo=true / version=1.0`  
**Siguiente Componente del Sistema:** `AG-011 — Memoria Técnica`  

---

## 1. Resumen de Ejecución y Puertas Superadas

```text
================================================================================
🏆 RESUMEN FINAL E2E (AG010-EVAL-001 — 170 CASOS):
   - Training Split   (102 casos): 102 / 102 PASS (100.00%)
   - Validation Split  (34 casos):  34 /  34 PASS (100.00%)
   - Final Holdout     (34 casos):  34 /  34 PASS (100.00%)
   -----------------------------------------------------------------------------
   - Total Aserciones Evaluadas:   1,532 / 1,532 PASS (100.00%)
   - Integración con AG-001:       VERIFICADA (Catálogo cerrado, enrutamiento y logExecution)
   - Runtime Deno 2.9.5:           170 / 170 PASS (DENO_EDGE_RUNTIME_TEST = PASS)
   - Latencia Promedio E2E:        0.61ms por caso (Deno 0.67ms)
   - Fuga Temporal (Future):       0 (future_case_leakage = 0, future_evidence_leakage = 0)
   - Trazabilidad de Evidencia:    100% (100% de afirmaciones ligadas a hechos o hipótesis)
   - Causas Confirmadas por IA:    0 (100% preservadas como hipótesis para validación humana)
   - Mutaciones a Tablas:          0
   - Inyección de Prompt:          0 exitosas (100% aisladas como datos no confiables)
   - Órdenes de Trabajo Creadas:   0 (Frontera AG-009 estrictamente respetada)
   - Invariante Protected Field:   100% MATCH (protected_field_diff = 0)
================================================================================
🏆 VEREDICTO MAESTRO: AG010_FINAL_GATE_PASS ✅
🔒 FREEZE MAESTRO: AG010-1.0-FROZEN
🚀 ESTADO FINAL: READY / activo=true / version=1.0
```

---

## 2. Matriz de Manifests Congelados (`AG010-1.0-FROZEN`)

| Manifest ID | Versión | Tipo / Propósito |
| :--- | :---: | :--- |
| **`AG010-DATA-MAP-001`** | `1.0` | Mapeo de datos y adaptadores con M-010, M-011 y AG-008 |
| **`AG010-CASE-MODEL-001`** | `1.0` | Definición de identidad de caso y entidad del activo |
| **`AG010-CASE-SCOPE-001`** | `1.0` | Alcance y metadatos de caso |
| **`AG010-EVIDENCE-MODEL-001`** | `1.0` | Clasificación ontológica de 12 tipos de evidencia y 6 clases |
| **`AG010-EVIDENCE-PACKAGE-001`** | `1.0` | Contrato de empaquetado determinístico de evidencia |
| **`AG010-PREVIOUS-CASE-RETRIEVAL-001`** | `1.0` | Motor determinístico de búsqueda de casos previos |
| **`AG010-CASE-SIMILARITY-RULES-001`** | `1.0` | Reglas y ponderación determinística de ranking (Top-5) |
| **`AG010-FIVE-WHYS-MODEL-001`** | `1.0` | Modelo estructurado de 5 porqués con parada temprana |
| **`AG010-ROOT-CAUSE-STATUS-001`** | `1.0` | Catálogo de estados causales (prohibición de CONFIRMED por IA) |
| **`AG010-DATA-QUALITY-001`** | `1.0` | Evaluación de calidad y preservación de contradicciones |
| **`AG010-OUTPUT-001`** | `1.0` | Contrato maestro de respuesta de AG-010 |
| **`AG010-AUDIT-001`** | `1.0` | Auditoría técnica de ejecución no bloqueante |
| **`AG010-CASE-RETRIEVAL-ENGINE-001`** | `1.0` | Motor compuesto de recuperación determinística |
| **`AG010-RETRIEVAL-CONFIG-EVIDENCE-001`** | `1.0` | Evidencia criptográfica de configuración de recuperación (`cd9835...`) |
| **`AG010-FIVE-WHYS-PROMPT-001`** | `1.0` | Prompt oficial de interpretación con Xiaomi MiMo |
| **`AG010-SEMANTIC-RULES-001`** | `1.0` | Reglas semánticas de Cinco Porqués y casos anteriores |
| **`AG010-MIMO-POLICY-001`** | `1.0` | Política de proveedor Xiaomi MiMo (`mimo-v2.5`) |
| **`AG010-SEMANTIC-INPUT-001`** | `1.0` | Contrato de entrada semántica estricto |
| **`AG010-SEMANTIC-OUTPUT-001`** | `1.0` | Esquema JSON estricto (`additionalProperties: false`) |
| **`AG010-SEMANTIC-LAYER-001`** | `1.0` | Capa semántica completa de interpretación (`f982ae...`) |
| **`AG010-EVAL-001`** | `1.0` | Dataset maestro de evaluación final (170 casos) |
| **`AG010-1.0-FROZEN`** | `1.0` | **Freeze Maestro de AG-010 v1.0** |

---

## 3. Estado en el Catálogo de Agentes (`cat_agentes`)

```json
{
  "id_agente": "AG-010",
  "nombre": "Cinco Porqués y Casos Anteriores",
  "rama": "RAMA E — CONFIABILIDAD Y CONOCIMIENTO",
  "version": "1.0",
  "estado": "READY",
  "activo": true,
  "proveedor_primario": "Xiaomi MiMo (mimo-v2.5)",
  "freeze_token": "AG010-1.0-FROZEN",
  "retrieval_model_sha256": "cd98352d83be94a860bf6fe75a4cac1a2d700cb16d771e5c3890260b41fc43ee",
  "semantic_model_sha256": "f982ae8f0595caa2fd98c999ad75262472183b33773b46f6d6bd91ddeac26998"
}
```
