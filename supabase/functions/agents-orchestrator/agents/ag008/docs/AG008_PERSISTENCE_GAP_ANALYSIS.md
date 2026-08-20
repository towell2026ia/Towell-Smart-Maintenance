# AG-008 — Persistence Gap Analysis & Migration Decision v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad`  
**Token de Congelamiento:** `AG008-DATA-MAP-001`

---

## 1. Análisis de Persistencia

Se evaluó la estructura de base de datos existente en Supabase (`ordenes_trabajo`, `stg_telegram_ordenes_telares`, `fallas_por_maquina`, `levantamientos_mantenimiento`, `cat_maquinas`) para determinar si se requiere crear nuevas tablas para AG-008.

### Conclusiones del Análisis:
1. **Suficiencia de Esquema:** Las tablas existentes capturan con precisión:
   - Identidad de máquina (`cat_maquinas.equipo_towell`)
   - Departamentos (`departamento_codigo`)
   - Textos de fallas y observaciones técnicas
   - Fechas de ocurrencia, solicitud, ejecución y cierre
   - Estatus y clasificaciones de mantenimiento
2. **Modelo en Memoria / Vista Canónica:** El modelo `FailureEvent` opera como contrato canónico en memoria / runtime sin requerir tablas redundantes de duplicación.
3. **Persistencia de Alertas:** Las alertas generadas por AG-008 se integran al almacén central de alertas administrado por `AG-001 (Capataz)`.

---

## 2. Decisión Formal de Migración

```text
==============================================================================
               DECISIÓN: NO_AG008_MIGRATION_REQUIRED
==============================================================================
El esquema existente en Supabase es 100% suficiente para soportar la ingesta,
normalización, deduplicación y cálculo de series de fallas de AG-008.
Nuevas tablas requeridas: 0.
==============================================================================
```
