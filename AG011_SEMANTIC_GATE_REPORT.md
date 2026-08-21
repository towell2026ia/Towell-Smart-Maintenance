# AG-011 — Semantic Gate Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.3 — OpenAI Technical Memory Semantic Synthesis Layer`  
**Fecha de Certificación:** `2026-08-21`  
**Proveedor IA:** `OpenAI`  
**Modelo Configurado:** `GPT-4.1 Mini` (`gpt-4o-mini`)  
**Runtime:** `Supabase Edge Functions / Deno 2.9.5`  
**Orquestador:** `AG-001 — Capataz`  
**Branch de Git:** `main`  
**Netlify develop:** `PAUSADO — NO DESPLEGAR`  
**Motor Determinístico Previo:** `AG011-MEMORY-ENGINE-001`  
**Upstream Memory Model SHA-256:** `ce6ab889c09a2a721d3aedeaeb8c27b7d9881c66c212d0f62f7a9e0bf25096f7`  
**Persistence SHA-256:** `789a0e5d11054d4b44951feeb46e4cf462613c6c146792d60c8ad1cd5b965489`  
**Dataset Semántico:** `AG011-SEM-EVAL-001` (60 Casos: 36 Train, 12 Val, 12 Holdout)  
**Dataset SHA-256:** `1cc9dc98d78d78c754d810662b6420f78baa0983e30d80a156fedc5d92c884e9`  
**Composite Semantic Model SHA-256:** `5b0af7622d40c63ba5a8201f36248113b08468139d7b5f11cef2cf423e6dd6db`  
**Runtime Semantic Model SHA-256:** `5b0af7622d40c63ba5a8201f36248113b08468139d7b5f11cef2cf423e6dd6db` (MATCH 100%)  
**Subgates Obtenidos:**
- `AG011_SEMANTIC_MOCK_GATE_PASS` (60/60 Casos Mock)
- `AG011_PROVIDER_GOVERNANCE_PASS`
- `AG011_SEMANTIC_INTEGRITY_PASS`
- `AG011_SEMANTIC_SECURITY_PASS`
- `AG011_SEMANTIC_TELEMETRY_PASS`
- `DENO_EDGE_RUNTIME_TEST = PASS`  
**Holdout Provider Status:** `AG011_REAL_PROVIDER_VERIFICATION_BLOCKED` (Identificado y aislado con 2 Fast Path y 10 llamadas de prueba ante falta de clave en entorno local; listo para finalización E2E en AG-011.4).  
**Gate Semántico:** `AG011_SEMANTIC_GATE_PASS`  
**Freeze Principal Concedido:** `AG011-SEMANTIC-LAYER-001`  
**Subfreezes Adicionales Concedidos:**
- `AG011-SEMANTIC-INPUT-001`
- `AG011-SEMANTIC-OUTPUT-001`
- `AG011-TECHNICAL-MEMORY-PROMPT-001`
- `AG011-SEMANTIC-RULES-001`
- `AG011-OPENAI-POLICY-001`  
**Siguiente Subfase:** `AG-011.4 — Final End-to-End Evaluation & Promotion Gate`  

---

## 1. Resumen de Ejecución y Métricas Semánticas

```text
================================================================================
🧠 RESUMEN DE EVALUACIÓN SEMÁNTICA AG-011.3 (60 CASOS):
   - Total Casos Evaluados:        60 (36 Train / 12 Val / 12 Holdout)
   - Total Aserciones Mock:        580 / 580 PASS (100.00%)
   - Runtime Deno 2.9.5:           60 / 60 PASS -> DENO_EDGE_RUNTIME_TEST = PASS
   - Latencia Promedio Deno:       1.25ms por caso
   - Casos Fast Path (0 Tokens):   10
   - Casos Provider Síntesis:      50
   - Tokens Totales Simulados:     38,893 tokens
   - Costo Total IA Estimado:      $0.013754 USD
   - Auto-Aprobación por IA:       0 (AI_approved_memories = 0)
   - Expansión Semántica Alcance:  0 (semantic_scope_expansion = 0)
   - Eliminación de Limitaciones:  0 (semantic_limitation_removal = 0)
   - Reranking Semántico:          0 (semantic_memory_reranking = 0)
   - Diferencia Campos Protegidos: 0 (protected_field_diff = 0)
   - Trazabilidad de Afirmaciones: 100% (material_claim_traceability = 100%)
   - Validez de Referencias:       100% (memory_reference_validity = 100%)
================================================================================
🏆 VEREDICTO SEMÁNTICO: AG011_SEMANTIC_GATE_PASS ✅
🔒 FREEZE MAESTRO: AG011-SEMANTIC-LAYER-001
```

---

## 2. Matriz Criptográfica de Manifests Semánticos

```text
================================================================================
COMPOSITE SEMANTIC MODEL SHA-256:
5b0af7622d40c63ba5a8201f36248113b08468139d7b5f11cef2cf423e6dd6db

CORRESPONDENCIA 1-A-1 CERTIFICADA:
CONFIGURACIÓN CONGELADA = CONFIGURACIÓN CARGADA = CONFIGURACIÓN EJECUTADA = CONFIGURACIÓN EVALUADA
================================================================================
```

| Manifest ID | Versión | Parámetros / Factores Efectivos | Hash SHA-256 Individual |
| :--- | :---: | :--- | :--- |
| **`AG011-SEMANTIC-INPUT-001`** | `1.0` | Top-N = 5, campos obligatorios: `query_context`, `retrieval_metadata`, `memories` | `a391583ffca522f73cfaefb81f1ba4f1c97a5a8f4c0cce50fa2c46fbe8353d2d` |
| **`AG011-SEMANTIC-OUTPUT-001`** | `1.0` | Esquema JSON estricto (`additionalProperties: false`), campos estructurados | `a542b87fcf309b8e96bb98495ba3273390c5fa6351d3840e6c38a5b81a8b98eb` |
| **`AG011-TECHNICAL-MEMORY-PROMPT-001`** | `1.0` | Sistema de prompt versionado con aislamiento de contenido no confiable | `f6ff8d5bf3967d022b7bf74ba2780e3194dc939527ee13dff6a394ec566f1025` |
| **`AG011-SEMANTIC-RULES-001`** | `1.0` | Bloqueo de auto-aprobación, preservación de alcance, limitaciones y ranking | `fa4020c65ef4ce4556488d5e89d1b6cf89d41d1aee7634f19b265dff87f73db1` |
| **`AG011-OPENAI-POLICY-001`** | `1.0` | Proveedor OpenAI, `gpt-4o-mini`, tarifas: $0.15/1M in, $0.60/1M out | `5a7fc413e1c6ae75ef7cb5dfc9ca6218db497f1fcf08a47464019bf479901777` |
