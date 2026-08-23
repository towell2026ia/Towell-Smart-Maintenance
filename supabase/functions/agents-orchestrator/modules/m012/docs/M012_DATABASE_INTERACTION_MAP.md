# M-012 — Database Interaction Map v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Mapeo de Interacciones con la Base de Datos

```text
CLIENTE / AG-001
      ↓ (work_order_id, evaluation_at)
[M-012 Engine]
      ├── 1. SELECT ordenes_trabajo (WHERE id = work_order_id)
      ├── 2. SELECT cat_maquinas (WHERE codigo_maquina = maquina_id)
      ├── 3. CALL M-010 Asset360 (asset_id) [Read-Only Context]
      ├── 4. CALL M-011 Health/Risk (asset_id) [Read-Only Score]
      ├── 5. CALL AG-011 Retrieval (asset_id, machine_model, problem_statement) [Top-5 Verified]
      ├── 6. SELECT respuestas_checklist_orden (WHERE orden_id = work_order_id)
      └── 7. SELECT refacciones_utilizadas / planificadas
      ↓
[OT Preparation Package + Readiness Result] (100% Deterministic / On Demand)
```

---

## 2. Invariante de Consultas
- **Operaciones Permitidas:** `SELECT` únicamente.
- **Operaciones Prohibidas:** `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`.
- **Target:** `unauthorized_database_mutations = 0`.
