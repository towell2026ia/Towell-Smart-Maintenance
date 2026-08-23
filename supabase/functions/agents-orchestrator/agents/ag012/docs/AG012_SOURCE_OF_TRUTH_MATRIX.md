# AG-012 — Source of Truth Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Matriz de Autoridades de Origen para AG-012

| Dimensión de Decisión | Autoridad Primaria | Rol de AG-012 | Invariante de Frontera |
| :--- | :--- | :--- | :--- |
| **Identidad y Ficha Técnica del Activo** | `M-010 Asset360` | Consumidor | `wrong_asset_decision = 0` |
| **Salud y Riesgo Operacional** | `M-011 Health/Risk` | Consumidor | `health_recalculation = 0` / `risk_recalculation = 0` |
| **Frecuencia, Tendencia y Recurrencia** | `AG-008 Fallas` | Consumidor | `failure_metric_recalculation = 0` |
| **Causa Raíz Confirmada** | `AG-010 5 Porqués` | Consumidor | `root_cause_generation = 0` |
| **Lecciones y Procedimientos Aprobados** | `AG-011 Memoria Técnica`| Consumidor | `candidate_memory_as_authority = 0` |
| **Costos Históricos y Presupuesto** | `AG-007 Costos` | Consumidor | `AG012 no recalcula costos base de movimientos` |
| **Control de Seguridad Física** | `M-013 Seguridad` | Consumidor | `M013 safety status != replacement economic score` |
| **Recomendación Estratégica Oficial** | **Motor Determinístico AG-012** | Autoridad | `MiMo cannot alter deterministic recommendation` |
| **Aprobación de Compra / CAPEX / OT** | **Personal Humano Autorizado** | N/A | `recommendation != approval` |

---

## 2. Invariante de No Invasión
AG-012 respeta las fronteras de sus fuentes sin sustituir a los agentes upstream ni asumir facultades gerenciales de compra o baja de activos.
