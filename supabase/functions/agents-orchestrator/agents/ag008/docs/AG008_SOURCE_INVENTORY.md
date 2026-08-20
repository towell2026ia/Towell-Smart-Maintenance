# AG-008 — Failure Source Inventory v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad`  
**Token de Congelamiento:** `AG008-DATA-MAP-001`

---

## 1. Inventario de Fuentes de Datos de Fallas

| Fuente / Tabla | Tipo de Fuente | Llave Primaria | Campo Máquina | Campo Depto | Campo Fecha / Hora | Campo Texto Falla | Calidad | Nivel Autoritativo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ordenes_trabajo` | Operativa | `id_ot` (UUID) / `folio` | `maquina_id` | `departamento` | `fecha_solicitud`, `fecha_ejecucion`, `fecha_cierre` | `descripcion_falla` | `RELIABLE` | Autoridad de Resolución y Cierre |
| `stg_telegram_ordenes_telares` | Operativa / Chat | `id` (INT) / `folio` | `maquina_id` | `depto` | `fecha`, `hora`, `fecha_fin`, `hora_fin` | `falla`, `descripcion`, `obs` | `USABLE_WITH_NORMALIZATION` | Reporte en tiempo real de paros |
| `fallas_por_maquina` | Histórica | `id_falla` (UUID) | `maquina_id` | `area` | `fecha_hora_creada`, `fecha_creada`, `hora_creada` | `descripcion_falla` | `RELIABLE` | Consolidado histórico de fallas |
| `stg_fallas_por_maquina_excel` | Importación | `id` (UUID) | `maquina_id` | `area` | `creada` (VARCHAR ISO) | `descripcion` | `PARTIAL` | Staging de Excel histórico |
| `levantamientos_mantenimiento` | Inspección Física | `id_levantamiento` | `maquina_id` | `departamento` | `fecha_levantamiento` | `hallazgo_detectado`, `descripcion_falla` | `RELIABLE` | Hallazgos Físicos Reales (AG-004/AG-003) |
| `bitacora_mantenimiento` | Bitácora Técnica | `id_bitacora` | `maquina_id` | `departamento` | `fecha_evento` | `descripcion` | `USABLE_WITH_NORMALIZATION` | Registro diario de eventos técnicos |
| `cat_maquinas` | Catálogo Maestro | `equipo_towell` | `equipo_towell` | `departamento_codigo` | N/A | `nombre`, `criticidad` | `RELIABLE` | Autoridad de Identidad de Máquina |

---

## 2. Reglas de Ingesta y Conservación

1. **Invariante de Texto Crudo (`raw_failure_overwrite = 0`):** El texto original (`failure_raw`) nunca se modifica ni se sobreescribe.
2. **Normalización Determinística:** Se genera `failure_normalized` mediante transformaciones determinísticas (minúsculas, trim, remoción de acentos y puntuación redundante).
3. **Identidad de Máquina Oficial:** Toda falla debe vincularse contra `cat_maquinas(equipo_towell)`. Si no existe máquina atribuible, se categoriza como `UNATTRIBUTED_FAILURE` sin eliminarse del análisis global.
