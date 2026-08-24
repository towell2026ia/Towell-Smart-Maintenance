// supabase/functions/agents-orchestrator/agents/ag002/estimators/parts-estimator.ts
// Spare Parts Estimator (PRD-AG007-R1 Service-Part Authority)
// Precedence: ASSET + SERVICE OVERRIDE -> SERVICE DEFAULT -> MISSING_MAPPING

import { 
  BudgetStatus, 
  PartReferenceItem, 
  PriceStatus, 
  QuantityStatus,
  ServicePartCatalogItem
} from '../types/ag002.types.ts';

export interface EstimatedPartItem {
  part_id?: string;
  cve_refaccion: string;
  nombre?: string;
  cantidad: number;
  costo_unitario?: number;
  unidad_medida?: string;
  quantity_source: 'ASSET_SERVICE_OVERRIDE' | 'SERVICE_DEFAULT' | 'CATALOG_STANDARD' | 'MISSING_MAPPING';
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
  serviceCode: string | null | undefined,
  partsCatalog: PartReferenceItem[],
  partsByMachine: PartReferenceItem[] = [],
  servicePartsCatalog: ServicePartCatalogItem[] = []
): PartsEstimationResult {
  const m = String(machineId || '').trim().toUpperCase();
  const s = String(serviceCode || '').trim();

  // 1. ASSET + SERVICE OVERRIDE (C-003 §31-43): Explicit asset_id + service_code + part + quantity
  const assetServiceOverrides = partsByMachine.filter(p => 
    String(p.maquina_id || '').trim().toUpperCase() === m &&
    (p as any).codigo_servicio && String((p as any).codigo_servicio).trim() === s
  );
  
  // 2. SERVICE DEFAULT: Standard parts defined for this service
  const serviceDefaults = s ? servicePartsCatalog.filter(sp => sp.codigo_servicio === s && sp.activo !== false) : [];

  const estimated: EstimatedPartItem[] = [];
  let totalKnown = 0;
  let unknownCount = 0;
  let knownCount = 0;

  if (assetServiceOverrides.length > 0) {
    // Branch 1: Valid Asset + Service Override
    for (const mp of assetServiceOverrides) {
      const partCode = String(mp.codigo_articulo || '').trim();
      if (!partCode) continue;

      const catItem = partsCatalog.find(p => p.codigo_articulo === partCode);
      const nombre = mp.nombre_articulo || catItem?.nombre_articulo || partCode;
      
      const qty = (typeof mp.cantidad_estandar === 'number' && mp.cantidad_estandar > 0) 
        ? mp.cantidad_estandar 
        : 1;
      const qtyStatus: QuantityStatus = (typeof mp.cantidad_estandar === 'number' && mp.cantidad_estandar > 0) 
        ? 'KNOWN_QUANTITY' 
        : 'DERIVED_QUANTITY';

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
        unidad_medida: mp.unidad_medida || catItem?.unidad_medida || 'PZA',
        quantity_source: 'ASSET_SERVICE_OVERRIDE',
        price_status: priceStatus,
        quantity_status: qtyStatus
      });
    }
  } else if (serviceDefaults.length > 0) {
    // Branch 2: Service standard part plan
    for (const sp of serviceDefaults) {
      const partCode = String(sp.codigo_articulo || '').trim();
      if (!partCode) continue;

      const catItem = partsCatalog.find(p => p.codigo_articulo === partCode);
      const nombre = sp.nombre_articulo || catItem?.nombre_articulo || partCode;
      
      const qty = (typeof sp.cantidad_estandar === 'number' && sp.cantidad_estandar > 0)
        ? sp.cantidad_estandar
        : 1;
      const qtyStatus: QuantityStatus = (typeof sp.cantidad_estandar === 'number' && sp.cantidad_estandar > 0)
        ? 'KNOWN_QUANTITY'
        : 'DERIVED_QUANTITY';

      const unitCost = typeof catItem?.costo_unitario === 'number' ? catItem.costo_unitario : undefined;

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
        unidad_medida: sp.unidad_medida || catItem?.unidad_medida || 'PZA',
        quantity_source: 'SERVICE_DEFAULT',
        price_status: priceStatus,
        quantity_status: qtyStatus
      });
    }
  }

  let bStatus: BudgetStatus = 'COMPLETE';
  if (estimated.length === 0) {
    bStatus = 'COMPLETE';
  } else if (unknownCount > 0 && knownCount > 0) {
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
