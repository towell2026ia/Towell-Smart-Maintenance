# AG-007 — Data Availability & Quality Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-007 — Presupuestos y Costos`  
**Subfase:** `AG-007.1 — Data & Architecture Map`  
**Freeze Token:** `AG007-DATA-AVAILABILITY-001`  

---

## 1. Clasificación de Disponibilidad y Calidad de Fuentes

| Elemento de Costo | Fuente(s) de Datos | Estado de Calidad | Completitud | Tratamiento AG-007 |
| :--- | :--- | :--- | :---: | :--- |
| **Costos Unitarios de Refacciones** | `cat_refacciones.costo_unitario` | `RELIABLE` | 89.2% conocido | Si falta precio: `COST_NOT_AVAILABLE` |
| **Consumo Histórico de Refacciones** | `stg_refacciones_por_maquina_excel` | `RELIABLE` | 100% (3,863 filas) | Multiplicación $Cant \times Costo$, preservando reported |
| **Presupuesto Preventivo Planificado** | `AG-002 Output` | `RELIABLE` | 100% plan | Consumo directo por semana/mes/año |
| **Horas Técnicas en Órdenes de Trabajo** | `ordenes_trabajo.tiempo_atencion_min`, `bitacora_mantenimiento` | `USABLE_WITH_NORMALIZATION` | 92% | Horas técnicas disponibles para análisis de capacidad |
| **Tarifa Horaria de Mano de Obra** | *(Sin tabla de salarios explícita)* | `NOT_AVAILABLE` | 0% | `LABOR_RATE_NOT_AVAILABLE` (no inventar tarifa $/hr) |
| **Duración de Paros de Máquina** | `stg_telegram_ordenes_telares` (`hora_fin - hora`) | `USABLE_WITH_NORMALIZATION` | 88.5% | Minutos de paro acumulados por telar |
| **Tarifa Económica de Paro / Minuto** | *(Sin modelo de costo por hora de paro)* | `NOT_AVAILABLE` | 0% | `DOWNTIME_FINANCIAL_IMPACT_NOT_AVAILABLE` |
| **Presupuesto Anual de Mantenimiento** | *(Configuración Corporativa)* | `PARTIAL` | Requiere Config | Si no existe: `BUDGET_NOT_AVAILABLE` |
| **Catálogo de Máquinas y Telares** | `cat_maquinas` (135 máquinas) | `RELIABLE` | 100% | Resolución exacta por clave/ax |
| **Catálogo de Departamentos** | `cat_departamentos` (PF, CF, TF, AF) | `RELIABLE` | 100% | 4 departamentos industriales |
| **Alertas Persistidas de Sistema** | `alertas_sistema` | `RELIABLE` | 100% estructurada | Tabla lista para persistir eventos de desvío |

---

## 2. Definición del Indicador de Completitud de Costos (`CostCompleteness`)

Dado que en una planta industrial coexisten costos directos conocidos (refacciones) y variables no tarifadas (mano de obra sin tarifa $/hr o costo de paro sin costo $/min), AG-007 implementa la regla de **Completitud y Claridad Contable**:

```text
[Refacciones: CONOCIDAS] + [Mano de Obra: HORAS CONOCIDAS / TARIFA NO DISPONIBLE] + [Paros: MINUTOS CONOCIDOS / TARIFA NO DISPONIBLE]
                                            ↓
                               [COSTO CONOCIDO DE MANTENIMIENTO]
                                  (Completitud: PARTIAL_COST_TOTAL)
```

> [!IMPORTANT]
> **Regla de Seguridad Contable:** El Dashboard y reportes de AG-007 **nunca** rotularán "Costo Total de Mantenimiento" si faltan tarifas de mano de obra o paros; siempre mostrarán **"Costo Conocido de Mantenimiento (Refacciones y Materiales)"** con desglose de horas técnicas y minutos de paro.
