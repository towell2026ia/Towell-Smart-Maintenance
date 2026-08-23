# AG-012 — Persistence Gap Analysis v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Análisis de Brecha de Persistencia

### Pregunta Fundamental:
¿Requiere `AG-012 — Reparar, Renovar o Reemplazar` nuevas tablas de persistencia en PostgreSQL / Supabase para operar en producción?

### Evaluación Técnica:
1. **Fuentes de Datos:** Consume fichas técnicas de `cat_maquinas` (M-010), scores de salud de M-011, tendencias de AG-008, RCA de AG-010, memorias de AG-011 y costos de AG-007.
2. **Cálculo de Decisión:** La matriz multicriterio y las hard rules se ejecutan como funciones determinísticas puras `ON DEMAND`.
3. **Auditoría y Trazabilidad:** La infraestructura general de auditoría de agentes registra las solicitudes y recomendaciones sin necesidad de tablas de negocio paralelas.

---

## 2. Decisión Arquitectónica Oficial

```text
================================================================================
DECISIÓN DE PERSISTENCIA AG-012:
NO_AG012_MIGRATION_REQUIRED
================================================================================
```

### Justificación:
- Cero tablas paralelas redundantes (`asset_decisions`, `replacement_plans`, `renewal_plans`).
- Cero migraciones SQL requeridas para AG-012.1.
- Persistencia de decisiones gerenciales delegada en los flujos administrativos existentes de la planta.
