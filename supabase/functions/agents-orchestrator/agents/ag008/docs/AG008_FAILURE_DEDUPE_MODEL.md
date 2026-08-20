# AG-008 — Failure Deduplication Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad`  
**Token de Congelamiento:** `AG008-FAILURE-DEDUPE-MODEL-001`

---

## 1. Modelo de Deduplicación Criptográfica (SHA-256)

Para prevenir el doble conteo artificial de fallas reportadas simultáneamente en múltiples canales (Telegram, OTs, Bitácora y Excel), AG-008 implementa un modelo de deduplicación determinístico basado en hashes SHA-256.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FINGERPRINT DEL EVENTO DE FALLA                 │
├────────────────────────────────────────────────────────────────────────┤
│ SHA-256( maquina_id + date + shift + failure_normalized + source_root )│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tipos de Duplicación y Tratamiento

| Tipo de Duplicación | Escenario Operativo | Tratamiento en AG-008 |
| :--- | :--- | :--- |
| **Duplicado Exacto** | El mismo archivo Excel o carga es importado dos veces. | **Consolidación Unitaria:** Se procesa como 1 solo `FailureEvent`. |
| **Cross-Source Duplicate** | Un paro reportado en Telegram genera una Orden de Trabajo (`ordenes_trabajo`). | **Vinculación y Fusión:** Se asocian bajo el mismo evento de falla primario, prevaleciendo la OT. |
| **Verdadera Recurrencia (True Recurrence)** | La misma falla normalizada ocurre en la misma máquina en días o turnos distintos. | **Preservación Total:** Se conservan como múltiples `FailureEvent` independientes para medir frecuencia y recurrencia. |

---

## 3. Precedencia de Fuentes en Duplicados

```text
1. ordenes_trabajo              (Máxima Autoridad Operativa)
2. levantamientos_mantenimiento (Autoridad de Inspección Física)
3. stg_telegram_ordenes_telares (Reporte Operativo en Tiempo Real)
4. fallas_por_maquina           (Histórico Consolidado)
5. stg_fallas_por_maquina_excel (Staging de Importación)
```
