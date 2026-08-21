# AG-010 — Evidence Model & Evidence Package v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Tokens:** `AG010-EVIDENCE-MODEL-001`, `AG010-EVIDENCE-PACKAGE-001`  

---

## 1. Clasificación de Evidencia

Toda afirmación, dato o registro procesado por AG-010 debe pertenecer a una de las siguientes clases canónicas:

| Clase de Evidencia | Descripción | Trato Epistémico |
| :--- | :--- | :--- |
| **`CERTIFIED_FACT`** | Datos operativos registrados y certificados (OT cerrada, refacción consumida, mediciones de sensores). | Hecho verificado e incontrovertible. |
| **`OPERATOR_STATEMENT`** | Reportes de voz, texto libre o mensajes de Telegram enviados por operadores/usuarios. | **Contenido no verificado** (`UNTRUSTED_CONTENT`). |
| **`TECHNICIAN_STATEMENT`** | Comentarios del técnico en bitácora antes del cierre oficial. | Testimonio técnico sujeto a corroboración. |
| **`DERIVED_SIGNAL`** | Métricas calculadas por AG-008 (recurrencia, tendencia) o M-011 (degradación). | Señal analítica de contexto. |
| **`MODEL_HYPOTHESIS`** | Razonamiento inferido por la IA (MiMo). | **Hipótesis técnica**, jamás un hecho comprobado. |
| **`HUMAN_CONFIRMED_CAUSE`**| Causa raíz ratificada por personal calificado de mantenimiento. | Causa confirmada oficial. |

---

## 2. Invariantes del Modelo de Evidencia

1. **`FACT != HYPOTHESIS`:** Una hipótesis generada por el LLM no puede reclasificarse a sí misma como `CERTIFIED_FACT`.
2. **`OPERATOR_STATEMENT != FACT`:** Si un usuario escribe *"la falla es la banda"*, el sistema lo registra como declaración de síntoma, no como causa probada.
3. **`Trazabilidad 100%:`** Todo elemento de evidencia conserva su `source_reference` hacia M-010 y la tabla de origen.
