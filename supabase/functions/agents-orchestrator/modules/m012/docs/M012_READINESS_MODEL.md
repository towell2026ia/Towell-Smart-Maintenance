# M-012 — Readiness Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Modelo de Preparación y Estados de Readiness

M-012 evalúa determinísticamente si la OT cuenta con la información y recursos documentales necesarios para pasar a ejecución:

### A. Catálogo Cerrado de Estados de Readiness
1. `READY`: Toda la información obligatoria, checklists y refacciones requeridas están identificados.
2. `PARTIALLY_READY`: Información principal disponible, pero existen advertencias menores o refacciones recomendadas con stock desconocido.
3. `BLOCKED_MISSING_INFORMATION`: Falta información crítica obligatoria (ej. sin alcance o sin máquina válida).
4. `BLOCKED_MISSING_RESOURCE`: Falta un recurso mandatorio (ej. sin checklist obligatorio o refacción requerida no identificada).
5. `REVIEW_REQUIRED`: Existen contradicciones entre fuentes o dependencias técnicas que exigen intervención humana.

---

## 2. Invariantes Fundamentales de Readiness
- **`READY != AUTHORIZED_TO_START`**: `READY` indica preparación documental/material completa. **No** significa autorización de trabajo ni liberación de seguridad.
- **`READY != SAFETY_CLEARED`**: Las autorizaciones de seguridad, permisos de trabajo y LOTO son competencia de `M-013` y supervisión humana.
- **Determinismo Total**: Mismo paquete de entrada + mismas reglas de configuración = exactamente el mismo resultado de readiness.
- **Explicabilidad Obligatoria**: Cada resultado debe desglosar `ready_items`, `missing_items`, `blocking_items`, `warnings` y `dependencies`.
