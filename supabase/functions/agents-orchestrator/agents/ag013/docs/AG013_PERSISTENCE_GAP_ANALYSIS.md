# AG-013 — Persistence Gap Analysis & Decision v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-DATA-MAP-001`  

---

## 1. Análisis de Brecha de Persistencia (Persistence Gap Analysis)

### Pregunta Arquitectónica:
¿Se requiere crear tablas funcionales dedicadas en Supabase (e.g. `bad_actors`, `bad_actor_history`, `bad_actor_scores`) para soportar AG-013?

### Evaluación de Requerimientos:
1. **Naturaleza Analítica On-Demand:** El cálculo de Malos Actores es una agregación determinística multicriterio basada en el corte temporal `evaluation_at`.
2. **Reproducibilidad Matemática:** Con los datos maestros existentes en `cat_maquinas`, `registro_fallas`, `ordenes_trabajo` y `costos_mantenimiento`, cualquier snapshot analítico se reproduce de manera exacta sin necesidad de duplicación de almacenamiento.
3. **Auditoría Centralizada Existente:** La infraestructura de gobernanza (`eventos_agente` y `bitacora_ejecuciones_agente`) ya registra payloads, tokens, latencias y resultados de ejecución.

---

## 2. Decisión Formal de Persistencia

$$\mathbf{NO\_AG013\_MIGRATION\_REQUIRED}$$

- **Nuevas Tablas Funcionales:** `0`
- **Impacto en Esquema:** Cero cambios funcionales en base de datos.
- **Promoción:** Al igual que en agentes previos, únicamente se utilizará una migración de gobernanza para registrar/activar el agente y sus eventos en `cat_agentes` y `cat_eventos_agente` en la fase final.
