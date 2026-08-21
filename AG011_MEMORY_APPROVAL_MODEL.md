# AG-011 — Memory Approval Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-MEMORY-APPROVAL-001`  

---

## 1. Gobernanza y Autoridad de Aprobación

La aprobación de memorias técnicas es una responsabilidad estrictamente humana:

$$\text{AI\_approved\_memories} = 0$$

Ningún agente de IA (`AG-011`, `AG-010`, `GPT-4.1 Mini`) tiene autoridad para auto-aprobar una memoria técnica ni para cambiar su estado a `APPROVED`.

---

## 2. Roles Autorizados de Aprobación

| Rol en el Sistema | Alcance de Aprobación Permitido | Restricciones |
| :--- | :--- | :--- |
| **`SUPER_ADMIN` / `JEFE_MANTENIMIENTO`** | Todos los niveles (`ASSET_SPECIFIC` hasta `GENERAL`). | Obligatorio registrar notas técnicas y firma digital. |
| **`INGENIERO_CONFIABILIDAD`** | Hasta `MACHINE_FAMILY` y `COMPONENT`. | No puede aprobar procedimientos `GENERAL` de planta sin visto bueno de Jefatura. |
| **`SUPERVISOR_TURNO`** | `ASSET_SPECIFIC` únicamente. | No puede expandir alcance a modelos o familias. |
| **`TECNICO_ESPECIALISTA`** | Generación de comentarios y propuestas de edición. | **Cero autoridad de aprobación.** |

---

## 3. Invariante de No-Heredabilidad de Aprobación

Cualquier cambio material en una memoria técnica aprobada (modificación de pasos de procedimiento, cambio de repuestos, alteración de alcance, eliminación de limitaciones) **invalida automáticamente la aprobación previa** y crea una nueva versión en estado `REVIEW_REQUIRED`.
