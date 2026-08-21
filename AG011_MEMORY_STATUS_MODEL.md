# AG-011 — Memory Status Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-MEMORY-STATUS-001`  

---

## 1. Ciclo de Vida del Conocimiento Técnico

```text
       [ EVENTO / ANÁLISIS CERRADO ]
                     │
                     ▼
              ┌──────────────┐
              │  CANDIDATE   │ ◄── Auto-redactado por AG-011
              └──────┬───────┘
                     │
                     ▼
           ┌──────────────────┐
           │ REVIEW_REQUIRED  │ ◄── En cola de revisión humana
           └─────────┬────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
  ┌──────────────┐        ┌──────────────┐
  │   APPROVED   │        │   REJECTED   │
  └──────┬───────┘        └──────────────┘
         │
    (Reemplazo)
         ▼
  ┌──────────────┐
  │  SUPERSEDED  │
  └──────┬───────┘
         │
   (Obsolescencia)
         ▼
  ┌──────────────┐
  │   RETIRED    │
  └──────────────┘
```

---

## 2. Definición Semántica de Estados

- **`CANDIDATE`:** Propuesta borrador creada por el sistema; no visible en consultas productivas estándar.
- **`REVIEW_REQUIRED`:** Candidato estructurado listo para ser auditado por el equipo de ingeniería.
- **`APPROVED`:** Memoria técnica validada y firmada por un humano autorizado; activa para recuperación productiva.
- **`SUPERSEDED`:** Versión anterior reemplazada formalmente por una nueva versión (`superseded_by_memory_id`). No se presenta como vigente.
- **`RETIRED`:** Memoria técnica retirada formalmente por obsolescencia técnica o cambio de diseño.
- **`REJECTED`:** Candidato rechazado por el revisor; conservado para auditoría pero nunca publicado.
