# AG-007 / AG-002 — Cost Boundary & Anti-Duplication Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agentes:** `AG-002 — Preventivo Anual` vs `AG-007 — Presupuestos y Costos`  
**Subfase:** `AG-007.1 — Data & Architecture Map`  
**Freeze Token:** `AG007-AG002-BOUNDARY-001`  

---

## 1. Frontera de Responsabilidad y Autoridad

| Operación / Cálculo Económico | Autoridad Primaria | Rol de AG-002 | Rol de AG-007 |
| :--- | :---: | :--- | :--- |
| **Estimación de Refacciones Necesarias para Preventivo** | `AG-002` | **Calcula** según catálogo de servicios y piezas estándar | Ninguno |
| **Cálculo del Presupuesto Planificado Preventivo Anual** | `AG-002` | **Genera** `annual_budget_cost` y presupuestos semanales/mensuales | **Consume** como `PLANNED_PREVENTIVE_COST` |
| **Consolidación del Gasto Global de la Planta** | `AG-007` | Ninguno | **Consolida** Preventivo + Correctivo + Autónomo + Predictivo |
| **Comparativa Presupuesto Plan vs Gasto Real (Variance)** | `AG-007` | Ninguno | **Calcula** $Variación = Gasto Real - Presupuesto$ |
| **Seguimiento del Gasto Real en Correctivos** | `AG-007` | Ninguno | **Consolida** piezas y órdenes de fallas imprevistas |
| **Seguimiento de Refacciones en Mantenimiento Autónomo** | `AG-007` | Ninguno | **Consolida** insumos y materiales usados por operadores |
| **Detección de Tendencias y Proyección de Gasto (Forecast)**| `AG-007` | Ninguno | **Calcula** proyección a cierre de mes / año |
| **Generación de Alertas de Desviación Presupuestal** | `AG-007` | Ninguno | **Dispara** alertas `BUDGET_WARNING`, `BUDGET_EXCEEDED` |

---

## 2. Diagrama de Flujo y Anti-Duplicidad

```text
       ┌────────────────────────────────────────────────────────┐
       │                AG-002 (PREVENTIVO ANUAL)               │
       │  Genera: Plan Anual de Slots + Refacciones Planificadas│
       │  Output: BudgetSummary (known_cost, weekly, monthly)   │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   │ [Entrada inmutable de Planeación]
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             AG-007 (PRESUPUESTOS Y COSTOS)             │
       │                                                        │
       │  ┌──────────────────┐            ┌──────────────────┐  │
       │  │  PLANNED_COST    │            │   ACTUAL_COST    │  │
       │  │  (Desde AG-002)  │    VS      │(Consumos reales) │  │
       │  └────────┬─────────┘            └────────┬─────────┘  │
       │           │                               │            │
       │           └───────────────┬───────────────┘            │
       │                           ▼                            │
       │            VARIANCE & SPEND ACCRUAL ENGINE             │
       │        (variance = actual_spend - planned_budget)      │
       │                           │                            │
       │                           ▼                            │
       │               SISTEMA DE ALERTAS (AG-001)              │
       └────────────────────────────────────────────────────────┘
```

---

## 3. Invariantes de Frontera

1. **AG-007 no recalcula el presupuesto preventivo:** Acepta el `BudgetSummary` emitido por AG-002 como la fuente autoritativa del plan preventivo.
2. **Cero Doble Contabilización:** Un gasto consumido en una OT preventiva se compara contra la ranura preventiva correspondiente de AG-002 sin sumarlo dos veces como plan y como correctivo.
3. **Aislamiento Contable de Correctivos:** Todo costo originado en Telegram, fallas de operador o paros imprevistos se clasifica bajo `maintenance_type = 'CORRECTIVO'`, sin contaminar la bolsa de planeación preventiva.
