# AG-011 — Source Inventory v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-DATA-MAP-001`  

---

## 1. Inventario de Fuentes de Entrada Operativas

AG-011 no consulta tablas raw directamente para reconstruir el historial; interactúa a través de los expedientes certificados y módulos de la **RAMA E**:

| ID Fuente | Proveedor / Módulo | Entidad / Datos Suministrados | Rol en Memoria Técnica | Autoridad de Verdad |
| :--- | :--- | :--- | :--- | :--- |
| **`SRC-M010-EXP`** | `M-010 — Asset 360` | Identidad del activo, historial de OTs cerradas, bitácoras, hallazgos, repuestos consumidos, tiempos de paro. | Expediente operativo integral del activo. | `M010-1.0-FROZEN` |
| **`SRC-AG010-RCA`** | `AG-010 — Cinco Porqués` | Árbol de Cinco Porqués, hipótesis causales, causas confirmadas por humanos (`HUMAN_CONFIRMED_CAUSE`), verificaciones recomendadas. | Base de conocimiento causal y diagnóstico profundo. | `AG010-1.0-FROZEN` |
| **`SRC-AG008-SIG`** | `AG-008 — Inteligencia Fallas` | Frecuencia de fallas a 90 días, tasa de reincidencia, patrones y tendencias de degradación. | Contexto de recurrencia y comportamiento de falla. | `AG008-1.0-FROZEN` |
| **`SRC-M011-HLT`** | `M-011 — Salud y Riesgo` | Puntuación de salud (0-100), estado de salud, puntuación de riesgo y criticidad técnica. | Contexto de degradación física y severidad del activo. | `M011-1.0-FROZEN` |
| **`SRC-TECH-MAN`** | Documentación Técnica Autorizada | Manuales de fabricante, procedimientos operativos estándar (SOP), directivas de seguridad. | Verificación de especificaciones y límites de diseño. | Ingeniería / Mantenimiento |

---

## 2. Invariantes de Fuentes de Datos

1. $\text{Historical Record} \neq \text{Technical Memory}$: La existencia de un registro operativo no constituye por sí misma una lección aprendida aprobada.
2. $\text{Closed OT} \neq \text{Validated Best Practice}$: Una orden de trabajo cerrada certifica que una tarea fue terminada, no que el procedimiento sea la mejor práctica universal.
3. $\text{AG-010 Hypothesis} \neq \text{Memory Fact}$: Una hipótesis de Cinco Porqués no confirmada por validación humana no puede publicarse como hecho establecido en la memoria.
4. **Sin Lectura Directa No Gobernada:** AG-011 utiliza exclusivamente el expediente estructurado provisto por M-010 y los agentes de la RAMA E.
