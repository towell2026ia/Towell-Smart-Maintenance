# M-010 — Database Interaction Map v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-010 — Expediente Único del Activo`  
**Token de Freeze:** `M010-DATA-MAP-001`  

---

## 1. Mapeo de Interacciones de Base de Datos

```text
M-010 (Expediente Único del Activo)
│
├── [READ] cat_maquinas
│     └── Recupera identidad, departamento, criticidad, estatus y serie.
│
├── [READ] ordenes_trabajo
│     └── WHERE maquina_id = :asset_id (OTs correctivas, preventivas, predictivas).
│
├── [READ] bitacora_orden_trabajo
│     └── WHERE orden_id IN (OTs de la máquina) -> Notas técnicas y cambios de estatus.
│
├── [READ] respuestas_checklist_orden
│     └── WHERE orden_id IN (OTs de la máquina) -> Respuestas de checklists ejecutados.
│
├── [READ] levantamientos_mantenimiento
│     └── WHERE maquina_id = :asset_id -> Historial de inspecciones predictivas/autónomas.
│
├── [READ] calendario_preventivo_anual / predictivo / autonomo
│     └── WHERE maquina_id = :asset_id -> Planes y cumplimiento de calendarios.
│
├── [READ] refacciones_utilizadas
│     └── WHERE orden_id IN (OTs de la máquina) -> Repuestos reales consumidos.
│
└── [READ] Alertas de Mantenimiento (AG-008 / AG-007)
      └── WHERE target_id = :asset_id -> Alertas de recurrencia, tendencia y sobrecostos.
```

---

## 2. Invariante de Cero Mutación (`source_mutations = 0`)
M-010 ejecuta exclusivamente operaciones `SELECT`. No realiza `INSERT`, `UPDATE` o `DELETE` sobre las tablas operativas de mantenimiento.
