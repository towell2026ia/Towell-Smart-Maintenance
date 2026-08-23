# AG-013 — Asset Population Model v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-ASSET-POPULATION-001`  

---

## 1. Definición de Población de Activos Válida

AG-013 evalúa poblaciones cerradas de activos mantenibles para evitar comparaciones distorsionadas.

### Criterios de Elegibilidad Poblacional:
1. **Activo en Catálogo Activo:** El activo debe existir en `cat_maquinas` con `activo = true` o haber tenido intervenciones en la ventana de análisis.
2. **Naturaleza Mantenible:** Equipos productivos o de servicios industriales de planta (excluyendo activos puramente administrativos salvo solicitud explícita de sub-población).
3. **Identidad Estable:** Uso exclusivo de `asset_id` canónico (`wrong_asset_bad_actor_classification = 0`).

---

## 2. Invariante de Comparabilidad

- **No Mezcla Heterogénea:** No se compara un telar de toallas de alta criticidad en producción continua contra un equipo utilitario auxiliar con el mismo umbral absoluto sin normalización o agrupación.
- **Poblaciones Soportadas:**
  - `PLANT_WIDE`: Vista global de planta (con ranking segmentado por área/familia).
  - `AREA_SPECIFIC`: Población acotada a una zona de proceso (e.g., `TEJIDO`, `TINTORERIA`, `ACABADOS`).
  - `FAMILY_SPECIFIC`: Población acotada a un mismo modelo o familia tecnológica (e.g., `TELARES_TERRY`).
