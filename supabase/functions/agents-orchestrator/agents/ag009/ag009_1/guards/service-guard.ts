// supabase/functions/agents-orchestrator/agents/ag009/ag009_1/guards/service-guard.ts
// Service Guard for AG-009.1 (§20 PRD-AG-009.1)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PreventiveConnectorError } from '../errors/preventive-error-catalog.ts';

export interface ServiceValidationOutput {
  service_code: string;
  nombre_servicio: string;
  tipo_servicio?: string;
  duracion_estimada_min?: number;
  activo: boolean;
}

export async function validateServiceGuard(
  supabase: SupabaseClient | null,
  serviceCode: string,
  localServices?: Array<{ codigo_servicio: string; nombre_servicio: string; tipo_servicio?: string; activo?: boolean; duracion_estimada_min?: number }>
): Promise<ServiceValidationOutput> {
  const normCode = serviceCode.trim().toUpperCase();

  let srvRecord: { codigo_servicio: string; nombre_servicio: string; tipo_servicio?: string; activo?: boolean; duracion_estimada_min?: number } | null = null;

  // 1. Consultar Supabase
  if (supabase) {
    const { data, error } = await supabase
      .from('cat_servicios_mantenimiento')
      .select('codigo_servicio, nombre_servicio, tipo_servicio, activo, duracion_estimada_min')
      .eq('codigo_servicio', normCode)
      .maybeSingle();

    if (!error && data) {
      srvRecord = data;
    }
  }

  // 2. Fallback a catálogo local
  if (!srvRecord && localServices) {
    srvRecord = localServices.find(s => s.codigo_servicio.toUpperCase() === normCode) || null;
  }

  // Si no existe el servicio
  if (!srvRecord) {
    throw new PreventiveConnectorError(
      'SERVICE_NOT_FOUND',
      `El servicio con código "${normCode}" no existe en cat_servicios_mantenimiento.`
    );
  }

  // Si el servicio está inactivo
  if (srvRecord.activo === false) {
    throw new PreventiveConnectorError(
      'SERVICE_INACTIVE',
      `El servicio "${normCode}" (${srvRecord.nombre_servicio}) está inactivo y no puede ser asignado a órdenes preventivas.`
    );
  }

  return {
    service_code: srvRecord.codigo_servicio,
    nombre_servicio: srvRecord.nombre_servicio,
    tipo_servicio: srvRecord.tipo_servicio || 'Preventivo',
    duracion_estimada_min: srvRecord.duracion_estimada_min,
    activo: true
  };
}
