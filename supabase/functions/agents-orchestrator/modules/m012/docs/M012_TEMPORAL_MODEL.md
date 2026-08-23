# M-012 — Temporal Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Modelo de Semántica Temporal y `evaluation_at`

Toda evaluación de preparación en M-012 es determinística y temporalmente acotada por `evaluation_at`:

### A. Reglas Temporales
1. **Ejecución en Tiempo Presente:** Para una OT en curso, `evaluation_at` corresponde al timestamp ISO 8601 de la solicitud gobernada.
2. **Reproducibilidad Histórica:** Para auditorías forenses, `evaluation_at` se fija en un punto del pasado. El motor **ignora** cualquier información originada con timestamp posterior a `evaluation_at`:
   - Memorias técnicas aprobadas después de `evaluation_at`.
   - Modificaciones de OT o bitácora posteriores.
   - Movimientos de inventario posteriores.
   - Versiones de checklists publicadas con posterioridad.

---

## 2. Invariantes Temporales
- **`future_preparation_data_leakage = 0`**: Ningún dato del futuro puede filtrarse en una preparación evaluada históricamente.
- Todas las consultas temporales filtran estrictamente por `created_at <= evaluation_at` o `effective_from <= evaluation_at < effective_to`.
