# M-012 — Safety Dependency Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Modelo de Dependencias de Seguridad y Handoff a M-013

M-012 identifica requisitos y referencias de seguridad provenientes de memorias técnicas, checklists o especificaciones de equipo:

### A. Tipos de Dependencias de Seguridad Identificables
- `LOTO_REQUIRED`: Bloqueo y etiquetado de fuentes de energía (eléctrica, neumática, vapor, térmica).
- `PERMIT_REQUIRED`: Permiso de trabajo en caliente, espacios confinados o alturas.
- `PPE_SPECIAL_REQUIRED`: Equipo de protección personal específico (careta facial, guantes dieléctricos, arnés).
- `CHEMICAL_SAFETY_REQUIRED`: Manejo de solventes, desengrasantes o productos químicos de limpieza.
- `ENERGY_ISOLATION_VERIFICATION`: Verificación de energía cero antes de la apertura de guardas.

---

## 2. Límites Inquebrantables de Seguridad
- **M-012 IDENTIFICA; M-013 AUTORIZA**: M-012 solo detecta que existe una necesidad de seguridad documentada.
- **Prohibición de Emisión de Seguridad:** M-012 **nunca** puede emitir `LOTO_APPROVED`, `PERMIT_GRANTED`, `SAFE_TO_START` ni `MACHINE_SAFE`.
- **Handoff Canónico:**
  ```text
  [M-012]
  ↓ (Dependencias de seguridad identificadas en paquete)
  [M-013 — Control de Seguridad / Supervisor Humano]
  ↓ (Verificación en sitio y autorización de permisos)
  [Liberación para Ejecución]
  ```
- **Invariante:** `safety_authorization_by_M012 = 0`.
