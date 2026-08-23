# M-013 — Safety Evidence Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Modelo de Evidencia de Cumplimiento de Seguridad

M-013 exige evidencia formal para considerar que un control de seguridad ha sido satisfecho:

### A. Tipos de Evidencia Soportados
- `DOCUMENTED_REQUIREMENT`: Requisito identificado en M-012/AG-011.
- `HUMAN_CONFIRMATION`: Firma o confirmación explícita de un técnico/supervisor con rol autorizado.
- `PERMIT_RECORD`: Registro formal de permiso de trabajo con folio, vigencia y autorizador.
- `ISOLATION_RECORD`: Registro de candadeo/etiquetado con identificación de candado/caja.
- `CHECKLIST_RESPONSE`: Respuesta validada en el formato de checklist de seguridad de la OT.
- `MISSING_EVIDENCE`: Ausencia de prueba documental/humana requerida.

---

## 2. Invariante de Evidencia
- `invented_safety_evidence = 0`: No se aceptan inferencias como evidencia.
- `cross_OT_safety_evidence_leakage = 0`: Una evidencia de la OT-A no se transfiere a la OT-B.
- `cross_asset_safety_evidence_leakage = 0`: Una evidencia de otra máquina no es válida.
