# AG-011 — Memory Versioning Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-MEMORY-VERSIONING-001`  

---

## 1. Versionado Inmutable y Reemplazo (Supersession)

El conocimiento técnico evoluciona conforme se adquieren nuevos datos de ingeniería. El versionado en AG-011 es estrictamente no destructivo:

- **Versión Semántica:** `MAJOR.MINOR` (ej. `1.0`, `1.1`, `2.0`).
  - `MINOR` (+0.1): Ajustes no materiales en redacción, notas aclaratorias o adición de herramientas menores.
  - `MAJOR` (+1.0): Cambios en el procedimiento técnico, modificación de repuestos críticos, cambio de alcance o reemplazo completo.
- **Cadena de Supersession:** Cuando se aprueba la versión `2.0`, la versión `1.0` pasa automáticamente a `SUPERSEDED` con:
  - `effective_to` fijado al momento de aprobación de la versión `2.0`.
  - `superseded_by_memory_id = 'MEM-...-v2.0'`.

---

## 2. Reproducibilidad Histórica y `evaluation_at`

Cuando un consumidor (como `AG-010` o `M-012`) consulta el contexto histórico de una avería ocurrida en el pasado (`evaluation_at`), el motor de recuperación de AG-011 filtra estrictamente por rango de vigencia:

$$\text{effective\_from} \le \text{evaluation\_at} < \text{COALESCE}(\text{effective\_to}, \infty)$$

$$\text{future\_memory\_leakage} = 0$$

Memorias aprobadas con posterioridad a la fecha del evento analizado quedan estrictamente excluidas de la recuperación histórica para garantizar una reproducibilidad temporal perfecta.
