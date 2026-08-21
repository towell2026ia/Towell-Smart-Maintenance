# AG-010 — Database Interaction Map v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Patrón de Acceso:** `READ_ONLY CONTEXT CONSUMPTION VIA M-010 & AG-001 DISPATCH`  
**Freeze:** `AG010-DATA-MAP-001`  

---

## 1. Flujo de Interacción y Consumo de Datos

```text
               CLIENT / UI / SYSTEM EVENT
                           │
                           ▼
                  AG-001 MASTER CAPATAZ
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
    M-010 CONTEXT LAYER         AG-010 AGENT RUNNER
    [M010-ASSET-CONTEXT-001]     (Deterministic Retrieval
             │                    + MiMo 5-Whys Reasoning)
             ▼                           │
    CERTIFIED EVIDENCE PACKAGE ──────────┘
             │
             ▼
     AG-010 RCA OUTPUT ──► AG-001 ──► DASHBOARD / AG-012
```

---

## 2. Invariantes de Base de Datos

- **Cero Mutaciones:** `source_mutations_by_AG010 = 0`. AG-010 no inserta, actualiza ni borra registros de `ordenes_trabajo`, `stg_telegram`, `cat_maquinas`, etc.
- **Cero Creación de OTs:** `OT_creation_by_AG010 = 0`. AG-010 recomienda temas de verificación técnica, pero la creación de órdenes de trabajo pertenece a `M-012` / `AG-009`.
- **Persistencia en v1.0:** Decisión formal: **`NO_AG010_MIGRATION_REQUIRED`**. La recuperación de casos se deriva determinísticamente de los registros históricos existentes de M-010.
