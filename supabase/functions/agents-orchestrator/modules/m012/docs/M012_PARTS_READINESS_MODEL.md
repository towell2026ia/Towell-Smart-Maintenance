# M-012 — Parts Readiness Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Modelo de Preparación de Refacciones

M-012 identifica y evalúa refacciones necesarias para la ejecución pre-OT bajo distinciones semánticas estrictas:

### A. Clasificación de Necesidad
- `REQUIRED`: Imprescindible para ejecutar la tarea principal (ej. rodamiento a sustituir).
- `RECOMMENDED`: Sugerida por memoria técnica o procedimiento validado (ej. sello o junta complementaria).
- `OPTIONAL`: Elemento contingente si se encuentra desgaste adicional.
- `UNKNOWN`: Refacción mencionada sin nivel de criticidad definido.

### B. Distinción de Estados Operativos
- `IDENTIFIED_PART`: Parte identificada documentalmente como requerida/recomendada.
- `RESERVED_PART`: Parte formalmente apartada en almacén para la OT. (**M-012 NO reserva inventario**).
- `CONSUMED_PART`: Parte efectivamente utilizada durante la ejecución. (**M-012 prepara antes de ejecución; no registra consumo**).

---

## 2. Invariantes de Refacciones
- `identified_part != reserved_part`: Identificar una refacción no implica que esté reservada.
- `planned_part != consumed_part`: Planificar una refacción no equivale a haberla consumido.
- `unknown_stock != zero_stock`: Si no hay integración de inventario en tiempo real, el estado es `UNKNOWN`, nunca `0` ni inventado.
- `purchase_creation_by_M012 = 0`: M-012 no genera órdenes de compra.
- `inventory_reservation_by_M012 = 0`: M-012 no realiza reservas directas de almacén.
- `invented_part = 0`: Toda refacción debe provenir de plan preventivo, memoria técnica validada, historial o entrada humana documentada.
