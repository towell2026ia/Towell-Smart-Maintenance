# TSMAI_PILOT_GO_LIVE_CHECKLIST — Pilot Go-Live Readiness Checklist v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Fase:** `CONTROLLED USER ACCEPTANCE TESTING & PILOT GO-LIVE READINESS`  
**Subfase:** `PILOT GO-LIVE READINESS`  
**Versión:** `1.0`  
**Fecha de Emisión:** 2026-08-23  
**Baseline Certificada:** `TSMAI-MULTIAGENT-BASELINE-1.0`  
**Alcance del Piloto:** Área Planta Física / Tejido (`PF`), Telares Seleccionados, Técnicos y Solicitantes Designados  
**Veredicto de Preparación:** **`TSMAI_PILOT_GO_LIVE_READY` 🚀**  

---

## 1. Matriz de Verificación para Puesta en Marcha del Piloto

| Categoría | Elemento de Verificación | Criterio de Aceptación | Estado |
| :--- | :--- | :--- | :---: |
| **1. Infraestructura** | Supabase Production Environment | Tablas maestras, RLS y funciones activas | **`PASS` ✅** |
| | Edge Function `agents-orchestrator` | Deno Edge Runtime con adaptador centralizado | **`PASS` ✅** |
| | Secretos y Credenciales de Servidor | 0 secretos en browser, claves gestionadas en backend | **`PASS` ✅** |
| | Respaldo Automatizado de BD | Copias de seguridad diarias programadas en Supabase | **`PASS` ✅** |
| **2. Cuentas y Accesos** | Roles y Usuarios de Planta | Super Admin, Técnicos y Solicitantes cargados | **`PASS` ✅** |
| | Aislamiento de Vistas y Permisos | Solicitante sin acceso a Admin, Técnico solo sus OTs | **`PASS` ✅** |
| | Portal Público | Acceso abierto sin login para generación de solicitudes | **`PASS` ✅** |
| **3. Catálogos Maestros** | Catálogo de Máquinas (`cat_maquinas`) | Códigos de máquinas y áreas (PF, CF, TF, AF) validados | **`PASS` ✅** |
| | Catálogo de Refacciones (`cat_refacciones`) | 3,869 refacciones con precios unitarios oficiales | **`PASS` ✅** |
| | Checklists Oficiales | Familias OT_CHECKLIST, LEVANTAMIENTOS estandarizadas | **`PASS` ✅** |
| **4. Calendarios** | Plan Anual Preventivo | 1 preventivo por máquina programado sin duplicados | **`PASS` ✅** |
| | Plan Mensual Predictivo | Viernes programados con límite de max 4/mes | **`PASS` ✅** |
| | Plan Semanal Autónomo | Balance lunes a sábado sin sobrepasar capacidad técnica | **`PASS` ✅** |
| **5. Capacitación** | Capacitación a Solicitantes | Crear solicitud, seguimiento de folio y validación de cierre | **`PASS` ✅** |
| | Capacitación a Técnicos | Ejecutar checklist, registrar bitácora, partes y subtareas | **`PASS` ✅** |
| | Capacitación a Super Admin | Triaje de OTs, asignación, aprobaciones y calendarios | **`PASS` ✅** |
| **6. Monitoreo y Soporte** | Registro de Auditoría (`bitacora_ejecuciones_agente`) | Trazabilidad por correlation_id y costos de IA | **`PASS` ✅** |
| | Canal de Soporte de Primer Nivel | Mesa de ayuda interna designada para dudas de planta | **`PASS` ✅** |
| | Plan de Contingencia y Rollback | Procedimiento `TSMAI_PILOT_ROLLBACK_PLAN.md` activo | **`PASS` ✅** |

---

## 2. Criterios de Éxito del Piloto Controlado

```text
================================================================================
🎯 CRITERIOS DE EVALUACIÓN DEL PILOTO CONTROLADO:
================================================================================
   1. Solicitudes generadas vs atendidas en tiempo y forma.
   2. Tasa de cumplimiento de checklists preventivos, predictivos y autónomos.
   3. Cero pérdida de datos o desincronización en intervenciones de campo.
   4. Preservación del 100% de autoridad humana en compras y cierres de OT.
   5. Costo de IA monitoreado y contenido dentro del presupuesto establecido.
================================================================================
```

---

## 3. Emisión de Gate de Preparación para Piloto

Habiendo validado todos los puntos de la lista de verificación:

**`TSMAI_PILOT_GO_LIVE_READY` 🚀**
