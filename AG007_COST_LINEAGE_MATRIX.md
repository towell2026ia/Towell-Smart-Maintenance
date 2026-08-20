# AG-007 — Cost Lineage & Traceability Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-007 — Presupuestos y Costos`  
**Subfase:** `AG-007.1 — Data & Architecture Map`  
**Freeze Token:** `AG007-COST-LINEAGE-001`  

---

## 1. Cadena de Linaje y Trazabilidad (Target: 100% Provenance)

Todo cálculo agregado, variación o alerta emitida por AG-007 debe permitir la navegación retrospectiva (*drill-down*) hasta la transacción original:

```text
[Nivel 1: Registro Crudo]
  stg_refacciones_por_maquina_excel | ordenes_trabajo | stg_telegram_ordenes_telares
                             │
                             ▼
[Nivel 2: Extracción y Sanitización]
  part_code, quantity, historical_unit_cost, date, machine_id, work_order_folio
                             │
                             ▼
[Nivel 3: Construcción del Evento Económico Inmutable]
  Canonical EconomicEvent (ID único: ECO-{hash}, currency: MXN)
                             │
                             ▼
[Nivel 4: Agregación Periódica]
  Weekly (YYYY-Www) | Monthly (YYYY-MM) | Annual (YYYY) por Dept / Máquina
                             │
                             ▼
[Nivel 5: Comparativa vs Presupuesto Plan]
  Variance Calculation: variance = actual_spend - planned_budget
                             │
                             ▼
[Nivel 6: Detección y Persistencia de Alerta]
  alertas_sistema (tipo_alerta: BUDGET_EXCEEDED, machine_id, audit_trace)
```

---

## 2. Matriz de Linaje por Atributo Económico

| Atributo Económico | Origen del Dato | Transformación / Normalización | Destino en `EconomicEvent` | Trazabilidad |
| :--- | :--- | :--- | :--- | :---: |
| **Fecha de la Transacción** | `stg_refacciones_por_maquina_excel.fecha` o `ordenes_trabajo.fecha_inicio` | ISO `YYYY-MM-DD` | `event.date`, `event.period` | 100% |
| **Identificador de Máquina** | `maquina_id`, `ax`, `destino` | Resolución canónica vía `cat_maquinas` | `event.machine_id` | 100% |
| **Departamento** | `cat_maquinas.departamento_codigo` o `ordenes_trabajo.departamento` | Normalizado a `PF`, `CF`, `TF`, `AF` | `event.department` | 100% |
| **Código de Refacción** | `codigo_articulo` | Limpieza de espacios y mayúsculas | `event.part_code` | 100% |
| **Cantidad Consumida** | `cantidad_estandar` | `parseFloat(cant) || 0` | `event.quantity` | 100% |
| **Costo Unitario Histórico**| `precio_costo_unitario` | Preservación del valor histórico de la transacción | `event.unit_cost` | 100% |
| **Importe Total Calculado** | `cantidad × unit_cost` | `Math.round(cant * unit_cost * 100) / 100` | `event.total_amount` | 100% |
| **Importe Reportado Origen**| `importe_costo_origen` | Preservado para auditoría de discrepancias | `event.reported_total` | 100% |
| **Tipo de Mantenimiento** | `ordenes_trabajo.tipo_orden` o inferencia de fuente | `PREVENTIVO`, `CORRECTIVO`, `AUTONOMO`, `PREDICTIVO` | `event.maintenance_type` | 100% |
| **Folio / Referencia OT** | `orden_trabajo`, `folio` | String alfanumérico limpio | `event.work_order_folio` | 100% |
| **Hash de Idempotencia** | `hash(source_table, id_stg, date, part_code, cant)` | SHA-256 canonical hash | `event.idempotency_hash` | 100% |

---

## 3. Estrategia de Anti-Duplicidad y Deduplicación
Si un mismo movimiento de refacciones o paro aparece simultáneamente en un archivo Excel importado, en una OT del sistema y en la bitácora técnica:
1. La llave canónica de deduplicación se compone de:
   $$\text{Key} = \text{SourceTable} + \text{SourceRecordID} + \text{Date} + \text{MachineID} + \text{PartCode} + \text{Amount}$$
2. Si dos fuentes describen la misma OT y misma pieza consumida, se aplica la regla de precedencia autoritativa:
   $$\text{Ordenes de Trabajo (Cerradas)} > \text{Bitácora Técnica} > \text{Staging Excel}$$
3. Cada transacción económica se contabiliza **exactamente una sola vez** en los agregados de gasto.
