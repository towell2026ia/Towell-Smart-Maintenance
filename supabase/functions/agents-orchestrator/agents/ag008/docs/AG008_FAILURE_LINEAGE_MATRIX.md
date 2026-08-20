# AG-008 — Failure Lineage & Traceability Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad`  
**Token de Congelamiento:** `AG008-FAILURE-LINEAGE-001`

---

## 1. Cadena de Linaje de Extremo a Extremo

Toda métrica, tendencia o alerta técnica emitida por AG-008 es 100% auditable y trazable hasta el registro crudo en base de datos:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CADENA DE LINAJE DE FALLAS                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Registro Crudo: `ordenes_trabajo(id_ot)` o `stg_telegram(id)`       │
│    ↓                                                                   │
│ 2. Extracción & Parser: Extracción de fecha, maquina_id, failure_raw  │
│    ↓                                                                   │
│ 3. Normalizador: Generación de `failure_normalized` (sinónimos/reglas) │
│    ↓                                                                   │
│ 4. Dedupe Engine: Generación de `failure_event_id` (SHA-256)           │
│    ↓                                                                   │
│ 5. Series & Recurrencia: Agrupación en `FailureSeriesPoint`            │
│    ↓                                                                   │
│ 6. Señal de Alerta: `FailureSignal(evidence_event_ids: [...])`         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Invariante de Trazabilidad Total

```text
failure_signal_traceability = 100%
unsupported_failure_signals = 0
```

Cada alerta generada contiene obligatoriamente:
- `evidence_event_ids`: Lista de identificadores únicos de fallas que sustentan la alerta.
- `source_references`: Referencias a tablas y folios de origen.
- `rule_version`: Versión determinística de la regla evaluada.
