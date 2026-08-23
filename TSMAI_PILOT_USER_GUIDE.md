# TSMAI_PILOT_USER_GUIDE — Guía Operacional del Piloto en Planta v1.0

**Producto:** Towell Smart Maintenance AI (TSM-AI)  
**Proyecto:** TSM-AI  
**Fase:** `CONTROLLED PLANT PILOT GO-LIVE`  
**Área Canónica del Piloto:** `PF — PRODUCCIÓN` (Tejido / Telares)  
**Versión:** `1.0`  
**Fecha de Publicación:** 2026-08-23  

---

## 1. Guía Rápida para el Solicitante (Operador / Supervisor de Producción)

### ¿Cómo reportar una falla o solicitud de mantenimiento?
1. **Acceder al Portal Público:** Abre el enlace de TSM-AI en cualquier navegador o celular de planta (no requiere inicio de sesión).
2. **Seleccionar Área y Máquina:** Selecciona **`PF - Tejido (Producción)`** y el telar correspondiente (ej. `MQ-TEL-01`).
3. **Describir el Problema:** Escribe en lenguaje claro qué está ocurriendo (ej. *"Fuga de aceite en la orilla derecha"* o *"Vibración excesiva en rodillo"*).
4. **Enviar Solicitud:** Haz clic en **Enviar Solicitud**. Recibirás inmediatamente un Folio oficial (ej. `PF26-0015`).
5. **Validación y Cierre de Trabajo:** Una vez que el técnico termine su intervención, ingresa con tu folio para verificar el trabajo. Si la máquina opera correctamente, firma la validación para **CERRAR** la OT; si persiste la falla, rechaza el trabajo indicando el motivo para que el técnico realice un retrabajo.

---

## 2. Guía Rápida para el Técnico de Mantenimiento

### ¿Cómo atender y documentar una Orden de Trabajo (OT)?
1. **Iniciar Sesión:** Ingresa con tu cuenta de técnico asignada.
2. **Consultar OTs Asignadas:** En tu panel principal verás exclusivamente las OTs asignadas a tu persona.
3. **Ejecutar Checklist:** Abre la OT y responde las preguntas de inspección. Los campos obligatorios están marcados con un asterisco (`*`).
4. **Levantamiento Autónomo / Predictivo:** En rutinas de lubricación o autónomas, recuerda que la captura de la **temperatura de chumaceras/rodamientos en °C** es obligatoria.
5. **Registrar Bitácora y Refacciones:** Indica las horas invertidas y las refacciones utilizadas seleccionadas del catálogo oficial.
6. **Solicitar Subtareas Interdisciplinarias:** Si durante un trabajo mecánico detectas un problema eléctrico, haz clic en **Solicitar Subtarea**, elige el área `ELECTRICA` y la fecha requerida para que el Administrador asigne al especialista.
7. **Enviar a Validación:** Al concluir, adjunta tu evidencia fotográfica y cambia el estado a **`PENDIENTE_VALIDACION`** para que el solicitante apruebe el cierre.

---

## 3. Guía Rápida para el Super Administrador (Jefatura y Planeación)

### ¿Cómo gestionar el flujo operativo integral?
1. **Bandeja de Solicitudes:** Revisa las solicitudes entrantes priorizadas por criticidad (`ALTA`, `MEDIA`, `BAJA`).
2. **Conversión y Asignación:** Convierte la solicitud a Orden de Trabajo formal y asigna al técnico idóneo según especialidad (Mecánica, Eléctrica, Predictivo, etc.).
3. **Control de Calendarios:**
   - **Preventivo Anual:** Verifica la distribución de 1 preventivo por máquina al año sin duplicidades.
   - **Predictivo Mensual:** Revisa las inspecciones programadas los viernes para Telares con límite de 4 al mes.
   - **Autónomo Semanal:** Supervisa el cumplimiento de las rutinas balanceadas de lunes a sábado.
4. **Aprobaciones de Seguridad y Gobernanza:**
   - Las recomendaciones de la IA (AG-012 R/R/R, AG-013 Malos Actores, AG-007 Desviaciones) son **asesoría técnica analítica**.
   - Toda autorización de compras, firmas de permisos de seguridad LOTO (M-013) y paros/arranques de máquina requieren tu **autorización humana explícita**.
5. **Carga de Archivos:** Las cargas masivas de Excel se realizan desde el panel de configuración y quedan auditadas en `control_cargas_archivos`.
