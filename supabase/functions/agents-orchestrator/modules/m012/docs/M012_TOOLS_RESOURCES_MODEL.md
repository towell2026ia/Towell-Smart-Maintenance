# M-012 — Tools and Resources Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Modelo de Herramientas y Recursos

M-012 identifica las herramientas especializadas y equipos de apoyo documentados para la intervención:

### A. Origen de Herramientas
- Memoria técnica aprobada (`AG-011`).
- Procedimiento estándar del catálogo de mantenimiento.
- Requisitos del formato de checklist (`AG-006`).
- Entrada humana documentada en la OT.

### B. Recursos Humanos y Especialidad
- M-012 puede reflejar la especialidad técnica (`MECANICO`, `ELECTRICO`, `ELECTRONICO`, `LUBRICADOR`) y el número de técnicos sugerido si está documentado en la OT o memoria técnica.
- **NO reconstruye una matriz de habilidades (Skills Matrix)** conforme a la arquitectura congelada.
- **NO asigna técnicos individuales** a la OT (`technician_assignment_by_M012 = 0`).

---

## 2. Invariantes de Herramientas
- `invented_tool = 0`: Si no hay herramientas documentadas, el resultado es `NOT_DOCUMENTED` o `STANDARD_TOOLKIT`, nunca inventadas.
- `tool_quantity_unknown != 0_tools_required`: La falta de cantidad explícita no implica cero herramientas.
- `technician_assignment_by_M012 = 0`: La asignación real de personal permanece en el flujo de supervisión humana/AG-009.
