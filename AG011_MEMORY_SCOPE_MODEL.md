# AG-011 — Memory Scope Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-011 — Memoria Técnica`  
**Subfase:** `AG-011.1 — Technical Memory Data Architecture, Knowledge Governance & Retrieval Map`  
**Fecha:** `2026-08-21`  
**Freeze Token:** `AG011-MEMORY-SCOPE-001`  

---

## 1. Niveles de Alcance Técnico (Scope Hierarchy)

El alcance de una memoria técnica determina con precisión en qué activos, modelos o contextos operativos es válida su aplicación:

```text
[ GENERAL ] (Toda la planta / estándar de ingeniería transversal)
     ▲
[ DEPARTMENT ] (Área de Planta, ej. Tintorería, Tejeduría, Hilatura)
     ▲
[ MACHINE_FAMILY ] (Familia técnica, ej. Telares de Aire, Rameadoras)
     ▲
[ MACHINE_MODEL ] (Modelo exacto de fabricante, ej. Tsudakoma ZAX9100)
     ▲
[ COMPONENT ] (Componente estandarizado, ej. Variador Yaskawa A1000)
     ▲
[ ASSET_SPECIFIC ] (Máquina individual única, ej. TELAR-401)
```

---

## 2. Reglas de Promoción de Alcance (Scope Governance)

1. **Nivel por Defecto:** Toda experiencia originada en un solo activo inicia en `ASSET_SPECIFIC`.
2. **Promoción a `MACHINE_MODEL`:** Requiere verificación en al menos 2 activos distintos del mismo modelo o ratificación formal de ingeniería.
3. **Promoción a `MACHINE_FAMILY` o `GENERAL`:** Requiere aprobación formal humana de Nivel Super Admin / Jefe de Planta.
4. **Prohibición de Expansión Automática:**
   $$\text{unsupported\_scope\_expansion} = 0$$
   El frontend o la IA no pueden ampliar el alcance de un procedimiento sin justificación documental y evidencia empírica.
