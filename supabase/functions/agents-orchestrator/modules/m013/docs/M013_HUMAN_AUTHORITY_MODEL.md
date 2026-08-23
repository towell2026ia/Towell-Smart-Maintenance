# M-013 — Human Authority Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Modelo de Autoridad Humana Obligatoria

Los controles críticos de seguridad y la liberación de permisos exigen validación humana gobernada:

### A. Estructura de Confirmación Humana
```json
{
  "confirmation_id": "CONF-SAF-01",
  "requirement_id": "REQ-SAF-01",
  "actor_id": "USER-TECH-104",
  "actor_role": "SUPERVISOR",
  "decision": "CONFIRMED",
  "timestamp": "2026-08-22T20:00:00.000Z",
  "work_order_id": "OT-2026-0801",
  "evidence_notes": "Bloqueo colocado en interruptor general Q1, candado rojo #12, energía cero confirmada a 0.0V"
}
```

---

## 2. Invariantes de Autoridad Humana
- `system_self_authorized_safety_controls = 0`: El sistema M-013 **nunca** se auto-confirma controles críticos.
- `client_safety_clearance_injection = 0`: El cliente frontend no puede forzar estados de seguridad.
- `invented_human_confirmation = 0`: Toda confirmación debe corresponder a un usuario autenticado y con rol habilitado server-side.
