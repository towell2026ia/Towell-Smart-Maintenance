# AG-011 — Memory Retrieval Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-MEMORY-RETRIEVAL-001`  

---

## 1. Estrategia de Recuperación Determinística (Sin Embeddings en v1)

AG-011 implementa una recuperación basada en matching determinístico de factores estructurados:

$$\text{EMBEDDINGS\_NOT\_REQUIRED\_V1}$$

No se requiere vector store ni embeddings en v1.0; la recuperación se realiza evaluando la intersección de metadatos técnicos y condiciones de aplicabilidad.

---

## 2. Factores de Ranking de Memoria (Máximo 100 Puntos)

| Factor de Recuperación | Ponderación | Criterio de Coincidencia |
| :--- | :---: | :--- |
| **`SAME_ASSET`** | **35 pts** | La memoria técnica fue validada específicamente para el mismo `asset_id`. |
| **`SAME_MACHINE_MODEL`** | **25 pts** | Coincidencia en modelo exacto de fabricante (`machine_model`). |
| **`SAME_COMPONENT`** | **20 pts** | Coincidencia en componente bajo intervención (`component_id`). |
| **`KEYWORD_FAILURE_MATCH`** | **15 pts** | Coincidencia de términos clave entre el problema actual y la condición de la memoria. |
| **`APPROVED_STATUS`** | **5 pts** | Bonificación por estado `APPROVED` con revisión formal. |

---

## 3. Invariantes de Recuperación

1. **Relevancia $\neq$ Probabilidad Causal:**
   $$\text{retrieval\_score\_as\_success\_probability} = 0$$
   La puntuación de relevancia (`relevance_score`) mide afinidad de recuperación en el índice, no certeza de éxito.
2. **Filtro Estricto de Estado:** Por defecto, los consumidores productivos solo reciben memorias en estado `APPROVED`.
3. **Límite Top-N:** Acotado estrictamente a `top_n_limit = 5`.
4. **Desempate Determinístico:** `effective_from DESC`, luego `memory_id ASC`.
