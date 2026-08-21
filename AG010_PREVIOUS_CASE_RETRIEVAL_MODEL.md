# AG-010 — Deterministic Previous Case Retrieval Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Tokens:** `AG010-PREVIOUS-CASE-RETRIEVAL-001`, `AG010-CASE-SIMILARITY-RULES-001`  

---

## 1. Reglas de Recuperación y Similitud Determinística

Para evitar dependencias opacas y costos de embeddings innecesarios en v1.0, la recuperación y ranking de casos se realiza mediante un algoritmo estructurado determinístico:

```text
SCORE_SIMILITUD (0 a 100) =
  + 40 pts si es el MISMO ACTIVO (asset_id match)
  + 15 pts por cada palabra clave coincidente en el título de falla (hasta 30 pts)
  + 15 pts si el caso anterior tuvo desenlace exitoso documentado (outcome == 'RESOLVED')
  + 15 pts si ocurrió en los últimos 365 días (antigüedad <= 1 año)
```

---

## 2. Invariantes del Modelo de Recuperación

1. **`SIMILAR PREVIOUS CASE != SAME ROOT CAUSE`:** La existencia de un caso con alta similitud jamás implica que la causa raíz actual sea idéntica de forma automática.
2. **`MAX_PREVIOUS_CASES_RETURNED = 5`:** El contexto histórico retornado a la capa semántica de MiMo está acotado estrictamente a un máximo de 5 casos para evitar saturación de tokens y alucinaciones.
3. **`future_case_leakage = 0`:** Todo caso posterior a `evaluation_at` se descarta antes del cálculo de ranking.
