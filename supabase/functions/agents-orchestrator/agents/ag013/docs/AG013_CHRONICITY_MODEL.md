# AG-013 — Chronicity Model v1.0

**Agente:** `AG-013 — Analista de Malos Actores`  
**Subfase:** `AG-013.1 — Bad Actor Data Architecture`  
**Token de Freeze:** `AG013-CHRONICITY-001`  

---

## 1. Modelo de Cronicidad (Chronicity vs Frequency)

La cronicidad mide la **persistencia en el tiempo** de las anomalías operativas y la ineficacia de las soluciones previas, no únicamente el volumen bruto de eventos.

### Diferenciación Fundamental:
$$\text{FRECUENCIA} \neq \text{CRONICIDAD}$$

- **Frecuencia:** Un activo puede sufrir 5 fallas menores en una sola semana debido a un lote de insumos defectuoso y luego operar 11 meses de forma impecable $\rightarrow$ **NO ES CRÓNICO**.
- **Cronicidad:** Un activo que presenta fallas repetitivas en múltiples trimestres consecutivos a pesar de múltiples intervenciones $\rightarrow$ **COMPORTAMIENTO CRÓNICO**.

---

## 2. Indicadores de Cronicidad Evaluados:

1. **Persistencia Multi-Período (`multi_period_persistence`):** Presencia de eventos de falla en $\ge 2$ trimestres evaluados.
2. **Reincidencia Post-Reparación (`post_repair_recurrence`):** Falla reincidente ocurrida dentro de los 30 días posteriores al cierre de una OT correctiva.
3. **Tendencia Sostenida Desfavorable (`unfavorable_trend`):** Degradación progresiva certificada por AG-008.

---

## 3. Invariantes de Cronicidad:

- `invented_chronicity_signal = 0`: Prohibido inferir persistencia sin evidencia histórica en la ventana analítica.
