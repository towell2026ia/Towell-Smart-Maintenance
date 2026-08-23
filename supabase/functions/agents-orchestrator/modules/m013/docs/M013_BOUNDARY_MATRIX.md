# M-013 — Boundary Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Matriz de Límites y Fronteras de Dominio

| Componente | Dominio Oficial | Lo que M-013 HACE | Lo que M-013 TIENE ESTRICTAMENTE PROHIBIDO |
| :--- | :--- | :--- | :--- |
| **`M-012`** | Preparación de la OT | Consume `safety_dependencies` | M-013 no re-prepara refacciones ni herramientas |
| **`AG-001`** | Orquestación General | Ejecuta bajo solicitud gobernada | M-013 no auto-orquesta flujos globales |
| **`AG-006`** | Formularios / Checklists| Consume respuestas de seguridad | M-013 no diseña ni crea formularios |
| **`AG-007`** | Costos y Presupuestos | N/A | M-013 no calcula costos ni aprueba presupuestos |
| **`AG-009`** | Integración Operativa OT| Emite estado de control de seguridad| M-013 no crea, cierra ni muta la OT |
| **`AG-010`** | 5 Porqués (RCA) | N/A | M-013 no genera causas raíz ni análisis RCA |
| **`AG-011`** | Memoria Técnica | Consume precauciones aprobadas | M-013 no muta ni aprueba memorias técnicas |
| **`AG-012`** | Reparar vs Reemplazar | N/A | M-013 no toma decisiones de renovación de activos |
| **Personal Humano** | Autoridad de Seguridad | Valida la evidencia registrada | M-013 no auto-emite permisos ni ejecuta LOTO físico |

---

## 2. Invariante de Fronteras
- `OT_creation_by_M013 = 0`
- `OT_closure_by_M013 = 0`
- `safety_authorization_by_M013 = 0`
- `automatic_permit_approval = 0`
- `automatic_LOTO_confirmation = 0`
- `technical_work_scope_expansion = 0`
- `LLM_calls = 0`
