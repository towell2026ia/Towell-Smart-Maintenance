# M-011 — Scoring Readiness Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Freeze:** `M011-DATA-MAP-001`  

---

## 1. Evaluación de Madurez y Preparación de Scoring

| Componente del Modelo | Estatus de Preparación | Token / Manifest Asignado | Observaciones |
| :--- | :---: | :--- | :--- |
| **Definición de Salud** | ✅ APROBADO | `M011-HEALTH-MODEL-001` | Rango 0-100, Mayor es mejor salud. |
| **Fórmula de Salud** | ✅ APROBADO | `M011-HEALTH-FORMULA-001` | Promedio ponderado normalizado. |
| **Pesos de Salud** | ✅ APROBADO | `M011-HEALTH-WEIGHTS-001` | Falla 30%, Mant 30%, Hallazgos 20%, Paros 20%. |
| **Umbrales de Salud** | ✅ APROBADO | `M011-HEALTH-THRESHOLDS-001`| $\ge 85$ Healthy, $\ge 65$ Watch, $\ge 40$ Degraded, $< 40$ Critical. |
| **Definición de Riesgo**| ✅ APROBADO | `M011-RISK-MODEL-001` | Rango 0-100, Mayor es mayor riesgo operacional. |
| **Fórmula de Riesgo** | ✅ APROBADO | `M011-RISK-FORMULA-001` | Promedio ponderado de exposición. |
| **Pesos de Riesgo** | ✅ APROBADO | `M011-RISK-WEIGHTS-001` | Salud 35%, Criticidad 25%, Recurrencia 20%, Hallazgos 20%. |
| **Umbrales de Riesgo** | ✅ APROBADO | `M011-RISK-THRESHOLDS-001` | $< 25$ Low, $< 50$ Moderate, $< 75$ High, $\ge 75$ Critical. |
| **Suficiencia de Datos**| ✅ APROBADO | `M011-DATA-SUFFICIENCY-001` | $\ge 65\%$ de peso activo para calcular score. |
| **Normalización** | ✅ APROBADO | `M011-FEATURE-NORMALIZATION-001`| Funciones lineales determinísticas acotadas [0, 100]. |
| **Persistencia** | ✅ APROBADO | `NO_M011_MIGRATION_REQUIRED` | Cálculo determinístico on-demand sin tablas extra. |
| **Veredicto M-011.1** | 🏆 **PASS** | `M011_ARCHITECTURE_GATE_PASS` | **Listo para implementación de motor en M-011.2**. |
