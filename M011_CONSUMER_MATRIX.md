# M-011 — Consumer Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Freeze:** `M011-DATA-MAP-001`  

---

## 1. Consumidores Autorizados de M-011

| Consumidor | Rol y Propósito | Datos Entregados por M-011 | Restricciones de Consumo |
| :--- | :--- | :--- | :--- |
| **TSM-AI Dashboard** | Visualización ejecutiva de confiabilidad | `health_score`, `health_state`, `risk_score`, `risk_state`, factores clave | Solo lectura. No permite sobreescritura de score por usuario. |
| **`AG-012` (Reparar / Renovar / Reemplazar)** | Toma de decisiones de ciclo de vida del activo | Score completo, degradación acumulada, componentes y trazabilidad | AG-012 toma la decisión final; M-011 provee el insumo técnico. |
| **`AG-013` (Bad Actors)** | Análisis de recurrencia de máquinas críticas | Score de riesgo, salud y tendencia de degradación | Un activo con riesgo alto no es calificado automáticamente como Bad Actor por M-011. |
| **`M-012` (Preparación OT)** | Preparación de intervenciones complejas | Estado de salud y hallazgos críticos abiertos | M-011 no genera la OT directamente. |
| **`AG-001` (Master Orchestrator)** | Coordinación de flujos multi-agente | Resumen ejecutivo de salud y riesgo | Gobierno central de eventos. |
