# AG-010 — Source of Truth Matrix v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Agente:** `AG-010 — Cinco Porqués y Casos Anteriores`  
**Freeze:** `AG010-DATA-MAP-001`  

---

## 1. Matriz de Fuentes de la Verdad y Autoridades de Datos

| Variable / Información | Autoridad Primaria | Tipo de Evidencia | Uso Autorizado en RCA | Restricciones de Uso |
| :--- | :--- | :--- | :--- | :--- |
| `asset_id` / Identidad | `cat_maquinas` (M-010) | `CERTIFIED_FACT` | Anclaje del caso analizado | No editable por usuario en runtime |
| `falla_descripcion` (OT) | `ordenes_trabajo` (M-010) | `CERTIFIED_FACT` | Hecho certificado de intervención | Fechas de OT son inmutables |
| `mensaje_original` (Telegram)| `stg_telegram` (M-010) | `OPERATOR_STATEMENT`| Narrativa inicial del problema | Se trata como contenido no verificado |
| `solucion_aplicada` (OT) | `ordenes_trabajo` (M-010) | `CERTIFIED_FACT` | Evidencia de acciones correctivas | No garantiza eliminación definitiva de causa |
| `refacciones_utilizadas`| `refacciones_utilizadas` (M-010)| `CERTIFIED_FACT` | Piezas cambiadas | Hecho físico consumado |
| `recurrencia_falla` | `AG-008` Signals | `DERIVED_SIGNAL` | Frecuencia de repetición | **NO es causa raíz** por sí sola |
| `salud_activo` | `M-011` Health Score | `DERIVED_SIGNAL` | Contexto de degradación | **NO es causa raíz** |
| `hipotesis_cinco_porques`| MiMo (`mimo-v2.5`) | `MODEL_HYPOTHESIS` | Razonamiento causal propuesto | Requiere validación humana para confirmación |
| `causa_raiz_confirmada` | `USUARIO AUTORIZADO` | `HUMAN_CONFIRMED_CAUSE` | Causa raíz oficial certificada | Requiere firma humana o prueba física inequívoca |
