# AG-013 — Intervention Effectiveness Model v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-INTERVENTION-EFFECTIVENESS-001`  

---

## 1. Modelo de Efectividad de Intervención (Repair Effectiveness)

Analiza la calidad y durabilidad de las intervenciones mecánicas y eléctricas ejecutadas sobre el activo.

### Regla Fundamental:
$$\text{OT CERRADA} \neq \text{PROBLEMA RESUELTO PERMANENTEMENTE}$$

El cierre administrativo de una Orden de Trabajo no garantiza que la causa raíz haya sido erradicada.

---

## 2. Dimensiones de Ineficacia Evaluadas:

1. **Reincidencia Inmediata (< 15 días tras cierre de OT):** Señal de diagnóstico incorrecto o refacción deficiente.
2. **Reincidencia a Corto Plazo (< 45 días tras cierre de OT):** Señal de solución superficial de síntomas sin eliminar la causa raíz.
3. **Múltiples OTs Abiertas por el Mismo Modo de Falla:** Falla crónica en proceso de atención recurrente.

---

## 3. Invariantes de Efectividad:

- `closed_OT_as_effective_repair = 0`: Prohibido asumir que el cierre de una OT elimina automáticamente la sospecha de mal desempeño crónico.
