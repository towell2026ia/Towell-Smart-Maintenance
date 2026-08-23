// supabase/functions/agents-orchestrator/modules/m012/resolvers/m012-tools-resources-resolver.ts
// Tools and Resources Resolver for M-012 (v1.0)
// Frozen under Token: M012-TOOLS-RESOURCES-ENGINE-001
// Invariant: invented_tool = 0, technician_assignment = 0, no skills matrix (§44-50 PRD-M-012.2)

import type { PreparationTool, PreparationResource, TechnicalMemoryReference } from '../types/m012.types.ts';

export class M012ToolsResourcesResolver {
  public static resolveTools(
    toolsRaw?: any[],
    memories?: TechnicalMemoryReference[]
  ): PreparationTool[] {
    const toolsMap = new Map<string, PreparationTool>();

    // 1. Ingest tools from input/procedure
    if (toolsRaw && Array.isArray(toolsRaw)) {
      for (const t of toolsRaw) {
        const id = t.tool_id || t.id || t.nombre;
        if (!id) continue;
        toolsMap.set(id, {
          tool_id: id,
          description: t.description || t.descripcion || `Herramienta ${id}`,
          classification: t.classification || 'REQUIRED',
          source: t.source || 'AUTHORIZED_PROCEDURE'
        });
      }
    }

    // 2. Ingest tools from technical memories
    if (memories && Array.isArray(memories)) {
      for (const mem of memories) {
        const memTools = (mem as any).tools_required || [];
        for (const t of memTools) {
          const id = typeof t === 'string' ? t : (t.tool_id || t.id);
          if (!id) continue;
          if (!toolsMap.has(id)) {
            toolsMap.set(id, {
              tool_id: id,
              description: typeof t === 'string' ? t : (t.description || `Herramienta ${id}`),
              classification: 'REQUIRED',
              source: 'APPROVED_TECHNICAL_MEMORY'
            });
          }
        }
      }
    }

    // If no tools documented, return empty array (do not fabricate standard wrenches unless explicitly documented)
    return Array.from(toolsMap.values());
  }

  public static resolveResources(resourcesRaw?: any[]): PreparationResource[] {
    if (!resourcesRaw || !Array.isArray(resourcesRaw)) {
      return [];
    }

    return resourcesRaw.map(r => ({
      resource_type: r.resource_type || 'SPECIALTY',
      description: r.description || r.descripcion || 'Recurso documentado',
      value: r.value || r.valor || 1,
      source: r.source || 'WORK_ORDER_SCOPE'
    }));
  }
}
