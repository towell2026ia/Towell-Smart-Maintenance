# M-013 — Database Interaction Map v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Mapeo de Interacciones de Control de Seguridad

```text
AG-001 / BACKEND ORCHESTRATOR
      ↓ (work_order_id, m012_package, evaluation_at, human_confirmations_raw)
[M-013 Safety Control Engine]
      ├── 1. VALIDATE M-012 Preparation Package (M012-1.0-FROZEN)
      ├── 2. SELECT ordenes_trabajo (WHERE id = work_order_id)
      ├── 3. SELECT cat_maquinas (WHERE codigo_maquina = asset_id)
      ├── 4. SELECT respuestas_checklist_orden (WHERE orden_id = work_order_id)
      ├── 5. SELECT bitacora_orden_trabajo (WHERE orden_id = work_order_id)
      └── 6. VALIDATE Human Confirmations (Server-Side Actor & Role Verification)
      ↓
[Safety Control Package + Blocking Decision] (100% Deterministic / On Demand)
```

---

## 2. Invariante de Consultas
- **Operaciones Permitidas:** `SELECT` y validación server-side.
- **Operaciones Prohibidas:** `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`.
- **Target:** `unauthorized_database_mutations = 0`.
