# AG-007 — Database Interaction Map v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-007 — Presupuestos y Costos`  
**Subfase:** `AG-007.1 — Data & Architecture Map`  
**Freeze Token:** `AG007-DATA-MAP-001`  
**Tipo:** Arquitectura de Datos, Fuentes de Verdad y Ciclo de Vida Económico  

---

## 1. Arquitectura de Interacción con Supabase

```text
                               ┌──────────────────────────────────────────────┐
                               │                   AG-002                     │
                               │      PREVENTIVE PLANNED PARTS BUDGET         │
                               │    (weekly_budget / monthly_budget / annual) │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                                      ▼ [Consumo de Plan]
┌─────────────────────────────────────────┐     ┌─────────────────────────────┐
│               SUPABASE DB               │     │    AG-007 COST NORMALIZER   │
├─────────────────────────────────────────┤     ├─────────────────────────────┤
│ 1. cat_refacciones (3,869 refacciones)  ├────►│ Normalización de Moneda MXN │
│ 2. stg_refacciones_por_maquina_excel    ├────►│ Resolución de Máquina / Dept│
│ 3. ordenes_trabajo (Correctivos/Prevent)├────►│ Clasificación de Origen     │
│ 4. stg_telegram_ordenes_telares         ├────►│ Protección Precio Histórico │
│ 5. bitacora_mantenimiento (1,830 bitác.)├────►│ Manejo de Horas y Paros     │
│ 6. cat_maquinas (135 máquinas / telares)├────►│ Extracción Fecha Contable   │
│ 7. cat_departamentos (PF, CF, TF, AF)   ├────►│ Idempotencia de Transacción │
│ 8. alertas_sistema (Persistencia Alerta)│◄────┴──────────────┬──────────────┘
└─────────────────────────────────────────┘                    │
                                                               ▼
                                                ┌─────────────────────────────┐
                                                │    ECONOMIC EVENT BUILDER   │
                                                │   Canonical EconomicEvent   │
                                                └──────────────┬──────────────┘
                                                               │
                                         ┌─────────────────────┼─────────────────────┐
                                         ▼                     ▼                     ▼
                                   [PLANNED_COST]        [ACTUAL_COST]        [COMMITTED_COST]
                                  (Fuente: AG-002)     (Consumos / OTs)      (OTs en Proceso)
                                         │                     │                     │
                                         └─────────────────────┼─────────────────────┘
                                                               │
                                                               ▼
                                                ┌─────────────────────────────┐
                                                │       VARIANCE ENGINE       │
                                                │     [Fase AG-007.2 Core]    │
                                                │    variance = actual - plan │
                                                └──────────────┬──────────────┘
                                                               │
                                                               ▼
                                                ┌─────────────────────────────┐
                                                │     ALERT TRIGGER ENGINE    │
                                                │  BUDGET_WARNING / EXCEEDED  │
                                                └──────────────┬──────────────┘
                                                               │
                                                               ▼ [Delegación vía Orquestador]
                                                ┌─────────────────────────────┐
                                                │     AG-001 ORQUESTADOR      │
                                                │  (Auditoría & Despacho UI)  │
                                                └──────────────┬──────────────┘
                                                               │
                                                               ▼
                                                ┌─────────────────────────────┐
                                                │      ALERTAS DEL SISTEMA    │
                                                │     (UI Dashboard / PWA)    │
                                                └─────────────────────────────┘
```

---

## 2. Inventario de Fuentes en Base de Datos

| Tabla / Vista Supabase | Registros Existentes | Columnas Clave Mapeadas | Dominio Económico | Calidad de Datos |
| :--- | :---: | :--- | :--- | :--- |
| `public.cat_refacciones` | 3,869 | `codigo_articulo`, `nombre_articulo`, `costo_unitario`, `moneda`, `stock_actual`, `familia` | Catálogo Maestro de Precios Actuales | `RELIABLE` |
| `public.stg_refacciones_por_maquina_excel` | 3,863 | `fecha`, `maquina_id`, `codigo_articulo`, `cantidad_estandar`, `precio_costo_unitario`, `importe_costo_origen` | Transacciones Históricas de Refacciones | `RELIABLE` |
| `public.ordenes_trabajo` | 4+ | `id_orden`, `folio`, `fecha_inicio`, `fecha_fin`, `tiempo_atencion_min`, `departamento`, `maquina_id`, `tipo_orden` | Mano de Obra, OTs Correctivas y Preventivas | `USABLE_WITH_NORMALIZATION` |
| `public.stg_telegram_ordenes_telares` | 8,719 | `id`, `folio`, `fecha`, `hora`, `hora_fin`, `maquina_id`, `falla`, `cve_atendio`, `calidad` | Histórico Operativo de Correctivos y Paros | `USABLE_WITH_NORMALIZATION` |
| `public.bitacora_mantenimiento` | 1,830 | `id_bitacora`, `id_orden`, `cve_tecnico`, `maquina_id`, `fecha_hora_inicio`, `fecha_hora_fin`, `refacciones_usadas` | Registro de Intervención Técnica en Planta | `RELIABLE` |
| `public.cat_maquinas` | 135 | `id_maquina`, `equipo_towell`, `clave`, `ax`, `departamento_codigo`, `area` | Dimensión Máquina / Telar Canónica | `RELIABLE` |
| `public.cat_departamentos` | 4 | `codigo_departamento`, `nombre_departamento` (`PF`, `CF`, `TF`, `AF`) | Dimensión Departamental Oficial | `RELIABLE` |
| `public.cat_tecnicos` | 26 | `cve_tecnico`, `nombre_tecnico`, `departamento_codigo`, `puesto`, `turno_id` | Mano de Obra Técnica Disponible | `RELIABLE` |
| `public.control_cargas_archivos` | 19 | `id_carga`, `nombre_archivo`, `fecha_carga`, `registros_leidos`, `estatus_carga` | Auditoría de Cargas e Ingesta | `RELIABLE` |
| `public.alertas_sistema` | 0+ | `id_alerta`, `tipo_alerta`, `nivel_criticidad`, `mensaje`, `maquina_id`, `fecha_creacion` | Persistencia Oficial de Alertas | `RELIABLE` |

---

## 3. Principio de Identidad del Evento Económico (`EconomicEvent`)

Cada movimiento o costo consolidado por AG-007 se transforma en un objeto inmutable `EconomicEvent` sin duplicidad:

```json
{
  "economic_event_id": "ECO-20260811-TEL202-0042",
  "source_table": "stg_refacciones_por_maquina_excel",
  "source_record_id": "id_stg_uuid",
  "date": "2026-08-11",
  "period": {
    "year": 2026,
    "month": "2026-08",
    "week": "2026-W33"
  },
  "department": "TF",
  "machine_id": "TELAR-202",
  "work_order_folio": "OT-2026-0811",
  "maintenance_type": "CORRECTIVO",
  "cost_origin": "PART",
  "cost_status": "ACTUAL",
  "part_code": "7408-1",
  "quantity": 2,
  "unit_cost": 450.00,
  "total_amount": 900.00,
  "currency": "MXN",
  "cost_provenance": "HISTORICAL_RECORD",
  "is_complete": true
}
```

---

## 4. Gobernanza y Fronteras de Seguridad (PRD §120-128)

- **Llamadas a LLM / Tokens:** `0 tokens` ($0.00 USD de costo). Todo el mapeo y cálculo monetario es 100% determinístico.
- **Sin mutación de inventario ni compras:** `AG-007` solo lee; no crea órdenes de compra, no cambia existencias en almacén ni modifica precios históricos.
- **Sin creación directa de órdenes de trabajo:** Las OTs son gestionadas exclusivamente por `AG-009` y el flujo operativo humano.
- **Despacho seguro hacia la UI:** La UI interactúa mediante el evento `SYSTEM_ALERTS_REQUESTED` hacia `AG-001`, quien consulta las alertas determinísticas generadas por `AG-007`.
