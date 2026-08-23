# AG-013 — Architecture Gate Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture, Chronic Performance Model & Deterministic Classification Framework`  
**Versión:** `1.0`  
**Tipo:** Arquitectura de datos y marco determinístico de clasificación  
**Proveedor Semántico Previsto:** `Xiaomi MiMo` (`MiMo v2.5` sólo para interpretación en AG-013.3)  
**Autoridad de Clasificación:** `DETERMINISTIC ENGINE` (MiMo nunca clasifica ni cambia rankings)  
**Orquestador:** `AG-001 — Capataz`  
**Evento Canónico Oficial:** `BAD_ACTOR_ANALYSIS_REQUESTED`  
**Branch de Git:** `main`  
**Netlify develop:** `PAUSADO — NO DESPLEGAR`  
**Decisión de Persistencia:** `NO_AG013_MIGRATION_REQUIRED` (Nuevas tablas funcionales = 0)  
**Upstream Certificados:** `M010-1.0-FROZEN`, `M011-1.0-FROZEN`, `AG007-1.0-FROZEN`, `AG008-1.0-FROZEN`, `AG010-1.0-FROZEN`, `AG011-1.0-FROZEN`, `AG012-1.0-FROZEN`  
**Gate Emitido:** `AG013_ARCHITECTURE_GATE_PASS`  
**Token de Freeze Concedido:** `AG013-DATA-MAP-001`  
**Siguiente Subfase:** `AG-013.2 — Deterministic Bad Actor Classification Engine`  

---

## 1. Resumen Ejecutivo y Resultados de Evaluación

```text
================================================================================
📊 RESUMEN DE EVALUACIÓN ARQUITECTÓNICA AG-013.1:
   - Total Aserciones Evaluadas:   284 / 284 PASS (100.00%)
   - Aserciones Fallidas:          0
   - Dominio de Población y Pares: 26 / 26 PASS
   - Límites Upstream (M010..M013):76 / 76 PASS
   - Carga de Fallas y Cronicidad: 30 / 30 PASS
   - Carga Económica y Reparación: 26 / 26 PASS
   - Calidad de Datos y Clasificación: 32 / 32 PASS
   - Ranking y Trazabilidad 100%:  28 / 28 PASS
   - Temporalidad y No Fuga Futura:14 / 14 PASS
   - Gobernanza y Persistencia:    22 / 22 PASS
   - Documentación Formal (20 docs):20 / 20 PASS
================================================================================
🏆 VEREDICTO ARQUITECTÓNICO: AG013_ARCHITECTURE_GATE_PASS ✅
🔒 FREEZE CONCEDIDO: AG013-DATA-MAP-001
🚀 AUTORIZADO PARA AVANZAR A: AG-013.2 — Deterministic Bad Actor Classification Engine
```

---

## 2. Invariantes Críticos y Reglas Oficiales de AG-013

1. **Definición de Mal Actor:**
   $$\text{BAD ACTOR} = \text{SUSTAINED} + \text{MULTI-SIGNAL} + \text{TRACEABLE} + \text{TEMPORALLY CONSISTENT} + \text{MATERIAL POOR PERFORMANCE}$$
   - `BAD ACTOR ≠ ONE FAILURE`
   - `BAD ACTOR ≠ MACHINE WITH MOST FAILURES`
   - `BAD ACTOR ≠ HIGH COST ASSET`
   - `BAD ACTOR ≠ HIGH RISK / LOW HEALTH`
   - `BAD ACTOR ≠ AG-012 REPLACE` y `AG-012 REPLACE ≠ BAD ACTOR`
2. **Cronicidad vs Frecuencia:**
   - La persistencia multi-período y la reincidencia recurrente post-cierre de OT definen el comportamiento crónico.
3. **Manejo de Incertidumbre y Brechas:**
   - `UNKNOWN ≠ 0` (costos desconocidos no se convierten en cero).
   - `NO FAILURE DATA ≠ GOOD PERFORMANCE` (la falta de registros no asume máquina sana).
   - $\text{DSI} < 50\% \rightarrow \mathbf{INSUFFICIENT\_DATA}$ obligatorio (`forced_bad_actor_classification_with_insufficient_data = 0`).
4. **Límites de Contención Operativa:**
   - AG-013 no crea ni cierra OTs, no aprueba compras ni CAPEX, no retira activos ni genera análisis de causa raíz.
   - `business_source_mutation = 0` y `new_AG013_tables = 0` (`NO_AG013_MIGRATION_REQUIRED`).
5. **Autoridad Determinística Invariable:**
   - El motor determinístico calcula scores, reglas duras, clasificaciones y rankings.
   - Xiaomi MiMo (en AG-013.3) tendrá autoridad **exclusivamente explicativa e interpretativa**.

---

## 3. Catálogo de Documentación Arquitectónica (20 Entregables)

1. [`AG013_SOURCE_INVENTORY.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_SOURCE_INVENTORY.md)
2. [`AG013_DATABASE_INTERACTION_MAP.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_DATABASE_INTERACTION_MAP.md)
3. [`AG013_SOURCE_OF_TRUTH_MATRIX.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_SOURCE_OF_TRUTH_MATRIX.md)
4. [`AG013_DATA_AVAILABILITY_MATRIX.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_DATA_AVAILABILITY_MATRIX.md)
5. [`AG013_ASSET_POPULATION_MODEL.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_ASSET_POPULATION_MODEL.md)
6. [`AG013_PEER_GROUP_MODEL.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_PEER_GROUP_MODEL.md)
7. [`AG013_FAILURE_BURDEN_MODEL.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_FAILURE_BURDEN_MODEL.md)
8. [`AG013_CHRONICITY_MODEL.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_CHRONICITY_MODEL.md)
9. [`AG013_ECONOMIC_BURDEN_MODEL.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_ECONOMIC_BURDEN_MODEL.md)
10. [`AG013_INTERVENTION_EFFECTIVENESS_MODEL.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_INTERVENTION_EFFECTIVENESS_MODEL.md)
11. [`AG013_DATA_SUFFICIENCY_MODEL.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_DATA_SUFFICIENCY_MODEL.md)
12. [`AG013_BAD_ACTOR_CLASSIFICATION_MODEL.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_BAD_ACTOR_CLASSIFICATION_MODEL.md)
13. [`AG013_BAD_ACTOR_RANKING_MODEL.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_BAD_ACTOR_RANKING_MODEL.md)
14. [`AG013_BAD_ACTOR_MATRIX.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_BAD_ACTOR_MATRIX.md)
15. [`AG013_TEMPORAL_MODEL.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_TEMPORAL_MODEL.md)
16. [`AG013_TRACEABILITY_MODEL.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_TRACEABILITY_MODEL.md)
17. [`AG013_CONFLICT_MODEL.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_CONFLICT_MODEL.md)
18. [`AG013_BOUNDARY_MATRIX.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_BOUNDARY_MATRIX.md)
19. [`AG013_CONSUMER_MATRIX.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_CONSUMER_MATRIX.md)
20. [`AG013_PERSISTENCE_GAP_ANALYSIS.md`](file:///c:/Users/franh/OneDrive/Documentos/GuIA/Proyectos/TSMAI/app/supabase/functions/agents-orchestrator/agents/ag013/docs/AG013_PERSISTENCE_GAP_ANALYSIS.md)
