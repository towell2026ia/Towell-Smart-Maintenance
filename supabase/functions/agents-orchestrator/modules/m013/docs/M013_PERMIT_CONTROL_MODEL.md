# M-013 — Permit Control Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Modelo de Control de Permisos de Trabajo de Alto Riesgo

M-013 valida la existencia, vigencia y autorización de permisos de trabajo especiales:

### A. Tipos de Permisos
- `HOT_WORK`: Trabajo en caliente (soldadura, corte con soplete, esmerilado).
- `HEIGHT_WORK`: Trabajo en alturas (> 1.80m, plataformas elevadoras).
- `CONFINED_SPACE`: Entrada a espacios confinados (tanques, fosas, ductos).
- `ELECTRICAL_LIVE`: Trabajo en tensión eléctrica (casos excepcionales).
- `HAZMAT_CHEMICAL`: Manipulación de sustancias químicas peligrosas.

### B. Estados del Permiso
- `REQUIRED`: El trabajo exige permiso formal según su alcance.
- `PENDING`: Permiso solicitado pero aún no autorizado por seguridad de planta.
- `APPROVED_BY_HUMAN`: Permiso firmado por supervisor de seguridad y vigente.
- `EXPIRED`: Permiso cuya fecha/hora de vigencia venció respecto a `evaluation_at`.
- `REJECTED`: Permiso denegado por condiciones inseguras.

---

## 2. Invariantes de Permisos
- `PERMIT_REQUIRED != PERMIT_APPROVED`.
- `automatic_permit_approval = 0`.
- `expired_control_as_valid = 0`.
