# AG-012 — Data Availability Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Matriz de Disponibilidad y Calidad de Datos

| Factor / Variable | Estado cuando existe | Estado cuando no existe / es nulo | Impacto en Suficiencia de Datos |
| :--- | :--- | :--- | :--- |
| **Costo Acumulado Mantenimiento** | `AVAILABLE` (con moneda y periodo) | `UNKNOWN_COST` | Penaliza completitud (`unknown_cost != 0`) |
| **Estimación Costo de Reemplazo** | `AVAILABLE` (fuente autorizada) | `NOT_AVAILABLE` | Si es obligatorio -> `INSUFFICIENT_DATA` |
| **Edad del Activo / Horas Uso** | `AVAILABLE` (fecha instalación) | `UNKNOWN_AGE` | No se asume ni nuevo ni viejo (`unknown_age != old/new`) |
| **MTBF / Tasa de Fallas Recurrente**| `AVAILABLE` (desde AG-008) | `NOT_APPLICABLE` (si es activo nuevo)| Aceptable con advertencia de muestra reducida |
| **Causa Raíz Confirmada** | `AVAILABLE` (aprobada por humano) | `HYPOTHESIS_ONLY` / `MISSING` | Solo se pondera como hipótesis, no como certeza |
| **Disponibilidad de Refacciones** | `AVAILABLE` (catálogo y stock) | `UNKNOWN_AVAILABILITY` | No se asume obsoleta (`stock_zero != obsolete`) |

---

## 2. Invariante de Calidad
- `forced_recommendation_with_insufficient_data = 0`.
- Datos desconocidos se registran como `UNKNOWN` y reducen el índice de completitud y confianza.
