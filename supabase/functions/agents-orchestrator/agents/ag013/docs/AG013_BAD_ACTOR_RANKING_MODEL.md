# AG-013 — Bad Actor Ranking Model v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-BAD-ACTOR-RANKING-001`  

---

## 1. Modelo de Ranking y Priorización de Malos Actores

El ranking ordena los activos analizados de mayor a menor severidad analítica dentro de su ámbito de población (`population_scope`).

### Regla de Ordenamiento Determinístico:
1. **Clasificación Categórica:** `SEVERE_BAD_ACTOR` > `BAD_ACTOR` > `WATCHLIST` > `NOT_BAD_ACTOR` > `INSUFFICIENT_DATA`.
2. **Puntuación Compuesta (`bad_actor_score`):** Descendente (0 a 100).
3. **Carga de Cronicidad (`chronicity_score`):** Descendente.
4. **Carga Económica (`economic_burden_score`):** Descendente.
5. **Desempate Determinístico Invariable:** Orden léxico ascendente por `asset_id`.

---

## 2. Invariantes de Ranking:

- `nondeterministic_bad_actor_tie_break = 0`: Ante igualdad de puntuaciones y factores, el desempate por `asset_id` garantiza 100% de reproducibilidad.
- `PARETO TOP ≠ BAD ACTOR AUTOMATICALLY`: Pertenecer al percentil superior del 20% de fallas o costos no otorga automáticamente el Rank #1 si las fallas no son crónicas ni recurrentes.
- `semantic_bad_actor_rank_override = 0`: MiMo no puede alterar el orden posicional de los activos devueltos por el motor determinístico.
