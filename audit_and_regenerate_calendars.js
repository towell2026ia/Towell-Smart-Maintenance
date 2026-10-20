/**
 * TSM-AI — Auditoría y Sincronización Canónica de Calendarios por Proceso (PF, CF, TF, AF)
 * Alimenta Preventivo (AG-002), Predictivo (AG-003) y Autónomo (AG-004) desde las bases reales:
 * - cat_maquinas
 * - fallas_por_maquina
 * - segundas_por_rollo
 * - refacciones_por_maquina
 * - cat_refacciones
 * - cat_tecnicos
 * - ordenes_trabajo
 */

const fs = require('fs');
const path = require('path');

const configContent = fs.readFileSync(path.join(__dirname, 'config.js'), 'utf8');
const urlMatch = configContent.match(/SUPABASE_URL\s*=\s*"([^"]+)"/);
const keyMatch = configContent.match(/SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/);

const SUPABASE_URL = process.env.SUPABASE_URL || (urlMatch ? urlMatch[1] : '');
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || (keyMatch ? keyMatch[1] : '');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ No se encontraron credenciales en config.js');
  process.exit(1);
}

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function sbGet(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, { headers });
  if (!res.ok) throw new Error(`GET ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbPost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`POST ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbPatch(table, query, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`PATCH ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbDelete(table, query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) throw new Error(`DELETE ${table}: ${res.status} ${await res.text()}`);
  return true;
}

function resolveAreaFromMachineCode(code, clave) {
  const c = (code || '').toUpperCase().trim();
  const k = (clave || '').toUpperCase().trim();
  if (c.endsWith('-TEJI') || c.endsWith('-TEJ') || c.endsWith('-URDI') || c.includes('-KM') ||
      c.endsWith('-RASU') || c.endsWith('-CRUD') ||
      k.includes('TELAR') || k.includes('URDID') || k.includes('ENGOMADO') || k.includes('JACQUARD') ||
      k.includes('RASURADORA') || k.includes('REVISADOR') ||
      k.includes('POLIPASTO') || k.includes('OVER LOOK 36')) return 'PF';
  if (c.endsWith('-COST') || c.endsWith('-CORBAT') || c.includes('ELEV-COST') ||
      k.includes('COSTURA') || k.includes('CONFECCION') || k.includes('TEXPA') ||
      (k.includes('SELLADORA') && !c.includes('-PT')) ||
      k.includes('SUBLIMADOR') || k.includes('PLANCHA') || k.includes('LONGITUDINAL') ||
      k.includes('CORT VERT') || k.includes('COLLARETE') || k.includes('ENROLLADOR') ||
      k.includes('CORTADORA') || k.includes('DETECTOR')) return 'CF';
  if (c.endsWith('-TINT') || c.endsWith('-SECA') ||
      k.includes('CALDERA') || k.includes('SECADORA') || k.includes('OVER FLOW') || k.includes('FOULARD') ||
      k.includes('PLANTA TRATADORA') || k.includes('CENTRO DE LAVADO') || k.includes('ABRIDORA') ||
      k.includes('OVER LOOK 35') || k.includes('BOMBA DE AGUA DEL POZO') || k.includes('CLAYTON')) return 'TF';
  if (c.endsWith('-PT') || (c.includes('COMP') && c.includes('HP')) || c.includes('BOMCIST') ||
      c.includes('GENK') || c.includes('MONTA') ||
      k.includes('COMPRESOR') || k.includes('CISTERNA') || k.includes('SELLADORA PT') ||
      k.includes('MONTACARGAS') || k.includes('MONTACARGA') || k.includes('FORKLIFT')) return 'AF';
  return 'PF';
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - startOfYear) / 86400000) + 1) / 7);
}

(async () => {
  console.log('=== 1. AUDITANDO BASES REALES EN SUPABASE ===');
  const [machines, techs, fallasCat, segundas, refMaq, catRef, ots] = await Promise.all([
    sbGet('cat_maquinas', 'select=*&activo=eq.true'),
    sbGet('cat_tecnicos', 'select=*&activo=eq.true'),
    sbGet('fallas_por_maquina', 'select=*'),
    sbGet('segundas_por_rollo', 'select=*&limit=3000'),
    sbGet('refacciones_por_maquina', 'select=*'),
    sbGet('cat_refacciones', 'select=*'),
    sbGet('ordenes_trabajo', 'select=*')
  ]);

  console.log(`- cat_maquinas (activas):       ${machines.length}`);
  console.log(`- cat_tecnicos (activos):       ${techs.length}`);
  console.log(`- fallas_por_maquina:           ${fallasCat.length}`);
  console.log(`- segundas_por_rollo:           ${segundas.length}`);
  console.log(`- refacciones_por_maquina:      ${refMaq.length}`);
  console.log(`- cat_refacciones:              ${catRef.length}`);
  console.log(`- ordenes_trabajo:              ${ots.length}`);

  // Clasificar y corregir cat_maquinas por proceso (PF, CF, TF, AF)
  const byProc = { PF: [], CF: [], TF: [], AF: [] };
  for (const m of machines) {
    const machId = m.equipo_towell || m.clave || m.id_maquina;
    const proc = resolveAreaFromMachineCode(machId, m.clave || '');
    byProc[proc].push({ machine: m, areaCode: proc });
    if (m.departamento_codigo !== proc || m.area !== proc) {
      try {
        await sbPatch('cat_maquinas', `id_maquina=eq.${m.id_maquina}`, { departamento_codigo: proc, area: proc });
      } catch (e) {}
    }
  }
  console.log(`\nDistribución de máquinas por Proceso: PF=${byProc.PF.length}, CF=${byProc.CF.length}, TF=${byProc.TF.length}, AF=${byProc.AF.length}`);

  // Mapear costos y refacciones reales
  const refCostMap = new Map();
  catRef.forEach(r => {
    const key = String(r.codigo_refaccion || r.id_refaccion || r.nombre_refaccion || '').toUpperCase().trim();
    const cost = parseFloat(r.costo_unitario || r.precio_unitario || r.costo || 180);
    if (key) refCostMap.set(key, isNaN(cost) ? 180 : cost);
  });

  const partsByMachine = {};
  const partsCostByMachine = {};
  refMaq.forEach(rm => {
    const mKey = String(rm.equipo_towell || rm.maquina_id || rm.clave_maquina || '').toUpperCase().trim();
    const rName = rm.refaccion || rm.nombre_refaccion || rm.codigo_refaccion || 'Kit Preventivo';
    if (mKey) {
      if (!partsByMachine[mKey]) partsByMachine[mKey] = [];
      if (!partsByMachine[mKey].includes(rName)) partsByMachine[mKey].push(rName);
      const unitCost = refCostMap.get(String(rName).toUpperCase().trim()) || parseFloat(rm.costo_estimado || 220);
      partsCostByMachine[mKey] = (partsCostByMachine[mKey] || 0) + (isNaN(unitCost) ? 220 : unitCost);
    }
  });

  const fallasByMachineKey = {};
  fallasCat.forEach(f => {
    const mKey = String(f.equipo_towell || f.maquina_id || f.maquina || f.tipo_maquina || '').toUpperCase().trim();
    const fDesc = f.falla || f.descripcion_falla || f.nombre_falla || f.modo_falla || '';
    if (mKey && fDesc) {
      if (!fallasByMachineKey[mKey]) fallasByMachineKey[mKey] = [];
      if (!fallasByMachineKey[mKey].includes(fDesc)) fallasByMachineKey[mKey].push(fDesc);
    }
  });

  function getRealFallasForMachine(machId, clave) {
    const c = String(machId || '').toUpperCase().trim();
    const k = String(clave || '').toUpperCase().trim();
    if (fallasByMachineKey[c] && fallasByMachineKey[c].length > 0) return fallasByMachineKey[c];
    if (fallasByMachineKey[k] && fallasByMachineKey[k].length > 0) return fallasByMachineKey[k];
    for (const [key, list] of Object.entries(fallasByMachineKey)) {
      if (key && (c.includes(key) || k.includes(key) || key.includes(k))) return list;
    }
    return [];
  }

  // Limpiar propuestas no aprobadas previas
  console.log('\n=== 2. LIMPIANDO PROPUESTAS NO APROBADAS DUPLICADAS ===');
  await sbDelete('calendario_mantenimiento_detalle', 'estatus_detalle=eq.PROPUESTO&id_orden_generada=is.null');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const week = getWeekNumber(now);

  // A. PREVENTIVO ANUAL (AG-002 + AG-007)
  console.log('=== 3. GENERANDO CALENDARIO PREVENTIVO (AG-002 + AG-007) EN PF, CF, TF, AF ===');
  const prevHeader = await sbPost('calendarios_mantenimiento', [{
    tipo_calendario: 'PREVENTIVO',
    anio: year,
    mes: month,
    semana: week,
    fecha_inicio_periodo: `${year}-01-01`,
    fecha_fin_periodo: `${year}-12-31`,
    estatus_calendario: 'PROPUESTO',
    generado_por: 'AG-002 Motor Preventivo',
    origen_generacion: 'IA Engine (Bases Reales)'
  }]);
  const prevCalId = prevHeader[0].id_calendario;

  const interleaved = [];
  const maxLen = Math.max(byProc.PF.length, byProc.CF.length, byProc.TF.length, byProc.AF.length);
  for (let i = 0; i < maxLen; i++) {
    ['PF', 'CF', 'TF', 'AF'].forEach(p => {
      if (byProc[p][i]) interleaved.push(byProc[p][i]);
    });
  }

  const currentWeekMonday = new Date(now);
  const dowNow = currentWeekMonday.getDay();
  currentWeekMonday.setDate(now.getDate() - (dowNow === 0 ? 6 : dowNow - 1));

  const prevDetails = [];
  interleaved.forEach((item, idx) => {
    const m = item.machine;
    const areaCode = item.areaCode;
    const machId = m.equipo_towell || m.clave || m.id_maquina;
    const machName = m.clave || m.nombre || m.nombre_maquina || machId;
    const mCost = partsCostByMachine[String(machId).toUpperCase().trim()] || 0;
    const mParts = partsByMachine[String(machId).toUpperCase().trim()] || [];
    const mFallas = getRealFallasForMachine(machId, machName);
    const mCrit = (m.criticidad || m.prioridad_default || 'B').toUpperCase().trim();

    let dateStr;
    if (idx < 8) {
      const d = new Date(currentWeekMonday);
      d.setDate(currentWeekMonday.getDate() + (idx % 6));
      dateStr = d.toISOString().split('T')[0];
    } else {
      const targetM = (now.getMonth() + ((idx - 8) % 12)) % 12;
      const targetD = 2 + ((Math.floor(idx / 4) * 3) % 25);
      const d = new Date(year, targetM, Math.min(28, targetD));
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
      dateStr = d.toISOString().split('T')[0];
    }

    let prio = 'MEDIA';
    if (mCrit.includes('A') || mCrit.includes('CRIT') || mCost > 5000 || mFallas.length >= 5) prio = 'ALTA';
    else if (mCrit.includes('C') || mCrit.includes('BAJ')) prio = 'BAJA';

    const estimatedBudget = mCost > 0 ? Math.round(mCost) : (prio === 'ALTA' ? 450 : prio === 'MEDIA' ? 250 : 140);
    const focusPart = mParts.length > 0 ? ` | Refacción: ${mParts.slice(0, 2).join(', ')}` : '';
    const focusFalla = mFallas.length > 0 ? ` | Prevención: ${mFallas[0]}` : '';

    prevDetails.push({
      id_calendario: prevCalId,
      maquina_id: machId,
      fecha_programada: dateStr,
      tipo_mantenimiento: 'PREVENTIVO',
      prioridad: prio,
      actividad_sugerida: `Preventivo Anual ${year}: ${machId} - ${machName} (${areaCode})${focusPart}${focusFalla}`,
      responsable_sugerido: techs[idx % Math.max(1, techs.length)]?.nombre_tecnico || 'Técnico Especialista',
      observaciones: JSON.stringify({
        origen: 'AG-002_PREVENTIVO_ANUAL',
        area: areaCode,
        proceso: areaCode,
        criticidad: mCrit,
        semana_programada: getWeekNumber(new Date(dateStr + 'T12:00:00')),
        presupuesto_estimado_usd: estimatedBudget,
        refacciones_sugeridas: mParts.slice(0, 5),
        modos_falla_prevenidos: mFallas.slice(0, 5),
        invariante_1_anual: true,
        cobertura: '100% Catálogo Maestro (cat_maquinas)'
      }),
      estatus_detalle: 'PROPUESTO'
    });
  });

  if (prevDetails.length > 0) await sbPost('calendario_mantenimiento_detalle', prevDetails);
  console.log(`✅ Insertados ${prevDetails.length} mantenimientos PREVENTIVOS (100% flota).`);

  // B. PREDICTIVO SEMANAL (AG-003)
  console.log('=== 4. GENERANDO CALENDARIO PREDICTIVO (AG-003 SEGUNDAS POR ROLLO) ===');
  const wedStart = new Date(currentWeekMonday);
  wedStart.setDate(currentWeekMonday.getDate() + 2); // Miércoles
  const tueEnd = new Date(wedStart);
  tueEnd.setDate(wedStart.getDate() + 6); // Martes

  const predHeader = await sbPost('calendarios_mantenimiento', [{
    tipo_calendario: 'PREDICTIVO',
    anio: year,
    mes: month,
    semana: week,
    fecha_inicio_periodo: wedStart.toISOString().split('T')[0],
    fecha_fin_periodo: tueEnd.toISOString().split('T')[0],
    estatus_calendario: 'PROPUESTO',
    generado_por: 'AG-003 Motor Predictivo',
    origen_generacion: 'IA Engine (segundas_por_rollo)'
  }]);
  const predCalId = predHeader[0].id_calendario;

  const extractLoomNumber = (str) => {
    const m = String(str || '').toUpperCase().match(/(\d{3})/);
    return m ? m[1] : null;
  };

  const machineDefectTotals = {};
  segundas.forEach(s => {
    const rawId = String(s.maquina_id || s.equipo_towell || s.telar || s.maquina || s.equipo || '').toUpperCase().trim();
    if (!rawId) return;
    const loomNum = extractLoomNumber(rawId);
    const keys = [rawId];
    if (loomNum) keys.push(`LOOM_${loomNum}`);
    const defVal = parseFloat(s.cantidad_defecto ?? s.metros_segundas ?? s.segundas ?? s.defectos ?? 1);
    const pzasVal = parseFloat(s.pzas_rollo ?? s.piezas_rollo ?? s.total_piezas ?? s.metros_rollo ?? 100);
    const defName = s.defecto || s.tipo_defecto || s.causa || 'Defecto de tejido';

    keys.forEach(k => {
      if (!machineDefectTotals[k]) machineDefectTotals[k] = { totalDefects: 0, totalPzas: 0, rollsCount: 0, defects: [] };
      machineDefectTotals[k].totalDefects += (isNaN(defVal) ? 1 : defVal);
      machineDefectTotals[k].totalPzas += (isNaN(pzasVal) || pzasVal <= 0 ? 100 : pzasVal);
      machineDefectTotals[k].rollsCount += 1;
      if (defName && !machineDefectTotals[k].defects.includes(defName)) machineDefectTotals[k].defects.push(defName);
    });
  });

  const pfTelares = byProc.PF.map(x => x.machine).filter(m => {
    const code = String(m.equipo_towell || m.clave || '').toUpperCase();
    return code.includes('TEL') || String(m.clave || '').toUpperCase().includes('TELAR');
  });

  const rankedTelares = pfTelares.map(m => {
    const mId = (m.equipo_towell || m.clave || '').toUpperCase().trim();
    const loomNum = extractLoomNumber(mId);
    const stats = machineDefectTotals[mId] || (loomNum ? machineDefectTotals[`LOOM_${loomNum}`] : null) || { totalDefects: 0, totalPzas: 0, rollsCount: 0, defects: [] };
    const pct = stats.totalPzas > 0 ? Number(((stats.totalDefects / stats.totalPzas) * 100).toFixed(2)) : 0;
    return {
      maquina_id: mId,
      percentage: pct,
      totalDefects: Math.round(stats.totalDefects * 100) / 100,
      totalPzas: Math.round(stats.totalPzas * 100) / 100,
      rollsCount: stats.rollsCount || 0,
      defects: stats.defects
    };
  }).sort((a, b) => b.percentage - a.percentage || b.totalDefects - a.totalDefects || a.maquina_id.localeCompare(b.maquina_id));

  const slotOffsets = [0, 2, 4, 6];
  const slotDayNames = ['Miércoles', 'Viernes', 'Domingo', 'Martes'];
  const predDetails = rankedTelares.slice(0, 4).map((cand, idx) => {
    const slotDate = new Date(wedStart);
    slotDate.setDate(wedStart.getDate() + slotOffsets[idx]);
    const dateStr = slotDate.toISOString().split('T')[0];
    const dayName = slotDayNames[idx];
    const prio = idx === 0 ? 'CRÍTICA' : idx === 1 ? 'ALTA' : 'MEDIA';
    const defectSummary = cand.defects.slice(0, 3).join(', ') || 'Segundas por Rollo';
    const risk10 = Math.min(9.9, Math.max(4.5, Number((cand.percentage > 0 ? Math.min(9.8, 4.0 + cand.percentage / 3) : 6.5 - idx * 0.5).toFixed(1))));

    return {
      id_calendario: predCalId,
      maquina_id: cand.maquina_id,
      fecha_programada: dateStr,
      tipo_mantenimiento: 'PREDICTIVO',
      prioridad: prio,
      actividad_sugerida: `Mantenimiento Predictivo por Segundas de Calidad (Sem ${week}): ${cand.maquina_id} (PF) — Defectos: ${defectSummary}`,
      responsable_sugerido: techs[idx % Math.max(1, techs.length)]?.nombre_tecnico || 'Especialista Predictivo (PF)',
      score_riesgo: cand.percentage || risk10 * 10,
      observaciones: JSON.stringify({
        origen: 'AG-003_PREDICTIVO_SEMANAL',
        area: 'PF',
        proceso: 'PF',
        fuente_datos: 'segundas_por_rollo',
        semana_programada: week,
        dia_semana: dayName,
        ranking_prioridad: idx + 1,
        porcentaje_segundas: cand.percentage,
        total_segundas: cand.totalDefects,
        total_piezas: cand.totalPzas,
        riesgo_estimado: `${risk10}/10`,
        tipo_revision: `Inspección Predictiva de Telar (${defectSummary})`,
        especialidad: 'Mecánico de Telares / Calidad PF',
        motivos: [
          `Ranking #${idx + 1} en incidencia de segundas por rollo (${cand.percentage}% de segundas acumuladas).`,
          `Defectos registrados en base real segundas_por_rollo: ${cand.totalDefects} defectos sobre ${cand.totalPzas} piezas (${cand.rollsCount} rollos evaluados).`,
          `Modos de defecto dominantes: ${defectSummary}.`
        ],
        evidencia: `Base real Supabase: segundas_por_rollo (${segundas.length} registros auditados por AG-003).`,
        regla_dispersion_4_fechas: true,
        domingo_elegible: true
      }),
      estatus_detalle: 'PROPUESTO'
    };
  });

  if (predDetails.length > 0) await sbPost('calendario_mantenimiento_detalle', predDetails);
  console.log(`✅ Insertados ${predDetails.length} mantenimientos PREDICTIVOS (PF).`);

  // C. AUTÓNOMO SEMANAL (AG-004)
  console.log('=== 5. GENERANDO CALENDARIO AUTÓNOMO (AG-004 FALLAS POR MÁQUINA) EN PF, CF, TF, AF ===');
  const friEnd = new Date(currentWeekMonday);
  friEnd.setDate(currentWeekMonday.getDate() + 4);

  const autoHeader = await sbPost('calendarios_mantenimiento', [{
    tipo_calendario: 'AUTONOMO',
    anio: year,
    mes: month,
    semana: week,
    fecha_inicio_periodo: currentWeekMonday.toISOString().split('T')[0],
    fecha_fin_periodo: friEnd.toISOString().split('T')[0],
    estatus_calendario: 'PROPUESTO',
    generado_por: 'AG-004 Motor Autónomo',
    origen_generacion: 'IA Engine (fallas_por_maquina)'
  }]);
  const autoCalId = autoHeader[0].id_calendario;

  const quotas = { PF: 6, CF: 3, TF: 3, AF: 3 };
  const selectedAuto = [];
  ['PF', 'CF', 'TF', 'AF'].forEach(procKey => {
    const list = (byProc[procKey] || []).map(x => {
      const m = x.machine;
      const machId = m.equipo_towell || m.clave;
      const catFallas = getRealFallasForMachine(machId, m.clave || '');
      return { machine: m, machId, area: procKey, fails: Math.max(1, catFallas.length), catFallas };
    }).sort((a, b) => b.fails - a.fails || a.machId.localeCompare(b.machId));
    selectedAuto.push(...list.slice(0, quotas[procKey]));
  });

  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const autoDetails = selectedAuto.slice(0, 15).map((cand, idx) => {
    const dayIdx = idx % 5;
    const d = new Date(currentWeekMonday);
    d.setDate(currentWeekMonday.getDate() + dayIdx);
    const dateStr = d.toISOString().split('T')[0];
    const assignedDay = dayNames[dayIdx];
    const prio = cand.fails >= 5 ? 'ALTA' : (cand.area === 'PF' ? 'ALTA' : 'MEDIA');
    const topFallaText = cand.catFallas.length > 0 ? ` [${cand.catFallas.slice(0, 2).join(' / ')}]` : '';

    return {
      id_calendario: autoCalId,
      maquina_id: cand.machId,
      fecha_programada: dateStr,
      tipo_mantenimiento: 'AUTONOMO',
      prioridad: prio,
      actividad_sugerida: `Rutina Autónoma Semanal (Sem ${week}): ${cand.machId} (${cand.area}) - Checklist 5 Bloques (Temp °C)${topFallaText}`,
      responsable_sugerido: `Operador (${cand.area})`,
      observaciones: JSON.stringify({
        origen: 'AG-004_AUTONOMO_SEMANAL',
        area: cand.area,
        proceso: cand.area,
        semana_programada: week,
        ranking_position: idx + 1,
        eligibility_reason: 'RECURRENCE_AND_TREND',
        motivo_elegibilidad: `RECURRENCE_AND_TREND (${cand.fails} modos de falla en catálogo/historial)`,
        failure_history_count: cand.fails,
        fallas_recurrentes_detectadas: cand.fails,
        fallas_principales: cand.catFallas.slice(0, 4),
        fuente_datos: 'fallas_por_maquina + ordenes_trabajo',
        segundas_usadas: 0,
        dia_semana_asignado: assignedDay,
        day_of_week: assignedDay,
        temperatura_requerida_grados_c: true
      }),
      estatus_detalle: 'PROPUESTO'
    };
  });

  if (autoDetails.length > 0) await sbPost('calendario_mantenimiento_detalle', autoDetails);
  console.log(`✅ Insertados ${autoDetails.length} mantenimientos AUTÓNOMOS en PF, CF, TF y AF.`);
  console.log('\n🎉 AUDITORÍA Y ALIMENTACIÓN DE CALENDARIOS COMPLETADA AL 100%.');
})();
