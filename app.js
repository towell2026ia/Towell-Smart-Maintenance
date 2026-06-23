/* ==========================================================================
   Towell Smart Maintenance AI (TSM-AI) - Lógica de Aplicación (Vanilla JS)
   ========================================================================== */

// --- INITIALIZE SUPABASE CLIENT ---
let supabaseClient = null;
if (typeof supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized successfully!');
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

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

// --- HELPERS DE BASE DE DATOS (CON FALLBACK A LOCALSTORAGE) ---
async function dbGetMachines() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('cat_maquinas')
        .select('*');
      if (error) throw error;
      return (data || []).map(m => ({
        id: m.equipo_towell,
        name: m.equipo_towell,
        area: m.area,
        clave: m.clave,
        proceso: m.proceso,
        tipo_equipo: m.tipo_equipo,
        activo: m.activo
      }));
    } catch (err) {
      console.error('Error fetching machines from Supabase:', err);
    }
  }
  return JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
}

async function dbGetTechnicians() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('cat_usuarios_roles')
        .select('*')
        .eq('rol', 'MANTENIMIENTO')
        .eq('activo', true);
      if (error) throw error;
      return (data || []).map(t => ({
        id: t.cve_tecnico || t.id_usuario,
        name: t.nombre_completo,
        email: t.correo,
        specialty: t.observaciones || 'General',
        avatar: '👨‍🔧'
      }));
    } catch (err) {
      console.error('Error fetching technicians from Supabase:', err);
    }
  }
  return JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
}

async function dbGetRequests() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('ordenes_trabajo')
        .select('*')
        .order('fecha_carga', { ascending: false });
      if (error) throw error;
      return (data || []).map(o => ({
        id: o.folio,
        applicant: o.nombre_solicitante,
        shift: o.turno_solicitante === 1 ? 'Turno Mañana' : o.turno_solicitante === 2 ? 'Turno Tarde' : 'Turno Nocturno',
        area: o.departamento,
        machine: o.maquina_id,
        type: o.orden_trabajo,
        description: o.descripcion,
        machineStopped: o.observacion_inicial ? 'Sí' : 'No',
        urgency: o.prioridad,
        status: o.estatus,
        date: o.fecha_hora_inicio || o.fecha_carga,
        evidence: null
      }));
    } catch (err) {
      console.error('Error fetching requests from Supabase:', err);
    }
  }
  return JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
}

async function dbGetOrders() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('ordenes_trabajo')
        .select('*')
        .order('fecha_carga', { ascending: false });
      if (error) throw error;
      return (data || []).map(o => ({
        id: o.folio,
        reqId: o.folio,
        applicant: o.nombre_solicitante,
        shift: o.turno_solicitante === 1 ? 'Turno Mañana' : o.turno_solicitante === 2 ? 'Turno Tarde' : 'Turno Nocturno',
        area: o.departamento,
        machine: o.maquina_id,
        type: o.orden_trabajo,
        description: o.descripcion,
        machineStopped: o.observacion_inicial ? 'Sí' : 'No',
        urgency: o.prioridad,
        status: o.estatus,
        assignedTech: o.cve_atendio,
        date: o.fecha_hora_inicio || o.fecha_carga,
        dueDate: o.fecha_fin ? `${o.fecha_fin}T${o.hora_fin}` : null,
        evidence: null,
        historyLogs: [
          { date: o.fecha_carga, status: 'Solicitud recibida', user: o.nombre_solicitante, comment: 'Registro inicial' }
        ]
      }));
    } catch (err) {
      console.error('Error fetching orders from Supabase:', err);
    }
  }
  return JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
}

async function dbGetParts() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('cat_refacciones')
        .select('*');
      if (error) throw error;
      return (data || []).map(p => ({
        id: p.codigo_articulo,
        name: p.nombre_articulo,
        category: p.familia,
        stock: 50,
        minStock: 5,
        cost: 100
      }));
    } catch (err) {
      console.error('Error fetching parts from Supabase:', err);
    }
  }
  return JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
}

async function dbInsertRequest(newRequest) {
  if (supabaseClient) {
    try {
      const insertData = {
        folio: newRequest.id,
        orden_trabajo: newRequest.type,
        origen: 'App',
        estatus: newRequest.status,
        fecha_inicio: newRequest.date.split('T')[0],
        hora_inicio: newRequest.date.split('T')[1].split('.')[0],
        fecha_hora_inicio: newRequest.date,
        departamento: newRequest.area,
        maquina_id: newRequest.machine,
        falla: newRequest.type,
        descripcion: newRequest.description,
        nombre_solicitante: newRequest.applicant,
        turno_solicitante: newRequest.shift.includes('Mañana') ? 1 : newRequest.shift.includes('Tarde') ? 2 : 3,
        prioridad: newRequest.urgency,
        fecha_carga: new Date().toISOString()
      };
      
      const { error } = await supabaseClient
        .from('ordenes_trabajo')
        .insert([insertData]);
      if (error) throw error;
      return;
    } catch (err) {
      console.error('Error inserting request in Supabase:', err);
    }
  }
  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  requests.push(newRequest);
  localStorage.setItem('TSMAI_requests', JSON.stringify(requests));
}

async function syncDatabases() {
  if (!supabaseClient) return;
  console.log('Starting Supabase synchronization...');
  
  try {
    // 1. Sync Machines
    const { data: dbMachines, error: mErr } = await supabaseClient.from('cat_maquinas').select('*');
    if (mErr) throw mErr;
    if (dbMachines && dbMachines.length > 0) {
      const localMachines = dbMachines.map(m => ({
        id: m.equipo_towell,
        name: m.equipo_towell,
        area: m.area,
        clave: m.clave,
        proceso: m.proceso,
        tipo_equipo: m.tipo_equipo,
        status: m.activo ? 'Operativa' : 'Parada'
      }));
      localStorage.setItem('TSMAI_machines', JSON.stringify(localMachines));
    } else {
      const localMachines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
      if (localMachines.length > 0) {
        const insertData = localMachines.map(m => ({
          equipo_towell: m.id,
          clave: m.id.split('-')[1] || m.id,
          area: m.area,
          proceso: m.area === 'PF' ? 'Tejido' : m.area === 'CF' ? 'Costura' : 'Tintorería',
          tipo_equipo: 'Maquinaria',
          activo: m.status === 'Operativa',
          origen: 'Seed'
        }));
        await supabaseClient.from('cat_maquinas').insert(insertData);
      }
    }

    // 2. Sync Technicians
    const { data: dbUsers, error: uErr } = await supabaseClient.from('cat_usuarios_roles').select('*');
    if (uErr) throw uErr;
    if (dbUsers && dbUsers.length > 0) {
      const localTechs = dbUsers.filter(u => u.rol === 'MANTENIMIENTO').map(t => ({
        id: t.cve_tecnico || t.id_usuario,
        name: t.nombre_completo,
        email: t.correo,
        specialty: t.observaciones || 'General',
        avatar: '👨‍🔧'
      }));
      localStorage.setItem('TSMAI_technicians', JSON.stringify(localTechs));
    } else {
      const localTechs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
      if (localTechs.length > 0) {
        const insertData = localTechs.map(t => ({
          nombre_completo: t.name,
          correo: t.email,
          rol: 'MANTENIMIENTO',
          cve_tecnico: t.id,
          cve_empleado: t.id,
          puede_crear_solicitud: false,
          puede_ver_ordenes_asignadas: true,
          puede_ver_todas_ordenes: false,
          puede_atender_orden: true,
          puede_cerrar_orden: true,
          puede_validar_cierre: false,
          activo: true,
          observaciones: t.specialty
        }));
        insertData.push({
          nombre_completo: 'Super Administrador',
          correo: 'admin@tsm-ai.com',
          rol: 'SUPER_ADMINISTRADOR',
          cve_empleado: 'ADM001',
          puede_crear_solicitud: true,
          puede_ver_ordenes_asignadas: true,
          puede_ver_todas_ordenes: true,
          puede_atender_orden: true,
          puede_cerrar_orden: true,
          puede_validar_cierre: true,
          puede_editar_catalogos: true,
          puede_ver_dashboards: true,
          puede_configurar_sistema: true,
          recibe_alertas: true,
          activo: true,
          observaciones: 'Acceso Completo'
        });
        await supabaseClient.from('cat_usuarios_roles').insert(insertData);
      }
    }

    // 3. Sync Spare Parts
    const { data: dbParts, error: pErr } = await supabaseClient.from('cat_refacciones').select('*');
    if (pErr) throw pErr;
    if (dbParts && dbParts.length > 0) {
      const localParts = dbParts.map(p => ({
        id: p.codigo_articulo,
        name: p.nombre_articulo,
        category: p.familia,
        stock: 50,
        minStock: 5,
        cost: 100
      }));
      localStorage.setItem('TSMAI_parts', JSON.stringify(localParts));
    } else {
      const localParts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
      if (localParts.length > 0) {
        const insertData = localParts.map(p => ({
          codigo_articulo: p.id,
          nombre_articulo: p.name,
          unidad_medida: 'PZ',
          familia: p.category,
          activo: true
        }));
        await supabaseClient.from('cat_refacciones').insert(insertData);
      }
    }

    // 4. Sync Orders & Requests
    const { data: dbOrders, error: oErr } = await supabaseClient.from('ordenes_trabajo').select('*');
    if (oErr) throw oErr;
    if (dbOrders && dbOrders.length > 0) {
      const localRequests = [];
      const localOrders = [];
      
      dbOrders.forEach(o => {
        const item = {
          id: o.folio,
          reqId: o.folio,
          applicant: o.nombre_solicitante,
          shift: o.turno_solicitante === 1 ? 'Turno Mañana' : o.turno_solicitante === 2 ? 'Turno Tarde' : 'Turno Nocturno',
          area: o.departamento,
          machine: o.maquina_id,
          type: o.orden_trabajo || 'MC',
          description: o.descripcion,
          machineStopped: o.observacion_inicial || 'No',
          urgency: o.prioridad || 'Media',
          status: o.estatus,
          assignedTech: o.cve_atendio,
          date: o.fecha_hora_inicio || o.fecha_carga,
          dueDate: o.fecha_fin ? `${o.fecha_fin}T${o.hora_fin}` : null,
          evidence: null,
          historyLogs: [
            { date: o.fecha_carga, status: 'Solicitud recibida', user: o.nombre_solicitante, comment: 'Registro inicial.' }
          ]
        };
        
        localRequests.push(item);
        if (o.estatus !== 'Solicitud recibida') {
          localOrders.push(item);
        }
      });
      
      localStorage.setItem('TSMAI_requests', JSON.stringify(localRequests));
      localStorage.setItem('TSMAI_orders', JSON.stringify(localOrders));
    } else {
      const localRequests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
      const localOrders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
      const combined = new Map();
      
      localRequests.forEach(r => {
        combined.set(r.id, {
          folio: r.id,
          orden_trabajo: r.type,
          origen: 'App',
          estatus: r.status,
          fecha_inicio: r.date.split('T')[0],
          hora_inicio: r.date.split('T')[1]?.split('.')[0] || '12:00:00',
          fecha_hora_inicio: r.date,
          departamento: r.area,
          maquina_id: r.machine,
          falla: r.type,
          descripcion: r.description,
          nombre_solicitante: r.applicant,
          turno_solicitante: r.shift.includes('Mañana') ? 1 : r.shift.includes('Tarde') ? 2 : 3,
          prioridad: r.urgency
        });
      });
      
      localOrders.forEach(o => {
        combined.set(o.id, {
          folio: o.id,
          orden_trabajo: o.type,
          origen: 'App',
          estatus: o.status,
          fecha_inicio: o.date.split('T')[0],
          hora_inicio: o.date.split('T')[1]?.split('.')[0] || '12:00:00',
          fecha_hora_inicio: o.date,
          departamento: o.area,
          maquina_id: o.machine,
          falla: o.type,
          descripcion: o.description,
          nombre_solicitante: o.applicant,
          turno_solicitante: o.shift.includes('Mañana') ? 1 : o.shift.includes('Tarde') ? 2 : 3,
          prioridad: o.urgency,
          cve_atendio: o.assignedTech,
          fecha_fin: o.dueDate ? o.dueDate.split('T')[0] : null,
          hora_fin: o.dueDate ? o.dueDate.split('T')[1]?.slice(0,8) : null,
          fecha_hora_fin: o.dueDate || null
        });
      });
      
      if (combined.size > 0) {
        await supabaseClient.from('ordenes_trabajo').insert(Array.from(combined.values()));
      }
    }
    console.log('Supabase synchronization finished successfully.');
  } catch (err) {
    console.error('Error during Supabase synchronization:', err);
  }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
  // Asegurar que el seed de datos esté cargado
  if (typeof initLocalStorage === 'function') {
    initLocalStorage();
  }
  
  // Sincronizar bases de datos con Supabase
  await syncDatabases();
  
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
async function handleRequestSubmit(event) {
  event.preventDefault();
  
  const name = document.getElementById('req-name').value;
  const shift = document.getElementById('req-shift').value;
  const area = document.getElementById('req-area').value;
  const machine = document.getElementById('req-machine').value;
  const type = document.getElementById('req-type').value;
  const description = document.getElementById('req-description').value;
  const machineStopped = document.querySelector('input[name="req-stopped"]:checked').value;
  const urgency = document.getElementById('req-urgency').value;
  
  const fileInput = document.getElementById('req-file');
  let evidenceFile = null;
  if (fileInput.files && fileInput.files[0]) {
    evidenceFile = fileInput.files[0].name;
  }

  // Generar folio de negocio: PREFIJO + CONSECUTIVO (ej: PF00001)
  const prefix = area; // PF, CF, TF, AF
  const combinedList = [
    ...(JSON.parse(localStorage.getItem('TSMAI_requests') || '[]')),
    ...(JSON.parse(localStorage.getItem('TSMAI_orders') || '[]'))
  ];
  const count = combinedList.filter(o => o.id.startsWith(prefix)).length + 1;
  const reqId = `${prefix}${String(count).padStart(5, '0')}`;

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

  // Insertar en la base de datos (con fallback a localstorage)
  await dbInsertRequest(newRequest);

  // Si la máquina está parada, actualizar estado de la máquina a "Parada" (activo = false)
  if (machineStopped === 'Sí') {
    const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
    const machineIndex = machines.findIndex(m => m.id === machine);
    if (machineIndex !== -1) {
      machines[machineIndex].status = 'Parada';
      localStorage.setItem('TSMAI_machines', JSON.stringify(machines));
    }
    
    if (supabaseClient) {
      try {
        await supabaseClient
          .from('cat_maquinas')
          .update({ activo: false })
          .eq('equipo_towell', machine);
      } catch (err) {
        console.error('Error updating machine status in Supabase:', err);
      }
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
async function convertToWorkOrder() {
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

  // Folio Oficial: Mantiene el folio original generado en el portal (ej: PF00001)
  const otId = reqId;

  // Buscar nombre de técnico
  const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
  const techObj = techs.find(t => t.id === techId);
  const techName = techObj ? techObj.name : 'Técnico';

  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
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

  // Actualizar en Supabase
  if (supabaseClient) {
    try {
      const parsedDueDate = new Date(dueDate);
      await supabaseClient
        .from('ordenes_trabajo')
        .update({
          estatus: 'Asignada',
          orden_trabajo: type,
          cve_atendio: techId,
          nombre_atendio: techName,
          prioridad: priority,
          fecha_fin: parsedDueDate.toISOString().split('T')[0],
          hora_fin: parsedDueDate.toTimeString().split(' ')[0],
          fecha_hora_fin: parsedDueDate.toISOString()
        })
        .eq('folio', reqId);
    } catch (err) {
      console.error('Error updating order in Supabase:', err);
    }
  }

  closeModal('modal-admin-review');
  showToast(`OT ${otId} asignada correctamente.`);
  
  // Refrescar paneles
  switchAdminPanel('requests');
  updateRequestsBadge();
}

async function requestMoreInfoFromApplicant() {
  const reqId = document.getElementById('review-req-id').value;
  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  const reqIndex = requests.findIndex(r => r.id === reqId);
  if (reqIndex === -1) return;

  requests[reqIndex].status = 'En revisión';
  localStorage.setItem('TSMAI_requests', JSON.stringify(requests));
  
  if (supabaseClient) {
    try {
      await supabaseClient
        .from('ordenes_trabajo')
        .update({ estatus: 'En revisión' })
        .eq('folio', reqId);
    } catch (err) {
      console.error('Error updating request status in Supabase:', err);
    }
  }
  
  closeModal('modal-admin-review');
  showToast(`Se solicitó más información para el reporte ${reqId}.`);
  switchAdminPanel('requests');
  updateRequestsBadge();
}

async function cancelRequest() {
  const reqId = document.getElementById('review-req-id').value;
  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  const reqIndex = requests.findIndex(r => r.id === reqId);
  if (reqIndex === -1) return;

  requests[reqIndex].status = 'Rechazada';
  localStorage.setItem('TSMAI_requests', JSON.stringify(requests));
  
  if (supabaseClient) {
    try {
      await supabaseClient
        .from('ordenes_trabajo')
        .update({ estatus: 'Rechazada' })
        .eq('folio', reqId);
    } catch (err) {
      console.error('Error updating request status in Supabase:', err);
    }
  }
  
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
// --- REAL EXCEL UPLOAD & INGESTION ---
async function handleRealExcelUpload(event) {
  event.preventDefault();
  
  let files;
  if (event.dataTransfer) {
    files = event.dataTransfer.files;
  } else if (event.target) {
    files = event.target.files;
  }
  
  if (!files || files.length === 0) return;
  const file = files[0];
  const filename = file.name;
  const maquinaIdFromFilename = filename.split('.')[0];
  
  showToast(`Procesando archivo: ${filename}...`);
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (jsonData.length === 0) {
        showToast('El archivo Excel está vacío.');
        return;
      }
      
      // Crear registro de control de carga
      const logRecord = {
        nombre_archivo: filename,
        tipo_archivo: file.type || filename.split('.').pop(),
        fuente: 'Excel Import',
        fecha_carga: new Date().toISOString(),
        usuario_carga: currentUser ? currentUser.name : 'Super Admin',
        registros_leidos: jsonData.length,
        registros_correctos: 0,
        registros_error: 0,
        estatus_carga: 'Pendiente',
        observaciones: 'Procesando archivo...'
      };
      
      let dbCargaId = null;
      if (supabaseClient) {
        try {
          const { data: cData, error: cErr } = await supabaseClient
            .from('control_cargas_archivos')
            .insert([logRecord])
            .select();
          if (!cErr && cData && cData.length > 0) {
            dbCargaId = cData[0].id_carga;
          }
        } catch (err) {
          console.error('Error inserting log in Supabase:', err);
        }
      }
      
      // Autodetectar tipo de archivo basado en columnas del primer registro
      const firstRow = jsonData[0];
      const keys = Object.keys(firstRow).map(k => k.toLowerCase().trim());
      
      let detectedType = '';
      let correctCount = 0;
      let errorCount = 0;
      
      const hasKey = (arr, term) => arr.some(k => k.includes(term));
      
      if (hasKey(keys, 'equipo tow') || hasKey(keys, 'equipo_tow') || hasKey(keys, 'clave')) {
        detectedType = 'Catálogo de Máquinas';
        const machinesToInsert = [];
        jsonData.forEach(row => {
          try {
            const eqTowell = row['EQUIPO TOWELL'] || row['equipo towell'] || row['Equipo Towell'] || row['EQUIPO_TOWELL'];
            const clave = row['Clave'] || row['clave'] || row['CLAVE'] || row['CLAVE_MAQUINA'];
            if (!eqTowell) throw new Error('Falta columna EQUIPO TOWELL');
            
            let area = 'PF';
            if (eqTowell.includes('COS')) area = 'CF';
            else if (eqTowell.includes('TIN') || eqTowell.includes('JET')) area = 'TF';
            else if (eqTowell.includes('AUX') || eqTowell.includes('SUB') || eqTowell.includes('COM')) area = 'AF';
            
            machinesToInsert.push({
              equipo_towell: eqTowell,
              clave: clave || eqTowell.split('-')[1] || eqTowell,
              area: area,
              proceso: area === 'PF' ? 'Tejido' : area === 'CF' ? 'Costura' : 'Tintorería',
              tipo_equipo: 'Maquinaria',
              activo: true,
              origen: 'Excel Import'
            });
            correctCount++;
          } catch (err) {
            console.error('Fila con error:', err);
            errorCount++;
          }
        });
        
        if (supabaseClient && machinesToInsert.length > 0) {
          const { error: upsertErr } = await supabaseClient
            .from('cat_maquinas')
            .upsert(machinesToInsert, { onConflict: 'equipo_towell' });
          if (upsertErr) throw upsertErr;
        }
        
      } else if (hasKey(keys, 'depto') || hasKey(keys, 'nom_empl') || hasKey(keys, 'nomempl') || hasKey(keys, 'cveempl') || hasKey(keys, 'cve_empl')) {
        detectedType = 'Órdenes de Telegram';
        const telegramStaging = [];
        const productionOrders = [];
        
        jsonData.forEach(row => {
          try {
            const id = parseInt(row['Id'] || row['id'] || row['ID']) || correctCount + 1;
            const folio = row['Folio'] || row['folio'] || row['FOLIO'];
            const estatus = row['Estatus'] || row['estatus'] || row['ESTATUS'] || 'Solicitud recibida';
            const fecha = parseExcelDate(row['Fecha'] || row['fecha'] || row['FECHA']);
            const hora = row['Hora'] || row['hora'] || row['HORA'] || '12:00:00';
            const depto = row['Depto'] || row['depto'] || row['DEPTO'];
            const maquina_id = row['MaquinaId'] || row['maquina_id'] || row['Maquinaid'] || row['MAQUINAID'] || row['maquina'];
            const tipo_falla_id = row['TipoFallaId'] || row['tipofallaid'] || row['tipo_falla_id'];
            const falla = row['Falla'] || row['falla'] || row['FALLA'];
            const hora_fin = row['HoraFin'] || row['horafin'] || row['hora_fin'];
            const cve_empl = row['CveEmpl'] || row['cveempl'] || row['cve_empl'];
            const nom_empl = row['NomEmpl'] || row['nomempl'] || row['nom_empl'];
            const turno = parseInt(row['Turno'] || row['turno'] || row['TURNO']) || 1;
            const cve_atendio = row['CveAtendio'] || row['cveatendio'] || row['cve_atendio'];
            const nom_atendio = row['NomAtendio'] || row['nomatendio'] || row['nom_atendio'];
            const turno_atendio = parseInt(row['TurnoAtendio'] || row['turnoatendio'] || row['turno_atendio']) || null;
            const obs = row['Obs'] || row['obs'] || row['OBS'];
            const orden_trabajo = row['OrdenTrabajo'] || row['ordentrabajo'] || row['orden_trabajo'];
            const descripcion = row['Descripcion'] || row['descripción'] || row['descripcion'] || row['DESCRIPCION'];
            const enviado = row['Enviado'] || row['enviado'] || row['ENVIADO'] || false;
            const obs_cierre = row['ObsCierre'] || row['obscierre'] || row['obs_cierre'];
            const calidad = parseInt(row['Calidad'] || row['calidad'] || row['CALIDAD']) || null;
            const fecha_fin_val = row['FechaFin'] || row['fechafin'] || row['fecha_fin'];
            const fecha_fin = fecha_fin_val ? parseExcelDate(fecha_fin_val) : null;
            
            telegramStaging.push({
              id, folio, estatus, fecha: fecha.toISOString().split('T')[0], hora, depto, maquina_id, tipo_falla_id,
              falla, hora_fin, cve_empl, nom_empl, turno, cve_atendio, nom_atendio, turno_atendio, obs,
              orden_trabajo, descripcion, enviado: enviado === 'True' || enviado === true, obs_cierre, calidad,
              fecha_fin: fecha_fin ? fecha_fin.toISOString().split('T')[0] : null
            });
            
            productionOrders.push({
              id_original: id,
              folio: folio || `TG-${id}`,
              orden_trabajo: orden_trabajo || 'MC',
              origen: 'Telegram',
              estatus: estatus,
              fecha_inicio: fecha.toISOString().split('T')[0],
              hora_inicio: hora,
              fecha_hora_inicio: new Date(fecha.toISOString().split('T')[0] + 'T' + (hora.includes(':') ? hora : '12:00:00')).toISOString(),
              departamento: depto,
              maquina_id: maquina_id,
              tipo_falla_id: tipo_falla_id,
              falla: falla,
              descripcion: descripcion || obs,
              observacion_inicial: obs,
              cve_solicitante: cve_empl,
              nombre_solicitante: nom_empl,
              turno_solicitante: turno,
              cve_atendio: cve_atendio,
              nombre_atendio: nom_atendio,
              turno_atendio: turno_atendio,
              fecha_fin: fecha_fin ? fecha_fin.toISOString().split('T')[0] : null,
              hora_fin: hora_fin,
              fecha_hora_fin: fecha_fin && hora_fin ? new Date(fecha_fin.toISOString().split('T')[0] + 'T' + (hora_fin.includes(':') ? hora_fin : '12:00:00')).toISOString() : null,
              tiempo_atencion_min: fecha_fin && fecha ? Math.round((fecha_fin - fecha) / (1000 * 60)) : null,
              observacion_cierre: obs_cierre,
              calidad: calidad,
              enviado: enviado === 'True' || enviado === true,
              prioridad: 'Media'
            });
            
            correctCount++;
          } catch (err) {
            console.error('Row error:', err);
            errorCount++;
          }
        });
        
        if (supabaseClient) {
          if (telegramStaging.length > 0) {
            const { error: stgErr } = await supabaseClient.from('stg_telegram_ordenes_telares').upsert(telegramStaging, { onConflict: 'id' });
            if (stgErr) throw stgErr;
          }
          if (productionOrders.length > 0) {
            const { error: prodErr } = await supabaseClient.from('ordenes_trabajo').upsert(productionOrders, { onConflict: 'folio' });
            if (prodErr) throw prodErr;
          }
        }
      } else if (hasKey(keys, 'art') || hasKey(keys, 'código') || hasKey(keys, 'codigo') || hasKey(keys, 'destino')) {
        detectedType = 'Refacciones por Máquina';
        const partsToInsert = [];
        const consumptionsToInsert = [];
        const pricesToInsert = [];
        
        for (const row of jsonData) {
          try {
            const fechaStr = row['Fecha'] || row['fecha'] || row['FECHA'];
            const fecha = parseExcelDate(fechaStr);
            const destino = row['Destino'] || row['destino'] || row['DESTINO'];
            const codArt = row['Código de Artículo'] || row['código de artículo'] || row['Codigo de Articulo'] || row['codigo'] || row['Código'];
            const nomArt = row['Nombre del Artículo'] || row['nombre del artículo'] || row['Nombre'] || row['nombre'];
            const cant = parseFloat(row['Cantidad'] || row['cantidad'] || row['CANTIDAD']) || 1.0;
            const precio = parseFloat(row['Precio de Costo'] || row['precio de costo'] || row['Precio'] || row['precio']) || 0.0;
            const importe = parseFloat(row['Importe de Costo'] || row['importe de costo'] || row['Importe'] || row['importe']) || 0.0;
            
            if (!codArt || !nomArt) throw new Error('Falta Código o Nombre de Artículo');
            
            const calcImporte = cant * precio;
            const dif = calcImporte - importe;
            
            partsToInsert.push({
              codigo_articulo: codArt,
              nombre_articulo: nomArt,
              unidad_medida: 'PZ',
              familia: 'General',
              activo: true
            });
            
            consumptionsToInsert.push({
              fecha: fecha.toISOString().split('T')[0],
              maquina_id: destino,
              destino: destino,
              codigo_articulo: codArt,
              nombre_articulo: nomArt,
              cantidad_estandar: cant,
              precio_costo_unitario: precio,
              importe_costo_calculado: calcImporte,
              importe_costo_origen: importe,
              diferencia_importe: dif,
              origen: 'Excel Import'
            });
            
            pricesToInsert.push({
              codigo_articulo: codArt,
              fecha: fecha.toISOString().split('T')[0],
              precio_costo_unitario: precio,
              moneda: 'MXN',
              origen: 'Excel Import'
            });
            
            correctCount++;
          } catch (err) {
            console.error('Fila con error:', err);
            errorCount++;
          }
        }
        
        if (supabaseClient) {
          const uniqueParts = Array.from(new Map(partsToInsert.map(p => [p.codigo_articulo, p])).values());
          await supabaseClient.from('cat_refacciones').upsert(uniqueParts, { onConflict: 'codigo_articulo' });
          await supabaseClient.from('refacciones_por_maquina').insert(consumptionsToInsert);
          await supabaseClient.from('historico_precios_refacciones').insert(pricesToInsert);
        }
        
      } else if (hasKey(keys, 'descrip') || hasKey(keys, 'creada') || hasKey(keys, 'fecha')) {
        detectedType = 'Historial de Fallas';
        const rawFaults = [];
        const cleanFaults = [];
        
        jsonData.forEach(row => {
          try {
            const desc = row['Descripción'] || row['descripción'] || row['descripcion'] || row['DESCRIPCION'];
            const creadaStr = row['Creada'] || row['creada'] || row['CREADA'];
            if (!desc) throw new Error('Falta Descripción');
            
            const creada = parseExcelDate(creadaStr);
            
            rawFaults.push({
              maquina_id: maquinaIdFromFilename,
              descripcion: desc,
              creada: creada.toISOString(),
              archivo_origen: filename
            });
            
            cleanFaults.push({
              maquina_id: maquinaIdFromFilename,
              descripcion_falla: desc,
              fecha_hora_creada: creada.toISOString(),
              fecha_creada: creada.toISOString().split('T')[0],
              hora_creada: creada.toTimeString().split(' ')[0],
              origen: 'Excel Import',
              archivo_origen: filename,
              categoria_falla: desc.toLowerCase().includes('eléc') || desc.toLowerCase().includes('sensor') ? 'Eléctrica' : 'Mecánica',
              es_recurrente: false
            });
            correctCount++;
          } catch (err) {
            console.error('Fila con error:', err);
            errorCount++;
          }
        });
        
        if (supabaseClient) {
          await supabaseClient.from('stg_fallas_por_maquina_excel').insert(rawFaults);
          await supabaseClient.from('fallas_por_maquina').insert(cleanFaults);
        }
        
      } else {
        showToast('No se pudo identificar el tipo de archivo. Revisa las columnas.');
        if (supabaseClient && dbCargaId) {
          await supabaseClient.from('control_cargas_archivos').update({
            estatus_carga: 'Error',
            observaciones: 'Formato de columnas no identificado.'
          }).eq('id_carga', dbCargaId);
        }
        return;
      }
      
      if (supabaseClient && dbCargaId) {
        await supabaseClient.from('control_cargas_archivos').update({
          registros_correctos: correctCount,
          registros_error: errorCount,
          estatus_carga: 'Completada',
          observaciones: `Carga exitosa de ${detectedType}.`
        }).eq('id_carga', dbCargaId);
      }
      
      const alertBox = document.getElementById('excel-success-alert');
      if (alertBox) {
        alertBox.querySelector('strong').innerText = `Archivo "${filename}" procesado como ${detectedType} exitosamente.`;
        alertBox.querySelector('div').innerText = `Se cargaron ${correctCount} registros (Errores: ${errorCount}) en Supabase.`;
        alertBox.style.display = 'flex';
      }
      
      showToast(`Carga de ${detectedType} completada con éxito.`);
      await syncDatabases();
      
      // Refrescar vistas en el panel de administrador
      renderAdminMachinesTable();
      renderAdminPartsTable();
      renderAdminLogsTable();
      
    } catch (err) {
      console.error('Excel processing error:', err);
      showToast(`Error al procesar archivo: ${err.message}`);
    }
  };
  reader.readAsArrayBuffer(file);
}

function parseExcelDate(value) {
  if (!value) return new Date();
  if (typeof value === 'number') {
    return new Date((value - 25569) * 86400 * 1000);
  }
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return parsed;
  if (typeof value === 'string') {
    const parts = value.split(/[-/]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return new Date();
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
async function setWorkStatus(newStatus) {
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

  // Actualizar en Supabase
  if (supabaseClient) {
    try {
      await supabaseClient
        .from('ordenes_trabajo')
        .update({ estatus: newStatus })
        .eq('folio', otId);
        
      if (newStatus === 'Ejecutada' || newStatus === 'Cerrada') {
        await supabaseClient
          .from('cat_maquinas')
          .update({ activo: true })
          .eq('equipo_towell', orders[orderIndex].machine);
      }
    } catch (err) {
      console.error('Error updating status in Supabase:', err);
    }
  }

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
async function saveTechnicalLog() {
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

  // Guardar localmente
  localStorage.setItem('TSMAI_orders', JSON.stringify(orders));
  localStorage.setItem('TSMAI_parts', JSON.stringify(parts));

  // Actualizar también costo acumulado en máquina (dinamismo total del MVP)
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
      machines[machIndex].failures += 1;
    }
    localStorage.setItem('TSMAI_machines', JSON.stringify(machines));
  }

  // Sincronizar reporte a Supabase
  if (supabaseClient) {
    try {
      const combinedObservation = `Diagnóstico: ${diagnosis} | Actividad: ${activity} | Observaciones: ${observations}`;
      
      const updateData = {
        estatus: orders[orderIndex].status,
        observacion_cierre: combinedObservation,
        fecha_fin: new Date().toISOString().split('T')[0],
        hora_fin: new Date().toTimeString().split(' ')[0],
        fecha_hora_fin: new Date().toISOString()
      };
      
      await supabaseClient
        .from('ordenes_trabajo')
        .update(updateData)
        .eq('folio', otId);
        
      if (tempSelectedParts.length > 0) {
        const consumptions = tempSelectedParts.map(selected => {
          const part = parts.find(p => p.id === selected.partId);
          const cost = part ? part.cost : 0;
          const totalCost = cost * selected.quantity;
          return {
            fecha: new Date().toISOString().split('T')[0],
            maquina_id: currentOrder.machine,
            destino: currentOrder.machine,
            codigo_articulo: selected.partId,
            nombre_articulo: selected.partName,
            cantidad_estandar: selected.quantity,
            precio_costo_unitario: cost,
            importe_costo_calculado: totalCost,
            importe_costo_origen: totalCost,
            diferencia_importe: 0,
            origen: 'App'
          };
        });
        
        await supabaseClient
          .from('refacciones_por_maquina')
          .insert(consumptions);
      }
      
      if (orders[orderIndex].status === 'Ejecutada' || orders[orderIndex].status === 'Cerrada') {
        await supabaseClient
          .from('cat_maquinas')
          .update({ activo: true })
          .eq('equipo_towell', currentOrder.machine);
      }
      
    } catch (err) {
      console.error('Error updating technical log in Supabase:', err);
    }
  }

  closeModal('modal-tech-ot-detail');
  showToast('Bitácora técnica guardada exitosamente.');
  await syncDatabases();
  
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
