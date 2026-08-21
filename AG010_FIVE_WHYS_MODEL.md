# AG-010 — Five Whys Model & Early-Stop Rules v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Token:** `AG010-FIVE-WHYS-MODEL-001`  

---

## 1. Estructura y Reglas del Árbol de Cinco Porqués

El modelo de Cinco Porqués en AG-010 sigue una cadena lógica de preguntas y respuestas secuenciales (Niveles 1 a 5):

1. **Soporte de Evidencia Obligatorio:** Todo nivel marcado como `FACT` debe apuntar a identificadores válidos de evidencia física o documental (`supporting_evidence_ids`).
2. **Permisión de Detención Temprana (`STOP_EARLY`):** Si en el Nivel 2 o 3 se alcanza la causa raíz sustentable o se agotan las evidencias verificadas, el análisis **se detiene válidamente**.
3. **Prohibición de Forzar el 5to Porqué:** Queda estrictamente prohibido inventar preguntas o respuestas ficticias con el único fin de llegar al Nivel 5.
4. **Quiebre de Evidencia:** Si un nivel intermedio no tiene sustento fáctico, los niveles subsecuentes deben declararse explícitamente como `HYPOTHESIS` o `UNSUPPORTED`.

---

## 2. Invariante de Explicabilidad

- Toda cadena de Cinco Porqués debe declarar con total transparencia qué nodos son hechos comprobados y qué nodos son hipótesis inferidas.
