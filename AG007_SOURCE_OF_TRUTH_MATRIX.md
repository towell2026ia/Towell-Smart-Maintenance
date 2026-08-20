# AG-007 — Source of Truth Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-007 — Presupuestos y Costos`  
**Subfase:** `AG-007.1 — Data & Architecture Map`  
**Freeze Token:** `AG007-SOURCE-OF-TRUTH-001`  

---

## Matriz de Fuentes de Verdad por Dominio Económico

| Dominio Económico | Fuente de Verdad Canónica | Campo(s) Autoritativos | Moneda | Frecuencia | Responsabilidad de AG-007 |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Plan Preventivo de Refacciones** | `AG-002 Output (PlannedPreventiveSlot)` | `parts_cost_known`, `planned_parts`, `budget_status` | MXN | Anual / Mensual | Consumir sin recalcular |
| **Catálogo de Refacciones y Precios Actuales** | `public.cat_refacciones` | `codigo_articulo`, `costo_unitario`, `stock_actual` | MXN | Actualización Almacén | Consulta de costo de reposición |
| **Consumo Histórico de Refacciones** | `public.stg_refacciones_por_maquina_excel` | `precio_costo_unitario`, `cantidad_estandar`, `importe_costo_origen`, `fecha` | MXN | Por Carga / Movimiento | Consolidación de gasto real histórico |
| **Órdenes de Trabajo y Duración Técnica** | `public.ordenes_trabajo` | `id_orden`, `tiempo_atencion_min`, `fecha_inicio`, `fecha_fin`, `tipo_orden` | N/A | Transaccional Diario | Cálculo de horas técnicas invertidas |
| **Intervenciones de Bitácora** | `public.bitacora_mantenimiento` | `cve_tecnico`, `maquina_id`, `fecha_hora_inicio`, `fecha_hora_fin`, `refacciones_usadas` | N/A | Transaccional Diario | Trazabilidad de mano de obra y piezas |
| **Histórico Operativo Telegram** | `public.stg_telegram_ordenes_telares` | `folio`, `hora`, `hora_fin`, `cve_atendio`, `falla`, `depto`, `maquina_id` | N/A | Turno a Turno | Histórico de paros y fallas correctivas |
| **Catálogo de Máquinas y Telares** | `public.cat_maquinas` | `equipo_towell`, `clave`, `ax`, `departamento_codigo` | N/A | Maestro Congelado | Resolución canónica de máquina |
| **Catálogo de Departamentos** | `public.cat_departamentos` | `codigo_departamento` (`PF`, `CF`, `TF`, `AF`) | N/A | Maestro Congelado | Atribución departamental |
| **Catálogo de Técnicos / Mano de Obra** | `public.cat_tecnicos` | `cve_tecnico`, `nombre_tecnico`, `departamento_codigo`, `puesto` | N/A | Maestro | Atribución de técnico a OT |
| **Presupuesto General Autorizado** | *Finanzas / Planeación Corporativa* | `presupuesto_anual`, `presupuesto_mensual` | MXN | Anual / Mensual | Comparación Actual vs Presupuesto |
| **Almacén de Alertas de Sistema** | `public.alertas_sistema` | `id_alerta`, `tipo_alerta`, `nivel_criticidad`, `mensaje`, `maquina_id` | N/A | Por Detección de Desvío | Persistencia de alertas de costo |

---

### Reglas de Invarianza sobre Fuentes de Verdad
1. **Invariante de Moneda Única:** Todas las fuentes operativas actuales registran valores en pesos mexicanos (`MXN`). Si alguna fuente no define moneda, se normaliza canónicamente a `MXN`. Si ingresara una moneda extranjera (`USD`, `EUR`), se exige una tasa de cambio autorizada (`FX_RATE_REQUIRED`).
2. **Invariante de No-Reescritura de Históricos:** Un cambio de precio en `cat_refacciones` **nunca modifica** el `precio_costo_unitario` registrado en transacciones históricas pasadas de `stg_refacciones_por_maquina_excel`.
3. **Invariante de No Asunción de Cero:** Si un registro no tiene precio unitario (`costo_unitario IS NULL`), su estado económico es `COST_NOT_AVAILABLE`. Jamás se asume $0.00 como costo consumado.
