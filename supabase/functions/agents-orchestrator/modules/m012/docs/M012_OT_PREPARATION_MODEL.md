# M-012 — OT Preparation Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-012 — Preparación de la OT`  
**Token de Freeze:** `M012-DATA-MAP-001`  

---

## 1. Arquitectura del Paquete de Preparación de la OT

El modelo canónico de M-012 estructura integralmente toda la preparación pre-ejecución sin mutar la OT existente:

```json
{
  "work_order_id": "OT-2026-0801",
  "asset_id": "TELAR-501",
  "evaluation_at": "2026-08-22T20:00:00.000Z",
  "scope_snapshot": {
    "title": "Reemplazo de rodamiento motor principal",
    "maintenance_type": "CORRECTIVE",
    "component_id": "MOTOR_PRINCIPAL",
    "department": "PF",
    "requested_activities": ["Desmontar motor", "Cambiar rodamiento 6205", "Prueba de giro"]
  },
  "asset_context": {
    "machine_model": "TSUDAKOMA ZAX9100",
    "machine_family": "TELAR DE AIRE",
    "m010_summary": "12 intervenciones previas en 2026",
    "m011_health_score": 78,
    "m011_risk_score": 35
  },
  "technical_memories": [
    {
      "memory_id": "MEM-ZAX-001",
      "version": "1.0",
      "status": "APPROVED",
      "applicability": "DIRECTLY_APPLICABLE",
      "key_procedure": "Procedimiento validado con extractor mecánico y lubricación NLGI 2"
    }
  ],
  "checklist_context": {
    "checklist_id": "CHK-ZAX-CORR-01",
    "checklist_name": "Checklist de Cierre y Verificación Correctiva ZAX",
    "resolution_source": "AG-006 / Catálogo de Formatos"
  },
  "parts": [
    {
      "part_id": "RODAMIENTO-6205-2RS",
      "description": "Rodamiento rígido de bolas 2RS",
      "quantity_planned": 1,
      "classification": "REQUIRED",
      "source": "APPROVED_TECHNICAL_MEMORY",
      "stock_status": "AVAILABLE_IN_STOCK"
    }
  ],
  "tools_resources": [
    {
      "tool_id": "EXTRACTOR-MECANICO-RODAMIENTOS",
      "description": "Extractor de 3 garras para rodamientos",
      "classification": "REQUIRED",
      "source": "APPROVED_TECHNICAL_MEMORY"
    }
  ],
  "dependencies": [],
  "safety_dependencies": [
    {
      "dependency_id": "SAF-DEP-01",
      "type": "LOTO_REQUIRED",
      "description": "Bloqueo y etiquetado de alimentación eléctrica principal de telar",
      "status": "IDENTIFIED_PENDING_M013"
    }
  ],
  "missing_information": [],
  "readiness": {
    "status": "READY",
    "readiness_score": 100,
    "blocking_reasons": [],
    "warnings": []
  },
  "traceability": {
    "preparation_engine_version": "1.0",
    "data_map_sha256": "M012-DATA-MAP-001",
    "all_items_traceable": true
  }
}
```

---

## 2. Invariante de Frontera
La preparación es un snapshot informativo de recursos; **no autoriza la ejecución** ni emite autorizaciones de seguridad.
