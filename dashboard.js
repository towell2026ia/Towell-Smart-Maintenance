/**
 * TSM-AI Analytics Dashboard — dashboard.js
 * Towell Smart Maintenance AI
 *
 * Reads Supabase credentials from config.js (exposes SUPABASE_URL / SUPABASE_ANON_KEY as globals)
 * and renders all KPIs, charts and tables.
 */

// ============================================================
// 1. CONFIG & CLIENT INIT
// ============================================================

// config.js exposes: const SUPABASE_URL = "..." and const SUPABASE_ANON_KEY = "..."
const _supa_url = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL
  : (window.TSM_CONFIG ? window.TSM_CONFIG.supabaseUrl : null);

const _supa_key = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY
  : (window.TSM_CONFIG ? window.TSM_CONFIG.supabaseKey : null);

if (!_supa_url || !_supa_key) {
  console.error('[Dashboard] Supabase credentials not found. Check config.js.');
}

const { createClient } = supabase;
const db = createClient(_supa_url, _supa_key);

// ============================================================
// 2. CHART DEFAULTS (dark theme)
// ============================================================

const CHART_DEFAULTS = {
  color: 'rgba(255,255,255,0.85)',
  gridColor: 'rgba(255,255,255,0.08)',
  tickColor: 'rgba(255,255,255,0.5)',
  legendPos: 'bottom',
};

// Colour palette for charts
const PALETTE = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#a3e635',
];

// Department labels map
const DEPT_LABELS = {
  PF: 'Planta Fabric',
  CF: 'Costura',
  TF: 'Tintorería',
  AF: 'Almacén/Fabric',
};

// Chart registry to destroy before re-render
const _charts = {};

function destroyChart(id) {
  if (_charts[id]) {
    _charts[id].destroy();
    delete _charts[id];
  }
}

// ============================================================
// 3. UTILITY HELPERS
// ============================================================

/**
 * Calculate duration in hours between two ISO timestamp strings.
 * Returns null if either value is missing or invalid.
 */
function durationHours(isoStart, isoEnd) {
  if (!isoStart || !isoEnd) return null;
  const s = new Date(isoStart);
  const e = new Date(isoEnd);
  if (isNaN(s) || isNaN(e) || e <= s) return null;
  return (e - s) / 3_600_000; // ms → hours
}

/** Format a number to 1 decimal place */
function fmt1(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Format integer with locale separators */
function fmtInt(n) {
  if (n === null || n === undefined) return '0';
  return Number(n).toLocaleString('es-MX');
}

/**
 * Animated counter for KPI values
 * @param {HTMLElement} el — target element
 * @param {number} target — final value
 * @param {string} suffix — e.g. ' h', '%'
 * @param {number} decimals — decimal places
 */
function animateCounter(el, target, suffix = '', decimals = 0) {
  const duration = 900;
  const start = performance.now();
  const startVal = 0;

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutExpo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = startVal + (target - startVal) * eased;
    el.textContent = current.toLocaleString('es-MX', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Show an empty/error state inside a container */
function showEmpty(containerId, message = 'Sin datos disponibles') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">${message}</div>
    </div>`;
}

/** Show spinner inside a container */
function showSpinner(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span class="loading-text">Cargando…</span></div>`;
}

// ============================================================
// 4. LOAD KPIs
// ============================================================

async function loadKPIs() {
  try {
    // Run 4 queries in parallel
    const [
      { count: totalOTs, error: e1 },
      { count: closedOTs, error: e2 },
      { data: mttrData, error: e3 },
      { count: techCount, error: e4 },
    ] = await Promise.all([
      // Total OTs
      db.from('ordenes_trabajo').select('*', { count: 'exact', head: true }),
      // Closed OTs (estatus = 'cerrada' or 'CERRADA' or 'CER')
      db.from('ordenes_trabajo')
        .select('*', { count: 'exact', head: true })
        .or('estatus.ilike.cer%,estatus.ilike.close%,estatus.eq.CERRADA,estatus.eq.Cerrada,estatus.eq.cerrada'),
      // MTTR: fetch OTs that have both timestamps
      db.from('ordenes_trabajo')
        .select('fecha_hora_inicio,fecha_hora_fin,tiempo_atencion_min')
        .not('fecha_hora_fin', 'is', null)
        .not('fecha_hora_inicio', 'is', null)
        .limit(2000),
      // Active technicians
      db.from('cat_tecnicos')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true),
    ]);

    // --- Total OTs ---
    const elTotal = document.getElementById('kpi-total-ots');
    if (!e1 && totalOTs !== null) {
      elTotal.innerHTML = '';
      animateCounter(elTotal, totalOTs, '', 0);
      document.getElementById('kpi-total-ots-meta').textContent = 'Total de órdenes registradas';
    } else {
      elTotal.textContent = '—';
    }

    // --- Closed OTs ---
    const elClosed = document.getElementById('kpi-closed-ots');
    if (!e2 && closedOTs !== null) {
      elClosed.innerHTML = '';
      animateCounter(elClosed, closedOTs, '', 0);
      const pct = totalOTs ? ((closedOTs / totalOTs) * 100).toFixed(1) : 0;
      document.getElementById('kpi-closed-ots-meta').innerHTML = `<span>${pct}%</span> tasa de cierre`;
    } else {
      elClosed.textContent = '—';
    }

    // --- MTTR ---
    const elMTTR = document.getElementById('kpi-mttr');
    if (!e3 && mttrData && mttrData.length > 0) {
      // Prefer tiempo_atencion_min if available, else calculate from timestamps
      const hours = mttrData.map(row => {
        if (row.tiempo_atencion_min && row.tiempo_atencion_min > 0) {
          return row.tiempo_atencion_min / 60;
        }
        return durationHours(row.fecha_hora_inicio, row.fecha_hora_fin);
      }).filter(h => h !== null && h > 0 && h < 720); // filter outliers > 30 days

      const avg = hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : null;
      elMTTR.innerHTML = '';
      if (avg !== null) {
        animateCounter(elMTTR, avg, ' h', 1);
        document.getElementById('kpi-mttr-meta').textContent = `Sobre ${fmtInt(hours.length)} OTs cerradas`;
      } else {
        elMTTR.textContent = '—';
      }
    } else {
      elMTTR.textContent = '—';
    }

    // --- Técnicos Activos ---
    const elTech = document.getElementById('kpi-technicians');
    if (!e4 && techCount !== null) {
      elTech.innerHTML = '';
      animateCounter(elTech, techCount, '', 0);
      document.getElementById('kpi-technicians-meta').textContent = 'Técnicos activos en sistema';
    } else {
      elTech.textContent = '—';
    }

  } catch (err) {
    console.error('[loadKPIs] Error:', err);
    ['kpi-total-ots', 'kpi-closed-ots', 'kpi-mttr', 'kpi-technicians'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
  }
}

// ============================================================
// 5. TECH HOURS CHART
// ============================================================

async function loadTechChart() {
  const wrapId = 'tech-chart-wrap';
  const containerId = 'tech-chart-container';

  try {
    // Query OTs with technician and time data
    const { data, error } = await db
      .from('ordenes_trabajo')
      .select('nombre_atendio, cve_atendio, fecha_hora_inicio, fecha_hora_fin, tiempo_atencion_min')
      .not('nombre_atendio', 'is', null)
      .not('fecha_hora_inicio', 'is', null)
      .limit(3000);

    if (error) throw error;
    if (!data || data.length === 0) {
      showEmpty(wrapId, 'Sin datos de técnicos disponibles');
      return;
    }

    // Aggregate hours per technician
    const techMap = {};
    data.forEach(row => {
      const name = row.nombre_atendio || row.cve_atendio || 'Sin asignar';
      let hrs = null;
      if (row.tiempo_atencion_min && row.tiempo_atencion_min > 0) {
        hrs = row.tiempo_atencion_min / 60;
      } else {
        hrs = durationHours(row.fecha_hora_inicio, row.fecha_hora_fin);
      }
      if (hrs !== null && hrs > 0 && hrs < 720) {
        if (!techMap[name]) techMap[name] = { total: 0, count: 0 };
        techMap[name].total += hrs;
        techMap[name].count += 1;
      }
    });

    const sorted = Object.entries(techMap)
      .map(([name, v]) => ({ name, hours: v.total, count: v.count }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 12);

    if (sorted.length === 0) {
      showEmpty(wrapId, 'Sin datos de horas disponibles');
      return;
    }

    // Show canvas
    document.getElementById(wrapId).style.display = 'none';
    document.getElementById(containerId).style.display = 'block';

    destroyChart('chart-tech-times');
    const ctx = document.getElementById('chart-tech-times').getContext('2d');

    _charts['chart-tech-times'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(d => d.name.split(' ').slice(0, 2).join(' ')),
        datasets: [{
          label: 'Horas trabajadas',
          data: sorted.map(d => parseFloat(d.hours.toFixed(1))),
          backgroundColor: sorted.map((_, i) => PALETTE[i % PALETTE.length] + 'cc'),
          borderColor: sorted.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.95)',
            borderColor: 'rgba(99,102,241,0.4)',
            borderWidth: 1,
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            callbacks: {
              label: ctx => ` ${fmt1(ctx.raw)} h — ${sorted[ctx.dataIndex].count} OTs`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: CHART_DEFAULTS.gridColor },
            ticks: { color: CHART_DEFAULTS.tickColor, font: { size: 11 } },
            title: {
              display: true,
              text: 'Horas totales trabajadas',
              color: CHART_DEFAULTS.tickColor,
              font: { size: 11 },
            },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#e2e8f0', font: { size: 11 } },
          },
        },
      },
    });

  } catch (err) {
    console.error('[loadTechChart] Error:', err);
    showEmpty(wrapId, 'Sin datos disponibles');
  }
}

// ============================================================
// 6. DEPT DOUGHNUT CHART
// ============================================================

async function loadDeptChart() {
  const wrapId = 'dept-chart-wrap';
  const containerId = 'dept-chart-container';

  try {
    const { data, error } = await db
      .from('ordenes_trabajo')
      .select('departamento, tiempo_atencion_min, fecha_hora_inicio, fecha_hora_fin')
      .not('departamento', 'is', null)
      .limit(5000);

    if (error) throw error;
    if (!data || data.length === 0) {
      showEmpty(wrapId, 'Sin datos por departamento');
      return;
    }

    // Group by departamento
    const deptMap = {};
    data.forEach(row => {
      const dept = row.departamento || 'Otros';
      if (!deptMap[dept]) deptMap[dept] = { count: 0, hours: 0 };
      deptMap[dept].count += 1;

      let hrs = null;
      if (row.tiempo_atencion_min && row.tiempo_atencion_min > 0) {
        hrs = row.tiempo_atencion_min / 60;
      } else {
        hrs = durationHours(row.fecha_hora_inicio, row.fecha_hora_fin);
      }
      if (hrs !== null && hrs > 0 && hrs < 720) {
        deptMap[dept].hours += hrs;
      }
    });

    const labels = Object.keys(deptMap).map(k => DEPT_LABELS[k] || k);
    const counts = Object.values(deptMap).map(v => v.count);
    const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);

    // Show canvas
    document.getElementById(wrapId).style.display = 'none';
    document.getElementById(containerId).style.display = 'block';

    destroyChart('chart-dept-times');
    const ctx = document.getElementById('chart-dept-times').getContext('2d');

    _charts['chart-dept-times'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: counts,
          backgroundColor: colors.map(c => c + 'bb'),
          borderColor: colors,
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: CHART_DEFAULTS.legendPos,
            labels: {
              color: '#e2e8f0',
              padding: 16,
              font: { size: 11 },
              usePointStyle: true,
              pointStyleWidth: 10,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.95)',
            borderColor: 'rgba(6,182,212,0.4)',
            borderWidth: 1,
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            callbacks: {
              label: ctx => {
                const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                const pct = ((ctx.raw / total) * 100).toFixed(1);
                return ` ${fmtInt(ctx.raw)} OTs (${pct}%)`;
              },
            },
          },
        },
      },
    });

  } catch (err) {
    console.error('[loadDeptChart] Error:', err);
    showEmpty(wrapId, 'Sin datos disponibles');
  }
}

// ============================================================
// 7. BOTTLENECKS TABLE
// ============================================================

async function loadBottlenecks() {
  const wrapId = 'bottlenecks-wrap';

  try {
    // Query OTs grouped by machine
    const { data, error } = await db
      .from('ordenes_trabajo')
      .select('maquina_id, tiempo_atencion_min, fecha_hora_inicio, fecha_hora_fin, departamento, falla')
      .not('maquina_id', 'is', null)
      .limit(5000);

    if (error) throw error;
    if (!data || data.length === 0) {
      showEmpty(wrapId, 'Sin datos de máquinas disponibles');
      return;
    }

    // Aggregate by machine
    const machineMap = {};
    data.forEach(row => {
      const id = row.maquina_id;
      if (!machineMap[id]) machineMap[id] = { count: 0, totalHrs: 0, dept: row.departamento || '—', samples: 0 };
      machineMap[id].count += 1;

      let hrs = null;
      if (row.tiempo_atencion_min && row.tiempo_atencion_min > 0) {
        hrs = row.tiempo_atencion_min / 60;
      } else {
        hrs = durationHours(row.fecha_hora_inicio, row.fecha_hora_fin);
      }
      if (hrs !== null && hrs > 0 && hrs < 720) {
        machineMap[id].totalHrs += hrs;
        machineMap[id].samples += 1;
      }
    });

    const sorted = Object.entries(machineMap)
      .map(([id, v]) => ({
        id,
        count: v.count,
        avgHrs: v.samples > 0 ? v.totalHrs / v.samples : null,
        totalHrs: v.totalHrs,
        dept: v.dept,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const maxCount = sorted[0]?.count || 1;

    const rows = sorted.map((m, i) => {
      const rankClass = i < 3 ? 'top-3' : '';
      const deptLabel = DEPT_LABELS[m.dept] || m.dept;
      const pct = ((m.count / maxCount) * 100).toFixed(0);

      return `
        <tr>
          <td><span class="rank-badge ${rankClass}">${i + 1}</span></td>
          <td style="font-weight:600;color:#e2e8f0;">${m.id}</td>
          <td>
            <div>${fmtInt(m.count)} OTs</div>
            <div class="bar-mini" style="width:${pct}%"></div>
          </td>
          <td>${m.avgHrs !== null ? fmt1(m.avgHrs) + ' h' : '—'}</td>
          <td>${fmt1(m.totalHrs)} h</td>
          <td><span class="pill ${i < 3 ? 'pill-danger' : i < 6 ? 'pill-warning' : 'pill-success'}">${deptLabel}</span></td>
        </tr>`;
    }).join('');

    document.getElementById(wrapId).innerHTML = `
      <div class="data-table-wrapper">
        <table class="data-table" id="table-bottlenecks" aria-label="Tabla de cuellos de botella por máquina">
          <thead>
            <tr>
              <th>#</th>
              <th>Máquina</th>
              <th>Frecuencia</th>
              <th>MTTR Prom.</th>
              <th>Horas Total</th>
              <th>Área</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

  } catch (err) {
    console.error('[loadBottlenecks] Error:', err);
    showEmpty(wrapId, 'Sin datos disponibles');
  }
}

// ============================================================
// 8. MONTHLY TREND LINE CHART
// ============================================================

async function loadMonthlyTrend() {
  const wrapId = 'trend-chart-wrap';
  const containerId = 'trend-chart-container';

  try {
    // Fetch OTs from last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const { data, error } = await db
      .from('ordenes_trabajo')
      .select('fecha_hora_inicio, fecha_carga, estatus')
      .gte('fecha_carga', sixMonthsAgo.toISOString())
      .limit(5000);

    if (error) throw error;

    // Build month buckets
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        total: 0,
        closed: 0,
      });
    }

    if (data && data.length > 0) {
      data.forEach(row => {
        const ts = row.fecha_hora_inicio || row.fecha_carga;
        if (!ts) return;
        const d = new Date(ts);
        if (isNaN(d)) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const bucket = months.find(m => m.key === key);
        if (bucket) {
          bucket.total += 1;
          if (row.estatus && /cer/i.test(row.estatus)) bucket.closed += 1;
        }
      });
    }

    // Show canvas
    document.getElementById(wrapId).style.display = 'none';
    document.getElementById(containerId).style.display = 'block';

    destroyChart('chart-monthly-trend');
    const ctx = document.getElementById('chart-monthly-trend').getContext('2d');

    // Gradient fill
    const grad1 = ctx.createLinearGradient(0, 0, 0, 260);
    grad1.addColorStop(0, 'rgba(99,102,241,0.4)');
    grad1.addColorStop(1, 'rgba(99,102,241,0.0)');

    const grad2 = ctx.createLinearGradient(0, 0, 0, 260);
    grad2.addColorStop(0, 'rgba(6,182,212,0.35)');
    grad2.addColorStop(1, 'rgba(6,182,212,0.0)');

    _charts['chart-monthly-trend'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months.map(m => m.label),
        datasets: [
          {
            label: 'OTs Creadas',
            data: months.map(m => m.total),
            borderColor: '#6366f1',
            backgroundColor: grad1,
            borderWidth: 2.5,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'OTs Cerradas',
            data: months.map(m => m.closed),
            borderColor: '#06b6d4',
            backgroundColor: grad2,
            borderWidth: 2.5,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#06b6d4',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: CHART_DEFAULTS.legendPos,
            labels: {
              color: '#e2e8f0',
              padding: 20,
              font: { size: 12 },
              usePointStyle: true,
              pointStyleWidth: 10,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.95)',
            borderColor: 'rgba(99,102,241,0.4)',
            borderWidth: 1,
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            padding: 12,
          },
        },
        scales: {
          x: {
            grid: { color: CHART_DEFAULTS.gridColor },
            ticks: { color: CHART_DEFAULTS.tickColor, font: { size: 12 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: CHART_DEFAULTS.gridColor },
            ticks: { color: CHART_DEFAULTS.tickColor, font: { size: 11 }, precision: 0 },
          },
        },
      },
    });

  } catch (err) {
    console.error('[loadMonthlyTrend] Error:', err);
    showEmpty(wrapId, 'Sin datos disponibles');
  }
}

// ============================================================
// 9. CRITICAL INVENTORY TABLE
// ============================================================

async function loadCriticalInventory() {
  const wrapId = 'inventory-wrap';

  try {
    // Join inventario_refacciones (which has stock_actual/stock_minimo)
    // with cat_refacciones for the name
    const { data, error } = await db
      .from('inventario_refacciones')
      .select(`
        codigo_articulo,
        stock_actual,
        stock_minimo,
        unidad_medida,
        ubicacion,
        cat_refacciones (
          nombre_articulo,
          familia,
          unidad_medida
        )
      `)
      .lt('stock_actual', 5)
      .order('stock_actual', { ascending: true })
      .limit(30);

    if (error) throw error;

    // Also try cat_refacciones directly if the join returns nothing
    let rows = data || [];

    // Fallback: query cat_refacciones alone if inventario is empty
    if (rows.length === 0) {
      const { data: refData, error: refError } = await db
        .from('cat_refacciones')
        .select('codigo_articulo, nombre_articulo, familia, unidad_medida')
        .eq('activo', true)
        .limit(30);

      if (!refError && refData && refData.length > 0) {
        // Show catalog without stock (no inventory records)
        document.getElementById(wrapId).innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <div class="empty-state-text">No hay registros de inventario con stock bajo (< 5 unidades).<br>
            El catálogo tiene ${fmtInt(refData.length)}+ refacciones registradas.</div>
          </div>`;
        return;
      }

      showEmpty(wrapId, 'Sin datos de inventario disponibles');
      return;
    }

    const tableRows = rows.map(item => {
      const stock = parseFloat(item.stock_actual) || 0;
      const minimo = parseFloat(item.stock_minimo) || 0;
      const name = item.cat_refacciones?.nombre_articulo || item.codigo_articulo;
      const familia = item.cat_refacciones?.familia || '—';
      const uom = item.unidad_medida || item.cat_refacciones?.unidad_medida || 'pza';
      const ubicacion = item.ubicacion || '—';
      const pctFill = minimo > 0 ? Math.min((stock / minimo) * 100, 100) : (stock > 0 ? 50 : 0);

      let pillClass = 'pill-danger';
      let severity = 'Crítico';
      if (stock === 0) { pillClass = 'pill-danger'; severity = 'Sin Stock'; }
      else if (stock < 2) { pillClass = 'pill-danger'; severity = 'Crítico'; }
      else if (stock < 5) { pillClass = 'pill-warning'; severity = 'Bajo'; }

      return `
        <tr>
          <td style="font-family:monospace;font-size:0.8rem;color:#94a3b8;">${item.codigo_articulo}</td>
          <td style="font-weight:600;color:#e2e8f0;">${name}</td>
          <td>${familia}</td>
          <td>
            <div class="inv-stock-bar">
              <span style="font-weight:700;color:${stock === 0 ? '#ef4444' : stock < 2 ? '#f97316' : '#f59e0b'};min-width:36px;">
                ${fmt1(stock)} ${uom}
              </span>
              <div class="inv-stock-track">
                <div class="inv-stock-fill" style="width:${pctFill}%"></div>
              </div>
            </div>
          </td>
          <td style="color:var(--text-muted);">${fmt1(minimo)} ${uom}</td>
          <td>${ubicacion}</td>
          <td><span class="pill ${pillClass}">${severity}</span></td>
        </tr>`;
    }).join('');

    document.getElementById(wrapId).innerHTML = `
      <div class="data-table-wrapper">
        <table class="data-table" id="table-critical-inventory" aria-label="Tabla de inventario crítico de refacciones">
          <thead>
            <tr>
              <th>Código</th>
              <th>Artículo</th>
              <th>Familia</th>
              <th>Stock Actual</th>
              <th>Mínimo</th>
              <th>Ubicación</th>
              <th>Estatus</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`;

  } catch (err) {
    console.error('[loadCriticalInventory] Error:', err);
    showEmpty(wrapId, 'Sin datos disponibles');
  }
}

// ============================================================
// 10. MAIN ORCHESTRATOR
// ============================================================

async function loadDashboard() {
  console.log('[Dashboard] Loading all sections in parallel…');

  await Promise.allSettled([
    loadKPIs(),
    loadTechChart(),
    loadDeptChart(),
    loadBottlenecks(),
    loadMonthlyTrend(),
    loadCriticalInventory(),
  ]);

  console.log('[Dashboard] All sections loaded.');
}

// ============================================================
// 11. BOOT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});
