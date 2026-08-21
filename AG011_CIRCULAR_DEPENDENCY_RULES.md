# AG-011 — Circular Dependency Rules & Anti-Loop Protocol v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-CIRCULAR-DEPENDENCY-001`  

---

## 1. Grafo de Procedencia y Prevención de Ciclos Circulares

Existe una relación bidireccional legítima entre `AG-010` (Cinco Porqués) y `AG-011` (Memoria Técnica):
- `AG-010` genera casos con causas confirmadas que alimentan candidatos en `AG-011`.
- `AG-010` consulta memorias aprobadas en `AG-011` para contextualizar análisis futuros.

Sin embargo, **un análisis nunca debe corroborarse a sí mismo a través de una memoria técnica que él mismo originó**:

```text
[ FLUJO PROHIBIDO — CICLO AUTO-REFORZADO ]
  CASO ACTUAL A ──(Crea)──► MEMORIA X ──(Consulta y Corrobora)──► CASO ACTUAL A  ❌
  (Genera una falsa confirmación circular e independiente)

[ FLUJO PERMITIDO — APRENDIZAJE SECUENCIAL Y PROCEDENCIA ]
  CASO HISTÓRICO A ──(Crea)──► MEMORIA X ──(Aprobada)──► CASO FUTURO B  ✅
```

---

## 2. Reglas Técnicas de Bloqueo de Ciclos (`Anti-Loop Guards`)

1. **Exclusión de Mismo Caso de Origen:**
   $$\text{origin\_case\_id} = \text{current\_case\_id} \implies \text{EXCLUDE\_FROM\_RETRIEVAL}$$
   Si una memoria técnica fue originada a partir del caso `CASE-101`, el agente `AG-010` tiene estrictamente prohibido utilizar `MEM-101` como evidencia independiente de soporte para `CASE-101`.
2. **Invariante Cero Ciclos Auto-Reforzados:**
   $$\text{self\_reinforcing\_memory\_loop} = 0$$
3. **Registro Explícito de Origen:** Todo registro de memoria técnica debe mantener el array inmutable `origin_case_ids` y `origin_analysis_ids` para auditar la cadena de causalidad.
