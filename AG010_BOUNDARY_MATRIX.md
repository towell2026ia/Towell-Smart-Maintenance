# AG-010 — Boundary & Authority Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Freeze:** `AG010-DATA-MAP-001`  

---

## 1. Matriz de Fronteras y Límites Inter-Agentes

| Límite / Frontera | Agente / Módulo Autorizado | Rol de AG-010 | Restricción Estricta para AG-010 |
| :--- | :--- | :--- | :--- |
| **Inteligencia de Fallas** | `AG-008` | Consume recurrencia/tendencia como contexto de soporte. | **NO recalcula** MTBF, recurrencia ni tendencias de falla. |
| **Salud y Riesgo** | `M-011` | Consume scores de salud y riesgo como contexto de degradación. | **NO infiere** que mal estado de salud = causa raíz directa. |
| **Costos y Finanzas** | `AG-007` | Ninguno (no consume costos para diagnóstico de causa). | **Cero cálculo de costos** (`cost_calculation = 0`). |
| **Órdenes de Trabajo** | `M-012 / AG-009` | Propone recomendaciones técnicas de inspección. | **NO crea, edita ni cierra OTs** (`OT_creation = 0`). |
| **Malos Actores** | `AG-013` | Suministra antecedentes causales históricos a AG-013. | **NO clasifica activos como Bad Actors** (`bad_actor_classification = 0`). |
| **Reparar / Reemplazar** | `AG-012` | Suministra causa raíz confirmada / hipótesis como insumo de decisión. | **NO toma decisiones de reemplazo** (`repair_replace_decisions = 0`). |
| **Memoria Técnica Reusable**| `AG-011` | Recupera casos operativos puntuales para RCA. | **NO gestiona biblioteca formal de lecciones aprendidas** (alcance de AG-011). |
| **Seguridad y LOTO** | `M-013` | Sugiere verificar aislamiento si aplica. | **NO autoriza maniobras de seguridad** (`safety_decisions = 0`). |
| **Orquestación** | `AG-001` | Es invocado exclusivamente a través de eventos gobernados por AG-001. | **NO atiende llamadas directas del browser** (`direct_UI_to_AG010 = 0`). |
