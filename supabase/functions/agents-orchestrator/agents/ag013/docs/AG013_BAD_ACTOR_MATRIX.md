# AG-013 — Bad Actor Decision Matrix v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-DATA-MAP-001`  

---

## 1. Ponderación Multicriterio de Malos Actores

El `bad_actor_score` ($0 - 100$) integra las dimensiones analíticas con pesos normalizados:

| Dimensión Analítica | Peso Oficial ($W_i$) | Componente Evaluado |
| :--- | :---: | :--- |
| **Cronicidad y Persistencia** | **`0.30`** | Persistencia multi-período y reincidencia post-reparación |
| **Carga y Densidad de Fallas** | **`0.25`** | Frecuencia en ventana, tasa de recurrencia y MTTR |
| **Carga Económica y Desvío** | **`0.20`** | Gasto en mantenimiento correctivo vs presupuesto y MCI |
| **Contexto de Salud y Riesgo** | **`0.15`** | Nivel de degradación en M-011 y riesgo operativo |
| **Ineficacia de Intervenciones** | **`0.10`** | Frecuencia de OTs repetitivas sin éxito duradero |
| **TOTAL** | **`1.00`** | |

$$\text{Bad Actor Score} = \sum_{i=1}^{5} (W_i \times S_i)$$

---

## 2. Reglas Duras de Decisión (Hard Rules):

- **`HR-01 (Datos Insuficientes):`** Si $\text{DSI} < 50\% \rightarrow \text{Clasificación} = \text{INSUFFICIENT_DATA}$.
- **`HR-02 (Falla Aislada en Activo Sano):`** Si Salud $\ge 80$, fallas en ventana $\le 2$ y cronicidad $= 0 \rightarrow \text{Clasificación} = \text{NOT_BAD_ACTOR}$.
- **`HR-03 (Degradación Crónica Severa):`** Si Cronicidad $\ge 80$, Reincidencia $> 0.40$ y Score $\ge 85 \rightarrow \text{Clasificación} = \text{SEVERE_BAD_ACTOR}$.

---

## 3. Invariantes de Ponderación:

- `hidden_bad_actor_weight = 0`: Todos los pesos son públicos y versionados.
- `hidden_bad_actor_threshold = 0`: Todos los umbrales de decisión están explícitamente declarados.
- `unregistered_bad_actor_hard_rule = 0`: No existen reglas duras implícitas.
