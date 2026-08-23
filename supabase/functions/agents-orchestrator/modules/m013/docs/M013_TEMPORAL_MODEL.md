# M-013 — Temporal Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Semántica Temporal, Vigencia y `evaluation_at`

Toda evaluación de controles de seguridad en M-013 es determinística y temporalmente acotada por `evaluation_at`:

### A. Reglas de Validación Temporal
1. **Ejecución Presente:** `evaluation_at` se fija al timestamp ISO 8601 de la solicitud gobernada.
2. **Control de Vigencia de Permisos:**
   - Un permiso con `valid_from <= evaluation_at <= valid_to` se considera `CURRENT`.
   - Si `evaluation_at > valid_to`, el permiso se marca estrictamente como `EXPIRED` y bloquea la OT.
3. **Reproducibilidad Histórica:**
   - Consultas filtran estrictamente por `created_at <= evaluation_at`.
   - Evidencias o firmas posteriores al timestamp evaluado son ignoradas.

---

## 2. Invariante Temporal
- `future_safety_evidence_leakage = 0`: Cero filtración de evidencias futuras en evaluaciones históricas.
