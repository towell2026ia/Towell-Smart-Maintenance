# AG-013 — Data Availability Matrix v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-DATA-MAP-001`  

---

## 1. Matriz de Disponibilidad y Estado de Datos

| Dimensión Analítica | Disponibilidad Típica | Manejo ante Ausencia / Indisponibilidad |
| :--- | :---: | :--- |
| **Identidad del Activo (`asset_id`)** | `OBLIGATORIO (100%)` | Rechazo inmediato de la solicitud (`AG013_INPUT_ERROR`). |
| **Conteo de Fallas y Recurrencia (AG-008)** | `ALTA` | La ausencia no implica buen rendimiento (`missing_failure_data_as_good = 0`). Se marca brecha de datos. |
| **Costos Recientes e Históricos (AG-007)** | `MEDIA / ALTA` | `UNKNOWN` no se convierte en cero (`unknown_cost_as_zero = 0`). |
| **Salud y Riesgo (M-011)** | `MEDIA` | Sin score de salud no se asume activo saludable (`no_history_as_healthy = 0`). |
| **Horas Operativas / Exposición** | `VARIABLE` | Si no existe horómetro confiable, se declara limitación sin inventar datos (`invented_operating_exposure = 0`). |
| **Memorias Técnicas (AG-011)** | `OPCIONAL` | Si no existen lecciones, se evalúa con las señales disponibles sin penalización. |
| **Estrategia Ciclo de Vida (AG-012)** | `OPCIONAL` | Contexto de soporte; no altera las reglas duras de mal actor. |

---

## 2. Principio de No Forzado

Cuando faltan datos críticos esenciales en múltiples dimensiones (`DSI < 50%`), AG-013 emite formalmente la clasificación determinística:
**`INSUFFICIENT_DATA`** (`forced_bad_actor_classification_with_insufficient_data = 0`).
