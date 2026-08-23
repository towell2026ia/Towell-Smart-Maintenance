# M-013 — LOTO Control Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Modelo de Control de Aislamiento de Energía y LOTO

M-013 modela el ciclo de vida del aislamiento de energía sin asumir su cumplimiento físico:

### A. Catálogo Cerrado de Estados LOTO
- `NOT_REQUIRED`: La tarea no interviene circuitos de potencia ni fuentes de energía peligrosa.
- `REQUIRED`: El trabajo requiere aislamiento obligatorio (identificado por M-012/AG-011).
- `PENDING`: Requisito identificado pero sin evidencia de bloqueo físico.
- `VERIFIED_BY_HUMAN`: Técnico/Supervisor confirmó candadeo, tarjeta y verificación de energía cero.
- `FAILED_OR_INCOMPLETE`: Evidencia contradictoria o verificación de voltaje positiva.

---

## 2. Invariantes de LOTO
- `LOTO_REQUIRED != LOTO_COMPLETE`.
- `LOTO_execution_by_M013 = 0` (M-013 no coloca candados ni acciona seccionadores).
- `automatic_LOTO_confirmation = 0` (La confirmación exige firma humana real).
