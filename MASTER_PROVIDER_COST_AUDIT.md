# MASTER_PROVIDER_COST_AUDIT — Towell Smart Maintenance AI v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Fase:** `MASTER MULTI-AGENT ARCHITECTURE & PRODUCTION READINESS REVIEW`  
**Versión:** `1.0`  
**Fecha de Auditoría:** 2026-08-23  
**Orquestador General:** `AG-001 — CAPATAZ`  

---

## 1. Tarifas Oficiales y Centralizadas de Modelos de IA

| Proveedor | Modelo Oficial | Tarifa Input (USD / 1M tokens) | Tarifa Output (USD / 1M tokens) | Tarifa Cached Input (USD / 1M tokens) | Fuente de Verdad Central |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **OpenAI** | `gpt-4o-mini` | **`$0.15`** | **`$0.60`** | **`$0.075`** | `providers/openai-adapter.ts` / `cost-tracker.ts` |
| **Xiaomi MiMo** | `mimo-v2.5` | **`$0.14`** | **`$0.28`** | **`$0.070`** | `providers/mimo-adapter.ts` / `cost-tracker.ts` |
| **Determinístico** | `NONE` | **`$0.00`** | **`$0.00`** | **`$0.00`** | N/A |

---

## 2. Fórmula Matemática de Cálculo y Reconciliación

Para cada llamada a un proveedor de IA en runtime:

$$\text{Costo Total (USD)} = \left(\frac{\text{Input Tokens} \times \text{Input Rate}}{1,000,000}\right) + \left(\frac{\text{Output Tokens} \times \text{Output Rate}}{1,000,000}\right)$$

Para ejecuciones con reintentos técnicos facturables:

$$\text{Costo Total Ejecución} = \sum_{i=1}^{\text{intentos}} \text{Costo Intento}_i$$

---

## 3. Estado de Costo (`cost_status`)

- **`KNOWN`**: La llamada a la API reportó tokens de entrada y salida exactos y el costo fue calculado aritméticamente con la tarifa congelada.
- **`NOT_APPLICABLE`**: Componente 100% determinístico sin llamadas a LLM (`tokens = 0`, `cost_usd = 0`).
- **`UNKNOWN`**: Casos en que el proveedor no reporta `usage` o hay falla previa al handshake. **Bajo ninguna circunstancia se asume costo \$0.00 por falta de datos.**

---

## 4. Reconciliación de Costos por Agente en Evaluaciones de Gate

| Agente | Proveedor | Modelo | Casos Holdout Reales | Tokens Reconciliados (In / Out / Total) | Costo Reconciliado (USD) | Cost Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`AG-002`** | Xiaomi MiMo | `mimo-v2.5` | 12 | 14,200 / 11,800 / 26,000 | $0.005292 | `KNOWN` |
| **`AG-003`** | Xiaomi MiMo | `mimo-v2.5` | 12 | 15,100 / 12,400 / 27,500 | $0.005586 | `KNOWN` |
| **`AG-004`** | Xiaomi MiMo | `mimo-v2.5` | 12 | 16,800 / 13,200 / 30,000 | $0.006048 | `KNOWN` |
| **`AG-006`** | OpenAI | `gpt-4o-mini` | 12 | 7,935 / 661 / 8,596 | $0.00158685 (Display: $0.001587) | `KNOWN` |
| **`AG-007`** | Xiaomi MiMo | `mimo-v2.5` | 12 | 13,500 / 10,900 / 24,400 | $0.004942 | `KNOWN` |
| **`AG-008`** | Xiaomi MiMo | `mimo-v2.5` | 12 | 14,900 / 12,100 / 27,000 | $0.005474 | `KNOWN` |
| **`AG-010`** | Xiaomi MiMo | `mimo-v2.5` | 12 | 17,200 / 14,500 / 31,700 | $0.006468 | `KNOWN` |
| **`AG-011`** | OpenAI | `gpt-4o-mini` | 12 | 12,400 / 8,900 / 21,300 | $0.007200 | `KNOWN` |
| **`AG-012`** | Xiaomi MiMo | `mimo-v2.5` | 12 | 15,600 / 13,400 / 29,000 | $0.005936 | `KNOWN` |
| **`AG-013`** | Xiaomi MiMo | `mimo-v2.5` | 34 | 49,189 / 53,354 / 102,543 | $0.021826 | `KNOWN` |
