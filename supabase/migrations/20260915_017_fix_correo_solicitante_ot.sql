-- ============================================================================
-- MIGRACION: Anadir campos de identificacion del solicitante a ordenes_trabajo
-- PRD: Fix-cierre-OT - permite que isStrictOriginalApplicant funcione correctamente
-- ============================================================================

-- Agregar correo del solicitante como campo de texto (sin FK para evitar restricciones)
ALTER TABLE public.ordenes_trabajo
    ADD COLUMN IF NOT EXISTS correo_solicitante TEXT NULL,
    ADD COLUMN IF NOT EXISTS id_solicitante_app UUID NULL;

-- Indices para busquedas por correo y UUID
CREATE INDEX IF NOT EXISTS idx_ot_correo_solicitante ON public.ordenes_trabajo(correo_solicitante);
CREATE INDEX IF NOT EXISTS idx_ot_id_solicitante_app ON public.ordenes_trabajo(id_solicitante_app);

-- Intentar rellenar correo_solicitante desde solicitudes_mantenimiento para registros existentes
UPDATE public.ordenes_trabajo ot
SET correo_solicitante = u.correo
FROM public.cat_usuarios_roles u
JOIN public.solicitudes_mantenimiento sm ON sm.solicitante_id = u.id_usuario
WHERE sm.folio_solicitud = ot.folio
  AND ot.correo_solicitante IS NULL;
