# AG-012 — Data Sufficiency Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-012 — Reparar, Renovar o Reemplazar`  
**Token de Freeze:** `AG012-DATA-MAP-001`  

---

## 1. Modelo de Suficiencia de Datos para Recomendación Responsable

AG-012 no emite recomendaciones forzadas cuando la base de evidencia es insuficiente para respaldar una decisión de inversión o reemplazo:

### A. Cálculo del Índice de Suficiencia de Datos (DSI)
$$DSI = \frac{\text{factores\_con\_datos\_certificados}}{\text{total\_factores\_requeridos}} \times 100\%$$

### B. Umbrales de Decisión
- **DSI $\ge 70\%$**: Suficiencia Alta. Se emite recomendación (`REPAIR`, `RENEW`, `REPLACE`) con alta confianza.
- **$50\% \le \text{DSI} < 70\%$**: Suficiencia Moderada. Se emite recomendación con advertencias explícitas de vacíos de información.
- **$\text{DSI} < 50\%$ o Ausencia de Datos Críticos**: Suficiencia Insuficiente. El sistema emite estrictamente `INSUFFICIENT_DATA` y lista la información faltante.

---

## 2. Invariante de Suficiencia
- `forced_recommendation_with_insufficient_data = 0`.
- La confianza de la recomendación se basa matemáticamente en DSI, nunca en una "confianza del LLM".
