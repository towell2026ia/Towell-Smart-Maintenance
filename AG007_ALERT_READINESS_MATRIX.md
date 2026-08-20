# AG-007 — Alert Readiness Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-007 — Presupuestos y Costos`  
**Subfase:** `AG-007.1 — Data & Architecture Map`  
**Freeze Token:** `AG007-ALERT-READINESS-001`  

---

## 1. Catálogo de Alertas de Presupuestos y Costos

| Código de Alerta | Condición de Activación | Datos Requeridos | Disponibilidad de Datos | Estado de Preparación | Acción Recomendada |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `BUDGET_WARNING` | Gasto real alcanza umbral de advertencia (ej. $\ge 85\%$ del presupuesto del período) | `actual_spend`, `budget_limit` | Parcial (Requiere Presupuesto Corporativo) | `READY_WHEN_BUDGET_LOADED` | Notificar al Gerente de Mantenimiento |
| `BUDGET_EXCEEDED` | Gasto real supera el 100% del presupuesto asignado | `actual_spend`, `budget_limit` | Parcial (Requiere Presupuesto Corporativo) | `READY_WHEN_BUDGET_LOADED` | Alerta crítica de sobregasto |
| `COST_SPIKE` | El gasto semanal o mensual de una máquina supera en $+50\%$ su promedio histórico | `actual_spend`, `historical_baseline` | **100% DISPONIBLE** (desde `stg_refacciones_por_maquina_excel`) | `READY` | Auditoría de consumo anómalo en telar |
| `PART_COST_INCREASE` | El costo unitario de una refacción clave sube más de $+20\%$ vs histórico | `current_unit_cost`, `historical_unit_cost` | **100% DISPONIBLE** (comparando `cat_refacciones` vs staging) | `READY` | Revisión con compras / proveedores |
| `DOWNTIME_SPIKE` | Horas/minutos de paro en un telar aumentan drásticamente en la semana | `downtime_minutes`, `historical_downtime` | **100% DISPONIBLE** (desde Telegram / OTs) | `READY` | Enlace con Correctivo AG-008/AG-009 |
| `FORECAST_OVER_BUDGET` | La proyección de cierre de mes/año supera el presupuesto aprobado | `spend_to_date`, `burn_rate`, `budget_limit` | Parcial (Requiere Presupuesto Corporativo) | `READY_WHEN_BUDGET_LOADED` | Acción preventiva antes del cierre de mes |

---

## 2. Arquitectura de Despacho de Alertas hacia la UI

```text
  [AG-007 DETECTOR DETERMINÍSTICO]
                │
                ▼ (Emite Alerta Estructurada)
  [PERSISTENCIA EN TABLA 'alertas_sistema']
                │
                ▼ (Consulta vía Orquestador)
  [AG-001 CAPATAZ (Manejador de Eventos)]
                │
                ▲ (Evento: SYSTEM_ALERTS_REQUESTED)
  [BOTÓN 'ALERTAS DEL SISTEMA' (UI DASHBOARD / PWA)]
```

### Invariantes de Seguridad en Alertas:
1. **La UI no invoca directamente a AG-007:** Toda petición de alertas pasa por `AG-001` mediante el evento canónico `SYSTEM_ALERTS_REQUESTED`.
2. **Idempotencia de Alertas:** Si una condición de sobregasto persiste, AG-007 no genera spam de alertas idénticas para el mismo período/máquina, agrupándolas con una llave de idempotencia diaria.
3. **Severidad Estricta:** Las severidades (`Informativa`, `Advertencia`, `Crítica`) son asignadas por reglas numéricas matemáticas determinísticas y jamás por inferencia de texto libre.
