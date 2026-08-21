# AG-011 — Memory Freshness Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-MEMORY-FRESHNESS-001`  

---

## 1. Frescura del Conocimiento y Detección de Obsolescencia (`STALE`)

El conocimiento de mantenimiento no caduca por un tiempo arbitrario fijo, sino por cambios en el contexto físico y tecnológico del activo:

### Desencadenantes de Estado `STALE`:
1. **Modificación de Configuración:** Cambio de modelo de motor, variador o actuador en el activo (`M-010`).
2. **Cambio de Estándar Técnico:** Actualización de normas de seguridad de planta o boletines de ingeniería.
3. **Reincidencia Post-Procedimiento:** Si tras aplicar el procedimiento aprobado ocurre una falla idéntica en $< 30$ días, la memoria se marca como `STALE / REVIEW_REQUIRED`.
4. **Descontinuación de Repuestos:** Si los repuestos requeridos ya no están en catálogo y no tienen reemplazo directo.

---

## 2. Invariante de No-Expiración Arbitraria

$$\text{arbitrary\_expiration\_policy} = 0$$

Una memoria técnica aprobada permanece vigente mientras no existan cambios en el activo, modificaciones de ingeniería o evidencia contradictoria documentada.
