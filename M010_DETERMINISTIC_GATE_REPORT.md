# M-010 — Deterministic Gate Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-010 — Expediente Único del Activo`  
**Subfase:** `M-010.2 — Deterministic Asset 360 Aggregation Engine`  
**Fecha de Certificación:** `2026-08-20`  
**Es IA:** `NO` (0 LLM calls, 0 tokens, $0.00 USD)  
**Runtime:** `Deno 2.9.5 / Supabase Edge Functions` (`DENO_EDGE_RUNTIME_TEST = PASS`)  
**Dataset:** `M010-DET-EVAL-001` (Hash SHA-256: `11f237d0ea9d00027182f234da55a8d324b0de9f67b79f2aebb3eec2a6e955f3`)  
**Veredicto del Gate:** `M010_DETERMINISTIC_GATE_PASS`  
**Freeze Concedido:** `M010-ASSET360-ENGINE-001`  
**Siguiente Subfase:** `M-010.3 — Final End-to-End Asset 360 Evaluation & Module Freeze`  

---

## 1. Resumen Ejecutivo del Motor Determinístico

El motor **M-010.2** consolida de forma determinística el Expediente Único del Activo (Asset 360) a través de un pipeline ordenado:
1. **Asset Resolver:** Resolución de identidad oficial en `cat_maquinas`.
2. **Closed Source Fetchers:** Capa de lectura especializada para `cat_maquinas`, `ordenes_trabajo`, calendarios preventivo/predictivo/autónomo, checklists ejecutados, levantamientos, hallazgos físicos, fallas históricas, refacciones consumidas, paros operacionales y alertas técnicas.
3. **Relationship & Dedupe Engine:** Resolución y deduplicación de relaciones `DIRECT_FK`, `MACHINE_ID_LINK`, `SOURCE_ID_LINK` y `DERIVED` sin fuzzy joins.
4. **Timeline Builder:** Línea de vida 360° ordenada cronológicamente por fecha operacional física real (`no_created_at_pollution`).
5. **Completeness Engine:** Evaluación determinística de completitud documental del expediente (`completeness != health`).
6. **Context Filter:** Filtrado de contexto mínimo para agentes consumidores (`M-011`, `AG-010`, `AG-011`, `M-012`, `AG-012`, `AG-013`).
7. **Read-Only & Audit Layer:** Interfaces de solo lectura y auditoría técnica con minimización de payloads sensibles.

---

## 2. Manifests y Tokens de Congelación

- `M010-ASSET-RESOLVER-RULES-001`
- `M010-SOURCE-FETCH-RULES-001`
- `M010-CHECKLIST-FETCH-RULES-001`
- `M010-SURVEY-FETCH-RULES-001`
- `M010-FINDING-FETCH-RULES-001`
- `M010-OT-SUBTASK-RULES-001`
- `M010-RELATIONSHIP-RULES-001`
- `M010-SECTION-AGGREGATION-RULES-001`
- `M010-ASSET-EVENT-TIME-RULES-001`
- `M010-TIMELINE-RULES-001`
- `M010-COMPLETENESS-RULES-001`
- `M010-CONTEXT-FILTER-RULES-001`
- `M010-PAGINATION-RULES-001`
- `M010-FRESHNESS-RULES-001`
- `M010-READONLY-GUARD-001`
- `M010-ASSET-QUERY-AUDIT-001`
- **Freeze Maestro:** `M010-ASSET360-ENGINE-001`

---

## 3. Matriz de Resultados de la Suite Determinística (172 Aserciones)

```text
================================================================================
📊 MATRIZ DE EVALUACIÓN DETERMINÍSTICA (M010-DET-EVAL-001):
   - Asset Identity (12 aserciones):                   12 / 12 PASS (100%)
   - Source Fetchers (12 aserciones):                  12 / 12 PASS (100%)
   - OT / Subtasks (12 aserciones):                    12 / 12 PASS (100%)
   - Maintenance (10 aserciones):                      10 / 10 PASS (100%)
   - Checklists Definition / Execution (12 aserciones):12 / 12 PASS (100%)
   - Surveys (10 aserciones):                          10 / 10 PASS (100%)
   - Physical Findings (10 aserciones):                10 / 10 PASS (100%)
   - Failure / AG-008 Boundary (10 aserciones):        10 / 10 PASS (100%)
   - Parts / Downtime / AG-007 Boundary (10 aserc.):   10 / 10 PASS (100%)
   - Relationships / Dedupe (12 aserciones):           12 / 12 PASS (100%)
   - Timeline / Time Semantics (12 aserciones):        12 / 12 PASS (100%)
   - Completeness / Empty vs Unknown (10 aserciones):  10 / 10 PASS (100%)
   - Context / Pagination / Freshness (10 aserciones): 10 / 10 PASS (100%)
   - Audit / Traceability (8 aserciones):               8 /  8 PASS (100%)
   - Read-Only / Security (12 aserciones):             12 / 12 PASS (100%)
   - Deno Runtime / Performance (10 aserciones):       10 / 10 PASS (100%)
   -----------------------------------------------------------------------------
   TOTAL ASERCIONES EVALUADAS:                        172 / 172 PASS (100.00%)
================================================================================
🏆 SUBGATES CUMPLIDOS:
   ✅ M010_DOMAIN_COVERAGE_PASS
   ✅ M010_READONLY_AUDIT_PASS
   ✅ M010_AUDIT_TRACEABILITY_PASS
   ✅ DENO_EDGE_RUNTIME_TEST = PASS
🏆 VEREDICTO FINAL: M010_DETERMINISTIC_GATE_PASS ✅
🔒 FREEZE CONCEDIDO: M010-ASSET360-ENGINE-001
```
