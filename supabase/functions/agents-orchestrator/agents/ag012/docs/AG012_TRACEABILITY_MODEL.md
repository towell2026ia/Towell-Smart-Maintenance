# AG-012 — Traceability Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Modelo de Trazabilidad y Linaje de Decisión

Cada factor técnico, económico o de confiabilidad que influye en la recomendación de AG-012 mantiene trazabilidad completa:

```json
{
  "factor_id": "FACT-ECON-01",
  "category": "ECONOMIC",
  "name": "recent_maintenance_cost_12m",
  "value": 45000,
  "unit": "MXN",
  "source_agent": "AG-007",
  "source_reference": "Cost Record #CR-2026-PF",
  "timestamp": "2026-08-22T20:00:00.000Z",
  "rule_consumed": "HR-02 / Dimension 2"
}
```

---

## 2. Invariante de Trazabilidad
- `decision_traceability = 100%`.
- `economic_factor_traceability = 100%`.
- `invented_decision_factor = 0`.
- Todo número y afirmación en el paquete apunta a su fuente, regla y fecha de origen.
