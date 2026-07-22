/**
 * TSM-AI Analytics Dashboard — dashboard.js
 * Towell Smart Maintenance AI
 *
 * Renders executive KPIs, OT delay, alerts, compliance gauge, 
 * forecast vs budget (MXN), downtime hours, and top machines.
 */

// ============================================================
// 1. CONFIG & CLIENT INIT
// ============================================================

const _supa_url = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL
  : (window.TSM_CONFIG ? window.TSM_CONFIG.supabaseUrl : null);

const _supa_key = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY
  : (window.TSM_CONFIG ? window.TSM_CONFIG.supabaseKey : null);

if (!_supa_url || !_supa_key) {
  console.error('[Dashboard] Supabase credentials not found. Check config.js.');
}

const { createClient } = supabase;
const db = createClient(_supa_url, _supa_key);

// Chart registry to destroy before re-render
const _charts = {};

function destroyChart(id) {
  if (_charts[id]) {
    _charts[id].destroy();
    delete _charts[id];
  }
}

// Color palette for executive dashboard
const PALETTE = {
  blue: '#3b82f6',
  orange: '#f59e0b',
  red: '#ef4444',
  darkRed: '#b91c1c',
  green: '#10b981',
  purple: '#a855f7',
  cyan: '#06b6d4',
  textSecondary: '#94a3b8',
  gridColor: 'rgba(255,255,255,0.06)'
};

// ============================================================
// 2. UTILITY HELPERS
// ============================================================

function animateCounter(el, target, suffix = '', decimals = 0) {
  if (!el) return;
  const duration = 800;
  const start = performance.now();
  const startVal = 0;

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
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

function showEmpty(containerId, message = 'Sin datos disponibles') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">${message}</div>
    </div>`;
}

// ============================================================
// 3. MAIN DATA LOADER
// ============================================================

async function loadDashboard() {
  console.log('[Dashboard] Loading Executive metrics from Supabase...');

  try {
    // Show loaders
    toggleLoaders(true);

    // 1. Fetch standard catalogs & data in parallel
    const [
      { data: allOts, error: otErr },
      { data: refParts, error: refErr },
      { data: plans, error: planErr },
      { data: logs, error: logErr },
      { count: techCount, error: techErr }
    ] = await Promise.all([
      db.from('ordenes_trabajo').select('*'),
      db.from('cat_refacciones').select('*'),
      db.from('planes_mantenimiento_preventivo').select('*'),
      db.from('bitacora_mantenimiento').select('*'),
      db.from('cat_tecnicos').select('*', { count: 'exact', head: true }).eq('activo', true)
    ]);

    if (otErr) throw otErr;

    // Helper maps
    const refMap = {};
    (refParts || []).forEach(p => {
      refMap[p.codigo_articulo] = parseFloat(p.costo_unitario || p.precio_costo_unitario) || 0;
    });

    // 2. Render all dashboard elements
    renderKPIs(allOts, techCount);
    renderOTporCerrar(allOts);
    renderAlerts(allOts);
    renderCompliance(allOts);
    renderBudgetVsReal(allOts, refParts, plans, logs, refMap);
    renderDowntime(allOts);
    renderTopMachines(allOts, refParts, logs, refMap);

    toggleLoaders(false);
  } catch (err) {
    console.error('[loadDashboard] Error loading data:', err);
    toggleLoaders(false);
    showDashboardError();
  }
}

function toggleLoaders(show) {
  const elements = [
    { loader: 'ot-cerrar-loading', content: 'chart-ot-cerrar' },
    { loader: 'alerts-loading', content: 'alerts-container' },
    { loader: 'cumplimiento-loading', content: 'compliance-container' },
    { loader: 'presupuesto-loading', content: 'chart-budget-vs-real' },
    { loader: 'downtime-loading', content: 'chart-downtime-dept' },
    { loader: 'top-maquina-loading', content: 'top-maquina-container' }
  ];

  elements.forEach(item => {
    const lEl = document.getElementById(item.loader);
    const cEl = document.getElementById(item.content);
    if (lEl) lEl.style.display = show ? 'flex' : 'none';
    if (cEl) cEl.style.display = show ? 'none' : 'block';
  });
}

function showDashboardError() {
  ['kpi-ot-abiertas', 'kpi-ot-criticas', 'kpi-ot-vencidas', 'kpi-ot-espera', 'kpi-ot-nuevas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
}

// ============================================================
// 4. RENDER MODULES
// ============================================================

// --- 4.1 KPIs ---
function renderKPIs(allOts, techCount) {
  const activeOts = allOts.filter(o => 
    !['CERRADA', 'Cerrada', 'cerrada'].includes(o.estatus) && 
    !['SOLICITUD_RECIBIDA', 'Solicitud recibida'].includes(o.estatus)
  );

  const otAbiertas = activeOts.length;
  
  const otCriticas = activeOts.filter(o => 
    ['CRÍTICO', 'CRITICA', 'CRITICAL', 'Alta'].includes(o.prioridad)
  ).length;

  // OT Vencida: Abierta hace más de 5 días
  const today = new Date();
  const otVencidas = activeOts.filter(o => {
    const dateCarga = new Date(o.fecha_carga || o.fecha_hora_inicio);
    const ageDays = (today - dateCarga) / (1000 * 60 * 60 * 24);
    return ageDays > 5;
  }).length;

  const otEspera = activeOts.filter(o => o.estatus === 'EN_ESPERA').length;

  const otNuevas = allOts.filter(o => 
    ['SOLICITUD_RECIBIDA', 'Solicitud recibida'].includes(o.estatus)
  ).length;

  animateCounter(document.getElementById('kpi-ot-abiertas'), otAbiertas);
  animateCounter(document.getElementById('kpi-ot-criticas'), otCriticas);
  animateCounter(document.getElementById('kpi-ot-vencidas'), otVencidas);
  animateCounter(document.getElementById('kpi-ot-espera'), otEspera);
  animateCounter(document.getElementById('kpi-ot-nuevas'), otNuevas);
}

// --- 4.2 OT por Cerrar (Horizontal Bar Chart) ---
function renderOTporCerrar(allOts) {
  const activeOts = allOts.filter(o => 
    !['CERRADA', 'Cerrada', 'cerrada'].includes(o.estatus) && 
    !['SOLICITUD_RECIBIDA', 'Solicitud recibida'].includes(o.estatus)
  );

  document.getElementById('pending-ots-count').textContent = `${activeOts.length} abiertas`;

  const today = new Date();
  let range1_3 = 0;
  let range4_7 = 0;
  let range8_15 = 0;
  let range15Plus = 0;

  activeOts.forEach(o => {
    const dateCarga = new Date(o.fecha_carga || o.fecha_hora_inicio);
    const diffDays = (today - dateCarga) / (1000 * 60 * 60 * 24);
    if (diffDays <= 3) range1_3++;
    else if (diffDays <= 7) range4_7++;
    else if (diffDays <= 15) range8_15++;
    else range15Plus++;
  });

  destroyChart('chart-ot-cerrar');
  const ctx = document.getElementById('chart-ot-cerrar').getContext('2d');

  _charts['chart-ot-cerrar'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['1-3 Días', '4-7 Días', '8-15 Días', '15+ Días'],
      datasets: [{
        data: [range1_3, range4_7, range8_15, range15Plus],
        backgroundColor: [PALETTE.blue, PALETTE.orange, PALETTE.red, PALETTE.darkRed],
        borderWidth: 0,
        borderRadius: 4,
        barPercentage: 0.6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: PALETTE.gridColor },
          ticks: { color: PALETTE.textSecondary, precision: 0 }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#f1f5f9', font: { weight: '600' } }
        }
      }
    }
  });
}

// --- 4.3 Alertas ---
function renderAlerts(allOts) {
  const activeOts = allOts.filter(o => 
    !['CERRADA', 'Cerrada', 'cerrada'].includes(o.estatus) && 
    !['SOLICITUD_RECIBIDA', 'Solicitud recibida'].includes(o.estatus)
  );

  const container = document.getElementById('alerts-container');
  if (!container) return;

  const alerts = [];

  // Generate warning items based on active OTs
  activeOts.forEach(o => {
    if (o.prioridad === 'CRÍTICO' || o.prioridad === 'Alta') {
      alerts.push({
        type: 'danger',
        icon: '🚨',
        title: `Máquina: ${o.maquina_id || 'General'} fuera de servicio`,
        desc: `${o.descripcion || 'Falla eléctrica o mecánica crítica detectada.'}`
      });
    } else if (o.estatus === 'EN_ESPERA') {
      alerts.push({
        type: 'warning',
        icon: '⚠️',
        title: `Máquina: ${o.maquina_id || 'General'} en espera`,
        desc: `OT en espera por liberación de producción o refacciones.`
      });
    }
  });

  // Failures counter for recurrent warnings
  const machineFails = {};
  allOts.forEach(o => {
    if (o.maquina_id) {
      machineFails[o.maquina_id] = (machineFails[o.maquina_id] || 0) + 1;
    }
  });

  Object.entries(machineFails).forEach(([machine, count]) => {
    if (count >= 3) {
      alerts.push({
        type: 'info',
        icon: '📢',
        title: `Fallas Recurrentes: ${machine}`,
        desc: `Registra ${count} fallas acumuladas recientemente.`
      });
    }
  });

  if (alerts.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 2rem 0;">
        <div class="empty-state-icon" style="color:var(--success)">✅</div>
        <div class="empty-state-text" style="color:var(--success); font-weight:600;">0 alertas activas en planta</div>
      </div>`;
    return;
  }

  container.innerHTML = alerts.map(a => `
    <div class="alert-item alert-${a.type}">
      <span class="alert-icon">${a.icon}</span>
      <div class="alert-body">
        <div class="alert-title">${a.title}</div>
        <div class="alert-meta">${a.desc}</div>
      </div>
    </div>
  `).join('');
}

// --- 4.4 % Cumplimiento (Circular Progress Gauge) ---
function renderCompliance(allOts) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const otsThisMonth = allOts.filter(o => {
    const dateCarga = new Date(o.fecha_carga || o.fecha_hora_inicio);
    return dateCarga.getMonth() === currentMonth && dateCarga.getFullYear() === currentYear;
  });

  const totalThisMonth = otsThisMonth.length;
  const closedThisMonth = otsThisMonth.filter(o => 
    ['CERRADA', 'Cerrada', 'cerrada'].includes(o.estatus)
  ).length;

  const pct = totalThisMonth > 0 ? Math.round((closedThisMonth / totalThisMonth) * 100) : 100;

  document.getElementById('compliance-pct').textContent = `${pct}%`;

  destroyChart('chart-compliance-gauge');
  const ctx = document.getElementById('chart-compliance-gauge').getContext('2d');

  _charts['chart-compliance-gauge'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completado', 'Pendiente'],
      datasets: [{
        data: [pct, 100 - pct],
        backgroundColor: [PALETTE.green, 'rgba(255,255,255,0.08)'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }
  });
}

// --- 4.5 Pronóstico vs Presupuesto (USD -> MXN) ---
function renderBudgetVsReal(allOts, refParts, plans, logs, refMap) {
  // 1. Calculate standard monthly budget baseline
  let totalBaseRefacciones = 0;
  (refParts || []).forEach(r => {
    const qty = parseFloat(r.cantidad_estandar) || 1;
    const price = refMap[r.codigo_articulo] || 0;
    totalBaseRefacciones += (qty * price);
  });

  // Calculate monthly planned preventives
  const baseMonthlyBudget = Math.round(totalBaseRefacciones * 1.25);

  // 2. Fetch actual costs by month (last 6 months)
  const months = [];
  const monthLabels = [];
  const today = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(today.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      key,
      label: d.toLocaleDateString('es-MX', { month: 'short' }),
      real: 0,
      budget: baseMonthlyBudget
    });
    monthLabels.push(d.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase());
  }

  // Calculate from Supabase logs
  (logs || []).forEach(l => {
    const dateStr = l.fecha_hora_inicio || l.fecha_alta;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = months.find(m => m.key === key);

    if (bucket) {
      // Sum up used parts cost
      let cost = 0;
      try {
        let partsUsed = [];
        if (typeof l.refacciones_usadas === 'string') {
          partsUsed = JSON.parse(l.refacciones_usadas);
        } else if (Array.isArray(l.refacciones_usadas)) {
          partsUsed = l.refacciones_usadas;
        }

        partsUsed.forEach(item => {
          const uCost = refMap[item.partId] || 0;
          cost += (uCost * (item.quantity || 1));
        });
      } catch (e) {}
      bucket.real += cost;
    }
  });

  destroyChart('chart-budget-vs-real');
  const ctx = document.getElementById('chart-budget-vs-real').getContext('2d');

  _charts['chart-budget-vs-real'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: 'Pronóstico',
          data: months.map(m => Math.round(m.real)),
          backgroundColor: '#38bdf8', // Light blue
          borderRadius: 4
        },
        {
          label: 'Presupuesto Asignado',
          data: months.map(m => m.budget),
          backgroundColor: '#1d4ed8', // Dark blue
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#e2e8f0', usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` $${ctx.raw.toLocaleString('es-MX')} MXN`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: PALETTE.textSecondary } },
        y: {
          grid: { color: PALETTE.gridColor },
          ticks: {
            color: PALETTE.textSecondary,
            callback: value => `$${value.toLocaleString('es-MX')}`
          }
        }
      }
    }
  });
}

// --- 4.6 Horas Paro (Downtime) ---
function renderDowntime(allOts) {
  // Aggregate total downtime
  let totalDowntimeMin = 0;
  
  // Group downtime hours by department
  const depts = {
    TF: { label: 'TIN (Tintorería)', data: [0, 0, 0, 0, 0, 0], color: '#f43f5e' },
    PF: { label: 'TEJ (Tejido)', data: [0, 0, 0, 0, 0, 0], color: '#3b82f6' },
    CF: { label: 'COS (Costura)', data: [0, 0, 0, 0, 0, 0], color: '#eab308' }
  };

  const today = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(today.getMonth() - i);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase()
    });
  }

  allOts.forEach(o => {
    const mins = parseFloat(o.tiempo_atencion_min) || 0;
    if (mins > 0) {
      totalDowntimeMin += mins;
      
      const deptCode = o.departamento || '';
      const matchedDept = depts[deptCode];
      
      if (matchedDept) {
        const dateStr = o.fecha_carga || o.fecha_hora_inicio;
        if (dateStr) {
          const d = new Date(dateStr);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const mIdx = months.findIndex(m => m.key === key);
          if (mIdx !== -1) {
            matchedDept.data[mIdx] += (mins / 60);
          }
        }
      }
    }
  });

  const totalDowntimeHours = Math.round(totalDowntimeMin / 60);
  document.getElementById('total-downtime-hours').textContent = `TOTAL: ${totalDowntimeHours} HRS`;

  destroyChart('chart-downtime-dept');
  const ctx = document.getElementById('chart-downtime-dept').getContext('2d');

  const datasets = Object.values(depts).map(d => ({
    label: d.label,
    data: d.data.map(val => parseFloat(val.toFixed(1))),
    borderColor: d.color,
    backgroundColor: 'transparent',
    borderWidth: 2.5,
    tension: 0.3,
    pointRadius: 4
  }));

  _charts['chart-downtime-dept'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#e2e8f0', usePointStyle: true }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: PALETTE.textSecondary } },
        y: {
          grid: { color: PALETTE.gridColor },
          ticks: { color: PALETTE.textSecondary, precision: 0 }
        }
      }
    }
  });
}

// --- 4.7 Top Máquina Falla / Costo ---
function renderTopMachines(allOts, refParts, logs, refMap) {
  const container = document.getElementById('top-maquina-tbody');
  const wrap = document.getElementById('top-maquina-container');
  if (!container) return;

  const machines = {};

  allOts.forEach(o => {
    const mId = o.maquina_id;
    if (!mId) return;
    if (!machines[mId]) {
      machines[mId] = {
        id: mId,
        area: o.departamento || 'Planta',
        failures: 0,
        cost: 0,
        priority: 'NORMAL'
      };
    }
    machines[mId].failures++;
    if (['CRÍTICO', 'CRITICA', 'CRITICAL', 'Alta'].includes(o.prioridad)) {
      machines[mId].priority = 'CRÍTICO';
    }
  });

  // Calculate standard parts cost estimation for each machine
  (logs || []).forEach(l => {
    const mId = l.maquina_id;
    if (!mId || !machines[mId]) return;

    let partsCost = 0;
    try {
      let partsUsed = [];
      if (typeof l.refacciones_usadas === 'string') {
        partsUsed = JSON.parse(l.refacciones_usadas);
      } else if (Array.isArray(l.refacciones_usadas)) {
        partsUsed = l.refacciones_usadas;
      }

      partsUsed.forEach(item => {
        const cost = refMap[item.partId] || 0;
        partsCost += (cost * (item.quantity || 1));
      });
    } catch (e) {}

    machines[mId].cost += partsCost;
  });

  const sorted = Object.values(machines)
    .sort((a, b) => b.failures - a.failures || b.cost - a.cost)
    .slice(0, 5);

  if (sorted.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Sin registros de fallas</td></tr>`;
    return;
  }

  container.innerHTML = sorted.map(m => {
    let pClass = 'badge-normal';
    if (m.priority === 'CRÍTICO') pClass = 'badge-critico';
    else if (m.id.includes('SEC') || m.id.includes('COMP')) pClass = 'badge-seguridad';

    const areaName = m.area === 'TF' ? 'TF Tinte' : (m.area === 'CF' ? 'CF Costura' : 'PF Prod');

    return `
      <tr>
        <td><strong>${areaName}</strong></td>
        <td>${m.id}</td>
        <td>$${m.cost.toLocaleString('es-MX')}</td>
        <td>${m.failures}</td>
        <td><span class="badge-priority ${pClass}">${m.priority}</span></td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// 5. INITIALIZATION & AUTO-POLLING
// ============================================================

function updateDashLastUpdate() {
  const el = document.getElementById('dash-last-update');
  if (el) {
    const now = new Date();
    el.textContent = `Actualizado: ${now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboard();
  updateDashLastUpdate();

  // Auto-refresh every 30 seconds
  if (!window._dashboardInterval) {
    window._dashboardInterval = setInterval(async () => {
      try {
        console.log('[Dashboard] Auto-refreshing Executive dashboard...');
        await loadDashboard();
        updateDashLastUpdate();
      } catch (e) {
        console.warn('[Dashboard] Error during auto-refresh:', e);
      }
    }, 30000);
  }

  // Network online sync
  window.addEventListener('online', async () => {
    console.log('[Dashboard] Network restored. Refreshing dashboard...');
    await loadDashboard();
    updateDashLastUpdate();
    document.getElementById('conn-status-label').textContent = 'Sistema en Vivo';
    document.querySelector('.system-status-indicator').classList.remove('offline');
  });

  window.addEventListener('offline', () => {
    document.getElementById('conn-status-label').textContent = 'Sin conexión';
    document.querySelector('.system-status-indicator').classList.add('offline');
  });

  // Manual refresh button
  const btnRefresh = document.getElementById('btn-refresh-dashboard');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      btnRefresh.classList.add('spinning');
      btnRefresh.disabled = true;
      try {
        await loadDashboard();
        updateDashLastUpdate();
      } finally {
        setTimeout(() => {
          btnRefresh.classList.remove('spinning');
          btnRefresh.disabled = false;
        }, 800);
      }
    });
  }
});

