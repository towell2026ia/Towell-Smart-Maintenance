# M-012 — Consumer Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Matriz de Consumidores Autorizados del Paquete de Preparación

| Consumidor / Rol | Canal de Acceso | Caso de Uso Primario | Payload Consumido |
| :--- | :--- | :--- | :--- |
| **Técnico de Mantenimiento (UI / App)** | Backend Orchestrator | Consultar antes de acudir a la máquina qué herramientas, refacciones y precauciones se requieren. | `scope_snapshot`, `parts`, `tools_resources`, `safety_dependencies`, `checklist` |
| **Supervisor / Planeador (UI)** | Backend Orchestrator | Verificar el readiness documental y material de las OTs antes de programar cuadrillas. | `readiness`, `missing_information`, `dependencies`, `parts` |
| **`M-013 — Control de Seguridad`** | Backend Inter-Module | Recibir las dependencias de seguridad identificadas para proceder con la verificación LOTO. | `safety_dependencies`, `asset_id`, `work_order_id` |
| **`AG-009 — Gestor de OTs`** | Backend Inter-Agent | Obtener el paquete de preparación consolidado para adjuntar a la orden de trabajo. | `OTPreparationPackage` completo |
| **Auditoría / Calidad** | Reportes Forenses | Verificar la completitud documental previa a la ejecución de órdenes críticas. | `traceability`, `readiness`, `evaluation_at` |

---

## 2. Invariante de No Auto-Confirmación
- `self_confirming_preparation_loop = 0`: M-012 no modifica las fuentes de las que lee para validar artificialmente su propio resultado.
