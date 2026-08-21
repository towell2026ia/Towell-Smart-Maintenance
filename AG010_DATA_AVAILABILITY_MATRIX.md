# AG-010 — Data Availability & Sufficiency Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Freeze:** `AG010-DATA-MAP-001`  

---

## 1. Escenarios de Disponibilidad de Datos Históricos

| Escenario de Activo | Casos Previos Disponibles | Comportamiento Esperado de AG-010 | Estado de Calidad |
| :--- | :--- | :--- | :--- |
| **Activo con Amplio Historial** | $\ge 3$ casos anteriores | Recupera top matches determinísticos, analiza similitud y contextualiza 5 Porqués | `SUFFICIENT` |
| **Activo con Historial Escaso** | 1 a 2 casos anteriores | Analiza los casos disponibles y señala datos limitados | `PARTIAL` |
| **Activo Nuevo / Sin Casos Previos** | `previous_cases = []` | **SOPORTADO:** Ejecuta Cinco Porqués basándose únicamente en los hechos actuales. `previous_cases = []` es un resultado válido, **NO un error**. | `SUFFICIENT` o `PARTIAL` (según caso actual) |
| **Falla sin Descripción Técnica** | Sin datos de falla actual | Emite estado `INSUFFICIENT_EVIDENCE_FOR_FIVE_WHYS` y detiene el análisis. | `INSUFFICIENT` |
| **Evidencias Contradictorias** | Informes en conflicto | Conserva ambas evidencias explícitamente en `contradicting_evidence` y exige validación humana. | `CONFLICTING` |

---

## 2. Invariante de Aislamiento Temporal (`future_case_leakage = 0`)

- Todo análisis se ancla estrictamente a la marca de tiempo `evaluation_at`.
- Cualquier caso, orden de trabajo, hallazgo o bitácora con `occurred_at > evaluation_at` es **ESTRICTAMENTE EXCLUIDO**.
