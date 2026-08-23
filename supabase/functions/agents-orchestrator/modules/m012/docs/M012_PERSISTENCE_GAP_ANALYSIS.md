# M-012 — Persistence Gap Analysis v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Análisis de Brecha de Persistencia

### Pregunta Fundamental:
¿Requiere `M-012 — Preparación de la OT` nuevas tablas de persistencia en PostgreSQL / Supabase para operar en producción?

### Evaluación de Opciones:
1. **Opción A (Creación de tablas dedicadas `ot_preparation`, `ot_resources`, `ot_tools`):**
   - *Desventajas:* Duplicación innecesaria de datos que ya residen en `ordenes_trabajo`, `cat_maquinas`, `refacciones_utilizadas`, `respuestas_checklist_orden` y `memorias_tecnicas`. Riesgo de desincronización y mutación no autorizada de OTs.
2. **Opción B (Servicio Determinístico On-Demand / Read-Only Aggregation):**
   - *Ventajas:* Máxima fidelidad con las fuentes de verdad vivas, cero redundancia, reproducibilidad matemática total con `evaluation_at`, latencia sub-milisegundo en Edge Functions.

---

## 2. Decisión Arquitectónica Oficial

```text
================================================================================
DECISIÓN DE PERSISTENCIA M-012:
NO_M012_MIGRATION_REQUIRED
================================================================================
```

### Justificación:
- Todas las fuentes requeridas (`ordenes_trabajo`, `cat_maquinas`, `M-010`, `M-011`, `AG-011`, `refacciones_utilizadas`, `respuestas_checklist_orden`) ya cuentan con persistencia inmutable y RLS en Supabase.
- El paquete de preparación y el cálculo de readiness son funciones puras determinísticas calculadas `ON DEMAND`.
- Por tanto, se adopta formalmente la política **`NO_M012_MIGRATION_REQUIRED`**.
