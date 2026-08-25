// audit_real_financial_chain.ts
// Comprehensive Audit of Real Production Financial-Input Chain for the 135 Annual Preventives

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://xqfpsavkefhrxfbtqzec.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZnBzYXZrZWZocnhmYnRxemVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE0MzU5NywiZXhwIjoyMDk3NzE5NTk3fQ.o7GCLoa5YoDFWOxfvPayokuJhVYQvd2s5YtEq8DAs2U';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function runAudit() {
  console.log('================================================================================');
  console.log('AUDIT OF REAL PRODUCTION FINANCIAL-INPUT CHAIN (135 PREVENTIVE RECORDS)');
  console.log('================================================================================\n');

  // 1. Fetch all 135 preventive records
  const { data: calData, error: calErr } = await sb
    .from('calendario_mantenimiento_detalle')
    .select('id_detalle, maquina_id, fecha_programada, tipo_mantenimiento, actividad_sugerida, observaciones, estatus_detalle, fecha_alta, anio_plan')
    .eq('tipo_mantenimiento', 'PREVENTIVO');

  if (calErr || !calData) {
    console.error('Error fetching calendar details:', calErr);
    return;
  }

  const preventiveCount = calData.length;

  // 2. Fetch all parts from cat_refacciones (paginated to ensure complete catalog)
  let allParts: any[] = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data: pBatch, error: pErr } = await sb
      .from('cat_refacciones')
      .select('id, codigo_articulo, nombre_articulo, costo_unitario, moneda, maquina_id, activo')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (pErr) {
      console.error('Error fetching parts catalog:', pErr);
      break;
    }
    if (!pBatch || pBatch.length === 0) break;
    allParts = allParts.concat(pBatch);
    if (pBatch.length < pageSize) break;
    page++;
  }

  // Price map
  const priceMap = new Map<string, number>();
  const rawPartsMap = new Map<string, any>();
  for (const p of allParts) {
    const code = String(p.codigo_articulo || '').trim().toUpperCase();
    rawPartsMap.set(code, p);
    if (typeof p.costo_unitario === 'number' && !isNaN(p.costo_unitario) && p.costo_unitario > 0) {
      priceMap.set(code, p.costo_unitario);
    }
  }

  // 3. Inspect Work Orders in 2026
  const { data: allOTs, error: otErr } = await sb
    .from('ordenes_trabajo')
    .select('id_orden, no_ot, maquina_id, area, tipo_mantenimiento, fecha_solicitud, fecha_cierre, estatus, descripcion, costo_estimado_refacciones');

  const closedPreventiveOTs2026 = (allOTs || []).filter(ot => {
    const isPrev = String(ot.tipo_mantenimiento || '').toUpperCase() === 'PREVENTIVO';
    const isClosed = ['CERRADA', 'VALIDADA', 'REALIZADA'].includes(String(ot.estatus || '').toUpperCase());
    const dateStr = ot.fecha_cierre || ot.fecha_solicitud || '';
    const is2026 = String(dateStr).startsWith('2026');
    return isPrev && isClosed && is2026;
  });

  const allPreventiveOTs2026 = (allOTs || []).filter(ot => {
    const isPrev = String(ot.tipo_mantenimiento || '').toUpperCase() === 'PREVENTIVO';
    const dateStr = ot.fecha_cierre || ot.fecha_solicitud || '';
    const is2026 = String(dateStr).startsWith('2026');
    return isPrev && is2026;
  });

  // 4. Audit each preventive record's financial chain
  let withServiceCodeCount = 0;
  let withoutServiceCodeCount = 0;

  let withPartsMappingCount = 0;
  let withoutPartsMappingCount = 0;

  let totalPartLinesGenerated = 0;
  let partLinesWithQuantity = 0;
  let partLinesWithoutQuantity = 0;

  let partLinesWithReferencePrice = 0;
  let partLinesWithoutReferencePrice = 0;

  let fullyPricedPreventives = 0;
  let partialPreventives = 0;
  let noPartMappingPreventives = 0;

  const missingPriceCodesSample = new Set<string>();
  const sampleRecordsAnalysis: any[] = [];

  for (let i = 0; i < calData.length; i++) {
    const d = calData[i];
    let obsObj: any = {};
    if (d.observaciones) {
      try {
        obsObj = typeof d.observaciones === 'object' ? d.observaciones : JSON.parse(d.observaciones);
      } catch (_) {}
    }

    const serviceCode = obsObj.service_code || d.actividad_sugerida;
    if (serviceCode) {
      withServiceCodeCount++;
    } else {
      withoutServiceCodeCount++;
    }

    const plannedParts = obsObj.planned_parts || [];
    if (Array.isArray(plannedParts) && plannedParts.length > 0) {
      withPartsMappingCount++;
    } else {
      withoutPartsMappingCount++;
    }

    let recPricedLines = 0;
    let recMissingPriceLines = 0;
    let recMissingQtyLines = 0;

    for (const p of plannedParts) {
      totalPartLinesGenerated++;

      const partCode = String(p.cve_refaccion || p.codigo_articulo || p.part_code || '').trim().toUpperCase();
      const qty = typeof p.cantidad === 'number' ? p.cantidad : (typeof p.planned_quantity === 'number' ? p.planned_quantity : null);

      if (qty !== null && qty > 0) {
        partLinesWithQuantity++;
      } else {
        partLinesWithoutQuantity++;
        recMissingQtyLines++;
      }

      const unitPrice = priceMap.get(partCode);
      if (unitPrice !== undefined && unitPrice > 0) {
        partLinesWithReferencePrice++;
        recPricedLines++;
      } else {
        partLinesWithoutReferencePrice++;
        recMissingPriceLines++;
        missingPriceCodesSample.add(partCode);
      }
    }

    if (plannedParts.length === 0) {
      noPartMappingPreventives++;
    } else if (recMissingPriceLines === 0 && recPricedLines > 0) {
      fullyPricedPreventives++;
    } else {
      partialPreventives++;
    }

    if (i < 5 || plannedParts.length > 0) {
      if (sampleRecordsAnalysis.length < 5) {
        sampleRecordsAnalysis.push({
          id_detalle: d.id_detalle,
          maquina_id: d.maquina_id,
          fecha: d.fecha_programada,
          service_code: serviceCode,
          planned_parts_count: plannedParts.length,
          planned_parts: plannedParts,
          recPricedLines,
          recMissingPriceLines
        });
      }
    }
  }

  // 5. Output Structured Report
  console.log(`1. Total Preventive Records (preventive_count): ${preventiveCount}`);
  console.log(`2. Service Code Breakdown:`);
  console.log(`   - With service_code:    ${withServiceCodeCount}`);
  console.log(`   - Without service_code: ${withoutServiceCodeCount}`);
  console.log(`3. Service -> Parts Mapping Breakdown:`);
  console.log(`   - With planned_parts:    ${withPartsMappingCount}`);
  console.log(`   - Without planned_parts: ${withoutPartsMappingCount}`);
  console.log(`4. Planned Quantity Breakdown:`);
  console.log(`   - Part lines with quantity:    ${partLinesWithQuantity}`);
  console.log(`   - Part lines missing quantity: ${partLinesWithoutQuantity}`);
  console.log(`5. Total Generated Part Lines: ${totalPartLinesGenerated}`);
  console.log(`6. Reference Price Breakdown:`);
  console.log(`   - Part lines with reference price in cat_refacciones:    ${partLinesWithReferencePrice}`);
  console.log(`   - Part lines without reference price (missing in cat):   ${partLinesWithoutReferencePrice}`);
  console.log(`7. Preventives Classification:`);
  console.log(`   - fully_priced_preventives:     ${fullyPricedPreventives}`);
  console.log(`   - partial_preventives:          ${partialPreventives}`);
  console.log(`   - no_part_mapping_preventives:  ${noPartMappingPreventives}`);
  console.log(`   - Sum Reconciliation: ${fullyPricedPreventives} + ${partialPreventives} + ${noPartMappingPreventives} = ${fullyPricedPreventives + partialPreventives + noPartMappingPreventives} (Target: 135)`);
  console.log(`8. Missing Price Lines Total: ${partLinesWithoutReferencePrice}`);
  console.log(`\nSample of unique part codes searched in cat_refacciones:`, Array.from(missingPriceCodesSample).slice(0, 15));

  console.log('\n--- INDEPENDENT WORK ORDERS VERIFICATION ---');
  console.log(`Total OTs in ordenes_trabajo: ${allOTs?.length || 0}`);
  console.log(`Total Preventive OTs in 2026: ${allPreventiveOTs2026.length}`);
  console.log(`Real Closed Preventive OTs in 2026 (status IN ['CERRADA','VALIDADA','REALIZADA']): ${closedPreventiveOTs2026.length}`);
  console.log(`AG007 COMPLETED_REAL count in universe: ${closedPreventiveOTs2026.length}`);
  console.log(`OT details:`, closedPreventiveOTs2026);

  console.log('\n--- SAMPLE OBSERVACIONES / PLANNED PARTS IN CALENDARIO ---');
  console.log(JSON.stringify(sampleRecordsAnalysis, null, 2));

  // Check how parts codes in planned_parts look vs cat_refacciones
  console.log('\n--- CATALOG COMPARISON CHECK ---');
  const sampleCalParts = Array.from(missingPriceCodesSample).slice(0, 5);
  for (const sp of sampleCalParts) {
    const rawMatch = rawPartsMap.get(sp);
    console.log(`Code in calendar planned_parts: "${sp}" -> Found in cat_refacciones? ${rawMatch ? 'YES' : 'NO'}`);
    if (rawMatch) {
      console.log(`   Catalog item details:`, rawMatch);
    }
  }

  // Check some real codes in cat_refacciones
  console.log('\nSample real codes in cat_refacciones:', allParts.slice(0, 10).map(p => ({
    codigo_articulo: p.codigo_articulo,
    nombre_articulo: p.nombre_articulo,
    costo_unitario: p.costo_unitario,
    maquina_id: p.maquina_id
  })));
}

if (import.meta.main) {
  await runAudit();
}
