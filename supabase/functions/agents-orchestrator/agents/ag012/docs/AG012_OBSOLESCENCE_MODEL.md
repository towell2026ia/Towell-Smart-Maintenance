# AG-012 — Obsolescence Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Modelo de Obsolescencia y Ciclo de Vida

La obsolescencia evalúa la viabilidad tecnológica y de suministro de un activo en el tiempo:

### A. Factores Evaluados
- **Estado de Soporte del Fabricante**: Activo soportado, en fin de vida (EOL) o descontinuado.
- **Disponibilidad Comercial de Repuestos Críticos**: Dificultad de abastecimiento de componentes clave (tarjetas de control, servomotores).
- **Compatibilidad Tecnológica**: Capacidad de integración con los sistemas de control y automatización de la planta.

---

## 2. Invariantes de Obsolescencia
- `AGE != OBSOLESCENCE` (Una máquina de 15 años bien mantenida y con repuestos estándar no es obsoleta).
- `CURRENT_STOCK = 0 != PART_OBSOLETE` (La falta de stock en almacén local no significa que la refacción esté descontinuada en el mercado).
- `UNKNOWN_AGE != OLD != NEW`.
