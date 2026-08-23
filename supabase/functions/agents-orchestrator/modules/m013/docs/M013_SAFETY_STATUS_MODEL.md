# M-013 — Safety Status Model v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Rama:** `RAMA E — CONFIABILIDAD Y CONOCIMIENTO`  
**Componente:** `M-013 — Control de Seguridad`  
**Token de Freeze:** `M013-DATA-MAP-001`  

---

## 1. Modelo de Estados de Control de Seguridad

M-013 clasifica determinísticamente el estado de seguridad de la OT:

### A. Catálogo Cerrado de Estados
1. `CONTROLS_COMPLETE`: Todos los requisitos de seguridad exigidos cuentan con evidencia formal válida y confirmaciones humanas autorizadas vigentes.
2. `CONTROLS_INCOMPLETE`: Existen controles no críticos o verificaciones menores pendientes de confirmación.
3. `BLOCKED`: Falta un control mandatorio crítico (LOTO no verificado, permiso de trabajo ausente o expirado). Impide el pase a ejecución en AG-009.
4. `REVIEW_REQUIRED`: Existen evidencias contradictorias entre checklist, bitácora y permisos.
5. `NOT_EVALUATED`: Estado previo a la evaluación de M-013.

---

## 2. Invariantes de Estado
- **`CONTROLS_COMPLETE != WORK_ORDER_EXECUTION_AUTHORIZED`**: Cumplir los controles de seguridad no sustituye la orden de arranque operacional de producción.
- **`CONTROLS_COMPLETE != SAFE_TO_START_AUTONOMOUSLY`**: M-013 no declara la máquina físicamente segura por sí mismo; certifica que la evidencia requerida está completa.
