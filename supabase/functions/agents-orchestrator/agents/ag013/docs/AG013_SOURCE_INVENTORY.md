# AG-013 — Source Inventory v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-DATA-MAP-001`  
**Autoridad:** `READ-ONLY CONSUMER`  

---

## 1. Inventario de Fuentes Upstream Certificadas

| ID Fuente | Nombre del Componente | Token de Freeze | Dominio de Datos | Modo de Acceso |
| :--- | :--- | :---: | :--- | :---: |
| **SRC-M010** | `M-010 — Expediente Único del Activo (Asset360)` | `M010-1.0-FROZEN` | Identidad, criticidad, ubicación, timeline e historial consolidado | Contexto Orquestador |
| **SRC-M011** | `M-011 — Índice de Salud y Riesgo` | `M011-1.0-FROZEN` | Scores de salud y riesgo técnico-operativo | Contexto Orquestador |
| **SRC-AG008**| `AG-008 — Fallas, Tendencias y Reincidencias` | `AG008-1.0-FROZEN` | Frecuencia, recurrencia, reincidencia, MTBF, MTTR y patrones | Contexto Orquestador |
| **SRC-AG007**| `AG-007 — Presupuestos y Costos` | `AG007-1.0-FROZEN` | Costos de mantenimiento, mano de obra, refacciones y desvíos | Contexto Orquestador |
| **SRC-AG010**| `AG-010 — Análisis Causa Raíz` | `AG010-1.0-FROZEN` | Cinco porqués, causas raíz confirmadas y casos históricos | Contexto Orquestador |
| **SRC-AG011**| `AG-011 — Memoria Técnica` | `AG011-1.0-FROZEN` | Lecciones aprendidas y memorias técnicas aprobadas | Contexto Orquestador |
| **SRC-AG012**| `AG-012 — Reparar, Renovar o Reemplazar` | `AG012-1.0-FROZEN` | Estrategia de ciclo de vida recomendada | Contexto Orquestador |
| **SRC-M013** | `M-013 — Control de Seguridad` | *FROZEN* | Estado de seguridad y bloqueos operativos | Contexto Orquestador |

---

## 2. Invariantes de Consumo

1. **Lectura Estricta:** AG-013 consume datos autorizados; no escribe ni muta registros de activos, OTs, costos ni métricas de fallas.
2. **Cero Invocación Directa:** AG-013 no realiza llamadas directas a otros agentes; todo contexto es provisto por el plano de orquestación `AG-001 Capataz`.
3. **Cero Invención:** Prohibido crear hechos o datos operacionales ausentes (`invented_asset = 0`, `invented_cost = 0`, `invented_failure = 0`).
