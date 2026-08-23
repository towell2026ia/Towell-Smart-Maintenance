# M-012 — Data Gap Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Modelo de Brechas y Vacíos de Información

M-012 clasifica formalmente las anomalías o faltantes de datos en el expediente de la OT:

### A. Catálogo Controlado de Brechas
- `MISSING`: Dato u objeto obligatorio ausente (ej. falta checklist requerido o no hay descripción de falla).
- `UNKNOWN`: Estado o valor no determinable con las fuentes actuales (ej. stock desconocido en almacén).
- `NOT_APPLICABLE`: Campo que no corresponde a este tipo de mantenimiento (ej. memoria técnica para limpieza preventiva menor).
- `NOT_AVAILABLE`: Servicio o integración externa temporalmente inaccesible.
- `CONFLICTING`: Discrepancia insalvable entre dos fuentes autorizadas (ej. OT solicita motor trifásico pero memoria técnica indica servomotor monofásico).

---

## 2. Invariantes de Brechas
- `missing != unknown`: Un dato faltante no se confunde con un valor no determinado.
- `conflicting_requires_human_review`: Ante información contradictoria, M-012 emite una bandera de bloqueo `CONFLICTING_INFORMATION` y no elige silenciosamente entre las fuentes.
