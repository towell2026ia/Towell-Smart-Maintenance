# M-012 — Work Scope Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Modelo de Alcance de Trabajo (Scope Snapshot)

El Scope Snapshot captura fielmente la solicitud original de la OT para prevenir derivas o expansiones automáticas:

1. **Campos Inmutables del Alcance:**
   - `work_order_id`: Identificador canónico de la OT existente.
   - `asset_id`: Código de máquina asignado.
   - `maintenance_type`: `PREVENTIVE` | `PREDICTIVE` | `AUTONOMOUS` | `CORRECTIVE` | `OVERHAUL`.
   - `component_id`: Componente específico objetivo de la intervención.
   - `department`: Departamento operativo (`PF`, `URDIDO`, `ENGOMADO`, `TINTORERIA`, etc.).
   - `requested_activities`: Lista de tareas documentadas en la creación formal de la OT.

---

## 2. Invariante Anti-Expansión de Alcance
- **Regla Estricta:** `automatic_work_scope_expansion = 0`.
- M-012 **no puede** agregar nuevas actividades a la OT basándose únicamente en que una memoria técnica, un checklist o un índice de riesgo mencione tareas adicionales.
- Si se detecta necesidad de trabajo complementario, se reporta como `DEPENDENCY / REVIEW_REQUIRED`, sin mutar la OT.
