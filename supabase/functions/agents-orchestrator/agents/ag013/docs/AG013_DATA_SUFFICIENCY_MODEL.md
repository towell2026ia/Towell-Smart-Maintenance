# AG-013 — Data Sufficiency Model v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-DATA-QUALITY-001` / `AG013-ELIGIBILITY-001`  

---

## 1. Modelo de Suficiencia y Elegibilidad de Datos

Antes de aplicar cualquier cálculo de puntuación o clasificación, AG-013 evalúa la completitud y calidad de las señales disponibles.

### 2. Dimensiones Críticas Requeridas:
1. `ASSET_IDENTITY`: Identidad válida en `cat_maquinas`.
2. `FAILURE_DATA`: Historial de fallas o confirmación explícita de 0 eventos en la ventana (AG-008).
3. `ECONOMIC_DATA`: Historial de costos o reporte de costos no disponibles (AG-007).
4. `HEALTH_RISK_DATA`: Nivel de salud/riesgo o estado de evaluación (M-011).

---

## 3. Índice de Suficiencia de Datos (DSI):

$$\text{DSI} = \left( \frac{\text{Número de Dimensiones Certificadas Presentes}}{\text{Total Dimensiones Críticas}} \right) \times 100$$

### Niveles de Suficiencia:
- **`HIGH` ($DSI \ge 75\%$):** Información robusta para clasificar y rankear con alta certidumbre.
- **`MODERATE` ($50\% \le DSI < 75\%$):** Información suficiente para clasificación preliminar con señalamiento de brechas.
- **`INSUFFICIENT` ($DSI < 50\%$):** Bloqueo de clasificación operativa $\rightarrow$ Emisión obligatoria de `INSUFFICIENT_DATA`.

---

## 4. Invariantes de Calidad de Datos:

- `missing_failure_data_as_good = 0`: La falta de registros de fallas no se interpreta como rendimiento excelente si no hay telemetría u horas reportadas.
- `no_history_as_healthy = 0`: Un activo sin historial registrado no se clasifica como saludable por defecto.
- `forced_bad_actor_classification_with_insufficient_data = 0`: Prohibido emitir `BAD_ACTOR` o `NOT_BAD_ACTOR` cuando los datos no alcanzan el umbral mínimo de elegibilidad.
