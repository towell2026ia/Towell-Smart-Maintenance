# M-013 — Safety Requirement Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Modelo de Requisitos de Seguridad

M-013 formaliza cada requisito de seguridad derivado del paquete de preparación de M-012, de la memoria técnica de AG-011 o de la naturaleza del trabajo:

```json
{
  "requirement_id": "REQ-SAF-01",
  "requirement_type": "LOTO_REQUIRED",
  "description": "Bloqueo y etiquetado de alimentación eléctrica principal de telar",
  "source": "M-012 Preparation Package / AG-011 Memoria MEM-ZAX-001",
  "is_blocking": true,
  "requires_human_confirmation": true,
  "required_role": "TECHNICIAN_OR_SUPERVISOR",
  "applicable_component": "MOTOR_PRINCIPAL"
}
```

---

## 2. Catálogo Controlado de Requisitos
- `LOTO_REQUIRED`: Aislamiento de energía eléctrica, neumática o mecánica.
- `PERMIT_REQUIRED`: Permiso formal de trabajo en caliente, alturas, espacios confinados o químicos.
- `PPE_SPECIAL_REQUIRED`: Uso obligatorio de careta, guantes dieléctricos, arnés, etc.
- `ENERGY_ISOLATION_VERIFICATION`: Comprobación física de energía cero con multímetro/manómetro.
- `GUARDING_REQUIRED`: Aseguramiento de guardas y tapas de protección antes de energizar.

---

## 3. Invariante de Requisitos
`invented_safety_requirement = 0`. Todo requisito debe provenir de fuentes certificadas (`M-012`, `AG-011`, checklist formal o regla de componente documentada).
