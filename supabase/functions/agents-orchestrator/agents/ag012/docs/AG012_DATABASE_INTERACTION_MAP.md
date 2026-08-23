# AG-012 — Database Interaction Map v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Mapeo de Interacciones para Estrategia de Activos

```text
AG-001 / SUPER ADMINISTRATOR UI
      ↓ (asset_id, decision_context, evaluation_at)
[AG-012 Intervention Strategy Engine]
      ├── 1. SELECT M-010 Asset360 Context (WHERE asset_id = target)
      ├── 2. SELECT M-011 Health/Risk Context (WHERE asset_id = target)
      ├── 3. SELECT AG-008 Reliability Metrics (WHERE asset_id = target)
      ├── 4. SELECT AG-010 Root Cause History (WHERE asset_id = target)
      ├── 5. SELECT AG-011 Approved Technical Memories (WHERE asset_id = target)
      ├── 6. SELECT AG-007 Economic Facts & Cost History (WHERE asset_id = target)
      ├── 7. NORMALIZE Decision Facts & Check Data Sufficiency
      ├── 8. EVALUATE Hard Rules & Multi-Criteria Decision Matrix (DETERMINISTIC)
      └── 9. GENERATE Semantic Explanation via Xiaomi MiMo v2.5 (EXPLANATION ONLY)
      ↓
[Intervention Recommendation Package] (REPAIR | RENEW | REPLACE | INSUFFICIENT_DATA)
```

---

## 2. Invariante de Consultas
- **Operaciones Permitidas:** `SELECT` y validación server-side.
- **Operaciones Prohibidas:** `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER` sobre activos, órdenes de trabajo, compras o presupuestos.
- **Target:** `unauthorized_database_mutations = 0`.
