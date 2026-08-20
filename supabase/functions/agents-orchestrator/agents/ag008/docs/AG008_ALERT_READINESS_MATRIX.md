# AG-008 — Alert Readiness Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad`  
**Token de Congelamiento:** `AG008-DATA-MAP-001`

---

## 1. Matriz de Preparación para Alertas Técnicas de Fallas

| Tipo de Alerta | Descripción | Datos Requeridos | Histórico Necesario | Severidad Típica | Estatus para AG-008.2 |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `FAILURE_RECURRENCE_ALERT` | $\ge 3$ fallas iguales en $\le 30$ días en la misma máquina | `maquina_id`, `failure_normalized`, `date` | $\ge 30$ días | `Advertencia` | **READY** |
| `FAILURE_REINCIDENCE_ALERT` | Reaparición de falla $\le 15$ días post-cierre de OT | `maquina_id`, `failure_normalized`, `fecha_cierre` | $\ge 45$ días | `Crítica` | **READY** |
| `FAILURE_FREQUENCY_INCREASE` | Aumento de frecuencia $>50\%$ vs promedio histórico | `event_count`, `period_key` | $\ge 60$ días | `Advertencia` | **READY** |
| `FAILURE_TREND_UP` | Tendencia creciente consistente por 3 periodos consecutivos | Series semanales / mensuales | $\ge 90$ días | `Advertencia` | **READY** |
| `FAILURE_CONCENTRATION_ALERT` | Una sola máquina concentra $>35\%$ de fallas del departamento | `department`, `top_machines` | $\ge 30$ días | `Informativa` | **READY** |
| `CROSS_MACHINE_PATTERN_ALERT` | Mismo modo de falla emergiendo en $\ge 3$ máquinas distintas | `failure_normalized`, `distinct_machines` | $\ge 30$ días | `Advertencia` | **READY** |
| `SEASONAL_PATTERN_DETECTED` | Patrón estacional cíclico recurrente | Series mensuales continuas | $\ge 12$ meses | `Informativa` | **GAP: REQUIRES 12M** |
| `DATA_QUALITY_ALERT` | Fallas no atribuidas o fechas aproximadas $>20\%$ | `data_quality`, `unattributed_count` | N/A | `Informativa` | **READY** |

---

## 2. Invariante de Umbrales Determinísticos

En esta subfase AG-008.1 no se fijan umbrales rígidos. En AG-008.2 se congelará el archivo `AG008-ALERT-THRESHOLD-RULES-001` con los valores oficiales aprobados.
