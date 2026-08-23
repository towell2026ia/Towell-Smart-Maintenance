# M-012 — Source of Truth Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Matriz de Autoridad de Fuentes de Verdad

| Entidad / Dato | Autoridad Primaria | Rol de M-012 | Invariante de Frontera |
| :--- | :--- | :--- | :--- |
| **Identidad y Alcance de la OT** | `public.ordenes_trabajo` | Consumidor fiel | `M012 no crea ni amplía el alcance de la OT` |
| **Identidad del Activo** | `public.cat_maquinas` | Consumidor fiel | `M012 no reasigna la máquina a otra OT` |
| **Expediente 360 del Activo** | `M-010 — Expediente Activo` | Contexto de lectura | `M012 no sobrescribe el historial del activo` |
| **Salud y Riesgo del Activo** | `M-011 — Salud y Riesgo` | Contexto de lectura | `M012 no recalcula índices ni añade tareas por riesgo` |
| **Memoria Técnica Validada** | `AG-011 — Memoria Técnica` | Contexto de recomendación | `M012 no aprueba memorias ni las impone sin autoridad` |
| **Definición de Checklists** | `AG-006` / `cat_formatos` | Resolutor de formato | `M012 no inventa plantillas de checklist` |
| **Flujo Operativo de OT** | `AG-009 — Gestor de OTs` | Preparación previa | `M012 no ejecuta la integración operacional` |
| **Autorización de Seguridad** | `M-013` / Supervisor Humano | Identificador de dependencia | `M012 no autoriza LOTO ni permisos de trabajo` |
| **Presupuesto y Costos** | `AG-007 — Costos` | Contexto económico | `M012 no calcula costos ni aprueba gasto` |
| **Asignación de Técnicos** | Supervisor / Planeador Humano | N/A (No modelado) | `M012 no asigna técnicos ni gestiona habilidades` |

---

## 2. Invariante de No Conflicto
M-012 nunca resuelve silenciosamente discrepancias entre fuentes; ante contradicciones emite un estado `CONFLICTING_INFORMATION` con revisión humana requerida.
