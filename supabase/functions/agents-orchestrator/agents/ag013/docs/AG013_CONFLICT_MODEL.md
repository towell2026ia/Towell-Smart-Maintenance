# AG-013 — Conflict Model v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-CONFLICT-MODEL-001`  

---

## 1. Modelo de Resolución y Visibilidad de Conflictos

En la operación de planta ocurren divergencias entre señales (e.g., alta recurrencia de fallas pero costo económico muy bajo, o degradación de salud con cero fallas registradas).

### Tipologías de Conflicto Soportadas:
1. **`FREQUENCY_VS_COST`:** Alto número de paros menores pero con costo de reparación insignificante.
2. **`RECURRENCE_VS_HEALTH`:** Reincidencia recurrente de un componente específico mientras la salud global del activo se reporta aceptable.
3. **`STRATEGY_VS_BAD_ACTOR`:** AG-012 recomienda `REPAIR` pero el activo presenta comportamiento crónico que lo ubica en `WATCHLIST` o `BAD_ACTOR`.

---

## 2. Invariantes de Manejo de Conflictos:

- `contradicting_bad_actor_evidence_suppressed = 0`: Prohibido ocultar señales divergentes; deben ser declaradas en el payload analítico.
- **Transparencia Semántica:** MiMo debe reflejar explícitamente las contradicciones en su resumen explicativo sin forzar una conclusión simplista.
