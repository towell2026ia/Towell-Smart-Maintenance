# AG-010 — Case Scope & Identity Definition v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Tokens:** `AG010-CASE-MODEL-001`, `AG010-CASE-SCOPE-001`  

---

## 1. Definición Formal de "Caso" en AG-010

Un **Caso de Análisis Causal** en AG-010 representa una investigación técnica delimitada que contiene:
1. **Identificador Estable (`case_id`):** Generado determinísticamente a partir del `asset_id` y la estampa temporal (`RCA-{asset_id}-{YYYYMMDDHHmmss}`).
2. **Activo Primario (`asset_id`):** En v1.0, el análisis principal se enfoca en un único activo físico.
3. **Problema Reportado (`problem_statement`):** Enunciado del síntoma o falla a investigar.
4. **Ventana Temporal (`evaluation_at`):** Límite estricto de corte para evitar filtración de eventos futuros.
5. **Origen / Disparador:** Orden de trabajo, alerta técnica o solicitud de usuario vía AG-001.

---

## 2. Definición Formal de "Caso Anterior" (`PreviousCase`)

Un **Caso Anterior** es un evento histórico de intervención o falla previa que ocurrió en el mismo activo o en un activo de la misma tipología, que cuenta con:
- `previous_case_id`: Identificador trazable a una OT o registro de falla de M-010.
- `occurred_at`: Fecha del evento ($\le \text{evaluation\_at}$).
- `failure_title`: Resumen técnico del problema resuelto o intervenido.
- `interventions_summary`: Acciones realizadas (ej. cambio de rodamientos, ajuste de tensión).
- `outcome`: Resultado documentado (`RESOLVED`, `REOPENED`, `RECURRED`, `UNKNOWN`).
- `root_cause_status`: Estado de la causa reportada en el historial.
