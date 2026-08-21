# AG-011 — Memory Candidate Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-MEMORY-CANDIDATE-001`  

---

## 1. Criterios de Elegibilidad para Candidatos a Memoria

Un **Memory Candidate** (`AG011MemoryCandidate`) es una propuesta borrador de conocimiento técnico generada automáticamente por AG-011 a partir de eventos y análisis cerrados.

### Fuentes Válidas para la Creación de Candidatos:
1. **Investigación RCA Cerrada:** Caso de Cinco Porqués en `AG-010` que cuente con causa raíz validada humanamente (`HUMAN_CONFIRMED_CAUSE`).
2. **Intervención Exitosa Documentada:** Orden de trabajo cerrada con procedimiento detallado, repuestos registrados y sin reincidencia observada en $\ge 60$ días.
3. **Diagnóstico Repetible:** Patrón de inspección verificado en múltiples intervenciones sobre un mismo componente o modelo.
4. **Documentación Técnica Explícita:** Procedimiento extraído de manuales y validado por el equipo de planta.

---

## 2. Bloqueos Estrictos de Creación de Candidatos

- **Prohibición de Candidatos desde Especulaciones de IA:**
  $$\text{memory\_candidate\_from\_unsupported\_AI\_hypothesis} = 0$$
  Una hipótesis de IA sin evidencia empírica ni confirmación humana jamás puede transformarse en candidato a memoria.
- **Prohibición de Generalización Prematura:**
  $$\text{one\_case\_as\_universal\_rule} = 0$$
  Un evento único exitoso solo genera un candidato de alcance específico (`ASSET_SPECIFIC`), nunca un procedimiento universal de planta.
- **Preservación de Evidencias Contradictorias:** Todo candidato debe listar explícitamente `contradicting_evidence` si en el historial existen casos donde el procedimiento falló o no resolvió la avería.
