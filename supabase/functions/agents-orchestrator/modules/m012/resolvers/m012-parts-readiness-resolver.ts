// supabase/functions/agents-orchestrator/modules/m012/resolvers/m012-parts-readiness-resolver.ts
// Parts Readiness Resolver for M-012 (v1.0)
// Frozen under Token: M012-PARTS-ENGINE-001
// Invariant: planned != consumed, identified != reserved, unknown_stock != zero, invented_part = 0 (§33-43 PRD-M-012.2)

import type { PreparationPart, TechnicalMemoryReference } from '../types/m012.types.ts';

export class M012PartsReadinessResolver {
  public static resolve(
    partsRaw?: any[],
    memories?: TechnicalMemoryReference[],
    preventiveParts?: any[]
  ): PreparationPart[] {
    const partsMap = new Map<string, PreparationPart>();

    // 1. Ingest parts from OT or Preventive Plan
    if (preventiveParts && Array.isArray(preventiveParts)) {
      for (const p of preventiveParts) {
        const id = p.part_id || p.codigo_refaccion || p.id;
        if (!id) continue;
        partsMap.set(id, {
          part_id: id,
          description: p.description || p.descripcion || `Refacción ${id}`,
          quantity_planned: typeof p.quantity === 'number' ? p.quantity : 1,
          classification: 'REQUIRED',
          source: 'PREVENTIVE_PLAN',
          stock_status: p.stock_status || 'UNKNOWN'
        });
      }
    }

    // 2. Ingest parts from raw OT parts
    if (partsRaw && Array.isArray(partsRaw)) {
      for (const p of partsRaw) {
        const id = p.part_id || p.codigo_refaccion || p.id;
        if (!id) continue;
        const existing = partsMap.get(id);
        const classification = p.classification || (existing ? existing.classification : 'REQUIRED');
        partsMap.set(id, {
          part_id: id,
          description: p.description || p.descripcion || `Refacción ${id}`,
          quantity_planned: typeof p.quantity === 'number' ? p.quantity : 1,
          classification,
          source: p.source || 'WORK_ORDER_SCOPE',
          stock_status: p.stock_status || 'UNKNOWN'
        });
      }
    }

    // 3. Ingest parts recommended by validated technical memories
    if (memories && Array.isArray(memories)) {
      for (const mem of memories) {
        const memParts = (mem as any).recommended_parts || [];
        for (const p of memParts) {
          const id = p.part_id || p.codigo_refaccion || p.id;
          if (!id) continue;
          if (!partsMap.has(id)) {
            partsMap.set(id, {
              part_id: id,
              description: p.description || p.descripcion || `Refacción recomendada ${id}`,
              quantity_planned: typeof p.quantity === 'number' ? p.quantity : 1,
              classification: 'RECOMMENDED',
              source: 'APPROVED_TECHNICAL_MEMORY',
              stock_status: p.stock_status || 'UNKNOWN'
            });
          }
        }
      }
    }

    return Array.from(partsMap.values());
  }
}
