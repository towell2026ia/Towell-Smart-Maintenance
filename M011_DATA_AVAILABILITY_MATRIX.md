# M-011 — Data Availability & Readiness Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Freeze:** `M011-DATA-MAP-001`  

---

## 1. Matriz de Disponibilidad de Datos

| Feature | Fuente Certificada | Cobertura en Máquinas | Calidad Temporal | Preparado para Salud | Preparado para Riesgo | Brecha / Observación |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Identidad Oficial** | `cat_maquinas` | 100% | Exacta | ✅ SÍ | ✅ SÍ | Ninguna. Identidad canónica anclada. |
| **Criticidad Máquina**| `cat_maquinas.criticidad` | 100% | Exacta | ❌ NO | ✅ SÍ | Modula exclusivamente riesgo. |
| **Histórico de Fallas**| `ordenes_trabajo` / `stg_telegram` | 100% | Exacta | ✅ SÍ | ✅ SÍ | Ventana de 90 días certificada. |
| **Tendencia / Recurrencia**| `AG-008` Signals | 100% | Analítica | ✅ SÍ | ✅ SÍ | Consumido desde AG-008. |
| **Planes Preventivos** | `calendario_preventivo_anual` | 100% | Exacta | ✅ SÍ | ✅ SÍ | Regla 1 preventivo/máquina/año. |
| **Planes Autónomos** | `calendario_autonomo_semanal` | Departamentos clave | Exacta | ✅ SÍ | ✅ SÍ | Se tolera N/A en áreas sin autónomo. |
| **Hallazgos Físicos** | `respuestas_checklist_autonomo` | Dinámica | Exacta | ✅ SÍ | ✅ SÍ | Solo hallazgos activos no resueltos. |
| **Paros Operacionales**| `ordenes_trabajo` (duración) | 100% | Exacta | ✅ SÍ | ✅ SÍ | Minutos de paro acumulados. |
| **Costos Refacciones** | `refacciones_utilizadas` | 100% | Exacta | ❌ NO | ❌ NO | Frontera AG-007; no altera salud física. |
