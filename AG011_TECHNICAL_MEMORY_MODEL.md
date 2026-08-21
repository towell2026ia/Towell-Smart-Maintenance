# AG-011 — Technical Memory Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-TECHNICAL-MEMORY-MODEL-001`  

---

## 1. Definición Formal de Memoria Técnica

Una **Memoria Técnica** en TSM-AI es una unidad estructurada, gobernada y versionada de conocimiento de ingeniería de mantenimiento que documenta:
- Una condición o modo de falla verificado.
- Observaciones físicas y síntomas técnicos validados.
- La causa raíz confirmada (si fue identificada y validada humanamente).
- Un procedimiento de intervención validado con repuestos y herramientas requeridas.
- El resultado esperado y las limitaciones explícitas de aplicación.
- Trazabilidad total a la evidencia operativa que la sustenta.

---

## 2. Estructura Canónica del Item de Memoria Técnica

```json
{
  "memory_id": "MEM-PF-ROD-001",
  "title": "Procedimiento de Reemplazo y Alineación de Rodamientos 6205 en Motor de Telar Tsudakoma",
  "memory_type": "VALIDATED_REPAIR",
  "status": "APPROVED",
  "quality": "STRONG",
  "version": "1.0",
  "scope": {
    "scope_level": "MACHINE_MODEL",
    "asset_id": null,
    "machine_model": "TSUDAKOMA ZAX9100",
    "machine_family": "TELAR DE AIRE",
    "component_id": "MOTOR_PRINCIPAL",
    "department": "PF",
    "required_conditions": ["Vibración > 4.5 mm/s", "Temperatura rodamiento > 70°C"],
    "excluded_conditions": ["Falla eléctrica en devanado", "Desbalance en volante"]
  },
  "technical_content": {
    "condition_description": "Desgaste severo en pista de rodamiento provocando sobrecarga térmica en motor.",
    "validated_observations": [
      "Zumbido audible de alta frecuencia antes del disparo del térmico",
      "Marcas de pitting en pista exterior de rodamiento inspeccionado"
    ],
    "confirmed_root_cause": "Degradación prematura del lubricante por contaminación con polvillo textil.",
    "validated_procedure": "1. Desmontar motor. 2. Extraer rodamiento con extractor mecánico. 3. Limpiar alojamiento. 4. Montar rodamiento 6205-2RS con prensa hidráulica. 5. Lubricar con grasa sintética grado 2.",
    "expected_outcome": "Restablecimiento de temperatura operativa < 55°C y nivel de vibración < 2.0 mm/s.",
    "required_parts": ["RODAMIENTO-6205-2RS", "GRASA-SINT-NLGI2"],
    "required_tools": ["EXTRACTOR-MECANICO-3G", "PRENSA-HIDRAULICA", "TERMOMETRO-INFRARROJO"],
    "safety_warnings": ["Bloqueo y etiquetado LOTO en interruptor principal", "Esperar enfriamiento del motor"]
  },
  "evidence": [
    {
      "evidence_id": "EV-OT-4021",
      "evidence_class": "VALIDATED_INTERVENTION",
      "source_type": "WORK_ORDER",
      "source_id": "OT-4021",
      "fact_statement": "Reemplazo de rodamiento 6205 solucionó paro térmico recurrente.",
      "occurred_at": "2026-06-15T14:30:00Z"
    }
  ],
  "limitations": [
    "No aplica si el eje del rotor presenta desgaste dimensional > 0.05 mm",
    "Requiere verificación de aislamiento antes de energizar"
  ],
  "origin_case_ids": ["CASE-HIST-4021", "CASE-HIST-4105"],
  "origin_analysis_ids": ["RCA-2026-06-001"],
  "created_at": "2026-08-21T10:00:00Z",
  "effective_from": "2026-08-21T10:00:00Z",
  "effective_to": null,
  "supersedes_memory_id": null,
  "superseded_by_memory_id": null,
  "approval": {
    "reviewer_email": "jefe.mantenimiento@towell.com",
    "reviewer_role": "SUPER_ADMIN",
    "decision": "APPROVED",
    "reviewed_at": "2026-08-21T11:00:00Z",
    "approval_notes": "Procedimiento validado tras 3 intervenciones exitosas en telares ZAX.",
    "evidence_snapshot_sha256": "4a7d...3f"
  }
}
```
