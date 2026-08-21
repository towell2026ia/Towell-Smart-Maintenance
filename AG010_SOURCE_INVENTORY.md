# AG-010 — Data Source Inventory v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Proveedor de Expediente Principal:** `M-010 — Asset 360` (`M010-1.0-FROZEN`)  
**Freeze:** `AG010-DATA-MAP-001`  

---

## 1. Inventario de Fuentes de Entrada para RCA

| Dominio | Entidad / Fuente de Origen | Vía de Consumo | Autoridad | Rol en AG-010 |
| :--- | :--- | :--- | :--- | :--- |
| **Identidad** | `cat_maquinas` | M-010 (`IDENTITY`) | M-010 | Anclaje de activo, departamento, modelo, tipo |
| **Órdenes de Trabajo** | `ordenes_trabajo` | M-010 (`MAINTENANCE`)| M-010 | Evidencia de fallas, intervenciones, soluciones pasadas |
| **Subtareas** | `orden_subtareas` | M-010 (`SUBTASKS`) | M-010 | Detalle de pasos de reparación y componentes desmontados |
| **Bitácora Telegram** | `stg_telegram` | M-010 (`FAILURES`) | M-010 | Narrativa original de reporte de operador / técnico |
| **Hallazgos Físicos** | `respuestas_checklist_autonomo`| M-010 (`FINDINGS`)| M-010 | Condiciones anómalas previas observadas en piso |
| **Refacciones Usadas** | `refacciones_utilizadas` | M-010 (`PARTS`) | M-010 | Piezas efectivamente reemplazadas en intervenciones |
| **Paros Operacionales**| `ordenes_trabajo` (duración) | M-010 (`DOWNTIME`)| M-010 | Minutos de paro y severidad temporal del evento |
| **Inteligencia de Fallas**| Recurrencia, Reincidencia, Tendencia | `AG-008` (via context)| `AG-008` | Contexto de frecuencia (AG-010 no recalcula) |
| **Salud y Riesgo** | Health / Risk Score & State | `M-011` (via context)| `M-011` | Estado de degradación física y exposición |
| **Costos / Finanzas** | Costo refacciones, mano de obra | `AG-007` | `AG-007` | **NO CONSUMIDO** por AG-010 para diagnóstico técnico |

---

## 2. Invariantes de Fuentes

1. AG-010 **NO realiza consultas directas a base de datos para reconstruir expedientes** si M-010 suministra el contexto certificado.
2. AG-010 **NO trata afirmaciones no verificadas de usuarios como hechos certificados** (`OPERATOR_STATEMENT != CERTIFIED_FACT`).
3. AG-010 **NO inventa evidencias ni casos anteriores ficticios**.
