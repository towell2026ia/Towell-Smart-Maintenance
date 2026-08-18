// supabase/functions/agents-orchestrator/agents/ag002/estimators/parts-estimator.ts
// Spare Parts and Budget Estimator (§46-55 PRD)

import { BudgetStatus, PartReferenceItem, PriceStatus, QuantityStatus } from '../types/ag002.types.ts';

export interface EstimatedPartItem {
  cve_refaccion: string;
  nombre?: string;
  cantidad: number;
  costo_unitario?: number;
  price_status: PriceStatus;
  quantity_status: QuantityStatus;
}

export interface PartsEstimationResult {
  parts: EstimatedPartItem[];
  known_cost_total: number;
  budget_status: BudgetStatus;
  unknown_prices_count: number;
}

export function estimatePreventiveParts(
  machineId: string,
  partsCatalog: PartReferenceItem[],
  partsByMachine: PartReferenceItem[] = []
): PartsEstimationResult {
  const m = String(machineId || '').trim().toUpperCase();
  const machineParts = partsByMachine.filter(p => String(p.maquina_id || '').trim().toUpperCase() === m);

  if (machineParts.length === 0) {
    return {
      parts: [],
      known_cost_total: 0,
      budget_status: 'COMPLETE',
      unknown_prices_count: 0
    };
  }

  const estimated: EstimatedPartItem[] = [];
  let totalKnown = 0;
  let unknownCount = 0;
  let knownCount = 0;

  for (const mp of machineParts) {
    const partCode = String(mp.codigo_articulo || '').trim();
    if (!partCode) continue;

    // Lookup in catalog for full metadata
    const catItem = partsCatalog.find(p => p.codigo_articulo === partCode);
    const nombre = mp.nombre_articulo || catItem?.nombre_articulo || partCode;
    
    // Quantity
    const qty = typeof mp.cantidad_estandar === 'number' && mp.cantidad_estandar > 0 ? mp.cantidad_estandar : 1;
    const qtyStatus: QuantityStatus = typeof mp.cantidad_estandar === 'number' ? 'KNOWN_QUANTITY' : 'DERIVED_QUANTITY';

    // Cost
    const unitCost = typeof mp.costo_unitario === 'number' 
      ? mp.costo_unitario 
      : (typeof catItem?.costo_unitario === 'number' ? catItem.costo_unitario : undefined);

    let priceStatus: PriceStatus = 'UNKNOWN_PRICE';
    if (typeof unitCost === 'number') {
      if (unitCost > 0) {
        priceStatus = 'KNOWN_PRICE';
        totalKnown += (qty * unitCost);
        knownCount++;
      } else {
        priceStatus = 'ZERO_PRICE';
        knownCount++;
      }
    } else {
      unknownCount++;
    }

    estimated.push({
      cve_refaccion: partCode,
      nombre,
      cantidad: qty,
      costo_unitario: unitCost,
      price_status: priceStatus,
      quantity_status: qtyStatus
    });
  }

  let bStatus: BudgetStatus = 'COMPLETE';
  if (unknownCount > 0 && knownCount > 0) {
    bStatus = 'PARTIAL';
  } else if (unknownCount > 0 && knownCount === 0) {
    bStatus = 'NO_KNOWN_PRICES';
  }

  return {
    parts: estimated,
    known_cost_total: Math.round(totalKnown * 100) / 100,
    budget_status: bStatus,
    unknown_prices_count: unknownCount
  };
}
