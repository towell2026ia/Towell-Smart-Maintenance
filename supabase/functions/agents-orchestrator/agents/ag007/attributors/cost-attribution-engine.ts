// supabase/functions/agents-orchestrator/agents/ag007/attributors/cost-attribution-engine.ts
// Cost Attribution Engine for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: Exact machine and department attribution (§58-65 PRD)

export interface MachineCatalogItem {
  equipo_towell: string;
  clave?: string;
  ax?: string;
  departamento_codigo?: string;
}

export function resolveMachineAttribution(
  rawCandidate: string | null | undefined,
  catalog: MachineCatalogItem[] = []
): { machine_id: string; department: string } {
  if (!rawCandidate) {
    return { machine_id: 'UNATTRIBUTED_MACHINE', department: 'UNATTRIBUTED_DEPT' };
  }

  const str = String(rawCandidate).trim();
  const upper = str.toUpperCase();

  // Match in catalog
  const found = catalog.find(m =>
    (m.equipo_towell && m.equipo_towell.toUpperCase() === upper) ||
    (m.clave && m.clave.toUpperCase() === upper) ||
    (m.ax && m.ax.toUpperCase() === upper)
  );

  if (found) {
    return {
      machine_id: found.equipo_towell,
      department: found.departamento_codigo || 'TF'
    };
  }

  // Canonical fallback
  const canId = upper.startsWith('TELAR-') || upper.startsWith('TOW-') ? upper : (upper.startsWith('TEL') ? upper : `TELAR-${upper}`);
  const dept = canId.includes('COST') ? 'CF' : canId.includes('PINT') ? 'PF' : 'TF';

  return {
    machine_id: canId,
    department: dept
  };
}
