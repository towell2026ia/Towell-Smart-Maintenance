# AG-010 — Data Quality Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Token:** `AG010-DATA-QUALITY-001`  

---

## 1. Estados de Calidad de Datos para Análisis Causal

| Estado de Calidad | Condición Operativa | Comportamiento del Agente |
| :--- | :--- | :--- |
| **`SUFFICIENT`** | Identidad del activo, descripción técnica del síntoma y al menos 1 hecho verificado disponibles. | Procede con recuperación y Cinco Porqués completo. |
| **`PARTIAL`** | Datos mínimos presentes, pero faltan reportes de intervención previa o mediciones clave. | Procede señalando brechas de datos explícitas en `data_gaps`. |
| **`INSUFFICIENT`** | Faltan datos esenciales del síntoma o del activo. | Emite `INSUFFICIENT_EVIDENCE_FOR_FIVE_WHYS` sin alucinar causas. |
| **`CONFLICTING`** | Existen registros mutuamente excluyentes (ej. dos causas incompatibles reportadas simultáneamente). | Señala conflicto explícito y solicita verificación física obligatoria. |

---

## 2. Invariante de No Alucinación

- La falta de datos suficientes es un resultado técnico **válido y esperado**.
- Queda prohibido generar árboles causales artificiosos cuando `data_quality == 'INSUFFICIENT'`.
