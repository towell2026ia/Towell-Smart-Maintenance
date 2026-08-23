# M-013 — Data Availability Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Matriz de Disponibilidad de Evidencia de Seguridad

| Evidencia / Control | Estado cuando está disponible | Estado cuando no existe / es nulo | Impacto en Safety Status |
| :--- | :--- | :--- | :--- |
| **Requisito LOTO** | `AVAILABLE` (con evidencia y firma) | `MISSING_EVIDENCE` / `PENDING` | `BLOCKED` (Bloqueo crítico de seguridad) |
| **Permiso de Trabajo (Fuego/Alturas)**| `APPROVED` (vigente a `evaluation_at`)| `MISSING` / `EXPIRED` | `BLOCKED` (Bloqueo crítico de seguridad) |
| **Porte de EPP Especial** | `CONFIRMED_IN_CHECKLIST` | `MISSING` / `NOT_CONFIRMED` | `CONTROLS_INCOMPLETE` |
| **Verificación de Energía Cero** | `CONFIRMED_BY_HUMAN` | `MISSING` | `BLOCKED` |
| **Aislamiento Neumático/Vapor** | `CONFIRMED_BY_HUMAN` | `NOT_APPLICABLE` (si el equipo no usa)| `CONTROLS_COMPLETE` (si no aplica) |
| **Discrepancia en Evidencias** | `CONFLICTING` | N/A | `REVIEW_REQUIRED` |

---

## 2. Invariante de Seguridad
- `MISSING_SAFETY_DATA != SAFE` (La falta de datos nunca se interpreta como seguro).
- `UNKNOWN_SAFETY_STATE != SAFE` (El estado no determinado bloquea la ejecución).
- `EXPIRED_EVIDENCE != CURRENT_EVIDENCE` (Permisos expirados carecen de validez).
