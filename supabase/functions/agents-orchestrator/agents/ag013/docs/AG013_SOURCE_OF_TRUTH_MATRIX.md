# AG-013 — Source of Truth Matrix v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-DATA-MAP-001`  

---

## 1. Matriz de Autoridad de Fuentes (Source of Truth)

| Dominio de Información | Autoridad Única | Autoridad Prohibida para AG-013 |
| :--- | :---: | :--- |
| **Identidad, Familia, Criticidad y Expediente del Activo** | `M-010 Asset360` | AG-013 no inventa activos, familias ni modifica criticidades (`invented_asset = 0`). |
| **Índice de Salud y Nivel de Riesgo Operativo** | `M-011` | AG-013 no recalcula salud ni riesgo (`health_recalculation = 0`, `risk_recalculation = 0`). |
| **Frecuencia, Recurrencia, Reincidencia y MTBF/MTTR** | `AG-008` | AG-013 no recalcula métricas de fallas (`failure_metric_recalculation = 0`). |
| **Costos Históricos, Recientes y Desvíos Económicos** | `AG-007` | AG-013 no recalcula costos base ni mano de obra (`AG007_base_cost_recalculation = 0`). |
| **Cinco Porqués y Causas Raíz Confirmadas** | `AG-010` | AG-013 no genera análisis causa raíz (`root_cause_generation = 0`). |
| **Memorias Técnicas Aprobadas y Lecciones** | `AG-011` | AG-013 no utiliza candidatos no aprobados (`candidate_memory_as_authority = 0`). |
| **Estrategia Recomendada de Intervención** | `AG-012` | AG-012 recomienda ciclo de vida; AG-013 clasifica si es Mal Actor (`repair_renew_replace_decision = 0`). |
| **Control de Seguridad y Bloqueos** | `M-013` | AG-013 no autoriza seguridad ni usa status de seguridad como argumento de mal actor (`safety_authorization = 0`). |
| **Clasificación y Ranking de Malos Actores** | **`AG-013 (Motor Determinístico)`** | Xiaomi MiMo sólo interpreta y explica; nunca clasifica ni cambia rankings. |
