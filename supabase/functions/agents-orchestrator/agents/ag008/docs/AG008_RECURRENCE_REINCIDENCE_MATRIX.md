# AG-008 — Recurrence vs Reincidence Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad`  
**Token de Congelamiento:** `AG008-RECURRENCE-SEMANTICS-001`

---

## 1. Distinción Conceptual: Frecuencia vs Recurrencia vs Reincidencia

En el modelo de inteligencia de fallas de AG-008, estos tres conceptos están matemáticamente diferenciados:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FRECUENCIA vs RECURRENCIA vs REINCIDENCIA       │
├─────────────────┬──────────────────────────────────────────────────────┤
│ 1. Frecuencia   │ Conteo total de eventos de falla en un periodo dado. │
│                 │ (Ejemplo: 8 fallas mecánicas en el mes de agosto).   │
├─────────────────┼──────────────────────────────────────────────────────┤
│ 2. Recurrencia  │ Repetición de un MISMO modo de falla normalizado en  │
│                 │ la MISMA máquina en un intervalo de tiempo.          │
│                 │ (Ejemplo: Telar 202 presentó "falla de trama" 4 veces│
│                 │ en las últimas 2 semanas).                           │
├─────────────────┼──────────────────────────────────────────────────────┤
│ 3. Reincidencia │ Reaparición de la MISMA falla en la misma máquina    │
│                 │ DESPUÉS de que una orden de trabajo fue cerrada con  │
│                 │ estatus "RESUELTA" (falla post-reparación).          │
└─────────────────┴──────────────────────────────────────────────────────┘
```

---

## 2. Matriz de Estados de Recurrencia

| Estado de Recurrencia | Criterio Determinístico | Acción / Alerta Técnica |
| :--- | :--- | :--- |
| `NONE` | 1 sola ocurrencia registrada en la ventana de tiempo. | Monitoreo rutinario sin alerta. |
| `REPEATED` | 2 ocurrencias del mismo modo de falla en $\le$ 30 días. | Señal informativa de seguimiento. |
| `RECURRENT` | $\ge$ 3 ocurrencias del mismo modo de falla en $\le$ 30 días. | Emisión de `FAILURE_RECURRENCE_ALERT`. |
| `REINCIDENCE` | Ocurrencia del mismo modo de falla en $\le$ 15 días posteriores al cierre de una OT correctiva. | Emisión de `FAILURE_REINCIDENCE_ALERT`. |
| `INSUFFICIENT_DATA` | Ventana de observación menor a 14 días o eventos sin fecha válida. | Estado informativo de datos incompletos. |
