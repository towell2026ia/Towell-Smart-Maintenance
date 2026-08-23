# AG-012 — Boundary Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Matriz de Límites y Fronteras de Dominio

| Componente | Dominio Oficial | Lo que AG-012 HACE | Lo que AG-012 TIENE ESTRICTAMENTE PROHIBIDO |
| :--- | :--- | :--- | :--- |
| **`AG-007`** | Costos y Presupuestos | Consume hechos económicos certificados | AG-012 no recalcula costos base de movimientos |
| **`AG-008`** | Inteligencia de Fallas | Consume MTBF, tendencias y recurrencia | AG-012 no recalcula métricas de falla |
| **`AG-010`** | 5 Porqués (RCA) | Consume causa raíz confirmada | AG-012 no genera hipótesis ni causas raíz |
| **`AG-011`** | Memoria Técnica | Consume lecciones y procedimientos aprobados | AG-012 no crea ni aprueba memorias técnicas |
| **`AG-013`** | Clasificación Bad Actor | Aporta contexto de estrategia de activo | AG-012 no clasifica máquinas como Bad Actors |
| **`M-010`** | Expediente Asset360 | Consume características y timeline | AG-012 no reconstruye fichas de activos |
| **`M-011`** | Salud y Riesgo | Consume Health Score y Risk Score | AG-012 no recalcula scores de salud o riesgo |
| **`M-012`** | Preparación de OT | Aporta contexto de estrategia si se solicita | AG-012 no prepara refacciones ni herramientas de OTs |
| **`M-013`** | Control de Seguridad | Respeta bloqueos de seguridad | AG-012 no usa status de seguridad como justificación de reemplazo |
| **Dirección / Humano**| Autoridad Financiera | Recomienda con evidencia estructurada | AG-012 no aprueba CAPEX, no compra ni da de baja activos |

---

## 2. Invariante de Fronteras
- `purchase_creation = 0`
- `OT_creation = 0`
- `asset_retirement = 0`
- `asset_disposal = 0`
- `budget_change = 0`
- `schedule_change = 0`
- `inventory_reservation = 0`
- `safety_authorization = 0`
- `bad_actor_classification = 0`
