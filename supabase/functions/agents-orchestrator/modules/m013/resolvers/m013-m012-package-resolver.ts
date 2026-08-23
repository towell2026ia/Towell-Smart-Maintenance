// supabase/functions/agents-orchestrator/modules/m013/resolvers/m013-m012-package-resolver.ts
// M-012 Preparation Package Ingestion Resolver (v1.0)
// Frozen under Token: M013-M012-HANDOFF-001

import type { OTPreparationPackage } from '../../m012/types/m012.types.ts';

export class M013M012PackageResolver {
  public static resolve(m012Package?: OTPreparationPackage): {
    safety_dependencies: any[];
    maintenance_type: string;
    scope_snapshot: any;
    has_package: boolean;
  } {
    if (!m012Package) {
      return {
        safety_dependencies: [],
        maintenance_type: 'CORRECTIVE',
        scope_snapshot: null,
        has_package: false
      };
    }

    return {
      safety_dependencies: m012Package.safety_dependencies || [],
      maintenance_type: m012Package.scope_snapshot ? m012Package.scope_snapshot.maintenance_type : 'CORRECTIVE',
      scope_snapshot: m012Package.scope_snapshot || null,
      has_package: true
    };
  }
}
