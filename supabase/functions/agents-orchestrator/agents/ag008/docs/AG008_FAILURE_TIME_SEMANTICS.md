# AG-008 — Failure Time Semantics v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad`  
**Token de Congelamiento:** `AG008-FAILURE-TIME-SEMANTICS-001`

---

## 1. Jerarquía y Semántica Temporal de Eventos de Falla

En el análisis de fallas de TSM-AI, cada evento temporal posee una semántica unívoca y estricta:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        SEMÁNTICA TEMPORAL DE FALLA                     │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 1. occurred_at           │ Fecha y hora real en que se produjo la      │
│    (Fecha de Ocurrencia) │ falla o paro físico en la máquina.          │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 2. requested_at          │ Fecha y hora en que se levantó la solicitud │
│    (Fecha de Solicitud)  │ o mensaje de alerta en Telegram / OT.       │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 3. executed_at           │ Fecha y hora de intervención técnica.       │
│    (Fecha de Ejecución)  │                                             │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 4. closed_at             │ Fecha y hora de cierre y validación de la   │
│    (Fecha de Cierre)     │ orden de trabajo.                           │
└──────────────────────────┴─────────────────────────────────────────────┘
```

---

## 2. Reglas de Normalización de Fechas

1. **Aproximación de Ocurrencia:** Si una fuente no cuenta con `occurred_at` exacto pero posee `fecha_solicitud`, se utiliza la fecha de solicitud registrando `time_quality = 'APPROXIMATED_FROM_REQUEST'`.
2. **Zona Horaria Canónica:** Todas las fechas y marcas de tiempo se normalizan a la zona horaria de planta (`America/Mexico_City`) evitando desfasajes de turno nocturno.
3. **Turnos de Operación:**
   - **Turno 1:** 06:00 a 14:00 hrs.
   - **Turno 2:** 14:00 a 22:00 hrs.
   - **Turno 3:** 22:00 a 06:00 hrs (del día siguiente; se asocia operativamente a la jornada iniciada).
4. **Agrupación en Periodos ISO:**
   - **Semanas:** Formato canónico ISO 8601 `YYYY-Www` (ej. `2026-W33`).
   - **Meses:** Formato canónico `YYYY-MM` (ej. `2026-08`).
   - **Años:** Formato canónico `YYYY` (ej. `2026`).
