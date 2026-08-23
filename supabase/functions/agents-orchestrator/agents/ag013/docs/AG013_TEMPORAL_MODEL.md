# AG-013 — Temporal Model v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-TEMPORAL-MODEL-001` / `AG013-ANALYSIS-WINDOW-001`  

---

## 1. Modelo Temporal y Ventanas de Análisis

Todo análisis de Malos Actores opera bajo un corte temporal estricto definido por el parámetro **`evaluation_at`** (formato ISO 8601 UTC).

### Ventanas de Análisis Soportadas:
- **`ROLLING_90D` (3 Meses):** Detección de problemas agudos y reincidencias recientes.
- **`ROLLING_180D` (6 Meses):** Ventana estándar recomendada para equilibrio entre inercia y agilidad.
- **`ROLLING_365D` (12 Meses):** Evaluación anual de cronicidad estructural e inversiones de capital.

---

## 2. Invariante de No Filtración Futura (*Future Leakage*)

$$\forall \text{ evento } e, \quad \text{timestamp}(e) \le \text{evaluation\_at}$$

- `future_failure_leakage = 0`: Prohibido incluir fallas ocurridas con fecha posterior a `evaluation_at`.
- `future_cost_leakage = 0`: Prohibido contabilizar costos o compras post-corte.
- `future_bad_actor_data_leakage = 0`: Cualquier dato temporal futuro causa invalidación inmediata.
- **Reproducibilidad Histórica:** Ejecutar AG-013 con `evaluation_at` en el pasado debe generar exactamente la misma clasificación que en ese momento temporal.
