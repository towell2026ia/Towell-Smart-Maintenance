# M-011 — Health & Risk Boundary Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-011 — Índice de Salud y Riesgo`  
**Freeze:** `M011-DATA-MAP-001`  

---

## 1. Fronteras de Autoridad con Otros Módulos y Agentes

| Módulo / Agente | Dominio y Autoridad | Frontera de M-011 | Invariante de Cero Tolerancia |
| :--- | :--- | :--- | :--- |
| **`M-010` (Asset 360)** | Expediente histórico consolidado | M-011 consume contexto desde M-010; M-011 calcula el score | M-010 no calcula scores; M-011 no hace consultas directas |
| **`AG-008` (Fallas)** | Frecuencia, recurrencia, reincidencia, tendencia | M-011 consume outputs de AG-008 como feature de entrada | M-011 **NO** recalcula analítica de fallas ni frecuencias |
| **`AG-007` (Finanzas)** | Costo de mantenimiento, sobrecostos, presupuestos | M-011 evalúa salud física y riesgo operacional técnico | M-011 **NO** calcula costos ni riesgo financiero |
| **`AG-010` (Causa Raíz)**| 5 Porqués, diagnósticos de causa raíz | M-011 provee el score de degradación como contexto | M-011 **NO** infiere causas raíz de fallas |
| **`AG-011` (Memoria)** | Redacción de memorias técnicas e historial | M-011 entrega componentes de salud/riesgo | M-011 **NO** redacta documentos de memoria técnica |
| **`M-012` / `AG-009`** | Preparación y creación de órdenes de trabajo | M-011 emite alertas técnicas si el riesgo es crítico | M-011 **NO** crea ni modifica órdenes de trabajo |
| **`M-013` (Seguridad)**| LOTO, permisos de trabajo seguro, EPP | M-011 mide riesgo operativo del equipo | M-011 **NO** toma decisiones de seguridad laboral |
| **`AG-012` (Decisión)**| Recomendación reparar vs renovar vs reemplazar | M-011 es input técnico esencial para AG-012 | M-011 **NO** toma la decisión final de reemplazo/reparación |
| **`AG-013` (Bad Actors)**| Identificación e interpretación de Malos Actores | M-011 entrega health/risk como contexto para AG-013 | Un activo con riesgo alto **NO** es automáticamente Bad Actor |

---

## 2. Invariante Clave: Salud $\neq$ Riesgo

```text
================================================================================
ÍNDICE DE SALUD (HEALTH SCORE):
- Rango: 0 a 100 (100 = Óptimo, 0 = Degradado Crítico).
- Qué mide: Condición física observable del activo.
- Influenciado por: Fallas recientes, cumplimiento preventivo, paros, hallazgos.
- NO influenciado por: Criticidad de la máquina, costos financieros.

ÍNDICE DE RIESGO (RISK SCORE):
- Rango: 0 a 100 (0 = Mínimo/Nulo, 100 = Riesgo Crítico).
- Qué mide: Exposición operativa y potencial de impacto.
- Influenciado por: Degradación de salud, criticidad de la máquina, recurrencia/tendencia AG-008, severidad de hallazgos.
================================================================================
```
