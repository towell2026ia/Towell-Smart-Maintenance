# M-010 — Persistence Gap Analysis & Decision v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-010 — Expediente Único del Activo`  
**Token de Freeze:** `M010-DATA-MAP-001`  

---

## 1. Análisis de Brecha de Persistencia

Se evaluó la necesidad de crear tablas adicionales en PostgreSQL para soportar el Expediente Único del Activo:
- **Catálogo de Máquinas:** Ya existe en `public.cat_maquinas`.
- **Órdenes de Trabajo:** Ya existen en `public.ordenes_trabajo`.
- **Bitácoras:** Ya existen en `public.bitacora_orden_trabajo`.
- **Levantamientos y Checklists:** Ya existen en `public.levantamientos_mantenimiento` y `public.respuestas_checklist_*`.
- **Calendarios:** Ya existen en `public.calendario_*`.
- **Refacciones:** Ya existen en `public.refacciones_utilizadas`.

Crear una tabla duplicada `expediente_activo` introduciría duplicidad innecesaria, riesgo de desincronización y overhead transaccional.

---

## 2. Decisión Formal de Persistencia

```text
==============================================================================
               DECISIÓN: NO_M010_MIGRATION_REQUIRED
==============================================================================
El esquema actual de Supabase satisface el 100% de los requerimientos
de consolidación y consulta 360° del activo.
==============================================================================
```
