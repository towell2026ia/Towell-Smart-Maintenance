# M-011 — Feature Catalog v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Freeze:** `M011-FEATURE-CATALOG-001`  

---

## 1. Catálogo Oficial de Features de Salud (`HEALTH_MODEL_VERSION = 'M011-HEALTH-1.0'`)

| Feature ID | Nombre | Dominio | Peso | Dirección | Normalización |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `HEALTH_FAILURE_FREQUENCY` | Frecuencia de Fallas Operativas | `FAILURES` | **0.30** | Menor es mejor | $100 - (\min(fallas, 5) \times 20)$ |
| `HEALTH_MAINTENANCE_COMPLIANCE` | Cumplimiento Preventivo y Autónomo | `MAINTENANCE` | **0.30** | Mayor es mejor | $compliance\_rate \times 100$ |
| `HEALTH_PHYSICAL_FINDINGS` | Impacto de Hallazgos Físicos | `FINDINGS` | **0.20** | Menor es mejor | $100 - (críticos \times 40 + moderados \times 15 + leves \times 5)$ |
| `HEALTH_DOWNTIME_IMPACT` | Impacto de Paros Operacionales | `DOWNTIME` | **0.20** | Menor es mejor | $100 - (\min(minutos\_paro, 480) / 4.8)$ |

---

## 2. Catálogo Oficial de Features de Riesgo (`RISK_MODEL_VERSION = 'M011-RISK-1.0'`)

| Feature ID | Nombre | Dominio | Peso | Dirección | Normalización |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `RISK_HEALTH_DEGRADATION` | Nivel de Degradación de Salud | `FAILURES` | **0.35** | Mayor es peor | $100 - health\_score$ |
| `RISK_MACHINE_CRITICALITY` | Criticidad Operacional del Activo | `CRITICALITY` | **0.25** | Mayor es peor | $\text{ALTA} = 100, \text{MEDIA} = 50, \text{BAJA} = 10$ |
| `RISK_FAILURE_RECURRENCE_TREND`| Recurrencia y Tendencia (AG-008) | `FAILURES` | **0.20** | Mayor es peor | $recurrence\_score + (trend == 'UP' ? 20 : 0)$ |
| `RISK_ACTIVE_FINDINGS_SEVERITY` | Severidad de Hallazgos no Resueltos | `FINDINGS` | **0.20** | Mayor es peor | $\min(críticos \times 50 + moderados \times 20 + leves \times 5, 100)$ |
