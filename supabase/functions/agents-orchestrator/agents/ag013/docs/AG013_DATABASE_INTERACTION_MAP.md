# AG-013 — Database Interaction Map v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-DATA-MAP-001`  

---

## 1. Mapa de Interacción con Base de Datos

```text
[CLIENTE / UI / CAPATAZ AG-001]
               │
               ▼
   [AG-013 ENGINE / AG-001 ORCHESTRATOR]
               │
    (Lecturas de Hechos y Contexto)
               ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tablas Maestras y Operativas de Solo Lectura:               │
 │  - cat_maquinas (Identidad, área, familia, criticidad)      │
 │  - eventos_agente / bitacora_ejecuciones_agente (Auditoría) │
 │  - ordenes_trabajo (Historial de intervenciones y cierres)   │
 │  - registro_fallas / paros (Historial de eventos de falla)  │
 │  - costos_mantenimiento (Hechos económicos autorizados)     │
 │  - memorias_tecnicas (Lecciones aprobadas AG-011)           │
 └─────────────────────────────────────────────────────────────┘
               │
               ▼
 [CÁLCULO DETERMINÍSTICO DE BAD ACTOR ON-DEMAND]
               │
               ▼
 [RETORNO DE PAQUETE ANALÍTICO AL DASHBOARD VIA AG-001]
 (Nuevas Tablas Funcionales Creadas en BD = 0)
```

---

## 2. Garantías de No Mutación

- `business_source_mutation = 0`: AG-013 no ejecuta `UPDATE`, `DELETE` ni `INSERT` sobre tablas de negocio (`cat_maquinas`, `ordenes_trabajo`, `costos_mantenimiento`).
- `new_AG013_tables = 0`: Clasificaciones y rankings se calculan analíticamente al vuelo o se emiten a través de la bitácora unificada de auditoría de agentes.
