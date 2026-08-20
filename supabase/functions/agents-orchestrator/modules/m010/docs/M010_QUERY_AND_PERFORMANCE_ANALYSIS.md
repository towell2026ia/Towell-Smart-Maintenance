# M-010 — Query & Performance Analysis v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-010 — Expediente Único del Activo`  
**Token de Freeze:** `M010-DATA-MAP-001`  

---

## 1. Análisis de Consultas y Prevención de N+1

1. **Estrategia Server-Side:** La agregación del Expediente 360 se realiza en Edge Functions / Deno en un solo pipeline de consulta estructurado por activo.
2. **Índices de Llave de Máquina:**
   - `ordenes_trabajo(maquina_id)`
   - `levantamientos_mantenimiento(maquina_id)`
   - `calendario_preventivo_anual(maquina_id)`
   - `stg_telegram_ordenes_telares(id_telar)`
3. **Paginación y Limitación:** Se imponen límites por defecto (`limit = 50`) en listados de órdenes históricas y eventos de línea de tiempo para prevenir explosión de memoria en activos de alta longevidad.
4. **Resumen vs Detalle:** Se soporta `AssetSummary` (metadatos + últimos eventos) para cargas rápidas en dashboard, y `Asset360` completo bajo demanda.
