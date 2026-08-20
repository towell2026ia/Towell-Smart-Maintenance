# M-011 — Data Sufficiency Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Freeze:** `M011-DATA-SUFFICIENCY-001`  

---

## 1. Principios de Suficiencia de Datos

```text
================================================================================
INVARIANTE 1: DATA SUFFICIENCY != HEALTH SCORE
Un activo con datos insuficientes no tiene salud media (50) ni nula (0);
su estado oficial es INSUFFICIENT_DATA y su score numérico es null.

INVARIANTE 2: MISSING DATA != ZERO
La falta de registros de fallas no se interpreta como 0 fallas si la fuente
de órdenes de trabajo o fallas históricas no está conectada.

INVARIANTE 3: UNKNOWN != HEALTHY / UNKNOWN != LOW_RISK
La falta de información jamás certifica que un activo esté sano o libre de riesgo.
================================================================================
```

---

## 2. Reglas de Evaluación de Suficiencia

1. **Requisitos Críticos Obligatorios:**
   - Identidad y Criticidad de la máquina (`identity.criticidad`).
   - Conexión al historial de fallas (`failure_metrics`).
   - Conexión al historial de mantenimiento preventivo (`maintenance_history`).
2. **Umbral Mínimo de Peso Activo:**
   - Para que el motor emita un score numérico de Salud o Riesgo, debe existir al menos el **65% del peso total de variables requerido**.
   - Si la cobertura de variables disponibles es inferior al 65%, el score se establece en `null` y el estado en `INSUFFICIENT_DATA`.
