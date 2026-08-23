# AG-013 — Traceability Model v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-TRACEABILITY-001`  

---

## 1. Modelo de Trazabilidad 100%

Cada clasificación, puntuación y posición de ranking devuelta por AG-013 debe ser completamente auditable y rastreable hasta sus hechos fuente.

### Atributos Obligatorios por Driver/Factor:
1. `source_authority`: Identificador del componente upstream autoritativo (e.g., `AG-008`, `AG-007`, `M-011`).
2. `source_id`: Identificador único del hecho o indicador upstream.
3. `raw_value`: Valor original sin transformar.
4. `normalized_score`: Valor normalizado ($0 - 100$).
5. `weight_applied`: Peso ponderador certificado.
6. `timestamp_source`: Fecha y hora de captura del dato.

---

## 2. Invariantes de Trazabilidad:

- `bad_actor_classification_traceability = 100%`: Cada activo clasificado tiene desglose explícito de drivers.
- `bad_actor_ranking_traceability = 100%`: La posición de ranking está justificada matemáticamente.
- `untraceable_decision_factor = 0`: Prohibido incluir variables sin procedencia certificada.
