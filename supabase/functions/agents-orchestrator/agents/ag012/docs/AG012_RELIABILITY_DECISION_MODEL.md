# AG-012 — Reliability Decision Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Modelo de Factores de Confiabilidad

AG-012 consume indicadores de confiabilidad calculados por M-011 y AG-008:

### A. Entradas de Confiabilidad
- **Health Score (0-100)**: Estado de degradación funcional del activo (M-011).
- **Risk Score (0-100)**: Probabilidad e impacto de fallo inminente (M-011).
- **MTBF / Frecuencia de Fallos**: Tiempo medio entre fallas y tendencia temporal (AG-008).
- **Tasa de Recurrencia**: Repetición del mismo modo de fallo en ventanas de 30/60/90 días (AG-008).

### B. Invariantes de Confiabilidad
- `RECURRENCE != ROOT_CAUSE`.
- `RECURRENT_FAILURES != AUTOMATIC_REPLACEMENT`.
- `HIGH_RISK != AUTOMATIC_REPLACE`.
- `health_recalculation_by_AG012 = 0` / `risk_recalculation_by_AG012 = 0`.
