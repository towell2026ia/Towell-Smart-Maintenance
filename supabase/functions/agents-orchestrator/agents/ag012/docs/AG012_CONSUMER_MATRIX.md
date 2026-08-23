# AG-012 — Consumer Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Matriz de Consumidores de Recomendaciones de Estrategia de Activos

| Consumidor / Rol | Canal de Entrega | Caso de Uso Primario | Payload Consumido |
| :--- | :--- | :--- | :--- |
| **Super Administrador / Gerencia de Planta** | UI Dashboard Gerencial | Evaluar si autorizar un overhaul mayor o programar inversión de reemplazo. | `InterventionRecommendationPackage`, `decision_factors`, `explanation` |
| **Ingeniería de Mantenimiento** | Reporte Técnico | Identificar si continuar reparando un activo es técnicamente y económicamente sostenible. | `decision_factors`, `reliability_context`, `maintainability` |
| **`AG-013 — Bad Actors`** | Inter-Agent Backend | Cruzar activos con estrategia REPLACE con aquellos que presentan alta recurrencia de paros. | `recommendation`, `data_quality`, `scores` |
| **Auditoría de Activos y Confiabilidad** | Registro de Auditoría | Respaldar técnicamente las decisiones de renovación de maquinaria. | `traceability`, `hard_rules`, `economic_context` |

---

## 2. Invariante de Consumo
- Toda recomendación generada por AG-012 incluye la bandera `requires_human_approval = true`.
