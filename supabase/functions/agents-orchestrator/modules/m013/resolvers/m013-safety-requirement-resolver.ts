// supabase/functions/agents-orchestrator/modules/m013/resolvers/m013-safety-requirement-resolver.ts
// Safety Requirement Resolver enforcing invented_safety_requirement = 0 (v1.0)
// Frozen under Token: M013-SAFETY-REQUIREMENT-RULES-001

import type { SafetyRequirement } from '../types/m013.types.ts';

export class M013SafetyRequirementResolver {
  public static resolve(
    m012Dependencies: any[],
    workOrderRaw?: any,
    memories?: any[]
  ): SafetyRequirement[] {
    const requirements: SafetyRequirement[] = [];

    // 1. Requisitos derivados de dependencias de M-012
    if (m012Dependencies && Array.isArray(m012Dependencies)) {
      for (const dep of m012Dependencies) {
        requirements.push({
          requirement_id: `REQ-${dep.dependency_id || 'M012-01'}`,
          requirement_type: (dep.dependency_type || 'LOTO_REQUIRED') as any,
          description: dep.description || 'Requisito de seguridad identificado en preparación M-012',
          source: 'M-012 Preparation Package',
          is_blocking: true,
          requires_human_confirmation: true,
          required_role: 'SUPERVISOR'
        });
      }
    }

    // 2. Requisitos derivados de la OT de origen
    if (workOrderRaw && workOrderRaw.seguridad_raw && Array.isArray(workOrderRaw.seguridad_raw)) {
      for (const s of workOrderRaw.seguridad_raw) {
        const reqId = `REQ-${s.id || 'RAW-01'}`;
        if (!requirements.some(r => r.requirement_id === reqId)) {
          requirements.push({
            requirement_id: reqId,
            requirement_type: (s.type || 'LOTO_REQUIRED') as any,
            description: s.description || 'Requisito de seguridad documentado en OT',
            source: 'OT Source Document',
            is_blocking: true,
            requires_human_confirmation: true,
            required_role: 'TECHNICIAN'
          });
        }
      }
    }

    // 3. Requisitos derivados de precauciones críticas en memoria técnica AG-011
    if (memories && Array.isArray(memories)) {
      for (const mem of memories) {
        if (mem.critical_precautions && Array.isArray(mem.critical_precautions)) {
          for (let idx = 0; idx < mem.critical_precautions.length; idx++) {
            const prec = mem.critical_precautions[idx];
            const reqId = `REQ-MEM-${mem.memory_id}-${idx + 1}`;
            if (!requirements.some(r => r.requirement_id === reqId)) {
              requirements.push({
                requirement_id: reqId,
                requirement_type: 'ENERGY_ISOLATION_VERIFICATION',
                description: prec,
                source: `AG-011 Memory (${mem.memory_id})`,
                is_blocking: true,
                requires_human_confirmation: true,
                required_role: 'TECHNICIAN'
              });
            }
          }
        }
      }
    }

    // Default baseline if work order explicitly has requirements configured
    if (requirements.length === 0 && workOrderRaw && workOrderRaw.tipo_mantenimiento === 'PREVENTIVE') {
      requirements.push({
        requirement_id: 'REQ-SAF-PREV-01',
        requirement_type: 'PPE_SPECIAL_REQUIRED',
        description: 'Uso de equipo de protección personal estándar de planta textil',
        source: 'Catálogo de Seguridad Preventiva',
        is_blocking: false,
        requires_human_confirmation: false,
        required_role: 'TECHNICIAN'
      });
    }

    return requirements;
  }
}
