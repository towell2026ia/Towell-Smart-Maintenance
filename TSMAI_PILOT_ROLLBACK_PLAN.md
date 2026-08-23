# TSMAI_PILOT_ROLLBACK_PLAN — Pilot Rollback & Contingency Plan v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Fase:** `CONTROLLED USER ACCEPTANCE TESTING & PILOT GO-LIVE READINESS`  
**Subfase:** `PILOT ROLLBACK & CONTINGENCY STRATEGY`  
**Versión:** `1.0`  
**Fecha de Emisión:** 2026-08-23  
**Baseline Certificada:** `TSMAI-MULTIAGENT-BASELINE-1.0`  

---

## 1. Protocolo de Respuesta ante Contingencias Críticas (Defectos P0 en Piloto)

Si durante la ejecución del piloto en planta se detecta un incidente de severidad **P0** (falla crítica que impida la operación, pérdida de datos o riesgo a la seguridad):

```text
================================================================================
🚨 PROCEDIMIENTO DE DETENCIÓN Y ROLLBACK DEL PILOTO:
================================================================================
   1. ¿CÓMO DETENEMOS EL PILOTO?
      - El Super Administrador activa el modo de mantenimiento en la aplicación PWA.
      - Se suspende la ingesta de nuevos eventos en la Edge Function agents-orchestrator.

   2. ¿CÓMO EVITAMOS NUEVAS TRANSACCIONES?
      - El portal público muestra un aviso informativo de "Mantenimiento programado".
      - Las sesiones activas de técnicos se congelan en modo solo lectura.

   3. ¿CÓMO PRESERVAMOS LOS DATOS CAPTURADOS?
      - Se ejecuta un snapshot inmediato de respaldo en Supabase.
      - Las bitácoras, respuestas de checklists y OTs registradas hasta el momento quedan resguardadas y no se truncan.

   4. ¿CÓMO REGRESAMOS AL PROCESO ANTERIOR?
      - El equipo de planta continúa temporalmente con el registro físico/Telegram de contingencia.
      - Se exporta a Excel el histórico de intervenciones capturadas durante el piloto para no perder la trazabilidad.

   5. ¿CÓMO REANUDAMOS?
      - Se corrige el defecto identificado en el repositorio main.
      - Se ejecutan las suites de regresión (E2E 90 escenarios + UAT 44 escenarios).
      - Se reanuda el piloto con aprobación formal del Super Administrador.
================================================================================
```

---

## 2. Puntos de Contacto para Contingencias

- **Líder Técnico de Mantenimiento:** Responsable de activar la contingencia operativa en planta.
- **Administrador de Base de Datos:** Responsable de la preservación y exportación de respaldos.
- **Equipo de Soporte de TSM-AI:** Responsable del diagnóstico, corrección en código y ejecución de regresión.
