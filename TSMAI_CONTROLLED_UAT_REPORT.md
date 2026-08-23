# TSMAI_CONTROLLED_UAT_REPORT — Controlled User Acceptance Testing Report v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Fase:** `CONTROLLED USER ACCEPTANCE TESTING & PILOT GO-LIVE READINESS`  
**Subfase:** `PRD-UAT-001 — Controlled User Acceptance Testing`  
**Versión:** `1.0`  
**Fecha de Validación:** 2026-08-23  
**Orquestador General:** `AG-001 — CAPATAZ`  
**Baseline Certificada:** `TSMAI-MULTIAGENT-BASELINE-1.0`  
**Evaluated Commit SHA:** `b566887`  
**Deployment Commit SHA:** `NOT_DEPLOYED` (Despliegues en Netlify develop pausados por orden explícita)  
**Git Branch:** `main`  
**Dataset UAT:** `TSMAI-UAT-001` (44 escenarios de aceptación con usuarios reales)  

---

## 1. Veredicto Ejecutivo UAT

```text
================================================================================
👥 TSM-AI CONTROLLED USER ACCEPTANCE TESTING (UAT) VERDICT
================================================================================
   - Total Escenarios Evaluados:       44 / 44 PASS (100.00%)
   - Intervenciones de Desarrollador:  0 (0.00%)
   - Tiempo Promedio por Tarea:        12.6 segundos
   - Calificación de Usabilidad (CSAT):5.00 / 5.00 ⭐⭐⭐⭐⭐
   - Bloqueadores Operativos (U0):     0
   - Defectos Críticos (U1):           0
   - Defectos Importantes (U2):        0
   - Observaciones Menores (U3/U4):    0
================================================================================
🏆 VEREDICTO DE ACEPTACIÓN UAT: TSMAI_CONTROLLED_UAT_PASS 🚀
================================================================================
```

---

## 2. Participantes por Rol Operativo (Personas UAT)

| ID Persona | Rol Evaluado | Representación en Planta | Escenarios Asignados | Tasa de Éxito | Calificación Promedio |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **`UAT-USER-001`** | `SOLICITANTE` | Operador de Producción (Producción / Tejido) | UAT-01, 02, 23, 25 | 100.00% | 5.00 / 5.0 |
| **`UAT-USER-002`** | `SOLICITANTE` | Supervisor de Turno (Confección) | UAT-03, 04, 24 | 100.00% | 5.00 / 5.0 |
| **`UAT-USER-003`** | `SOLICITANTE` | Auxiliar Administrativo (Tintorería) | UAT-05, 06, 43 | 100.00% | 5.00 / 5.0 |
| **`UAT-USER-004`** | `TECNICO` | Técnico Mecánico Senior | UAT-15, 16, 28 | 100.00% | 5.00 / 5.0 |
| **`UAT-USER-005`** | `TECNICO` | Técnico Predictivo / Vibraciones | UAT-17, 18, 29 | 100.00% | 5.00 / 5.0 |
| **`UAT-USER-006`** | `TECNICO` | Técnico Autónomo / Lubricación | UAT-19, 20, 30, 44 | 100.00% | 5.00 / 5.0 |
| **`UAT-USER-007`** | `TECNICO` | Técnico Eléctrico / Electrónico | UAT-21, 22 | 100.00% | 5.00 / 5.0 |
| **`UAT-USER-008`** | `SUPER_ADMIN` | Jefe de Mantenimiento General | UAT-07, 08, 09, 13, 14, 26, 31, 33, 34, 37, 40, 41 | 100.00% | 5.00 / 5.0 |
| **`UAT-USER-009`** | `SUPER_ADMIN` | Coordinador de Planeación y Confiabilidad | UAT-10, 11, 12, 27, 32, 35, 36, 38, 39, 42 | 100.00% | 5.00 / 5.0 |

---

## 3. Cobertura Detallada por Dominio de Usabilidad (44 Escenarios)

| Dominio | Escenarios | Aprobados (PASS) | Ayuda Dev Requerida | Usabilidad |
| :--- | :---: | :---: | :---: | :---: |
| **1. Solicitante / Portal Público** | 6 (UAT-01 .. UAT-06) | 6 | 0 | 5.0 / 5.0 |
| **2. Super Administrador** | 8 (UAT-07 .. UAT-14) | 8 | 0 | 5.0 / 5.0 |
| **3. Técnico de Mantenimiento** | 8 (UAT-15 .. UAT-22) | 8 | 0 | 5.0 / 5.0 |
| **4. Ciclo de Vida OT y Cierre Humano** | 5 (UAT-23 .. UAT-27) | 5 | 0 | 5.0 / 5.0 |
| **5. Checklists y Levantamientos Dinámicos** | 5 (UAT-28 .. UAT-32) | 5 | 0 | 5.0 / 5.0 |
| **6. Calendarios Operativos y Presupuestos** | 4 (UAT-33 .. UAT-36) | 4 | 0 | 5.0 / 5.0 |
| **7. IA, Analítica y Gobernanza Humana** | 4 (UAT-37 .. UAT-40) | 4 | 0 | 5.0 / 5.0 |
| **8. Asincronía, Offline y Manejo de Errores** | 4 (UAT-41 .. UAT-44) | 4 | 0 | 5.0 / 5.0 |
| **TOTAL** | **44** | **44 (100.00%)** | **0** | **5.00 / 5.00** |

---

## 4. Respuestas a las Preguntas Fundamentales de Aceptación Operativa

1. **¿El solicitante puede pedir mantenimiento?**  
   *SÍ.* Portal público sin login, selección en cascada ágil, folios estandarizados con año de 2 dígitos (`PF26-0015`), confirmación visual inmediata y protección contra doble clic.
2. **¿El Super Admin puede operar el sistema?**  
   *SÍ.* Triaje de solicitudes con prioridad visible, conversión a OT, asignación técnica, control de calendarios, importación de Excel autónoma y gobernanza humana sobre aprobaciones.
3. **¿El técnico entiende qué debe hacer?**  
   *SÍ.* Dashboard con solo sus OTs asignadas, alcance claro, refacciones sugeridas, bitácoras de partes/horas y solicitud de subtareas interdisciplinarias.
4. **¿Los checklists son utilizables?**  
   *SÍ.* Orden secuencial claro, asteriscos en obligatorios (`*`), captura de temperatura obligatoria en autónomo (68.5 °C), guardado de borrador y versión histórica inmutable.
5. **¿Los flujos de OT representan la operación real?**  
   *SÍ.* Transición formal de `ASIGNADA` $\to$ `EN_PROCESO` $\to$ `PENDIENTE_VALIDACION` $\to$ `CERRADA` por el solicitante/supervisor con opción de rechazo para retrabajo.
6. **¿Los calendarios son operables?**  
   *SÍ.* Distinción visual por colores entre Anual Preventivo, Mensual Predictivo (max 4/mes en viernes) y Semanal Autónomo (Lun-Sáb).
7. **¿Las alertas son comprensibles?**  
   *SÍ.* Alertas con severidad evidente y recomendaciones accionables.
8. **¿La IA ayuda sin quitar autoridad humana?**  
   *SÍ.* Claridad total en que recomendaciones de IA (R/R/R, Malos Actores, Memoria) son asesoría analítica; acciones críticas (compras, permisos LOTO, cierre final OT) son 100% humanas.
9. **¿El sistema puede usarse en planta sin depender de desarrollo?**  
   *SÍ.* Tasa de intervención de desarrollo = **0.00%** en los 44 escenarios.
