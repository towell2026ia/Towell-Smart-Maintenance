/* ==========================================================================
   Towell Smart Maintenance AI (TSM-AI) - Lógica de Aplicación (Vanilla JS)
   ========================================================================== */

// --- VARIABLES GLOBALES Y CONTROL DE ESTADO ---
let currentUser = null; // { role: 'admin' } o { role: 'tech', id: 'T-01', ... }
let activeAdminPanel = 'dashboard';
let activeTechPanel = 'dashboard';
let activePublicPanel = 'home';

// Instancias de Gráficos de Chart.js (para poder destruirlos/actualizarlos)
let chartOtCerrarInstance = null;
let chartComplianceInstance = null;
let chartBudgetPercentInstance = null;
let chartDowntimeInstance = null;

// Arreglo temporal de refacciones seleccionadas en el detalle de OT del técnico
let tempSelectedParts = [];

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  // Asegurar que el seed de datos esté cargado
  if (typeof initLocalStorage === 'function') {
    initLocalStorage();
  }
  
  // Registrar listeners de eventos de click fuera del dropdown de navbar
  window.addEventListener('click', (e) => {
    const menu = document.getElementById('menu-acceso-interno');
    const btn = document.getElementById('btn-acceso-interno');
    if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('show');
    }
  });

  // Cargar datos en los selects dinámicos
  populateTectSelects();
  
  // Renderizar vistas según estado inicial (público)
  showView('public-portal');
  showPublicPanel('home');
});

// --- ENRUTADOR DE VISTAS PRINCIPALES (SPA) ---
function showView(viewId) {
  // Ocultar todas las secciones de vista principal
  document.querySelectorAll('.view-section').forEach(view => {
    view.classList.remove('active');
  });
  
  // Mostrar la vista objetivo
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Ejecutar inicializaciones de datos según la vista
  if (viewId === 'admin') {
    renderAdminDashboard();
    updateAdminKPIs();
    renderAdminRequestsTable();
    renderAdminOrdersTable();
    renderAdminCalendar();
    renderAdminLogsTable();
    renderAdminMachinesTable();
    renderAdminPartsTable();
    renderAdminFormsList();
    // Actualizar badge de solicitudes nuevas
    updateRequestsBadge();
  } else if (viewId === 'tech') {
    renderTechDashboard();
    renderTechOrdersTable();
    renderTechChecklistsTable();
    populateTechMachineHistorySelect();
  }
}

// --- PORTAL PÚBLICO: NAVEGACIÓN Y ACCIONES ---
function showPublicPanel(panelName) {
  activePublicPanel = panelName;
  
  // Mostrar u ocultar botón de regresar en el portal público
  const backBtn = document.getElementById('btn-public-back');
  if (backBtn) {
    backBtn.style.display = (panelName === 'home') ? 'none' : 'inline-block';
  }
  
  // Paneles públicos a conmutar
  const panels = ['home', 'create', 'check', 'confirm'];
  panels.forEach(p => {
    const el = document.getElementById(`panel-public-${p}`);
    if (el) el.style.display = (p === panelName) ? 'block' : 'none';
  });

  if (panelName === 'create') {
    // Resetear formulario al entrar
    document.getElementById('form-new-request').reset();
    document.getElementById('req-file-preview').style.display = 'none';
    document.getElementById('req-file-preview').innerText = '';
    const machineSelect = document.getElementById('req-machine');
    machineSelect.innerHTML = '<option value="">Selecciona área primero</option>';
    machineSelect.disabled = true;
  } else if (panelName === 'check') {
    document.getElementById('check-folio-input').value = '';
    document.getElementById('check-result-container').style.display = 'none';
  }
}

function toggleAccesoInternoMenu() {
  const menu = document.getElementById('menu-acceso-interno');
  if (menu) {
    menu.classList.toggle('show');
  }
}

// Carga máquinas correspondientes al área seleccionada
function loadMachinesForArea(areaCode) {
  const machineSelect = document.getElementById('req-machine');
  if (!areaCode) {
    machineSelect.innerHTML = '<option value="">Selecciona área primero</option>';
    machineSelect.disabled = true;
    return;
  }

  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const filtered = machines.filter(m => m.area === areaCode);

  let html = '<option value="">Selecciona Máquina / Equipo</option>';
  filtered.forEach(m => {
    html += `<option value="${m.id}">${m.name} (${m.id})</option>`;
  });

  machineSelect.innerHTML = html;
  machineSelect.disabled = false;
}

// Disparador de input file oculto
function triggerFileInput(inputId) {
  document.getElementById(inputId).click();
}

// Mostrar preview de archivo seleccionado
function handleFileSelected(input, previewId) {
  const preview = document.getElementById(previewId);
  if (input.files && input.files[0]) {
    preview.innerText = `📄 ${input.files[0].name}`;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

// Envío de Nueva Solicitud Pública
function handleRequestSubmit(event) {
  event.preventDefault();
  
  const name = document.getElementById('req-name').value;
  const shift = document.getElementById('req-shift').value;
  const area = document.getElementById('req-area').value;
  const machine = document.getElementById('req-machine').value;
  const type = document.getElementById('req-type').value;
  const description = document.getElementById('req-description').value;
  const machineStopped = document.querySelector('input[name="req-stopped"]:checked').value;
  const urgency = document.getElementById('req-urgency').value;
  
  // Simular archivo subido
  const fileInput = document.getElementById('req-file');
  let evidenceFile = null;
  if (fileInput.files && fileInput.files[0]) {
    evidenceFile = fileInput.files[0].name;
  }

  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  
  // Generar folio temporal format: REQ-AÑO-CONSECUTIVO
  const currentYear = new Date().getFullYear();
  const consecutive = String(requests.length + 1).padStart(4, '0');
  const reqId = `REQ-${currentYear}-${consecutive}`;

  const newRequest = {
    id: reqId,
    applicant: name,
    shift: shift,
    area: area,
    machine: machine,
    type: type,
    description: description,
    machineStopped: machineStopped,
    urgency: urgency,
    status: 'Solicitud recibida',
    date: new Date().toISOString(),
    evidence: evidenceFile
  };

  requests.push(newRequest);
  localStorage.setItem('TSMAI_requests', JSON.stringify(requests));

  // Si la máquina está parada, actualizar estado de la máquina a "Parada"
  if (machineStopped === 'Sí') {
    const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
    const machineIndex = machines.findIndex(m => m.id === machine);
    if (machineIndex !== -1) {
      machines[machineIndex].status = 'Parada';
      localStorage.setItem('TSMAI_machines', JSON.stringify(machines));
    }
  }

  // Mostrar confirmación
  document.getElementById('confirm-folio').innerText = reqId;
  showPublicPanel('confirm');
  showToast(`Solicitud ${reqId} registrada correctamente.`);
}

// Copiar folio
function copyFolioToClipboard() {
  const folioText = document.getElementById('confirm-folio').innerText;
  navigator.clipboard.writeText(folioText).then(() => {
    showToast('Folio copiado al portapapeles.');
  });
}

// Consultar folio directamente desde la confirmación
function checkGeneratedFolio() {
  const folioText = document.getElementById('confirm-folio').innerText;
  showPublicPanel('check');
  document.getElementById('check-folio-input').value = folioText;
  handleSearchFolio();
}

// Buscar estado del folio
function handleSearchFolio() {
  const query = document.getElementById('check-folio-input').value.trim().toUpperCase();
  if (!query) {
    showToast('Por favor introduce un folio válido.');
    return;
  }

  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  
  // Buscar primero en solicitudes
  const req = requests.find(r => r.id === query);
  // Buscar en órdenes de trabajo
  const order = orders.find(o => o.id === query || o.reqId === query);

  const resultContainer = document.getElementById('check-result-container');
  
  if (!req && !order) {
    resultContainer.style.display = 'none';
    showToast('Folio no encontrado. Verifica la nomenclatura.');
    return;
  }

  resultContainer.style.display = 'block';

  // Extraer datos comunes
  let machineId = req ? req.machine : order.machine;
  let status = order ? order.status : req.status;
  let techName = 'Sin asignar';
  let dateReported = req ? req.date : order.date;

  const machineObj = machines.find(m => m.id === machineId);
  const machineName = machineObj ? machineObj.name : machineId;

  if (order && order.assignedTech) {
    const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
    const techObj = techs.find(t => t.id === order.assignedTech);
    if (techObj) techName = techObj.name;
  }

  // Renderizar detalles de resultado
  document.getElementById('check-result-machine').innerText = machineName;
  document.getElementById('check-result-status').innerHTML = `<span class="badge badge-status-${status.toLowerCase().replace('ó', 'o')}">${status}</span>`;
  document.getElementById('check-result-tech').innerText = techName;
  document.getElementById('check-result-date').innerText = new Date(dateReported).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Construir historial visual en el timeline
  const timelineList = document.getElementById('check-timeline-list');
  let timelineHTML = '';

  const logs = order ? order.historyLogs : [
    { date: req.date, status: 'Solicitud recibida', user: req.applicant, comment: 'Registro inicial de solicitud en portal público.' }
  ];

  logs.forEach(log => {
    timelineHTML += `
      <div style="background-color: var(--bg-light); border-left: 3px solid var(--accent-blue); padding: 10px; border-radius: 4px; font-size: 0.85rem;">
        <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--primary-dark);">
          <span>${log.status}</span>
          <span style="font-weight: normal; color: var(--text-muted); font-size: 0.75rem;">
            ${new Date(log.date).toLocaleDateString('es-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
          </span>
        </div>
        <div style="margin-top: 4px;">${log.comment}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Por: <strong>${log.user}</strong></div>
      </div>
    `;
  });

  timelineList.innerHTML = timelineHTML;
}

// --- CONTROL DE LOGIN ---
function openLogin(role) {
  document.getElementById('form-login').reset();
  document.getElementById('login-role-target').value = role;
  
  const label = role === 'admin' ? 'Acceso Super Administrador' : 'Acceso Equipo de Mantenimiento';
  document.querySelector('.login-logo h2').innerText = label;
  
  // Rellenar credenciales por defecto según rol
  if (role === 'admin') {
    document.getElementById('login-email').value = 'admin@tsm-ai.com';
    document.getElementById('login-password').value = 'admin123';
  } else {
    document.getElementById('login-email').value = 'carlos@tsm-ai.com';
    document.getElementById('login-password').value = 'tech123';
  }

  showView('login');
}

function quickLogin(role, techId) {
  if (role === 'admin') {
    currentUser = { role: 'admin', name: 'Super Administrador' };
    showToast('Sesión iniciada como Super Administrador.');
    showView('admin');
    switchAdminPanel('dashboard');
  } else {
    const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
    const tech = techs.find(t => t.id === techId);
    if (tech) {
      currentUser = { role: 'tech', ...tech };
      showToast(`Sesión iniciada como Técnico: ${tech.name}`);
      
      // Actualizar perfil técnico en la barra lateral
      document.getElementById('tech-profile-name').innerText = tech.name;
      document.getElementById('tech-profile-specialty').innerText = tech.specialty;
      document.getElementById('tech-profile-avatar').innerText = tech.avatar;
      
      showView('tech');
      switchTechPanel('dashboard');
    }
  }
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const role = document.getElementById('login-role-target').value;
  const email = document.getElementById('login-email').value;

  if (role === 'admin') {
    currentUser = { role: 'admin', name: 'Super Administrador' };
    showToast('Sesión iniciada correctamente.');
    showView('admin');
    switchAdminPanel('dashboard');
  } else {
    // Buscar técnico asociado al email
    const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
    const tech = techs.find(t => t.email.toLowerCase() === email.toLowerCase()) || techs[0];
    
    currentUser = { role: 'tech', ...tech };
    showToast(`Sesión iniciada como Técnico: ${tech.name}`);
    
    document.getElementById('tech-profile-name').innerText = tech.name;
    document.getElementById('tech-profile-specialty').innerText = tech.specialty;
    document.getElementById('tech-profile-avatar').innerText = tech.avatar;
    
    showView('tech');
    switchTechPanel('dashboard');
  }
}

function logout() {
  currentUser = null;
  showView('public-portal');
  showPublicPanel('home');
  showToast('Sesión cerrada correctamente.');
}

// --- PANEL SUPER ADMINISTRADOR ---
function switchAdminPanel(panelId) {
  activeAdminPanel = panelId;
  
  // Cambiar pestaña activa de la barra lateral
  document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
    item.classList.remove('active');
  });
  const activeMenuItem = document.getElementById(`menu-admin-${panelId}`);
  if (activeMenuItem) activeMenuItem.classList.add('active');

  // Cambiar paneles visibles
  document.querySelectorAll('.admin-panel-content').forEach(panel => {
    panel.style.display = 'none';
  });
  const activePanel = document.getElementById(`panel-admin-${panelId}`);
  if (activePanel) activePanel.style.display = 'block';

  // Configurar título de Topbar
  const titleLabels = {
    dashboard: '📊 Dashboard Ejecutivo',
    requests: '📨 Bandeja de Solicitudes Nuevas',
    orders: '📋 Control General de Órdenes de Trabajo',
    calendar: '📅 Calendario Mensual de Mantenimiento',
    logs: '📝 Historial de Bitácoras de Trabajo',
    machines: '⚙️ Catálogo de Maquinarias',
    parts: '📦 Control de Refacciones',
    forms: '🛠️ Formularios y Checklists Dinámicos',
    excel: '📥 Importador de Historiales de Excel',
    users: '👥 Control de Usuarios y Permisos',
    config: '⚙️ Configuración del Sistema'
  };
  document.getElementById('admin-panel-title').innerText = titleLabels[panelId] || 'Panel de Control';

  // Acciones de refresco específicas del panel
  if (panelId === 'dashboard') {
    renderAdminDashboard();
    updateAdminKPIs();
  } else if (panelId === 'requests') {
    renderAdminRequestsTable();
  } else if (panelId === 'orders') {
    populateTechFilters();
    renderAdminOrdersTable();
  } else if (panelId === 'calendar') {
    renderAdminCalendar();
  } else if (panelId === 'logs') {
    renderAdminLogsTable();
  } else if (panelId === 'machines') {
    renderAdminMachinesTable();
  } else if (panelId === 'parts') {
    renderAdminPartsTable();
  } else if (panelId === 'forms') {
    renderAdminFormsList();
  }
}

// Renderizado de Gráficos y Tablas del Dashboard Ejecutivo (Whiteboard layout)
function renderAdminDashboard() {
  const whiteboardData = JSON.parse(localStorage.getItem('TSMAI_whiteboard') || '{}');
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');

  // --- WIDGET 1: OT por cerrar (Barras Horizontales) ---
  const ctxOtCerrar = document.getElementById('chart-ot-por-cerrar');
  if (ctxOtCerrar) {
    if (chartOtCerrarInstance) chartOtCerrarInstance.destroy();
    
    // Contar OTs no cerradas por días de antigüedad de manera simulada/real
    // Usamos los datos bases y añadimos ajustes reales de OTs abiertas
    const openOrders = orders.filter(o => o.status !== 'Cerrada' && o.status !== 'Cancelada');
    const otCounts = [0, 0, 0, 0]; // 1-3 días, 4-7 días, 8-15 días, 15+ días
    
    openOrders.forEach(o => {
      const diffTime = Math.abs(new Date() - new Date(o.date));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) otCounts[0]++;
      else if (diffDays <= 7) otCounts[1]++;
      else if (diffDays <= 15) otCounts[2]++;
      else otCounts[3]++;
    });

    // Sumamos datos históricos de la pizarra para que se vea robusto
    const finalCounts = [
      whiteboardData.otPorCerrar.data[0] + otCounts[0],
      whiteboardData.otPorCerrar.data[1] + otCounts[1],
      whiteboardData.otPorCerrar.data[2] + otCounts[2],
      whiteboardData.otPorCerrar.data[3] + otCounts[3]
    ];

    chartOtCerrarInstance = new Chart(ctxOtCerrar, {
      type: 'bar',
      data: {
        labels: whiteboardData.otPorCerrar.labels,
        datasets: [{
          data: finalCounts,
          backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444', '#b91c1c'],
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { grid: { display: false } } }
      }
    });
  }

  // --- WIDGET 2: Alertas (Listado de maquinaria/recurrentes) ---
  const alertList = document.getElementById('wb-alert-list');
  if (alertList) {
    let alertHTML = '';
    
    // Alertas Dinámicas por máquinas paradas
    const stoppedMachines = machines.filter(m => m.status === 'Parada');
    stoppedMachines.forEach(m => {
      alertHTML += `
        <div class="alert-item">
          <span>⚠️</span>
          <div><strong>Máquina Parada:</strong> El equipo ${m.name} (${m.id}) en área ${m.area} requiere atención inmediata.</div>
        </div>
      `;
    });

    // Alertas estáticas de la pizarra
    whiteboardData.alertas.forEach(a => {
      const isCritical = a.message.includes('fuera de servicio') || a.message.includes('fallas');
      alertHTML += `
        <div class="alert-item ${isCritical ? '' : 'alert-warning'}">
          <span>${isCritical ? '🚨' : '⚠️'}</span>
          <div><strong>${a.type}:</strong> ${a.message}</div>
        </div>
      `;
    });
    alertList.innerHTML = alertHTML;
  }

  // --- WIDGET 3: % Cumplimiento (Dona 90%) ---
  const ctxCompliance = document.getElementById('chart-compliance');
  if (ctxCompliance) {
    if (chartComplianceInstance) chartComplianceInstance.destroy();

    // Calcular cumplimiento real basado en preventivos ejecutados/cerrados
    const prevOrders = orders.filter(o => o.type === 'MP');
    const prevClosed = prevOrders.filter(o => o.status === 'Cerrada' || o.status === 'Ejecutada');
    
    let compliance = 90; // Default
    if (prevOrders.length > 0) {
      compliance = Math.round((prevClosed.length / prevOrders.length) * 100);
      // Ponderar con valor histórico
      compliance = Math.round((compliance + 90) / 2);
    }
    
    document.getElementById('wb-compliance-value').innerText = `${compliance}%`;

    chartComplianceInstance = new Chart(ctxCompliance, {
      type: 'doughnut',
      data: {
        labels: ['Cumplido', 'Pendiente'],
        datasets: [{
          data: [compliance, 100 - compliance],
          backgroundColor: ['#16a34a', '#cbd5e1'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });
  }

  // --- WIDGET 4: Pronóstico vs Presupuesto mensual ---
  const ctxBudget = document.getElementById('chart-pronostico-presupuesto');
  if (ctxBudget) {
    if (chartBudgetPercentInstance) chartBudgetPercentInstance.destroy();

    chartBudgetPercentInstance = new Chart(ctxBudget, {
      type: 'bar',
      data: {
        labels: whiteboardData.pronosticoPresupuesto.labels,
        datasets: [
          {
            label: 'Pronóstico',
            data: whiteboardData.pronosticoPresupuesto.pronostico,
            backgroundColor: '#06b6d4'
          },
          {
            label: 'Presupuesto Asignado',
            data: whiteboardData.pronosticoPresupuesto.presupuesto,
            backgroundColor: '#2563eb'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        borderRadius: 4,
        plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { family: 'Outfit' } } } },
        scales: { x: { grid: { display: false } } }
      }
    });
  }

  // --- WIDGET 5: Horas Paro por departamento (Líneas TIN, TE, COS) ---
  const ctxDowntime = document.getElementById('chart-horas-paro');
  if (ctxDowntime) {
    if (chartDowntimeInstance) chartDowntimeInstance.destroy();

    // Actualizar total horas de paro sumando eventual downtime de máquinas paradas
    let totalDowntime = whiteboardData.downtimeHours.totalHours;
    document.getElementById('wb-total-downtime').innerText = `Total: ${totalDowntime} hrs`;

    chartDowntimeInstance = new Chart(ctxDowntime, {
      type: 'line',
      data: {
        labels: whiteboardData.downtimeHours.labels,
        datasets: [
          {
            label: 'TIN (Tintorería)',
            data: whiteboardData.downtimeHours.TIN,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 2
          },
          {
            label: 'TE (Tejeduría)',
            data: whiteboardData.downtimeHours.TE,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 2
          },
          {
            label: 'COS (Costura)',
            data: whiteboardData.downtimeHours.COS,
            borderColor: '#d97706',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 9, family: 'Outfit' } } } },
        scales: { x: { grid: { display: false } } }
      }
    });
  }

  // --- WIDGET 6: Tabla Top Máquina Falla / Costo ---
  const topMaquinaRows = document.getElementById('wb-top-maquina-rows');
  if (topMaquinaRows) {
    let rowsHTML = '';
    
    // Ordenar máquinas de localStorage por fallas y costos para hacerlo dinámico
    const machinesSorted = [...machines].sort((a,b) => (b.failures * b.cost) - (a.failures * a.cost));
    const top5 = machinesSorted.slice(0, 5);

    top5.forEach(m => {
      const areaText = m.area === 'PF' ? 'PF Prod' : m.area === 'CF' ? 'CF Costura' : m.area === 'TF' ? 'TF Tinte' : 'AF Planta';
      const isCritical = m.failures > 7;
      rowsHTML += `
        <tr>
          <td><strong>${areaText}</strong></td>
          <td>${m.name}</td>
          <td>$${m.cost}</td>
          <td>${m.failures}</td>
          <td><span class="badge badge-priority-${isCritical ? 'crítica' : 'seguridad'}">${isCritical ? 'Crítico' : 'Seguridad'}</span></td>
        </tr>
      `;
    });
    topMaquinaRows.innerHTML = rowsHTML;
  }
}

// Actualizar contadores del Admin
function updateAdminKPIs() {
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');

  const open = orders.filter(o => o.status !== 'Cerrada' && o.status !== 'Cancelada').length;
  const critical = orders.filter(o => o.urgency === 'Crítica' && o.status !== 'Cerrada').length;
  
  // OTs vencidas (fecha compromiso anterior a hoy y no cerrada)
  const now = new Date();
  const overdue = orders.filter(o => {
    return new Date(o.dueDate) < now && o.status !== 'Cerrada' && o.status !== 'Cancelada';
  }).length;

  const onHold = orders.filter(o => o.status === 'En espera').length;
  const preventives = orders.filter(o => o.type === 'MP').length;
  const newRequests = requests.filter(r => r.status === 'Solicitud recibida').length;

  document.getElementById('kpi-admin-ot-open').innerText = open;
  document.getElementById('kpi-admin-ot-critical').innerText = critical;
  document.getElementById('kpi-admin-ot-overdue').innerText = overdue;
  document.getElementById('kpi-admin-ot-hold').innerText = onHold;
  document.getElementById('kpi-admin-prev-month').innerText = preventives;
  document.getElementById('kpi-admin-new-req').innerText = newRequests;
}

// Actualizar indicador visual de la bandeja
function updateRequestsBadge() {
  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  const newCount = requests.filter(r => r.status === 'Solicitud recibida').length;
  const badge = document.getElementById('badge-count-requests');
  if (badge) {
    if (newCount > 0) {
      badge.innerText = newCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Render Tabla de Solicitudes Nuevas
function renderAdminRequestsTable() {
  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const tbody = document.getElementById('table-admin-requests-body');
  
  // Mostrar solo las nuevas en esta bandeja
  const newRequests = requests.filter(r => r.status === 'Solicitud recibida');

  if (newRequests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No hay solicitudes nuevas por revisar.</td></tr>`;
    return;
  }

  let html = '';
  newRequests.forEach(r => {
    const mach = machines.find(m => m.id === r.machine);
    const machineName = mach ? mach.name : r.machine;
    const formattedDate = new Date(r.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    html += `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${formattedDate}</td>
        <td>${r.area}</td>
        <td>${machineName}</td>
        <td>${r.type}</td>
        <td><span class="badge badge-priority-${r.urgency.toLowerCase()}">${r.urgency}</span></td>
        <td><span class="badge badge-status-recibida">Recibida</span></td>
        <td>
          <button class="btn-table-action" onclick="openReviewModal('${r.id}')">Revisar</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// --- MODAL DE REVISIÓN (ADMIN) ---
function openReviewModal(reqId) {
  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  const req = requests.find(r => r.id === reqId);
  if (!req) return;

  // Cargar datos en el modal
  document.getElementById('review-req-id').value = reqId;
  document.getElementById('review-lbl-applicant').innerText = req.applicant;
  document.getElementById('review-lbl-shift').innerText = req.shift;
  
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const mach = machines.find(m => m.id === req.machine);
  document.getElementById('review-lbl-area-machine').innerText = `${req.area} - ${mach ? mach.name : req.machine}`;
  document.getElementById('review-lbl-stopped').innerHTML = req.machineStopped === 'Sí' ? '<span style="color: var(--color-critical); font-weight: bold;">Sí ⚠️</span>' : 'No';
  document.getElementById('review-lbl-description').innerText = req.description;

  // Evidencia
  const fileBox = document.getElementById('review-lbl-file-box');
  if (req.evidence) {
    fileBox.style.display = 'block';
    document.getElementById('review-img-lbl').innerHTML = `🖼️ <a style="color: var(--accent-blue); text-decoration: underline; cursor:pointer;" onclick="alert('Visualizando archivo: ' + '${req.evidence}')">${req.evidence}</a>`;
  } else {
    fileBox.style.display = 'none';
  }

  // Pre-cargar inputs de asignación
  document.getElementById('review-type').value = req.type;
  document.getElementById('review-priority').value = req.urgency;

  // Sugerir fecha compromiso de hoy + 1 día
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0);
  // Formatear a string de local datetime
  const offset = tomorrow.getTimezoneOffset();
  tomorrow.setMinutes(tomorrow.getMinutes() - offset);
  document.getElementById('review-due-date').value = tomorrow.toISOString().slice(0, 16);

  openModal('modal-admin-review');
}

// Convertir solicitud pública en OT oficial
function convertToWorkOrder() {
  const reqId = document.getElementById('review-req-id').value;
  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  const reqIndex = requests.findIndex(r => r.id === reqId);
  if (reqIndex === -1) return;

  const req = requests[reqIndex];
  const type = document.getElementById('review-type').value;
  const priority = document.getElementById('review-priority').value;
  const techId = document.getElementById('review-tech').value;
  const dueDate = document.getElementById('review-due-date').value;

  if (!techId) {
    alert('Por favor, selecciona un técnico.');
    return;
  }

  // Cambiar estado de solicitud a convertida
  requests[reqIndex].status = 'Asignada';
  localStorage.setItem('TSMAI_requests', JSON.stringify(requests));

  // Generar Folio Oficial: TIPO-ÁREA-AÑO-CONSECUTIVO
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const currentYear = new Date().getFullYear();
  // Obtener consecutivo
  const filteredOrders = orders.filter(o => o.id.includes(`-${currentYear}-`));
  const maxConsecutive = filteredOrders.reduce((max, o) => {
    const parts = o.id.split('-');
    const num = parseInt(parts[parts.length - 1]);
    return num > max ? num : max;
  }, 0);
  
  const consecutiveStr = String(maxConsecutive + 1).padStart(4, '0');
  const otId = `${type}-${req.area}-${currentYear}-${consecutiveStr}`;

  // Buscar nombre de técnico
  const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
  const techObj = techs.find(t => t.id === techId);
  const techName = techObj ? techObj.name : 'Técnico';

  const newOrder = {
    id: otId,
    reqId: reqId,
    applicant: req.applicant,
    shift: req.shift,
    area: req.area,
    machine: req.machine,
    type: type,
    description: req.description,
    machineStopped: req.machineStopped,
    urgency: priority,
    status: 'Asignada',
    assignedTech: techId,
    date: req.date,
    dueDate: new Date(dueDate).toISOString(),
    evidence: req.evidence,
    historyLogs: [
      { date: req.date, status: 'Solicitud recibida', user: req.applicant, comment: 'Registro inicial de solicitud pública.' },
      { date: new Date().toISOString(), status: 'Asignada', user: 'Super Admin', comment: `Orden de trabajo generada y asignada a ${techName}` }
    ]
  };

  orders.push(newOrder);
  localStorage.setItem('TSMAI_orders', JSON.stringify(orders));

  closeModal('modal-admin-review');
  showToast(`OT ${otId} generada y asignada correctamente.`);
  
  // Refrescar paneles
  switchAdminPanel('requests');
  updateRequestsBadge();
}

function requestMoreInfoFromApplicant() {
  const reqId = document.getElementById('review-req-id').value;
  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  const reqIndex = requests.findIndex(r => r.id === reqId);
  if (reqIndex === -1) return;

  requests[reqIndex].status = 'En revisión';
  localStorage.setItem('TSMAI_requests', JSON.stringify(requests));
  
  closeModal('modal-admin-review');
  showToast(`Se solicitó más información para el reporte ${reqId}.`);
  switchAdminPanel('requests');
  updateRequestsBadge();
}

function cancelRequest() {
  const reqId = document.getElementById('review-req-id').value;
  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  const reqIndex = requests.findIndex(r => r.id === reqId);
  if (reqIndex === -1) return;

  requests[reqIndex].status = 'Rechazada';
  localStorage.setItem('TSMAI_requests', JSON.stringify(requests));
  
  closeModal('modal-admin-review');
  showToast(`Solicitud ${reqId} cancelada.`);
  switchAdminPanel('requests');
  updateRequestsBadge();
}

// --- TABLA DE ÓRDENES DE TRABAJO (ADMIN) ---
function populateTechFilters() {
  const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
  const filterSelect = document.getElementById('filter-ot-tech');
  if (!filterSelect) return;

  let html = '<option value="">Todos los Técnicos</option>';
  techs.forEach(t => {
    html += `<option value="${t.id}">${t.name}</option>`;
  });
  filterSelect.innerHTML = html;
}

function renderAdminOrdersTable(filteredOrders) {
  const orders = filteredOrders || JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
  const tbody = document.getElementById('table-admin-orders-body');

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">No se encontraron órdenes de trabajo.</td></tr>`;
    return;
  }

  let html = '';
  orders.forEach(o => {
    const mach = machines.find(m => m.id === o.machine);
    const machineName = mach ? mach.name : o.machine;
    const tech = techs.find(t => t.id === o.assignedTech);
    const techName = tech ? tech.name : 'Sin asignar';
    const formattedDueDate = new Date(o.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    html += `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${machineName}</td>
        <td>${o.area}</td>
        <td>${o.type}</td>
        <td><span class="badge badge-priority-${o.urgency.toLowerCase()}">${o.urgency}</span></td>
        <td>${techName}</td>
        <td><span class="badge badge-status-${o.status.toLowerCase().replace('ó', 'o')}">${o.status}</span></td>
        <td>${formattedDueDate}</td>
        <td>
          <button class="btn-table-action" onclick="viewOrderHistoryLogs('${o.id}')">Historial Logs</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// Aplicar filtros combinados
function applyOTFilters() {
  const status = document.getElementById('filter-ot-status').value;
  const area = document.getElementById('filter-ot-area').value;
  const tech = document.getElementById('filter-ot-tech').value;
  const urgency = document.getElementById('filter-ot-urgency').value;

  let orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');

  if (status) {
    orders = orders.filter(o => o.status === status);
  }
  if (area) {
    orders = orders.filter(o => o.area === area);
  }
  if (tech) {
    orders = orders.filter(o => o.assignedTech === tech);
  }
  if (urgency) {
    orders = orders.filter(o => o.urgency === urgency);
  }

  renderAdminOrdersTable(orders);
}

function viewOrderHistoryLogs(otId) {
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const order = orders.find(o => o.id === otId);
  if (!order) return;

  let logList = '';
  order.historyLogs.forEach(l => {
    logList += `- [${new Date(l.date).toLocaleDateString()}] ${l.status}: ${l.comment} (Por: ${l.user})\n`;
  });

  alert(`Historial de Transiciones para OT ${otId}:\n\n${logList}`);
}

// --- CALENDARIO (ADMIN) ---
function renderAdminCalendar() {
  const container = document.getElementById('calendar-grid-container');
  if (!container) return;

  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  let html = '';
  // Encabezados
  daysOfWeek.forEach(d => {
    html += `<div class="calendar-day-header">${d}</div>`;
  });

  // Generamos Junio 2026 (empieza lunes 1 de junio)
  // Añadimos celdas vacías previas si fuera necesario (Lunes es index 1, Dom es 0. En Junio 2026, 1 es Lunes, por tanto, Dom del día anterior es vacío)
  // Junio 2026 tiene 30 días
  
  // Agregar espacio vacío para el domingo anterior (1 de junio 2026 es lunes, por tanto, 1er día de la semana)
  html += `<div class="calendar-cell" style="opacity: 0.4;"><span class="calendar-date">31</span></div>`;

  for (let day = 1; day <= 30; day++) {
    const dateStr = `2026-06-${String(day).padStart(2, '0')}`;
    const dailyEvents = orders.filter(o => o.dueDate.startsWith(dateStr) || o.date.startsWith(dateStr));
    const isToday = day === 3; // Suponemos que hoy es 3 de junio de 2026

    html += `
      <div class="calendar-cell ${isToday ? 'today' : ''}">
        <span class="calendar-date">${day} ${isToday ? '(Hoy)' : ''}</span>
        <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 4px; overflow-y: auto; max-height: 60px;">
    `;

    dailyEvents.forEach(e => {
      const cls = e.type === 'MP' ? 'mp' : 'mc';
      html += `<span class="calendar-event calendar-event-${cls}" title="${e.id}: ${e.description}">${e.id}</span>`;
    });

    html += `
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// --- BITÁCORAS GENERALES (ADMIN) ---
function renderAdminLogsTable() {
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
  const tbody = document.getElementById('table-admin-logs-body');

  const executedOrders = orders.filter(o => o.status === 'Cerrada' || o.status === 'Ejecutada');

  if (executedOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No hay bitácoras de trabajo guardadas aún.</td></tr>`;
    return;
  }

  let html = '';
  executedOrders.forEach(o => {
    const tech = techs.find(t => t.id === o.assignedTech);
    const techName = tech ? tech.name : 'Técnico';
    const interventionStr = (o.interventionType || []).join(', ') || 'General';
    
    // Formatear refacciones
    let partsStr = 'Ninguna';
    if (o.usedParts && o.usedParts.length > 0) {
      partsStr = o.usedParts.map(p => `${p.name || p.partId} (x${p.quantity})`).join(', ');
    }

    const formattedDate = new Date(o.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });

    html += `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${interventionStr}</td>
        <td>${partsStr}</td>
        <td>${o.diagnosis || 'N/A'}</td>
        <td>${o.activity || 'N/A'}</td>
        <td>${techName}</td>
        <td>${formattedDate}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// --- CATÁLOGOS ADMIN (MÁQUINAS Y REFACCIONES) ---
function renderAdminMachinesTable() {
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const tbody = document.getElementById('table-admin-machines-body');

  let html = '';
  machines.forEach(m => {
    const statusColor = m.status === 'Operativa' ? 'var(--color-preventive)' : 'var(--color-critical)';
    html += `
      <tr>
        <td><strong>${m.id}</strong></td>
        <td>${m.name}</td>
        <td>${m.area}</td>
        <td>${m.mtbf} hrs</td>
        <td>${m.mttr} hrs</td>
        <td>${m.failures}</td>
        <td>$${m.cost} USD</td>
        <td><span style="display: inline-flex; align-items: center; gap: 4px; font-weight: 700; color: ${statusColor};"><span style="width: 8px; height: 8px; border-radius:50%; background: ${statusColor}"></span>${m.status}</span></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderAdminPartsTable() {
  const parts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
  const tbody = document.getElementById('table-admin-parts-body');

  let html = '';
  parts.forEach(p => {
    const lowStock = p.stock <= p.minStock;
    const stockBadge = lowStock ? '<span class="badge badge-priority-crítica">Reordenar / Bajo</span>' : '<span class="badge badge-status-ejecutada">Óptimo</span>';
    
    html += `
      <tr>
        <td><strong>${p.id}</strong></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>$${p.cost} USD</td>
        <td style="font-weight: 700; color: ${lowStock ? 'var(--color-critical)' : 'inherit'};">${p.stock}</td>
        <td>${p.minStock}</td>
        <td>${stockBadge}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// --- FORMULARIOS DINÁMICOS (ADMIN) ---
let tempFormFields = [];

function addFieldToBuilder() {
  const label = document.getElementById('fb-field-label').value.trim();
  const type = document.getElementById('fb-field-type').value;

  if (!label) {
    alert('Ingresa una etiqueta.');
    return;
  }

  tempFormFields.push({ label, type, required: true });
  document.getElementById('fb-field-label').value = '';

  renderFormFieldsBuilderPreview();
}

function renderFormFieldsBuilderPreview() {
  const container = document.getElementById('fb-fields-preview-list');
  let html = '';
  tempFormFields.forEach((f, idx) => {
    html += `
      <div class="form-builder-field-item">
        <span>❓ <strong>${f.label}</strong> (${f.type === 'checkbox' ? 'Sí/No' : f.type === 'text' ? 'Texto' : 'Número'})</span>
        <button class="btn-logout" onclick="removeFieldFromBuilder(${idx})" style="padding: 4px 8px; font-size: 0.75rem; width: auto; margin-top: 0;">Quitar</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

function removeFieldFromBuilder(index) {
  tempFormFields.splice(index, 1);
  renderFormFieldsBuilderPreview();
}

function saveDynamicForm() {
  const name = document.getElementById('fb-name').value.trim();
  const area = document.getElementById('fb-area').value;

  if (!name || tempFormFields.length === 0) {
    alert('Ingresa el nombre del checklist y añade al menos un campo.');
    return;
  }

  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const consecutive = String(forms.length + 1).padStart(2, '0');
  const newForm = {
    id: `F-${consecutive}`,
    name,
    area,
    fields: tempFormFields
  };

  forms.push(newForm);
  localStorage.setItem('TSMAI_dynamic_forms', JSON.stringify(forms));

  // Reset
  document.getElementById('fb-name').value = '';
  tempFormFields = [];
  renderFormFieldsBuilderPreview();
  renderAdminFormsList();
  showToast('Checklist dinámico guardado.');
}

function renderAdminFormsList() {
  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const container = document.getElementById('admin-forms-saved-list');
  if (!container) return;

  let html = '';
  forms.forEach(f => {
    html += `
      <div style="background-color: white; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px;">
        <div style="font-weight: 700; font-size: 0.9rem; color: var(--primary-dark);">${f.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Área: <strong>${f.area}</strong> | Campos: ${f.fields.length}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// --- EXCEL SIMULATION ---
function simulateExcelUpload(event) {
  event.preventDefault();
  const alertBox = document.getElementById('excel-success-alert');
  
  // Simular progreso de carga
  showToast('Procesando archivo de históricos...');
  
  setTimeout(() => {
    if (alertBox) alertBox.style.display = 'flex';
    showToast('Historial cargado con éxito.');
  }, 1000);
}

// --- PANEL DE EQUIPO TÉCNICO (MANTENIMIENTO) ---
function switchTechPanel(panelId) {
  activeTechPanel = panelId;

  document.querySelectorAll('#view-tech .sidebar-menu .menu-item').forEach(item => {
    item.classList.remove('active');
  });
  const activeMenuItem = document.getElementById(`menu-tech-${panelId}`);
  if (activeMenuItem) activeMenuItem.classList.add('active');

  document.querySelectorAll('.tech-panel-content').forEach(panel => {
    panel.style.display = 'none';
  });
  const activePanel = document.getElementById(`panel-tech-${panelId}`);
  if (activePanel) activePanel.style.display = 'block';

  const titleLabels = {
    dashboard: '📋 Mi Tablero Técnico',
    checklists: '📝 Checklists y Formatos de Trabajo',
    history: '⚙️ Historial de Máquinas en Planta',
    profile: '👤 Mi Perfil de Técnico'
  };
  document.getElementById('tech-panel-title').innerText = titleLabels[panelId] || 'Mi Tablero';

  if (panelId === 'dashboard') {
    renderTechDashboard();
    renderTechOrdersTable();
  } else if (panelId === 'checklists') {
    renderTechChecklistsTable();
  } else if (panelId === 'history') {
    populateTechMachineHistorySelect();
  }
}

// Renderizar KPI cards del Técnico
function renderTechDashboard() {
  if (!currentUser) return;
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  
  // Filtrar OTs asignadas a este técnico
  const myOrders = orders.filter(o => o.assignedTech === currentUser.id);

  const assigned = myOrders.filter(o => o.status === 'Asignada').length;
  const process = myOrders.filter(o => o.status === 'En proceso').length;
  const hold = myOrders.filter(o => o.status === 'En espera').length;
  
  const now = new Date();
  const overdue = myOrders.filter(o => {
    return new Date(o.dueDate) < now && o.status !== 'Cerrada' && o.status !== 'Cancelada' && o.status !== 'Ejecutada';
  }).length;

  // Terminadas hoy
  const todayStr = now.toISOString().slice(0, 10);
  const doneToday = myOrders.filter(o => {
    const isClosed = o.status === 'Cerrada' || o.status === 'Ejecutada';
    return isClosed && o.dueDate && o.dueDate.startsWith(todayStr);
  }).length;

  document.getElementById('kpi-tech-assigned').innerText = assigned;
  document.getElementById('kpi-tech-process').innerText = process;
  document.getElementById('kpi-tech-hold').innerText = hold;
  document.getElementById('kpi-tech-overdue').innerText = overdue;
  document.getElementById('kpi-tech-done-today').innerText = doneToday;
}

// Tabla de OTs de Técnico
function renderTechOrdersTable() {
  if (!currentUser) return;
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const tbody = document.getElementById('table-tech-orders-body');

  const myOrders = orders.filter(o => o.assignedTech === currentUser.id);
  const activeOrders = myOrders.filter(o => o.status !== 'Cerrada' && o.status !== 'Cancelada');

  if (activeOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No tienes órdenes de trabajo pendientes asignadas. ¡Buen trabajo!</td></tr>`;
    return;
  }

  let html = '';
  activeOrders.forEach(o => {
    const mach = machines.find(m => m.id === o.machine);
    const machineName = mach ? mach.name : o.machine;
    const formattedDueDate = new Date(o.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    html += `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${machineName}</td>
        <td>${o.area}</td>
        <td>${o.type}</td>
        <td><span class="badge badge-priority-${o.urgency.toLowerCase()}">${o.urgency}</span></td>
        <td><span class="badge badge-status-${o.status.toLowerCase().replace('ó', 'o')}">${o.status}</span></td>
        <td>${formattedDueDate}</td>
        <td>
          <button class="btn-table-action" onclick="openTechOrderDetailModal('${o.id}')">Ver detalle</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// --- MODAL DETALLE DE OT (TÉCNICO) ---
function openTechOrderDetailModal(otId) {
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const order = orders.find(o => o.id === otId);
  if (!order) return;

  document.getElementById('tech-ot-id').value = otId;
  document.getElementById('tech-ot-detail-title').innerText = `Detalle de Orden de Trabajo: ${otId}`;

  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const mach = machines.find(m => m.id === order.machine);
  
  document.getElementById('tech-ot-lbl-machine').innerText = mach ? mach.name : order.machine;
  document.getElementById('tech-ot-lbl-area').innerText = `${order.area} - ${mach ? mach.area : ''}`;
  document.getElementById('tech-ot-lbl-machinestate').innerText = mach ? mach.status : 'Operativa';
  document.getElementById('tech-ot-lbl-urgency').innerHTML = `<span class="badge badge-priority-${order.urgency.toLowerCase()}">${order.urgency}</span>`;
  document.getElementById('tech-ot-lbl-description').innerText = order.description;

  // Evidencia Inicial
  const fileBox = document.getElementById('tech-ot-lbl-file-box');
  if (order.evidence) {
    fileBox.style.display = 'block';
    document.getElementById('tech-ot-img-lbl').innerHTML = `🖼️ <a style="color: var(--accent-blue); text-decoration: underline; cursor:pointer;" onclick="alert('Visualizando archivo: ' + '${order.evidence}')">${order.evidence}</a>`;
  } else {
    fileBox.style.display = 'none';
  }

  // Cargar inputs del diagnóstico
  document.getElementById('tech-diagnosis').value = order.diagnosis || '';
  document.getElementById('tech-activity').value = order.activity || '';
  document.getElementById('tech-observations').value = order.observations || '';
  
  // Limpiar/Establecer checkboxes de intervención
  const selectedInterv = order.interventionType || [];
  document.querySelectorAll('input[name="tech-interv"]').forEach(chk => {
    chk.checked = selectedInterv.includes(chk.value);
  });

  // Inicializar catálogo de refacciones en el selector
  populateTechSparePartsSelect();
  
  // Cargar refacciones que ya se hayan guardado en esta OT
  tempSelectedParts = order.usedParts ? [...order.usedParts] : [];
  renderTechSelectedPartsList();

  // Reset file upload
  document.getElementById('tech-file').value = '';
  document.getElementById('tech-file-preview').style.display = 'none';

  openModal('modal-tech-ot-detail');
}

// Actualizar estado del trabajo directamente en sitio
function setWorkStatus(newStatus) {
  const otId = document.getElementById('tech-ot-id').value;
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const orderIndex = orders.findIndex(o => o.id === otId);
  if (orderIndex === -1) return;

  orders[orderIndex].status = newStatus;
  
  // Agregar log histórico
  orders[orderIndex].historyLogs.push({
    date: new Date().toISOString(),
    status: newStatus,
    user: currentUser.name,
    comment: `Estado de la orden actualizado a ${newStatus} por técnico.`
  });

  // Si pasa a "En proceso", asegurar que el estado de la máquina se actualice si estaba parada
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const machIndex = machines.findIndex(m => m.id === orders[orderIndex].machine);
  
  if (newStatus === 'Ejecutada' || newStatus === 'Cerrada') {
    if (machIndex !== -1) {
      machines[machIndex].status = 'Operativa';
    }
  }

  localStorage.setItem('TSMAI_orders', JSON.stringify(orders));
  localStorage.setItem('TSMAI_machines', JSON.stringify(machines));

  showToast(`Estado de la orden cambiado a ${newStatus}.`);
  renderTechDashboard();
  renderTechOrdersTable();

  // Actualizar label de estado del equipo en el modal
  if (machIndex !== -1) {
    document.getElementById('tech-ot-lbl-machinestate').innerText = machines[machIndex].status;
  }
}

// Cargar catálogo de refacciones en modal técnico
function populateTechSparePartsSelect() {
  const parts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
  const select = document.getElementById('tech-part-select');
  if (!select) return;

  let html = '<option value="">Selecciona repuesto...</option>';
  parts.forEach(p => {
    html += `<option value="${p.id}">${p.name} (Stock: ${p.stock})</option>`;
  });
  select.innerHTML = html;
}

// Añadir refacción a la lista temporal de la OT
function addPartToOTList() {
  const select = document.getElementById('tech-part-select');
  const partId = select.value;
  const qty = parseInt(document.getElementById('tech-part-qty').value);

  if (!partId || qty <= 0) {
    alert('Selecciona una refacción y define una cantidad válida.');
    return;
  }

  const parts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
  const part = parts.find(p => p.id === partId);
  if (!part) return;

  if (qty > part.stock) {
    alert(`Stock insuficiente. Solo quedan ${part.stock} unidades.`);
    return;
  }

  // Verificar si ya estaba agregada
  const existIndex = tempSelectedParts.findIndex(p => p.partId === partId);
  if (existIndex !== -1) {
    tempSelectedParts[existIndex].quantity += qty;
  } else {
    tempSelectedParts.push({
      partId: partId,
      name: part.name,
      quantity: qty
    });
  }

  renderTechSelectedPartsList();
}

function renderTechSelectedPartsList() {
  const list = document.getElementById('tech-used-parts-list');
  let html = '';
  tempSelectedParts.forEach((p, idx) => {
    html += `
      <li style="display: flex; justify-content: space-between; align-items: center; background-color: var(--bg-light); padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0;">
        <span>🔧 <strong>${p.name || p.partId}</strong> x${p.quantity}</span>
        <button type="button" class="btn-logout" onclick="removePartFromTechOTList(${idx})" style="padding: 4px 8px; font-size: 0.75rem; width: auto; margin-top: 0;">Quitar</button>
      </li>
    `;
  });
  list.innerHTML = html;
}

function removePartFromTechOTList(index) {
  tempSelectedParts.splice(index, 1);
  renderTechSelectedPartsList();
}

// Guardar bitácora y finalizar / actualizar orden
function saveTechnicalLog() {
  const otId = document.getElementById('tech-ot-id').value;
  const diagnosis = document.getElementById('tech-diagnosis').value.trim();
  const activity = document.getElementById('tech-activity').value.trim();
  const observations = document.getElementById('tech-observations').value.trim();
  
  if (!diagnosis || !activity) {
    alert('Por favor completa el Diagnóstico Técnico y la Actividad Realizada.');
    return;
  }

  // Intervenciones seleccionadas
  const interventionTypes = [];
  document.querySelectorAll('input[name="tech-interv"]:checked').forEach(chk => {
    interventionTypes.push(chk.value);
  });

  if (interventionTypes.length === 0) {
    alert('Selecciona al menos un tipo de intervención.');
    return;
  }

  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const orderIndex = orders.findIndex(o => o.id === otId);
  if (orderIndex === -1) return;

  const currentOrder = orders[orderIndex];

  // Restar refacciones del inventario
  const parts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
  
  // Revertir partes anteriores de la misma orden si las hubiera para no duplicar resta
  const previousParts = currentOrder.usedParts || [];
  previousParts.forEach(prev => {
    const idx = parts.findIndex(p => p.id === prev.partId);
    if (idx !== -1) parts[idx].stock += prev.quantity;
  });

  // Restar nuevas partes
  let stockError = false;
  tempSelectedParts.forEach(selected => {
    const idx = parts.findIndex(p => p.id === selected.partId);
    if (idx !== -1) {
      if (parts[idx].stock >= selected.quantity) {
        parts[idx].stock -= selected.quantity;
      } else {
        stockError = true;
      }
    }
  });

  if (stockError) {
    alert('Ocurrió un problema con el inventario de refacciones. Verifica cantidades.');
    return;
  }

  // Guardar datos en la OT
  orders[orderIndex].diagnosis = diagnosis;
  orders[orderIndex].activity = activity;
  orders[orderIndex].observations = observations;
  orders[orderIndex].interventionType = interventionTypes;
  orders[orderIndex].usedParts = tempSelectedParts;

  // Si no se había marcado como ejecutada o en espera, podemos dejarla en proceso
  // pero si se completó, normalmente pasa a "Ejecutada" para validación del Admin
  if (orders[orderIndex].status === 'Asignada') {
    orders[orderIndex].status = 'En proceso';
  }

  // Simular carga de archivo de cierre
  const fileInput = document.getElementById('tech-file');
  if (fileInput.files && fileInput.files[0]) {
    orders[orderIndex].finalEvidence = fileInput.files[0].name;
  }

  // Log de evento
  orders[orderIndex].historyLogs.push({
    date: new Date().toISOString(),
    status: orders[orderIndex].status,
    user: currentUser.name,
    comment: `Bitácora técnica actualizada. Diagnóstico: ${diagnosis.slice(0, 40)}...`
  });

  // Guardar
  localStorage.setItem('TSMAI_orders', JSON.stringify(orders));
  localStorage.setItem('TSMAI_parts', JSON.stringify(parts));

  // Actualizar también costo acumulado en máquina (dinamismo total del MVP)
  // Calculamos costo total de repuestos usados
  let extraCost = 0;
  tempSelectedParts.forEach(selected => {
    const part = parts.find(p => p.id === selected.partId);
    if (part) extraCost += part.cost * selected.quantity;
  });

  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const machIndex = machines.findIndex(m => m.id === currentOrder.machine);
  if (machIndex !== -1) {
    machines[machIndex].cost += extraCost;
    if (orders[orderIndex].status === 'Ejecutada') {
      machines[machIndex].failures += 1; // Sumar una falla al historial general
    }
    localStorage.setItem('TSMAI_machines', JSON.stringify(machines));
  }

  closeModal('modal-tech-ot-detail');
  showToast('Bitácora técnica guardada exitosamente.');
  
  // Recargar vistas
  renderTechDashboard();
  renderTechOrdersTable();
}

// --- DYNAMIC CHECKLISTS EN VISTA TÉCNICO ---
function renderTechChecklistsTable() {
  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const tbody = document.getElementById('table-tech-checklists-body');
  if (!tbody) return;

  if (forms.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No hay formatos cargados.</td></tr>`;
    return;
  }

  let html = '';
  forms.forEach(f => {
    html += `
      <tr>
        <td><strong>${f.id}</strong></td>
        <td>${f.name}</td>
        <td>${f.area}</td>
        <td>
          <button class="btn-table-action" onclick="openTechChecklistRunModal('${f.id}')">📋 Llenar Formato</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

let activeRunningFormId = null;

function openTechChecklistRunModal(formId) {
  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const form = forms.find(f => f.id === formId);
  if (!form) return;

  activeRunningFormId = formId;
  document.getElementById('tech-chk-title').innerText = form.name;

  const body = document.getElementById('tech-chk-body');
  let html = '';
  form.fields.forEach((f, idx) => {
    html += `
      <div class="form-group" style="margin-bottom: 16px;">
        <label>${f.label}</label>
    `;
    
    if (f.type === 'checkbox') {
      html += `
        <div class="radio-group">
          <label class="radio-label"><input type="radio" name="chk-field-${idx}" value="Sí" class="radio-input" required> Sí</label>
          <label class="radio-label"><input type="radio" name="chk-field-${idx}" value="No" class="radio-input"> No</label>
          <label class="radio-label"><input type="radio" name="chk-field-${idx}" value="N/A" class="radio-input" checked> N/A</label>
        </div>
      `;
    } else if (f.type === 'text') {
      html += `<input type="text" id="chk-field-${idx}" class="form-control" placeholder="${f.placeholder || 'Escribe aquí...'}" required>`;
    } else if (f.type === 'number') {
      html += `<input type="number" id="chk-field-${idx}" class="form-control" placeholder="0" required>`;
    }

    html += `</div>`;
  });

  body.innerHTML = html;
  openModal('modal-tech-checklist-run');
}

function submitChecklistResponse() {
  // Simular validación y guardado
  closeModal('modal-tech-checklist-run');
  showToast('Formato completado y cargado en el historial de la planta.');
}

// --- HISTORIAL DE MÁQUINA (TÉCNICO) ---
function populateTechMachineHistorySelect() {
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const select = document.getElementById('tech-history-machine-select');
  if (!select) return;

  let html = '<option value="">Selecciona máquina...</option>';
  machines.forEach(m => {
    html += `<option value="${m.id}">${m.name} (${m.id})</option>`;
  });
  select.innerHTML = html;
}

function loadTechMachineHistory(machineId) {
  const wrapper = document.getElementById('tech-machine-history-table-wrapper');
  if (!machineId) {
    if (wrapper) wrapper.style.display = 'none';
    return;
  }

  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const targetMachine = machines.find(m => m.id === machineId);
  
  document.getElementById('tech-history-title-lbl').innerText = `Historial de Intervenciones: ${targetMachine ? targetMachine.name : machineId}`;

  // Filtrar órdenes cerradas o ejecutadas para esta máquina
  const machineOrders = orders.filter(o => o.machine === machineId && (o.status === 'Cerrada' || o.status === 'Ejecutada'));

  const tbody = document.getElementById('table-tech-machine-history-body');

  if (machineOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No hay intervenciones registradas para esta máquina.</td></tr>`;
  } else {
    let html = '';
    machineOrders.forEach(o => {
      const formattedDate = new Date(o.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const interventionStr = (o.interventionType || []).join(', ') || 'General';
      html += `
        <tr>
          <td><strong>${o.id}</strong></td>
          <td>${o.type}</td>
          <td>${interventionStr}</td>
          <td>${o.diagnosis || 'N/A'}</td>
          <td>${o.activity || 'N/A'}</td>
          <td>${formattedDate}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }

  if (wrapper) wrapper.style.display = 'block';
}

// --- UTILERÍAS COMPARTIDAS (MODALES Y MENSAJES) ---
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.classList.add('show');
  }
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.classList.remove('show');
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  if (toast && toastText) {
    toastText.innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// Función auxiliar para rellenar los técnicos en el modal de conversión del admin
function populateTectSelects() {
  const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
  
  // Select en modal de revisión del admin
  const reviewTechSelect = document.getElementById('review-tech');
  if (reviewTechSelect) {
    let html = '<option value="">Selecciona técnico...</option>';
    techs.forEach(t => {
      html += `<option value="${t.id}">${t.name} (${t.specialty})</option>`;
    });
    reviewTechSelect.innerHTML = html;
  }
}

// Toggle para colapsar / expandir barra lateral en móviles
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('show');
  }
}
