// supabase/functions/agents-orchestrator/agents/ag002/resolvers/service-resolver.ts
// Service Resolver assigning active preventive service from catalog (§42-44 PRD)

import { DepartmentCode, ServiceCatalogItem } from '../types/ag002.types.ts';

export interface ServiceResolutionResult {
  service: ServiceCatalogItem | null;
  status: 'SERVICE_ASSIGNED' | 'PREVENTIVE_SERVICE_NOT_FOUND' | 'MULTIPLE_PREVENTIVE_SERVICES';
  reason?: string;
}

export function resolvePreventiveService(
  machineId: string,
  department: DepartmentCode,
  servicesCatalog: ServiceCatalogItem[]
): ServiceResolutionResult {
  const activePreventives = servicesCatalog.filter(s => 
    s.activo === true && 
    String(s.tipo_servicio || '').toLowerCase() === 'preventivo'
  );

  if (activePreventives.length === 0) {
    return {
      service: null,
      status: 'PREVENTIVE_SERVICE_NOT_FOUND',
      reason: 'No hay servicios preventivos activos en el catálogo.'
    };
  }

  // 1. Try department-specific matching if department_aplicable is defined
  const deptSpecific = activePreventives.filter(s => s.departamento_aplicable === department);
  if (deptSpecific.length === 1) {
    return {
      service: deptSpecific[0],
      status: 'SERVICE_ASSIGNED'
    };
  }

  // 2. Default to general preventive service (e.g. SRV-LUBI-01 or first active)
  const defaultService = activePreventives.find(s => s.codigo_servicio === 'SRV-LUBI-01') || activePreventives[0];

  return {
    service: defaultService,
    status: 'SERVICE_ASSIGNED'
  };
}
