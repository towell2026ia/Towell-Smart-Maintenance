# AG-011 — Database Interaction Map v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-DATA-MAP-001`  

---

## 1. Mapa de Interacción con la Base de Datos

AG-011 interactúa con el sistema a través de dos canales claramente delimitados:

```text
[ CONSUMO DE EXPEDIENTE OPERATIVO ]
       M-010 Asset 360 (vía API/Edge Module)
               ├── public.cat_maquinas (Identidad del activo)
               ├── public.ordenes_trabajo (OTs históricas cerradas)
               ├── public.bitacora_fallas (Reportes de falla)
               ├── public.hallazgos_tecnicos (Inspecciones y desgastes)
               └── public.ot_repuestos (Consumo real de partes)

[ GOBERNANZA Y PERSISTENCIA DE MEMORIA ]
       AG-011 Capa de Conocimiento
               ├── public.memorias_tecnicas (Metadatos, título, tipo, alcance)
               ├── public.memoria_versiones (Contenido técnico versionado)
               ├── public.memoria_evidencias (Vínculos de trazabilidad)
               └── public.memoria_aprobaciones (Registro de revisión humana)
```

---

## 2. Invariantes de Acceso a Datos

- **Lectura Histórica Gobernada:** AG-011 nunca realiza consultas SQL `JOIN` complejas arbitrarias contra tablas maestras; delega en `M-010` para obtener el paquete de expediente `M010Asset360Context`.
- **Cero Duplicación de Historial:** AG-011 no clona ni almacena copias redundantes de las tablas de órdenes de trabajo. Solo guarda referencias de procedencia (`source_references`) y hashes de evidencia.
- **Inmutabilidad de Versiones:** Cada versión de memoria es append-only; las actualizaciones generan un nuevo registro de versión que reemplaza (`supersedes`) la versión anterior.
