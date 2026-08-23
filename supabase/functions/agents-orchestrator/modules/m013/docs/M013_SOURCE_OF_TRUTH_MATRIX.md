# M-013 — Source of Truth Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Matriz de Autoridad de Fuentes de Control de Seguridad

| Control / Entidad | Autoridad Primaria | Rol de M-013 | Invariante de Frontera |
| :--- | :--- | :--- | :--- |
| **Identificación de Requisitos de Seguridad**| `M-012` / `AG-011` / Tipo de OT | Evaluador de cumplimiento | `M013 no inventa requisitos genéricos sin base documental` |
| **Aislamiento de Energía (LOTO)** | Técnico Calificado / Supervisor Humano | Verificador de evidencia | `M013 no ejecuta físicamente el LOTO ni auto-aprueba desenergización` |
| **Permisos de Trabajo de Alto Riesgo** | Supervisor de Seguridad / Planta | Verificador de validez | `M013 no emite permisos de trabajo autónomamente` |
| **Verificaciones en Sitio (EPP, Guardas)** | Respuestas en Checklist de Seguridad | Verificador de completitud | `Una respuesta afirmativa en checklist no sustituye un permiso formal` |
| **Liberación Final de Seguridad** | Supervisor Humano Autorizado | Validador del estado | `CONTROLS_COMPLETE != WORK_ORDER_EXECUTION_AUTHORIZED` |
| **Diseño de Formularios de Seguridad** | `AG-006` / Catálogo de Formatos | Consumidor | `M013 no crea plantillas de formularios de seguridad` |
| **Flujo Operacional de la OT** | `AG-009 — Gestor de OTs` | Emisor de bloqueo/pase | `M013 no crea, cierra ni cancela la OT` |

---

## 2. Invariante de Autoridad
M-013 **evalúa y valida evidencia**; la confirmación física y la responsabilidad legal permanecen en el personal humano autorizado.
