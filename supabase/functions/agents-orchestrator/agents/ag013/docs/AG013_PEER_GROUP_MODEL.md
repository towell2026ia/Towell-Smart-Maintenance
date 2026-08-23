# AG-013 — Peer Group Model v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-DATA-MAP-001`  

---

## 1. Modelo de Grupos de Pares (Peer Groups)

Para determinar si el comportamiento de un activo se desvía de la norma de manera material y sostenida, AG-013 agrupa los activos en grupos de pares homogéneos.

### Dimensiones de Agrupación de Pares:
1. **Área Operativa (`area`):** Comparación dentro de la misma línea o nave productiva.
2. **Familia Tecnológica (`machine_family`):** Comparación entre máquinas de tecnología y diseño similar.
3. **Nivel de Criticidad (`criticality_class`):** `HIGH`, `MEDIUM`, `LOW`.

---

## 2. Invariantes de Pares

- `invented_peer_group = 0`: Prohibido inventar grupos o taxonomías que no existan en el expediente de `M-010`.
- **Límites de Señales Cruzadas:** No aplicar métricas de calidad de tejido (e.g., `segundas_por_rollo`) a grupos de servicios generales (`cross_area_signal_misapplication = 0`).
