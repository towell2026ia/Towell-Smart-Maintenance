# AG-011 — Source of Truth Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-DATA-MAP-001`  

---

## 1. Matriz de Autoridades de Verdad

| Entidad / Dominio | Autoridad Primaria | Rol de AG-011 | Prohibición Estricta en AG-011 |
| :--- | :--- | :--- | :--- |
| **Expediente del Activo** | `M-010 — Asset 360` | Consumidor de expediente. | No reconstruir Asset360 por cuenta propia. |
| **Cinco Porqués y RCA** | `AG-010 — Cinco Porqués` | Consumidor de hipótesis y causas confirmadas. | No ejecutar 5 Porqués ni inventar hipótesis causales. |
| **Patrones de Falla** | `AG-008 — Inteligencia Fallas` | Consumidor de señales de frecuencia y reincidencia. | No recalcular MTBF, MTTR ni tendencias de falla. |
| **Salud y Riesgo del Activo** | `M-011 — Salud y Riesgo` | Consumidor de estado y puntuación de salud/riesgo. | No recalcular puntuaciones de salud ni matrices de riesgo. |
| **Costos de Mantenimiento** | `AG-007 — Costos` | Contexto informativo si el procedimiento lo requiere. | No calcular costos de mano de obra ni partes. |
| **Creación de OTs** | `M-012 / AG-009` | Provee conocimiento reutilizable para planeación. | **Cero creación directa de órdenes de trabajo.** |
| **Aprobación de Memoria** | **Humano Autorizado de Mantenimiento** | Generador de candidatos (`AUTO-DRAFT`). | **Cero auto-aprobación de memorias por IA.** |
| **Memoria Técnica Aprobada** | `AG-011 — Memoria Técnica` | **Autoridad exclusiva de conocimiento reusable.** | N/A |
