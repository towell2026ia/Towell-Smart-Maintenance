# M-010 — Entity Relationship Map v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-010 — Expediente Único del Activo`  
**Token de Freeze:** `M010-DATA-MAP-001`  

---

## 1. Diagrama de Relaciones de Entidad para el Activo

```text
cat_maquinas (asset_id / codigo_maquina)
│
├── [1:N DIRECT_FK] ordenes_trabajo (maquina_id)
│     ├── [1:N DIRECT_FK] bitacora_orden_trabajo (orden_id)
│     ├── [1:N DIRECT_FK] respuestas_checklist_orden (orden_id)
│     └── [1:N DIRECT_FK] refacciones_utilizadas (orden_id)
│
├── [1:N DIRECT_FK] levantamientos_mantenimiento (maquina_id)
│     ├── [1:N DIRECT_FK] respuestas_checklist_predictivo (levantamiento_id)
│     └── [1:N DIRECT_FK] respuestas_checklist_autonomo (levantamiento_id)
│
├── [1:N DIRECT_FK] calendario_preventivo_anual (maquina_id)
├── [1:N DIRECT_FK] calendario_predictivo_semanal (maquina_id)
├── [1:N DIRECT_FK] calendario_autonomo_semanal (maquina_id)
│
├── [1:N SOURCE_ID_LINK] stg_telegram_ordenes_telares (id_telar)
│
└── [1:N MACHINE_ID_LINK] Alertas Técnicas / AG-008 (target_id)
```

---

## 2. Tipos de Vínculos Trazables
1. **`DIRECT_FK`**: Llave foránea directa en base de datos (`maquina_id = cat_maquinas.codigo_maquina` u `orden_id = ordenes_trabajo.id`).
2. **`MACHINE_ID_LINK`**: Vínculo canónico exacto por código de máquina certificado.
3. **`SOURCE_ID_LINK`**: Vínculo de staging mediante identificador de activo.
4. **`DERIVED`**: Relación inferida por reglas matemáticas explícitas (e.g. vinculación temporal de Telegram a OT). Cero relaciones "fuzzy" por texto parecido.
