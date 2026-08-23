# M-012 — Data Availability Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Matriz de Disponibilidad de Datos y Tratamiento de Vacíos

| Campo / Recurso | Estado cuando está disponible | Estado cuando no existe / es nulo | Impacto en Readiness |
| :--- | :--- | :--- | :--- |
| **Identidad OT (`work_order_id`)** | `AVAILABLE` | `ERROR_FATAL` (Rechazo inmediato) | `BLOCKED` (No procesable) |
| **Identidad Máquina (`asset_id`)** | `AVAILABLE` | `ERROR_FATAL` (Rechazo inmediato) | `BLOCKED` (No procesable) |
| **Alcance / Tarea solicitada** | `AVAILABLE` | `MISSING` (Bloqueo de preparación) | `BLOCKED_MISSING_INFORMATION` |
| **Refacciones identificadas** | `IDENTIFIED` | `NOT_DOCUMENTED` / `NONE_REQUIRED` | `READY` o `PARTIALLY_READY` |
| **Stock de refacción** | `AVAILABLE_IN_STOCK` | `UNKNOWN` (No inventar `0` ni `disponible`) | `WARNING` |
| **Herramientas requeridas** | `IDENTIFIED` | `UNKNOWN` / `NOT_DOCUMENTED` | `READY` (si el tipo no exige especial) |
| **Checklist aplicable** | `RESOLVED` | `MISSING_REQUIRED_CHECKLIST` | `BLOCKED_MISSING_RESOURCE` |
| **Memoria técnica aplicable** | `APPLICABLE` (Top-5) | `NONE_APPLICABLE` (Fast Path vacío) | `READY` (No bloquea la preparación) |
| **Dependencia de Seguridad / LOTO**| `IDENTIFIED` | `NOT_IDENTIFIED` | Requiere Handoff M-013 |

---

## 2. Invariante de No Suposición
- `UNKNOWN` nunca se transforma en `0` ni en `DISPONIBLE`.
- La ausencia de una memoria técnica no bloquea una OT rutinaria si el checklist y las refacciones están completas.
