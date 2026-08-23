# AG-013 — Bad Actor Classification Model v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-BAD-ACTOR-CLASSIFICATION-001`  

---

## 1. Catálogo Cerrado de Clasificación de Malos Actores

AG-013 emite exclusivamente una de las siguientes cinco clasificaciones oficiales:

| Código de Clasificación | Definición Operativa | Criterio Determinístico Principal |
| :--- | :--- | :--- |
| **`NOT_BAD_ACTOR`** | Activo con desempeño normal, fallas aisladas o dentro de los umbrales esperados de su grupo de pares. | Score de mal actor bajo ($< 40$) y sin señales de cronicidad. |
| **`WATCHLIST`** | Activo con anomalías emergentes o señales parciales de degradación que ameritan vigilancia preventiva. | Score medio ($40 \le \text{Score} < 65$) o reincidencia incipiente. |
| **`BAD_ACTOR`** | Activo con patrón sostenido, material y crónico de mal desempeño confirmado en múltiples dimensiones. | Score alto ($65 \le \text{Score} < 85$) con cronicidad multi-período y recurrencia. |
| **`SEVERE_BAD_ACTOR`** | Mal actor crítico con impacto operativo y económico severo e intervenciones reiteradas ineficaces. | Score crítico ($\ge 85$), persistencia crónica sostenida y alto impacto económico/fallas. |
| **`INSUFFICIENT_DATA`** | Brecha grave de información que impide clasificar responsablemente al activo. | $\text{DSI} < 50\%$ o ausencia de dimensiones críticas obligatorias. |

---

## 2. Invariantes de Clasificación

- **Autoridad Determinística:** La clasificación es calculada estrictamente por el motor determinístico de AG-013; Xiaomi MiMo no puede cambiarla ni reclasificar (`semantic_bad_actor_classification_override = 0`).
- **Principio Multi-Señal:** La clasificación `BAD_ACTOR` requiere la concurrencia de al menos dos señales independientes (e.g., cronicidad + carga de fallas o cronicidad + desvío económico).
