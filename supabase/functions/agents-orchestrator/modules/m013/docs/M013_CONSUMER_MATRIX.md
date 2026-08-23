# M-013 — Consumer Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Matriz de Consumidores Autorizados del Control de Seguridad

| Consumidor / Rol | Canal de Acceso | Caso de Uso Primario | Payload Consumido |
| :--- | :--- | :--- | :--- |
| **Técnico de Mantenimiento (UI)** | Backend Orchestrator | Consultar qué aislamientos, candados y EPP debe verificar antes de iniciar la intervención. | `requirements`, `loto_status`, `permit_status`, `blocking_reasons` |
| **Supervisor de Seguridad / Planta** | Backend Orchestrator | Revisar solicitudes de permisos de trabajo y registrar confirmaciones LOTO. | `SafetyControlPackage`, `human_confirmations`, `status` |
| **`AG-009 — Gestor de OTs`** | Backend Inter-Module | Validar si la OT tiene `CONTROLS_COMPLETE` antes de permitir la transición a "EN EJECUCIÓN". | `status`, `blocking_reasons`, `is_blocked` |
| **Auditoría de Seguridad Industrial** | Reportes Forenses | Verificar evidencia de permisos y candadeo en intervenciones críticas pasadas. | `traceability`, `human_confirmations`, `evaluation_at` |

---

## 2. Invariante de No Auto-Confirmación
- `system_self_authorized_safety_controls = 0`: M-013 nunca confirma sus propios requisitos de seguridad.
