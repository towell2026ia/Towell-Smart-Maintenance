# AG-013 — Boundary Matrix v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-DATA-MAP-001`  

---

## 1. Matriz de Límites y Dominios Estrictos (Boundaries)

| Límite Operativo / Funcional | Regla de Contención Estricta | Violación de Límite (Target = 0) |
| :--- | :--- | :---: |
| **Creación / Cierre de OTs** | AG-013 nunca genera ni cierra órdenes de trabajo. | `OT_creation = 0`, `OT_closure = 0` |
| **Aprobación de Compras / CAPEX** | AG-013 no aprueba presupuesto ni compras de reemplazo. | `purchase_creation = 0`, `CAPEX_approval = 0` |
| **Retiro / Disposición de Activos**| AG-013 no da de baja máquinas en catálogo. | `asset_retirement = 0`, `asset_disposal = 0` |
| **Cambios de Calendario** | AG-013 no altera secuencias de preventivo/autónomo. | `schedule_change = 0` |
| **Autorización de Seguridad** | M-013 conserva la autoridad exclusiva de seguridad física. | `safety_authorization = 0` |
| **Decisión Reparar / Renovar / Reemplazar** | AG-012 conserva la autoridad exclusiva de intervención de ciclo de vida. | `repair_renew_replace_decision = 0` |
| **Generación de Causa Raíz** | AG-010 conserva la autoridad exclusiva de RCA y Cinco Porqués. | `root_cause_generation = 0` |
