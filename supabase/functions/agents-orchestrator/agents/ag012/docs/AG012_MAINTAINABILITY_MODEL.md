# AG-012 — Maintainability Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Modelo de Factores de Mantenibilidad

La mantenibilidad evalúa la facilidad, tiempo y recursos necesarios para sostener el activo:

### A. Factores Evaluados
- **MTTR (Mean Time to Repair)**: Tiempo promedio de restauración del servicio.
- **Disponibilidad de Procedimientos Certificados**: Existencia de memoria técnica en AG-011.
- **Complejidad de Intervención**: Nivel de especialidad requerido para el desarme/ajuste.
- **Efectividad Histórica de Reparaciones**: Duración de operación continua tras la última reparación mayor.

---

## 2. Invariante de Mantenibilidad
- `REPAIR_POSSIBLE != REPAIR_RECOMMENDED`.
- Toda señal de mantenibilidad debe fundamentarse en registros objetivos de bitácora o memoria técnica aprobada.
