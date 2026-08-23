# AG-012 — Temporal Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Semántica Temporal y Prevención de Fuga de Datos Futuros

Toda recomendación estratégica de AG-012 está acotada estrictamente por el timestamp `evaluation_at`:

### A. Reglas Temporales
1. **Evaluación en Tiempo Presente:** `evaluation_at` se toma del timestamp ISO 8601 gobernado por AG-001.
2. **Reproducibilidad Histórica:** Las consultas a costos (AG-007), fallas (AG-008), salud (M-011) y memorias (AG-011) se filtran estrictamente por `created_at <= evaluation_at`.
3. **Inmunidad a Datos Futuros:** Fallas, paros o costos ocurridos con posterioridad a `evaluation_at` son completamente ignorados en evaluaciones históricas.

---

## 2. Invariante Temporal
- `future_decision_data_leakage = 0`.
- El cliente frontend no puede manipular `evaluation_at` para falsear el contexto histórico.
