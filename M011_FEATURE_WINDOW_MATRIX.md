# M-011 — Feature Window Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Freeze:** `M011-FEATURE-WINDOWS-001`  

---

## 1. Matriz de Ventanas Temporales Oficiales

| Feature ID | Ventana Temporal | Justificación Técnica | Tratamiento de Datos Fuera de Ventana |
| :--- | :--- | :--- | :--- |
| `HEALTH_FAILURE_FREQUENCY` | **90 días rodantes** | Refleja la confiabilidad operacional reciente sin distorsión por eventos antiguos ya corregidos. | Excluidos del conteo activo; preservados en histórico de M-010. |
| `HEALTH_MAINTENANCE_COMPLIANCE` | **Año actual (YTD)** | Mide el apego al programa preventivo anual oficial (`AG-002`) y revisiones autónomas. | Se evalúa sobre el ciclo fiscal/operativo corriente. |
| `HEALTH_PHYSICAL_FINDINGS` | **90 días / Activos** | Los hallazgos de inspección no resueltos continúan afectando la condición física. | Hallazgos cerrados/resueltos dejan de penalizar. |
| `HEALTH_DOWNTIME_IMPACT` | **90 días rodantes** | Mide la disponibilidad reciente de la máquina. | Paros antiguos no penalizan disponibilidad actual. |
| `RISK_HEALTH_DEGRADATION` | **90 días rodantes** | Se basa en el cálculo de salud de la misma fecha de evaluación. | Sincronizado con la salud instantánea. |
| `RISK_MACHINE_CRITICALITY` | **Lifetime / Catálogo** | La criticidad de la máquina es una propiedad maestra estable de planta. | Permanente hasta cambio en catálogo. |
| `RISK_FAILURE_RECURRENCE_TREND`| **90 días rodantes** | Analítica de recurrencia y tendencia de fallas entregada por AG-008. | Calculada por AG-008 en ventana estándar. |
| `RISK_ACTIVE_FINDINGS_SEVERITY` | **90 días / Activos** | Hallazgos críticos abiertos representan riesgo inminente de paro. | Cierre documentado elimina el factor de riesgo. |
