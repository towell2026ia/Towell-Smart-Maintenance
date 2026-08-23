# AG-012 — Technical Decision Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Definición Formal de Opciones de Intervención

### A. REPAIR (Reparar)
- **Definición:** Corrección o restauración de una falla o componente específico para devolver al activo a su condición operativa normal, sin alterar su ciclo de vida general ni realizar un reset mayor de su estado técnico.
- **Cuándo Aplica:** Falla aislada, costo de reparación bajo respecto al valor del activo, componentes mecánicos/eléctricos estándar disponibles y confiabilidad general aceptable.

### B. RENEW (Renovar / Overhaul)
- **Definición:** Rehabilitación mayor, reacondicionamiento integral, modernización o reemplazo de subsistemas principales que extiende significativamente la vida útil de servicio del activo sin sustituir la máquina completa.
- **Cuándo Aplica:** Estructura base del activo en buen estado, pero subsistemas clave (electrónica, servomotores, neumática) con desgaste acumulado o desactualizados, donde la renovación restaura el 80%+ de la capacidad original a una fracción del costo de un activo nuevo.

### C. REPLACE (Reemplazar)
- **Definición:** Retiro definitivo del activo del servicio primario y su sustitución por un activo nuevo o equivalente.
- **Cuándo Aplica:** Degradación estructural irreparable, obsolescencia total sin soporte de refacciones, costo acumulado de mantenimiento insostenible frente a una nueva inversión y pérdida recurrente de capacidad de producción.

---

## 2. Invariante Técnico
- `ONE_FAILURE != ASSET_END_OF_LIFE`.
- `HIGH_RISK != AUTOMATIC_REPLACE`.
- `invented_technical_fact = 0`.
