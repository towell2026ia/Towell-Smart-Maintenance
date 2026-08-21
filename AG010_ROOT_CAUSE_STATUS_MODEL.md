# AG-010 — Root Cause Status Model & Confirmation Authority v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Token:** `AG010-ROOT-CAUSE-STATUS-001`  

---

## 1. Catálogo Cerrado de Estados de Causa Raíz

| Estado | Significado Técnico | Requiere Validación Humana |
| :--- | :--- | :---: |
| **`NOT_ANALYZED`** | El problema aún no ha sido sometido a investigación causal. | N/A |
| **`HYPOTHESIS`** | Causa probable inferida por el modelo de IA o propuesta inicialmente. | `true` |
| **`SUPPORTED_HYPOTHESIS`**| Hipótesis respaldada por evidencias de intervenciones pasadas o patrones de falla. | `true` |
| **`CONFIRMED`** | Causa raíz **verificada físicamente y ratificada por personal humano calificado**. | `false` (ya validado) |
| **`INSUFFICIENT_EVIDENCE`**| La información disponible no permite formular una hipótesis sólida. | `true` |
| **`DISPROVEN`** | Hipótesis descartada tras inspección física o mediciones técnicas. | `false` |

---

## 2. Autoridad de Confirmación (`CONFIRMATION_AUTHORITY`)

1. **La IA NO puede auto-confirmar causas raíz:** El modelo MiMo (`mimo-v2.5`) produce exclusivamente `HYPOTHESIS` o `SUPPORTED_HYPOTHESIS`.
2. **Autoridad Humana Exclusiva:** Solo un usuario con rol de Supervisor, Jefe de Mantenimiento o Técnico Especialista puede promover un candidato al estado `CONFIRMED`.
3. **Evidencia Contradictoria:** Si existen datos que contradicen una hipótesis, el sistema debe preservarlos en `contradicting_evidence` y bloquear cualquier asunción de confirmación.
