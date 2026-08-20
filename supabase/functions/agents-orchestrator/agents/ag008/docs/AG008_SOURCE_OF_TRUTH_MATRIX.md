# AG-008 — Source of Truth Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad`  
**Token de Congelamiento:** `AG008-SOURCE-OF-TRUTH-001`

---

## 1. Matriz de Autoridad por Dominio de Información

| Dominio de Información | Fuente Primaria de Verdad | Fuente Secundaria / Fallback | Criterio de Resolución |
| :--- | :--- | :--- | :--- |
| **Identidad de Máquina** | `public.cat_maquinas(equipo_towell)` | N/A (Estricto) | Solo equipos registrados en `cat_maquinas`. Máquinas no encontradas se marcan como `UNATTRIBUTED_FAILURE`. |
| **Departamento / Área** | `public.cat_maquinas(departamento_codigo)` | Campo `area`/`depto` en fuente cruda | Se prioriza el catálogo oficial (`PF`, `CF`, `TF`, `AF`). |
| **Fecha de Ocurrencia** | `fecha_solicitud` / `fecha` + `hora` | `fecha_creada` / `fecha_carga` | La fecha/hora más cercana al paro o reporte real. |
| **Texto Original de Falla** | `descripcion_falla` / `falla` / `obs` | Campo `descripcion` | Se preserva íntegramente como `failure_raw`. |
| **Texto Normalizado** | Regla determinística `AG008-FAILURE-NORMALIZATION-001` | N/A | Minúsculas, trim, remoción de acentos y caracteres especiales. |
| **Hallazgo Físico Real** | `levantamientos_mantenimiento` (AG-004/AG-003) | `ordenes_trabajo` | Solo encuestas o levantamientos físicos generan `physical_finding = true`. |
| **Resolución y Cierre** | `ordenes_trabajo(fecha_cierre, trabajo_realizado)` | `stg_telegram_ordenes_telares(obs_cierre)` | Se audita si la falla fue atendida o permanece abierta. |
| **Criticidad de Máquina** | `public.cat_maquinas(criticidad)` | N/A | Dimensión contextual inmutable. |

---

## 2. Invariantes de Autoridad

1. **Precedencia de Fuentes Operativas sobre Staging:** Para fallas coincidentes, `ordenes_trabajo` tiene precedencia sobre `stg_telegram_ordenes_telares` y `fallas_por_maquina`.
2. **Cero Inferencia de Causa Raíz:** Ninguna fuente autoriza a AG-008 a convertir un síntoma ("falla motor") en una causa raíz ("rodamiento dañado").
