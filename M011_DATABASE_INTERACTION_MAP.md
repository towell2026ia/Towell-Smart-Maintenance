# M-011 — Database Interaction Map v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Patrón de Acceso:** `READ_ONLY / ON_DEMAND CONSUMPTION VIA M-010`  
**Freeze:** `M011-DATA-MAP-001`  

---

## 1. Flujo de Interacción de Datos

```text
       TSM-AI CONSUMER (Dashboard / AG-001 / AG-012 / AG-013)
                                 │
                                 ▼
                     M-011 HEALTH & RISK MODULE
                                 │
          ┌──────────────────────┴──────────────────────┐
          │                                             │
          ▼                                             ▼
  M-010 CONTEXT REQUEST                        PERSISTENCE / SNAPSHOT
  [M011-ASSET-INPUT-001]                               (OPTIONAL)
          │                                             │
          ▼                                             │
  M-010 ASSET 360 LAYER                                 │
  (Closed fetchers / Cat_maquinas / OTs / etc.)          │
          │                                             │
          ▼                                             ▼
  CERTIFIED ASSET CONTEXT                        M-011 EVALUATION RESULT
```

---

## 2. Operaciones de Base de Datos Autorizadas

- **Operaciones de Lectura:** M-011 opera exclusivamente mediante interfaces de lectura canalizadas a través de `M-010`.
- **Operaciones de Mutación:** Prohibidas en tablas de negocio (`cat_maquinas`, `ordenes_trabajo`, `calendario_preventivo_anual`, `alertas_mantenimiento`). `source_mutations = 0`.
- **Persistencia de Snapshots:** En v1.0, el cálculo es **on-demand**. No se requieren migraciones estructurales intermedias (`NO_M011_MIGRATION_REQUIRED`).
