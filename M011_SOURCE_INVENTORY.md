# M-011 — Data Source Inventory v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Proveedor de Datos Primario:** `M-010 — Asset 360` (`M010-ASSET-CONTEXT-001`, `M010-1.0-FROZEN`)  
**Freeze:** `M011-DATA-MAP-001`  

---

## 1. Inventario de Fuentes de Entrada

| Dominio | Entidad de Origen | Vía de Consumo | Autoridad | Rol en M-011 |
| :--- | :--- | :--- | :--- | :--- |
| **Identidad** | `cat_maquinas` | M-010 (`IDENTITY`) | M-010 | Identificación oficial, activo, departamento, tipo |
| **Criticidad** | `cat_maquinas.criticidad` | M-010 (`IDENTITY`) | `cat_maquinas` | Modulador de Riesgo Operacional (`ALTA`, `MEDIA`, `BAJA`) |
| **Fallas** | `ordenes_trabajo`, `stg_telegram` | M-010 (`FAILURES`) | M-010 | Conteo crudo de fallas e historial |
| **Inteligencia Fallas** | Frecuencia, Recurrencia, Tendencia | `AG-008` (via context) | `AG-008` | Modulador de Salud y Riesgo (M-011 no recalcula) |
| **Preventivo** | `calendario_preventivo_anual` | M-010 (`MAINTENANCE`)| `AG-002` | Tasa de cumplimiento preventivo anual |
| **Autónomo** | `calendario_autonomo_semanal` | M-010 (`MAINTENANCE`)| M-010 | Tasa de cumplimiento autónomo semanal |
| **Checklists** | `respuestas_checklist_orden` | M-010 (`CHECKLISTS`)| M-010 | Evidencia de ejecución de inspecciones |
| **Levantamientos** | `levantamientos_mantenimiento` | M-010 (`SURVEYS`) | M-010 | Inspecciones predictivas y bitácoras |
| **Hallazgos Físicos**| `respuestas_checklist_autonomo` | M-010 (`FINDINGS`)| M-010 | Severidad de hallazgos activos no resueltos |
| **Paros Operacionales**| `ordenes_trabajo` (duración min) | M-010 (`DOWNTIME`)| M-010 | Tiempo acumulado de paro operacional |
| **Alertas Técnicas** | `alertas_mantenimiento` | M-010 (`ALERTS`) | AG-008/AG-001 | Señales activas de degradación |
| **Costos / Finanzas** | Costo refacciones, mano de obra | `AG-007` | `AG-007` | **NO CONSUMIDO** por M-011 para salud física |

---

## 2. Invariantes de Fuentes

1. M-011 **NO consulta directamente tablas base si M-010 puede proveer el contexto certificado**.
2. M-011 **NO recalculas métricas que pertenecen a la autoridad de AG-008**.
3. M-011 **NO incorpora costos económicos para determinar la salud física intrínseca del activo**.
