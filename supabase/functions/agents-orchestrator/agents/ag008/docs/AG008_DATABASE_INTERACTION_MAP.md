# AG-008 — Database Interaction Map v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-008 — Fallas, Tendencias, Reincidencias y Estacionalidad`  
**Token de Congelamiento:** `AG008-DATA-MAP-001`

---

## 1. Flujo de Interacción con la Base de Datos

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FUENTES DE DATOS DE FALLAS                      │
├─────────────────┬───────────────────┬────────────────┬─────────────────┤
│ ordenes_trabajo │ telegram_ordenes  │ fallas_maquina │ levantamientos  │
└────────┬────────┴─────────┬─────────┴────────┬───────┴────────┬────────┘
         │                  │                  │                │
         ▼                  ▼                  ▼                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SOURCE MAPPER & PARSER                          │
│               - Extrae fecha_ocurrencia / hora / turno                 │
│               - Asocia maquina_id oficial (cat_maquinas)               │
│               - Preserva failure_raw original                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       FAILURE NORMALIZER (NO IA)                       │
│               - Minúsculas, trim, remoción de acentos                  │
│               - Mapeo de sinónimos técnicos autorizados                │
│               - failure_normalized (canónico)                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DEDUPE ENGINE (SHA-256)                         │
│               - Exact duplicates: 1 FailureEvent                       │
│               - Cross-source: Telegram ↔ OT deduplicado               │
│               - True Recurrence: Preservado como eventos múltiples     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     TIME & RECURRENCE SERIES BUILDER                   │
│               - Series: Diaria, Semanal (ISO Www), Mensual, Anual      │
│               - Frecuencia, intervalos y reincidencias                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    DETERMINISTIC ALERT CONDITIONS                      │
│               - FAILURE_RECURRENCE_ALERT                               │
│               - FAILURE_TREND_UP                                       │
│               - FAILURE_CONCENTRATION_ALERT                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
                         AG-001 (Capataz) ──► UI
```

---

## 2. Puntos de Entrada y Consulta

- **Operación Principal:** Lectura idempotente sobre tablas existentes (`ordenes_trabajo`, `stg_telegram_ordenes_telares`, `fallas_por_maquina`, `levantamientos_mantenimiento`).
- **Cero Mutaciones de Base de Datos:** AG-008 no inserta órdenes de trabajo, no muta catálogos de máquinas ni borra registros históricos.
