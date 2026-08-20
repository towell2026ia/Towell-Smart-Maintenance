# M-010 — Data Completeness Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-010 — Expediente Único del Activo`  
**Token de Freeze:** `M010-DATA-MAP-001`  

---

## 1. Modelo de Completitud del Expediente (Record Completeness)

M-010 evalúa la **integridad documental** del expediente del activo, NO su estado de salud o riesgo físico (que corresponde exclusivamente a M-011).

```text
RECORD COMPLETENESS (M-010) ≠ ASSET HEALTH / RISK (M-011)
```

### Estados de Completitud por Sección:
1. **`COMPLETE`**: Todos los campos clave requeridos están poblados y validados.
2. **`PARTIAL`**: Existen registros, pero faltan atributos opcionales (e.g. número de serie o marca no especificada).
3. **`UNKNOWN`**: No hay certeza si la falta de registros se debe a ausencia de actividad o falta de digitalización.
4. **`NOT_APPLICABLE`**: La sección no aplica para la tipología del activo.

---

## 2. Invariante Crítica: `NO_RECORD ≠ NO_FAILURE`
Una lista vacía de fallas en el expediente histórico significa "no hay registros de falla documentados", pero no debe interpretarse analíticamente como "la máquina nunca ha fallado".
