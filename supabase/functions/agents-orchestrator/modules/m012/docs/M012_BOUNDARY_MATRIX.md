# M-012 — Boundary Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Matriz de Límites y Fronteras de Dominio

| Componente | Dominio Oficial | Lo que M-012 HACE | Lo que M-012 TIENE ESTRICTAMENTE PROHIBIDO |
| :--- | :--- | :--- | :--- |
| **`AG-001`** | Orquestación / Capataz | Ejecuta bajo solicitud gobernada | M-012 no auto-orquesta ni despacha flujos globales |
| **`AG-002`** | Planeación Preventiva | Consume refacciones planificadas | M-012 no recalcula planes anuales ni presupuestos preventivos |
| **`AG-006`** | Formularios / Checklists| Resuelve plantilla aplicable | M-012 no diseña, edita ni crea plantillas de checklist |
| **`AG-007`** | Costos y Presupuestos | Muestra contexto de costos si existe | M-012 no calcula costos, no aprueba cotizaciones ni autoriza gasto |
| **`AG-008`** | Fallas y Tendencias | Muestra alertas de recurrencia | M-012 no recalcula frecuencias ni estadísticas de fallas |
| **`AG-009`** | Integración Operativa OT| Prepara el paquete pre-ejecución | M-012 no crea, cierra, cancela ni transiciona estados de la OT |
| **`AG-010`** | 5 Porqués (RCA) | Muestra causa raíz validada si existe | M-012 no ejecuta análisis RCA ni confirma causas |
| **`AG-011`** | Memoria Técnica | Consulta Top-5 de memorias aprobadas | M-012 no aprueba memorias, no rerankea y no muta su alcance |
| **`M-010`** | Expediente 360 Activo | Lee timeline e intervenciones | M-012 no muta el expediente del activo |
| **`M-011`** | Salud y Riesgo | Lee scores de salud y riesgo | M-012 no recalcula índices ni añade tareas por riesgo |
| **`M-013`** | Control de Seguridad | Identifica dependencias de seguridad | M-012 no autoriza LOTO, no emite permisos ni declara "safe" |

---

## 2. Invariante de Fronteras
- `cost_calculation_by_M012 = 0`
- `OT_creation = 0` / `OT_closure = 0`
- `technician_assignment = 0`
- `inventory_reservation = 0`
- `purchase_creation = 0`
- `memory_approval = 0`
- `safety_authorization = 0`
- `LLM_calls = 0`
