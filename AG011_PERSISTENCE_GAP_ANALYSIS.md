# AG-011 — Persistence Gap Analysis & Storage Decision v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-PERSISTENCE-GAP-001`  

---

## 1. Análisis de Brecha de Persistencia

A diferencia de `M-010`, `M-011` y `AG-010` (que operan principalmente sobre datos operativos existentes y registros de auditoría de ejecución), **AG-011 gestiona el ciclo de vida del conocimiento organizacional**:
1. Creación de candidatos a memoria (`CANDIDATE`).
2. Flujo de aprobación humana (`REVIEW_REQUIRED` $\to$ `APPROVED` / `REJECTED`).
3. Versionado inmutable y enlaces de reemplazo (`SUPERSEDED`).
4. Gobernanza de alcance y limitaciones técnicas.

### Preguntas Críticas de Arquitectura:
- **¿Dónde vive una memoria aprobada?** En un esquema de persistencia dedicado a conocimiento técnico.
- **¿Se puede resolver únicamente con las tablas actuales de OTs y bitácoras?** **NO**, porque las tablas operativas (`ordenes_trabajo`, `bitacora_fallas`) no almacenan revisiones humanas de procedimientos generales, firmas de aprobación de ingeniería, versiones semánticas ni enlaces de supersession.
- **¿Se duplicaría historial existente?** **NO**, las tablas de memoria solo almacenan los metadatos del conocimiento curado, el contenido técnico redactado y las referencias (IDs y hashes) al expediente original (`M-010`), sin clonar las filas operativas.

---

## 2. Decisión Arquitectónica Oficial

$$\text{AG011\_MIGRATION\_REQUIRED} = \text{true (Prevista para AG-011.2)}$$

Para la subfase **AG-011.1 (Arquitectura y Contratos)**, se formaliza el diseño lógico sin ejecutar migraciones directas prematuras en base de datos. En **AG-011.2 (Motor Determinístico)** se implementará la migración controlada de las 4 tablas mínimas necesarias:

1. `public.memorias_tecnicas`: Identidad del conocimiento, título, tipo de memoria, estado (`APPROVED`, `CANDIDATE`, etc.), nivel de alcance y versión activa.
2. `public.memoria_versiones`: Contenido técnico inmutable (condición, procedimiento, observaciones, repuestos, herramientas, advertencias de seguridad), fechas de vigencia (`effective_from`, `effective_to`) y enlace de supersession.
3. `public.memoria_evidencias`: Vínculos de trazabilidad a órdenes de trabajo, hallazgos y análisis de 5 Porqués que respaldan la memoria.
4. `public.memoria_aprobaciones`: Registro de auditoría de la revisión humana (email del revisor, rol, notas de aprobación y hash criptográfico de la evidencia evaluada).
