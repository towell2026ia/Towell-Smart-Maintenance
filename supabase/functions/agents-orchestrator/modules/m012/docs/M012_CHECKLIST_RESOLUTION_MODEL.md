# M-012 — Checklist Resolution Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Modelo de Resolución Determinística de Checklists

M-012 resuelve qué checklist o formato oficial debe vincularse a la OT según su tipo de mantenimiento y familia de máquina:

| Tipo de Mantenimiento | Flujo de Checklist / Formato | Autoridad de Formato | Regla de Resolución en M-012 |
| :--- | :--- | :--- | :--- |
| **Preventivo** | OT Normal + Checklist OT Normal | `AG-006` / `cat_formatos` | Selecciona formato preventivo estándar de la máquina |
| **Predictivo** | Levantamiento Predictivo | `AG-003` / `cat_formatos` | Vincula hallazgo e inspección predictiva |
| **Autónomo** | Checklist Autónomo Semanal | `AG-004` / `cat_formatos` | Vincula formato de inspección de operador |
| **Correctivo** | Formato de Cierre / Bitácora de Falla | `AG-009` / `cat_formatos` | Vincula checklist correctivo/verificación |

---

## 2. Límites y Fronteras con AG-006 y AG-009
- `AG-006`: Define y administra las plantillas de formularios y checklists.
- `M-012`: **Resuelve cuál plantilla existente** corresponde a esta OT específica.
- `AG-009`: Conecta y persiste la ejecución operacional del formulario.
- **Invariante:** `invented_checklist = 0` y `checklist_creation = 0`. M-012 **no inventa** checklists ni modifica plantillas; si falta el formato requerido emite `MISSING_REQUIRED_CHECKLIST`.
