# AG-012 — Economic Decision Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Modelo Económico y Consumo de Hechos de AG-007

AG-012 utiliza hechos económicos certificados provenientes de AG-007 para derivar índices comparativos:

### A. Hechos Económicos de Entrada (Propiedad de AG-007)
- `historical_maintenance_cost`: Costo acumulado histórico en moneda certificada.
- `recent_maintenance_cost_12m`: Costo de mantenimiento en los últimos 12 meses.
- `parts_cost_ratio`: Proporción de costo de refacciones sobre costo total.
- `estimated_replacement_cost`: Estimación del valor de reposición de un activo nuevo (cuando exista en catálogo).

### B. Indicadores Derivados por AG-012
1. **Índice de Carga de Mantenimiento (MCI):**
   $$MCI = \frac{\text{recent\_maintenance\_cost\_12m}}{\text{estimated\_replacement\_cost}}$$ (Sólo si ambos datos existen y son mayores a cero).
2. **Índice Comparativo Reparar vs Renovar:**
   Evalúa el costo de la reparación inmediata frente al costo estimado de una renovación mayor.

---

## 2. Invariantes Económicos
- `AG012 does not recalculate AG-007 source economics`.
- `UNKNOWN_COST != 0 COST`.
- `invented_replacement_cost = 0`.
- `DOWNTIME_HOURS != DOWNTIME_COST` (Sin tarifa financiera certificada, las horas no se monetizan arbitrariamente).
