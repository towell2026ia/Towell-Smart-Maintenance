# M-013 — Safety Blocking Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Reglas Determinísticas de Bloqueo de Seguridad

M-013 evalúa un conjunto cerrado y público de reglas de bloqueo (cero reglas ocultas):

| Código de Regla | Condición Disparadora | Estatus Resultante | Explicabilidad Obligatoria |
| :--- | :--- | :--- | :--- |
| **`BLK-SAF-01`** | Requisito LOTO activo sin confirmación humana de desenergización. | `BLOCKED` | "Requisito LOTO pendiente de verificación humana autorizada." |
| **`BLK-SAF-02`** | Permiso de trabajo obligatorio no emitido o en estado PENDING/REJECTED. | `BLOCKED` | "Permiso de trabajo requerido ausente o no aprobado." |
| **`BLK-SAF-03`** | Permiso de trabajo cuya vigencia venció respecto a `evaluation_at`. | `BLOCKED` | "Permiso de trabajo expirado." |
| **`BLK-SAF-04`** | Falta de confirmación de EPP especial obligatorio. | `CONTROLS_INCOMPLETE` | "EPP especial obligatorio no confirmado en checklist." |
| **`BLK-SAF-05`** | Discrepancia entre checklist ("desenergizado") y notas de bitácora ("línea viva"). | `REVIEW_REQUIRED` | "Evidencia contradictoria sobre aislamiento de energía." |

---

## 2. Invariante de Bloqueo
- `hidden_safety_blocking_rules = 0`.
- Todo bloqueo debe generar `blocking_reasons` con el código de regla y la descripción explícita.
