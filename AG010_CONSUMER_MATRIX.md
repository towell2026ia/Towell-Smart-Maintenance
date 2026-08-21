# AG-010 — Consumer & Downstream Integration Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Freeze:** `AG010-DATA-MAP-001`  

---

## 1. Consumidores del Análisis Causal de AG-010

| Consumidor | Datos Consumidos de AG-010 | Propósito / Acción en el Consumidor |
| :--- | :--- | :--- |
| **AG-001 Capataz** | `AG010Output` completo | Orquestación, respuesta a usuario y despacho a especialistas. |
| **Dashboard / UI de Mantenimiento** | Cinco Porqués, Hipótesis, Casos Anteriores, Brechas de Datos | Visualización técnica interactiva para técnicos y supervisores. |
| **M-012 / AG-009 Preparación OT** | `recommended_verifications`, refacciones previas exitosas | Incorporación de puntos de inspección específicos en nuevas OTs. |
| **AG-011 Memoria Técnica** | Causas confirmadas (`HUMAN_CONFIRMED_CAUSE`), soluciones exitosas | Transformación de investigaciones cerradas en conocimiento organizacional reusable. |
| **AG-012 Reparar / Reemplazar** | Causa raíz diagnosticada, historial de recurrencia causal | Evaluación del ciclo de vida y viabilidad económica de overhaul vs sustitución. |
| **AG-013 Malos Actores** | Causas recurrentes no resueltas | Identificación de activos con problemas crónicos no resueltos por mantenimiento preventivo. |
