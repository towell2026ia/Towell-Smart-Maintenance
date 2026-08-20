# AG-007 — Cost Domain & Category Map v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA C — ALERTAS`  
**Agente:** `AG-007 — Presupuestos y Costos`  
**Subfase:** `AG-007.1 — Data & Architecture Map`  
**Freeze Token:** `AG007-COST-DOMAIN-MAP-001`  

---

## 1. Dominios Canónicos de Costo

```text
                                  ┌───────────────────────────────┐
                                  │      COSTOS DE MANTENIMIENTO  │
                                  │          (AG-007 SCOPE)       │
                                  └───────────────┬───────────────┘
                                                  │
                ┌───────────────────┬─────────────┴───────┬───────────────────┐
                ▼                   ▼                     ▼                   ▼
        ┌───────────────┐   ┌───────────────┐     ┌───────────────┐   ┌───────────────┐
        │     PARTS     │   │     LABOR     │     │   DOWNTIME    │   │    SERVICE    │
        │ (Refacciones) │   │ (Mano de Obra)│     │(Paros Planta) │   │  (Terceros)   │
        └───────┬───────┘   └───────┬───────┘     └───────┬───────┘   └───────┬───────┘
                │                   │                     │                   │
        [Cant × UnitCost]   [Horas Técnicas]      [Minutos Paro]      [Facturas Serv.]
          (100% MXN)       (Tarifa Pendiente)    (Tarifa Pendiente)    (Si Aplica)
```

---

## 2. Definición Detallada por Dominio

### A. Dominio Refacciones (`CostOrigin = 'PART'`)
- **Descripción:** Refacciones mecánicas, eléctricas, electrónicas, neumáticas y consumibles textiles utilizados en las máquinas de la planta.
- **Fuentes:** `cat_refacciones`, `stg_refacciones_por_maquina_excel`, `bitacora_mantenimiento.refacciones_usadas`.
- **Estatus:** Completamente operativo con precios unitarios en pesos mexicanos (`MXN`).
- **Manejo de faltantes:** Si `costo_unitario` no existe, se clasifica como `COST_NOT_AVAILABLE` (no asumir $0.00).

### B. Dominio Mano de Obra (`CostOrigin = 'LABOR'`)
- **Descripción:** Tiempo y dedicación de los 26 técnicos especializados en turnos de trabajo y órdenes de servicio.
- **Fuentes:** `ordenes_trabajo.tiempo_atencion_min`, `cat_tecnicos`, `bitacora_mantenimiento`.
- **Estatus:** Horas técnicas disponibles. Tarifa salarial horaria no configurada (`LABOR_RATE_NOT_AVAILABLE`).
- **Manejo de cálculo:** AG-007 totaliza `total_technical_hours`; si se introduce una tarifa oficial $/hr en el futuro, el motor calculará $Horas \times Tarifa$.

### C. Dominio Paros de Planta (`CostOrigin = 'DOWNTIME'`)
- **Descripción:** Tiempo fuera de servicio de telares y equipos por averías no programadas o intervenciones.
- **Fuentes:** `stg_telegram_ordenes_telares` (`hora_fin - hora`), `paros_maquina`.
- **Estatus:** Minutos de paro registrados con precisión. Tarifa de lucro cesante o costo por minuto de paro no configurada (`DOWNTIME_FINANCIAL_IMPACT_NOT_AVAILABLE`).
- **Separación Contable Obligatoria:** El impacto de paros (`DOWNTIME_IMPACT_COST`) se mantiene estrictamente separado del costo directo de mantenimiento (`DIRECT_MAINTENANCE_COST`).

### D. Dominio Servicios Externos (`CostOrigin = 'SERVICE'`)
- **Descripción:** Trabajos especializados de terceros (rebobinado de motores, maquinados especiales, calibraciones externas).
- **Fuentes:** Facturas o notas de servicio cargadas.
- **Estatus:** Registrado bajo demanda si se reporta en órdenes de trabajo.

---

## 3. Tipos de Mantenimiento Soportados

| Tipo de Mantenimiento | Código Canónico | Descripción y Comportamiento |
| :--- | :---: | :--- |
| **Preventivo** | `PREVENTIVO` | Rutinas y servicios anuales/periódicos planificados (Presupuesto originado en AG-002). |
| **Correctivo** | `CORRECTIVO` | Atención a fallas imprevistas, roturas de piezas o reportes de operador. |
| **Autónomo** | `AUTONOMO` | Insumos y materiales empleados en limpiezas y ajustes de primer nivel (AG-004). |
| **Predictivo** | `PREDICTIVO` | Intervenciones derivadas de inspecciones sensoriales o análisis de defectos de calidad (AG-003). |
