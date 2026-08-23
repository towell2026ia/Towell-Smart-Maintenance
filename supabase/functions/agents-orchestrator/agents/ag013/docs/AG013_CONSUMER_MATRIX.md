# AG-013 — Consumer Matrix v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-DATA-MAP-001`  

---

## 1. Matriz de Consumidores del Paquete Analítico de AG-013

| Consumidor Autorizado | Propósito del Consumo | Formato de Consumo |
| :--- | :--- | :--- |
| **`AG-001 — Capataz Orquestador`** | Orquestación general, trazabilidad y entrega a la UI. | JSON Package / Canonical Event |
| **`Dashboard de Confiabilidad TSM-AI`** | Visualización de activos en Watchlist, Bad Actors y ranking de severidad. | API Response / Payload Analítico |
| **`Gerente de Mantenimiento / Confiabilidad`** | Revisión humana y priorización de recursos de ingeniería. | UI / Reporte Explicado por MiMo |
| **`AG-010 / AG-012 (Indirecto vía AG-001)`** | Contexto analítico para análisis de causa raíz o revisión de reemplazo. | Payload de contexto estructurado |
