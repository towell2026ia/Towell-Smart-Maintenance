# M-010 — Consumer Context Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Módulo:** `M-010 — Expediente Único del Activo`  
**Token de Freeze:** `M010-DATA-MAP-001`  

---

## 1. Matriz de Consumo de Contexto Controlado

Para evitar saturación de memoria y consumo innecesario de tokens en los agentes consumidores de TSM-AI, M-010 provee filtros de contexto por sección:

| Agente / Módulo Consumidor | Secciones M-010 Permitidas | Autoridad y Límite Funcional |
| :--- | :--- | :--- |
| **`M-011`** (Salud y Riesgo) | `IDENTITY`, `FAILURES`, `MAINTENANCE`, `DOWNTIME`, `ALERTS` | M-011 calcula el índice de salud y riesgo ponderado. M-010 solo provee el historial. |
| **`AG-010`** (Cinco Porqués) | `IDENTITY`, `FAILURES`, `WORK_ORDERS`, `FINDINGS` | AG-010 analiza relaciones causales históricas y casos anteriores. |
| **`AG-011`** (Memoria Técnica) | `IDENTITY`, `WORK_ORDERS`, `MAINTENANCE`, `TIMELINE` | AG-011 redacta lecciones aprendidas y mejores prácticas. |
| **`M-012`** (Preparación de OT) | `IDENTITY`, `FAILURES` (últimas 5), `PARTS`, `CHECKLISTS` | M-012 arma el paquete de trabajo previo a la intervención. |
| **`AG-012`** (Reparar / Reemplazar) | `IDENTITY`, `WORK_ORDERS`, `FAILURES`, `PARTS`, `TIMELINE` | AG-012 evalúa viabilidad técnica de renovación junto con AG-007 y M-011. |
| **`AG-013`** (Malos Actores) | `IDENTITY`, `FAILURES`, `WORK_ORDERS`, `DOWNTIME`, `ALERTS` | AG-013 realiza la clasificación formal de Bad Actors por impacto. |
| **`AG-001` / UI** | Todas las secciones (con paginación y filtros de fecha) | Vista 360° en portal para gerentes y supervisores. |

---

## 2. Invariante de No Volcado Ciego (`no_uncontrolled_context_dump`)
Los agentes consumidores reciben únicamente las secciones estrictamente requeridas para su labor, acotadas en fecha o cantidad de registros.
