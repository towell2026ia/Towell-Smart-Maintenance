# AG-012 — Decision Matrix & Hard Rules v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Matriz de Ponderación Multicriterio Determinística

La recomendación oficial se obtiene a través de un motor determinístico con pesos explícitos que suman 100%:

| Dimensión de Decisión | Peso Relativo | Variables Clave |
| :--- | :---: | :--- |
| **1. Estado de Confiabilidad y Fallas** | 25% | Health Score (M-011), MTBF (AG-008), Recurrencia (AG-008). |
| **2. Carga Económica de Mantenimiento** | 25% | Costo reciente vs costo de reemplazo (AG-007), costo histórico. |
| **3. Viabilidad Técnica y Reparabilidad** | 20% | Existencia de procedimientos certificados (AG-011), causa raíz (AG-010). |
| **4. Mantenibilidad y Soporte** | 15% | Disponibilidad de refacciones, MTTR, complejidad de servicio. |
| **5. Obsolescencia y Ciclo de Vida** | 15% | Soporte de fabricante, disponibilidad de repuestos en mercado. |

---

## 2. Reglas Duras (Hard Rules / Pre-Gates)

Antes de ponderar la matriz, se evalúan reglas duras determinísticas:

1. **`HR-01` (Falta de Datos Críticos):** Si faltan tanto los datos de costo como los datos de confiabilidad del activo -> Emite `INSUFFICIENT_DATA`.
2. **`HR-02` (Falla Aislada en Activo Sano):** Si Health $\ge 80$, Fallas en 12m $\le 2$ y Costo $\le 10\%$ del activo -> Recomienda directamente `REPAIR`.
3. **`HR-03` (Degradación Irreversible y Obsolescencia Total):** Si Obsolescencia = CRITICAL, Soporte = EOL, y Costo Mantenimiento $\ge 70\%$ del valor de reposición -> Recomienda `REPLACE`.
4. **`HR-04` (Estructura Sana con Subsistemas Agotados):** Si Estructura = BUENA, pero Electrónica/Motores = DEGRADADOS y Costo Renovación $\le 40\%$ de Activo Nuevo -> Recomienda `RENEW`.

---

## 3. Invariante de Decisión
- `hidden_decision_weight = 0`.
- `unregistered_hard_decision_rule = 0`.
- `MiMo cannot alter scores, weights, or the final recommendation`.
