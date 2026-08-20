# M-011 — Source of Truth Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Freeze:** `M011-DATA-MAP-001`  

---

## 1. Matriz de Fuentes de la Verdad

| Variable / Feature | Dominio | Autoridad Primaria | Tipo de Dato | Ventana | Uso en Salud | Uso en Riesgo | Política de Faltante |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `asset_id` | Identidad | `cat_maquinas` (via M-010) | String | Lifetime | Clave | Clave | Rechaza evaluación |
| `criticidad` | Identidad | `cat_maquinas` (via M-010) | Enum (`ALTA`/`MEDIA`/`BAJA`) | Lifetime | **NO** | **SÍ (25%)** | `INSUFFICIENT_DATA` |
| `failure_frequency` | Fallas | `ordenes_trabajo` (via M-010)| Conteo entero | 90 días | **SÍ (30%)** | Indirecto (Health) | `NOT_AVAILABLE` |
| `failure_recurrence` | Fallas | `AG-008` (via context) | Score 0-100 | 90 días | Indirecto | **SÍ (10%)** | Asume 0 si no hay fallas |
| `failure_trend` | Fallas | `AG-008` (via context) | Enum (`UP`/`DOWN`/`STABLE`)| 90 días | Indirecto | **SÍ (10%)** | `STABLE` |
| `preventive_compliance`| Mantenimiento | `calendario_preventivo_anual`| Ratio 0-1.0 | Año actual | **SÍ (20%)** | Indirecto (Health) | `NOT_AVAILABLE` |
| `autonomous_compliance`| Mantenimiento | `calendario_autonomo_semanal`| Ratio 0-1.0 | 90 días | **SÍ (10%)** | Indirecto (Health) | `NOT_APPLICABLE` |
| `active_findings` | Hallazgos | `respuestas_checklist_autonomo`| Puntos severidad | 90 días | **SÍ (20%)** | **SÍ (20%)** | 0 penalización |
| `downtime_minutes` | Paros | `ordenes_trabajo` (duración) | Minutos enteros | 90 días | **SÍ (20%)** | Indirecto (Health) | 0 minutos |
| `costo_mantenimiento` | Costos | `AG-007` | Moneda ($ MXN) | Año actual | **NO** | **NO** | `NOT_USED` |
