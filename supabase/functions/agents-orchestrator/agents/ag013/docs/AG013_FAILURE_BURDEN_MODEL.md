# AG-013 — Failure Burden Model v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-FAILURE-BURDEN-001`  

---

## 1. Modelo de Carga de Fallas (Failure Burden)

La carga de fallas cuantifica el impacto y la densidad de eventos no deseados en la ventana analítica, consumiendo exclusivamente los indicadores autorizados de **`AG-008 — Fallas, Tendencias y Reincidencias`**.

### Componentes de la Carga de Fallas:
1. **Frecuencia de Fallas (`failure_count_window`):** Número total de eventos de falla en la ventana (certificado por AG-008).
2. **Tasa de Recurrencia / Reincidencia (`recurrence_rate`):** Proporción de fallas atribuidas al mismo modo o componente.
3. **Impacto de Tiempo Fuera de Servicio (`downtime_hours`):** Horas acumuladas de paro correctivo.
4. **MTBF y MTTR (`mtbf_hours`, `mttr_hours`):** Intervalo medio entre fallas y tiempo medio de reparación.

---

## 2. Invariantes Críticos de Carga de Fallas

- `BAD ACTOR ≠ TOP FAILURE MACHINE`: La máquina con más fallas no es automáticamente un Mal Actor si las fallas fueron leves, no recurrentes o aisladas en un solo período.
- `failure_metric_recalculation = 0`: AG-013 no recalcula MTBF, MTTR ni frecuencias crudas; consume las provistas por `AG008-1.0-FROZEN`.
