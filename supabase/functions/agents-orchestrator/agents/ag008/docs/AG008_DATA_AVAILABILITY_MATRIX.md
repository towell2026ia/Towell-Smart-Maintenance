# AG-008 — Data Availability & Quality Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad`  
**Token de Congelamiento:** `AG008-DATA-MAP-001`

---

## 1. Matriz de Disponibilidad y Calidad de Datos

| Dimensión Analítica | Disponibilidad | Nivel de Calidad | Limitación / Tratamiento | Estado para AG-008.2 |
| :--- | :---: | :---: | :--- | :---: |
| **Identidad de Máquina** | 100% | `RELIABLE` | Resuelta contra `cat_maquinas`. | `READY` |
| **Fecha de Ocurrencia** | 98% | `RELIABLE` | Formato ISO 8601 (YYYY-MM-DD). | `READY` |
| **Hora y Turno** | 75% | `PARTIAL` | Disponible en Telegram/OTs recientes. Si falta, se asigna `time: null`. | `PARTIAL_READY` |
| **Texto de Falla Crudo** | 100% | `RELIABLE` | 100% conservado en `failure_raw`. | `READY` |
| **Categoría Técnica** | 60% | `PARTIAL` | Depende del catálogo de fallas. Se normaliza por texto canónico. | `USABLE_WITH_NORMALIZATION` |
| **Series Diarias/Semanales** | 100% | `RELIABLE` | Agrupación temporal determinística. | `READY` |
| **Histórico para Tendencia** | 100% | `RELIABLE` | Histórico disponible $\ge$ 6 meses. | `READY` |
| **Histórico para Estacionalidad** | Limitado (<24 meses) | `PARTIAL` | Se declara `INSUFFICIENT_HISTORY_FOR_SEASONALITY` cuando aplique. | `NOT_READY_SEASONALITY` |
| **Horas de Operación / MTBF** | Incompleto | `UNAVAILABLE` | Se declara `MTBF_NOT_SUPPORTED_WITH_CURRENT_DATA`. | `NOT_READY_MTBF` |

---

## 2. Declaraciones Explícitas de Calidad

- **Invariante de Calidad:** Si faltan horas de operación exactas o ciclos de máquina, el motor reportará frecuencias brutas (`failure_count / period`) y nunca calculará un MTBF artificial.
- **Invariante de Estacionalidad:** Si el histórico disponible para un modo de falla es menor a 12 meses, se reportará `seasonality_status = 'INSUFFICIENT_HISTORY'` en lugar de forzar patrones estacionales inexistentes.
