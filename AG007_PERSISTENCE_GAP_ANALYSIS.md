# AG-007 — Persistence Gap Analysis & Migration Decision v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-007 — Presupuestos y Costos`  
**Subfase:** `AG-007.1 — Data & Architecture Map`  
**Freeze Token:** `AG007-GAP-ANALYSIS-001`  

---

## 1. Análisis de Brechas de Persistencia en Base de Datos

| Requerimiento Funcional | Tabla(s) Existente(s) en Supabase | ¿Soporta la Operación? | Gap Detectado | Decisión de Arquitectura |
| :--- | :--- | :---: | :--- | :--- |
| **Catálogo de Refacciones y Costos** | `public.cat_refacciones` | **SÍ** | Ninguno | Reutilizar tabla existente con 3,869 refacciones |
| **Histórico de Consumos y Precios** | `public.stg_refacciones_por_maquina_excel` | **SÍ** | Ninguno | Reutilizar 3,863 transacciones históricas |
| **Horas Técnicas en OTs y Bitácora** | `public.ordenes_trabajo`, `public.bitacora_mantenimiento` | **SÍ** | Ninguno | Reutilizar tiempos de atención y bitácora técnica |
| **Minutos de Paro y Fallas** | `public.stg_telegram_ordenes_telares`, `public.paros_maquina` | **SÍ** | Ninguno | Reutilizar histórico de 8,719 órdenes Telegram |
| **Persistencia de Alertas** | `public.alertas_sistema` | **SÍ** | Ninguno | Reutilizar tabla oficial de alertas del sistema |
| **Auditoría de Ingesta y Cargas** | `public.control_cargas_archivos` | **SÍ** | Ninguno | Reutilizar tabla de control de cargas |
| **Presupuesto General Autorizado** | *Configuración / AG-002 para Preventivo* | **SÍ (vía memoria/config)** | Sin tabla SQL formal de presupuesto general | Modo `AG007_COST_CONSOLIDATION_READY` + Presupuesto Preventivo de AG-002 |

---

## 2. Decisión Formal de Migración

```text
==============================================================================
               DECISIÓN DE MIGRACIÓN: NO_AG007_MIGRATION_REQUIRED
==============================================================================
El esquema actual de Supabase cuenta con todas las tablas requeridas para
almacenar refacciones, transacciones, órdenes de trabajo, bitácoras y alertas.
No se requiere crear ninguna tabla nueva ni alterar tablas existentes.
==============================================================================
```

### Justificación:
1. **`cat_refacciones`** almacena costos unitarios actuales, código de artículo, existencias y moneda.
2. **`stg_refacciones_por_maquina_excel`** almacena transacciones históricas de refacciones con máquina, fecha, costo unitario de origen e importe total.
3. **`ordenes_trabajo`** y **`bitacora_mantenimiento`** registran órdenes correctivas y horas técnicas de intervención.
4. **`alertas_sistema`** proporciona la persistencia oficial para todas las alertas generadas por AG-007.
5. **`AG-002`** provee la fuente inmutable del presupuesto preventivo planificado anual, mensual y semanal.
