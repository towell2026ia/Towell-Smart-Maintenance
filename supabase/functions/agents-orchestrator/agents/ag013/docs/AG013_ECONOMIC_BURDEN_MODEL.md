# AG-013 — Economic Burden Model v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-ECONOMIC-BURDEN-001`  

---

## 1. Modelo de Carga Económica (Economic Burden)

Evalúa la concentración y desproporción del gasto en mantenimiento correctivo del activo en comparación con su grupo de pares y presupuesto, consumiendo exclusivamente **`AG-007 — Presupuestos y Costos`**.

### Componentes de Carga Económica:
1. **Costo de Mantenimiento Correctivo Reciente (`maintenance_cost_window`):** Gasto en mano de obra y refacciones en la ventana analítica.
2. **Índice de Costo de Mantenimiento (`MCI`):** Proporción respecto al costo de reemplazo del activo.
3. **Desviación Presupuestaria (`budget_variance`):** Gasto real vs presupuesto asignado en AG-007.

---

## 2. Invariantes de Carga Económica:

- `HIGH COST ≠ BAD ACTOR AUTOMATICALLY`: Una máquina grande y compleja con alto costo unitario por mantenimiento mayor programado no es automáticamente un Mal Actor.
- `AG007_base_cost_recalculation = 0`: AG-013 consume las cifras emitidas por AG-007 sin recalcular tarifas ni costos unitarios.
- `unknown_cost_as_zero = 0`: Costos ausentes permanecen `UNKNOWN`, nunca se asumen como costo cero.
