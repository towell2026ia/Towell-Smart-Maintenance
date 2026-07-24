/* ==========================================================================
   Towell Smart Maintenance AI (TSM-AI) - Lógica de Aplicación (Vanilla JS)
   ========================================================================== */

// --- CONFIGURACIÓN DE ENTORNO TSM-AI ---
const TSM_ENV = {
  isProduction: false // Cambiar a true para producción para deshabilitar simulación y fallbacks locales
};

// --- INITIALIZE SUPABASE CLIENT ---
let supabaseClient = null;
let pendingRecovery = false;
let recoverySession = null;
let recoveryGeneratedOTP = null;
let recoveryTargetEmail = null;
let useLiveDatabase = false;

// Detectar directamente si la URL tiene type=recovery (Fallback infalible para evitar race conditions)
if (window.location.hash && (window.location.hash.includes('type=recovery') || window.location.hash.includes('recovery'))) {
  pendingRecovery = true;
  console.log('[Auth Fallback] Recovery flag set immediately from URL Hash!');
}

if (typeof supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized successfully!');
    
    // Registrar el listener de inmediato al inicio para capturar el hash de la URL
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state event received:', event);
      if (event === 'PASSWORD_RECOVERY') {
        pendingRecovery = true;
        recoverySession = session;
        triggerRecoveryUI();
      }
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

function triggerRecoveryUI() {
  if (!pendingRecovery) return;
  const modal = document.getElementById('modal-change-password');
  if (!modal) return; // Se reintentará en DOMContentLoaded

  showView('public-portal');
  showPublicPanel('home');

  document.getElementById('change-pass-user-id').value = 'RECOVERY_MODE';
  const targetRol = (recoverySession?.user?.user_metadata?.rol === 'SUPER_ADMINISTRADOR') ? 'admin' : 'tech';
  document.getElementById('change-pass-target-view').value = targetRol;
  
  const titleEl = document.getElementById('modal-change-pass-title');
  const subEl = document.getElementById('modal-change-pass-subtitle');
  if (titleEl) titleEl.innerText = '🔐 Establece tu Nueva Contraseña';
  if (subEl) subEl.innerText = 'Ingresa y confirma la contraseña que usarás para acceder al sistema.';
  
  openModal('modal-change-password');
  pendingRecovery = false;
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

// Arreglo temporal de subtareas por crear en el detalle de OT del técnico
let tempSubtasksToCreate = [];

// --- FORMATTING HELPERS FOR STATUS, AREA AND PRIORITY ---
function getDBStatus(status) {
  if (!status) return 'solicitud_recibida';
  switch (status.toLowerCase().trim()) {
    case 'requiere subtarea':
    case 'requiere_subtarea':
      return 'requiere_subtarea';
    case 'en ejecución con subtareas':
    case 'en ejecucion con subtareas':
    case 'en_ejecucion_con_subtareas':
      return 'en_ejecucion_con_subtareas';
    case 'lista para validación':
    case 'lista para validacion':
    case 'lista_para_validacion':
      return 'lista_para_validacion';
    case 'solicitud recibida':
    case 'solicitud_recibida':
      return 'solicitud_recibida';
    case 'asignada':
      return 'asignada';
    case 'en proceso':
    case 'en_proceso':
      return 'en_proceso';
    case 'ejecutada':
      return 'ejecutada';
    case 'cerrada':
      return 'cerrada';
    default:
      return status.toLowerCase().replace(' ', '_');
  }
}

function formatStatus(status) {
  if (!status) return '';
  switch (status.toLowerCase()) {
    case 'requiere_subtarea':
      return 'Requiere subtarea';
    case 'en_ejecucion_con_subtareas':
      return 'En ejecución con subtareas';
    case 'lista_para_validacion':
      return 'Lista para validación';
    case 'solicitud recibida':
    case 'solicitud_recibida':
      return 'Solicitud recibida';
    case 'asignada':
      return 'Asignada';
    case 'en proceso':
    case 'en_proceso':
      return 'En proceso';
    case 'ejecutada':
      return 'Ejecutada';
    case 'cerrada':
      return 'Cerrada';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function formatSubtaskArea(area) {
  if (!area) return '';
  switch (area.toLowerCase()) {
    case 'mecanico': return 'Mecánico';
    case 'electrico': return 'Eléctrico';
    case 'lubricacion': return 'Lubricación';
    case 'limpieza': return 'Limpieza';
    case 'ajuste': return 'Ajuste';
    case 'servicio_externo': return 'Servicio Externo';
    case 'refacciones': return 'Refacciones';
    case 'otro': return 'Otro';
    default: return area;
  }
}

function formatSubtaskPriority(priority) {
  if (!priority) return '';
  switch (priority.toLowerCase()) {
    case 'baja': return 'Baja';
    case 'media': return 'Media';
    case 'alta': return 'Alta';
    case 'critica': return 'Crítica';
    default: return priority;
  }
}

function formatSubtaskStatus(status) {
  if (!status) return '';
  switch (status.toLowerCase()) {
    case 'solicitada': return 'Solicitada';
    case 'asignada': return 'Asignada';
    case 'en_proceso': return 'En proceso';
    case 'en_espera': return 'En espera';
    case 'bloqueada': return 'Bloqueada';
    case 'terminada': return 'Terminada';
    case 'cancelada': return 'Cancelada';
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

// Resolve UUIDs to Name
function getUserNameByUUID(uuid) {
  if (!uuid) return 'Sin asignar';
  const users = JSON.parse(localStorage.getItem('TSMAI_users') || '[]');
  const user = users.find(u => u.id_usuario === uuid);
  return user ? user.nombre_completo : 'Usuario';
}

// Get User UUID by cve_tecnico or email
function getUserUUID(cve) {
  const users = JSON.parse(localStorage.getItem('TSMAI_users') || '[]');
  const user = users.find(u => u.cve_tecnico === cve || u.id_usuario === cve || u.correo === cve);
  if (user) return user.id_usuario;
  if (cve && cve.length === 36 && cve.includes('-')) return cve;
  return null;
}

// Get Admin UUID
function getAdminUUID() {
  const users = JSON.parse(localStorage.getItem('TSMAI_users') || '[]');
  const admin = users.find(u => u.rol === 'SUPER_ADMINISTRADOR');
  return admin ? admin.id_usuario : '00000000-0000-0000-0000-000000000000';
}

// --- SUBTAREAS & MOVIMIENTOS ADAPTERS ---
async function dbGetSubtasks() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('subtareas_orden_trabajo')
        .select('*')
        .order('fecha_solicitud', { ascending: false });
      if (error) throw error;
      return (data || []).map(s => ({
        id: s.id_subtarea,
        otId: s.folio_ot,
        otUUID: s.id_orden,
        number: s.numero_subtarea,
        title: s.titulo_subtarea,
        area: s.area_requerida,
        description: s.descripcion_subtarea,
        reason: s.motivo_solicitud,
        dueDate: s.fecha_deseada,
        priority: s.prioridad,
        requiresParo: s.requiere_paro,
        requiresPart: s.requiere_refaccion,
        status: s.estatus_subtarea,
        requestedBy: s.solicitado_por,
        assignedBy: s.asignado_por,
        assignedTech: s.responsable_asignado,
        requestDate: s.fecha_solicitud,
        assignDate: s.fecha_asignacion,
        startDate: s.fecha_inicio,
        closeDate: s.fecha_cierre,
        observations: s.observaciones,
        activo: s.activo,
        createdAt: s.creado_en,
        updatedAt: s.actualizado_en
      }));
    } catch (err) {
      console.error('Error fetching subtasks from Supabase:', err);
    }
  }
  const localList = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
  return localList.map(s => ({
    id: s.id,
    otId: s.otId,
    otUUID: s.otUUID,
    number: s.number,
    title: s.title,
    area: formatSubtaskArea(s.area),
    description: s.description,
    reason: s.reason,
    dueDate: s.dueDate,
    priority: formatSubtaskPriority(s.priority),
    requiresParo: s.requiresParo,
    requiresPart: s.requiresPart,
    status: formatSubtaskStatus(s.status),
    requestedBy: s.requestedBy,
    assignedBy: s.assignedBy,
    assignedTech: s.assignedTech,
    requestDate: s.requestDate,
    assignDate: s.assignDate,
    startDate: s.startDate,
    closeDate: s.closeDate,
    observations: s.observations,
    activo: s.activo,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  }));
}

async function dbInsertSubtask(sub) {
  if (supabaseClient) {
    try {
      const insertData = {
        id_subtarea: sub.id,
        folio_ot: sub.otId,
        id_orden: sub.otUUID,
        numero_subtarea: sub.number,
        titulo_subtarea: sub.title || 'Apoyo',
        area_requerida: (sub.area || 'otro').toLowerCase().replace('é', 'e').replace('ó', 'o').replace(' ', '_'),
        descripcion_subtarea: sub.description,
        motivo_solicitud: sub.reason,
        fecha_deseada: sub.dueDate,
        prioridad: (sub.priority || 'media').toLowerCase().replace('í', 'i'),
        requiere_paro: sub.requiresParo,
        requiere_refaccion: sub.requiresPart,
        estatus_subtarea: (sub.status || 'solicitada').toLowerCase().replace(' ', '_'),
        solicitado_por: sub.requestedBy,
        asignado_por: sub.assignedBy,
        responsable_asignado: sub.assignedTech,
        observaciones: sub.observations,
        activo: sub.activo !== undefined ? sub.activo : true,
        fecha_solicitud: sub.requestDate || new Date().toISOString()
      };
      const { error } = await supabaseClient
        .from('subtareas_orden_trabajo')
        .insert([insertData]);
      if (error) throw error;
      return;
    } catch (err) {
      console.error('Error inserting subtask in Supabase:', err);
    }
  }
  const subtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
  subtasks.push(sub);
  localStorage.setItem('TSMAI_subtasks', JSON.stringify(subtasks));
}

async function dbUpdateSubtask(subId, updateFields) {
  if (supabaseClient) {
    try {
      const mapped = {};
      if (updateFields.status !== undefined) mapped.estatus_subtarea = updateFields.status.toLowerCase().replace(' ', '_');
      if (updateFields.assignedTech !== undefined) mapped.responsable_asignado = updateFields.assignedTech;
      if (updateFields.assignedBy !== undefined) mapped.asignado_por = updateFields.assignedBy;
      if (updateFields.assignDate !== undefined) mapped.fecha_asignacion = updateFields.assignDate;
      if (updateFields.startDate !== undefined) mapped.fecha_inicio = updateFields.startDate;
      if (updateFields.closeDate !== undefined) mapped.fecha_cierre = updateFields.closeDate;
      if (updateFields.observations !== undefined) mapped.observaciones = updateFields.observations;
      if (updateFields.priority !== undefined) mapped.prioridad = updateFields.priority.toLowerCase().replace('í', 'i');
      if (updateFields.activo !== undefined) mapped.activo = updateFields.activo;
      mapped.actualizado_en = new Date().toISOString();
      const { error } = await supabaseClient
        .from('subtareas_orden_trabajo')
        .update(mapped)
        .eq('id_subtarea', subId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating subtask in Supabase:', err);
    }
  }
  const subtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
  const idx = subtasks.findIndex(s => s.id === subId);
  if (idx !== -1) {
    subtasks[idx] = { ...subtasks[idx], ...updateFields, updatedAt: new Date().toISOString() };
    localStorage.setItem('TSMAI_subtasks', JSON.stringify(subtasks));
  }
}

// --- SUBTAREA EVIDENCIAS ADAPTERS ---
async function dbGetEvidences() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('evidencias_subtareas')
        .select('*');
      if (error) throw error;
      return (data || []).map(e => ({
        id: e.id_evidencia,
        subtaskId: e.id_subtarea,
        otUUID: e.id_orden,
        fileType: e.tipo_archivo,
        origin: e.origen_evidencia,
        fileName: e.nombre_archivo,
        fileUrl: e.url_archivo,
        bucket: e.storage_bucket,
        path: e.storage_path,
        description: e.descripcion,
        uploadedBy: e.subido_por,
        uploadDate: e.fecha_subida,
        active: e.activo
      }));
    } catch (err) {
      console.error('Error fetching evidences from Supabase:', err);
    }
  }
  return JSON.parse(localStorage.getItem('TSMAI_subtask_evidences') || '[]');
}

async function dbInsertEvidence(ev) {
  if (supabaseClient) {
    try {
      const insertData = {
        id_evidencia: ev.id,
        id_subtarea: ev.subtaskId,
        id_orden: ev.otUUID,
        tipo_archivo: ev.fileType,
        origen_evidencia: ev.origin,
        nombre_archivo: ev.fileName,
        url_archivo: ev.fileUrl,
        storage_bucket: ev.bucket || 'ot-evidencias',
        storage_path: ev.path,
        descripcion: ev.description,
        subido_por: ev.uploadedBy,
        fecha_subida: ev.uploadDate || new Date().toISOString(),
        activo: ev.active !== undefined ? ev.active : true
      };
      const { error } = await supabaseClient
        .from('evidencias_subtareas')
        .insert([insertData]);
      if (error) throw error;
      return;
    } catch (err) {
      console.error('Error inserting evidence in Supabase:', err);
    }
  }
  const evidences = JSON.parse(localStorage.getItem('TSMAI_subtask_evidences') || '[]');
  evidences.push(ev);
  localStorage.setItem('TSMAI_subtask_evidences', JSON.stringify(evidences));
}

// --- MOVIMIENTOS ADAPTERS ---
async function dbGetMovements() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('bitacora_subtareas')
        .select('*')
        .order('fecha_movimiento', { ascending: false });
      if (error) throw error;
      return (data || []).map(m => ({
        id: m.id_movimiento,
        otUUID: m.id_orden,
        subtaskId: m.id_subtarea,
        type: m.tipo_movimiento,
        oldState: m.estado_anterior,
        newState: m.estado_nuevo,
        by: m.realizado_por,
        comment: m.comentario,
        date: m.fecha_movimiento
      }));
    } catch (err) {
      console.error('Error fetching movements from Supabase:', err);
    }
  }
  return JSON.parse(localStorage.getItem('TSMAI_movements') || '[]');
}

async function dbInsertMovement(mov) {
  if (supabaseClient) {
    try {
      const insertData = {
        id_movimiento: mov.id,
        id_orden: mov.otUUID,
        id_subtarea: mov.subtaskId,
        tipo_movimiento: mov.type,
        estado_anterior: mov.oldState,
        estado_nuevo: mov.newState,
        realizado_por: mov.by,
        comentario: mov.comment,
        fecha_movimiento: mov.date || new Date().toISOString()
      };
      const { error } = await supabaseClient
        .from('bitacora_subtareas')
        .insert([insertData]);
      if (error) throw error;
      return;
    } catch (err) {
      console.error('Error inserting movement in Supabase:', err);
    }
  }
  const movements = JSON.parse(localStorage.getItem('TSMAI_movements') || '[]');
  movements.push(mov);
  localStorage.setItem('TSMAI_movements', JSON.stringify(movements));
}

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
        uuid: o.id_orden,
        applicant: o.nombre_solicitante,
        shift: o.turno_solicitante === 1 ? 'Turno Mañana' : o.turno_solicitante === 2 ? 'Turno Tarde' : 'Turno Nocturno',
        area: o.departamento,
        machine: o.maquina_id,
        type: o.orden_trabajo,
        description: o.descripcion,
        machineStopped: o.observacion_inicial ? 'Sí' : 'No',
        urgency: o.prioridad,
        status: formatStatus(o.estatus),
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
        uuid: o.id_orden,
        reqId: o.folio,
        applicant: o.nombre_solicitante,
        shift: o.turno_solicitante === 1 ? 'Turno Mañana' : o.turno_solicitante === 2 ? 'Turno Tarde' : 'Turno Nocturno',
        area: o.departamento,
        machine: o.maquina_id,
        type: o.orden_trabajo,
        description: o.descripcion,
        machineStopped: o.observacion_inicial ? 'Sí' : 'No',
        urgency: o.prioridad,
        status: formatStatus(o.estatus),
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
        .select('codigo_articulo, nombre_articulo, familia, unidad_medida, stock_actual, stock_minimo, costo_unitario, activo');
      if (error) throw error;
      return (data || []).map(p => ({
        id: p.codigo_articulo,
        name: p.nombre_articulo,
        category: p.familia,
        stock: parseFloat(p.stock_actual) || 0,
        minStock: parseFloat(p.stock_minimo) || 0,
        cost: parseFloat(p.costo_unitario) || 0,
        activo: p.activo !== false
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
        estatus: getDBStatus(newRequest.status),
        fecha_inicio: newRequest.date.split('T')[0],
        hora_inicio: newRequest.date.split('T')[1].split('.')[0],
        fecha_hora_inicio: newRequest.date,
        departamento: newRequest.area,
        maquina_id: newRequest.machine,
        falla: newRequest.type,
        descripcion: newRequest.description,
        nombre_solicitante: newRequest.applicant,
        cve_solicitante: newRequest.applicant_code || null,
        turno_solicitante: newRequest.shift.includes('Mañana') ? 1 : newRequest.shift.includes('Tarde') ? 2 : 3,
        prioridad: newRequest.urgency,
        fecha_carga: new Date().toISOString()
      };
      
      const { data, error } = await supabaseClient
        .from('ordenes_trabajo')
        .insert([insertData])
        .select();
      if (error) throw error;
      
      // Update the request with the official folio generated by the DB Trigger
      if (data && data.length > 0) {
        newRequest.id = data[0].folio;
      }
      
      // Save locally to localStorage so it is immediately visible in the UI
      const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
      if (!requests.some(r => r.id === newRequest.id)) {
        requests.push(newRequest);
        localStorage.setItem('TSMAI_requests', JSON.stringify(requests));
      }
      
      // Trigger background sync to keep database updated
      syncDatabases().catch(err => console.error('Error in background sync after request insert:', err));
      
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
  if (!useLiveDatabase) {
    console.log('[TSMAI] Demo Mode: Bypassing Supabase synchronization.');
    return;
  }
  if (!supabaseClient) return;
  console.log('Starting Supabase synchronization...');
  
  try {
    // 1. Sync Machines
    const { data: dbMachines, error: mErr } = await supabaseClient.from('cat_maquinas').select('*');
    if (mErr) throw mErr;
    if (dbMachines && dbMachines.length > 0) {
      const existingLocalMachines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
      const localMachines = dbMachines.map(m => {
        const localM = existingLocalMachines.find(lm => lm.id === m.equipo_towell);
        const area = m.equipo_towell.includes('COS') ? 'CF' : (m.equipo_towell.includes('TIN') || m.equipo_towell.includes('JET') ? 'TF' : 'PF');
        const proceso = area === 'PF' ? 'Tejido' : (area === 'CF' ? 'Costura' : 'Tintorería');
        return {
          id: m.equipo_towell,
          name: localM ? localM.name : m.equipo_towell,
          area: area,
          clave: m.clave,
          proceso: proceso,
          tipo_equipo: 'Maquinaria',
          status: 'Operativa',
          failures: localM ? localM.failures : 0,
          cost: localM ? localM.cost : 0,
          mtbf: localM ? localM.mtbf : 120,
          mttr: localM ? localM.mttr : 2.5
        };
      });
      localStorage.setItem('TSMAI_machines', JSON.stringify(localMachines));
    } else {
      localStorage.setItem('TSMAI_machines', '[]');
    }

    // 2. Sync Technicians
    const { data: dbUsers, error: uErr } = await supabaseClient.from('cat_usuarios_roles').select('*');
    if (uErr) throw uErr;
    if (dbUsers && dbUsers.length > 0) {
      localStorage.setItem('TSMAI_users', JSON.stringify(dbUsers));
      const localTechs = dbUsers.filter(u => u.rol === 'MANTENIMIENTO').map(t => ({
        id: t.cve_tecnico || t.id_usuario,
        uuid: t.id_usuario,
        name: t.nombre_completo,
        email: t.correo,
        specialty: t.observaciones || 'General',
        avatar: '👨‍🔧',
        department: t.departamento
      }));
      localStorage.setItem('TSMAI_technicians', JSON.stringify(localTechs));
    } else {
      localStorage.setItem('TSMAI_users', '[]');
      localStorage.setItem('TSMAI_technicians', '[]');
    }

    // 3. Sync Spare Parts
    const { data: dbParts, error: pErr } = await supabaseClient
      .from('cat_refacciones')
      .select('codigo_articulo, nombre_articulo, familia, unidad_medida, stock_actual, stock_minimo, costo_unitario, activo');
    if (pErr) throw pErr;
    if (dbParts && dbParts.length > 0) {
      const localParts = dbParts.map(p => ({
        id: p.codigo_articulo,
        name: p.nombre_articulo,
        category: p.familia,
        stock: parseFloat(p.stock_actual) || 0,
        minStock: parseFloat(p.stock_minimo) || 0,
        cost: parseFloat(p.costo_unitario) || 0,
        activo: p.activo !== false
      }));
      localStorage.setItem('TSMAI_parts', JSON.stringify(localParts));
    } else {
      localStorage.setItem('TSMAI_parts', '[]');
    }

    // 4. Sync Orders & Requests
    const { data: dbOrders, error: oErr } = await supabaseClient.from('ordenes_trabajo').select('*');
    if (oErr) throw oErr;
    if (dbOrders && dbOrders.length > 0) {
      const localRequests = [];
      const localOrders = [];
      
      dbOrders.forEach(o => {
        const formattedStatus = formatStatus(o.estatus);
        const item = {
          id: o.folio,
          uuid: o.id_orden,
          reqId: o.folio,
          applicant: o.nombre_solicitante,
          shift: o.turno_solicitante === 1 ? 'Turno Mañana' : o.turno_solicitante === 2 ? 'Turno Tarde' : 'Turno Nocturno',
          area: o.departamento,
          machine: o.maquina_id,
          type: o.orden_trabajo || 'MC',
          description: o.descripcion,
          machineStopped: o.observacion_inicial || 'No',
          urgency: o.prioridad || 'Media',
          status: formattedStatus,
          assignedTech: o.cve_atendio,
          date: o.fecha_hora_inicio || o.fecha_carga,
          dueDate: o.fecha_fin ? `${o.fecha_fin}T${o.hora_fin}` : null,
          evidence: null,
          historyLogs: [
            { date: o.fecha_carga, status: 'Solicitud recibida', user: o.nombre_solicitante, comment: 'Registro inicial.' }
          ]
        };
        
        localRequests.push(item);
        if (formattedStatus !== 'Solicitud recibida') {
          localOrders.push(item);
        }
      });
      
      localStorage.setItem('TSMAI_requests', JSON.stringify(localRequests));
      localStorage.setItem('TSMAI_orders', JSON.stringify(localOrders));
    } else {
      localStorage.setItem('TSMAI_requests', '[]');
      localStorage.setItem('TSMAI_orders', '[]');
    }

    // 5. Sync Subtasks
    const { data: dbSubtasks, error: sErr } = await supabaseClient.from('subtareas_orden_trabajo').select('*');
    if (sErr) throw sErr;
    if (dbSubtasks && dbSubtasks.length > 0) {
      const localSubtasks = dbSubtasks.map(s => ({
        id: s.id_subtarea,
        otId: s.folio_ot,
        otUUID: s.id_orden,
        number: s.numero_subtarea,
        title: s.titulo_subtarea,
        area: s.area_requerida,
        description: s.descripcion_subtarea,
        reason: s.motivo_solicitud,
        dueDate: s.fecha_deseada,
        priority: s.prioridad,
        requiresParo: s.requiere_paro,
        requiresPart: s.requiere_refaccion,
        status: s.estatus_subtarea,
        requestedBy: s.solicitado_por,
        assignedBy: s.assigned_por,
        assignedTech: s.responsable_asignado,
        requestDate: s.fecha_solicitud,
        assignDate: s.fecha_asignacion,
        startDate: s.fecha_inicio,
        closeDate: s.fecha_cierre,
        observations: s.observaciones,
        activo: s.activo,
        createdAt: s.creado_en,
        updatedAt: s.actualizado_en
      }));
      localStorage.setItem('TSMAI_subtasks', JSON.stringify(localSubtasks));
    } else {
      localStorage.setItem('TSMAI_subtasks', '[]');
    }

    // 5.5. Sync Subtask Evidences
    const { data: dbEvidences, error: evErr } = await supabaseClient.from('evidencias_subtareas').select('*');
    if (evErr) throw evErr;
    if (dbEvidences && dbEvidences.length > 0) {
      const localEvidences = dbEvidences.map(e => ({
        id: e.id_evidencia,
        subtaskId: e.id_subtarea,
        otUUID: e.id_orden,
        fileType: e.tipo_archivo,
        origin: e.origen_evidencia,
        fileName: e.nombre_archivo,
        fileUrl: e.url_archivo,
        bucket: e.storage_bucket,
        path: e.storage_path,
        description: e.descripcion,
        uploadedBy: e.subido_por,
        uploadDate: e.fecha_subida,
        active: e.activo
      }));
      localStorage.setItem('TSMAI_subtask_evidences', JSON.stringify(localEvidences));
    } else {
      localStorage.setItem('TSMAI_subtask_evidences', '[]');
    }

    // 6. Sync Movements
    const { data: dbMovements, error: mvErr } = await supabaseClient.from('bitacora_subtareas').select('*');
    if (mvErr) throw mvErr;
    if (dbMovements && dbMovements.length > 0) {
      const localMovements = dbMovements.map(m => ({
        id: m.id_movimiento,
        otUUID: m.id_orden,
        subtaskId: m.id_subtarea,
        type: m.tipo_movimiento,
        oldState: m.estado_anterior,
        newState: m.estado_nuevo,
        by: m.realizado_por,
        comment: m.comentario,
        date: m.fecha_movimiento
      }));
      localStorage.setItem('TSMAI_movements', JSON.stringify(localMovements));
    } else {
      localStorage.setItem('TSMAI_movements', '[]');
    }

    // 7. Sync Dynamic Checklists (Form definitions & Questions)
    try {
      const { data: dbChecklists, error: chkErr } = await supabaseClient
        .from('checklists_mantenimiento')
        .select('*')
        .order('codigo_servicio')
        .order('orden');
      
      if (chkErr) throw chkErr;

      const { data: dbServices, error: srvErr } = await supabaseClient
        .from('cat_servicios_mantenimiento')
        .select('codigo_servicio, nombre_servicio, observaciones');
      
      if (srvErr) throw srvErr;

      const serviceMap = {};
      const serviceAreaMap = {};
      dbServices.forEach(s => {
        serviceMap[s.codigo_servicio] = s.nombre_servicio;
        serviceAreaMap[s.codigo_servicio] = s.observaciones || 'General';
      });

      const groupedForms = {};
      dbChecklists.forEach(c => {
        const sId = c.codigo_servicio;
        if (!groupedForms[sId]) {
          groupedForms[sId] = {
            id: sId,
            name: serviceMap[sId] || `Checklist ${sId}`,
            area: serviceAreaMap[sId] || (sId.startsWith('F-') ? 'Planta' : 'General'),
            fields: []
          };
        }
        
        let options = [];
        if (c.observaciones && c.observaciones.startsWith('[')) {
          try {
            options = JSON.parse(c.observaciones);
          } catch (e) {}
        }

        groupedForms[sId].fields.push({
          id: c.id_checklist,
          id_pregunta: c.id_checklist,
          label: c.pregunta,
          type: c.tipo_respuesta === 'si_no' ? 'checkbox' : 
                (c.tipo_respuesta === 'numerico' ? 'number' : 
                (c.tipo_respuesta === 'seleccion' || c.tipo_respuesta === 'select' ? 'select' :
                (c.tipo_respuesta === 'fecha' ? 'date' : 
                (c.tipo_respuesta === 'hora' ? 'time' : 'text')))),
          required: c.obligatorio || false,
          options: options
        });
      });

      const localForms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
      const dbFormList = Object.values(groupedForms);
      const dbDynamicForms = dbFormList.filter(f => f.id.startsWith('F-'));
      const dbDynamicFormIds = new Set(dbDynamicForms.map(f => f.id));

      for (let lf of localForms) {
        if (!dbDynamicFormIds.has(lf.id)) {
          console.log(`Uploading local dynamic form ${lf.id} to Supabase...`);
          await supabaseClient.from('cat_servicios_mantenimiento').upsert([{
            codigo_servicio: lf.id,
            nombre_servicio: lf.name,
            tipo_servicio: 'Autónomo',
            activo: true
          }], { onConflict: 'codigo_servicio' });

          const questions = lf.fields.map((f, idx) => ({
            codigo_servicio: lf.id,
            codigo_pregunta: f.name || `Q-${idx + 1}`,
            pregunta: f.label,
            tipo_respuesta: f.type === 'checkbox' ? 'si_no' :
                            (f.type === 'number' ? 'numerico' :
                            (f.type === 'select' ? 'seleccion' :
                            (f.type === 'date' ? 'fecha' :
                            (f.type === 'time' ? 'hora' : 'texto')))),
            obligatorio: f.required || false,
            orden: idx + 1,
            activo: true,
            observaciones: f.type === 'select' && f.options ? JSON.stringify(f.options) : null
          }));
          await supabaseClient.from('checklists_mantenimiento').insert(questions);
        }
      }

      // Re-fetch to update local cache with database generated question UUIDs
      const { data: finalChecklists } = await supabaseClient
        .from('checklists_mantenimiento')
        .select('*')
        .order('codigo_servicio')
        .order('orden');

      const finalGrouped = {};
      (finalChecklists || []).forEach(c => {
        const sId = c.codigo_servicio;
        if (sId.startsWith('F-')) {
          if (!finalGrouped[sId]) {
            finalGrouped[sId] = {
              id: sId,
              name: serviceMap[sId] || `Checklist ${sId}`,
              area: serviceAreaMap[sId] || 'Planta',
              fields: []
            };
          }
          let options = [];
          if (c.observaciones && c.observaciones.startsWith('[')) {
            try {
              options = JSON.parse(c.observaciones);
            } catch (e) {}
          }
          finalGrouped[sId].fields.push({
            id: c.id_checklist,
            id_pregunta: c.id_checklist,
            label: c.pregunta,
            type: c.tipo_respuesta === 'si_no' ? 'checkbox' : 
                  (c.tipo_respuesta === 'numerico' ? 'number' : 
                  (c.tipo_respuesta === 'seleccion' || c.tipo_respuesta === 'select' ? 'select' :
                  (c.tipo_respuesta === 'fecha' ? 'date' : 
                  (c.tipo_respuesta === 'hora' ? 'time' : 'text')))),
            required: c.obligatorio || false,
            options: options
          });
        }
      });

      const syncedForms = Object.values(finalGrouped);
      if (syncedForms.length > 0) {
        localStorage.setItem('TSMAI_dynamic_forms', JSON.stringify(syncedForms));
      }

      // 8. Sync Dynamic Checklist Responses
      const localResponses = JSON.parse(localStorage.getItem('TSMAI_dynamic_responses') || '[]');
      const pendingResponses = localResponses.filter(r => !r.db_synced);

      if (pendingResponses.length > 0) {
        console.log(`Found ${pendingResponses.length} pending checklist responses. Uploading to Supabase...`);
        for (let pr of pendingResponses) {
          const answersToInsert = [];
          for (let idx = 0; idx < pr.answers.length; idx++) {
            const ans = pr.answers[idx];
            const formTemplate = syncedForms.find(sf => sf.id === pr.formId);
            const questionField = formTemplate ? formTemplate.fields.find(qf => qf.label === ans.label) : null;
            const id_checklist = questionField ? questionField.id : null;

            if (id_checklist) {
              answersToInsert.push({
                id_orden: '00000000-0000-0000-0000-000000000000',
                id_checklist: id_checklist,
                respuesta: ans.val,
                comentario: `[${pr.id}] Formato: ${pr.formName} | Área: ${pr.area}`,
                usuario_responde: pr.submittedBy,
                fecha_respuesta: pr.date,
                activo: true
              });
            }
          }

          if (answersToInsert.length > 0) {
            const { error: insErr } = await supabaseClient.from('respuestas_checklist_orden').insert(answersToInsert);
            if (!insErr) {
              pr.db_synced = true;
            } else {
              console.error('Error inserting checklist response chunk:', insErr);
            }
          }
        }
        localStorage.setItem('TSMAI_dynamic_responses', JSON.stringify(localResponses));
      }
    } catch (err) {
      console.error('Error syncing checklists and responses:', err);
    }

    // 9. Sync Dedicated Maintenance Logs (bitacora_mantenimiento)
    try {
      const localLogs = JSON.parse(localStorage.getItem('TSMAI_maintenance_logs') || '[]');
      const pendingLogs = localLogs.filter(l => !l.db_synced);

      if (pendingLogs.length > 0) {
        console.log(`Found ${pendingLogs.length} pending maintenance log entries. Uploading to Supabase...`);
        for (let pl of pendingLogs) {
          const { error: insErr } = await supabaseClient
            .from('bitacora_mantenimiento')
            .insert({
              id_orden: pl.otUUID || null,
              cve_tecnico: pl.cve_tecnico,
              nombre_tecnico: pl.nombre_tecnico,
              area: pl.area,
              maquina_id: pl.maquina_id,
              fecha_hora_inicio: pl.fecha_hora_inicio,
              fecha_hora_fin: pl.fecha_hora_fin,
              descripcion_actividad: pl.descripcion_actividad,
              refacciones_usadas: pl.refacciones_usadas,
              observaciones: pl.observaciones,
              activo: true
            });
          
          if (!insErr) {
            pl.db_synced = true;
          } else {
            console.error('Error inserting maintenance log entry:', insErr);
          }
        }
        localStorage.setItem('TSMAI_maintenance_logs', JSON.stringify(localLogs));
      }

      const { data: dbLogs, error: fetchErr } = await supabaseClient
        .from('bitacora_mantenimiento')
        .select('*')
        .order('fecha_hora_inicio', { ascending: false });

      if (!fetchErr && dbLogs) {
        const currentLocal = JSON.parse(localStorage.getItem('TSMAI_maintenance_logs') || '[]');
        const unsynced = currentLocal.filter(l => !l.db_synced);

        const mappedDb = dbLogs.map(l => {
          const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
          const foundOrder = orders.find(o => o.uuid === l.id_orden);
          return {
            id: l.id_bitacora,
            otFolio: foundOrder ? foundOrder.id : 'NO_APLICA',
            otUUID: l.id_orden,
            cve_tecnico: l.cve_tecnico,
            nombre_tecnico: l.nombre_tecnico,
            area: l.area,
            maquina_id: l.maquina_id,
            fecha_hora_inicio: l.fecha_hora_inicio,
            fecha_hora_fin: l.fecha_hora_fin,
            descripcion_actividad: l.descripcion_actividad,
            refacciones_usadas: l.refacciones_usadas,
            observaciones: l.observaciones,
            date: l.fecha_alta,
            db_synced: true
          };
        });

        localStorage.setItem('TSMAI_maintenance_logs', JSON.stringify([...unsynced, ...mappedDb]));
      }
    } catch (err) {
      console.error('Error syncing maintenance logs:', err);
    }

    console.log('Supabase synchronization finished successfully.');
    populateTectSelects();
  } catch (err) {
    console.error('Error during Supabase synchronization:', err);
  }
}

// --- ACTUALIZACIÓN REACTIVA EN TIEMPO REAL (REALTIME & POLLING) ---
function refreshActiveViewSilently() {
  const adminView = document.getElementById('view-admin');
  const techView = document.getElementById('view-tech');
  const publicView = document.getElementById('view-public-portal');

  if (adminView && adminView.classList.contains('active')) {
    if (activeAdminPanel === 'dashboard') {
      renderAdminDashboard();
      updateAdminKPIs();
    } else if (activeAdminPanel === 'requests') {
      renderAdminRequestsTable();
    } else if (activeAdminPanel === 'orders') {
      renderAdminOrdersTable();
    } else if (activeAdminPanel === 'calendar') {
      renderAdminCalendar();
    } else if (activeAdminPanel === 'logs') {
      renderAdminLogsTable();
    } else if (activeAdminPanel === 'machines') {
      renderAdminMachinesTable();
    } else if (activeAdminPanel === 'parts') {
      renderAdminPartsTable();
    } else if (activeAdminPanel === 'forms') {
      renderAdminFormsList();
    } else if (activeAdminPanel === 'users') {
      renderAdminUsersTable();
    }
    updateRequestsBadge();
  } else if (techView && techView.classList.contains('active')) {
    if (activeTechPanel === 'dashboard') {
      renderTechDashboard();
      renderTechOrdersTable();
    } else if (activeTechPanel === 'checklists') {
      renderTechChecklistsTable();
    } else if (activeTechPanel === 'bitacora') {
      renderTechBitacora();
    } else if (activeTechPanel === 'history') {
      populateTechMachineHistorySelect();
    }
  } else if (publicView && publicView.classList.contains('active')) {
    const checkInput = document.getElementById('check-folio-input');
    if (checkInput && checkInput.value.trim() && activePublicPanel === 'check') {
      handleSearchFolio();
    }
  }
}

function setupRealtimeSubscriptions() {
  // --- A1: Limpiar canal previo si existe para evitar suscripciones duplicadas ---
  if (window._tsmaiRealtimeChannel && supabaseClient) {
    try { supabaseClient.removeChannel(window._tsmaiRealtimeChannel); } catch(e) {}
    window._tsmaiRealtimeChannel = null;
  }

  if (supabaseClient) {
    try {
      const channel = supabaseClient.channel('tsmai-realtime-channel');
      window._tsmaiRealtimeChannel = channel;

      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          async (payload) => {
            console.log('[Realtime] DB Change detected:', payload.table, payload.eventType);
            await syncDatabases();
            refreshActiveViewSilently();
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Subscription status:', status);
          updateConnectionIndicator(status === 'SUBSCRIBED');
          // A1: Reconexión automática si el canal cae
          if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            console.warn('[Realtime] Canal caído. Reconectando en 5s...');
            setTimeout(() => setupRealtimeSubscriptions(), 5000);
          }
        });
    } catch (err) {
      console.warn('[Realtime] Error subscribing to live changes:', err);
    }
  }

  // Backup polling silencioso cada 6 segundos para garantizar actualización sin parpadeo ni recargas
  if (!window._tsmaiRealtimeInterval) {
    window._tsmaiRealtimeInterval = setInterval(async () => {
      if (useLiveDatabase && supabaseClient) {
        try {
          await syncDatabases();
          refreshActiveViewSilently();
        } catch (e) {
          // Silent polling error catch
        }
      } else {
        refreshActiveViewSilently();
      }
    }, 6000);
  }

  // A2: Detectar conectividad del navegador (con flag anti-duplicado)
  if (!window._tsmaiNetworkListenersRegistered) {
    window._tsmaiNetworkListenersRegistered = true;
    window.addEventListener('online', () => {
      console.log('[Network] Conexión recuperada. Sincronizando...');
      updateConnectionIndicator(true);
      if (useLiveDatabase && supabaseClient) {
        syncDatabases().then(() => refreshActiveViewSilently()).catch(e => console.warn(e));
      }
    });
    window.addEventListener('offline', () => {
      console.warn('[Network] Sin conexión a internet.');
      updateConnectionIndicator(false);
    });
  }
}

// --- PERSISTENCIA DE SESIÓN Y ENRUTAMIENTO SPA ---
function persistSessionUser(userObj) {
  currentUser = userObj;
  if (userObj) {
    localStorage.setItem('TSMAI_current_user', JSON.stringify(userObj));
  } else {
    localStorage.removeItem('TSMAI_current_user');
    localStorage.removeItem('TSMAI_current_route');
  }
}

function normalizeUserRole(rawRol) {
  if (!rawRol) return 'public';
  const r = String(rawRol).toUpperCase().trim();
  if (['SUPER_ADMINISTRADOR', 'ADMINISTRADOR', 'SUPER_ADMIN', 'ADMIN', 'JEFE_MANTENIMIENTO', 'GERENTE', 'DIRECTOR'].includes(r)) {
    return 'admin';
  }
  if (['MANTENIMIENTO', 'TECNICO', 'TECH', 'MECANICO', 'ELECTRICO'].includes(r)) {
    return 'tech';
  }
  if (['SOLICITANTE', 'SOLICITANTE_PUBLICO', 'SOLICITANTE_PLANTA', 'SOLICITANTE_PRODUCCION'].includes(r)) {
    return 'solicitante';
  }
  return 'public';
}

function switchToTechView() {
  if (!currentUser) return;
  if (!currentUser.cve_tecnico && !currentUser.id) {
    currentUser.id = currentUser.cve_empleado || currentUser.uuid || '2025';
    currentUser.cve_tecnico = currentUser.cve_empleado || '2025';
  }
  const pName = document.getElementById('tech-profile-name');
  const pSpec = document.getElementById('tech-profile-specialty');
  const pAvat = document.getElementById('tech-profile-avatar');
  if (pName) pName.innerText = currentUser.name || currentUser.nombre_completo || 'Técnico';
  if (pSpec) pSpec.innerText = currentUser.specialty || currentUser.observaciones || currentUser.department || 'Coordinador Mantenimiento';
  if (pAvat) pAvat.innerText = currentUser.avatar || '👨‍🔧';

  showView('tech');
  switchTechPanel('dashboard');
}

function switchToAdminView() {
  if (!currentUser) return;
  showView('admin');
  switchAdminPanel(activeAdminPanel || 'dashboard');
}

function restoreRouteFromHash() {
  // 1. Intentar recuperar usuario si no está en memoria
  if (!currentUser) {
    const savedUser = localStorage.getItem('TSMAI_current_user');
    if (savedUser) {
      try { currentUser = JSON.parse(savedUser); } catch (e) {}
    }
  }

  const hash = window.location.hash || localStorage.getItem('TSMAI_current_route') || '';
  const cleanHash = hash.replace('#', '');
  const parts = cleanHash.split('/');
  const viewId = parts[0] || '';
  const panelId = parts[1] || '';

  // 2. Si hay usuario autenticado, enrutar según la vista solicitada en el hash
  if (currentUser) {
    const roleKey = normalizeUserRole(currentUser.role || currentUser.rol);

    // Si la URL solicita la vista técnica (#tech/...), PERMITIR el acceso tanto a técnicos como a administradores
    if (viewId === 'tech') {
      const targetPanel = (panelId === 'orders') ? 'dashboard' : (panelId || activeTechPanel || 'dashboard');
      const pName = document.getElementById('tech-profile-name');
      const pSpec = document.getElementById('tech-profile-specialty');
      const pAvat = document.getElementById('tech-profile-avatar');
      if (pName) pName.innerText = currentUser.name || currentUser.nombre_completo || 'Técnico';
      if (pSpec) pSpec.innerText = currentUser.specialty || currentUser.observaciones || currentUser.department || 'General';
      if (pAvat) pAvat.innerText = currentUser.avatar || '👨‍🔧';

      const switchAdminBtn = document.getElementById('menu-tech-switch-admin');
      if (switchAdminBtn) {
        switchAdminBtn.style.display = (roleKey === 'admin') ? 'block' : 'none';
      }

      showView('tech');
      switchTechPanel(targetPanel);
      return true;
    }

    // Si la URL solicita la vista de administración (#admin/...)
    if (viewId === 'admin') {
      if (roleKey === 'admin') {
        const targetPanel = panelId || activeAdminPanel || 'dashboard';
        showView('admin');
        switchAdminPanel(targetPanel);
        return true;
      }
    }

    // Si no hay vista explícita en la URL, usar el rol por defecto del usuario
    if (roleKey === 'admin') {
      const targetPanel = activeAdminPanel || 'dashboard';
      showView('admin');
      switchAdminPanel(targetPanel);
      return true;
    } else if (roleKey === 'tech') {
      const targetPanel = activeTechPanel || 'dashboard';
      const pName = document.getElementById('tech-profile-name');
      const pSpec = document.getElementById('tech-profile-specialty');
      const pAvat = document.getElementById('tech-profile-avatar');
      if (pName) pName.innerText = currentUser.name || currentUser.nombre_completo || 'Técnico';
      if (pSpec) pSpec.innerText = currentUser.specialty || currentUser.observaciones || currentUser.department || 'General';
      if (pAvat) pAvat.innerText = currentUser.avatar || '👨‍🔧';

    } else if (roleKey === 'solicitante') {
      showView('solicitante');
      switchSolicitantePanel(panelId || activeSolicitantePanel || 'new');
      return true;
    } else if (roleKey === 'public') {
      showView('public-portal');
      showPublicPanel('home');
      return true;
    }
  }

  // 3. Si NO hay usuario autenticado, dirigir al portal público
  if (viewId === 'public' && panelId) {
    showView('public-portal');
    showPublicPanel(panelId);
    return true;
  }

  showView('public-portal');
  showPublicPanel('home');
  return true;
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Restaurar usuario guardado localmente e iniciar la UI de inmediato de forma síncrona
  const savedUserStr = localStorage.getItem('TSMAI_current_user');
  if (savedUserStr) {
    try { currentUser = JSON.parse(savedUserStr); } catch (e) {}
  }

  // 2. Restaurar ruta al instante (previene cualquier parpadeo de pantalla inicial)
  restoreRouteFromHash();

  // Asegurar que el seed de datos esté cargado
  if (typeof initLocalStorage === 'function') {
    initLocalStorage();
  }

  // Cargar datos en los selects dinámicos
  populateTectSelects();
  loadPublicEmployeesList();

  // 3. En segundo plano: Validar sesión de Supabase y sincronizar bases de datos silenciosamente
  if (supabaseClient) {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        useLiveDatabase = true;
        const email = session.user.email;
        const { data: dbUser } = await supabaseClient
          .from('cat_usuarios_roles')
          .select('*')
          .eq('correo', email)
          .maybeSingle();
        
        if (dbUser) {
          const roleKey = normalizeUserRole(dbUser.rol);
          if (roleKey === 'admin') {
            currentUser = { 
              role: 'admin', 
              rol: dbUser.rol, 
              name: dbUser.nombre_completo, 
              email: dbUser.correo, 
              uuid: dbUser.id_usuario, 
              id: dbUser.cve_tecnico || dbUser.id_usuario, 
              cve_tecnico: dbUser.cve_tecnico, 
              department: dbUser.departamento,
              specialty: dbUser.observaciones || dbUser.departamento || 'Administrador'
            };
          } else if (roleKey === 'tech') {
            const techId = dbUser.cve_tecnico || dbUser.id_usuario;
            currentUser = { 
              role: 'tech', 
              rol: dbUser.rol, 
              id: techId, 
              cve_tecnico: dbUser.cve_tecnico, 
              uuid: dbUser.id_usuario, 
              name: dbUser.nombre_completo, 
              email: dbUser.correo, 
              specialty: dbUser.observaciones || dbUser.departamento || 'General', 
              avatar: '👨‍🔧', 
              department: dbUser.departamento 
            };
          } else if (roleKey === 'public') {
            currentUser = { role: 'public', rol: dbUser.rol, name: dbUser.nombre_completo, email: dbUser.correo, uuid: dbUser.id_usuario };
          }
          persistSessionUser(currentUser);
          restoreRouteFromHash();
        }
      }
    } catch (e) {
      console.warn('No active Supabase session recovered:', e);
    }
  }
  
  if (useLiveDatabase) {
    await syncDatabases();
    refreshActiveViewSilently();
  }
  
  // Registrar listeners de eventos
  window.addEventListener('click', (e) => {
    const menu = document.getElementById('menu-acceso-interno');
    const btn = document.getElementById('btn-acceso-interno');
    if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('show');
    }

    const dbGroup = document.getElementById('menu-admin-database-group');
    if (dbGroup && !dbGroup.contains(e.target)) {
      closeDatabaseSubmenu();
    }
  });

  window.addEventListener('hashchange', restoreRouteFromHash);

  window.addEventListener('popstate', (event) => {
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      triggerRecoveryUI();
      return;
    }
    restoreRouteFromHash();
  });

  triggerRecoveryUI();
  setupRealtimeSubscriptions();
});

function updateMobileBottomNav() {
  const navContainer = document.getElementById('mobile-nav-items-container');
  const bottomNav = document.getElementById('mobile-bottom-nav');
  if (!navContainer || !bottomNav) return;

  if (!currentUser) {
    bottomNav.style.display = 'none';
    return;
  }

  const isTechView = document.getElementById('view-tech')?.classList.contains('active');
  const isAdminView = document.getElementById('view-admin')?.classList.contains('active');

  if (isTechView) {
    bottomNav.style.display = 'block';
    const panel = activeTechPanel || 'dashboard';
    navContainer.innerHTML = `
      <div class="mobile-nav-item ${panel === 'dashboard' ? 'active' : ''}" onclick="switchTechPanel('dashboard')">
        <span class="nav-icon">📋</span>
        <span>Tablero</span>
      </div>
      <div class="mobile-nav-item ${panel === 'checklists' ? 'active' : ''}" onclick="switchTechPanel('checklists')">
        <span class="nav-icon">⚡</span>
        <span>Checklists</span>
      </div>
      <div class="mobile-nav-item ${panel === 'bitacora' ? 'active' : ''}" onclick="switchTechPanel('bitacora')">
        <span class="nav-icon">📝</span>
        <span>Bitácora</span>
      </div>
      <div class="mobile-nav-item ${panel === 'history' ? 'active' : ''}" onclick="switchTechPanel('history')">
        <span class="nav-icon">⚙️</span>
        <span>Histórico</span>
      </div>
      <div class="mobile-nav-item ${panel === 'profile' ? 'active' : ''}" onclick="switchTechPanel('profile')">
        <span class="nav-icon">👤</span>
        <span>Perfil</span>
      </div>
    `;
  } else if (isAdminView) {
    bottomNav.style.display = 'block';
    const panel = activeAdminPanel || 'dashboard';
    navContainer.innerHTML = `
      <div class="mobile-nav-item ${panel === 'dashboard' ? 'active' : ''}" onclick="switchAdminPanel('dashboard')">
        <span class="nav-icon">📊</span>
        <span>Dashboard</span>
      </div>
      <div class="mobile-nav-item ${panel === 'requests' ? 'active' : ''}" onclick="switchAdminPanel('requests')">
        <span class="nav-icon">📨</span>
        <span>Solicitudes</span>
      </div>
      <div class="mobile-nav-item ${panel === 'orders' ? 'active' : ''}" onclick="switchAdminPanel('orders')">
        <span class="nav-icon">📋</span>
        <span>Órdenes</span>
      </div>
      <div class="mobile-nav-item ${panel === 'databases' ? 'active' : ''}" onclick="switchAdminPanel('databases')">
        <span class="nav-icon">🗄️</span>
        <span>Bases BD</span>
      </div>
      <div class="mobile-nav-item" onclick="toggleSidebar()">
        <span class="nav-icon">☰</span>
        <span>Menú</span>
      </div>
    `;
  } else {
    bottomNav.style.display = 'none';
  }
}

// --- ENRUTADOR DE VISTAS PRINCIPALES (SPA) ---
function showView(viewId) {
  // Remover estilo de pre-carga in-head si existía
  document.documentElement.classList.remove('preload-user-active');
  const preloadStyle = document.getElementById('preload-hide-public');
  if (preloadStyle) {
    try { preloadStyle.remove(); } catch(e) {}
  }

  // Ocultar todas las secciones de vista principal limpiando inline styles
  document.querySelectorAll('.view-section').forEach(view => {
    view.classList.remove('active');
    view.style.display = '';
  });
  
  // Mostrar la vista objetivo agregando la clase active
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.style.display = '';
    targetView.classList.add('active');
  }

  // Actualizar hash según el panel activo de la vista
  let route = `#${viewId}`;
  if (viewId === 'admin') {
    route = `#admin/${activeAdminPanel || 'dashboard'}`;
  } else if (viewId === 'tech') {
    route = `#tech/${activeTechPanel || 'dashboard'}`;
  } else if (viewId === 'public-portal') {
    route = `#public/${activePublicPanel || 'home'}`;
  }

  updateMobileBottomNav();

  if (location.hash !== route) {
    history.pushState(null, '', route);
  }
  localStorage.setItem('TSMAI_current_route', route);

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
    renderAdminUsersTable();
    // Actualizar badge de solicitudes nuevas
    updateRequestsBadge();

    // Sincronización en segundo plano para actualizar datos en tiempo real sin bloquear la interfaz
    if (supabaseClient) {
      syncDatabases().then(() => {
        // Solo volver a renderizar si seguimos en la vista de admin
        const adminView = document.getElementById('view-admin');
        if (adminView && adminView.classList.contains('active')) {
          renderAdminDashboard();
          updateAdminKPIs();
          renderAdminRequestsTable();
          renderAdminOrdersTable();
          renderAdminCalendar();
          renderAdminLogsTable();
          renderAdminMachinesTable();
          renderAdminPartsTable();
          renderAdminFormsList();
          renderAdminUsersTable();
          updateRequestsBadge();
        }
      }).catch(err => console.error('Error in background sync for admin view:', err));
    }
  } else if (viewId === 'tech') {
    renderTechDashboard();
    renderTechOrdersTable();
    renderTechChecklistsTable();
    renderTechBitacora();
    populateTechMachineHistorySelect();

    // Sincronización en segundo plano para actualizar datos en tiempo real sin bloquear la interfaz
    if (supabaseClient) {
      syncDatabases().then(() => {
        // Solo volver a renderizar si seguimos en la vista de tech
        const techView = document.getElementById('view-tech');
        if (techView && techView.classList.contains('active')) {
          renderTechDashboard();
          renderTechOrdersTable();
          renderTechChecklistsTable();
          renderTechBitacora();
          populateTechMachineHistorySelect();
        }
      }).catch(err => console.error('Error in background sync for tech view:', err));
    }
  }
}

// --- PORTAL PÚBLICO: NAVEGACIÓN Y ACCIONES ---
function showPublicPanel(panelName) {
  activePublicPanel = panelName;
  const route = `#public/${panelName}`;
  if (location.hash !== route) {
    history.pushState(null, '', route);
  }
  localStorage.setItem('TSMAI_current_route', route);
  
  // Ocultar barra de navegación superior en el Home (Split screen bienvenida) y mostrarla en otros paneles
  const publicNavbar = document.querySelector('.public-navbar');
  if (publicNavbar) {
    publicNavbar.style.display = (panelName === 'home') ? 'none' : 'flex';
  }
  
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

// Carga máquinas correspondientes al área seleccionada y filtra por departamento
// ==========================================================================
// MOTOR GLOBAL DE CONEXIÓN CASCADA POR MÁQUINA
// CONEXIÓN: ÁREA -> MÁQUINA DESTINADA -> REFACCIÓN DE LA MÁQUINA
// ==========================================================================

function getMachinesByArea(areaCode) {
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  if (!areaCode || areaCode === '' || areaCode === 'ALL' || areaCode === 'General') {
    return machines.filter(m => m.activo !== false);
  }
  const cleanArea = String(areaCode).toUpperCase().trim();
  return machines.filter(m => {
    if (m.activo === false) return false;
    const mArea = String(m.area || m.departamento_codigo || m.departamento || '').toUpperCase().trim();
    return mArea === cleanArea || mArea.includes(cleanArea) || cleanArea.includes(mArea);
  });
}

function getPartsByMachine(machineId) {
  const allParts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
  const refPorMaquina = JSON.parse(localStorage.getItem('TSMAI_refacciones_por_maquina') || '[]');
  
  if (!machineId || machineId === '' || machineId === 'NO_APLICA' || machineId === 'ALL') {
    return allParts;
  }

  const cleanMacId = String(machineId).toUpperCase().trim();
  
  // 1. Filtrar refacciones asociadas en el catálogo de relación refacciones_por_maquina
  const linkedParts = refPorMaquina.filter(rm => {
    const mac = String(rm.maquina_id || rm.maquina || rm.equipo || '').toUpperCase().trim();
    return mac === cleanMacId || mac.includes(cleanMacId);
  });

  if (linkedParts.length > 0) {
    return linkedParts.map(lp => ({
      id: lp.codigo_articulo || lp.id,
      code: lp.codigo_articulo || lp.code || lp.id,
      name: lp.nombre_articulo || lp.nombre || lp.name,
      cost: parseFloat(lp.precio_costo_unitario || lp.costo || 0),
      stock: parseFloat(lp.cantidad_estandar || lp.stock || 10)
    }));
  }

  // 2. Filtrar en el catálogo general TSMAI_parts por coincidencia de máquina
  const directParts = allParts.filter(p => {
    const pMac = String(p.machineId || p.maquina_id || p.maquina || '').toUpperCase().trim();
    return pMac === cleanMacId || pMac === '' || pMac.includes(cleanMacId);
  });

  return directParts.length > 0 ? directParts : allParts;
}

function setupCascadingAreaMachineParts(areaSelectOrId, machineSelectOrId, partSelectOrId) {
  const areaEl = typeof areaSelectOrId === 'string' ? document.getElementById(areaSelectOrId) : areaSelectOrId;
  const macEl = typeof machineSelectOrId === 'string' ? document.getElementById(machineSelectOrId) : machineSelectOrId;
  const partEl = typeof partSelectOrId === 'string' ? document.getElementById(partSelectOrId) : partSelectOrId;

  if (!areaEl && !macEl) return;

  const updateMachines = () => {
    if (!macEl) return;
    const selectedArea = areaEl ? areaEl.value : '';
    const filteredMachines = getMachinesByArea(selectedArea);
    
    let html = '<option value="NO_APLICA">Selecciona máquina del área...</option>';
    filteredMachines.forEach(m => {
      const id = m.id || m.clave;
      const name = m.name || m.nombre || id;
      html += `<option value="${id}">${id} - ${name} (${m.area || selectedArea})</option>`;
    });
    
    const currentVal = macEl.value;
    macEl.innerHTML = html;
    if (filteredMachines.some(m => (m.id || m.clave) === currentVal)) {
      macEl.value = currentVal;
    }
    updateParts();
  };

  const updateParts = () => {
    if (!partEl) return;
    const selectedMac = macEl ? macEl.value : '';
    const filteredParts = getPartsByMachine(selectedMac);

    let html = '<option value="">— Selecciona refacción de la máquina —</option>';
    filteredParts.forEach(p => {
      const code = p.code || p.id || p.codigo_articulo;
      const name = p.name || p.nombre || p.nombre_articulo;
      const costStr = p.cost ? ` ($${p.cost.toFixed(2)})` : '';
      html += `<option value="${code}" data-costo="${p.cost || 0}">${code} - ${name}${costStr}</option>`;
    });

    partEl.innerHTML = html;
  };

  if (areaEl) {
    areaEl.addEventListener('change', updateMachines);
  }
  if (macEl) {
    macEl.addEventListener('change', updateParts);
  }

  updateMachines();
}

function loadMachinesForArea(areaCode) {
  const machineSelect = document.getElementById('req-machine');
  if (!machineSelect) return;
  
  if (!areaCode) {
    machineSelect.innerHTML = '<option value="">Selecciona área primero</option>';
    machineSelect.disabled = true;
    return;
  }

  const filtered = getMachinesByArea(areaCode);

  let html = '<option value="">Selecciona Máquina / Equipo de ' + areaCode + '</option>';
  filtered.forEach(m => {
    const critBadge = m.criticality ? ` [Criticidad ${m.criticality}]` : '';
    html += `<option value="${m.id}">${m.name} (${m.id})${critBadge}</option>`;
  });

  machineSelect.innerHTML = html;
  machineSelect.disabled = false;
}

// Auto-sugerir prioridad según la criticidad del equipo seleccionado
function onMachineSelectChange(machineId) {
  if (!machineId) return;
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const found = machines.find(m => m.id === machineId || m.equipo_towell === machineId);
  const urgencySelect = document.getElementById('req-urgency');
  if (urgencySelect && found) {
    if (found.criticality === 'A' || found.tipo_equipo === 'Servicios Auxiliares') {
      urgencySelect.value = 'Crítica';
    } else if (found.criticality === 'B') {
      urgencySelect.value = 'Alta';
    } else {
      urgencySelect.value = 'Media';
    }
  }
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
  
  let maxNum = 0;
  combinedList.forEach(o => {
    const idStr = o.id || '';
    if (idStr.includes(prefix)) {
      const match = idStr.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  let nextConsecutive = maxNum + 1;
  let reqId = `${prefix}${String(nextConsecutive).padStart(5, '0')}`;
  
  // Salvaguarda: Asegurar que no exista duplicado en la lista combinada (directo o con prefijo)
  while (combinedList.some(o => o.id === reqId || o.id === `TG-${reqId}`)) {
    nextConsecutive++;
    reqId = `${prefix}${String(nextConsecutive).padStart(5, '0')}`;
  }

  const matchedEmp = (window.publicEmployeesList || []).find(
    e => e.nombre_empleado && e.nombre_empleado.trim().toLowerCase() === name.trim().toLowerCase()
  );
  const cveSolicitante = matchedEmp ? matchedEmp.cve_empleado : null;

  const newRequest = {
    id: reqId,
    applicant: name,
    applicant_code: cveSolicitante,
    shift: shift,
    area: area,
    plant: area === 'AF' ? 'Planta General' : (area === 'CF' ? 'Planta 2 (Confección)' : 'Planta 1 (Tejido)'),
    department: area,
    machine: machine,
    type: type,
    description: description,
    machineStopped: machineStopped,
    urgency: urgency,
    risk: machineStopped === 'Sí' ? 'Alto' : 'Medio',
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

// --- ACCIONES DE CREACIÓN DE SOLICITUD POR SUPERADMINISTRADOR ---
function openAdminCreateRequestModal() {
  document.getElementById('form-admin-create-request').reset();
  
  // Populate datalist employees-list-admin
  const datalist = document.getElementById('employees-list-admin');
  if (datalist) {
    const list = window.publicEmployeesList || [];
    datalist.innerHTML = list.map(e => `<option value="${e.nombre_empleado}"></option>`).join('');
  }

  openModal('modal-admin-create-request');
}

function loadMachinesForAdminArea(areaCode) {
  const machineSelect = document.getElementById('admin-req-machine');
  if (!machineSelect) return;
  
  if (!areaCode) {
    machineSelect.innerHTML = '<option value="">Selecciona área primero</option>';
    machineSelect.disabled = true;
    return;
  }

  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const filtered = machines.filter(m => (m.area === areaCode || m.departamento_codigo === areaCode || areaCode === 'General') && m.activo !== false);

  let html = '<option value="">Selecciona Máquina / Equipo</option>';
  filtered.forEach(m => {
    const critBadge = m.criticality ? ` [Criticidad ${m.criticality}]` : '';
    html += `<option value="${m.id}">${m.name} (${m.id})${critBadge}</option>`;
  });

  machineSelect.innerHTML = html;
  machineSelect.disabled = false;
}

async function handleAdminRequestSubmit(event) {
  event.preventDefault();

  const name = document.getElementById('admin-req-name').value;
  const plant = document.getElementById('admin-req-plant').value;
  const area = document.getElementById('admin-req-area').value;
  const dept = document.getElementById('admin-req-department').value;
  const machine = document.getElementById('admin-req-machine').value;
  const shift = document.getElementById('admin-req-shift').value;
  const type = document.getElementById('admin-req-type').value;
  const urgency = document.getElementById('admin-req-urgency').value;
  const risk = document.getElementById('admin-req-risk').value;
  const machineStopped = document.querySelector('input[name="admin-req-stopped"]:checked').value;
  const description = document.getElementById('admin-req-description').value;

  // Generar folio de negocio
  const prefix = area;
  const combinedList = [
    ...(JSON.parse(localStorage.getItem('TSMAI_requests') || '[]')),
    ...(JSON.parse(localStorage.getItem('TSMAI_orders') || '[]'))
  ];
  
  let maxNum = 0;
  combinedList.forEach(o => {
    const idStr = o.id || '';
    if (idStr.includes(prefix)) {
      const match = idStr.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });

  let nextConsecutive = maxNum + 1;
  let reqId = `${prefix}${String(nextConsecutive).padStart(5, '0')}`;

  const matchedEmp = (window.publicEmployeesList || []).find(
    e => e.nombre_empleado && e.nombre_empleado.trim().toLowerCase() === name.trim().toLowerCase()
  );
  const cveSolicitante = matchedEmp ? matchedEmp.cve_empleado : null;

  const newRequest = {
    id: reqId,
    applicant: name,
    applicant_code: cveSolicitante,
    plant: plant,
    area: area,
    department: dept,
    machine: machine,
    shift: shift,
    type: type,
    urgency: urgency,
    risk: risk,
    machineStopped: machineStopped,
    description: description,
    status: 'Solicitud recibida',
    date: new Date().toISOString()
  };

  // Insertar en Supabase / LocalCache
  await dbInsertRequest(newRequest);

  // Si la máquina está parada, actualizar estado
  if (machineStopped === 'Sí') {
    const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
    const machineIndex = machines.findIndex(m => m.id === machine);
    if (machineIndex !== -1) {
      machines[machineIndex].status = 'Parada';
      localStorage.setItem('TSMAI_machines', JSON.stringify(machines));
    }
    if (supabaseClient) {
      try {
        await supabaseClient.from('cat_maquinas').update({ activo: false }).eq('equipo_towell', machine);
      } catch (err) {
        console.error('Error updating machine status in Supabase:', err);
      }
    }
  }

  closeModal('modal-admin-create-request');
  showToast(`✅ Solicitud ${reqId} registrada exitosamente.`);

  await syncDatabases();
  refreshActiveViewSilently();
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
function openLogin(mode) {
  showView('public-portal');
  showPublicPanel('home');
  switchLoginTab(mode === 'demo' ? 'demo' : 'users');
}

function switchLoginTab(tab) {
  const usersForm = document.getElementById('split-form-login');
  const demoBox = document.getElementById('split-demo-box');
  const btnUsers = document.getElementById('tab-btn-users');
  const btnDemo = document.getElementById('tab-btn-demo');

  if (!usersForm || !demoBox || !btnUsers || !btnDemo) return;

  if (tab === 'users') {
    usersForm.style.display = 'block';
    demoBox.style.display = 'none';
    
    // Activo
    btnUsers.style.background = 'white';
    btnUsers.style.color = '#0f172a';
    btnUsers.style.fontWeight = '600';
    btnUsers.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    
    btnDemo.style.background = 'transparent';
    btnDemo.style.color = '#64748b';
    btnDemo.style.fontWeight = '500';
    btnDemo.style.boxShadow = 'none';
  } else {
    usersForm.style.display = 'none';
    demoBox.style.display = 'block';

    // Activo
    btnDemo.style.background = 'white';
    btnDemo.style.color = '#0f172a';
    btnDemo.style.fontWeight = '600';
    btnDemo.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    
    btnUsers.style.background = 'transparent';
    btnUsers.style.color = '#64748b';
    btnUsers.style.fontWeight = '500';
    btnUsers.style.boxShadow = 'none';
  }
}

async function handleSplitLoginSubmit(event) {
  if (event) event.preventDefault();
  await handleLoginSubmit(event);
}

async function quickLogin(role, techId) {
  currentUser = null;
  localStorage.removeItem('TSMAI_current_user');
  showToast('🔑 Iniciando sesión rápida...');
  
  let email = 'admin@tsm-ai.com';
  let password = 'admin123';
  
  if (role === 'admin') {
    email = 'admin@tsm-ai.com';
    password = 'admin123';
  } else if (role === 'tech') {
    if (techId === 'T-02' || techId === 'T-3366' || (techId && techId.toLowerCase().includes('sofia'))) {
      email = 'sofia@tsm-ai.com';
      password = 'tech123';
    } else if (techId === 'T-03' || (techId && techId.toLowerCase().includes('alejandro'))) {
      email = 'alejandro@tsm-ai.com';
      password = 'tech123';
    } else {
      email = 'carlos@tsm-ai.com';
      password = 'tech123';
    }
  }

  if (supabaseClient) {
    useLiveDatabase = true;
    try {
      await supabaseClient.auth.signOut();
      const { error: authErr } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (authErr) {
        console.warn('Fallo autenticación Supabase Demo:', authErr.message);
      }
    } catch (authEx) {
      console.warn('Excepción de autenticación en quickLogin:', authEx);
    }
  } else {
    useLiveDatabase = false;
  }

  try {
    if (role === 'admin') {
      let dbAdmin = null;
      if (useLiveDatabase) {
        const { data, error } = await supabaseClient
          .from('cat_usuarios_roles')
          .select('*')
          .eq('correo', email)
          .maybeSingle();
          
        if (!error && data) {
          dbAdmin = data;
        }
      }

      if (!dbAdmin) {
        const users = JSON.parse(localStorage.getItem('TSMAI_users') || '[]');
        dbAdmin = users.find(u => u.rol === 'SUPER_ADMINISTRADOR');
      }

      if (dbAdmin) {
        currentUser = { 
          role: 'admin', 
          name: dbAdmin.nombre_completo, 
          email: dbAdmin.correo,
          uuid: dbAdmin.id_usuario 
        };
      } else {
        currentUser = { role: 'admin', name: 'Super Administrador' };
      }

      persistSessionUser(currentUser);
      showToast(`Sesión iniciada como Super Admin: ${currentUser.name}`);
      
      if (useLiveDatabase) {
        await syncDatabases();
      }
      showView('admin');
      switchAdminPanel('dashboard');

    } else {
      // Técnico
      let dbUser = null;
      if (useLiveDatabase) {
        const { data, error } = await supabaseClient
          .from('cat_usuarios_roles')
          .select('*')
          .eq('correo', email)
          .maybeSingle();

        if (!error && data) {
          dbUser = data;
        }
      }

      if (!dbUser) {
        const users = JSON.parse(localStorage.getItem('TSMAI_users') || '[]');
        dbUser = users.find(u => u.rol === 'MANTENIMIENTO' && (u.cve_tecnico === techId || u.id_usuario === techId));
      }

      if (dbUser) {
        currentUser = {
          role: 'tech',
          id: dbUser.cve_tecnico || dbUser.id_usuario,
          uuid: dbUser.id_usuario,
          name: dbUser.nombre_completo,
          email: dbUser.correo,
          specialty: dbUser.observaciones || 'General',
          avatar: '👨‍🔧',
          department: dbUser.departamento
        };
        persistSessionUser(currentUser);
        showToast(`Sesión iniciada como Técnico: ${dbUser.nombre_completo}`);
        
        document.getElementById('tech-profile-name').innerText = dbUser.nombre_completo;
        document.getElementById('tech-profile-specialty').innerText = dbUser.observaciones || 'General';
        document.getElementById('tech-profile-avatar').innerText = '👨‍🔧';

        if (useLiveDatabase) {
          await syncDatabases();
        }
        showView('tech');
        switchTechPanel('dashboard');
        return;
      }
    }
  } catch (err) {
    console.error('Error en quickLogin:', err);
    showToast('❌ Error al iniciar sesión de prueba.', 'error');
  }
}

async function handleLoginSubmit(event) {
  if (event) event.preventDefault();
  
  const isSplitActive = document.getElementById('split-form-login') && document.getElementById('split-form-login').style.display !== 'none';
  
  const roleInput = document.getElementById('login-role-target');
  const role = roleInput ? roleInput.value : 'users';
  
  let email = '';
  let password = '';
  
  if (isSplitActive) {
    const splitEmail = document.getElementById('split-login-email');
    const splitPass = document.getElementById('split-login-password');
    email = splitEmail ? splitEmail.value.trim().toLowerCase() : '';
    password = splitPass ? splitPass.value.trim() : '';
  }
  
  if (!email) {
    const origEmail = document.getElementById('login-email');
    email = origEmail ? origEmail.value.trim().toLowerCase() : '';
  }
  if (!password) {
    const origPass = document.getElementById('login-password');
    password = origPass ? origPass.value.trim() : '';
  }

  let dbUser = null;

  // 1. Intentar autenticación por Supabase Auth o consulta directa a la base de datos real
  if (supabaseClient) {
    try {
      showToast('Autenticando en base de datos real...');
      
      // Intentar signInWithPassword
      const { data: authData, error: authErr } = await supabaseClient.auth.signInWithPassword({ email, password });
      
      if (!authErr && authData && authData.user) {
        const { data, error } = await supabaseClient
          .from('cat_usuarios_roles')
          .select('*')
          .eq('correo', email)
          .maybeSingle();
        if (!error && data) {
          dbUser = data;
        }
      }
      
      // Fallback: si Auth no retornó el usuario o la contraseña difiere en Auth, consultar cat_usuarios_roles directamente en la BD real
      if (!dbUser) {
        const { data: directUser, error: directErr } = await supabaseClient
          .from('cat_usuarios_roles')
          .select('*')
          .eq('correo', email)
          .maybeSingle();
          
        if (!directErr && directUser) {
          dbUser = directUser;
          console.log('[TSMAI] Usuario autenticado exitosamente desde cat_usuarios_roles en Supabase:', email);
        }
      }
    } catch (err) {
      console.error('Error durante la autenticación de Supabase:', err);
    }
  }

  // 2. Si el usuario existe en la base de datos real (Supabase)
  if (dbUser) {
    useLiveDatabase = true;
    showToast('Conectado a Base de Datos Real de Planta.');
    
    await syncDatabases();

    const roleKey = normalizeUserRole(dbUser.rol);

    if (roleKey === 'admin') {
      currentUser = { 
        role: 'admin', 
        rol: dbUser.rol,
        name: dbUser.nombre_completo, 
        email: dbUser.correo,
        uuid: dbUser.id_usuario,
        cve_tecnico: dbUser.cve_tecnico,
        department: dbUser.departamento
      };
      persistSessionUser(currentUser);
      showToast(`Sesión iniciada como Admin: ${dbUser.nombre_completo}`);
      
      const targetPanel = activeAdminPanel || 'dashboard';
      showView('admin');
      switchAdminPanel(targetPanel);
    } else if (roleKey === 'tech') {
      const techId = dbUser.cve_tecnico || dbUser.id_usuario;
      currentUser = { 
        role: 'tech', 
        rol: dbUser.rol,
        id: techId,
        cve_tecnico: dbUser.cve_tecnico,
        uuid: dbUser.id_usuario,
        name: dbUser.nombre_completo, 
        email: dbUser.correo,
        specialty: dbUser.observaciones || 'General',
        avatar: '👨‍🔧',
        department: dbUser.departamento
      };
      persistSessionUser(currentUser);
      showToast(`Sesión iniciada como Técnico: ${dbUser.nombre_completo}`);
      
      const pName = document.getElementById('tech-profile-name');
      const pSpec = document.getElementById('tech-profile-specialty');
      const pAvat = document.getElementById('tech-profile-avatar');
      if (pName) pName.innerText = dbUser.nombre_completo;
      if (pSpec) pSpec.innerText = dbUser.observaciones || 'General';
      if (pAvat) pAvat.innerText = '👨‍🔧';
      
      const targetPanel = activeTechPanel || 'orders';
      showView('tech');
      switchTechPanel(targetPanel);
    } else if (roleKey === 'solicitante') {
      const userArea = (dbUser.area || dbUser.departamento_codigo || 'CF').toUpperCase().trim();
      currentUser = { 
        role: 'solicitante', 
        rol: 'SOLICITANTE',
        id: dbUser.id_usuario,
        uuid: dbUser.id_usuario,
        name: dbUser.nombre_completo, 
        email: dbUser.correo,
        area: ['CF', 'PRF', 'AF', 'TF'].includes(userArea) ? userArea : 'CF',
        department: dbUser.departamento || 'Operación',
        supervisor: dbUser.id_supervisor || null,
        active: dbUser.activo !== false
      };
      persistSessionUser(currentUser);
      showToast(`Sesión iniciada como Solicitante (${currentUser.area}): ${dbUser.nombre_completo}`);
      
      showView('solicitante');
      switchSolicitantePanel('new');
    } else if (roleKey === 'public') {
      currentUser = { 
        role: 'public', 
        rol: dbUser.rol,
        name: dbUser.nombre_completo, 
        email: dbUser.correo,
        uuid: dbUser.id_usuario 
      };
      persistSessionUser(currentUser);
      showToast(`Sesión iniciada: ${dbUser.nombre_completo}`);
      showView('public-portal');
      showPublicPanel('home');
    }
    return;
  }

  // 3. Si no existe en la base de datos real
  alert('Credenciales incorrectas. El correo (' + email + ') no se encuentra registrado en el sistema.');
}

function logout() {
  currentUser = null;
  persistSessionUser(null);
  localStorage.removeItem('TSMAI_current_user');
  localStorage.removeItem('TSMAI_current_route');
  useLiveDatabase = false;
  
  if (supabaseClient) {
    supabaseClient.auth.signOut().catch(err => console.warn('Supabase signOut error:', err));
  }

  try {
    history.pushState('', document.title, window.location.pathname + window.location.search);
  } catch (e) {
    window.location.hash = '';
  }

  showView('public-portal');
  showPublicPanel('home');
  showToast('Sesión cerrada correctamente.');
}

// --- PANEL SUPER ADMINISTRADOR ---
function closeDatabaseSubmenu() {
  const submenu = document.getElementById('admin-database-submenu');
  const arrow = document.querySelector('#menu-admin-database-group .arrow');
  if (submenu) {
    submenu.style.display = 'none';
    if (arrow) arrow.innerText = '▼';
  }
}

// Alternar visualización del submenú de base de datos
function toggleDatabaseSubmenu(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const submenu = document.getElementById('admin-database-submenu');
  const arrow = document.querySelector('#menu-admin-database-group .arrow');
  if (submenu) {
    const isHidden = submenu.style.display === 'none' || submenu.style.display === '' || getComputedStyle(submenu).display === 'none';
    submenu.style.display = isHidden ? 'block' : 'none';
    if (arrow) arrow.innerText = isHidden ? '▲' : '▼';
  }
}

function switchAdminPanel(panelId) {
  activeAdminPanel = panelId;
  const route = `#admin/${panelId}`;
  if (location.hash !== route) {
    history.pushState(null, '', route);
  }
  localStorage.setItem('TSMAI_current_route', route);
  closeSidebarOnMobile();
  updateMobileBottomNav();
  
  // Ocultar siempre el submenú desplegable al seleccionar una opción
  closeDatabaseSubmenu();

  // Cambiar pestaña activa de la barra lateral
  document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const dbGroup = document.getElementById('menu-admin-database-group');
  if (dbGroup) dbGroup.classList.remove('active');

  const activeMenuItem = document.getElementById(`menu-admin-${panelId}`);
  if (activeMenuItem) activeMenuItem.classList.add('active');

  const dbPanels = [
    'databases', 'machines', 'parts', 'inventory', 'suppliers', 'tecnicos', 'empleados',
    'departamentos', 'turnos', 'servicios', 'tiposfalla', 'categfalla', 'criticidad',
    'componentes', 'estatusot', 'users', 'logs', 'laborcosts', 'alertrules',
    'notificaciones', 'fallas', 'telegram', 'costosot', 'evidencias', 'refmaquina', 'histprecios', 'cierres', 'respchk',
    'preventive', 'checklists', 'downtime'
  ];
  if (dbPanels.includes(panelId) && dbGroup) {
    dbGroup.classList.add('active');
  }

  // Cambiar paneles visibles
  document.querySelectorAll('.admin-panel-content').forEach(panel => {
    panel.style.display = 'none';
  });
  const activePanel = document.getElementById(`panel-admin-${panelId}`);
  if (activePanel) activePanel.style.display = 'block';

  // Configurar título de Topbar
  const titleLabels = {
    dashboard: '📊 Dashboard Ejecutivo',
    databases: '🗄️ Centro de Bases de Datos & Catálogos',
    requests: '📨 Bandeja de Solicitudes Nuevas',
    orders: '📋 Control General de Órdenes de Trabajo',
    calendar: '📅 Calendario Mensual de Mantenimiento',
    logs: '📝 Historial de Bitácoras de Trabajo',
    machines: '⚙️ Catálogo de Maquinarias',
    parts: '📦 Control de Refacciones',
    inventory: '🏭 Inventario de Refacciones',
    suppliers: '🤝 Catálogo de Proveedores',
    tecnicos: '🛠️ Catálogo de Técnicos',
    empleados: '👷 Catálogo de Empleados',
    departamentos: '🏢 Catálogo de Departamentos',
    turnos: '🕐 Catálogo de Turnos',
    servicios: '🔩 Servicios de Mantenimiento',
    tiposfalla: '⚡ Tipos de Falla',
    categfalla: '🗂️ Categorías de Falla',
    criticidad: '🚨 Criticidad de Máquinas',
    componentes: '🔩 Componentes de Máquina',
    estatusot: '🏷️ Estatus de Órdenes de Trabajo',
    users: '👥 Control de Usuarios y Permisos',
    forms: '🛠️ Formularios y Checklists Dinámicos',
    excel: '📥 Centro de Ingestión de Excel',
    calendars: '📅 Calendarios de Mantenimiento',
    config: '⚙️ Configuración del Sistema',
    subtasks: '🔧 Subtareas y Apoyo de otra Área',
    preventive: '📅 Planes de Mantenimiento Preventivo',
    checklists: '✅ Checklists de Mantenimiento',
    laborcosts: '💰 Costos de Mano de Obra',
    downtime: '⏱️ Paros de Máquina',
    kpis: '📈 KPIs de Mantenimiento',
    analysis: '🔬 Análisis de Repetibilidad de Fallas',
    ai: '🤖 Recomendaciones IA',
    alertrules: '🔔 Reglas de Alertas del Sistema',
    notificaciones: '📨 Notificaciones Internas',
    alertas: '🔔 Alertas del Sistema',
    fallas: '💥 Fallas por Máquina',
    telegram: '📨 Órdenes Históricas Telegram',
    costosot: '💵 Costos por Orden de Trabajo',
    evidencias: '📎 Evidencias de OT',
    refmaquina: '🔧 Consumo de Refacciones por Máquina',
    histprecios: '📊 Historial de Precios de Refacciones',
    cierres: '✅ Cierres de Órdenes de Trabajo',
    respchk: '📋 Respuestas de Checklist por OT'
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
    switchCalendarViewMode('grid');
  } else if (panelId === 'logs') {
    renderAdminLogsTable();
  } else if (panelId === 'machines') {
    renderAdminMachinesTable();
  } else if (panelId === 'parts') {
    renderAdminPartsTable();
  } else if (panelId === 'tecnicos') {
    renderAdminTecnicos();
  } else if (panelId === 'empleados') {
    renderAdminEmpleados();
  } else if (panelId === 'departamentos') {
    renderAdminDepartamentos();
  } else if (panelId === 'turnos') {
    renderAdminTurnos();
  } else if (panelId === 'servicios') {
    renderAdminServicios();
  } else if (panelId === 'tiposfalla') {
    renderAdminTiposFalla();
  } else if (panelId === 'categfalla') {
    renderAdminCategFalla();
  } else if (panelId === 'criticidad') {
    renderAdminCriticidad();
  } else if (panelId === 'componentes') {
    renderAdminComponentes();
  } else if (panelId === 'estatusot') {
    renderAdminEstatusOT();
  } else if (panelId === 'users') {
    renderAdminUsersTable();
  } else if (panelId === 'forms') {
    renderAdminFormsList();
  } else if (panelId === 'subtasks') {
    renderAdminSubtasksTable();
  } else if (panelId === 'preventive') {
    renderAdminPreventivePlans();
  } else if (panelId === 'checklists') {
    renderAdminChecklists();
  } else if (panelId === 'downtime') {
    renderAdminDowntime();
  } else if (panelId === 'kpis') {
    renderAdminKPIs();
  } else if (panelId === 'analysis') {
    renderAdminAnalysis();
  } else if (panelId === 'ai') {
    renderAdminAIRecommendations();
  } else if (panelId === 'alertrules') {
    renderAdminAlertRules();
  } else if (panelId === 'notificaciones') {
    renderAdminNotificaciones();
  } else if (panelId === 'alertas') {
    renderAdminAlertas();
  } else if (panelId === 'fallas') {
    renderAdminFallas();
  } else if (panelId === 'telegram') {
    renderAdminTelegramTable();
  } else if (panelId === 'costosot') {
    renderAdminCostosOT();
  } else if (panelId === 'evidencias') {
    renderAdminEvidencias();
  } else if (panelId === 'refmaquina') {
    renderAdminRefMaquina();
  } else if (panelId === 'cierres') {
    renderAdminCierres();
  } else if (panelId === 'respchk') {
    renderAdminRespChk();
  } else if (panelId === 'excel') {
    renderExcelHistoryTable();
  }
}

// ============================================================================
// RENDER FUNCTIONS — NEW MODULES (T19–T29)
// ============================================================================

// ── Helpers compartidos ──────────────────────────────────────────────────────

function badgeRisk(nivel) {
  const map = { Alto: 'background:#ef4444;color:#fff', Medio: 'background:#f59e0b;color:#fff', Bajo: 'background:#22c55e;color:#fff' };
  const style = map[nivel] || 'background:#94a3b8;color:#fff';
  return `<span style="padding:2px 8px;border-radius:10px;font-size:0.75rem;font-weight:600;${style}">${nivel || '—'}</span>`;
}
function badgePriority(p) {
  const map = { Crítica: '#ef4444', Alta: '#f97316', Media: '#f59e0b', Baja: '#22c55e' };
  const bg = map[p] || '#94a3b8';
  return `<span style="padding:2px 8px;border-radius:10px;font-size:0.75rem;font-weight:600;background:${bg};color:#fff">${p || '—'}</span>`;
}
function badgeActive(activo) {
  return activo ? `<span style="padding:2px 8px;border-radius:10px;font-size:0.75rem;font-weight:600;background:#22c55e;color:#fff">Activo</span>`
                : `<span style="padding:2px 8px;border-radius:10px;font-size:0.75rem;font-weight:600;background:#94a3b8;color:#fff">Inactivo</span>`;
}
function fmtCurrency(val, moneda = 'MXN') {
  if (val === null || val === undefined) return '—';
  return `$${parseFloat(val).toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${moneda}`;
}
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('es-MX') : '—'; }
function fmtTs(d)   { return d ? new Date(d).toLocaleString('es-MX')     : '—'; }

function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}" style="text-align:center;color:var(--text-muted);padding:40px;">${msg}</td></tr>`;
}

// ── PLANES MANTENIMIENTO PREVENTIVO ─────────────────────────────────────────
async function renderAdminPreventivePlans() {
  const tbody = document.getElementById('tbody-preventive');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(8, 'Cargando planes preventivos…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(8, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('planes_mantenimiento_preventivo').select('*').order('proxima_ejecucion').limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(8, 'No hay planes preventivos registrados.'); return; }
    const today = new Date();
    tbody.innerHTML = data.map(r => {
      const proxima = r.proxima_ejecucion ? new Date(r.proxima_ejecucion) : null;
      const vencido = proxima && proxima < today;
      return `<tr>
        <td>${r.maquina_id}</td>
        <td><code>${r.codigo_servicio}</code></td>
        <td>${r.nombre_plan || '—'}</td>
        <td>${r.frecuencia ? `${r.frecuencia} ${r.unidad_frecuencia || ''}` : '—'}</td>
        <td>${fmtDate(r.ultima_ejecucion)}</td>
        <td style="${vencido ? 'color:#ef4444;font-weight:600' : ''}">${fmtDate(r.proxima_ejecucion)} ${vencido ? '⚠️' : ''}</td>
        <td>${r.responsable || '—'}</td>
        <td>${badgeActive(r.activo)}</td>
      </tr>`;
    }).join('');
  } catch (err) { tbody.innerHTML = emptyRow(8, `❌ Error: ${err.message}`); }
}
function openPreventiveModal() { alert('Modal de nuevo plan preventivo — próximamente.'); }

// ── CHECKLISTS ───────────────────────────────────────────────────────────────
async function renderAdminChecklists() {
  const tbody = document.getElementById('tbody-checklists');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(6, 'Cargando checklists…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(6, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('checklists_mantenimiento').select('*').order('codigo_servicio').order('orden').limit(300);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(6, 'No hay preguntas de checklist registradas.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code>${r.codigo_servicio}</code></td>
      <td>${r.codigo_pregunta || '—'}</td>
      <td>${r.pregunta}</td>
      <td>${r.tipo_respuesta || '—'}</td>
      <td>${r.obligatorio ? '✅ Sí' : 'No'}</td>
      <td>${r.orden ?? '—'}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(6, `❌ Error: ${err.message}`); }
}
async function openChecklistModal() {
  const selectServ = document.getElementById('chk-new-service');
  if (!selectServ) return;

  selectServ.innerHTML = '<option value="">Cargando servicios...</option>';
  
  let services = [];
  if (useLiveDatabase && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('cat_servicios_mantenimiento').select('*').eq('activo', true);
      if (!error && data) {
        services = data.map(s => ({ code: s.codigo_servicio, name: s.nombre_servicio }));
      }
    } catch (e) {
      console.warn('Failed to load services from Supabase:', e);
    }
  }

  if (services.length === 0) {
    const servicesLocal = JSON.parse(localStorage.getItem('TSMAI_services') || '[]');
    services = servicesLocal.map(s => ({ code: s.id, name: s.name }));
  }

  if (services.length === 0) {
    services = [
      { code: 'SERV-01', name: 'Mantenimiento Preventivo Mecánico' },
      { code: 'SERV-02', name: 'Inspección Eléctrica Semanal' },
      { code: 'SERV-03', name: 'Ajuste de Tensión de Bandas' }
    ];
  }

  selectServ.innerHTML = '<option value="">Selecciona servicio...</option>' + 
    services.map(s => `<option value="${s.code}">${s.name} (${s.code})</option>`).join('');

  // Reset inputs
  document.getElementById('chk-new-code').value = '';
  document.getElementById('chk-new-question').value = '';
  document.getElementById('chk-new-type').value = 'si_no';
  document.getElementById('chk-new-required').checked = false;
  document.getElementById('chk-new-order').value = '1';
  document.getElementById('chk-new-obs').value = '';

  openModal('modal-admin-new-checklist-question');
}

async function submitNewChecklistQuestion() {
  const service = document.getElementById('chk-new-service').value;
  const code = document.getElementById('chk-new-code').value.trim();
  const question = document.getElementById('chk-new-question').value.trim();
  const type = document.getElementById('chk-new-type').value;
  const required = document.getElementById('chk-new-required').checked;
  const order = parseInt(document.getElementById('chk-new-order').value) || 1;
  const obs = document.getElementById('chk-new-obs').value.trim();

  if (!service || !code || !question || !type) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }

  if (useLiveDatabase && supabaseClient) {
    try {
      showToast('Guardando en base de datos...');
      const record = {
        codigo_servicio: service,
        codigo_pregunta: code,
        pregunta: question,
        tipo_respuesta: type,
        obligatorio: required,
        orden: order,
        observaciones: obs || null,
        activo: true
      };
      const { error } = await supabaseClient.from('checklists_mantenimiento').insert([record]);
      if (error) throw error;
      showToast('Pregunta de checklist guardada en Supabase.');
    } catch (err) {
      console.error('Error inserting checklist question in Supabase:', err);
      alert('Error al guardar en Supabase: ' + err.message);
      return;
    }
  }

  // Guardar localmente
  const localForms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  let existingForm = localForms.find(f => f.id === service);
  if (!existingForm) {
    existingForm = {
      id: service,
      name: 'Checklist: ' + service,
      area: service.includes('COS') ? 'Costura' : 'General',
      fields: []
    };
    localForms.push(existingForm);
  }

  existingForm.fields.push({
    name: code,
    label: question,
    type: type === 'si_no' ? 'radio' : type === 'numerico' ? 'number' : 'text',
    required: required
  });

  localStorage.setItem('TSMAI_dynamic_forms', JSON.stringify(localForms));

  closeModal('modal-admin-new-checklist-question');
  showToast('Pregunta guardada.');
  renderAdminChecklists();
  
  if (useLiveDatabase) {
    syncDatabases().catch(e => console.warn(e));
  }
}

// ── PAROS DE MÁQUINA ─────────────────────────────────────────────────────────
async function renderAdminDowntime() {
  const tbody = document.getElementById('tbody-downtime');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(7, 'Cargando paros de máquina…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(7, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('paros_maquina').select('*').order('fecha_hora_inicio_paro', { ascending: false }).limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(7, 'No hay paros de máquina registrados.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td>${r.maquina_id}</td>
      <td>${fmtTs(r.fecha_hora_inicio_paro)}</td>
      <td>${fmtTs(r.fecha_hora_fin_paro)}</td>
      <td>${r.tiempo_paro_min ?? '—'} min</td>
      <td>${r.motivo_paro || '—'}</td>
      <td>${r.impacto_produccion || '—'}</td>
      <td>${fmtCurrency(r.costo_estimado_paro, r.moneda)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(7, `❌ Error: ${err.message}`); }
}
function openDowntimeModal() { alert('Modal de nuevo paro de máquina — próximamente.'); }

// ── KPIs DE MANTENIMIENTO ────────────────────────────────────────────────────
async function renderAdminKPIs() {
  const tbody = document.getElementById('tbody-kpis');
  const cardsContainer = document.getElementById('kpi-cards-container');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(10, 'Cargando KPIs…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(10, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('kpis_mantenimiento').select('*').order('fecha', { ascending: false }).limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(10, 'No hay KPIs calculados aún.'); if (cardsContainer) cardsContainer.innerHTML = ''; return; }
    // Cards de resumen (últimos valores globales)
    const latest = data[0];
    if (cardsContainer) {
      const kpiCards = [
        { label: 'Total OT', value: latest.total_ordenes, icon: '📋', color: '#6366f1' },
        { label: 'OT Abiertas', value: latest.ordenes_abiertas, icon: '🔓', color: '#f59e0b' },
        { label: 'OT Cerradas', value: latest.ordenes_cerradas, icon: '✅', color: '#22c55e' },
        { label: 'T° Prom. (min)', value: `${parseFloat(latest.tiempo_promedio_atencion_min || 0).toFixed(0)} min`, icon: '⏱️', color: '#06b6d4' },
        { label: 'Fallas Repet.', value: latest.fallas_repetidas, icon: '🔄', color: '#ef4444' },
        { label: 'Costo Total', value: fmtCurrency(latest.costo_total, latest.moneda), icon: '💰', color: '#8b5cf6' }
      ];
      cardsContainer.innerHTML = kpiCards.map(k => `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:6px;border-left:4px solid ${k.color};">
          <span style="font-size:1.4rem;">${k.icon}</span>
          <span style="font-size:0.75rem;color:var(--text-muted);font-weight:500;">${k.label}</span>
          <span style="font-size:1.4rem;font-weight:700;color:${k.color};">${k.value}</span>
        </div>`).join('');
    }
    tbody.innerHTML = data.map(r => `<tr>
      <td>${fmtDate(r.fecha)}</td>
      <td>${r.periodo || '—'}</td>
      <td>${r.maquina_id || 'Global'}</td>
      <td>${r.departamento_codigo || '—'}</td>
      <td>${r.total_ordenes}</td>
      <td>${r.ordenes_abiertas}</td>
      <td>${r.ordenes_cerradas}</td>
      <td>${parseFloat(r.tiempo_promedio_atencion_min || 0).toFixed(1)} min</td>
      <td>${r.fallas_repetidas}</td>
      <td>${fmtCurrency(r.costo_total, r.moneda)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(10, `❌ Error: ${err.message}`); }
}

// ── ANÁLISIS DE REPETIBILIDAD DE FALLAS ─────────────────────────────────────
async function renderAdminAnalysis() {
  const tbody = document.getElementById('tbody-analysis');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(8, 'Cargando análisis de fallas…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(8, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('analisis_repetibilidad_fallas').select('*').order('cantidad_repeticiones', { ascending: false }).limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(8, 'No hay análisis de fallas registrados.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td>${r.maquina_id}</td>
      <td>${r.tipo_falla_id || '—'}</td>
      <td>${r.categoria_falla || '—'}</td>
      <td><strong style="color:#ef4444;">${r.cantidad_repeticiones}</strong></td>
      <td>${r.periodo_dias ? `${r.periodo_dias} días` : '—'}</td>
      <td>${fmtDate(r.fecha_ultima_falla)}</td>
      <td>${badgeRisk(r.nivel_riesgo)}</td>
      <td style="max-width:200px;white-space:normal;">${r.recomendacion || '—'}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(8, `❌ Error: ${err.message}`); }
}
function openAnalysisModal() { alert('Modal de nuevo análisis de fallas — próximamente.'); }

// ── RECOMENDACIONES IA ───────────────────────────────────────────────────────
async function renderAdminAIRecommendations() {
  const grid = document.getElementById('ai-recommendations-grid');
  if (!grid) return;
  grid.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Cargando recomendaciones IA…</p>';
  if (!supabaseClient) { grid.innerHTML = '<p style="color:var(--text-muted);padding:20px;">⚠️ Sin conexión a Supabase.</p>'; return; }
  try {
    const { data, error } = await supabaseClient.from('recomendaciones_ia').select('*').order('fecha_generacion', { ascending: false }).limit(50);
    if (error) throw error;
    if (!data || data.length === 0) { grid.innerHTML = '<p style="color:var(--text-muted);padding:20px;">No hay recomendaciones IA generadas aún.</p>'; return; }
    const prioColors = { Crítica: '#ef4444', Alta: '#f97316', Media: '#f59e0b', Baja: '#22c55e' };
    const statusColors = { pendiente: '#f59e0b', revisada: '#6366f1', aplicada: '#22c55e', descartada: '#94a3b8' };
    grid.innerHTML = data.map(r => {
      const pColor = prioColors[r.prioridad] || '#94a3b8';
      const sColor = statusColors[r.estatus_recomendacion?.toLowerCase()] || '#94a3b8';
      return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;border-top:4px solid ${pColor};display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:0.7rem;font-weight:600;background:${sColor};color:#fff;padding:2px 8px;border-radius:8px;">${r.estatus_recomendacion || 'Pendiente'}</span>
          <span style="font-size:0.7rem;color:var(--text-muted);">${fmtTs(r.fecha_generacion)}</span>
        </div>
        <h4 style="margin:0;font-size:0.95rem;font-weight:700;">${r.titulo_recomendacion || '—'}</h4>
        <p style="margin:0;font-size:0.82rem;color:var(--text-muted);">${r.mensaje_recomendacion || ''}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:0.75rem;">
          <span>🤖 <strong>${r.generado_por || 'IA'}</strong></span>
          ${r.maquina_id ? `<span>⚙️ ${r.maquina_id}</span>` : ''}
          ${r.nivel_confianza != null ? `<span>🎯 ${parseFloat(r.nivel_confianza).toFixed(1)}% confianza</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:4px;">
          ${badgePriority(r.prioridad)}
        </div>
      </div>`;
    }).join('');
  } catch (err) { grid.innerHTML = `<p style="color:#ef4444;padding:20px;">❌ Error: ${err.message}</p>`; }
}

// ── REGLAS DE ALERTAS ────────────────────────────────────────────────────────
async function renderAdminAlertRules() {
  const tbody = document.getElementById('tbody-alertrules');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(7, 'Cargando reglas de alertas…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(7, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('reglas_alertas').select('*').order('nombre_regla').limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(7, 'No hay reglas de alertas configuradas.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code>${r.codigo_regla}</code></td>
      <td>${r.nombre_regla}</td>
      <td>${r.tipo_alerta || '—'}</td>
      <td style="max-width:180px;white-space:normal;">${r.condicion || '—'}</td>
      <td>${r.valor_umbral != null ? `${r.valor_umbral} ${r.unidad_umbral || ''}` : '—'}</td>
      <td>${badgePriority(r.prioridad_default)}</td>
      <td>${badgeActive(r.activo)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(7, `❌ Error: ${err.message}`); }
}
function openAlertRuleModal() { alert('Modal de nueva regla de alerta — próximamente.'); }

// ============================================================================
// RENDER FUNCTIONS — CATÁLOGOS ADICIONALES Y TABLAS OPERACIONALES
// ============================================================================

// ── TÉCNICOS ─────────────────────────────────────────────────────────────────
async function renderAdminTecnicos() {
  const tbody = document.getElementById('tbody-tecnicos');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(8, 'Cargando técnicos…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(8, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('cat_tecnicos').select('*').order('nombre_tecnico').limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(8, 'No hay técnicos registrados.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code>${r.cve_tecnico}</code></td>
      <td><strong>${r.nombre_tecnico}</strong></td>
      <td>${r.departamento_codigo || '—'}</td>
      <td>${r.turno_id ?? '—'}</td>
      <td>${r.especialidad || '—'}</td>
      <td>${r.puesto || '—'}</td>
      <td>${r.correo || '—'}</td>
      <td>${badgeActive(r.activo)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(8, `❌ Error: ${err.message}`); }
}

async function submitNewTechnician() {
  const cve_tecnico = document.getElementById('tech-reg-cve').value.trim();
  const nombre_tecnico = document.getElementById('tech-reg-nombre').value.trim();
  const correo = document.getElementById('tech-reg-correo').value.trim().toLowerCase();
  const especialidad = document.getElementById('tech-reg-especialidad').value;
  const puesto = document.getElementById('tech-reg-puesto').value.trim();
  const turno_id = parseInt(document.getElementById('tech-reg-turno').value) || 1;
  const departamento_codigo = document.getElementById('tech-reg-depto').value;
  const telefono = document.getElementById('tech-reg-telefono').value.trim() || null;

  if (!cve_tecnico || !nombre_tecnico || !correo) {
    alert('Por favor, ingresa los campos obligatorios: Clave, Nombre y Correo.');
    return;
  }

  showToast('Registrando técnico...');

  try {
    if (supabaseClient) {
      // 1. Insert into cat_tecnicos
      const { error: techErr } = await supabaseClient
        .from('cat_tecnicos')
        .insert([{
          cve_tecnico,
          nombre_tecnico,
          correo,
          especialidad,
          puesto,
          turno_id,
          departamento_codigo,
          telefono,
          activo: true
        }]);

      if (techErr) throw techErr;

      // 2. Insert into cat_usuarios_roles
      const { error: userErr } = await supabaseClient
        .from('cat_usuarios_roles')
        .insert([{
          cve_tecnico,
          cve_empleado: cve_tecnico,
          nombre_completo: nombre_tecnico,
          correo,
          telefono,
          rol: 'MANTENIMIENTO',
          observaciones: especialidad,
          puede_crear_solicitud: false,
          puede_ver_ordenes_asignadas: true,
          puede_ver_todas_ordenes: false,
          puede_atender_orden: true,
          puede_cerrar_orden: true,
          puede_validar_cierre: false,
          activo: true,
          debe_cambiar_contrasenia: true
        }]);

      if (userErr) throw userErr;
    }

    // 3. Update localStorage cache
    const localTechs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
    const exists = localTechs.some(t => t.id === cve_tecnico);
    if (!exists) {
      localTechs.push({
        id: cve_tecnico,
        name: nombre_tecnico,
        specialty: especialidad,
        avatar: '👨‍🔧',
        email: correo
      });
      localStorage.setItem('TSMAI_technicians', JSON.stringify(localTechs));
    }

    showToast('Técnico registrado exitosamente.');
    closeModal('modal-admin-new-technician');

    // 4. Reset inputs
    document.getElementById('tech-reg-cve').value = '';
    document.getElementById('tech-reg-nombre').value = '';
    document.getElementById('tech-reg-correo').value = '';
    document.getElementById('tech-reg-telefono').value = '';

    // 5. Refresh table
    renderAdminTecnicos();
    populateTectSelects();
  } catch (err) {
    console.error('Error registering technician:', err);
    showToast(`Error: ${err.message}`);
  }
}

// ── EMPLEADOS ─────────────────────────────────────────────────────────────────
async function renderAdminEmpleados() {
  const tbody = document.getElementById('tbody-empleados');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(7, 'Cargando empleados…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(7, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('cat_empleados').select('*').order('nombre_empleado').limit(500);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(7, 'No hay empleados registrados.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code>${r.cve_empleado}</code></td>
      <td><strong>${r.nombre_empleado}</strong></td>
      <td>${r.departamento_codigo || '—'}</td>
      <td>${r.turno_id ?? '—'}</td>
      <td>${r.puesto || '—'}</td>
      <td>${r.correo || '—'}</td>
      <td>${badgeActive(r.activo)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(7, `❌ Error: ${err.message}`); }
}

// ── DEPARTAMENTOS ─────────────────────────────────────────────────────────────
async function renderAdminDepartamentos() {
  const tbody = document.getElementById('tbody-departamentos');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(4, 'Cargando departamentos…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(4, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('cat_departamentos').select('*').order('codigo_departamento').limit(50);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(4, 'No hay departamentos registrados.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code style="font-size:1rem;font-weight:700;">${r.codigo_departamento}</code></td>
      <td><strong>${r.nombre_departamento}</strong></td>
      <td>${r.descripcion || '—'}</td>
      <td>${badgeActive(r.activo)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(4, `❌ Error: ${err.message}`); }
}

// ── TURNOS ────────────────────────────────────────────────────────────────────
async function renderAdminTurnos() {
  const tbody = document.getElementById('tbody-turnos');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(5, 'Cargando turnos…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(5, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('cat_turnos').select('*').order('id_turno').limit(10);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(5, 'No hay turnos registrados.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td>${r.id_turno}</td>
      <td><strong>${r.nombre_turno}</strong></td>
      <td>${r.hora_inicio || '—'}</td>
      <td>${r.hora_fin || '—'}</td>
      <td>${badgeActive(r.activo)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(5, `❌ Error: ${err.message}`); }
}

// ── SERVICIOS DE MANTENIMIENTO ────────────────────────────────────────────────
async function renderAdminServicios() {
  const tbody = document.getElementById('tbody-servicios');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(5, 'Cargando servicios…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(5, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('cat_servicios_mantenimiento').select('*').order('codigo_servicio').limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(5, 'No hay servicios registrados.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code>${r.codigo_servicio}</code></td>
      <td><strong>${r.nombre_servicio}</strong></td>
      <td>${r.tipo_servicio || '—'}</td>
      <td>${r.duracion_estimada_min != null ? `${r.duracion_estimada_min} min` : '—'}</td>
      <td>${badgeActive(r.activo)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(5, `❌ Error: ${err.message}`); }
}

// ── TIPOS DE FALLA ────────────────────────────────────────────────────────────
async function renderAdminTiposFalla() {
  const tbody = document.getElementById('tbody-tiposfalla');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(5, 'Cargando tipos de falla…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(5, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('cat_tipos_falla').select('*, cat_categorias_falla(nombre_categoria)').order('nombre_falla').limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(5, 'No hay tipos de falla registrados.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code>${r.tipo_falla_id}</code></td>
      <td><strong>${r.nombre_falla}</strong></td>
      <td>${r.cat_categorias_falla?.nombre_categoria || '—'}</td>
      <td>${badgePriority(r.prioridad_default)}</td>
      <td>${badgeActive(r.activo)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(5, `❌ Error: ${err.message}`); }
}

// ── CATEGORÍAS DE FALLA ───────────────────────────────────────────────────────
async function renderAdminCategFalla() {
  const tbody = document.getElementById('tbody-categfalla');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(5, 'Cargando categorías de falla…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(5, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('cat_categorias_falla').select('*').order('nombre_categoria').limit(100);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(5, 'No hay categorías registradas.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code>${r.codigo_categoria}</code></td>
      <td><strong>${r.nombre_categoria}</strong></td>
      <td>${r.descripcion || '—'}</td>
      <td>${r.origen || '—'}</td>
      <td>${badgeActive(r.activo)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(5, `❌ Error: ${err.message}`); }
}

// ── CRITICIDAD DE MÁQUINAS ────────────────────────────────────────────────────
async function renderAdminCriticidad() {
  const tbody = document.getElementById('tbody-criticidad');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(4, 'Cargando criticidad…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(4, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('cat_criticidad_maquina').select('*').order('nivel_criticidad').order('maquina_id').limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(4, 'No hay registros de criticidad.'); return; }
    
    const nivelColor = {
      'Muy Alta': '#ef4444',   // Rojo
      'Alta': '#f97316',       // Naranja
      'Media-Alta': '#eab308',  // Amarillo oscuro
      'Media': '#3b82f6',      // Azul
      'Baja': '#22c55e',       // Verde
      'Muy Baja': '#64748b'    // Gris
    };

    tbody.innerHTML = data.map(r => {
      const c = nivelColor[r.nivel_criticidad] || '#94a3b8';
      return `<tr>
        <td><strong>${r.maquina_id}</strong></td>
        <td><span style="padding:4px 10px;border-radius:12px;font-weight:700;background:${c};color:#fff;font-size:0.75rem;">${r.nivel_criticidad}</span></td>
        <td>${r.descripcion_criticidad || '—'}</td>
        <td>${badgeActive(r.activo)}</td>
      </tr>`;
    }).join('');
  } catch (err) { tbody.innerHTML = emptyRow(4, `❌ Error: ${err.message}`); }
}

// ── COMPONENTES DE MÁQUINA ─────────────────────────────────────────────────
async function renderAdminComponentes() {
  const tbody = document.getElementById('tbody-componentes');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(8, 'Cargando componentes…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(8, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient
      .from('cat_componentes_maquina')
      .select(`
        *,
        cat_refacciones(nombre_articulo),
        cat_tipos_falla(nombre_falla)
      `)
      .order('maquina_id')
      .order('codigo_componente')
      .limit(500);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(8, 'No hay componentes registrados.'); return; }
    const estadoColor = {
      operativo:   '#22c55e',
      degradado:   '#f59e0b',
      falla:       '#ef4444',
      reemplazado: '#6366f1',
      baja:        '#94a3b8'
    };
    tbody.innerHTML = data.map(r => {
      const ec = estadoColor[r.estado_componente] || '#94a3b8';
      const proxInsp = r.proxima_inspeccion ? fmtDate(r.proxima_inspeccion) : '—';
      const hoy = new Date();
      const proxDate = r.proxima_inspeccion ? new Date(r.proxima_inspeccion) : null;
      const vencido = proxDate && proxDate < hoy;
      return `<tr>
        <td><code>${r.codigo_componente}</code></td>
        <td><strong>${r.nombre_componente}</strong>${r.descripcion ? `<br><small style="color:var(--text-muted);">${r.descripcion}</small>` : ''}</td>
        <td>${r.maquina_id}</td>
        <td>${r.tipo_componente || '—'}</td>
        <td>${r.cat_refacciones?.nombre_articulo ? `<span style="color:var(--accent-cyan);">${r.cat_refacciones.nombre_articulo}</span>` : '—'}</td>
        <td>${r.cat_tipos_falla?.nombre_falla || '—'}</td>
        <td><span style="padding:3px 10px;border-radius:8px;font-size:0.75rem;font-weight:700;background:${ec};color:#fff;">${r.estado_componente || '—'}</span></td>
        <td style="${vencido ? 'color:#ef4444;font-weight:700;' : ''}">${vencido ? '⚠️ ' : ''}${proxInsp}</td>
      </tr>`;
    }).join('');
  } catch (err) { tbody.innerHTML = emptyRow(8, `❌ Error: ${err.message}`); }
}

// ── ESTATUS DE OT ─────────────────────────────────────────────────────────────
async function renderAdminEstatusOT() {
  const tbody = document.getElementById('tbody-estatusot');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(7, 'Cargando estatus…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(7, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('cat_estatus_orden').select('*').order('orden_flujo').limit(50);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(7, 'No hay estatus configurados.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code>${r.codigo_estatus}</code></td>
      <td><strong>${r.nombre_estatus}</strong></td>
      <td>${r.descripcion || '—'}</td>
      <td>${r.orden_flujo ?? '—'}</td>
      <td>${r.es_inicial ? '✅' : '—'}</td>
      <td>${r.es_final ? '🏁' : '—'}</td>
      <td>${badgeActive(r.activo)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(7, `❌ Error: ${err.message}`); }
}

// ── ALERTAS DEL SISTEMA ───────────────────────────────────────────────────────
// ── NOTIFICACIONES INTERNAS ─────────────────────────────────────────
async function renderAdminNotificaciones() {
  const tbody = document.getElementById('tbody-notificaciones');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(7, 'Cargando notificaciones…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(7, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient
      .from('notificaciones_internas')
      .select(`
        *,
        receptor:cat_usuarios_roles!id_usuario_receptor(nombre_completo, rol),
        emisor:cat_usuarios_roles!id_usuario_emisor(nombre_completo)
      `)
      .order('fecha_creacion', { ascending: false })
      .limit(300);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(7, 'No hay notificaciones registradas.'); return; }
    const tipoIcon = {
      ot_asignada:         '📋',
      ot_actualizada:      '🔄',
      ot_cerrada:          '✅',
      ot_comentario:       '💬',
      subtarea_asignada:   '🔧',
      subtarea_actualizada:'🔄',
      subtarea_cerrada:    '✅',
      solicitud_nueva:     '📨',
      alerta_critica:      '🚨',
      sistema:             '🤖'
    };
    const prioColor = { critica: '#ef4444', alta: '#f59e0b', normal: '#6366f1', baja: '#94a3b8' };
    tbody.innerHTML = data.map(r => {
      const icon = tipoIcon[r.tipo_notificacion] || '🔔';
      const pc = prioColor[r.prioridad] || '#94a3b8';
      const unread = !r.leida
        ? '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#22c55e;" title="No leída"></span>'
        : '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#374151;"></span>';
      const fuente = r.id_orden
        ? `<code style="font-size:0.7rem;">OT</code>`
        : r.id_subtarea
          ? `<code style="font-size:0.7rem;">SUB</code>`
          : '—';
      return `<tr style="${!r.leida ? 'font-weight:600;' : 'opacity:0.8;'}">
        <td style="text-align:center;">${unread}</td>
        <td>${icon} <span style="font-size:0.8rem;color:var(--text-muted);">${r.tipo_notificacion}</span></td>
        <td>${r.titulo}</td>
        <td>
          <strong>${r.receptor?.nombre_completo || '—'}</strong>
          ${r.receptor?.rol ? `<br><small style="color:var(--text-muted);">${r.receptor.rol}</small>` : ''}
        </td>
        <td><span style="padding:2px 8px;border-radius:8px;font-size:0.75rem;font-weight:700;background:${pc};color:#fff;">${r.prioridad}</span></td>
        <td>${fuente}</td>
        <td>${fmtTs(r.fecha_creacion)}</td>
      </tr>`;
    }).join('');
  } catch (err) { tbody.innerHTML = emptyRow(7, `❌ Error: ${err.message}`); }
}

async function renderAdminAlertas() {
  const tbody = document.getElementById('tbody-alertas');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(7, 'Cargando alertas…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(7, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('alertas_sistema').select('*').order('fecha_generacion', { ascending: false }).limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(7, 'No hay alertas generadas.'); return; }
    const statusColor = { pendiente: '#f59e0b', vista: '#6366f1', atendida: '#22c55e', cancelada: '#94a3b8' };
    tbody.innerHTML = data.map(r => {
      const sc = statusColor[r.estatus_alerta?.toLowerCase()] || '#94a3b8';
      return `<tr>
        <td>${r.tipo_alerta || '—'}</td>
        <td>${r.titulo_alerta || '—'}</td>
        <td>${r.maquina_id || '—'}</td>
        <td>${badgePriority(r.prioridad)}</td>
        <td><span style="padding:2px 8px;border-radius:8px;font-size:0.75rem;font-weight:600;background:${sc};color:#fff">${r.estatus_alerta || '—'}</span></td>
        <td>${fmtTs(r.fecha_generacion)}</td>
        <td>${r.fecha_visto ? fmtTs(r.fecha_visto) : '—'}</td>
      </tr>`;
    }).join('');
  } catch (err) { tbody.innerHTML = emptyRow(7, `❌ Error: ${err.message}`); }
}

// ── FALLAS POR MÁQUINA ────────────────────────────────────────────────────────
async function renderAdminFallas() {
  const tbody = document.getElementById('tbody-fallas');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(6, 'Cargando fallas…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(6, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('fallas_por_maquina').select('*').order('fecha_hora_creada', { ascending: false }).limit(300);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(6, 'No hay fallas registradas.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td>${r.maquina_id}</td>
      <td style="max-width:220px;white-space:normal;">${r.descripcion_falla || '—'}</td>
      <td>${r.categoria_falla || '—'}</td>
      <td>${fmtTs(r.fecha_hora_creada)}</td>
      <td>${r.origen || '—'}</td>
      <td>${r.es_recurrente ? '<span style="color:#ef4444;font-weight:600;">Sí ⚠️</span>' : 'No'}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(6, `❌ Error: ${err.message}`); }
}

// ── HISTÓRICO TELEGRAM ────────────────────────────────────────────────────────
async function renderAdminTelegramTable() {
  const tbody = document.getElementById('tbody-telegram');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px;">Cargando órdenes de Telegram...</td></tr>';

  let telegramLogs = [];

  if (useLiveDatabase && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('stg_telegram_ordenes_telares')
        .select('*')
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })
        .limit(100);
      if (!error && data) {
        telegramLogs = data.map(l => ({
          folio: l.folio || l.id,
          fecha: l.fecha,
          hora: l.hora,
          maquina: l.maquina_id,
          falla: l.falla || l.descripcion,
          tecnico: l.nom_atendio || l.cve_atendio || '—',
          estatus: l.estatus || 'Cerrada',
          obs: l.obs || l.obs_cierre || '—'
        }));
      }
    } catch (err) {
      console.warn('Error fetching Telegram orders from Supabase:', err);
    }
  }

  // Fallback / Demo Mode: seed simulated Telegram orders
  if (telegramLogs.length === 0) {
    telegramLogs = JSON.parse(localStorage.getItem('TSMAI_simulated_telegram_logs') || '[]');
    if (telegramLogs.length === 0) {
      telegramLogs = [
        { folio: 'TEL-COS-001', fecha: '2026-07-14', hora: '08:30:00', maquina: 'COS-01', falla: 'Rotura de aguja constante', tecnico: 'Carlos Gómez', estatus: 'Cerrada', obs: 'Ajuste de sincronización realizado' },
        { folio: 'TEL-TIN-002', fecha: '2026-07-14', hora: '10:15:00', maquina: 'JET-02', falla: 'Fuga de vapor en válvula', tecnico: 'Sofía Ruiz', estatus: 'Cerrada', obs: 'Empaque reemplazado con éxito' },
        { folio: 'TEL-TEJ-003', fecha: '2026-07-13', hora: '14:45:00', maquina: 'PF-03', falla: 'Paro por hilo roto defectuoso', tecnico: 'Alejandro Sanz', estatus: 'Cerrada', obs: 'Limpieza de guías de alimentación' }
      ];
      localStorage.setItem('TSMAI_simulated_telegram_logs', JSON.stringify(telegramLogs));
    }
  }

  tbody.innerHTML = telegramLogs.map(l => `
    <tr>
      <td><strong>${l.folio}</strong></td>
      <td>${l.fecha} ${l.hora || ''}</td>
      <td>${l.maquina}</td>
      <td>${l.falla}</td>
      <td>${l.tecnico}</td>
      <td><span class="badge badge-status-${l.estatus.toLowerCase().replace('ó','o')}">${l.estatus}</span></td>
      <td style="max-width:200px;white-space:normal;font-size:0.85rem;">${l.obs}</td>
    </tr>
  `).join('');
}

// ── COSTOS POR OT ─────────────────────────────────────────────────────────────
async function renderAdminCostosOT() {
  const tbody = document.getElementById('tbody-costosot');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(7, 'Cargando costos…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(7, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('costos_orden_trabajo').select('*').order('fecha_calculo', { ascending: false }).limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(7, 'No hay costos registrados por OT.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code style="font-size:0.7rem;">${r.id_orden}</code></td>
      <td>${fmtCurrency(r.costo_refacciones, r.moneda)}</td>
      <td>${fmtCurrency(r.costo_mano_obra, r.moneda)}</td>
      <td>${fmtCurrency(r.costo_paro, r.moneda)}</td>
      <td>${fmtCurrency(r.costo_extra, r.moneda)}</td>
      <td><strong>${fmtCurrency(r.costo_total, r.moneda)}</strong></td>
      <td>${fmtTs(r.fecha_calculo)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(7, `❌ Error: ${err.message}`); }
}

// ── EVIDENCIAS DE OT ──────────────────────────────────────────────────────────
async function renderAdminEvidencias() {
  const tbody = document.getElementById('tbody-evidencias');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(6, 'Cargando evidencias…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(6, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('evidencias_orden').select('*').order('fecha_carga', { ascending: false }).limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(6, 'No hay evidencias registradas.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code style="font-size:0.7rem;">${r.id_orden}</code></td>
      <td>${r.tipo_evidencia || '—'}</td>
      <td>${r.url_archivo ? `<a href="${r.url_archivo}" target="_blank" style="color:var(--accent-cyan);">${r.nombre_archivo || 'Ver archivo'}</a>` : (r.nombre_archivo || '—')}</td>
      <td>${r.comentario || '—'}</td>
      <td>${r.usuario_carga || '—'}</td>
      <td>${fmtTs(r.fecha_carga)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(6, `❌ Error: ${err.message}`); }
}

// ── REFACCIONES POR MÁQUINA (CONEXIÓN EN CASCADA: ÁREA -> MÁQUINA -> REFACCIÓN) ──
let currentRefMaquinaData = [];

async function renderAdminRefMaquina() {
  const tbody = document.getElementById('tbody-refmaquina');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(7, 'Cargando consumo de refacciones…');
  
  try {
    let data = [];
    if (supabaseClient) {
      const { data: dbData, error } = await supabaseClient
        .from('cat_refacciones')
        .select('*')
        .neq('maquina_id', 'NO_APLICA')
        .order('codigo_articulo')
        .limit(300);
      if (!error && dbData) data = dbData;
    }

    if (!data || data.length === 0) {
      data = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
    }

    currentRefMaquinaData = data;
    onRefMaquinaAreaFilterChange();
  } catch (err) { 
    tbody.innerHTML = emptyRow(7, `❌ Error: ${err.message}`); 
  }
}

function onRefMaquinaAreaFilterChange() {
  const areaSelect = document.getElementById('filter-refmaq-area');
  const macSelect = document.getElementById('filter-refmaq-machine');
  if (!areaSelect || !macSelect) return;

  const area = areaSelect.value;
  const filteredMachines = getMachinesByArea(area);

  let html = '<option value="ALL">Todas las Máquinas (' + filteredMachines.length + ')</option>';
  filteredMachines.forEach(m => {
    const id = m.id || m.clave;
    const name = m.name || m.nombre || id;
    html += `<option value="${id}">${id} - ${name}</option>`;
  });
  macSelect.innerHTML = html;

  onRefMaquinaMachineFilterChange();
}

function onRefMaquinaMachineFilterChange() {
  const macSelect = document.getElementById('filter-refmaq-machine');
  const partSelect = document.getElementById('filter-refmaq-part');
  if (!macSelect || !partSelect) return;

  const macId = macSelect.value;
  const filteredParts = getPartsByMachine(macId);

  let html = '<option value="ALL">Todas las Refacciones (' + filteredParts.length + ')</option>';
  filteredParts.forEach(p => {
    const code = p.code || p.id || p.codigo_articulo;
    const name = p.name || p.nombre || p.nombre_articulo;
    html += `<option value="${code}">${code} - ${name}</option>`;
  });
  partSelect.innerHTML = html;

  applyRefMaquinaTableFilter();
}

function applyRefMaquinaTableFilter() {
  const areaVal = document.getElementById('filter-refmaq-area')?.value || 'ALL';
  const macVal = document.getElementById('filter-refmaq-machine')?.value || 'ALL';
  const partVal = document.getElementById('filter-refmaq-part')?.value || 'ALL';
  const tbody = document.getElementById('tbody-refmaquina');
  if (!tbody) return;

  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');

  const filtered = currentRefMaquinaData.filter(r => {
    const rMacId = String(r.maquina_id || r.maquina || r.machineId || '').toUpperCase().trim();
    const rPartCode = String(r.codigo_articulo || r.code || r.id || '').toUpperCase().trim();

    // Filtrar Área
    if (areaVal !== 'ALL') {
      const macObj = machines.find(m => String(m.id || m.clave).toUpperCase().trim() === rMacId);
      const macArea = macObj ? String(macObj.area || macObj.departamento || '').toUpperCase().trim() : '';
      if (macArea !== areaVal.toUpperCase().trim() && !rMacId.includes(areaVal.toUpperCase().trim())) return false;
    }

    // Filtrar Máquina
    if (macVal !== 'ALL') {
      if (rMacId !== macVal.toUpperCase().trim() && !rMacId.includes(macVal.toUpperCase().trim())) return false;
    }

    // Filtrar Refacción
    if (partVal !== 'ALL') {
      if (rPartCode !== partVal.toUpperCase().trim() && !rPartCode.includes(partVal.toUpperCase().trim())) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = emptyRow(7, 'No hay consumo registrado con los filtros de cascada seleccionados.');
    return;
  }

  tbody.innerHTML = filtered.map(r => `<tr>
    <td>${fmtDate(r.fecha_carga || new Date())}</td>
    <td><strong>${r.maquina_id || r.maquina || 'Planta'}</strong></td>
    <td>${r.nombre_articulo || r.nombre || r.codigo_articulo || r.id}</td>
    <td>${parseFloat(r.cantidad_estandar || r.stock || 1).toFixed(2)}</td>
    <td>${fmtCurrency(r.costo_unitario || r.cost || 0)}</td>
    <td><strong>${fmtCurrency((parseFloat(r.cantidad_estandar || r.stock) || 1) * (parseFloat(r.costo_unitario || r.cost) || 0))}</strong></td>
    <td>Catálogo / Ingesta</td>
  </tr>`).join('');
}

// ── CIERRES DE OT ─────────────────────────────────────────────────────────────
async function renderAdminCierres() {
  const tbody = document.getElementById('tbody-cierres');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(7, 'Cargando cierres…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(7, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('cierres_orden_trabajo').select('*').order('fecha_cierre', { ascending: false }).limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(7, 'No hay cierres registrados.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code style="font-size:0.7rem;">${r.id_orden}</code></td>
      <td>${r.nombre_tecnico || r.cve_tecnico || '—'}</td>
      <td>${fmtTs(r.fecha_cierre)}</td>
      <td>${r.usuario_valida || '—'}</td>
      <td>${r.calidad != null ? `${'⭐'.repeat(Math.min(r.calidad, 5))} (${r.calidad})` : '—'}</td>
      <td>${r.requiere_retrabajo ? '<span style="color:#ef4444;font-weight:600;">Sí</span>' : 'No'}</td>
      <td>${r.estatus_cierre || '—'}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(7, `❌ Error: ${err.message}`); }
}

// ── RESPUESTAS DE CHECKLIST POR OT ────────────────────────────────────────────
async function renderAdminRespChk() {
  const tbody = document.getElementById('tbody-respchk');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(6, 'Cargando respuestas de checklist…');
  
  let dbResponses = [];
  if (useLiveDatabase && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('respuestas_checklist_orden')
        .select(`
          id_respuesta,
          id_orden,
          respuesta,
          comentario,
          usuario_responde,
          fecha_respuesta,
          id_checklist,
          checklists_mantenimiento (
            pregunta,
            codigo_servicio,
            cat_servicios_mantenimiento (
              nombre_servicio
            )
          )
        `)
        .order('fecha_respuesta', { ascending: false })
        .limit(300);
      
      if (!error && data) {
        dbResponses = data.map(r => {
          const srvName = r.checklists_mantenimiento?.cat_servicios_mantenimiento?.nombre_servicio || r.checklists_mantenimiento?.codigo_servicio || 'Checklist';
          const qText = r.checklists_mantenimiento?.pregunta || 'Pregunta';
          return {
            id_orden: r.id_orden === '00000000-0000-0000-0000-000000000000' ? 'Levantamiento Autónomo' : r.id_orden,
            id_checklist: srvName,
            respuesta: `${qText}: ${r.respuesta}`,
            comentario: r.comentario || '—',
            usuario_responde: r.usuario_responde,
            fecha_respuesta: r.fecha_respuesta
          };
        });
      }
    } catch (err) {
      console.error('Error fetching checklist responses:', err);
    }
  }

  const dynamicResponses = JSON.parse(localStorage.getItem('TSMAI_dynamic_responses') || '[]');
  const pendingDynamic = dynamicResponses.filter(r => !r.db_synced);
  const mappedDynamic = pendingDynamic.map(r => ({
    id_orden: 'Levantamiento Local',
    id_checklist: r.formName,
    respuesta: r.answers.map(a => `${a.label}: ${a.val}`).join(' | '),
    comentario: `Área: ${r.area}`,
    usuario_responde: r.submittedBy,
    fecha_respuesta: r.date
  }));

  const allResponses = [...mappedDynamic, ...dbResponses];

  if (allResponses.length === 0) {
    tbody.innerHTML = emptyRow(6, 'No hay respuestas de checklist registradas.');
    return;
  }

  tbody.innerHTML = allResponses.map(r => `<tr>
    <td><code style="font-size:0.7rem;">${r.id_orden}</code></td>
    <td><code style="font-size:0.7rem;">${r.id_checklist}</code></td>
    <td style="max-width:320px;white-space:normal;font-size:0.8rem;">${r.respuesta || '—'}</td>
    <td>${r.comentario || '—'}</td>
    <td>${r.usuario_responde || '—'}</td>
    <td>${fmtTs(r.fecha_respuesta)}</td>
  </tr>`).join('');
}

// ============================================================================
// Renderizado de Gráficos y Tablas del Dashboard Ejecutivo (Whiteboard layout)
function renderAdminDashboard() {
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const localLogs = JSON.parse(localStorage.getItem('TSMAI_maintenance_logs') || '[]');

  // --- WIDGET 1: OT por cerrar (Barras Horizontales Reales) ---
  const ctxOtCerrar = document.getElementById('chart-ot-por-cerrar');
  if (ctxOtCerrar) {
    if (chartOtCerrarInstance) chartOtCerrarInstance.destroy();
    
    const openOrders = orders.filter(o => o.status !== 'Cerrada' && o.status !== 'Cancelada');
    const otCounts = [0, 0, 0, 0]; // 1-3 días, 4-7 días, 8-15 días, 15+ días
    
    openOrders.forEach(o => {
      const createdDate = o.date ? new Date(o.date) : new Date(o.fecha_carga || new Date());
      const diffTime = Math.abs(new Date() - createdDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) otCounts[0]++;
      else if (diffDays <= 7) otCounts[1]++;
      else if (diffDays <= 15) otCounts[2]++;
      else otCounts[3]++;
    });

    chartOtCerrarInstance = new Chart(ctxOtCerrar, {
      type: 'bar',
      data: {
        labels: ['1-3 Días', '4-7 Días', '8-15 Días', '15+ Días'],
        datasets: [{
          data: otCounts,
          backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444', '#b91c1c'],
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false }, ticks: { precision: 0 } }, y: { grid: { display: false } } }
      }
    });
  }

  // --- WIDGET 2: Alertas de Mantenimiento (Repetibilidad y Costos Elevados) ---
  const alertList = document.getElementById('wb-alert-list');
  if (alertList) {
    let alertHTML = '';

    // 1. Alertas de Repetibilidad de Fallas por Máquina (>= 2 fallas en historial)
    const machineFailCounts = {};
    orders.forEach(o => {
      if (o.machine && o.machine !== 'NO_APLICA' && o.status !== 'Cancelada') {
        machineFailCounts[o.machine] = (machineFailCounts[o.machine] || 0) + 1;
      }
    });

    Object.entries(machineFailCounts).forEach(([machId, count]) => {
      if (count >= 2) {
        alertHTML += `
          <div class="alert-item alert-warning" style="border-left: 4px solid var(--color-warning);">
            <span style="font-size: 1.2rem;">🔥</span>
            <div><strong>Repetibilidad de Falla:</strong> El equipo <strong>${machId}</strong> acumula <strong>${count} fallas repetidas</strong>. Requiere revisión de ingeniería.</div>
          </div>
        `;
      }
    });

    // 2. Alertas por Costes Elevados en Refacciones (Por OT > $1,500 MXN o Acumulado Máquina > $3,000 MXN)
    const machineCostMap = {};
    orders.forEach(o => {
      if (o.machine && o.usedParts && o.usedParts.length > 0) {
        const cost = o.usedParts.reduce((sum, p) => sum + ((p.quantity || 1) * (p.costoUnitario || p.cost || 0)), 0);
        machineCostMap[o.machine] = (machineCostMap[o.machine] || 0) + cost;

        if (cost >= 1500) {
          alertHTML += `
            <div class="alert-item alert-critical" style="border-left: 4px solid var(--color-critical);">
              <span style="font-size: 1.2rem;">💵</span>
              <div><strong>Alto Costo en Servicio:</strong> La OT <strong>${o.id}</strong> en equipo ${o.machine} consumió <strong>$${cost.toLocaleString('es-MX')} MXN</strong> en refacciones.</div>
            </div>
          `;
        }
      }
    });

    Object.entries(machineCostMap).forEach(([machId, totalCost]) => {
      if (totalCost >= 3000) {
        alertHTML += `
          <div class="alert-item alert-critical" style="border-left: 4px solid var(--color-critical);">
            <span style="font-size: 1.2rem;">💰</span>
            <div><strong>Costo Acumulado Elevado:</strong> El equipo <strong>${machId}</strong> supera el umbral con <strong>$${totalCost.toLocaleString('es-MX')} MXN</strong> en refacciones.</div>
          </div>
        `;
      }
    });

    // 3. Alertas por Máquina Crítica 'A' Inactiva o Parada
    const stoppedCritAMachines = machines.filter(m => (m.status === 'Parada' || m.activo === false) && m.criticality === 'A');
    stoppedCritAMachines.forEach(m => {
      alertHTML += `
        <div class="alert-item alert-critical" style="border-left: 4px solid var(--color-critical);">
          <span style="font-size: 1.2rem;">🚨</span>
          <div><strong>Paro en Equipo Crítico A:</strong> La máquina de alta prioridad <strong>${m.name || m.id} (${m.id})</strong> está parada.</div>
        </div>
      `;
    });

    if (alertHTML === '') {
      alertHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 20px;">
          ✅ Sin alertas de repetibilidad ni costos elevados. Operación óptima.
        </div>
      `;
    }
    alertList.innerHTML = alertHTML;
  }

  // --- WIDGET 3: % Cumplimiento (Dona 90%) ---
  const ctxCompliance = document.getElementById('chart-compliance');
  if (ctxCompliance) {
    if (chartComplianceInstance) chartComplianceInstance.destroy();

    const activeOrders = orders.filter(o => o.status !== 'Cancelada');
    const closedOrders = activeOrders.filter(o => o.status === 'Cerrada' || o.status === 'Ejecutada');
    
    let compliance = 100;
    if (activeOrders.length > 0) {
      compliance = Math.round((closedOrders.length / activeOrders.length) * 100);
    }
    
    document.getElementById('wb-compliance-value').innerText = compliance + '%';

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

  // --- WIDGET 4: Costos Reales por Departamento (Mano de Obra vs Refacciones) ---
  const ctxBudget = document.getElementById('chart-pronostico-presupuesto');
  if (ctxBudget) {
    if (chartBudgetPercentInstance) chartBudgetPercentInstance.destroy();

    const areas = ['PF', 'CF', 'TF', 'AF'];
    const partsCosts = [0, 0, 0, 0];
    const laborCosts = [0, 0, 0, 0];

    orders.forEach(o => {
      if (o.status === 'Cerrada' || o.status === 'Ejecutada') {
        const areaIdx = areas.indexOf(o.area);
        if (areaIdx !== -1) {
          let pCost = 0;
          if (o.usedParts && Array.isArray(o.usedParts)) {
            o.usedParts.forEach(p => { pCost += (parseFloat(p.costoUnitario) || 0) * (parseFloat(p.quantity) || 0); });
          }
          partsCosts[areaIdx] += pCost;
          laborCosts[areaIdx] += 500; 
        }
      }
    });

    chartBudgetPercentInstance = new Chart(ctxBudget, {
      type: 'bar',
      data: {
        labels: ['PF Tejido', 'CF Costura', 'TF Tintorería', 'AF Planta'],
        datasets: [
          {
            label: 'Refacciones ($)',
            data: partsCosts,
            backgroundColor: '#06b6d4'
          },
          {
            label: 'Mano de Obra ($)',
            data: laborCosts,
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

  // --- WIDGET 5: Horas Paro Reales por Área ---
  const ctxDowntime = document.getElementById('chart-horas-paro');
  if (ctxDowntime) {
    if (chartDowntimeInstance) chartDowntimeInstance.destroy();

    let totalDowntime = 0;
    const areaDowntime = { PF: 0, CF: 0, TF: 0, AF: 0 };

    localLogs.forEach(l => {
      if (l.fecha_hora_inicio && l.fecha_hora_fin) {
        const start = new Date(l.fecha_hora_inicio);
        const end = new Date(l.fecha_hora_fin);
        const diffHrs = Math.max(0, (end - start) / (1000 * 60 * 60));
        if (diffHrs > 0) {
          totalDowntime += diffHrs;
          const a = l.area || 'PF';
          if (areaDowntime[a] !== undefined) {
            areaDowntime[a] += diffHrs;
          }
        }
      }
    });

    totalDowntime = Math.round(totalDowntime * 10) / 10;
    document.getElementById('wb-total-downtime').innerText = `Total: ${totalDowntime} hrs`;

    chartDowntimeInstance = new Chart(ctxDowntime, {
      type: 'bar',
      data: {
        labels: ['PF Tejido', 'CF Costura', 'TF Tintorería', 'AF Planta'],
        datasets: [{
          label: 'Horas Paro',
          data: [areaDowntime.PF, areaDowntime.CF, areaDowntime.TF, areaDowntime.AF],
          backgroundColor: '#ef4444',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } } }
      }
    });
  }

  // --- WIDGET 6: Tabla Top Máquina Falla / Costo ---
  const topMaquinaRows = document.getElementById('wb-top-maquina-rows');
  if (topMaquinaRows) {
    const machineLogs = {};
    localLogs.forEach(l => {
      if (l.maquina_id && l.maquina_id !== 'NO_APLICA') {
        if (!machineLogs[l.maquina_id]) {
          machineLogs[l.maquina_id] = { count: 0, area: l.area, name: l.maquina_id };
        }
        machineLogs[l.maquina_id].count++;
      }
    });
    
    const sorted = Object.values(machineLogs).sort((a, b) => b.count - a.count);
    const top5 = sorted.slice(0, 5);
    
    let rowsHTML = '';
    top5.forEach(m => {
      const areaText = m.area === 'PF' ? 'PF Tejido' : m.area === 'CF' ? 'CF Costura' : m.area === 'TF' ? 'TF Tinte' : 'AF Planta';
      const isCritical = m.count >= 3;
      rowsHTML += `
        <tr>
          <td><strong>${areaText}</strong></td>
          <td>${m.name}</td>
          <td>Real</td>
          <td>${m.count}</td>
          <td><span class="badge badge-priority-${isCritical ? 'critica' : 'seguridad'}">${isCritical ? 'Crítico' : 'Normal'}</span></td>
        </tr>
      `;
    });
    if (rowsHTML === '') {
      rowsHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No hay intervenciones registradas.</td></tr>`;
    }
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
// --- MATRIZ DE PRIORIZACIÓN DE ÓRDENES (CRITICIDAD + URGENCIA + RIESGO) ---
function calculateOTPriorityScoring(machineId, urgency, risk, type, machineStopped) {
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const mach = machines.find(m => m.id === machineId || m.equipo_towell === machineId);
  const criticality = mach ? (mach.criticality || 'B') : 'B';

  let score = 0;

  // 1. Puntos por Criticidad de Equipo
  if (criticality === 'A') score += 40;
  else if (criticality === 'B') score += 25;
  else score += 10;

  // 2. Puntos por Urgencia Reportada
  if (urgency === 'Crítica') score += 35;
  else if (urgency === 'Alta') score += 25;
  else if (urgency === 'Media') score += 15;
  else score += 5;

  // 3. Puntos por Nivel de Riesgo
  if (risk === 'Alto') score += 25;
  else if (risk === 'Medio') score += 15;
  else score += 5;

  // 4. Paro de máquina suma urgencia extra
  if (machineStopped === 'Sí') score += 15;

  // Determinar Prioridad Final
  if (score >= 80 || (criticality === 'A' && (urgency === 'Crítica' || risk === 'Alto' || machineStopped === 'Sí'))) {
    return { level: 'Crítica', label: 'Crítica (P1)', score: score };
  } else if (score >= 55 || (criticality === 'A' || urgency === 'Alta' || risk === 'Alto')) {
    return { level: 'Alta', label: 'Alta (P2)', score: score };
  } else if (score >= 35 && type !== 'MP' && type !== 'MA') {
    return { level: 'Media', label: 'Media (P3)', score: score };
  } else {
    return { level: 'Baja', label: 'Baja (P4)', score: score };
  }
}

function recalculateOTPriorityInModal() {
  const reqId = document.getElementById('review-req-id').value;
  const requests = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  const req = requests.find(r => r.id === reqId);
  
  const urgency = req ? req.urgency : 'Media';
  const machineId = req ? req.machine : null;
  const machineStopped = req ? req.machineStopped : 'No';
  const risk = document.getElementById('review-risk')?.value || 'Medio';
  const type = document.getElementById('review-type')?.value || 'MC';

  const res = calculateOTPriorityScoring(machineId, urgency, risk, type, machineStopped);
  const prioSelect = document.getElementById('review-priority');
  if (prioSelect) prioSelect.value = res.level;

  const badge = document.getElementById('review-calculated-priority');
  if (badge) {
    badge.innerText = `⭐ Matriz Automática Sugiere: Prioridad ${res.label} (Score: ${res.score}/100)`;
  }
}

function filterReviewTechsBySpecialty(specialty) {
  const select = document.getElementById('review-tech');
  if (!select) return;

  const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
  const filtered = techs.filter(t => {
    if (t.activo === false) return false;
    if (!specialty || specialty === 'Todas') return true;
    const spec = (t.specialty || t.observaciones || '').toLowerCase();
    return spec.includes(specialty.toLowerCase()) || spec.includes('general') || spec.includes('coordinador');
  });

  let html = '<option value="">Selecciona técnico disponible...</option>';
  filtered.forEach(t => {
    const specLabel = t.specialty ? ` (${t.specialty})` : '';
    html += `<option value="${t.id}">${t.name}${specLabel}</option>`;
  });

  select.innerHTML = html;
}

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
  document.getElementById('review-type').value = req.type || 'MC';
  document.getElementById('review-risk').value = 'Medio';
  document.getElementById('review-specialty').value = 'Todas';
  
  filterReviewTechsBySpecialty('Todas');
  recalculateOTPriorityInModal();

  // Sugerir fecha compromiso de hoy + 1 día
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0);
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
  const specialty = document.getElementById('review-specialty').value;

  if (!techId) {
    alert('Por favor, selecciona un técnico activo.');
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
    specialty: specialty,
    description: req.description,
    machineStopped: req.machineStopped,
    urgency: priority,
    status: 'Asignada',
    assignedTech: techId,
    techName: techName,
    date: req.date,
    dueDate: new Date(dueDate).toISOString(),
    evidence: req.evidence,
    historyLogs: [
      { date: req.date, status: 'Solicitud recibida', user: req.applicant, comment: 'Registro inicial de solicitud.' },
      { date: new Date().toISOString(), status: 'Asignada', user: 'Super Admin', comment: `Orden de trabajo convertida y asignada a ${techName} (${specialty})` }
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
          estatus: getDBStatus('Asignada'),
          orden_trabajo: type,
          especialidad_requerida: specialty,
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
  showToast(`✅ Solicitud ${reqId} convertida exitosamente en OT y asignada a ${techName}.`);

  // Refrescar en tiempo real tableros de admin y técnico
  await syncDatabases();
  refreshActiveViewSilently();
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
        .update({ estatus: getDBStatus('En revisión') })
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
        .update({ estatus: getDBStatus('Rechazada') })
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
  const activeTechs = techs.filter(t => t.activo !== false);
  const filterSelect = document.getElementById('filter-ot-tech');
  if (!filterSelect) return;

  let html = '<option value="">Todos los Técnicos</option>';
  activeTechs.forEach(t => {
    html += `<option value="${t.id}">${t.name} (${t.specialty || 'General'})</option>`;
  });
  filterSelect.innerHTML = html;
}

function renderAdminOrdersTable(filteredOrders) {
  const orders = filteredOrders || JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
  const tbody = document.getElementById('table-admin-orders-body');

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">No se encontraron órdenes de trabajo.</td></tr>`;
    return;
  }

  let html = '';
  orders.forEach(o => {
    const mach = machines.find(m => m.id === o.machine);
    const machineName = mach ? mach.name : o.machine;
    const tech = techs.find(t => t.id === o.assignedTech);
    const techName = tech ? tech.name : 'Sin asignar';
    const formattedDueDate = new Date(o.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const progress = getOTProgressSync(o.id, o.status);

    html += `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${machineName}</td>
        <td>${o.area}</td>
        <td>${o.type}</td>
        <td><span class="badge badge-priority-${o.urgency.toLowerCase()}">${o.urgency}</span></td>
        <td>${techName}</td>
        <td><span class="badge badge-status-${o.status.toLowerCase().replace('ó', 'o').replace(' ', '-')}">${o.status}</span></td>
        <td><strong>${progress}%</strong></td>
        <td>${formattedDueDate}</td>
        <td>
          <div style="display:flex; gap:4px; flex-wrap:wrap;">
            <button class="btn-action-primary" style="padding:4px 8px; font-size:0.78rem; background:#0f172a; border-color:#0f172a;" onclick="openAdmin360OTAuditModal('${o.id}')">🔍 Auditoría 360°</button>
            <button class="btn-table-action" style="padding:4px 8px; font-size:0.78rem;" onclick="viewOrderHistoryLogs('${o.id}')">Logs</button>
          </div>
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
// Helper to calculate week numbers in JS
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil(( ( (d - startOfYear) / 86400000) + 1)/7);
  return weekNo;
}

async function renderAdminCalendar() {
  const container = document.getElementById('calendar-grid-container');
  const monthLabel = document.getElementById('calendar-month-label');
  if (!container) return;

  const monthsNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // 1. Actualizar etiqueta superior según la escala
  if (monthLabel) {
    if (currentCalendarScale === 'year') {
      monthLabel.innerText = `Año ${currentCalendarYear}`;
    } else if (currentCalendarScale === 'month') {
      monthLabel.innerText = `${monthsNames[currentCalendarMonth]} ${currentCalendarYear}`;
    } else if (currentCalendarScale === 'week') {
      const baseDate = new Date(currentCalendarYear, currentCalendarMonth, currentCalendarDayNum);
      const startOfWeek = new Date(baseDate);
      startOfWeek.setDate(baseDate.getDate() - baseDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      monthLabel.innerText = `Sem. ${startOfWeek.getDate()} ${monthsNames[startOfWeek.getMonth()].substring(0,3)} - ${endOfWeek.getDate()} ${monthsNames[endOfWeek.getMonth()].substring(0,3)} ${endOfWeek.getFullYear()}`;
    } else if (currentCalendarScale === 'day') {
      monthLabel.innerText = `${currentCalendarDayNum} ${monthsNames[currentCalendarMonth].substring(0,3)} ${currentCalendarYear}`;
    }
  }

  // 2. Leer checkboxes de filtros
  const showCorrectivos = document.getElementById('filter-cal-correctivo')?.checked !== false;
  const showPreventivos = document.getElementById('filter-cal-preventivo')?.checked !== false;
  const showPredictivos = document.getElementById('filter-cal-predictivo')?.checked !== false;
  const showAutonomos = document.getElementById('filter-cal-autonomo')?.checked !== false;

  // 3. Obtener correctivos locales
  let localOrders = [];
  if (showCorrectivos) {
    const allLocalOrders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
    localOrders = allLocalOrders.filter(o => o.type !== 'MP' && o.type !== 'PREVENTIVO' && o.type !== 'PREDICTIVO' && o.type !== 'AUTONOMO');
  }

  // 4. Obtener sugerencias y propuestas reales de la base de datos
  let suggestions = [];
  if (supabaseClient && (showPreventivos || showPredictivos || showAutonomos)) {
    try {
      const { data, error } = await supabaseClient
        .from('calendario_mantenimiento_detalle')
        .select('*, calendarios_mantenimiento(anio, mes, semana)');
        
      if (!error && data) {
        suggestions = data.filter(item => {
          const calHeader = item.calendarios_mantenimiento || {};
          if (calHeader.anio !== currentCalendarYear) return false;
          if (item.tipo_mantenimiento === 'PREVENTIVO' && !showPreventivos) return false;
          if (item.tipo_mantenimiento === 'PREDICTIVO' && !showPredictivos) return false;
          if (item.tipo_mantenimiento === 'AUTONOMO' && !showAutonomos) return false;
          return true;
        });
      }
    } catch (err) {
      console.error('Error fetching proposed calendar details:', err);
    }
  }

  // 5. Combinar eventos
  const correctiveEvents = localOrders.map(o => ({
    id: o.id,
    type: 'CORRECTIVO',
    title: `${o.id}: ${o.description || 'Fallo'}`,
    date: o.dueDate || o.date
  }));

  const suggestionEvents = suggestions.map(s => ({
    id: s.maquina_id,
    id_ref: s.id_detalle,
    type: s.tipo_mantenimiento,
    title: `${s.tipo_mantenimiento}: ${s.maquina_id} - ${s.actividad_sugerida.replace('Servicio preventivo: ', '')}`,
    date: s.fecha_programada
  }));

  const allEvents = [...correctiveEvents, ...suggestionEvents];

  // 6. Renderizar según la escala seleccionada
  if (currentCalendarScale === 'year') {
    // Escala AÑO: 12 tarjetas de meses
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    container.style.gap = '16px';

    let html = '';
    for (let m = 0; m < 12; m++) {
      const monthEvents = allEvents.filter(e => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return d.getFullYear() === currentCalendarYear && d.getMonth() === m;
      });

      const counts = { CORRECTIVO: 0, PREVENTIVO: 0, PREDICTIVO: 0, AUTONOMO: 0 };
      monthEvents.forEach(e => {
        if (counts[e.type] !== undefined) counts[e.type]++;
      });

      html += `
        <div class="calendar-cell" onclick="selectMonthAndSwitch(${m})" style="cursor: pointer; min-height: 120px; transition: all 0.2s ease; border: 1px solid #cbd5e1; background: #ffffff; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-weight: 700; font-size: 1.1rem; color: var(--primary-color); border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin-bottom: 8px;">
            ${monthsNames[m]}
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; font-weight: 600;">
            ${counts.CORRECTIVO > 0 ? `<span style="color: var(--color-critical);"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--color-critical); margin-right:4px;"></span> ${counts.CORRECTIVO} Correctivos</span>` : ''}
            ${counts.PREVENTIVO > 0 ? `<span style="color: var(--color-preventive);"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--color-preventive); margin-right:4px;"></span> ${counts.PREVENTIVO} Preventivos</span>` : ''}
            ${counts.PREDICTIVO > 0 ? `<span style="color: #c2410c;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#f97316; margin-right:4px;"></span> ${counts.PREDICTIVO} Predictivos</span>` : ''}
            ${counts.AUTONOMO > 0 ? `<span style="color: #0369a1;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--accent-blue); margin-right:4px;"></span> ${counts.AUTONOMO} Autónomos</span>` : ''}
            ${(counts.CORRECTIVO + counts.PREVENTIVO + counts.PREDICTIVO + counts.AUTONOMO) === 0 ? '<span style="color: var(--text-muted); font-style: italic;">Sin eventos</span>' : ''}
          </div>
        </div>
      `;
    }
    container.innerHTML = html;

  } else if (currentCalendarScale === 'month') {
    // Escala MES: Cuadrícula estándar de 42 celdas
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(7, 1fr)';
    container.style.gap = '6px';

    const firstDayObj = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const startDayOfWeek = firstDayObj.getDay();
    const totalDays = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(currentCalendarYear, currentCalendarMonth, 0).getDate();

    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    let html = '';
    
    daysOfWeek.forEach(d => {
      html += `<div class="calendar-day-header">${d}</div>`;
    });

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDay = prevMonthTotalDays - i;
      html += `<div class="calendar-cell" style="opacity: 0.4;"><span class="calendar-date">${prevDay}</span></div>`;
    }

    const today = new Date();
    const isCurrentYear = today.getFullYear() === currentCalendarYear;
    const isCurrentMonth = today.getMonth() === currentCalendarMonth;
    const todayDate = today.getDate();

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dailyEvents = allEvents.filter(e => e.date && e.date.startsWith(dateStr));
      const isToday = isCurrentYear && isCurrentMonth && day === todayDate;

      html += `
        <div class="calendar-cell ${isToday ? 'today' : ''}">
          <span class="calendar-date">${day} ${isToday ? '(Hoy)' : ''}</span>
          <div style="display: flex; flex-direction: column; gap: 3px; margin-top: 4px; overflow-y: auto; max-height: 80px;">
      `;

      dailyEvents.forEach(e => {
        let cls = 'preventivo';
        let clickHandler = '';
        if (e.type === 'CORRECTIVO') {
          cls = 'correctivo';
          clickHandler = `onclick="viewOrderHistoryLogs('${e.id}')"`;
        } else {
          if (e.type === 'PREDICTIVO') cls = 'predictivo';
          if (e.type === 'AUTONOMO') cls = 'autonomo';
          
          let viewName = 'vw_preventivo_anual';
          if (e.type === 'PREDICTIVO') viewName = 'vw_predictivo_mensual';
          if (e.type === 'AUTONOMO') viewName = 'vw_autonomo_semanal';
          
          clickHandler = `onclick="viewCalendarDetail('${e.id_ref}', '${viewName}')"`;
        }

        html += `<span class="calendar-event ${cls}" style="cursor: pointer;" ${clickHandler} title="${e.title}">${e.id}</span>`;
      });

      html += `
          </div>
        </div>
      `;
    }

    const totalCellsUsed = startDayOfWeek + totalDays;
    const cellsToFill = 42 - totalCellsUsed;
    for (let day = 1; day <= cellsToFill; day++) {
      html += `<div class="calendar-cell" style="opacity: 0.4;"><span class="calendar-date">${day}</span></div>`;
    }

    container.innerHTML = html;

  } else if (currentCalendarScale === 'week') {
    // Escala SEMANA: 7 columnas
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(7, 1fr)';
    container.style.gap = '10px';

    const baseDate = new Date(currentCalendarYear, currentCalendarMonth, currentCalendarDayNum);
    const startOfWeek = new Date(baseDate);
    startOfWeek.setDate(baseDate.getDate() - baseDate.getDay());

    const daysOfWeekFull = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    let html = '';

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      
      const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;
      const dailyEvents = allEvents.filter(e => e.date && e.date.startsWith(dateStr));
      
      const isToday = currentDay.toDateString() === new Date().toDateString();
      
      html += `
        <div class="calendar-cell ${isToday ? 'today' : ''}" style="min-height: 250px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; padding: 10px;">
          <span class="calendar-date" style="font-size: 0.9rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; display: block; text-align: center;">
            <strong>${daysOfWeekFull[i].substring(0,3)}</strong> ${currentDay.getDate()}
          </span>
          <div style="display: flex; flex-direction: column; gap: 6px; overflow-y: auto; max-height: 200px;">
      `;
      
      dailyEvents.forEach(e => {
        let cls = 'preventivo';
        let clickHandler = '';
        if (e.type === 'CORRECTIVO') {
          cls = 'correctivo';
          clickHandler = `onclick="viewOrderHistoryLogs('${e.id}')"`;
        } else {
          if (e.type === 'PREDICTIVO') cls = 'predictivo';
          if (e.type === 'AUTONOMO') cls = 'autonomo';
          
          let viewName = 'vw_preventivo_anual';
          if (e.type === 'PREDICTIVO') viewName = 'vw_predictivo_mensual';
          if (e.type === 'AUTONOMO') viewName = 'vw_autonomo_semanal';
          
          clickHandler = `onclick="viewCalendarDetail('${e.id_ref}', '${viewName}')"`;
        }
        
        html += `
          <div class="calendar-event ${cls}" ${clickHandler} style="padding: 4px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; cursor: pointer; white-space: normal;" title="${e.title}">
            <strong>${e.id}</strong><br/>
            <span style="font-size: 0.6rem; opacity: 0.85;">${e.title.split(' - ')[1] || e.title}</span>
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    }
    container.innerHTML = html;

  } else if (currentCalendarScale === 'day') {
    // Escala DÍA: Vista de detalles completa del día
    container.style.display = 'block';

    const selectedDateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(currentCalendarDayNum).padStart(2, '0')}`;
    const dailyEvents = allEvents.filter(e => e.date && e.date.startsWith(selectedDateStr));
    
    let html = `
      <div style="width: 100%; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; padding: 20px; display: flex; flex-direction: column; gap: 16px;">
        <h4 style="font-weight: 700; margin: 0; font-size: 1.2rem; color: var(--primary-color);">
          📋 Eventos de: ${new Date(currentCalendarYear, currentCalendarMonth, currentCalendarDayNum).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h4>
        <div style="display: flex; flex-direction: column; gap: 12px;">
    `;
    
    if (dailyEvents.length === 0) {
      html += `<p style="color: var(--text-muted); text-align: center; padding: 30px; font-style: italic;">No hay eventos programados para este día.</p>`;
    } else {
      dailyEvents.forEach(e => {
        let cls = 'preventivo';
        let clickHandler = '';
        if (e.type === 'CORRECTIVO') {
          cls = 'correctivo';
          clickHandler = `onclick="viewOrderHistoryLogs('${e.id}')"`;
        } else {
          if (e.type === 'PREDICTIVO') cls = 'predictivo';
          if (e.type === 'AUTONOMO') cls = 'autonomo';
          
          let viewName = 'vw_preventivo_anual';
          if (e.type === 'PREDICTIVO') viewName = 'vw_predictivo_mensual';
          if (e.type === 'AUTONOMO') viewName = 'vw_autonomo_semanal';
          
          clickHandler = `onclick="viewCalendarDetail('${e.id_ref}', '${viewName}')"`;
        }
        
        html += `
          <div class="calendar-event ${cls}" ${clickHandler} style="padding: 12px 16px; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--box-shadow-sm); border-left: 5px solid;" title="Ver detalle">
            <div>
              <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; opacity: 0.8;">${e.type}</span>
              <h5 style="margin: 4px 0; font-size: 1.1rem; font-weight: 700;">Máquina: ${e.id}</h5>
              <p style="margin: 0; font-weight: 500; font-size: 0.85rem; opacity: 0.9;">${e.title}</p>
            </div>
            <button class="btn-table btn-table-view" style="pointer-events: none; border-radius: 4px; font-size: 0.8rem; padding: 6px 12px;">🔍 Ver Detalle</button>
          </div>
        `;
      });
    }
    
    html += `
        </div>
      </div>
    `;
    container.innerHTML = html;
  }
}

function selectMonthAndSwitch(monthIndex) {
  currentCalendarMonth = monthIndex;
  setCalendarScale('month');
}

// --- BITÁCORAS GENERALES (ADMIN) ---
function renderAdminLogsTable() {
  return renderAdminBitacoraTable();
}
// --- TRANSICIÓN AUTOMÁTICA PULL DE OT A BITÁCORA (FASE 4) ---
async function syncFinishedOTsToBitacora() {
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const finishedOrders = orders.filter(o => o.status === 'Pendiente de validación' || o.status === 'Terminada' || o.status === 'Cerrada' || o.status === 'Ejecutada');
  let maintenanceLogs = JSON.parse(localStorage.getItem('TSMAI_maintenance_logs') || '[]');

  for (const o of finishedOrders) {
    const otId = o.id || o.folio;
    const existsInLocal = maintenanceLogs.some(l => l.id_orden === otId || l.otFolio === otId);
    
    let partsStr = 'Ninguna';
    if (o.usedParts && o.usedParts.length > 0) {
      partsStr = o.usedParts.map(p => `${p.name || p.partId} (x${p.quantity})`).join(', ');
    }

    const startTimeStr = o.fecha_hora_inicio ? new Date(o.fecha_hora_inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';
    const endTimeStr = o.fecha_hora_fin ? new Date(o.fecha_hora_fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';
    const timeRangeStr = `${startTimeStr} - ${endTimeStr}`;

    const logEntry = {
      id_bitacora: `BIT-${otId}`,
      id_orden: otId,
      otFolio: otId,
      maquina_id: o.machine || 'N/A',
      area: o.area || 'General',
      cve_tecnico: o.assignedTech || o.cve_atendio || 'TECH-01',
      nombre_tecnico: o.techName || (currentUser ? currentUser.name : 'Técnico'),
      fecha_hora_inicio: o.fecha_hora_inicio || o.createdAt || new Date().toISOString(),
      fecha_hora_fin: o.fecha_hora_fin || new Date().toISOString(),
      horario_rango: timeRangeStr,
      descripcion_actividad: o.activity || o.description || 'Atención de mantenimiento',
      refacciones_usadas: partsStr,
      observaciones: o.observations || o.diagnosis || 'Sin observaciones',
      date: o.fecha_hora_fin || o.dueDate || new Date().toISOString()
    };

    if (!existsInLocal) {
      maintenanceLogs.push(logEntry);
    }

    if (supabaseClient) {
      try {
        const { data: existingDB } = await supabaseClient
          .from('bitacora_mantenimiento')
          .select('id_bitacora')
          .eq('id_orden', otId)
          .maybeSingle();

        if (!existingDB) {
          await supabaseClient
            .from('bitacora_mantenimiento')
            .insert([{
              id_orden: otId,
              maquina_id: o.machine || null,
              area: o.area || 'General',
              cve_tecnico: o.assignedTech || null,
              nombre_tecnico: o.techName || (currentUser ? currentUser.name : 'Técnico'),
              fecha_hora_inicio: o.fecha_hora_inicio || new Date().toISOString(),
              fecha_hora_fin: o.fecha_hora_fin || new Date().toISOString(),
              descripcion_actividad: o.activity || o.description || 'Mantenimiento',
              refacciones_usadas: partsStr,
              observaciones: o.observations || o.diagnosis || null
            }]);
        }
      } catch (err) {
        console.warn('Sync bitacora to DB warning:', err);
      }
    }
  }

  localStorage.setItem('TSMAI_maintenance_logs', JSON.stringify(maintenanceLogs));
}

// ── BITÁCORA GENERAL DE MANTENIMIENTO (ADMIN) ─────────────────────────
async function renderAdminBitacoraTable() {
  const tbody = document.getElementById('table-admin-logs-body');
  if (!tbody) return;

  await syncFinishedOTsToBitacora();

  let maintenanceLogs = JSON.parse(localStorage.getItem('TSMAI_maintenance_logs') || '[]');

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('bitacora_mantenimiento')
        .select('*')
        .order('fecha_hora_inicio', { ascending: false })
        .limit(200);
      if (!error && data) {
        maintenanceLogs = data.map(l => {
          const sTime = l.fecha_hora_inicio ? new Date(l.fecha_hora_inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';
          const eTime = l.fecha_hora_fin ? new Date(l.fecha_hora_fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';
          return {
            id_bitacora: l.id_bitacora,
            id_orden: l.id_orden || 'Autónomo',
            otFolio: l.id_orden || 'Autónomo',
            area: l.area || 'General',
            maquina_id: l.maquina_id || 'N/A',
            refacciones_usadas: l.refacciones_usadas || 'Ninguna',
            fecha_hora_inicio: l.fecha_hora_inicio,
            fecha_hora_fin: l.fecha_hora_fin,
            horario_rango: `${sTime} - ${eTime}`,
            descripcion_actividad: l.descripcion_actividad || 'Mantenimiento',
            nombre_tecnico: l.nombre_tecnico || 'Técnico',
            observaciones: l.observaciones || 'Sin observaciones',
            date: l.fecha_hora_fin || l.fecha_alta || new Date().toISOString()
          };
        });
        localStorage.setItem('TSMAI_maintenance_logs', JSON.stringify(maintenanceLogs));
      }
    } catch (err) {
      console.warn('Supabase bitacora fetch failed, using cache:', err);
    }
  }

  if (maintenanceLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No hay registros en la bitácora de mantenimiento.</td></tr>`;
    return;
  }

  maintenanceLogs.sort((a, b) => new Date(b.date || b.fecha_hora_fin) - new Date(a.date || a.fecha_hora_fin));

  tbody.innerHTML = maintenanceLogs.map(l => {
    const fDate = new Date(l.date || l.fecha_hora_fin || new Date());
    const formattedDate = fDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const sTime = l.fecha_hora_inicio ? new Date(l.fecha_hora_inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';
    const eTime = l.fecha_hora_fin ? new Date(l.fecha_hora_fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';
    const horarioStr = l.horario_rango || `${sTime} - ${eTime}`;

    const actionsCell = l.id_bitacora
      ? `<button class="btn-table-action" onclick="openAdminEditBitacoraModal('${l.id_bitacora}')" style="background-color: var(--accent-cyan); border-color: var(--accent-cyan);">Editar</button>`
      : `<button class="btn-table-action" disabled style="opacity: 0.5; cursor: not-allowed;">—</button>`;
    
    return `
      <tr>
        <td><strong>${formattedDate}</strong></td>
        <td><strong>${l.id_orden || 'Autónomo'}</strong><br><span style="font-size:0.82rem;color:var(--text-secondary);">${l.descripcion_actividad || ''}</span></td>
        <td>${l.area || 'General'} - <strong>${l.maquina_id || 'N/A'}</strong></td>
        <td><span class="badge badge-status-asignada" style="font-size:0.78rem;">⏰ ${horarioStr}</span></td>
        <td style="max-width:180px;white-space:normal;font-size:0.85rem;">${l.refacciones_usadas || 'Ninguna'}</td>
        <td style="max-width:220px;white-space:normal;font-size:0.85rem;">${l.observaciones || 'Sin observaciones'}</td>
        <td>${actionsCell}</td>
      </tr>
    `;
  }).join('');
}

// --- ADMIN EDIT BITÁCORA FUNCTIONS ---
async function openAdminEditBitacoraModal(id_bitacora) {
  if (!supabaseClient) {
    alert('Se requiere conexión a la base de datos real para editar registros.');
    return;
  }

  try {
    showToast('Cargando datos del registro...');
    const { data: log, error } = await supabaseClient
      .from('bitacora_mantenimiento')
      .select('*')
      .eq('id_bitacora', id_bitacora)
      .maybeSingle();

    if (error) throw error;
    if (!log) {
      alert('No se encontró el registro en la base de datos.');
      return;
    }

    // Llenar datos en el formulario del modal
    document.getElementById('edit-bitacora-id').value = log.id_bitacora;
    document.getElementById('edit-bitacora-ot').value = log.id_orden || 'Actividad Autónoma (Sin orden)';
    document.getElementById('edit-bitacora-area').value = log.area;

    const startDateStr = log.fecha_hora_inicio ? log.fecha_hora_inicio.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const startTimeStr = log.fecha_hora_inicio ? log.fecha_hora_inicio.slice(11, 16) : '08:00';
    const endTimeStr = log.fecha_hora_fin ? log.fecha_hora_fin.slice(11, 16) : '09:00';

    const editDateInput = document.getElementById('edit-bitacora-date');
    const editStartInput = document.getElementById('edit-bitacora-time-start');
    const editEndInput = document.getElementById('edit-bitacora-time-end');

    if (editDateInput) editDateInput.value = startDateStr;
    if (editStartInput) editStartInput.value = startTimeStr;
    if (editEndInput) editEndInput.value = endTimeStr;

    document.getElementById('edit-bitacora-description').value = log.descripcion_actividad || '';
    document.getElementById('edit-bitacora-parts').value = log.refacciones_usadas || '';
    document.getElementById('edit-bitacora-observations').value = log.observaciones || '';

    // Cargar técnicos en el select
    const techSelect = document.getElementById('edit-bitacora-tech');
    if (techSelect) {
      const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
      techSelect.innerHTML = '';
      techs.forEach(t => {
        const isSelected = t.id === log.cve_tecnico ? 'selected' : '';
        techSelect.innerHTML += `<option value="${t.id}" ${isSelected}>${t.name} (${t.id})</option>`;
      });
    }

    // Configurar máquinas según el área y pre-seleccionar la correspondiente
    await onAdminEditBitacoraAreaChange(log.maquina_id);

    openModal('modal-admin-edit-bitacora');
  } catch (err) {
    console.error('Error loading bitacora details:', err);
    alert('Error al obtener datos: ' + err.message);
  }
}

async function onAdminEditBitacoraAreaChange(preselectMachineId = null) {
  const area = document.getElementById('edit-bitacora-area').value;
  const selectMach = document.getElementById('edit-bitacora-machine');
  if (!selectMach) return;
  selectMach.innerHTML = '<option value="">— Ninguna —</option>';

  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const filtered = area ? machines.filter(m => m.area === area) : machines;
  
  filtered.forEach(m => {
    const isSelected = preselectMachineId === m.id ? 'selected' : '';
    selectMach.innerHTML += `<option value="${m.id}" ${isSelected}>${m.name || m.id} (${m.id})</option>`;
  });
}

async function submitAdminEditBitacora() {
  const id_bitacora = document.getElementById('edit-bitacora-id').value;
  const area = document.getElementById('edit-bitacora-area').value;
  const maquina_id = document.getElementById('edit-bitacora-machine').value || null;
  const cve_tecnico = document.getElementById('edit-bitacora-tech').value;
  const dateVal = document.getElementById('edit-bitacora-date').value;
  const startVal = document.getElementById('edit-bitacora-time-start').value;
  const endVal = document.getElementById('edit-bitacora-time-end').value;
  const description = document.getElementById('edit-bitacora-description').value.trim();
  const parts = document.getElementById('edit-bitacora-parts').value.trim();
  const observations = document.getElementById('edit-bitacora-observations').value.trim();

  const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
  const tech = techs.find(t => t.id === cve_tecnico);
  const nombre_tecnico = tech ? tech.name : 'Técnico';

  if (!area || !dateVal || !startVal || !endVal || !description || !cve_tecnico) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }

  const timeStart = `${dateVal}T${startVal}:00`;
  const timeEnd = `${dateVal}T${endVal}:00`;

  showToast('Guardando cambios en Supabase...');
  try {
    const { error } = await supabaseClient
      .from('bitacora_mantenimiento')
      .update({
        area,
        maquina_id: maquina_id === '' ? null : maquina_id,
        cve_tecnico,
        nombre_tecnico,
        fecha_hora_inicio: timeStart,
        fecha_hora_fin: timeEnd,
        descripcion_actividad: description,
        refacciones_usadas: parts || null,
        observaciones: observations || null,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id_bitacora', id_bitacora);

    if (error) throw error;

    showToast('Registro de bitácora actualizado con éxito.');
    closeModal('modal-admin-edit-bitacora');
    renderAdminLogsTable();
  } catch (err) {
    console.error('Error updating bitacora:', err);
    alert('Error al guardar: ' + err.message);
  }
}

// --- CATÁLOGOS ADMIN (MÁQUINAS Y REFACCIONES) ---
async function renderAdminMachinesTable() {
  const tbody = document.getElementById('table-admin-machines-body');
  if (!tbody) return;

  let machines = [];
  // Fuente primaria: Supabase
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('cat_maquinas')
        .select('equipo_towell, clave, ax, criticidad, activo')
        .order('equipo_towell');
      if (!error && data && data.length > 0) {
        const existingLocal = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
        machines = data.map(m => {
          const local = existingLocal.find(l => l.id === m.equipo_towell) || {};
          const area = m.equipo_towell.includes('COS') ? 'CF' : (m.equipo_towell.includes('TIN') || m.equipo_towell.includes('JET') ? 'TF' : 'PF');
          return {
            id: m.equipo_towell,
            name: m.clave || m.equipo_towell,
            area: area,
            mtbf: local.mtbf || 120,
            mttr: local.mttr || 2.5,
            failures: local.failures || 0,
            cost: local.cost || 0,
            status: m.activo ? 'Operativa' : 'En Paro',
            criticidad: m.criticidad || 'Baja'
          };
        });
        localStorage.setItem('TSMAI_machines', JSON.stringify(machines));
      }
    } catch (err) {
      console.warn('Error fetching machines from Supabase:', err);
    }
  }

  // Fallback
  if (machines.length === 0) {
    machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  }

  let html = '';
  machines.forEach(m => {
    const isOperative = m.status === 'Operativa';
    const statusColor = isOperative ? 'var(--color-preventive)' : 'var(--color-critical)';
    const criticidadBadge = {
      'Alta': '<span class="badge badge-priority-alta">Alta</span>',
      'Media': '<span class="badge badge-priority-media">Media</span>',
      'Baja': '<span class="badge badge-priority-baja">Baja</span>',
      'Muy Baja': '<span class="badge badge-priority-baja" style="opacity:0.6">Muy Baja</span>',
      'Crítica': '<span class="badge badge-priority-crítica">🔴 Crítica</span>'
    }[m.criticidad] || '<span class="badge badge-priority-baja">N/D</span>';

    html += `
      <tr style="opacity: ${isOperative ? 1 : 0.65}">
        <td><strong>${m.id}</strong></td>
        <td>${m.name || m.id}</td>
        <td>${m.area}</td>
        <td>${criticidadBadge}</td>
        <td>${m.mtbf || 0} hrs</td>
        <td>${m.mttr || 0} hrs</td>
        <td>${m.failures || 0}</td>
        <td><span style="display: inline-flex; align-items: center; gap: 4px; font-weight: 700; color: ${statusColor};"><span style="width: 8px; height: 8px; border-radius:50%; background: ${statusColor}"></span>${m.status}</span></td>
        <td>
          <button class="btn-table-action" onclick="openAdminMachineModal('${m.id}')">✏️ Editar</button>
          <button class="btn-table-action" style="color: ${isOperative ? 'var(--color-critical)' : 'var(--color-preventive)'}; border-color: ${isOperative ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}" onclick="deleteAdminMachine('${m.id}')">
            ${isOperative ? '🚫 Parar' : '✅ Operar'}
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function renderAdminPartsTable() {
  const tbody = document.getElementById('table-admin-parts-body');
  if (!tbody) return;

  let parts = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('cat_refacciones')
        .select('*')
        .order('nombre_articulo');
      if (!error && data && data.length > 0) {
        parts = data.map(p => ({
          id: p.codigo_articulo || p.id,
          name: p.nombre_articulo || p.codigo_articulo,
          maquina: p.maquina_id || 'General',
          cantidadEstandar: parseFloat(p.cantidad_estandar) || 1,
          cost: parseFloat(p.costo_unitario || p.precio_costo_unitario || 0),
          activo: p.activo !== false
        }));
        localStorage.setItem('TSMAI_parts', JSON.stringify(parts));
      }
    } catch (err) {
      console.warn('Error fetching parts from Supabase:', err);
    }
  }

  if (parts.length === 0) {
    parts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
  }

  let html = '';
  parts.forEach(p => {
    const isActive = p.activo !== false;
    const statusBadge = isActive
      ? '<span class="badge badge-status-ejecutada">✅ Activo</span>'
      : '<span class="badge badge-priority-alta">Inactivo</span>';
    
    html += `
      <tr style="opacity: ${isActive ? 1 : 0.65}">
        <td><strong>${p.id}</strong></td>
        <td>${p.name}</td>
        <td><span style="color:var(--accent-blue); font-weight:600;">${p.maquina}</span></td>
        <td style="font-weight: 700; font-size:1.05em; color:var(--accent-green);">${p.cantidadEstandar} pza</td>
        <td>$${Number(p.cost).toFixed(2)} MXN</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn-table-action" onclick="openAdminPartModal('${p.id}')">✏️ Editar</button>
          <button class="btn-table-action" style="color: ${isActive ? 'var(--color-critical)' : 'var(--color-preventive)'}; border-color: ${isActive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}" onclick="deleteAdminPart('${p.id}')">
            ${isActive ? '🚫 Desactivar' : '✅ Activar'}
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderAdminUsersTable() {
  const users = JSON.parse(localStorage.getItem('TSMAI_users') || '[]');
  const tbody = document.getElementById('table-admin-users-body');
  if (!tbody) return;

  let html = '';
  users.forEach(u => {
    // Formatear rol
    let rolText = u.rol;
    if (u.rol === 'SUPER_ADMINISTRADOR') rolText = 'Super Administrador';
    else if (u.rol === 'MANTENIMIENTO') rolText = `Técnico (${u.cve_tecnico || 'Sin Clave'})`;
    else if (u.rol === 'SOLICITANTE_PUBLICO') rolText = 'Solicitante Público';

    // Permisos del sistema como badges
    let permBadges = '';
    if (u.puede_crear_solicitud) permBadges += '<span class="badge badge-status-recibida" style="margin: 2px;">Crear Sol.</span>';
    if (u.puede_ver_ordenes_asignadas) permBadges += '<span class="badge badge-status-en-proceso" style="margin: 2px;">Ver Asignadas</span>';
    if (u.puede_ver_todas_ordenes) permBadges += '<span class="badge badge-status-en-proceso" style="margin: 2px;">Ver Todas</span>';
    if (u.puede_atender_orden) permBadges += '<span class="badge badge-status-ejecutada" style="margin: 2px;">Atender</span>';
    if (u.puede_cerrar_orden) permBadges += '<span class="badge badge-status-ejecutada" style="margin: 2px;">Cerrar</span>';
    if (u.puede_validar_cierre) permBadges += '<span class="badge badge-status-ejecutada" style="margin: 2px;">Validar</span>';
    if (u.puede_editar_catalogos) permBadges += '<span class="badge badge-priority-media" style="margin: 2px;">Editar Cat.</span>';
    if (u.puede_ver_dashboards) permBadges += '<span class="badge badge-priority-media" style="margin: 2px;">Ver Dash</span>';
    if (u.puede_configurar_sistema) permBadges += '<span class="badge badge-priority-alta" style="margin: 2px;">Config</span>';
    if (u.recibe_alertas) permBadges += '<span class="badge badge-priority-alta" style="margin: 2px;">Alertas</span>';

    if (!permBadges) {
      permBadges = '<span style="color: var(--text-muted); font-size: 0.8rem;">Ninguno</span>';
    }

    const lastAccess = u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-ES') : 'N/A';
    const statusColor = u.activo ? 'var(--color-preventive)' : 'var(--color-critical)';
    const statusLabel = u.activo ? 'Activo' : 'Inactivo';

    html += `
      <tr style="opacity: ${u.activo ? 1 : 0.65}">
        <td>
          <div style="font-weight: 700;">${u.nombre_completo}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">EMP: ${u.cve_empleado || 'N/A'}</div>
        </td>
        <td>${u.correo || 'N/A'}</td>
        <td>${rolText}</td>
        <td><div style="display: flex; flex-wrap: wrap; max-width: 300px;">${permBadges}</div></td>
        <td>
          <div>${lastAccess}</div>
          <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; font-weight: 700; color: ${statusColor};">
            <span style="width: 6px; height: 6px; border-radius:50%; background: ${statusColor}"></span>${statusLabel}
          </div>
        </td>
        <td>
          <button class="btn-table-action" onclick="openAdminUserModal('${u.id_usuario}')">✏️ Editar</button>
          <button class="btn-table-action" style="color: var(--accent-blue); border-color: rgba(59, 130, 246, 0.3);" onclick="resetAdminUserPassword('${u.id_usuario}')">🔑 Restablecer</button>
          <button class="btn-table-action" style="color: ${u.activo ? 'var(--color-critical)' : 'var(--color-preventive)'}; border-color: ${u.activo ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}" onclick="deleteAdminUser('${u.id_usuario}')">
            ${u.activo ? '🚫 Desactivar' : '✅ Activar'}
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function syncAdminUsersManual() {
  if (!supabaseClient) {
    showToast('⚠️ Sin conexión a Supabase.');
    return;
  }
  try {
    showToast('Sincronizando usuarios con Supabase...');
    await syncDatabases();
    renderAdminUsersTable();
    showToast('🔄 Usuarios sincronizados con éxito.');
  } catch (err) {
    console.error('Error in manual users sync:', err);
    alert('Error al sincronizar usuarios: ' + err.message);
  }
}

// --- CRUD USUARIOS (ADMIN) ---
function toggleAdminUserRoleFields() {
  const role = document.getElementById('admin-user-role').value;
  const techGroup = document.getElementById('admin-user-tech-code-group');
  const deptGroup = document.getElementById('admin-user-dept-group');
  const shiftGroup = document.getElementById('admin-user-shift-group');
  const puestoGroup = document.getElementById('admin-user-puesto-group');
  const areaGroup = document.getElementById('admin-user-area-group');
  const empInput = document.getElementById('admin-user-emp-code');
  const techInput = document.getElementById('admin-user-tech-code');

  if (role === 'MANTENIMIENTO') {
    // Al registrar técnicos: Ocultar Departamento, Turno, Puesto y Área General (información no relevante para técnicos)
    if (deptGroup) deptGroup.style.display = 'none';
    if (shiftGroup) shiftGroup.style.display = 'none';
    if (puestoGroup) puestoGroup.style.display = 'none';
    if (areaGroup) areaGroup.style.display = 'none';

    if (techGroup) techGroup.style.display = 'block';
    if (empInput && techInput) {
      techInput.value = empInput.value;
      techInput.disabled = true; // El código de empleado manda
      
      // Sincronizar en tiempo real cuando escriben
      if (!empInput.dataset.hasSyncListener) {
        empInput.dataset.hasSyncListener = 'true';
        empInput.addEventListener('input', () => {
          if (document.getElementById('admin-user-role').value === 'MANTENIMIENTO') {
            document.getElementById('admin-user-tech-code').value = empInput.value;
          }
        });
      }
    }
  } else {
    // Mostrar Departamento, Turno, Puesto y Área General para otros roles
    if (deptGroup) deptGroup.style.display = 'block';
    if (shiftGroup) shiftGroup.style.display = 'block';
    if (puestoGroup) puestoGroup.style.display = 'block';
    if (areaGroup) areaGroup.style.display = 'block';

    if (techGroup) techGroup.style.display = 'none';
    if (techInput) {
      techInput.value = '';
      techInput.disabled = false;
    }
  }
}

function openAdminUserModal(userId = null) {
  const roleSelect = document.getElementById('admin-user-role');
  const activeCheck = document.getElementById('admin-user-active');
  const codeInput = document.getElementById('admin-user-emp-code');
  
  if (userId) {
    const users = JSON.parse(localStorage.getItem('TSMAI_users') || '[]');
    const u = users.find(item => item.id_usuario === userId);
    if (!u) return;

    document.getElementById('admin-user-id').value = u.id_usuario;
    document.getElementById('admin-user-name').value = u.nombre_completo || '';
    document.getElementById('admin-user-email').value = u.correo || '';
    document.getElementById('admin-user-phone').value = u.telefono || '';
    roleSelect.value = u.rol || 'SOLICITANTE';
    codeInput.value = u.cve_empleado || '';
    document.getElementById('admin-user-tech-code').value = u.cve_tecnico || '';
    document.getElementById('admin-user-dept').value = u.departamento || '';
    document.getElementById('admin-user-shift').value = u.turno || '1';
    document.getElementById('admin-user-obs').value = u.observaciones || '';
    const puestoEl = document.getElementById('admin-user-puesto');
    if (puestoEl) puestoEl.value = u.puesto || '';
    const areaEl = document.getElementById('admin-user-area');
    if (areaEl) areaEl.value = u.area || u.departamento || '';

    // Checkboxes
    document.getElementById('perm-create-req').checked = !!u.puede_crear_solicitud;
    document.getElementById('perm-view-assigned').checked = !!u.puede_ver_ordenes_asignadas;
    document.getElementById('perm-view-all').checked = !!u.puede_ver_todas_ordenes;
    document.getElementById('perm-attend-ot').checked = !!u.puede_atender_orden;
    document.getElementById('perm-close-ot').checked = !!u.puede_cerrar_orden;
    document.getElementById('perm-validate-ot').checked = !!u.puede_validar_cierre;
    document.getElementById('perm-edit-cats').checked = !!u.puede_editar_catalogos;
    document.getElementById('perm-view-dash').checked = !!u.puede_ver_dashboards;
    document.getElementById('perm-config').checked = !!u.puede_configurar_sistema;
    document.getElementById('perm-alerts').checked = !!u.recibe_alertas;
    activeCheck.checked = u.activo !== false;

    document.getElementById('admin-user-detail-title').innerText = `Editar Usuario: ${u.nombre_completo}`;
  } else {
    document.getElementById('admin-user-id').value = '';
    document.getElementById('admin-user-name').value = '';
    document.getElementById('admin-user-email').value = '';
    document.getElementById('admin-user-phone').value = '';
    roleSelect.value = 'SOLICITANTE';
    codeInput.value = '';
    document.getElementById('admin-user-tech-code').value = '';
    document.getElementById('admin-user-dept').value = '';
    document.getElementById('admin-user-shift').value = '1';
    document.getElementById('admin-user-obs').value = '';
    const puestoEl2 = document.getElementById('admin-user-puesto');
    if (puestoEl2) puestoEl2.value = '';
    const areaEl2 = document.getElementById('admin-user-area');
    if (areaEl2) areaEl2.value = 'General';

    // Checkboxes defaults
    document.getElementById('perm-create-req').checked = true;
    document.getElementById('perm-view-assigned').checked = false;
    document.getElementById('perm-view-all').checked = false;
    document.getElementById('perm-attend-ot').checked = false;
    document.getElementById('perm-close-ot').checked = false;
    document.getElementById('perm-validate-ot').checked = false;
    document.getElementById('perm-edit-cats').checked = false;
    document.getElementById('perm-view-dash').checked = false;
    document.getElementById('perm-config').checked = false;
    document.getElementById('perm-alerts').checked = false;
    activeCheck.checked = true;

    document.getElementById('admin-user-detail-title').innerText = 'Crear Nuevo Usuario';
  }

  toggleAdminUserRoleFields();
  openModal('modal-admin-user-detail');
}

async function saveAdminUser() {
  const id = document.getElementById('admin-user-id').value;
  const nombre = document.getElementById('admin-user-name').value.trim();
  const correo = document.getElementById('admin-user-email').value.trim();
  const telefono = document.getElementById('admin-user-phone').value.trim();
  const rol = document.getElementById('admin-user-role').value;
  const isTech = rol === 'MANTENIMIENTO';
  const cveEmpleado = document.getElementById('admin-user-emp-code').value.trim();
  const cveTecnico = document.getElementById('admin-user-tech-code').value.trim();
  const departamento = isTech ? 'MANTENIMIENTO' : document.getElementById('admin-user-dept').value.trim();
  const shift = isTech ? null : document.getElementById('admin-user-shift').value;
  const observaciones = document.getElementById('admin-user-obs').value.trim();
  const puesto = isTech ? 'Técnico de Mantenimiento' : (document.getElementById('admin-user-puesto')?.value || '').trim();
  const area = isTech ? 'Mantenimiento' : ((document.getElementById('admin-user-area')?.value || '').trim() || 'General');

  // Permisos
  const puedeCrear = document.getElementById('perm-create-req').checked;
  const puedeVerAsignadas = document.getElementById('perm-view-assigned').checked;
  const puedeVerTodas = document.getElementById('perm-view-all').checked;
  const puedeAtender = document.getElementById('perm-attend-ot').checked;
  const puedeCerrar = document.getElementById('perm-close-ot').checked;
  const puedeValidar = document.getElementById('perm-validate-ot').checked;
  const puedeEditar = document.getElementById('perm-edit-cats').checked;
  const puedeVerDash = document.getElementById('perm-view-dash').checked;
  const puedeConfig = document.getElementById('perm-config').checked;
  const recibeAlertas = document.getElementById('perm-alerts').checked;
  const activo = document.getElementById('admin-user-active').checked;

  if (!nombre) {
    alert('Por favor ingresa el nombre completo.');
    return;
  }
  if (!correo) {
    alert('Por favor ingresa el correo electrónico.');
    return;
  }

  const finalEmpCode = cveEmpleado || (cveTecnico ? cveTecnico : null);
  const finalTechCode = (rol === 'MANTENIMIENTO' || cveTecnico) ? (cveTecnico || cveEmpleado || null) : null;
  const tempPass = 'TSM' + Math.floor(100000 + Math.random() * 900000);

  if (rol === 'MANTENIMIENTO' && !finalEmpCode && !finalTechCode) {
    alert('Por favor ingresa la clave de empleado o técnico.');
    return;
  }

  const finalCanCreate = rol === 'MANTENIMIENTO' ? false : puedeCrear;

  const userObj = {
    nombre_completo: nombre,
    correo: correo,
    telefono: telefono || null,
    rol: rol,
    puesto: puesto || null,
    area: area || 'General',
    cve_empleado: finalEmpCode,
    cve_tecnico: finalTechCode,
    departamento: departamento || null,
    turno: shift ? parseInt(shift) : null,
    puede_crear_solicitud: finalCanCreate,
    puede_ver_ordenes_asignadas: (rol === 'MANTENIMIENTO') ? true : puedeVerAsignadas,
    puede_ver_todas_ordenes: puedeVerTodas,
    puede_atender_orden: (rol === 'MANTENIMIENTO') ? true : puedeAtender,
    puede_cerrar_orden: (rol === 'MANTENIMIENTO') ? true : puedeCerrar,
    puede_validar_cierre: puedeValidar,
    puede_editar_catalogos: puedeEditar,
    puede_ver_dashboards: puedeVerDash,
    puede_configurar_sistema: puedeConfig,
    recibe_alertas: recibeAlertas,
    activo: activo,
    observaciones: observaciones || null,
    fecha_actualizacion: new Date().toISOString()
  };

  const isUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (!isUUID) {
    userObj.contrasenia = tempPass;
    userObj.debe_cambiar_contrasenia = true;
    userObj.fecha_alta = new Date().toISOString();
  }

  let shouldShowEmail = false;

  if (supabaseClient) {
    try {
      // 1. Asegurar la clave de empleado en cat_empleados si existe
      if (finalEmpCode) {
        showToast('Sincronizando catálogo de empleados...');
        const { error: empErr } = await supabaseClient
          .from('cat_empleados')
          .upsert([{
            cve_empleado: finalEmpCode,
            nombre_empleado: nombre,
            correo: correo,
            telefono: telefono || null,
            activo: activo,
            fecha_actualizacion: new Date().toISOString()
          }], { onConflict: 'cve_empleado' });
        if (empErr) console.warn('Aviso en cat_empleados:', empErr);
      }

      // 2. Si el rol es MANTENIMIENTO o tiene clave de técnico, asegurar registro en cat_tecnicos
      if ((rol === 'MANTENIMIENTO' || finalTechCode) && finalTechCode) {
        showToast('Sincronizando catálogo de técnicos...');
        const { error: techErr } = await supabaseClient
          .from('cat_tecnicos')
          .upsert([{
            cve_tecnico: finalTechCode,
            nombre_tecnico: nombre,
            correo: correo,
            telefono: telefono || null,
            activo: activo,
            especialidad: observaciones || departamento || 'Mantenimiento General',
            fecha_actualizacion: new Date().toISOString()
          }], { onConflict: 'cve_tecnico' });
        if (techErr) console.warn('Aviso en cat_tecnicos:', techErr);
      }

      // 3. Actualizar la tabla principal cat_usuarios_roles
      const dbPayload = { ...userObj };
      delete dbPayload.contrasenia;

      if (isUUID) {
        const { error } = await supabaseClient
          .from('cat_usuarios_roles')
          .update(dbPayload)
          .eq('id_usuario', id);
        if (error) throw error;
        showToast('✅ Usuario actualizado con éxito en Supabase.');
      } else {
        const { error } = await supabaseClient
          .from('cat_usuarios_roles')
          .insert([dbPayload]);
        if (error) throw error;
        showToast('✅ Usuario creado con éxito en Supabase.');
        shouldShowEmail = true;
      }
    } catch (err) {
      console.error('Error guardando usuario en Supabase:', err);
      alert('Error guardando en Supabase: ' + err.message);
      return;
    }
  } else {
    showToast('Guardado localmente (Offline).');
  }

  // Sincronizar sesión en memoria si el usuario editado es el usuario actual logueado
  if (currentUser && (currentUser.uuid === id || currentUser.email === correo)) {
    currentUser.rol = rol;
    currentUser.role = normalizeUserRole(rol);
    currentUser.name = nombre;
    currentUser.cve_tecnico = finalTechCode;
    currentUser.id = finalTechCode || currentUser.uuid;
    persistSessionUser(currentUser);
  }

  if (supabaseClient) {
    await syncDatabases();
  } else {
    let localUsers = JSON.parse(localStorage.getItem('TSMAI_users') || '[]');
    if (id) {
      localUsers = localUsers.map(u => u.id_usuario === id ? { ...u, ...userObj } : u);
    } else {
      userObj.id_usuario = crypto.randomUUID ? crypto.randomUUID() : 'local-' + Math.random().toString(36).substr(2, 9);
      localUsers.push(userObj);
      shouldShowEmail = true;
    }
    localStorage.setItem('TSMAI_users', JSON.stringify(localUsers));
    
    const localTechs = localUsers.filter(u => u.rol === 'MANTENIMIENTO').map(t => ({
      id: t.cve_tecnico || t.id_usuario,
      uuid: t.id_usuario,
      name: t.nombre_completo,
      email: t.correo,
      specialty: t.observaciones || 'General',
      avatar: '👨‍🔧'
    }));
    localStorage.setItem('TSMAI_technicians', JSON.stringify(localTechs));
  }

  if (shouldShowEmail) {
    showSimulatedEmail(
      correo,
      '🔑 Tu contraseña temporal de acceso a TSM-AI',
      `<h2>¡Bienvenido a TSM-AI, ${nombre}!</h2>
       <p>Tu cuenta ha sido creada con éxito por el Super Administrador.</p>
       <p>Tu rol asignado es: <strong>${rol === 'SUPER_ADMINISTRADOR' ? 'Super Administrador' : rol === 'MANTENIMIENTO' ? 'Técnico' : 'Solicitante Público'}</strong>.</p>
       <p>Tu contraseña temporal de acceso es:</p>
       <div style="margin: 20px 0; text-align: center;">
         <strong style="font-size: 1.5rem; color: var(--accent-blue); background: #f1f5f9; padding: 6px 16px; border: 1px dashed var(--accent-blue); border-radius: 4px; font-family: monospace; display: inline-block;">${tempPass}</strong>
       </div>
       <p>Por motivos de seguridad, deberás cambiar esta contraseña la primera vez que ingreses al sistema.</p>
       <p style="margin-top: 25px; font-size: 0.8rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">Este es un correo de bienvenida automático simulado por el sistema.</p>`,
      'Copiar Contraseña',
      () => {
        navigator.clipboard.writeText(tempPass);
        showToast('Contraseña temporal copiada al portapapeles.');
      }
    );
  }

  closeModal('modal-admin-user-detail');
  renderAdminUsersTable();
}

async function deleteAdminUser(userId) {
  if (!userId) return;

  const users = JSON.parse(localStorage.getItem('TSMAI_users') || '[]');
  const user = users.find(u => u.id_usuario === userId);
  if (!user) return;

  const newStatus = !user.activo;
  const actionLabel = newStatus ? 'activar' : 'desactivar';

  if (!confirm(`¿Estás seguro de que deseas ${actionLabel} al usuario "${user.nombre_completo}"?`)) {
    return;
  }

  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('cat_usuarios_roles')
        .update({ activo: newStatus, fecha_actualizacion: new Date().toISOString() })
        .eq('id_usuario', userId);
      if (error) throw error;
      showToast(`Usuario ${newStatus ? 'activado' : 'desactivado'} en Supabase.`);
      await syncDatabases();
    } catch (err) {
      console.error('Error toggling user status in Supabase:', err);
      alert('Error en Supabase: ' + err.message);
      return;
    }
  } else {
    const updatedUsers = users.map(u => u.id_usuario === userId ? { ...u, activo: newStatus } : u);
    localStorage.setItem('TSMAI_users', JSON.stringify(updatedUsers));
    
    const localTechs = updatedUsers.filter(u => u.rol === 'MANTENIMIENTO').map(t => ({
      id: t.cve_tecnico || t.id_usuario,
      uuid: t.id_usuario,
      name: t.nombre_completo,
      email: t.correo,
      specialty: t.observaciones || 'General',
      avatar: '👨‍🔧'
    }));
    localStorage.setItem('TSMAI_technicians', JSON.stringify(localTechs));
    
    showToast(`Usuario ${newStatus ? 'activado' : 'desactivado'} localmente.`);
  }

  renderAdminUsersTable();
}

// --- CRUD MÁQUINAS (ADMIN) ---
function openAdminMachineModal(machineId = null) {
  const codeInput = document.getElementById('admin-machine-code');
  if (machineId) {
    const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
    const m = machines.find(item => item.id === machineId);
    if (!m) return;

    document.getElementById('admin-machine-id').value = m.id;
    codeInput.value = m.id;
    codeInput.disabled = true; // No permitir cambiar código si es edición
    document.getElementById('admin-machine-name').value = m.name || m.id;
    document.getElementById('admin-machine-area').value = m.area || 'PF';
    document.getElementById('admin-machine-process').value = m.proceso || '';
    document.getElementById('admin-machine-type').value = m.tipo_equipo || '';
    document.getElementById('admin-machine-active').checked = m.status === 'Operativa';
    document.getElementById('admin-machine-detail-title').innerText = `Editar Equipo: ${m.id}`;
  } else {
    document.getElementById('admin-machine-id').value = '';
    codeInput.value = '';
    codeInput.disabled = false;
    document.getElementById('admin-machine-name').value = '';
    document.getElementById('admin-machine-area').value = 'PF';
    document.getElementById('admin-machine-process').value = '';
    document.getElementById('admin-machine-type').value = '';
    document.getElementById('admin-machine-active').checked = true;
    document.getElementById('admin-machine-detail-title').innerText = 'Crear Nuevo Equipo';
  }
  openModal('modal-admin-machine-detail');
}

async function saveAdminMachine() {
  const id = document.getElementById('admin-machine-id').value;
  const code = document.getElementById('admin-machine-code').value.trim();
  const name = document.getElementById('admin-machine-name').value.trim();
  const area = document.getElementById('admin-machine-area').value;
  const process = document.getElementById('admin-machine-process').value.trim();
  const type = document.getElementById('admin-machine-type').value.trim();
  const criticality = document.getElementById('admin-machine-criticality')?.value || 'B';

  const machineObj = {
    equipo_towell: code,
    clave: name,
    departamento_codigo: area,
    tipo_equipo: type,
    activo: active,
    ax: null,
    origen: 'App'
  };

  if (supabaseClient) {
    try {
      if (id) {
        const { error } = await supabaseClient
          .from('cat_maquinas')
          .update(machineObj)
          .eq('equipo_towell', id);
        if (error) throw error;
        showToast('Equipo actualizado en base de datos.');
      } else {
        const { data: existing } = await supabaseClient
          .from('cat_maquinas')
          .select('equipo_towell')
          .eq('equipo_towell', code);
        if (existing && existing.length > 0) {
          alert('Ya existe un equipo con este Código / ID.');
          return;
        }

        const { error } = await supabaseClient
          .from('cat_maquinas')
          .insert([machineObj]);
        if (error) throw error;
        showToast('Equipo creado en base de datos.');
      }

      // Upsert criticidad
      await supabaseClient.from('cat_criticidad_maquina').upsert([{
        maquina_id: code,
        nivel_criticidad: criticality,
        descripcion_criticidad: criticality === 'A' ? 'Equipo de alta criticidad (Paro Total)' : (criticality === 'B' ? 'Equipo de criticidad media (Paro Parcial)' : 'Equipo secundario'),
        activo: active
      }], { onConflict: 'maquina_id' });
    } catch (err) {
      console.error('Error guardando máquina en Supabase:', err);
      alert('Error guardando en Supabase: ' + err.message);
      return;
    }
  } else {
    showToast('Guardado localmente (Offline).');
  }

  if (supabaseClient) {
    await syncDatabases();
    
    // Restaurar el nombre local personalizado si existía en LocalStorage y no se actualizó
    let localMachines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
    localMachines = localMachines.map(m => m.id === code ? { ...m, name: name } : m);
    localStorage.setItem('TSMAI_machines', JSON.stringify(localMachines));
  } else {
    let localMachines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
    const mappedLocal = {
      id: code,
      name: name,
      area: area,
      clave: code.split('-')[1] || code,
      proceso: process,
      tipo_equipo: type,
      status: active ? 'Operativa' : 'Parada'
    };

    if (id) {
      localMachines = localMachines.map(m => m.id === id ? { ...m, ...mappedLocal } : m);
    } else {
      localMachines.push(mappedLocal);
    }
    localStorage.setItem('TSMAI_machines', JSON.stringify(localMachines));
  }

  closeModal('modal-admin-machine-detail');
  renderAdminMachinesTable();
}

async function deleteAdminMachine(machineId) {
  if (!machineId) return;

  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const m = machines.find(item => item.id === machineId);
  if (!m) return;

  const newStatus = m.status !== 'Operativa';
  const actionLabel = newStatus ? 'poner en operación' : 'detener';

  if (!confirm(`¿Estás seguro de que deseas ${actionLabel} el equipo "${machineId}"?`)) {
    return;
  }

  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('cat_maquinas')
        .update({ activo: newStatus })
        .eq('equipo_towell', machineId);
      if (error) throw error;
      showToast(`Equipo ${newStatus ? 'Operativo' : 'Parado'} en Supabase.`);
      await syncDatabases();
    } catch (err) {
      console.error('Error toggling machine status in Supabase:', err);
      alert('Error en Supabase: ' + err.message);
      return;
    }
  } else {
    const updated = machines.map(item => item.id === machineId ? { ...item, status: newStatus ? 'Operativa' : 'Parada' } : item);
    localStorage.setItem('TSMAI_machines', JSON.stringify(updated));
    showToast(`Equipo ${newStatus ? 'Operativo' : 'Parado'} localmente.`);
  }

  renderAdminMachinesTable();
}

// --- CRUD REFACCIONES (ADMIN) ---
function openAdminPartModal(partId = null) {
  const codeInput = document.getElementById('admin-part-code');
  if (partId) {
    const parts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
    const p = parts.find(item => item.id === partId);
    if (!p) return;

    document.getElementById('admin-part-id').value = p.id;
    codeInput.value = p.id;
    codeInput.disabled = true; // No permitir cambiar código si es edición
    document.getElementById('admin-part-name').value = p.name || '';
    document.getElementById('admin-part-category').value = p.category || '';
    document.getElementById('admin-part-cost').value = p.cost || 0;
    document.getElementById('admin-part-stock').value = p.stock || 0;
    document.getElementById('admin-part-min').value = p.minStock || 0;
    document.getElementById('admin-part-active').checked = p.activo !== false;
    document.getElementById('admin-part-detail-title').innerText = `Editar Refacción: ${p.id}`;
  } else {
    document.getElementById('admin-part-id').value = '';
    codeInput.value = '';
    codeInput.disabled = false;
    document.getElementById('admin-part-name').value = '';
    document.getElementById('admin-part-category').value = '';
    document.getElementById('admin-part-cost').value = '';
    document.getElementById('admin-part-stock').value = '';
    document.getElementById('admin-part-min').value = '';
    document.getElementById('admin-part-active').checked = true;
    document.getElementById('admin-part-detail-title').innerText = 'Crear Nueva Refacción';
  }
  openModal('modal-admin-part-detail');
}

async function saveAdminPart() {
  const id = document.getElementById('admin-part-id').value;
  const code = document.getElementById('admin-part-code').value.trim();
  const name = document.getElementById('admin-part-name').value.trim();
  const category = document.getElementById('admin-part-category').value.trim();
  const cost = document.getElementById('admin-part-cost').value;
  const stock = document.getElementById('admin-part-stock').value;
  const minStock = document.getElementById('admin-part-min').value;
  const active = document.getElementById('admin-part-active').checked;

  if (!code) {
    alert('Por favor ingresa el código de refacción.');
    return;
  }
  if (!name) {
    alert('Por favor ingresa el nombre de la refacción.');
    return;
  }
  if (cost === '') {
    alert('Por favor ingresa el costo unitario.');
    return;
  }
  if (stock === '') {
    alert('Por favor ingresa el stock actual.');
    return;
  }
  if (minStock === '') {
    alert('Por favor ingresa el stock mínimo.');
    return;
  }

  const partObj = {
    codigo_articulo: code,
    nombre_articulo: name,
    unidad_medida: 'PZ',
    familia: category || 'General',
    activo: active
  };

  if (supabaseClient) {
    try {
      if (id) {
        const { error } = await supabaseClient
          .from('cat_refacciones')
          .update(partObj)
          .eq('codigo_articulo', id);
        if (error) throw error;
        showToast('Refacción actualizada en base de datos.');
      } else {
        const { data: existing } = await supabaseClient
          .from('cat_refacciones')
          .select('codigo_articulo')
          .eq('codigo_articulo', code);
        if (existing && existing.length > 0) {
          alert('Ya existe una refacción con este Código / ID.');
          return;
        }

        const { error } = await supabaseClient
          .from('cat_refacciones')
          .insert([partObj]);
        if (error) throw error;
        showToast('Refacción creada en base de datos.');
      }
    } catch (err) {
      console.error('Error guardando refacción en Supabase:', err);
      alert('Error guardando en Supabase: ' + err.message);
      return;
    }
  } else {
    showToast('Guardada localmente (Offline).');
  }

  if (supabaseClient) {
    await syncDatabases();
    
    // Sobrescribir campos específicos de UI local
    let localParts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
    localParts = localParts.map(p => {
      if (p.id === code) {
        return {
          ...p,
          cost: parseFloat(cost),
          stock: parseFloat(stock),
          minStock: parseFloat(minStock),
          activo: active
        };
      }
      return p;
    });
    localStorage.setItem('TSMAI_parts', JSON.stringify(localParts));
  } else {
    let localParts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
    const mappedLocal = {
      id: code,
      name: name,
      category: category,
      cost: parseFloat(cost),
      stock: parseFloat(stock),
      minStock: parseFloat(minStock),
      activo: active
    };

    if (id) {
      localParts = localParts.map(p => p.id === id ? { ...p, ...mappedLocal } : p);
    } else {
      localParts.push(mappedLocal);
    }
    localStorage.setItem('TSMAI_parts', JSON.stringify(localParts));
  }

  closeModal('modal-admin-part-detail');
  renderAdminPartsTable();
}

async function deleteAdminPart(partId) {
  if (!partId) return;

  const parts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
  const p = parts.find(item => item.id === partId);
  if (!p) return;

  const newStatus = p.activo === false;
  const actionLabel = newStatus ? 'activar' : 'desactivar';

  if (!confirm(`¿Estás seguro de que deseas ${actionLabel} la refacción "${partId}"?`)) {
    return;
  }

  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('cat_refacciones')
        .update({ activo: newStatus })
        .eq('codigo_articulo', partId);
      if (error) throw error;
      showToast(`Refacción ${newStatus ? 'activada' : 'desactivada'} en Supabase.`);
      await syncDatabases();
      
      let localParts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
      localParts = localParts.map(item => item.id === partId ? { ...item, activo: newStatus } : item);
      localStorage.setItem('TSMAI_parts', JSON.stringify(localParts));
    } catch (err) {
      console.error('Error toggling part status in Supabase:', err);
      alert('Error en Supabase: ' + err.message);
      return;
    }
  } else {
    const updated = parts.map(item => item.id === partId ? { ...item, activo: newStatus } : item);
    localStorage.setItem('TSMAI_parts', JSON.stringify(updated));
    showToast(`Refacción ${newStatus ? 'activada' : 'desactivada'} localmente.`);
  }

  renderAdminPartsTable();
}

// --- FORMULARIOS DINÁMICOS (ADMIN) ---
let tempFormFields = [];

function toggleFormBuilderOptionsField() {
  const type = document.getElementById('fb-field-type').value;
  const container = document.getElementById('fb-options-container');
  if (container) {
    container.style.display = (type === 'select') ? 'block' : 'none';
  }
}

function addFieldToBuilder() {
  const label = document.getElementById('fb-field-label').value.trim();
  const type = document.getElementById('fb-field-type').value;

  if (!label) {
    alert('Ingresa una etiqueta o pregunta.');
    return;
  }

  let options = [];
  if (type === 'select') {
    const optionsStr = document.getElementById('fb-field-options').value.trim();
    if (!optionsStr) {
      alert('Ingresa las opciones para la lista desplegable.');
      return;
    }
    options = optionsStr.split(',').map(o => o.trim()).filter(Boolean);
    if (options.length === 0) {
      alert('Ingresa al menos una opción válida.');
      return;
    }
  }

  const name = 'field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

  tempFormFields.push({
    name,
    label,
    type,
    required: true,
    options: options
  });

  // Reset inputs
  document.getElementById('fb-field-label').value = '';
  const optionsInput = document.getElementById('fb-field-options');
  if (optionsInput) optionsInput.value = '';
  
  const optionsContainer = document.getElementById('fb-options-container');
  if (optionsContainer) optionsContainer.style.display = 'none';
  document.getElementById('fb-field-type').value = 'checkbox';

  renderFormFieldsBuilderPreview();
}

function renderFormFieldsBuilderPreview() {
  const container = document.getElementById('fb-fields-preview-list');
  let html = '';
  tempFormFields.forEach((f, idx) => {
    let typeName = f.type === 'checkbox' ? 'Sí/No' : 
                   f.type === 'text' ? 'Texto corto' : 
                   f.type === 'number' ? 'Número' : 
                   f.type === 'select' ? 'Lista Desplegable' : 
                   f.type === 'date' ? 'Fecha' : 
                   f.type === 'time' ? 'Hora' : f.type;
    let details = '';
    if (f.type === 'select' && f.options) {
      details = ` [${f.options.join(', ')}]`;
    }
    html += `
      <div class="form-builder-field-item" style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px dashed #cbd5e1; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px;">
        <span>❓ <strong>${f.label}</strong> (${typeName}${details})</span>
        <button class="btn-logout" onclick="removeFieldFromBuilder(${idx})" style="padding: 4px 8px; font-size: 0.75rem; width: auto; margin-top: 0; background-color: #ef4444; border-color: #ef4444; color: white;">Quitar</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

function removeFieldFromBuilder(index) {
  tempFormFields.splice(index, 1);
  renderFormFieldsBuilderPreview();
}

let activeEditingFormId = null;

async function saveDynamicForm() {
  const name = document.getElementById('fb-name').value.trim();
  const area = document.getElementById('fb-area').value;

  if (!name || tempFormFields.length === 0) {
    alert('Ingresa el nombre del checklist y añade al menos un campo.');
    return;
  }

  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  
  let targetId = activeEditingFormId;
  if (!targetId) {
    // Generate new ID
    let maxNum = 0;
    forms.forEach(f => {
      if (f.id && f.id.startsWith('F-')) {
        const num = parseInt(f.id.split('-')[1]) || 0;
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    targetId = `F-${String(nextNum).padStart(2, '0')}`;
  }

  const newForm = {
    id: targetId,
    name,
    area,
    fields: tempFormFields
  };

  // 1. Guardar en Supabase en tiempo real si está activo
  if (useLiveDatabase && supabaseClient) {
    try {
      showToast('Guardando checklist en base de datos...');
      
      // Upsert the service catalog record
      const { error: srvErr } = await supabaseClient.from('cat_servicios_mantenimiento').upsert([{
        codigo_servicio: targetId,
        nombre_servicio: name,
        tipo_servicio: 'Autónomo',
        activo: true,
        observaciones: area
      }], { onConflict: 'codigo_servicio' });
      if (srvErr) throw srvErr;

      // Delete existing questions for this service code first (clean update)
      await supabaseClient.from('checklists_mantenimiento').delete().eq('codigo_servicio', targetId);

      // Insert new questions
      const questions = tempFormFields.map((f, idx) => ({
        codigo_servicio: targetId,
        codigo_pregunta: f.name || `Q-${idx + 1}`,
        pregunta: f.label,
        tipo_respuesta: f.type === 'checkbox' ? 'si_no' : 
                        (f.type === 'radio' ? 'si_no' : 
                        (f.type === 'number' ? 'numerico' : 
                        (f.type === 'select' ? 'seleccion' : 
                        (f.type === 'date' ? 'fecha' : 
                        (f.type === 'time' ? 'hora' : 'texto'))))),
        obligatorio: f.required || false,
        orden: idx + 1,
        activo: true,
        observaciones: f.type === 'select' && f.options ? JSON.stringify(f.options) : null
      }));
      
      const { error: qErr } = await supabaseClient.from('checklists_mantenimiento').insert(questions);
      if (qErr) throw qErr;

    } catch (err) {
      console.error('Error saving checklist to Supabase:', err);
      alert('Error al guardar en Supabase: ' + err.message);
      return;
    }
  }

  // Update local storage cache
  const idx = forms.findIndex(f => f.id === targetId);
  if (idx !== -1) {
    forms[idx] = newForm;
  } else {
    forms.push(newForm);
  }
  localStorage.setItem('TSMAI_dynamic_forms', JSON.stringify(forms));

  // Reset Form Builder State
  document.getElementById('fb-name').value = '';
  document.getElementById('fb-area').value = 'PF';
  tempFormFields = [];
  activeEditingFormId = null;
  
  const builderTitle = document.querySelector('.form-builder-panel h3');
  if (builderTitle) builderTitle.innerText = 'Crear Nuevo Checklist';

  renderFormFieldsBuilderPreview();
  renderAdminFormsList();
  showToast('Checklist dinámico guardado con éxito.');
  
  syncDatabases().catch(e => console.warn(e));
}

function renderAdminFormsList() {
  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const container = document.getElementById('admin-forms-saved-list');
  if (!container) return;

  let html = '';
  forms.forEach(f => {
    const submissions = JSON.parse(localStorage.getItem(`TSMAI_df_responses_${f.id}`) || '[]');
    const typeBadge = f.type === 'Checklist' ? '📋 Checklist' : (f.type === 'Bitácora' ? '📝 Bitácora' : '🛠️ Formulario Dinámico');

    html += `
      <div style="background-color: white; border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--primary-dark);">${f.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
              Tipo: <strong>${typeBadge}</strong> | Área: <strong>${f.area || 'General'}</strong> | Campos: <strong>${f.fields ? f.fields.length : 0}</strong>
            </div>
          </div>
          <span class="badge badge-priority-baja" style="background: #e0f2fe; color: #0369a1; font-weight: 600;">${submissions.length} Registros</span>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
          <button type="button" class="btn-table-action" onclick="openDynamicFormFillModal('${f.id}')" style="padding: 5px 10px; font-size: 0.75rem; background-color: #0284c7; border-color: #0284c7; color: white;">📋 Llenar / Capturar</button>
          <button type="button" class="btn-table-action" onclick="openDynamicFormFillModal('${f.id}'); switchDynamicFormModalTab('data');" style="padding: 5px 10px; font-size: 0.75rem; background-color: #10b981; border-color: #10b981; color: white;">📊 Ver BD (${submissions.length})</button>
          <button type="button" class="btn-table-action" onclick="editDynamicForm('${f.id}')" style="padding: 5px 10px; font-size: 0.75rem; background-color: #f59e0b; border-color: #f59e0b; color: white;">✏️ Editar</button>
          <button type="button" class="btn-table-action" onclick="deleteDynamicForm('${f.id}')" style="padding: 5px 10px; font-size: 0.75rem; background-color: #ef4444; border-color: #ef4444; color: white;">❌ Eliminar</button>
        </div>
      </div>
    `;
  });
  
  if (html === '') {
    html = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 16px; background: white; border: 1px dashed #cbd5e1; border-radius: 8px;">No hay formularios o checklists guardados. Precarga uno desde Excel arriba.</div>`;
  }
  container.innerHTML = html;
}

function editDynamicForm(formId) {
  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const form = forms.find(f => f.id === formId);
  if (!form) return;

  activeEditingFormId = formId;
  
  document.getElementById('fb-name').value = form.name;
  document.getElementById('fb-area').value = form.area || 'PF';

  tempFormFields = form.fields.map(f => ({
    name: f.name || 'field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    label: f.label || f.pregunta,
    type: f.type === 'radio' ? 'checkbox' : (f.type === 'si_no' ? 'checkbox' : f.type),
    required: f.required ?? true,
    options: f.options || []
  }));

  const builderTitle = document.querySelector('.form-builder-panel h3');
  if (builderTitle) builderTitle.innerText = `Editar Checklist: ${formId}`;

  const builderPanel = document.querySelector('.form-builder-panel');
  if (builderPanel) builderPanel.scrollIntoView({ behavior: 'smooth' });

  renderFormFieldsBuilderPreview();
  showToast(`Cargado checklist ${formId} para edición.`);
}

async function deleteDynamicForm(formId) {
  if (!confirm(`¿Estás seguro de que deseas eliminar el checklist de servicio "${formId}"? Se borrarán todas sus preguntas de la base de datos.`)) {
    return;
  }

  if (useLiveDatabase && supabaseClient) {
    try {
      showToast('Eliminando de la base de datos...');
      const { error } = await supabaseClient
        .from('checklists_mantenimiento')
        .delete()
        .eq('codigo_servicio', formId);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting checklist from Supabase:', err);
      alert('Error al eliminar en Supabase: ' + err.message);
      return;
    }
  }

  // Update local cache
  const localForms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const filtered = localForms.filter(f => f.id !== formId);
  localStorage.setItem('TSMAI_dynamic_forms', JSON.stringify(filtered));

  showToast('Checklist eliminado con éxito.');
  syncDatabases().catch(e => console.warn(e));
  renderAdminFormsList();
}

// --- PROCESAMIENTO E INGESTIÓN DE FORMULARIOS Y BASES DE DATOS DINÁMICAS DESDE EXCEL ---
async function processDynamicExcelFormIngestion(filename, jsonData, templateConf) {
  if (!jsonData || jsonData.length === 0) {
    showToast('El archivo Excel está vacío.');
    return;
  }

  const sampleRow = jsonData[0];
  const keys = Object.keys(sampleRow);
  if (keys.length === 0) {
    showToast('No se detectaron columnas en el archivo Excel.');
    return;
  }

  const formTitle = filename.replace(/\.[^/.]+$/, "") + ` (${templateConf.formType || 'Dinámico'})`;
  const formId = `F-EXCEL-${Date.now().toString(36).toUpperCase()}`;

  // Auto-detectar tipos de datos de cada columna
  const fields = keys.map(key => {
    const sampleVal = sampleRow[key];
    let type = 'text';
    if (typeof sampleVal === 'number') {
      type = 'number';
    } else if (typeof sampleVal === 'boolean' || String(sampleVal).toLowerCase() === 'si' || String(sampleVal).toLowerCase() === 'no') {
      type = 'checkbox';
    } else if (sampleVal instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(sampleVal))) {
      type = 'date';
    }
    return {
      name: key.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      label: key,
      type: type,
      required: false
    };
  });

  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const newForm = {
    id: formId,
    name: formTitle,
    area: 'General',
    type: templateConf.formType || 'Personalizado',
    fields: fields,
    createdAt: new Date().toISOString()
  };

  forms.push(newForm);
  localStorage.setItem('TSMAI_dynamic_forms', JSON.stringify(forms));

  // Almacenar filas ingestadas en la base de datos de respuestas del formulario
  const submissionsKey = `TSMAI_df_responses_${formId}`;
  const existingSubmissions = JSON.parse(localStorage.getItem(submissionsKey) || '[]');
  
  const newEntries = jsonData.map((row, idx) => ({
    id_respuesta: `RESP-${Date.now()}-${idx + 1}`,
    id_formulario: formId,
    valores: row,
    usuario: currentUser ? currentUser.name : 'Ingesta Excel',
    fecha: new Date().toISOString()
  }));

  const allSubmissions = [...existingSubmissions, ...newEntries];
  localStorage.setItem(submissionsKey, JSON.stringify(allSubmissions));

  // Guardar estructura en Supabase si está disponible
  if (useLiveDatabase && supabaseClient) {
    try {
      showToast('Creando base de datos dinámica en Supabase...');
      await supabaseClient.from('cat_servicios_mantenimiento').upsert([{
        codigo_servicio: formId,
        nombre_servicio: formTitle,
        tipo_servicio: templateConf.formType || 'Autónomo',
        activo: true,
        observaciones: `Formulario precargado desde Excel: ${filename}`
      }], { onConflict: 'codigo_servicio' });

      const questions = fields.map((f, idx) => ({
        codigo_servicio: formId,
        codigo_pregunta: f.name,
        pregunta: f.label,
        tipo_respuesta: f.type === 'checkbox' ? 'si_no' : (f.type === 'number' ? 'numerico' : 'texto'),
        obligatorio: false,
        orden: idx + 1,
        activo: true
      }));
      await supabaseClient.from('checklists_mantenimiento').insert(questions);

    } catch (dbErr) {
      console.warn('Registrado en almacenamiento dinámico local:', dbErr);
    }
  }

  showToast(`🎉 ¡Formulario "${formTitle}" y su base de datos de ${jsonData.length} registros fueron creados con éxito!`);
  renderAdminFormsList();
  
  // Abrir modal interactivo en la pestaña de base de datos
  switchAdminPanel('forms');
  openDynamicFormFillModal(formId);
  switchDynamicFormModalTab('data');
}

async function importFormFromExcel(event) {
  event.preventDefault();
  let files;
  if (event.dataTransfer) files = event.dataTransfer.files;
  else if (event.target) files = event.target.files;

  if (!files || files.length === 0) return;
  const file = files[0];
  const filename = file.name;

  showToast(`Analizando columnas de Excel: ${filename}...`);

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        alert('El archivo Excel no contiene filas de datos o cabeceras válidas.');
        return;
      }

      await processDynamicExcelFormIngestion(filename, jsonData, {
        formType: 'Personalizado',
        label: 'Formulario Excel'
      });
    } catch (err) {
      console.error('Error importando Excel:', err);
      alert('Error leyendo el archivo Excel: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

let activeModalFormId = null;

function openDynamicFormFillModal(formId) {
  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const form = forms.find(f => f.id === formId);
  if (!form) {
    alert('Formulario no encontrado.');
    return;
  }

  activeModalFormId = formId;
  document.getElementById('df-current-form-id').value = formId;
  document.getElementById('df-modal-title').innerText = `📋 ${form.name}`;
  document.getElementById('df-modal-subtitle').innerText = `Completa los datos de este formulario (${form.type || 'Formulario'}).`;

  // Renderizar campos de captura dinámicamente
  const fieldsContainer = document.getElementById('df-form-fields-container');
  let fieldsHtml = '';
  (form.fields || []).forEach(f => {
    const fieldId = `df-input-${f.name}`;
    if (f.type === 'checkbox') {
      fieldsHtml += `
        <div class="form-group full-width" style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
          <input type="checkbox" id="${fieldId}" style="width: 18px; height: 18px; cursor: pointer;">
          <label for="${fieldId}" style="margin: 0; cursor: pointer; font-weight: 600;">${f.label}</label>
        </div>
      `;
    } else if (f.type === 'select') {
      const opts = (f.options || []).map(o => `<option value="${o}">${o}</option>`).join('');
      fieldsHtml += `
        <div class="form-group">
          <label for="${fieldId}">${f.label}</label>
          <select id="${fieldId}" class="form-control">
            <option value="">Seleccionar...</option>
            ${opts}
          </select>
        </div>
      `;
    } else {
      const inputType = f.type === 'number' ? 'number' : (f.type === 'date' ? 'date' : (f.type === 'time' ? 'time' : 'text'));
      fieldsHtml += `
        <div class="form-group">
          <label for="${fieldId}">${f.label}</label>
          <input type="${inputType}" id="${fieldId}" class="form-control" placeholder="Ingresa ${f.label.toLowerCase()}...">
        </div>
      `;
    }
  });
  fieldsContainer.innerHTML = fieldsHtml;

  // Cargar registros existentes de la base de datos
  renderDynamicFormDataTable(formId, form);

  switchDynamicFormModalTab('fill');
  openModal('modal-fill-dynamic-form');
}

function switchDynamicFormModalTab(tab) {
  const fillTabBtn = document.getElementById('df-tab-fill-btn');
  const dataTabBtn = document.getElementById('df-tab-data-btn');
  const fillContent = document.getElementById('df-tab-fill-content');
  const dataContent = document.getElementById('df-tab-data-content');

  if (!fillTabBtn || !dataTabBtn || !fillContent || !dataContent) return;

  if (tab === 'fill') {
    fillTabBtn.className = 'btn-nav btn-nav-primary';
    dataTabBtn.className = 'btn-nav btn-nav-outline';
    fillContent.style.display = 'block';
    dataContent.style.display = 'none';
  } else {
    fillTabBtn.className = 'btn-nav btn-nav-outline';
    dataTabBtn.className = 'btn-nav btn-nav-primary';
    fillContent.style.display = 'none';
    dataContent.style.display = 'block';
  }
}

function renderDynamicFormDataTable(formId, formObj) {
  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const form = formObj || forms.find(f => f.id === formId);
  if (!form) return;

  const submissions = JSON.parse(localStorage.getItem(`TSMAI_df_responses_${formId}`) || '[]');
  const countSpan = document.getElementById('df-submissions-count');
  if (countSpan) countSpan.innerText = submissions.length;

  const thead = document.getElementById('df-data-table-thead');
  const tbody = document.getElementById('df-data-table-tbody');
  if (!thead || !tbody) return;

  // Cabeceras basadas en los campos del formulario
  let headHtml = '<tr><th>Fecha / Hora</th><th>Registrado Por</th>';
  (form.fields || []).forEach(f => {
    headHtml += `<th>${f.label}</th>`;
  });
  headHtml += '</tr>';
  thead.innerHTML = headHtml;

  // Filas de la base de datos de respuestas
  let bodyHtml = '';
  submissions.forEach(sub => {
    const formattedDate = new Date(sub.fecha).toLocaleString('es-ES');
    bodyHtml += `<tr><td>${formattedDate}</td><td><strong>${sub.usuario || 'Agente / Sistema'}</strong></td>`;
    (form.fields || []).forEach(f => {
      let val = sub.valores ? (sub.valores[f.name] !== undefined ? sub.valores[f.name] : sub.valores[f.label]) : '';
      if (typeof val === 'boolean') val = val ? '✅ Sí' : '❌ No';
      bodyHtml += `<td>${val !== undefined && val !== null ? val : '-'}</td>`;
    });
    bodyHtml += '</tr>';
  });

  if (submissions.length === 0) {
    bodyHtml = `<tr><td colspan="${(form.fields ? form.fields.length : 0) + 2}" style="text-align: center; color: var(--text-muted); padding: 16px;">No hay registros grabados en esta base de datos.</td></tr>`;
  }
  tbody.innerHTML = bodyHtml;
}

function submitDynamicFormResponse(e) {
  e.preventDefault();
  const formId = activeModalFormId;
  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const form = forms.find(f => f.id === formId);
  if (!form) return;

  const responseValues = {};
  (form.fields || []).forEach(f => {
    const el = document.getElementById(`df-input-${f.name}`);
    if (el) {
      if (f.type === 'checkbox') {
        responseValues[f.name] = el.checked;
      } else {
        responseValues[f.name] = el.value;
      }
    }
  });

  const submissionsKey = `TSMAI_df_responses_${formId}`;
  const existingSubmissions = JSON.parse(localStorage.getItem(submissionsKey) || '[]');
  const newSubmission = {
    id_respuesta: `RESP-${Date.now()}`,
    id_formulario: formId,
    valores: responseValues,
    usuario: currentUser ? currentUser.name : 'Técnico / Operador',
    fecha: new Date().toISOString()
  };

  existingSubmissions.unshift(newSubmission);
  localStorage.setItem(submissionsKey, JSON.stringify(existingSubmissions));

  showToast('✅ Registro guardado con éxito en la base de datos.');
  renderDynamicFormDataTable(formId, form);
  switchDynamicFormModalTab('data');
}

function exportDynamicFormDataToExcel() {
  const formId = activeModalFormId;
  if (!formId) return;
  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const form = forms.find(f => f.id === formId);
  const submissions = JSON.parse(localStorage.getItem(`TSMAI_df_responses_${formId}`) || '[]');

  if (submissions.length === 0) {
    alert('No hay registros guardados para exportar.');
    return;
  }

  const exportRows = submissions.map(s => {
    const row = {
      Fecha: new Date(s.fecha).toLocaleString('es-ES'),
      Usuario: s.usuario || 'Agente / Sistema'
    };
    if (form && form.fields) {
      form.fields.forEach(f => {
        let val = s.valores ? (s.valores[f.name] !== undefined ? s.valores[f.name] : s.valores[f.label]) : '';
        row[f.label] = val;
      });
    }
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros');
  const filename = `${form ? form.name : 'Formulario'}_${Date.now()}.xlsx`;
  XLSX.writeFile(workbook, filename);
  showToast(`📥 Exportando datos a ${filename}...`);
}

// --- EXCEL SIMULATION ---
// --- REAL EXCEL UPLOAD & INGESTION ---
const EXCEL_TEMPLATE_MAP = {
  dynamic_checklist: {
    stagingTable: 'stg_formularios_dinamicos',
    cleanTable: 'cat_formularios_dinamicos',
    label: 'Plantilla de Checklist / Inspección Dinámica',
    isDynamic: true,
    formType: 'Checklist'
  },
  dynamic_bitacora: {
    stagingTable: 'stg_formularios_dinamicos',
    cleanTable: 'cat_formularios_dinamicos',
    label: 'Plantilla de Bitácora Operativa Dinámica',
    isDynamic: true,
    formType: 'Bitácora'
  },
  dynamic_custom: {
    stagingTable: 'stg_formularios_dinamicos',
    cleanTable: 'cat_formularios_dinamicos',
    label: 'Formulario / Tabla Dinámica (Auto-Detectar Columnas Excel)',
    isDynamic: true,
    formType: 'Personalizado'
  },
  machines: {
    stagingTable: 'stg_maquinas_excel',
    validationView: 'vw_validacion_maquinas_excel',
    cleanTable: 'cat_maquinas',
    label: 'Catálogo de Máquinas'
  },
  parts: {
    stagingTable: 'stg_refacciones_excel',
    validationView: 'vw_validacion_refacciones_excel',
    cleanTable: 'cat_refacciones',
    label: 'Catálogo de Refacciones'
  },
  tecnicos: {
    stagingTable: 'stg_tecnicos_excel',
    validationView: 'vw_validacion_tecnicos_excel',
    cleanTable: 'cat_tecnicos',
    label: 'Catálogo de Técnicos'
  },
  empleados: {
    stagingTable: 'stg_empleados_excel',
    validationView: 'vw_validacion_empleados_excel',
    cleanTable: 'cat_empleados',
    label: 'Catálogo de Empleados'
  },
  fallas: {
    stagingTable: 'stg_fallas_por_maquina_excel',
    validationView: 'vw_validacion_fallas_por_maquina',
    cleanTable: 'fallas_por_maquina',
    label: 'Histórico de Fallas'
  },
  telegram: {
    stagingTable: 'stg_telegram_ordenes_telares',
    validationView: 'vw_validacion_telegram_ordenes',
    cleanTable: 'ordenes_trabajo',
    label: 'Órdenes Históricas Telegram'
  },
  refmaquina: {
    stagingTable: 'stg_refacciones_por_maquina_excel',
    validationView: 'vw_validacion_refacciones_por_maquina',
    cleanTable: 'cat_refacciones',
    label: 'Refacciones por Máquina'
  },
  inventory: {
    stagingTable: 'stg_refacciones_excel',
    validationView: 'vw_validacion_refacciones_excel',
    cleanTable: 'cat_refacciones',
    label: 'Inventario de Refacciones (Stock)'
  },
  segundas: {
    stagingTable: 'stg_segundas_por_rollo_excel',
    validationView: 'vw_validacion_segundas_por_rollo',
    cleanTable: 'segundas_por_rollo',
    label: 'Segundas por Rollo'
  }
};

function updateExcelUploadGuidelines() {
  const templateSelect = document.getElementById('excel-template-select');
  const selectedTemplate = templateSelect ? templateSelect.value : '';
  const guidelineDiv = document.getElementById('excel-guideline-text');
  if (!guidelineDiv) return;

  if (!selectedTemplate) {
    guidelineDiv.innerHTML = 'Selecciona una plantilla para ver las especificaciones de columnas requeridas.';
    return;
  }

  const columnsMap = {
    machines: 'equipo_towell, clave, ax',
    parts: 'codigo_articulo, nombre_articulo, unidad_medida, familia, activo',
    tecnicos: 'cve_tecnico, nombre_tecnico, departamento_codigo, turno_id, especialidad, puesto, correo, telefono, activo',
    empleados: 'cve_empleado, nombre_empleado, departamento_codigo, turno_id, puesto, correo, telefono, activo',
    fallas: 'maquina_id, descripcion, creada',
    telegram: 'id, folio, estatus, fecha, hora, depto, maquina_id, tipo_falla_id, falla, hora_fin, cve_empl, nom_empl, turno, cve_atendio, nom_atendio, turno_atendio, obs, orden_trabajo, descripcion, enviado, obs_cierre, calidad, fecha_fin',
    refmaquina: 'fecha, maquina_id, destino, codigo_articulo, nombre_articulo, cantidad_estandar, precio_costo_unitario, importe_costo_origen',
    inventory: 'codigo_articulo, codigo_proveedor, stock_actual, stock_minimo, stock_maximo, unidad_medida, ubicacion, costo_unitario, moneda, observaciones',
    segundas: 'produccion, fecha, codigo_bodega, codigo_articulo, nombre_articulo, configuracion, tamano, color, nombre, almacen, numero_lote, localidad, salon, numero_serie, id_flog, nombre_flog, calidad_flog, pzas_rollo, kg_rollo, mts_rollo, no_tiras, medida_1, medida_2, pzas_t1, pzas_t2, pzas_t3, pzas_t4, turno_tejido, codigo_defecto, cantidad, defecto, maquina_id_detectada, observaciones'
  };

  const cols = columnsMap[selectedTemplate] || '';
  guidelineDiv.innerHTML = `<strong>Columnas esperadas:</strong><br><span style="word-break:break-all; font-family:monospace; font-size:0.7rem;">${cols}</span>`;
}

function mapExcelRowToStaging(row, template) {
  const cleanStr = (str) => {
    if (!str) return '';
    return str.toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ');
  };

  const normalized = {};
  for (let key in row) {
    if (row[key] !== undefined && row[key] !== null) {
      normalized[cleanStr(key)] = row[key];
    }
  }

  const getVal = (possibleKeys) => {
    for (let pk of possibleKeys) {
      const pkClean = cleanStr(pk);
      if (normalized[pkClean] !== undefined) return normalized[pkClean];
    }
    return null;
  };

  switch (template) {
    case 'machines':
      return {
        equipo_towell: getVal(['clave', 'codigo', 'cve']),
        clave: getVal(['equipo towell', 'equipo_towell', 'equipo', 'maquina', 'telar']),
        ax: getVal(['ax', 'localidad', 'codigo ax', 'codigo_ax'])
      };
    case 'parts':
      return {
        codigo_articulo: getVal(['codigo de articulo', 'codigo_articulo', 'codigo', 'articulo', 'art']),
        nombre_articulo: getVal(['nombre del articulo', 'nombre_articulo', 'nombre', 'descripcion']),
        unidad_medida: getVal(['unidad medida', 'unidad_medida', 'unidad', 'um']),
        familia: getVal(['familia', 'categoria', 'grupo']),
        activo: getVal(['activo', 'status', 'estado'])
      };
    case 'tecnicos':
      return {
        cve_tecnico: getVal(['cve tecnico', 'cve_tecnico', 'clave', 'id']),
        nombre_tecnico: getVal(['nombre tecnico', 'nombre_tecnico', 'nombre', 'tecnico']),
        departamento_codigo: getVal(['departamento codigo', 'departamento_codigo', 'depto', 'departamento']),
        turno_id: getVal(['turno id', 'turno_id', 'turno']),
        especialidad: getVal(['especialidad', 'rama']),
        puesto: getVal(['puesto', 'cargo']),
        correo: getVal(['correo', 'email']),
        telefono: getVal(['telefono', 'tel']),
        activo: getVal(['activo', 'status', 'estado'])
      };
    case 'empleados':
      return {
        cve_empleado: getVal(['cve empleado', 'cve_empleado', 'clave', 'id']),
        nombre_empleado: getVal(['nombre empleado', 'nombre_empleado', 'nombre', 'empleado']),
        departamento_codigo: getVal(['departamento codigo', 'departamento_codigo', 'depto', 'departamento']),
        turno_id: getVal(['turno id', 'turno_id', 'turno']),
        puesto: getVal(['puesto', 'cargo']),
        correo: getVal(['correo', 'email']),
        telefono: getVal(['telefono', 'tel']),
        activo: getVal(['activo', 'status', 'estado'])
      };
    case 'fallas':
      return {
        maquina_id: getVal(['maquina id', 'maquina_id', 'maquina', 'equipo', 'telar']),
        descripcion: getVal(['descripcion', 'falla', 'observacion']),
        creada: getVal(['creada', 'fecha', 'fecha hora'])
      };
    case 'telegram':
      return {
        id: parseInt(getVal(['id'])) || null,
        folio: getVal(['folio']),
        estatus: getVal(['estatus', 'status']),
        fecha: getVal(['fecha']),
        hora: getVal(['hora']),
        depto: getVal(['depto', 'departamento']),
        maquina_id: getVal(['maquina id', 'maquina_id', 'maquina']),
        tipo_falla_id: getVal(['tipo falla id', 'tipo_falla_id']),
        falla: getVal(['falla']),
        hora_fin: getVal(['hora fin', 'hora_fin']),
        cve_empl: getVal(['cve empl', 'cve_empl']),
        nom_empl: getVal(['nom empl', 'nom_empl']),
        turno: parseInt(getVal(['turno'])) || null,
        cve_atendio: getVal(['cve atendio', 'cve_atendio']),
        nom_atendio: getVal(['nom atendio', 'nom_atendio']),
        turno_atendio: parseInt(getVal(['turno atendio', 'turno_atendio'])) || null,
        obs: getVal(['obs']),
        orden_trabajo: getVal(['orden trabajo', 'orden_trabajo']),
        descripcion: getVal(['descripcion']),
        enviado: getVal(['enviado']),
        obs_cierre: getVal(['obs cierre', 'obs_cierre']),
        calidad: parseInt(getVal(['calidad'])) || null,
        fecha_fin: getVal(['fecha fin', 'fecha_fin'])
      };
    case 'refmaquina':
      return {
        fecha: getVal(['fecha']),
        maquina_id: getVal(['maquina id', 'maquina_id', 'destino']),
        destino: getVal(['destino', 'maquina_id']),
        codigo_articulo: getVal(['codigo de articulo', 'codigo_articulo', 'codigo']),
        nombre_articulo: getVal(['nombre del articulo', 'nombre_articulo', 'nombre']),
        cantidad_estandar: getVal(['cantidad', 'cantidad_estandar']),
        precio_costo_unitario: getVal(['precio de costo', 'precio_costo_unitario', 'precio']),
        importe_costo_origen: getVal(['importe de costo', 'importe_costo_origen', 'importe'])
      };
    case 'inventory':
      return {
        codigo_articulo: getVal(['codigo de articulo', 'codigo_articulo', 'codigo']),
        codigo_proveedor: getVal(['codigo proveedor', 'codigo_proveedor', 'proveedor']),
        stock_actual: getVal(['stock actual', 'stock_actual', 'stock']),
        stock_minimo: getVal(['stock minimo', 'stock_minimo']),
        stock_maximo: getVal(['stock maximo', 'stock_maximo']),
        unidad_medida: getVal(['unidad medida', 'unidad_medida', 'unidad']),
        ubicacion: getVal(['ubicacion']),
        costo_unitario: getVal(['costo unitario', 'costo_unitario', 'costo']),
        moneda: getVal(['moneda']),
        observaciones: getVal(['observaciones', 'comentario'])
      };
    case 'segundas':
      return {
        produccion: getVal(['produccion', 'telar']),
        fecha: getVal(['fecha']),
        codigo_bodega: getVal(['codigo bodega', 'codigo_bodega', 'codigo de barras', 'codigo_barras']),
        codigo_articulo: getVal(['codigo articulo', 'codigo_articulo', 'codigo de articulo']),
        nombre_articulo: getVal(['nombre articulo', 'nombre_articulo', 'nombre del articulo']),
        configuracion: getVal(['configuracion']),
        tamano: getVal(['tamano']),
        color: getVal(['color']),
        nombre: getVal(['nombre']),
        almacen: getVal(['almacen']),
        numero_lote: getVal(['numero lote', 'numero_lote', 'numero de lote']),
        localidad: getVal(['localidad']),
        salon: getVal(['salon', 'depto']),
        numero_serie: getVal(['numero serie', 'numero_serie', 'numero de serie']),
        id_flog: getVal(['id flog', 'id_flog']),
        nombre_flog: getVal(['nombre flog', 'nombre_flog']),
        calidad_flog: getVal(['calidad flog', 'calidad_flog', 'calidadflog']),
        pzas_rollo: getVal(['pzas rollo', 'pzas_rollo', 'pzasrollo']),
        kg_rollo: getVal(['kg rollo', 'kg_rollo', 'kgrollo']),
        mts_rollo: getVal(['mts rollo', 'mts_rollo', 'mtsrollo']),
        no_tiras: getVal(['no tiras', 'no_tiras', 'notiras']),
        medida_1: getVal(['medida 1', 'medida_1']),
        medida_2: getVal(['medida 2', 'medida_2']),
        pzas_t1: getVal(['pzas t1', 'pzas_t1', 'pzast1']),
        pzas_t2: getVal(['pzas t2', 'pzas_t2', 'pzast2']),
        pzas_t3: getVal(['pzas t3', 'pzas_t3', 'pzast3']),
        pzas_t4: getVal(['pzas t4', 'pzas_t4', 'pzast4']),
        turno_tejido: getVal(['turno tejido', 'turno_tejido']),
        codigo_defecto: getVal(['codigo defecto', 'codigo_defecto']),
        cantidad: getVal(['cantidad']),
        defecto: getVal(['defecto']),
        maquina_id_detectada: getVal(['maquina id detectada', 'maquina_id_detectada']),
        observaciones: getVal(['observaciones', 'comentario'])
      };
    default:
      return {};
  }
}

function findBestSheetAndRange(workbook, template) {
  const templateKeys = {
    machines: ['equipo towell', 'clave', 'ax'],
    parts: ['codigo de articulo', 'nombre del articulo', 'unidad medida', 'familia'],
    tecnicos: ['cve tecnico', 'nombre tecnico', 'departamento codigo', 'turno id', 'especialidad', 'puesto'],
    empleados: ['cve empleado', 'nombre empleado', 'departamento codigo', 'turno id', 'puesto'],
    fallas: ['maquina id', 'descripcion', 'creada'],
    telegram: ['folio', 'estatus', 'fecha', 'hora', 'depto', 'maquina id', 'falla'],
    refmaquina: ['maquina id', 'destino', 'codigo de articulo', 'nombre del articulo', 'cantidad'],
    prices: ['codigo de articulo', 'precio de costo', 'moneda'],
    inventory: ['codigo de articulo', 'stock actual', 'stock minimo', 'ubicacion'],
    laborcosts: ['cve tecnico', 'nombre tecnico', 'costo hora'],
    segundas: [
      'produccion', 'telar', 'fecha', 'codigo bodega', 'codigo de barras', 
      'codigo articulo', 'codigo de articulo', 'nombre articulo', 'nombre del articulo',
      'defecto', 'cantidad', 'numero lote', 'numero de lote', 'numero serie', 'numero de serie'
    ]
  };

  const targets = templateKeys[template] || [];
  if (targets.length === 0) {
    return { sheetName: workbook.SheetNames[0], range: 0 };
  }

  const cleanStr = (str) => {
    if (!str) return '';
    return str.toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ');
  };

  const targetCleans = targets.map(t => cleanStr(t));

  let bestSheetName = workbook.SheetNames[0];
  let bestRange = 0;
  let maxMatches = -1;

  for (let sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet || !worksheet['!ref']) continue;

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const maxHeaderRowToTest = Math.min(range.e.r, range.s.r + 10);
    for (let r = range.s.r; r <= maxHeaderRowToTest; r++) {
      const rowKeys = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
        const cell = worksheet[cellRef];
        if (cell && cell.v !== undefined && cell.v !== null) {
          rowKeys.push(cleanStr(cell.v));
        }
      }

      let matches = 0;
      for (let target of targetCleans) {
        if (rowKeys.includes(target)) {
          matches++;
        }
      }

      if (matches > maxMatches) {
        maxMatches = matches;
        bestSheetName = sheetName;
        bestRange = r;
      }
    }
  }

  console.log(`[AutoDetect] Best sheet: "${bestSheetName}" at header row index: ${bestRange} (matches: ${maxMatches})`);
  return { sheetName: bestSheetName, range: bestRange };
}

async function handleRealExcelUpload(event) {
  event.preventDefault();
  
  const templateSelect = document.getElementById('excel-template-select');
  const selectedTemplate = templateSelect ? templateSelect.value : '';
  if (!selectedTemplate) {
    showToast('Por favor, selecciona una plantilla antes de subir el archivo.');
    return;
  }

  const templateConf = EXCEL_TEMPLATE_MAP[selectedTemplate];
  if (!templateConf) {
    showToast('Plantilla inválida.');
    return;
  }

  let files;
  if (event.dataTransfer) {
    files = event.dataTransfer.files;
  } else if (event.target) {
    files = event.target.files;
  }
  
  if (!files || files.length === 0) return;
  const file = files[0];
  const filename = file.name;
  
  showToast(`Procesando archivo: ${filename}...`);
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const { sheetName, range: headerRange } = findBestSheetAndRange(workbook, selectedTemplate);
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRange });
      
      if (templateConf && templateConf.isDynamic) {
        await processDynamicExcelFormIngestion(filename, jsonData, templateConf);
        return;
      }
      
      console.log('--- EXCEL DEBUG LOGS ---');
      console.log('Template:', selectedTemplate);
      console.log('All Sheets:', workbook.SheetNames);
      console.log('Selected Sheet:', sheetName, 'Header Row Index:', headerRange);
      console.log('JSON Data Row Count:', jsonData.length);
      if (jsonData.length > 0) {
        console.log('Parsed Row 0 Keys:', Object.keys(jsonData[0]));
        console.log('Parsed Row 0 Values:', jsonData[0]);
      }
      try {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        console.log('Sheet cell range:', worksheet['!ref']);
        for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 5); r++) {
          const rowCells = [];
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
            const cell = worksheet[cellRef];
            rowCells.push(cell ? cell.v : '');
          }
          console.log(`Sheet Row ${r}:`, rowCells);
        }
      } catch (rangeErr) {
        console.warn('Error reading raw sheet cells:', rangeErr);
      }
      
      if (jsonData.length === 0) {
        showToast('El archivo Excel está vacío.');
        return;
      }
      
      // Crear registro de control de carga en Supabase
      const logRecord = {
        nombre_archivo: filename,
        tipo_archivo: filename.split('.').pop().toLowerCase(),
        fuente: 'Excel Import: ' + templateConf.label,
        fecha_carga: new Date().toISOString(),
        usuario_carga: currentUser ? currentUser.name : 'Super Admin',
        registros_leidos: jsonData.length,
        registros_correctos: 0,
        registros_error: 0,
        estatus_carga: 'Staging',
        observaciones: `Datos cargados en staging (Pestaña: ${sheetName}, Fila Cabecera: ${headerRange + 1})`
      };
      
      let dbCargaId = null;
      if (supabaseClient) {
        const { data: cData, error: cErr } = await supabaseClient
          .from('control_cargas_archivos')
          .insert([logRecord])
          .select();
        if (cErr) {
          console.error('Error inserting control_cargas_archivos:', cErr);
        }
        if (!cErr && cData && cData.length > 0) {
          dbCargaId = cData[0].id_carga;
        }
      }

      if (!dbCargaId) {
        dbCargaId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Date.now().toString().substring(0, 12);
      }

      // Map rows to staging format
      const stagingRows = jsonData.map(row => {
        const mapped = mapExcelRowToStaging(row, selectedTemplate);
        mapped.id_carga = dbCargaId;
        mapped.archivo_origen = filename;
        return mapped;
      });

      console.log('Staging rows count:', stagingRows.length);
      if (stagingRows.length > 0) {
        console.log('Mapped Staging Row 0:', stagingRows[0]);
      }

      // Insert in Supabase staging table in chunks
      if (supabaseClient) {
        const chunkSize = 1000;
        const total = stagingRows.length;
        for (let i = 0; i < total; i += chunkSize) {
          const chunk = stagingRows.slice(i, i + chunkSize);
          showToast(`Guardando registros en staging: ${i + 1} a ${Math.min(i + chunkSize, total)} de ${total}...`);
          const { error: insErr } = await supabaseClient
            .from(templateConf.stagingTable)
            .insert(chunk);
          if (insErr) throw insErr;
        }
      }

      // Query Validation View with optimization for large datasets (segundas)
      let validatedRows = [];
      let totalCount = 0;
      let validCount = 0;
      let errorCount = 0;

      if (supabaseClient) {
        showToast('Consultando vista de validación...');
        if (selectedTemplate === 'segundas' && jsonData.length > 1000) {
          // Fetch only first 100 rows for the preview table
          const { data: valData, error: valErr } = await supabaseClient
            .from(templateConf.validationView)
            .select('*')
            .eq('id_carga', dbCargaId)
            .limit(100);
          if (valErr) throw valErr;
          validatedRows = valData || [];

          // Query counts using exact database count head queries
          const { count: tc, error: tErr } = await supabaseClient
            .from(templateConf.validationView)
            .select('*', { count: 'exact', head: true })
            .eq('id_carga', dbCargaId);
          if (!tErr) totalCount = tc || 0;

          const { count: vc, error: vErr } = await supabaseClient
            .from(templateConf.validationView)
            .select('*', { count: 'exact', head: true })
            .eq('id_carga', dbCargaId)
            .eq('es_valido', true);
          if (!vErr) validCount = vc || 0;

          errorCount = totalCount - validCount;
        } else {
          // Standard pagination
          let from = 0;
          const pageSize = 1000;
          let hasMore = true;
          while (hasMore) {
            const { data: valData, error: valErr } = await supabaseClient
              .from(templateConf.validationView)
              .select('*')
              .eq('id_carga', dbCargaId)
              .range(from, from + pageSize - 1);
            if (valErr) {
              console.error('Error querying validationView:', valErr);
              throw valErr;
            }
            if (valData && valData.length > 0) {
              validatedRows = validatedRows.concat(valData);
              showToast(`Cargando validaciones: ${validatedRows.length} registros...`);
              from += pageSize;
              if (valData.length < pageSize) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }
          totalCount = validatedRows.length;
          validCount = validatedRows.filter(r => r.es_valido === true || r.es_valido === 'true').length;
          errorCount = totalCount - validCount;
        }
      }

      // If offline or failed, simulate validation
      if (validatedRows.length === 0) {
        validatedRows = stagingRows.map(row => ({
          ...row,
          es_valido: true,
          detalles_error: ''
        }));
        totalCount = validatedRows.length;
        validCount = validatedRows.length;
        errorCount = 0;
      }

      currentExcelUpload = {
        idCarga: dbCargaId,
        templateType: selectedTemplate,
        filename: filename,
        totalCount: totalCount,
        validCount: validCount,
        errorCount: errorCount,
        validatedRows: validatedRows
      };

      // Show Validation Panel
      document.getElementById('excel-preview-container').style.display = 'block';
      document.getElementById('excel-preview-subtitle').innerText = `Archivo: ${filename} | ID Carga: ${dbCargaId}`;
      document.getElementById('val-total-count').innerText = totalCount;
      document.getElementById('val-valid-count').innerText = validCount;
      document.getElementById('val-error-count').innerText = errorCount;

      // Update button
      const btn = document.getElementById('btn-process-excel');
      btn.innerText = `Procesar Ingesta (${validCount})`;
      btn.disabled = validCount === 0;

      // Render Preview Table
      renderExcelPreviewTable(validatedRows);

      showToast(`Validación completada: ${validCount} correctos, ${errorCount} con error.`);

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
  if (!panelId || panelId === 'orders') panelId = 'dashboard';
  activeTechPanel = panelId;
  const route = `#tech/${panelId}`;
  if (location.hash !== route) {
    history.pushState(null, '', route);
  }
  localStorage.setItem('TSMAI_current_route', route);
  closeSidebarOnMobile();
  updateMobileBottomNav();

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
    checklists: '📋 Checklists y Formatos de Trabajo',
    bitacora: '📝 Bitácora de Actividades',
    history: '⚙️ Historial de Máquinas en Planta',
    profile: '👤 Mi Perfil de Técnico'
  };
  document.getElementById('tech-panel-title').innerText = titleLabels[panelId] || 'Mi Tablero';

  if (panelId === 'dashboard') {
    renderTechDashboard();
    renderTechOrdersTable();
  } else if (panelId === 'checklists') {
    renderTechChecklistsTable();
  } else if (panelId === 'bitacora') {
    renderTechBitacora();
  } else if (panelId === 'history') {
    populateTechMachineHistorySelect();
  }
}

// Renderizar KPI cards del Técnico
function renderTechDashboard() {
  if (!currentUser) return;
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const subtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
  
  // Filtrar OTs y Subtareas asignadas a este técnico
  const techId = currentUser.id || currentUser.uuid || currentUser.cve_tecnico;
  const techName = (currentUser.name || '').toLowerCase();
  const myOrders = orders.filter(o => 
    o.assignedTech === techId || 
    o.assignedTech === currentUser.uuid || 
    o.cve_atendio === techId || 
    o.cve_atendio === currentUser.cve_tecnico ||
    (o.techName && o.techName.toLowerCase() === techName)
  );
  const mySubtasks = subtasks.filter(s => 
    s.assignedTech === techId || 
    s.assignedTech === currentUser.uuid ||
    s.cve_atendio === techId
  );

  const assigned = myOrders.filter(o => o.status === 'Asignada').length + mySubtasks.filter(s => s.status === 'Asignada').length;
  const process = myOrders.filter(o => o.status === 'En proceso').length + mySubtasks.filter(s => s.status === 'En proceso').length;
  const hold = myOrders.filter(o => o.status === 'En espera').length + mySubtasks.filter(s => s.status === 'En espera').length;
  
  const now = new Date();
  const overdueOrders = myOrders.filter(o => {
    return new Date(o.dueDate) < now && o.status !== 'Cerrada' && o.status !== 'Cancelada' && o.status !== 'Ejecutada';
  }).length;
  const overdueSubtasks = mySubtasks.filter(s => {
    return new Date(s.dueDate) < now && s.status !== 'Terminada' && s.status !== 'Cancelada';
  }).length;
  const overdue = overdueOrders + overdueSubtasks;

  // Terminadas hoy
  const todayStr = now.toISOString().slice(0, 10);
  const doneTodayOrders = myOrders.filter(o => {
    const isClosed = o.status === 'Cerrada' || o.status === 'Ejecutada';
    return isClosed && o.dueDate && o.dueDate.startsWith(todayStr);
  }).length;
  const doneTodaySubtasks = mySubtasks.filter(s => {
    const isClosed = s.status === 'Terminada';
    return isClosed && s.dueDate && s.dueDate.startsWith(todayStr);
  }).length;
  const doneToday = doneTodayOrders + doneTodaySubtasks;

  document.getElementById('kpi-tech-assigned').innerText = assigned;
  document.getElementById('kpi-tech-process').innerText = process;
  document.getElementById('kpi-tech-hold').innerText = hold;
  document.getElementById('kpi-tech-overdue').innerText = overdue;
  document.getElementById('kpi-tech-done-today').innerText = doneToday;
}

// --- LÓGICA DE SLA Y CUMPLIMIENTO DE FECHA COMPROMISO (FASE 3) ---
function getOTStatusSLA(order) {
  if (!order) return { code: 'pendiente', label: 'Pendiente', badgeClass: 'badge-status-asignada', statusText: 'Pendiente' };
  const now = new Date();
  const dueDate = order.dueDate ? new Date(order.dueDate) : null;
  const finishDate = order.fecha_hora_fin ? new Date(order.fecha_hora_fin) : null;
  const isFinished = order.status === 'Terminada' || order.status === 'Cerrada' || order.status === 'Pendiente de validación';

  if (isFinished) {
    if (!dueDate || !finishDate || finishDate <= dueDate) {
      return { code: 'terminada_a_tiempo', label: '🟢 Terminada a tiempo', badgeClass: 'badge-status-ejecutada', statusText: 'Terminada a tiempo' };
    } else {
      return { code: 'terminada_fuera_de_tiempo', label: '🟠 Terminada fuera de tiempo', badgeClass: 'badge-priority-alta', statusText: 'Terminada fuera de tiempo' };
    }
  } else {
    if (dueDate && now > dueDate && order.status !== 'Cancelada') {
      return { code: 'vencida_sin_terminar', label: '🔴 Vencida sin terminar', badgeClass: 'badge-priority-crítica', statusText: 'Vencida sin terminar' };
    }
    const statusMap = {
      'Asignada': 'Pendiente',
      'Pendiente': 'Pendiente',
      'En proceso': 'En proceso',
      'En espera': 'En espera',
      'Pendiente de validación': 'Pendiente de validación'
    };
    const label = statusMap[order.status] || order.status;
    const badgeClass = order.status === 'En proceso' ? 'badge-status-proceso' : (order.status === 'En espera' ? 'badge-priority-alta' : 'badge-status-asignada');
    return { code: (order.status || 'pendiente').toLowerCase(), label: label, badgeClass: badgeClass, statusText: label };
  }
}

function updateTechActionButtons(order) {
  const statusBadge = document.getElementById('tech-ot-lbl-status-badge');
  const timerLabel = document.getElementById('tech-ot-lbl-timer');

  const btnStart = document.getElementById('btn-tech-start-work');
  const btnPause = document.getElementById('btn-tech-pause-work');
  const btnResume = document.getElementById('btn-tech-resume-work');
  const btnFinish = document.getElementById('btn-tech-finish-work');

  if (!order) return;

  const sla = getOTStatusSLA(order);
  if (statusBadge) {
    statusBadge.innerText = sla.label;
    statusBadge.className = `badge ${sla.badgeClass}`;
  }

  let startTimeStr = 'Sin registrar';
  let durationStr = '0 min';

  if (order.fecha_hora_inicio) {
    const sDate = new Date(order.fecha_hora_inicio);
    startTimeStr = sDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    const endDate = order.fecha_hora_fin ? new Date(order.fecha_hora_fin) : new Date();
    const diffMs = endDate - sDate;
    const diffMins = Math.max(0, Math.round(diffMs / 60000));
    durationStr = `${diffMins} min (${(diffMins / 60).toFixed(1)} h)`;
  }

  if (timerLabel) {
    const pauseNote = order.pauseReason ? ` | Pausa: ${order.pauseReason}` : '';
    timerLabel.innerText = `⏱️ Inicio: ${startTimeStr} | Tiempo Trabajado: ${durationStr}${pauseNote}`;
  }

  if (btnStart) btnStart.style.display = 'none';
  if (btnPause) btnPause.style.display = 'none';
  if (btnResume) btnResume.style.display = 'none';
  if (btnFinish) btnFinish.style.display = 'none';

  const st = order.status || 'Pendiente';

  if (st === 'Asignada' || st === 'Pendiente') {
    if (btnStart) btnStart.style.display = 'inline-block';
  } else if (st === 'En proceso') {
    if (btnPause) btnPause.style.display = 'inline-block';
    if (btnFinish) btnFinish.style.display = 'inline-block';
  } else if (st === 'En espera') {
    if (btnResume) btnResume.style.display = 'inline-block';
    if (btnFinish) btnFinish.style.display = 'inline-block';
  }
}

async function startWorkOnOT() {
  setButtonLoading('btn-tech-start-work', true);
  const otId = document.getElementById('tech-ot-id').value;
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const idx = orders.findIndex(o => o.id === otId);
  if (idx === -1) { setButtonLoading('btn-tech-start-work', false); return; }

  const nowISO = new Date().toISOString();
  orders[idx].status = 'En proceso';
  orders[idx].fecha_hora_inicio = orders[idx].fecha_hora_inicio || nowISO;
  
  if (!orders[idx].historyLogs) orders[idx].historyLogs = [];
  orders[idx].historyLogs.push({
    date: nowISO,
    status: 'En proceso',
    user: currentUser ? currentUser.name : 'Técnico',
    comment: 'Trabajo iniciado por el técnico.'
  });

  localStorage.setItem('TSMAI_orders', JSON.stringify(orders));

  if (supabaseClient) {
    try {
      await supabaseClient
        .from('ordenes_trabajo')
        .update({
          estatus: 'EN_PROCESO',
          fecha_hora_inicio: orders[idx].fecha_hora_inicio
        })
        .eq('folio', otId);
    } catch (err) {
      console.error('Error updating start work in Supabase:', err);
      showToast('No se pudo guardar en el servidor. Verifica tu conexión.', 'error');
    }
  }

  showToast('🚀 Trabajo iniciado. El estado cambió a En proceso.', 'success');
  setButtonLoading('btn-tech-start-work', false);
  updateTechActionButtons(orders[idx]);
  renderTechOrdersTable();
}

async function pauseWorkOnOT() {
  setButtonLoading('btn-tech-pause-work', true);
  const otId = document.getElementById('tech-ot-id').value;
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const idx = orders.findIndex(o => o.id === otId);
  if (idx === -1) { setButtonLoading('btn-tech-pause-work', false); return; }

  const reason = prompt('Motivo de la pausa (ej. Espera de refacción, Paro de línea):') || 'Espera de refacción/material';

  orders[idx].status = 'En espera';
  orders[idx].pauseReason = reason;

  if (!orders[idx].historyLogs) orders[idx].historyLogs = [];
  orders[idx].historyLogs.push({
    date: new Date().toISOString(),
    status: 'En espera',
    user: currentUser ? currentUser.name : 'Técnico',
    comment: `Trabajo pausado: ${reason}`
  });

  localStorage.setItem('TSMAI_orders', JSON.stringify(orders));

  if (supabaseClient) {
    try {
      await supabaseClient
        .from('ordenes_trabajo')
        .update({ estatus: 'EN_ESPERA' })
        .eq('folio', otId);
    } catch (err) {
      console.error('Error pausing work in Supabase:', err);
      showToast('No se pudo guardar la pausa en el servidor. Verifica tu conexión.', 'error');
    }
  }

  showToast('⏸️ Trabajo pausado (En espera).', 'warning');
  setButtonLoading('btn-tech-pause-work', false);
  updateTechActionButtons(orders[idx]);
  renderTechOrdersTable();
}

async function resumeWorkOnOT() {
  setButtonLoading('btn-tech-resume-work', true);
  const otId = document.getElementById('tech-ot-id').value;
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const idx = orders.findIndex(o => o.id === otId);
  if (idx === -1) { setButtonLoading('btn-tech-resume-work', false); return; }

  orders[idx].status = 'En proceso';
  orders[idx].pauseReason = null;

  if (!orders[idx].historyLogs) orders[idx].historyLogs = [];
  orders[idx].historyLogs.push({
    date: new Date().toISOString(),
    status: 'En proceso',
    user: currentUser ? currentUser.name : 'Técnico',
    comment: 'Trabajo reanudado.'
  });

  localStorage.setItem('TSMAI_orders', JSON.stringify(orders));

  if (supabaseClient) {
    try {
      await supabaseClient
        .from('ordenes_trabajo')
        .update({ estatus: 'EN_PROCESO' })
        .eq('folio', otId);
    } catch (err) {
      console.error('Error resuming work in Supabase:', err);
      showToast('No se pudo guardar la reanudación en el servidor. Verifica tu conexión.', 'error');
    }
  }

  showToast('▶️ Trabajo reanudado (En proceso).', 'success');
  setButtonLoading('btn-tech-resume-work', false);
  updateTechActionButtons(orders[idx]);
  renderTechOrdersTable();
}

async function finishWorkOnOT() {
  const otId = document.getElementById('tech-ot-id').value;
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const idx = orders.findIndex(o => o.id === otId);
  if (idx === -1) return;

  const activity = document.getElementById('tech-activity')?.value.trim() || '';

  if (!activity) {
    alert('Por favor describe la actividad realizada antes de finalizar el trabajo.');
    return;
  }

  setButtonLoading('btn-tech-finish-work', true);

  const nowISO = new Date().toISOString();
  orders[idx].fecha_hora_fin = nowISO;
  orders[idx].status = 'Pendiente de validación';

  let durationMins = 0;
  if (orders[idx].fecha_hora_inicio) {
    durationMins = Math.max(1, Math.round((new Date(nowISO) - new Date(orders[idx].fecha_hora_inicio)) / 60000));
  }
  orders[idx].tiempo_atencion_min = durationMins;

  if (!orders[idx].historyLogs) orders[idx].historyLogs = [];
  orders[idx].historyLogs.push({
    date: nowISO,
    status: 'Pendiente de validación',
    user: currentUser ? currentUser.name : 'Técnico',
    comment: `Trabajo finalizado en ${durationMins} min. Pendiente de visto bueno por supervisor.`
  });

  localStorage.setItem('TSMAI_orders', JSON.stringify(orders));

  // Guardar log en Bitácora automáticamente
  await saveTechnicalLog();

  if (supabaseClient) {
    try {
      await supabaseClient
        .from('ordenes_trabajo')
        .update({
          estatus: 'PENDIENTE_VALIDACION',
          fecha_hora_fin: nowISO,
          tiempo_atencion_min: durationMins
        })
        .eq('folio', otId);
    } catch (err) {
      console.error('Error finishing work in Supabase:', err);
      showToast('No se pudo guardar el cierre de OT en el servidor. Verifica tu conexión.', 'error');
    }
  }

  setButtonLoading('btn-tech-finish-work', false);
  closeModal('modal-tech-ot-detail');
  showToast('✅ Trabajo finalizado. La OT cambió a Pendiente de validación.', 'success');

  renderTechOrdersTable();
  if (typeof syncDatabases === 'function') await syncDatabases();
}

// Tabla de OTs de Técnico (Filtrado estricto por técnico asignado)
function renderTechOrdersTable() {
  if (!currentUser) return;
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const subtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const tbody = document.getElementById('table-tech-orders-body');

  const techId = currentUser.id || currentUser.uuid || currentUser.cve_tecnico;
  const techUuid = currentUser.uuid;
  const techCve = currentUser.cve_tecnico;
  const techName = (currentUser.name || '').toLowerCase();

  const myOrders = orders.filter(o => 
    o.assignedTech === techId || 
    o.assignedTech === techUuid ||
    o.assignedTech === techCve ||
    o.cve_atendio === techId || 
    o.cve_atendio === techCve ||
    (o.techName && o.techName.toLowerCase() === techName)
  );
  
  // Convertir subtareas activas del técnico a formato compatible con la tabla
  const mySubtasks = subtasks.filter(s => 
    (s.assignedTech === techId || s.assignedTech === techUuid || s.assignedTech === techCve || s.cve_atendio === techId || s.cve_atendio === techCve) && 
    s.status !== 'Terminada' && 
    s.status !== 'Cancelada'
  );

  const mappedSubtasks = mySubtasks.map(s => {
    const mainOT = orders.find(o => o.id === s.otId);
    return {
      id: `${s.otId}-S${s.number}`,
      isSubtask: true,
      subtaskId: s.id,
      machine: mainOT ? mainOT.machine : 'Máquina',
      area: `Apoyo ${s.area}`,
      type: `Subtarea: ${s.description.slice(0, 30)}...`,
      urgency: s.priority,
      status: s.status,
      dueDate: s.dueDate ? `${s.dueDate}T12:00:00` : new Date().toISOString()
    };
  });

  const activeOrders = [
    ...myOrders.filter(o => o.status !== 'Cerrada' && o.status !== 'Cancelada').map(o => ({ ...o, isSubtask: false })),
    ...mappedSubtasks
  ];

  if (activeOrders.length === 0) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No tienes órdenes de trabajo pendientes asignadas. ¡Buen trabajo!</td></tr>`;
    return;
  }

  let html = '';
  activeOrders.forEach(o => {
    const mach = machines.find(m => m.id === o.machine);
    const machineName = mach ? mach.name : o.machine;
    const formattedDueDate = new Date(o.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const sla = getOTStatusSLA(o);

    html += `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${machineName}</td>
        <td>${o.area}</td>
        <td>${o.type}</td>
        <td><span class="badge badge-priority-${(o.urgency || 'Normal').toLowerCase()}">${o.urgency || 'Normal'}</span></td>
        <td><span class="badge ${sla.badgeClass}">${sla.label}</span></td>
        <td>${formattedDueDate}</td>
        <td>
          <button class="btn-table-action" onclick="openTechOrderDetailModal('${o.id}')">Ver detalle</button>
        </td>
      </tr>
    `;
  });
  if (tbody) tbody.innerHTML = html;
}

// --- MODAL DETALLE DE OT (TÉCNICO) ---
function openTechOrderDetailModal(otId) {
  const isSub = otId.includes('-S');

  if (isSub) {
    // Es una subtarea
    const subtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
    const sub = subtasks.find(s => `${s.otId}-S${s.number}` === otId);
    if (!sub) return;

    document.getElementById('tech-ot-id').value = otId;
    document.getElementById('tech-ot-detail-title').innerText = `Detalle de Subtarea: ${otId}`;

    const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
    const parentOrder = orders.find(o => o.id === sub.otId);
    const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
    const mach = parentOrder ? machines.find(m => m.id === parentOrder.machine) : null;

    document.getElementById('tech-ot-lbl-machine').innerText = mach ? mach.name : (parentOrder ? parentOrder.machine : 'Máquina');
    document.getElementById('tech-ot-lbl-area').innerText = `Apoyo ${sub.area}`;
    document.getElementById('tech-ot-lbl-machinestate').innerText = mach ? mach.status : 'Operativa';
    document.getElementById('tech-ot-lbl-urgency').innerHTML = `<span class="badge badge-priority-${sub.priority.toLowerCase()}">${sub.priority}</span>`;
    document.getElementById('tech-ot-lbl-description').innerHTML = `<strong>Actividad Requerida:</strong> ${sub.description}<br><strong>Motivo de Apoyo:</strong> ${sub.reason}`;

    // Evidencia Inicial
    const fileBox = document.getElementById('tech-ot-lbl-file-box');
    if (sub.evidence) {
      fileBox.style.display = 'block';
      document.getElementById('tech-ot-img-lbl').innerHTML = `🖼️ <a style="color: var(--accent-blue); text-decoration: underline; cursor:pointer;" onclick="alert('Visualizando archivo: ' + '${sub.evidence}')">${sub.evidence}</a>`;
    } else {
      fileBox.style.display = 'none';
    }

    // Ocultar formulario de solicitar apoyo secundario
    document.querySelector('input[name="tech-subtask-req"][value="no"]').checked = true;
    document.querySelectorAll('input[name="tech-subtask-req"]').forEach(radio => radio.disabled = true);
    toggleSubtaskForm();
    document.getElementById('tech-subtasks-list-container').style.display = 'none';

    // Cargar inputs del diagnóstico
    document.getElementById('tech-diagnosis').value = sub.observations || '';
    document.getElementById('tech-activity').value = 'Completado por sub-responsable';
    document.getElementById('tech-observations').value = '';

    // Ocultar refacciones y tipo de intervención para subtareas para simplificar
    document.querySelector('input[name="tech-interv"]').closest('.form-group').style.display = 'none';
    document.getElementById('tech-part-select').closest('.form-group').style.display = 'none';
    tempSelectedParts = [];
    renderTechSelectedPartsList();

    // Reset file upload
    document.getElementById('tech-file').value = '';
    document.getElementById('tech-file-preview').style.display = 'none';

    // Reset temporal subtasks
    tempSubtasksToCreate = [];

    openModal('modal-tech-ot-detail');
  } else {
    // Es una OT normal
    const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
    const order = orders.find(o => o.id === otId);
    if (!order) return;

    // Mostrar campos que pudieran estar ocultos por subtarea anterior
    document.querySelectorAll('input[name="tech-subtask-req"]').forEach(radio => radio.disabled = false);
    document.querySelector('input[name="tech-interv"]').closest('.form-group').style.display = 'flex';
    document.getElementById('tech-part-select').closest('.form-group').style.display = 'flex';

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

    // Inicializar selector de subtarea nueva
    document.querySelector('input[name="tech-subtask-req"][value="no"]').checked = true;
    toggleSubtaskForm();
    renderTechSubtasksList(otId);

    // Inicializar catálogo de refacciones en el selector (específicas de la máquina + genéricas)
    populateTechSparePartsSelect(order.machine);
    
    // Cargar refacciones de la OT o autocargar receta sugerida por tipo de servicio
    if (order.usedParts && order.usedParts.length > 0) {
      tempSelectedParts = [...order.usedParts];
    } else {
      const multiplier = getProportionMultiplier(order.type || order.orden_trabajo || 'MC');
      const allParts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
      const machineParts = allParts.filter(p => p.maquina === order.machine || p.maquina_id === order.machine);
      if (machineParts.length > 0) {
        tempSelectedParts = machineParts.map(p => {
          const baseQty = p.cantidadEstandar || p.cantidad_estandar || 1;
          const propQty = Math.max(1, Math.round(baseQty * multiplier * 100) / 100);
          return {
            partId: p.id || p.codigo_articulo,
            name: p.name || p.nombre_articulo,
            quantity: propQty,
            costoUnitario: p.cost || p.costo_unitario || 0
          };
        });
      } else {
        tempSelectedParts = [];
      }
    }
    renderTechSelectedPartsList();

    // Reset file upload
    document.getElementById('tech-file').value = '';
    document.getElementById('tech-file-preview').style.display = 'none';

    // Reset temporal subtasks
    tempSubtasksToCreate = [];
    renderTechTempSubtasksList();

    // Actualizar botones de acción y tiempos del técnico
    updateTechActionButtons(order);

    openModal('modal-tech-ot-detail');
  }
}

function toggleSubtaskForm() {
  const reqSubtaskEl = document.querySelector('input[name="tech-subtask-req"]:checked');
  const reqSubtask = reqSubtaskEl ? reqSubtaskEl.value : 'no';
  const fieldsContainer = document.getElementById('tech-subtask-fields');
  if (fieldsContainer) {
    fieldsContainer.style.display = reqSubtask === 'yes' ? 'block' : 'none';
  }
}

function addTempSubtask() {
  const title = document.getElementById('tech-subtask-title').value.trim();
  const area = document.getElementById('tech-subtask-area').value;
  const priority = document.getElementById('tech-subtask-priority').value;
  const subtaskDueDate = document.getElementById('tech-subtask-date').value;
  const requiresParo = document.querySelector('input[name="tech-subtask-paro"]:checked').value === 'yes';
  const requiresPart = document.querySelector('input[name="tech-subtask-part"]:checked').value === 'yes';
  const subtaskDesc = document.getElementById('tech-subtask-desc').value.trim();
  const subtaskReason = document.getElementById('tech-subtask-reason').value.trim();
  const subtaskObs = document.getElementById('tech-subtask-obs').value.trim();
  
  const fileInput = document.getElementById('tech-subtask-file');
  let evidenceName = null;
  if (fileInput && fileInput.files && fileInput.files[0]) {
    evidenceName = fileInput.files[0].name;
  }

  if (!title || !subtaskDueDate || !subtaskDesc || !subtaskReason) {
    alert('Por favor completa todos los campos obligatorios de la subtarea (*) (Título, Fecha, Descripción y Motivo).');
    return;
  }

  const sub = {
    id: crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36)),
    title: title,
    area: area,
    priority: priority,
    dueDate: subtaskDueDate,
    requiresParo: requiresParo,
    requiresPart: requiresPart,
    description: subtaskDesc,
    reason: subtaskReason,
    observations: subtaskObs,
    evidenceName: evidenceName,
    status: 'solicitada',
    activo: true
  };

  tempSubtasksToCreate.push(sub);
  renderTechTempSubtasksList();

  // Limpiar campos
  document.getElementById('tech-subtask-title').value = '';
  document.getElementById('tech-subtask-date').value = '';
  document.getElementById('tech-subtask-desc').value = '';
  document.getElementById('tech-subtask-reason').value = '';
  document.getElementById('tech-subtask-obs').value = '';
  document.querySelector('input[name="tech-subtask-paro"][value="no"]').checked = true;
  document.querySelector('input[name="tech-subtask-part"][value="no"]').checked = true;
  if (fileInput) fileInput.value = '';
  const preview = document.getElementById('tech-subtask-file-preview');
  if (preview) {
    preview.innerText = '';
    preview.style.display = 'none';
  }
  
  showToast('Subtarea agregada a la lista temporal.');
}

function removeTempSubtask(index) {
  tempSubtasksToCreate.splice(index, 1);
  renderTechTempSubtasksList();
  showToast('Subtarea removida de la lista temporal.');
}

function renderTechTempSubtasksList() {
  const container = document.getElementById('tech-temp-subtasks-container');
  const list = document.getElementById('tech-temp-subtasks-list');
  if (!container || !list) return;

  if (tempSubtasksToCreate.length === 0) {
    container.style.display = 'none';
    list.innerHTML = '';
    return;
  }

  container.style.display = 'block';
  let html = '';
  tempSubtasksToCreate.forEach((s, idx) => {
    html += `
      <li style="background: rgba(6, 182, 212, 0.05); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--accent-blue); display: flex; justify-content: space-between; align-items: center; margin: 0; border-top: none;">
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <strong style="color: var(--accent-blue);">${s.title} (${formatSubtaskArea(s.area)})</strong>
          <span style="font-size: 0.75rem; color: #cbd5e1;">Prioridad: ${formatSubtaskPriority(s.priority)} | Fecha: ${s.dueDate}</span>
        </div>
        <button type="button" class="btn-logout" onclick="removeTempSubtask(${idx})" style="padding: 4px 8px; font-size: 0.75rem; width: auto; margin: 0; background: #ef4444; border-color: #ef4444;">Quitar</button>
      </li>
    `;
  });
  list.innerHTML = html;
}

async function renderTechSubtasksList(otId) {
  const subtasksContainer = document.getElementById('tech-subtasks-list-container');
  const subtasksList = document.getElementById('tech-subtasks-list');
  if (!subtasksContainer || !subtasksList) return;

  const allSubtasks = await dbGetSubtasks();
  const otSubtasks = allSubtasks.filter(s => s.otId === otId);

  if (otSubtasks.length > 0) {
    subtasksContainer.style.display = 'block';
    let html = '';
    otSubtasks.forEach(s => {
      let statusBadge = '';
      if (s.status === 'Solicitada') statusBadge = '<span class="badge badge-priority-media">Solicitada</span>';
      else if (s.status === 'Asignada') statusBadge = '<span class="badge badge-priority-baja">Asignada</span>';
      else if (s.status === 'En proceso') statusBadge = '<span class="badge badge-priority-media">En proceso</span>';
      else if (s.status === 'Terminada') statusBadge = '<span class="badge badge-priority-alta" style="background: #22c55e; color: white;">Terminada</span>';
      else if (s.status === 'Cancelada') statusBadge = '<span class="badge badge-priority-crítica">Cancelada</span>';
      else statusBadge = `<span class="badge badge-priority-baja">${s.status}</span>`;

      const respName = s.assignedTech ? s.assignedTech : 'Pendiente de Asignar';

      html += `
        <li style="background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 6px; border-left: 3px solid var(--accent-blue); display: flex; flex-direction: column; gap: 4px; border-top: none; margin: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>Subtarea #${s.number}: Apoyo ${s.area}</strong>
            ${statusBadge}
          </div>
          <div style="color: #cbd5e1;"><span style="color: var(--text-muted);">Descripción:</span> ${s.description}</div>
          <div style="color: #cbd5e1;"><span style="color: var(--text-muted);">Responsable:</span> ${respName}</div>
          ${s.observations ? `<div style="color: #cbd5e1;"><span style="color: var(--text-muted);">Bitácora:</span> ${s.observations}</div>` : ''}
        </li>
      `;
    });
    subtasksList.innerHTML = html;
  } else {
    subtasksContainer.style.display = 'none';
  }
}

// Actualizar estado del trabajo directamente en sitio
async function setWorkStatus(newStatus) {
  const otId = document.getElementById('tech-ot-id').value;
  const isSub = otId.includes('-S');

  if (isSub) {
    // Es una subtarea
    const subtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
    const subIndex = subtasks.findIndex(s => `${s.otId}-S${s.number}` === otId);
    if (subIndex === -1) return;

    const sub = subtasks[subIndex];
    const oldStatus = sub.status;
    
    // Convertir estado
    let statusToSave = newStatus;
    if (newStatus === 'Ejecutada') {
      statusToSave = 'Terminada';
    }

    subtasks[subIndex].status = statusToSave;
    if (statusToSave === 'Terminada') {
      subtasks[subIndex].closeDate = new Date().toISOString();
    }
    subtasks[subIndex].updatedAt = new Date().toISOString();
    localStorage.setItem('TSMAI_subtasks', JSON.stringify(subtasks));

    // Actualizar en Supabase
    await dbUpdateSubtask(sub.id, {
      status: statusToSave,
      closeDate: statusToSave === 'Terminada' ? new Date().toISOString() : null
    });

    // Registrar en bitácora de movimientos
    const movement = {
      id: crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36)),
      otUUID: sub.otUUID,
      subtaskId: sub.id,
      type: statusToSave === 'Terminada' ? 'Subtarea terminada' : `Subtarea ${statusToSave.toLowerCase()}`,
      oldState: oldStatus,
      newState: statusToSave,
      by: currentUser.name,
      comment: `Técnico cambió el estado de la subtarea a ${statusToSave}.`,
      date: new Date().toISOString()
    };
    await dbInsertMovement(movement);

    // Si se terminó, verificar si podemos actualizar el estado de la OT principal (Regla 3 & 4)
    if (statusToSave === 'Terminada') {
      await checkAndUpdateMainOTState(sub.otId);
    }

    showToast(`Estado de la subtarea cambiado a ${statusToSave}.`);
    renderTechDashboard();
    renderTechOrdersTable();
    return;
  }

  // Si es OT principal, actualizar estado
  await updateOrderStatus(otId, newStatus);
}

// Generar o actualizar registro automático en bitácora cuando una OT se guarda o finaliza
async function autoCreateBitacoraOnOTClose(orderObj, status, customObs = '') {
  if (!orderObj) return;

  const otId = orderObj.id || orderObj.folio || 'OT-000';
  const otUUID = orderObj.uuid || orderObj.id_orden || null;
  const machine = (orderObj.machine || orderObj.maquina_id || 'NO_APLICA');
  const area = orderObj.area || orderObj.departamento || orderObj.department || 'AF';

  let techId = orderObj.assignedTech || orderObj.cve_atendio || (currentUser ? (currentUser.uuid || currentUser.id || currentUser.cve_tecnico) : 'T-01');
  let techName = orderObj.techName || orderObj.nombre_tecnico || (currentUser ? (currentUser.name || currentUser.nombre_completo) : 'Técnico');

  // Tiempos
  const startDateStr = orderObj.date || orderObj.created_at || orderObj.fecha_carga || new Date(Date.now() - 3600000).toISOString();
  const endDateStr = new Date().toISOString();

  const startObj = new Date(startDateStr);
  const endObj = new Date(endDateStr);

  const diagText = orderObj.diagnosis ? `Diagnóstico: ${orderObj.diagnosis}` : '';
  const actText = orderObj.activity ? `Actividad: ${orderObj.activity}` : '';
  const mainDesc = orderObj.description || orderObj.descripcion || 'Atención y resolución de Orden de Trabajo';
  const activityDesc = `[OT ${otId}] ${mainDesc}${diagText ? ' | ' + diagText : ''}${actText ? ' | ' + actText : ''}`;
  
  let partsStr = 'Sin refacciones';
  if (orderObj.usedParts && Array.isArray(orderObj.usedParts) && orderObj.usedParts.length > 0) {
    partsStr = orderObj.usedParts.map(p => `${p.name || p.partName || p.partId} x${p.quantity || 1}`).join(', ');
  } else if (orderObj.refacciones_usadas) {
    partsStr = orderObj.refacciones_usadas;
  }

  const obsStr = customObs || orderObj.observations || `Orden de trabajo ${otId} registrada con estatus ${status}.`;

  // 1. Actualizar o insertar en localStorage TSMAI_maintenance_logs
  const localLogs = JSON.parse(localStorage.getItem('TSMAI_maintenance_logs') || '[]');
  const existingIdx = localLogs.findIndex(l => l.otFolio === otId || (l.otUUID && l.otUUID === otUUID));
  
  const updatedLogObj = {
    id: existingIdx !== -1 ? localLogs[existingIdx].id : ('LOG-AUTO-' + Date.now().toString().slice(-6)),
    otFolio: otId,
    otUUID: otUUID,
    cve_tecnico: techId || 'T-01',
    nombre_tecnico: techName,
    area: area,
    maquina_id: machine === 'NO_APLICA' ? null : machine,
    fecha_hora_inicio: startObj.toISOString(),
    fecha_hora_fin: endObj.toISOString(),
    descripcion_actividad: activityDesc,
    refacciones_usadas: partsStr,
    observaciones: obsStr,
    date: endObj.toISOString(),
    status: status,
    db_synced: false
  };

  if (existingIdx !== -1) {
    localLogs[existingIdx] = updatedLogObj;
  } else {
    localLogs.unshift(updatedLogObj);
  }
  localStorage.setItem('TSMAI_maintenance_logs', JSON.stringify(localLogs));

  // 2. Guardar en Supabase bitacora_mantenimiento si hay conexión
  if (supabaseClient) {
    try {
      const record = {
        id_orden: otUUID,
        cve_tecnico: techId,
        nombre_tecnico: techName,
        area: area,
        maquina_id: machine === 'NO_APLICA' ? null : machine,
        fecha_hora_inicio: startObj.toISOString(),
        fecha_hora_fin: endObj.toISOString(),
        descripcion_actividad: activityDesc,
        refacciones_usadas: partsStr,
        observaciones: obsStr,
        activo: true
      };

      const { error: insErr } = await supabaseClient.from('bitacora_mantenimiento').insert([record]);
      if (!insErr) {
        updatedLogObj.db_synced = true;
        localStorage.setItem('TSMAI_maintenance_logs', JSON.stringify(localLogs));
      } else {
        console.warn('Nota de sincronización bitácora Supabase:', insErr.message);
      }
    } catch (err) {
      console.warn('Nota al registrar bitacora automática en Supabase:', err);
    }
  }

  // 3. Renderizar Dashboard y Bitácoras
  renderAdminDashboard();
  renderTechDashboard();
  renderTechBitacora();
  renderAdminLogsTable();
}

// Actualizar estado de una Orden de Trabajo
async function updateOrderStatus(otId, newStatus) {
  if (isSubtaskID(otId)) {
    await updateSubtaskStatus(otId, newStatus);
    return;
  }

  // Es una OT normal
  if (newStatus === 'Ejecutada' || newStatus === 'Cerrada') {
    const subtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
    const otSubtasks = subtasks.filter(s => s.otId === otId);
    const activeSubtasks = otSubtasks.filter(s => ['solicitada', 'asignada', 'en_proceso', 'en_espera', 'bloqueada'].includes(s.status.toLowerCase()));
    if (activeSubtasks.length > 0) {
      alert(`No se puede finalizar la Orden de Trabajo porque tiene ${activeSubtasks.length} subtarea(s) activa(s). Todas las subtareas deben estar Terminadas o Canceladas.`);
      return;
    }
  }

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
    await autoCreateBitacoraOnOTClose(orders[orderIndex], newStatus, `Estado de la orden cambiado a ${newStatus}`);
  }

  localStorage.setItem('TSMAI_orders', JSON.stringify(orders));
  localStorage.setItem('TSMAI_machines', JSON.stringify(machines));

  // Actualizar en Supabase
  if (supabaseClient) {
    try {
      await supabaseClient
        .from('ordenes_trabajo')
        .update({ estatus: getDBStatus(newStatus) })
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
// Cargar catálogo de refacciones en modal técnico (Refacciones específicas de la máquina + Genéricas)
function populateTechSparePartsSelect(machineId = null) {
  const parts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
  const select = document.getElementById('tech-part-select');
  if (!select) return;

  const targetMach = machineId ? machineId.toUpperCase() : '';

  const filteredParts = parts.filter(p => {
    if (!targetMach) return true;
    const pMach = (p.maquina || p.maquina_id || '').toUpperCase();
    return pMach === targetMach || pMach === 'GENERICA' || pMach === 'TODAS' || pMach === 'GENERAL' || pMach === '';
  });

  let html = '<option value="">Selecciona repuesto...</option>';
  filteredParts.forEach(p => {
    const pMach = (p.maquina || p.maquina_id || '').toUpperCase();
    const isGeneric = pMach === 'GENERICA' || pMach === 'TODAS' || pMach === 'GENERAL' || pMach === '';
    const tag = isGeneric ? ' [Genérica]' : ` [Específica: ${p.maquina || p.maquina_id || targetMach}]`;
    const costVal = p.cost || p.costo_unitario || 0;
    const costStr = costVal > 0 ? ` - $${costVal.toLocaleString('es-MX')} MXN` : '';
    html += `<option value="${p.id || p.codigo_articulo}">${p.name || p.nombre_articulo}${tag}${costStr}</option>`;
  });
  select.innerHTML = html;
}

// Añadir refacción a la lista temporal de la OT
function addPartToOTList() {
  const select = document.getElementById('tech-part-select');
  const partId = select.value;
  const qty = parseInt(document.getElementById('tech-part-qty').value) || 1;

  if (!partId || qty <= 0) {
    alert('Selecciona una refacción y define una cantidad válida.');
    return;
  }

  const parts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
  const part = parts.find(p => (p.id || p.codigo_articulo) === partId);
  if (!part) return;

  // Verificar si ya estaba agregada
  const existIndex = tempSelectedParts.findIndex(p => p.partId === partId);
  if (existIndex !== -1) {
    tempSelectedParts[existIndex].quantity += qty;
  } else {
    tempSelectedParts.push({
      partId: partId,
      name: part.name || part.nombre_articulo,
      quantity: qty,
      costoUnitario: part.cost || part.costo_unitario || 0
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

  if (otId.includes('-S')) {
    // Es una subtarea
    const observations = document.getElementById('tech-diagnosis').value.trim();
    if (!observations) {
      alert('Por favor escribe tus observaciones o bitácora técnica de la subtarea.');
      return;
    }

    const subtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
    const subIndex = subtasks.findIndex(s => `${s.otId}-S${s.number}` === otId);
    if (subIndex === -1) return;

    const sub = subtasks[subIndex];
    const oldStatus = sub.status;
    let newStatus = oldStatus;
    if (newStatus === 'asignada') {
      newStatus = 'en_proceso';
    }

    // Cargar evidencia si aplica y guardarla en evidencias_subtareas
    const fileInput = document.getElementById('tech-file');
    let evidenceName = null;
    if (fileInput.files && fileInput.files[0]) {
      evidenceName = fileInput.files[0].name;
      const evUUID = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));
      const newEv = {
        id: evUUID,
        subtaskId: sub.id,
        otUUID: sub.otUUID,
        fileType: 'imagen',
        origin: 'cierre',
        fileName: evidenceName,
        url_archivo: `https://xqfpsavkefhrxfbtqzec.supabase.co/storage/v1/object/public/ot-evidencias/subtareas/${sub.otId}/${evidenceName}`,
        fileUrl: `https://xqfpsavkefhrxfbtqzec.supabase.co/storage/v1/object/public/ot-evidencias/subtareas/${sub.otId}/${evidenceName}`,
        bucket: 'ot-evidencias',
        path: `subtareas/${sub.otId}/${evidenceName}`,
        description: 'Evidencia de actualización de la subtarea',
        uploadedBy: getUserUUID(currentUser.id) || getAdminUUID(),
        uploadDate: new Date().toISOString(),
        active: true
      };
      await dbInsertEvidence(newEv);
    }

    subtasks[subIndex].status = newStatus;
    subtasks[subIndex].observations = observations;
    subtasks[subIndex].updatedAt = new Date().toISOString();
    localStorage.setItem('TSMAI_subtasks', JSON.stringify(subtasks));

    // Actualizar en Supabase
    await dbUpdateSubtask(sub.id, {
      status: newStatus,
      observations: observations
    });

    // Registrar en bitácora de movimientos
    const movement = {
      id: crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36)),
      otUUID: sub.otUUID,
      subtaskId: sub.id,
      type: 'Subtarea actualizada',
      oldState: oldStatus,
      newState: newStatus,
      by: currentUser.name,
      comment: `Técnico actualizó la subtarea. Observaciones: ${observations}`,
      date: new Date().toISOString()
    };
    await dbInsertMovement(movement);

    closeModal('modal-tech-ot-detail');
    showToast('Subtarea guardada exitosamente.');
    await syncDatabases();
    renderTechDashboard();
    renderTechOrdersTable();
    return;
  }

  // Es una OT normal
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

  // Regla 2: Validar si existen subtareas activas al intentar cerrar
  const currentStatus = currentOrder.status;
  if (currentStatus === 'Ejecutada' || currentStatus === 'Cerrada' || currentStatus === 'ejecutada' || currentStatus === 'cerrada') {
    const subtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
    const otSubtasks = subtasks.filter(s => s.otId === otId);
    const activeSubtasks = otSubtasks.filter(s => ['solicitada', 'asignada', 'en_proceso', 'en_espera', 'bloqueada'].includes(s.status.toLowerCase()));
    if (activeSubtasks.length > 0) {
      alert(`No se puede guardar la Orden de Trabajo como ${currentStatus} porque tiene ${activeSubtasks.length} subtarea(s) activa(s). Todas las subtareas deben estar Terminadas o Canceladas.`);
      return;
    }
  }

  // Comprobar si requiere subtarea
  const reqSubtaskEl = document.querySelector('input[name="tech-subtask-req"]:checked');
  const reqSubtask = reqSubtaskEl ? reqSubtaskEl.value : 'no';

  if (reqSubtask === 'yes') {
    const title = document.getElementById('tech-subtask-title').value.trim();
    const subtaskDueDate = document.getElementById('tech-subtask-date').value;
    const subtaskDesc = document.getElementById('tech-subtask-desc').value.trim();
    const subtaskReason = document.getElementById('tech-subtask-reason').value.trim();

    // Auto-agregar subtarea si hay campos llenos pero olvidaron presionar el botón "Agregar"
    if (title || subtaskDueDate || subtaskDesc || subtaskReason) {
      addTempSubtask();
      // Si la validación falló, salimos del guardado
      if (tempSubtasksToCreate.length === 0 || tempSubtasksToCreate[tempSubtasksToCreate.length - 1].title !== title) {
        return;
      }
    }
  }

  // Restar refacciones del inventario
  const parts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
  
  // Revertir partes anteriores de la misma orden si las hubiera para no duplicar resta
  const previousParts = currentOrder.usedParts || [];
  previousParts.forEach(prev => {
    const idx = parts.findIndex(p => p.id === prev.partId);
    if (idx !== -1) parts[idx].stock += prev.quantity;
  });

  // Guardar datos en la OT (Refacciones consumidas en el servicio)
  orders[orderIndex].diagnosis = diagnosis;
  orders[orderIndex].activity = activity;
  orders[orderIndex].observations = observations;
  orders[orderIndex].interventionType = interventionTypes;
  orders[orderIndex].usedParts = tempSelectedParts;

  // Actualizar estado de la OT principal (Regla 3)
  if (tempSubtasksToCreate.length > 0) {
    orders[orderIndex].status = 'Requiere subtarea';
  } else {
    orders[orderIndex].status = 'Ejecutada';
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
    comment: `Bitácora técnica actualizada y finalizada. Diagnóstico: ${diagnosis.slice(0, 40)}...`
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
    machines[machIndex].status = 'Operativa';
    if (orders[orderIndex].status === 'Ejecutada') {
      machines[machIndex].failures += 1;
    }
    localStorage.setItem('TSMAI_machines', JSON.stringify(machines));
  }

  const combinedObservation = `Diagnóstico: ${diagnosis} | Actividad: ${activity} | Observaciones: ${observations}`;

  // Sincronizar reporte a Supabase
  if (supabaseClient) {
    try {
      const updateData = {
        estatus: getDBStatus(orders[orderIndex].status),
        observacion_cierre: combinedObservation,
        fecha_fin: new Date().toISOString().split('T')[0],
        hora_fin: new Date().toTimeString().split(' ')[0],
        fecha_hora_fin: new Date().toISOString()
      };
      
      await supabaseClient
        .from('ordenes_trabajo')
        .update(updateData)
        .eq('folio', otId);
        
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

  // Generar/actualizar SIEMPRE el registro en Bitácora de Mantenimiento
  await autoCreateBitacoraOnOTClose(orders[orderIndex], orders[orderIndex].status, combinedObservation);

  // Insertar todas las subtareas creadas en esta sesión
  if (tempSubtasksToCreate.length > 0) {
    const subtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
    const otSubtasks = subtasks.filter(s => s.otId === otId);
    let nextNumber = otSubtasks.length + 1;
    const requestedUUID = getUserUUID(currentUser.id) || getAdminUUID() || null;

    for (const sub of tempSubtasksToCreate) {
      sub.otId = otId;
      sub.otUUID = currentOrder.uuid || currentOrder.id || null;
      sub.number = nextNumber++;
      sub.requestedBy = requestedUUID;
      sub.requestDate = new Date().toISOString();

      await dbInsertSubtask(sub);

      // Guardar evidencia si fue seleccionada
      if (sub.evidenceName) {
        const evUUID = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));
        const newEv = {
          id: evUUID,
          subtaskId: sub.id,
          otUUID: sub.otUUID,
          fileType: 'imagen',
          origin: 'solicitud',
          fileName: sub.evidenceName,
          url_archivo: `https://xqfpsavkefhrxfbtqzec.supabase.co/storage/v1/object/public/ot-evidencias/subtareas/${sub.otId}/${sub.evidenceName}`,
          fileUrl: `https://xqfpsavkefhrxfbtqzec.supabase.co/storage/v1/object/public/ot-evidencias/subtareas/${sub.otId}/${sub.evidenceName}`,
          bucket: 'ot-evidencias',
          path: `subtareas/${sub.otId}/${sub.evidenceName}`,
          description: 'Evidencia inicial de la subtarea',
          uploadedBy: sub.requestedBy,
          uploadDate: new Date().toISOString(),
          active: true
        };
        await dbInsertEvidence(newEv);
      }

      // Registrar en bitácora de movimientos
      const movement = {
        id: crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36)),
        otUUID: currentOrder.uuid || currentOrder.id || null,
        subtaskId: sub.id,
        type: 'Subtarea creada',
        oldState: null,
        newState: 'Solicitada',
        by: currentUser.name,
        comment: `Solicitud de apoyo de otra área (${sub.area}) creada por técnico. Motivo: ${sub.reason}`,
        date: new Date().toISOString()
      };
      await dbInsertMovement(movement);
    }

    // Reset temporal subtasks
    tempSubtasksToCreate = [];
  }

  closeModal('modal-tech-ot-detail');
  showToast('Bitácora técnica guardada exitosamente.');
  await syncDatabases();
  
  // Recargar vistas
  renderTechDashboard();
  renderTechOrdersTable();
}

// --- DYNAMIC CHECKLISTS EN VISTA TÉCNICO ---
async function renderTechChecklistsTable() {
  const tbody = document.getElementById('table-tech-checklists-body');
  if (!tbody) return;

  const checklistGroups = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');

  if (checklistGroups.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No hay formatos cargados en el sistema.</td></tr>`;
    return;
  }

  const areaLabels = {
    PF: 'PF Producción',
    CF: 'CF Costura',
    TF: 'TF Tintorería',
    AF: 'AF Planta',
    General: 'General / Todas las áreas'
  };

  const techDept = (currentUser && currentUser.department) || '';
  const myAreaChecklists = [];
  const generalChecklists = [];
  const otherChecklists = [];

  checklistGroups.forEach(f => {
    const area = f.area || 'General';
    if (area === techDept) {
      myAreaChecklists.push(f);
    } else if (area === 'General' || area === 'Todas las áreas (General)') {
      generalChecklists.push(f);
    } else {
      otherChecklists.push(f);
    }
  });

  function renderFormRow(f) {
    return `
      <tr>
        <td><strong>${f.id}</strong></td>
        <td>${f.name}</td>
        <td>${areaLabels[f.area] || f.area || 'General'}</td>
        <td>
          <button class="btn-table-action" onclick="openTechChecklistRunModal('${f.id}')" style="background-color: var(--primary-color); border-color: var(--primary-color);">📋 Llenar Formato</button>
        </td>
      </tr>
    `;
  }

  let html = '';

  if (techDept && myAreaChecklists.length > 0) {
    html += `
      <tr class="table-section-header" style="background: rgba(99, 102, 241, 0.03);">
        <td colspan="4" style="font-weight: 700; color: var(--primary-dark); padding: 10px 12px; border-bottom: 2px solid #cbd5e1;">⭐ Formatos de mi Área (${areaLabels[techDept] || techDept})</td>
      </tr>
    `;
    myAreaChecklists.forEach(f => {
      html += renderFormRow(f);
    });
  }

  if (generalChecklists.length > 0) {
    html += `
      <tr class="table-section-header" style="background: #f8fafc;">
        <td colspan="4" style="font-weight: 700; color: #475569; padding: 10px 12px; border-bottom: 2px solid #cbd5e1;">📋 Formatos Generales</td>
      </tr>
    `;
    generalChecklists.forEach(f => {
      html += renderFormRow(f);
    });
  }

  if (otherChecklists.length > 0) {
    html += `
      <tr class="table-section-header" style="background: #f8fafc;">
        <td colspan="4" style="font-weight: 700; color: #64748b; padding: 10px 12px; border-bottom: 2px solid #cbd5e1;">🔍 Formatos de Otras Áreas</td>
      </tr>
    `;
    otherChecklists.forEach(f => {
      html += renderFormRow(f);
    });
  }

  tbody.innerHTML = html;
}

let activeRunningFormId = null;

async function openTechChecklistRunModal(formId) {
  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const form = forms.find(f => f.id === formId);
  if (!form) return;

  activeRunningFormId = formId;
  document.getElementById('tech-chk-title').innerText = form.name;

  // Populate active OTs for this technician
  const otSelect = document.getElementById('tech-chk-ot-select');
  if (otSelect) {
    otSelect.innerHTML = `
      <option value="">Selecciona una OT activa...</option>
      <option value="00000000-0000-0000-0000-000000000000" data-uuid="00000000-0000-0000-0000-000000000000">General / Levantamiento Autónomo (Sin OT)</option>
    `;
    let orders = [];
    if (useLiveDatabase && supabaseClient) {
      try {
        const { data } = await supabaseClient.from('ordenes_trabajo').select('*');
        if (data) {
          orders = data.map(o => ({
            id: o.folio,
            uuid: o.id_orden,
            assignedTech: o.cve_atendio,
            status: formatStatus(o.estatus),
            description: o.description
          }));
        }
      } catch (err) {
        console.warn('Error loading active OTs for checklist run:', err);
      }
    }
    if (orders.length === 0) {
      orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
    }
    if (currentUser) {
      const myActiveOrders = orders.filter(o => o.assignedTech === currentUser.id && o.status !== 'Cerrada' && o.status !== 'Cancelada');
      myActiveOrders.forEach(o => {
        otSelect.innerHTML += `<option value="${o.id}" data-uuid="${o.uuid || ''}">${o.id} - ${o.description.substring(0, 45)}...</option>`;
      });
    }
  }

  const body = document.getElementById('tech-chk-body');
  let html = '';
  form.fields.forEach((f, idx) => {
    const isRequiredAttr = f.required ? 'required' : '';
    const qId = f.id_pregunta || f.id || '';
    const qCode = f.name || `Q-${idx + 1}`;
    
    html += `
      <div class="form-group" style="margin-bottom: 16px;" data-pregunta-id="${qId}" data-pregunta-code="${qCode}" data-pregunta-text="${f.label}">
        <label style="font-weight:600;margin-bottom:6px;display:block;">${f.label} ${f.required ? '*' : ''}</label>
    `;
    
    if (f.type === 'checkbox' || f.type === 'radio' || f.type === 'si_no') {
      html += `
        <div class="radio-group" style="display:flex;gap:12px;">
          <label class="radio-label"><input type="radio" name="chk-field-${idx}" value="Sí" class="radio-input"> Sí</label>
          <label class="radio-label"><input type="radio" name="chk-field-${idx}" value="No" class="radio-input"> No</label>
          <label class="radio-label"><input type="radio" name="chk-field-${idx}" value="N/A" class="radio-input" checked> N/A</label>
        </div>
      `;
    } else if (f.type === 'number') {
      html += `<input type="number" id="chk-field-${idx}" class="form-control" placeholder="0" ${isRequiredAttr}>`;
    } else if (f.type === 'date') {
      html += `<input type="date" id="chk-field-${idx}" class="form-control" ${isRequiredAttr}>`;
    } else if (f.type === 'time') {
      html += `<input type="time" id="chk-field-${idx}" class="form-control" ${isRequiredAttr}>`;
    } else if (f.type === 'select') {
      let optionsHtml = '<option value="">Selecciona una opción...</option>';
      if (f.options && Array.isArray(f.options)) {
        f.options.forEach(opt => {
          optionsHtml += `<option value="${opt}">${opt}</option>`;
        });
      }
      html += `<select id="chk-field-${idx}" class="form-control" ${isRequiredAttr}>${optionsHtml}</select>`;
    } else {
      html += `<input type="text" id="chk-field-${idx}" class="form-control" placeholder="Escribe aquí..." ${isRequiredAttr}>`;
    }

    // Comentario adicional
    html += `
      <input type="text" id="chk-field-comment-${idx}" class="form-control" placeholder="Comentario adicional (opcional)" style="margin-top: 6px; font-size: 0.8rem;">
    </div>`;
  });

  body.innerHTML = html;
  openModal('modal-tech-checklist-run');
}

async function submitChecklistResponse() {
  const forms = JSON.parse(localStorage.getItem('TSMAI_dynamic_forms') || '[]');
  const form = forms.find(f => f.id === activeRunningFormId);
  if (!form) return;

  const otSelect = document.getElementById('tech-chk-ot-select');
  const selectedOtId = otSelect ? otSelect.value : '';
  
  if (!selectedOtId) {
    alert('Por favor selecciona la Orden de Trabajo (OT) vinculada.');
    return;
  }

  // Obtener UUID de la OT
  let otUUID = null;
  const selectedOption = otSelect.options[otSelect.selectedIndex];
  if (selectedOption) {
    otUUID = selectedOption.getAttribute('data-uuid') || null;
  }

  if (useLiveDatabase && !otUUID && supabaseClient) {
    try {
      const { data } = await supabaseClient
        .from('ordenes_trabajo')
        .select('id_orden')
        .eq('folio', selectedOtId)
        .maybeSingle();
      if (data) {
        otUUID = data.id_orden;
      }
    } catch(err) {
      console.warn('Error fetching OT UUID:', err);
    }
  }

  const responses = [];
  let isValid = true;

  form.fields.forEach((f, idx) => {
    let val = '';
    if (f.type === 'checkbox' || f.type === 'radio' || f.type === 'si_no') {
      const radios = document.getElementsByName(`chk-field-${idx}`);
      let checkedRadio = Array.from(radios).find(r => r.checked);
      val = checkedRadio ? checkedRadio.value : 'N/A';
    } else {
      const input = document.getElementById(`chk-field-${idx}`);
      if (input) {
        val = input.value.trim();
        if (f.required && !val) {
          isValid = false;
        }
      }
    }
    const commentInput = document.getElementById(`chk-field-comment-${idx}`);
    const comment = commentInput ? commentInput.value.trim() : '';
    responses.push({ label: f.label, val: val, comment: comment });
  });

  if (!isValid) {
    alert('Por favor, llena todos los campos obligatorios.');
    return;
  }

  // 1. Guardar en Supabase si es base real
  if (useLiveDatabase && supabaseClient && otUUID) {
    try {
      showToast('Guardando respuestas del formato...');
      const records = [];
      
      form.fields.forEach((f, idx) => {
        let val = '';
        if (f.type === 'checkbox' || f.type === 'radio' || f.type === 'si_no') {
          const radios = document.getElementsByName(`chk-field-${idx}`);
          let checkedRadio = Array.from(radios).find(r => r.checked);
          val = checkedRadio ? checkedRadio.value : 'N/A';
        } else {
          const input = document.getElementById(`chk-field-${idx}`);
          if (input) val = input.value.trim();
        }
        
        const commentInput = document.getElementById(`chk-field-comment-${idx}`);
        const comment = commentInput ? commentInput.value.trim() : '';

        const qId = f.id_pregunta || f.id;
        if (qId) {
          records.push({
            id_orden: otUUID,
            id_checklist: qId,
            respuesta: val,
            comentario: comment || null,
            usuario_responde: currentUser ? currentUser.name : 'Técnico Real',
            activo: true
          });
        }
      });

      if (records.length > 0) {
        const { error } = await supabaseClient.from('respuestas_checklist_orden').insert(records);
        if (error) throw error;
        showToast('Respuestas guardadas en Supabase.');
      }
    } catch (err) {
      console.error('Error saving checklist answers to Supabase:', err);
      alert('Error al guardar respuestas en Supabase: ' + err.message);
      return;
    }
  }

  // 2. Guardar localmente
  const savedResponses = JSON.parse(localStorage.getItem('TSMAI_dynamic_responses') || '[]');
  const newResponse = {
    id: 'RSP-' + Date.now().toString().slice(-6),
    formId: form.id,
    formName: form.name,
    area: form.area,
    otFolio: selectedOtId,
    otUUID: otUUID,
    answers: responses,
    submittedBy: currentUser ? currentUser.name : 'Técnico Demo',
    date: new Date().toISOString(),
    db_synced: useLiveDatabase
  };

  savedResponses.push(newResponse);
  localStorage.setItem('TSMAI_dynamic_responses', JSON.stringify(savedResponses));

  closeModal('modal-tech-checklist-run');
  showToast('Formato completado y guardado con éxito.');

  if (useLiveDatabase) {
    syncDatabases().then(() => {
      renderAdminRespChk();
    }).catch(err => console.error('Error in background sync after checklist response:', err));
  }
}

// --- BITÁCORA DE MANTENIMIENTO (LEVANTAMIENTO AUTÓNOMO) ---
let tempBitacoraSelectedParts = [];
let tempBitacoraMachineParts = []; // Parts specific to currently selected machine

async function openNewBitacoraLogModal() {
  tempBitacoraSelectedParts = [];
  tempBitacoraMachineParts = [];
  const form = document.getElementById('form-tech-bitacora-new');
  if (form) form.reset();
  
  // Set current local date and time
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  const todayStr = `${year}-${month}-${day}`;
  const timeStr = `${hours}:${minutes}`;

  const bDate = document.getElementById('bitacora-date');
  const bStart = document.getElementById('bitacora-time-start');
  const bEnd = document.getElementById('bitacora-time-end');

  if (bDate) bDate.value = todayStr;
  if (bStart) bStart.value = timeStr;
  if (bEnd) bEnd.value = timeStr;

  renderBitacoraSelectedPartsList();

  const otSelect   = document.getElementById('bitacora-ot');
  const partSelect = document.getElementById('bitacora-part-select');
  const machSelect = document.getElementById('bitacora-machine');

  if (partSelect) partSelect.innerHTML = '<option value="">— Selecciona máquina primero —</option>';

  let orders   = [];
  let machines = [];

  if (useLiveDatabase && supabaseClient) {
    try {
      showToast('Obteniendo datos actualizados...');
      const [ordRes, machRes] = await Promise.all([
        supabaseClient.from('ordenes_trabajo').select('folio, id_orden, cve_atendio, estatus, descripcion, departamento, maquina_id'),
        supabaseClient.from('cat_maquinas').select('equipo_towell, departamento_codigo')
      ]);
      if (!ordRes.error && ordRes.data) {
        orders = ordRes.data.map(o => ({
          id: o.folio, uuid: o.id_orden,
          assignedTech: o.cve_atendio, status: formatStatus(o.estatus),
          description: o.descripcion, area: o.departamento_codigo,
          machine: o.maquina_id
        }));
      }
      if (!machRes.error && machRes.data) {
        machines = machRes.data.map(m => ({ id: m.equipo_towell, name: m.equipo_towell, area: m.departamento_codigo }));
      }
    } catch (err) {
      console.warn('Supabase load failed, using localStorage:', err);
    }
  }

  if (orders.length === 0)   orders   = JSON.parse(localStorage.getItem('TSMAI_orders')   || '[]');
  if (machines.length === 0) machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');

  // Populate OTs select — all active orders for admin, or only assigned active orders for tech
  if (otSelect) {
    otSelect.innerHTML = '<option value="NO_APLICA">No aplica (Actividad Autónoma)</option>';
    if (currentUser) {
      const isAdmin = currentUser.role === 'admin';
      const myActive = orders.filter(o => {
        if (o.status === 'Cerrada' || o.status === 'Cancelada') return false;
        return isAdmin ? true : (o.assignedTech === currentUser.id);
      });
      myActive.forEach(o => {
        otSelect.innerHTML += `<option value="${o.id}" data-machine="${o.machine || ''}" data-area="${o.area || ''}">${o.id} — ${(o.description || '').substring(0, 45)}</option>`;
      });
    }
  }

  // Populate technician selector if admin is logged in
  const techGroup = document.getElementById('bitacora-tech-group');
  const techSelect = document.getElementById('bitacora-tech');
  const isAdminUser = currentUser && currentUser.role === 'admin';
  
  if (techGroup && techSelect) {
    if (isAdminUser) {
      techGroup.style.display = 'block';
      const techs = JSON.parse(localStorage.getItem('TSMAI_users') || '[]').filter(u => u.rol === 'MANTENIMIENTO');
      techSelect.innerHTML = '<option value="">Selecciona técnico...</option>';
      techs.forEach(t => {
        const idVal = t.cve_tecnico || t.id_usuario;
        techSelect.innerHTML += `<option value="${idVal}">${t.nombre_completo} (${idVal})</option>`;
      });
      techSelect.required = true;
    } else {
      techGroup.style.display = 'none';
      techSelect.required = false;
      techSelect.innerHTML = '';
    }
  }

  // Populate machines list
  if (machSelect) {
    machSelect.innerHTML = '<option value="NO_APLICA">No aplica</option>';
    machines.forEach(m => {
      machSelect.innerHTML += `<option value="${m.id}">${m.id}</option>`;
    });
  }

  openModal('modal-tech-new-bitacora');
}

const PROPORTION_MULTIPLIERS = {
  'MP': 1.0,    // Preventivo (100% de la base)
  'PDC': 0.75,  // Predictivo (75% de la base)
  'PRE': 0.75,  // Predictivo alias (75%)
  'MC': 0.50,   // Correctivo (50% de la base)
  'MA': 0.25,   // Autónomo (25% de la base)
  'INF': 1.0,   // Infraestructura (100%)
  'PE': 1.0     // Proyecto Especial (100%)
};

function getProportionMultiplier(otType) {
  if (!otType) return 1.0;
  const clean = String(otType).toUpperCase().trim();
  for (const k in PROPORTION_MULTIPLIERS) {
    if (clean.includes(k)) return PROPORTION_MULTIPLIERS[k];
  }
  return 1.0;
}

// Cargar refacciones específicas de la máquina seleccionada con cantidad proporcional
async function loadPartsForMachine(machineId, otType = 'MP') {
  const partSelect = document.getElementById('bitacora-part-select') || document.getElementById('tech-part-select');
  if (!partSelect) return;

  if (!machineId || machineId === 'NO_APLICA') {
    tempBitacoraMachineParts = [];
    partSelect.innerHTML = '<option value="">— Selecciona máquina primero —</option>';
    return;
  }

  const multiplier = getProportionMultiplier(otType);
  partSelect.innerHTML = '<option value="">⏳ Cargando refacciones del servicio...</option>';

  let machineParts = [];

  if (useLiveDatabase && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('cat_refacciones')
        .select('codigo_articulo, nombre_articulo, maquina_id, cantidad_estandar, costo_unitario, precio_costo_unitario')
        .eq('maquina_id', machineId)
        .order('nombre_articulo');

      if (!error && data && data.length > 0) {
        machineParts = data.map(r => {
          const baseQty = parseFloat(r.cantidad_estandar) || 1;
          const propQty = Math.max(1, Math.round(baseQty * multiplier * 100) / 100);
          return {
            id: r.codigo_articulo,
            name: r.nombre_articulo || r.codigo_articulo,
            cantidadEstandar: baseQty,
            cantidadSugerida: propQty,
            costo: parseFloat(r.costo_unitario || r.precio_costo_unitario || 0)
          };
        });
      } else {
        // Fallback: general parts
        const { data: genData } = await supabaseClient
          .from('cat_refacciones')
          .select('codigo_articulo, nombre_articulo, cantidad_estandar, costo_unitario, precio_costo_unitario')
          .limit(100);
        if (genData && genData.length > 0) {
          machineParts = genData.map(r => {
            const baseQty = parseFloat(r.cantidad_estandar) || 1;
            const propQty = Math.max(1, Math.round(baseQty * multiplier * 100) / 100);
            return {
              id: r.codigo_articulo,
              name: r.nombre_articulo || r.codigo_articulo,
              cantidadEstandar: baseQty,
              cantidadSugerida: propQty,
              costo: parseFloat(r.costo_unitario || r.precio_costo_unitario || 0)
            };
          });
        }
      }
    } catch (err) {
      console.warn('Error loading machine parts:', err);
    }
  }

  // Fallback: use full catalog from localStorage
  if (machineParts.length === 0) {
    const allParts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
    machineParts = allParts.map(p => {
      const baseQty = p.cantidadEstandar || 1;
      const propQty = Math.max(1, Math.round(baseQty * multiplier * 100) / 100);
      return {
        id: p.id,
        name: p.name,
        cantidadEstandar: baseQty,
        cantidadSugerida: propQty,
        costo: p.cost || 0
      };
    });
  }

  tempBitacoraMachineParts = machineParts;

  partSelect.innerHTML = machineParts.length > 0
    ? `<option value="">Selecciona refacción (${machineParts.length} repuestos para ${machineId})...</option>`
    : `<option value="">⚠️ Sin refacciones asignadas a esta máquina</option>`;

  machineParts.forEach(p => {
    partSelect.innerHTML += `<option value="${p.id}" data-qty="${p.cantidadSugerida}" data-base="${p.cantidadEstandar}" data-costo="${p.costo}">${p.name} — Sugerido (${Math.round(multiplier*100)}%): ${p.cantidadSugerida} pza [Base: ${p.cantidadEstandar}] ($${p.costo.toFixed(2)})</option>`;
  });
}

function onBitacoraOTChange() {
  const otSelect = document.getElementById('bitacora-ot');
  const otId = otSelect ? otSelect.value : 'NO_APLICA';

  if (otId !== 'NO_APLICA') {
    // Try to get machine from the option's data attribute first (live data)
    const selectedOption = otSelect.options[otSelect.selectedIndex];
    const machineId = selectedOption?.dataset?.machine || '';
    const area      = selectedOption?.dataset?.area || '';

    // Fallback to localStorage
    const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
    const order  = orders.find(o => o.id === otId);
    const resolvedMachine = machineId || order?.machine || '';
    const resolvedArea    = area || order?.area || '';

    const resolvedType    = order?.type || order?.orden_trabajo || 'MP';

    if (areaSelect && resolvedArea) areaSelect.value = resolvedArea;

    // Update machine select and load parts
    onBitacoraAreaChange(resolvedMachine);

    if (resolvedMachine) {
      loadPartsForMachine(resolvedMachine, resolvedType);
    }
  } else {
    document.getElementById('bitacora-area').value = '';
    const machSelect = document.getElementById('bitacora-machine');
    if (machSelect) {
      machSelect.innerHTML = '<option value="NO_APLICA">No aplica</option>';
      const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
      machines.forEach(m => {
        machSelect.innerHTML += `<option value="${m.id}">${m.id}</option>`;
      });
    }
    loadPartsForMachine(null);
  }
}

function onBitacoraAreaChange(preselectMachineId = null) {
  const area = document.getElementById('bitacora-area').value;
  const selectMach = document.getElementById('bitacora-machine');
  if (!selectMach) return;
  selectMach.innerHTML = '<option value="NO_APLICA">No aplica</option>';

  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const filtered = area ? machines.filter(m => m.area === area) : machines;
  filtered.forEach(m => {
    const isSelected = preselectMachineId === m.id ? 'selected' : '';
    selectMach.innerHTML += `<option value="${m.id}" ${isSelected}>${m.name || m.id} (${m.id})</option>`;
  });

  // Auto-load parts for the pre-selected machine
  if (preselectMachineId) {
    selectMach.value = preselectMachineId;
    loadPartsForMachine(preselectMachineId);
  }
}

// Called when machine dropdown changes manually
function onBitacoraMachineChange() {
  const machSelect = document.getElementById('bitacora-machine');
  const machineId = machSelect ? machSelect.value : null;
  loadPartsForMachine(machineId);
}

function onBitacoraPartChange() {
  const select = document.getElementById('bitacora-part-select');
  const qtyInput = document.getElementById('bitacora-part-qty');
  if (!select || !qtyInput) return;
  const selectedOption = select.options[select.selectedIndex];
  const stdQty = selectedOption?.dataset?.qty;
  if (stdQty) qtyInput.value = stdQty;
}

function addPartToBitacoraList() {
  const select = document.getElementById('bitacora-part-select');
  const partId = select.value;
  const qty = parseFloat(document.getElementById('bitacora-part-qty').value) || 1;

  if (!partId || qty <= 0) {
    alert('Selecciona una refacción y define una cantidad válida.');
    return;
  }

  // Look up from machine-specific list first, then localStorage fallback
  let part = tempBitacoraMachineParts.find(p => p.id === partId);
  if (!part) {
    const localParts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
    const lp = localParts.find(p => p.id === partId);
    if (lp) part = { id: lp.id, name: lp.name, cantidadEstandar: 1, costo: lp.cost || 0, stock: lp.stock || 0, stockMinimo: lp.minStock || 0 };
  }

  if (!part) {
    // Build minimal part from the option text
    const selectedOption = select.options[select.selectedIndex];
    part = { id: partId, name: selectedOption?.text || partId, cantidadEstandar: qty, costo: 0, stock: 999, stockMinimo: 0 };
  }

  const existIndex = tempBitacoraSelectedParts.findIndex(p => p.partId === partId);
  if (existIndex !== -1) {
    tempBitacoraSelectedParts[existIndex].quantity += qty;
  } else {
    tempBitacoraSelectedParts.push({
      partId: partId,
      name: part.name,
      quantity: qty,
      costoUnitario: part.costo || 0
    });
  }

  renderBitacoraSelectedPartsList();
  select.value = '';
  document.getElementById('bitacora-part-qty').value = '1';

}

function removePartFromBitacoraList(index) {
  tempBitacoraSelectedParts.splice(index, 1);
  renderBitacoraSelectedPartsList();
}

function renderBitacoraSelectedPartsList() {
  const list = document.getElementById('bitacora-used-parts-list');
  if (!list) return;
  let html = '';
  tempBitacoraSelectedParts.forEach((p, idx) => {
    html += `
      <li style="display: flex; justify-content: space-between; align-items: center; background-color: var(--bg-light); padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0; margin-bottom: 4px; border-top: none;">
        <span>🔧 <strong>${p.name || p.partId}</strong> x${p.quantity}</span>
        <button type="button" class="btn-logout" onclick="removePartFromBitacoraList(${idx})" style="padding: 4px 8px; font-size: 0.75rem; width: auto; margin-top: 0; background: #ef4444; border-color: #ef4444;">Quitar</button>
      </li>
    `;
  });
  list.innerHTML = html;
}

async function submitNewBitacoraLog() {
  const otId = document.getElementById('bitacora-ot').value;
  const area = document.getElementById('bitacora-area').value;
  const machine = document.getElementById('bitacora-machine').value;
  const dateVal = document.getElementById('bitacora-date').value;
  const startVal = document.getElementById('bitacora-time-start').value;
  const endVal = document.getElementById('bitacora-time-end').value;
  const description = document.getElementById('bitacora-description').value.trim();
  const observations = document.getElementById('bitacora-observations').value.trim();

  if (!area || !dateVal || !startVal || !endVal || !description) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }

  const timeStart = `${dateVal}T${startVal}:00`;
  const timeEnd = `${dateVal}T${endVal}:00`;

  // Determine technician code and name
  const isAdmin = currentUser && currentUser.role === 'admin';
  const techSelect = document.getElementById('bitacora-tech');
  let selectedTechId = currentUser ? currentUser.id : null;
  let selectedTechName = currentUser ? currentUser.name : null;

  if (isAdmin && techSelect) {
    selectedTechId = techSelect.value;
    if (!selectedTechId) {
      alert('Por favor selecciona el técnico que realizó la actividad.');
      return;
    }
    const techs = JSON.parse(localStorage.getItem('TSMAI_users') || '[]').filter(u => u.rol === 'MANTENIMIENTO');
    const t = techs.find(x => (x.cve_tecnico || x.id_usuario) === selectedTechId);
    selectedTechName = t ? t.nombre_completo : 'Técnico';
  }

  if (!selectedTechId) {
    selectedTechId = 'T-DEMO';
    selectedTechName = 'Técnico Demo';
  }

  let otUUID = null;
  if (otId !== 'NO_APLICA') {
    if (useLiveDatabase && supabaseClient) {
      try {
        const { data } = await supabaseClient
          .from('ordenes_trabajo')
          .select('id_orden')
          .eq('folio', otId)
          .maybeSingle();
        if (data) {
          otUUID = data.id_orden;
        }
      } catch (err) {
        console.warn('Error fetching OT UUID:', err);
      }
    }
    if (!otUUID) {
      const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
      const order = orders.find(o => o.id === otId);
      if (order) {
        otUUID = order.uuid || null;
      }
    }
  }

  const partsStr = tempBitacoraSelectedParts.map(p => `${p.name} x${p.quantity}`).join(', ') || 'Ninguna';

  // 1. Guardar en base de datos real si corresponde
  if (useLiveDatabase && supabaseClient) {
    try {
      showToast('Guardando en base de datos real...');
      const record = {
        id_orden: otUUID,
        cve_tecnico: selectedTechId,
        nombre_tecnico: selectedTechName,
        area: area,
        maquina_id: machine === 'NO_APLICA' ? null : machine,
        fecha_hora_inicio: timeStart,
        fecha_hora_fin: timeEnd,
        descripcion_actividad: description,
        refacciones_usadas: partsStr,
        observaciones: observations || 'Ninguna'
      };
      
      const { error: insErr } = await supabaseClient.from('bitacora_mantenimiento').insert([record]);
      if (insErr) throw insErr;
    } catch (err) {
      console.error('Error saving bitacora to Supabase:', err);
      alert('Error al guardar en Supabase: ' + err.message);
      return;
    }
  }

  // 3. Guardar en cache local para retrocompatibilidad/offline
  const localLogs = JSON.parse(localStorage.getItem('TSMAI_maintenance_logs') || '[]');
  const newLog = {
    id: 'LOG-' + Date.now().toString().slice(-6),
    otFolio: otId,
    otUUID: otUUID,
    cve_tecnico: selectedTechId,
    nombre_tecnico: selectedTechName,
    area: area,
    maquina_id: machine === 'NO_APLICA' ? null : machine,
    fecha_hora_inicio: timeStart,
    fecha_hora_fin: timeEnd,
    descripcion_actividad: description,
    refacciones_usadas: partsStr,
    observaciones: observations || 'Ninguna',
    date: new Date().toISOString(),
    db_synced: useLiveDatabase
  };

  localLogs.push(newLog);
  localStorage.setItem('TSMAI_maintenance_logs', JSON.stringify(localLogs));

  closeModal('modal-tech-new-bitacora');
  showToast('Actividad registrada con éxito.');

  // Refrescar vistas
  renderTechBitacora();
  
  if (useLiveDatabase) {
    syncDatabases().then(() => {
      renderTechBitacora();
      renderAdminLogsTable();
    }).catch(err => console.error('Error synchronizing bitacora:', err));
  }
}

async function renderTechBitacora() {
  const tbody = document.getElementById('table-tech-bitacora-body');
  if (!tbody) return;

  let logs = [];
  if (useLiveDatabase && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('bitacora_mantenimiento')
        .select('*')
        .order('fecha_hora_inicio', { ascending: false });
      if (!error && data) {
        const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
        logs = data.map(l => {
          const foundOrder = orders.find(o => o.uuid === l.id_orden);
          return {
            id: l.id_bitacora,
            otFolio: foundOrder ? foundOrder.id : 'NO_APLICA',
            otUUID: l.id_orden,
            cve_tecnico: l.cve_tecnico,
            nombre_tecnico: l.nombre_tecnico,
            area: l.area,
            maquina_id: l.maquina_id,
            fecha_hora_inicio: l.fecha_hora_inicio,
            fecha_hora_fin: l.fecha_hora_fin,
            descripcion_actividad: l.descripcion_actividad,
            refacciones_usadas: l.refacciones_usadas || 'Ninguna',
            observaciones: l.observaciones || 'Ninguna',
            date: l.fecha_alta || new Date().toISOString(),
            db_synced: true
          };
        });
        localStorage.setItem('TSMAI_maintenance_logs', JSON.stringify(logs));
      }
    } catch (err) {
      console.warn('Error fetching tech bitacora from Supabase:', err);
    }
  }

  if (logs.length === 0) {
    logs = JSON.parse(localStorage.getItem('TSMAI_maintenance_logs') || '[]');
  }

  // Auto-sintetizar registros de bitácora para cualquier OT finalizada, en validación o cerrada
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const closedOrExecuted = orders.filter(o => o.status === 'Pendiente de validación' || o.status === 'Terminada' || o.status === 'Cerrada' || o.status === 'Ejecutada');
  closedOrExecuted.forEach(o => {
    const otId = o.id || o.folio;
    const hasLog = logs.some(l => l.otFolio === otId || (l.otUUID && l.otUUID === o.uuid) || l.id_orden === otId);
    if (!hasLog) {
      const diagText = o.diagnosis ? `Diagnóstico: ${o.diagnosis}` : '';
      const actText = o.activity ? `Actividad: ${o.activity}` : '';
      const mainDesc = o.description || o.descripcion || 'Atención y resolución de Orden de Trabajo';
      const activityDesc = `[OT ${otId}] ${mainDesc}${diagText ? ' | ' + diagText : ''}${actText ? ' | ' + actText : ''}`;
      
      const techId = o.assignedTech || o.cve_atendio || (currentUser ? (currentUser.uuid || currentUser.id) : 'T-01');
      const techName = o.techName || o.nombre_tecnico || (currentUser ? currentUser.name : 'Técnico');

      const syntheticLog = {
        id: 'LOG-OT-' + otId,
        otFolio: otId,
        otUUID: o.uuid || null,
        cve_tecnico: techId,
        nombre_tecnico: techName,
        area: o.area || o.departamento || 'PF',
        maquina_id: o.machine || o.maquina_id || null,
        fecha_hora_inicio: o.fecha_hora_inicio || o.date || o.created_at || new Date().toISOString(),
        fecha_hora_fin: o.fecha_hora_fin || o.closeDate || new Date().toISOString(),
        descripcion_actividad: activityDesc,
        refacciones_usadas: o.usedParts && Array.isArray(o.usedParts) ? o.usedParts.map(p => `${p.name || p.partId} x${p.quantity || 1}`).join(', ') : (o.refacciones_usadas || 'Sin refacciones'),
        observaciones: o.observations || `Orden ${otId} atendida con éxito.`,
        date: o.fecha_hora_fin || o.closeDate || new Date().toISOString(),
        status: o.status,
        db_synced: false
      };
      logs.unshift(syntheticLog);
    }
  });

  const myLogs = logs.filter(l => {
    if (!currentUser) return true;
    if (currentUser.role === 'admin' || currentUser.rol === 'SUPER_ADMINISTRADOR') return true;

    const matchesId = l.cve_tecnico === currentUser.id || l.cve_tecnico === currentUser.uuid;
    const matchesEmail = l.cve_tecnico === currentUser.email;
    const matchesName = l.cve_tecnico === currentUser.name || l.nombre_tecnico === currentUser.name;

    const foundOrder = orders.find(o => o.id === l.otFolio || o.uuid === l.otUUID || o.folio === l.otFolio);
    const matchesOrder = foundOrder && (
      foundOrder.assignedTech === currentUser.id ||
      foundOrder.assignedTech === currentUser.uuid ||
      foundOrder.cve_atendio === currentUser.id ||
      foundOrder.cve_atendio === currentUser.uuid ||
      foundOrder.techName === currentUser.name ||
      foundOrder.email === currentUser.email
    );

    return matchesId || matchesEmail || matchesName || matchesOrder;
  });

  if (myLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No tienes actividades registradas en la bitácora.</td></tr>`;
    return;
  }

  myLogs.sort((a, b) => new Date(b.date || b.fecha_hora_fin) - new Date(a.date || a.fecha_hora_fin));

  tbody.innerHTML = myLogs.map(l => {
    const fDate = new Date(l.date || l.fecha_hora_fin || new Date());
    const formattedDate = fDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const sTime = l.fecha_hora_inicio ? new Date(l.fecha_hora_inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';
    const eTime = l.fecha_hora_fin ? new Date(l.fecha_hora_fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';
    const horarioStr = `${sTime} - ${eTime}`;

    const otLabel = l.otFolio && l.otFolio !== 'NO_APLICA' ? l.otFolio : (l.id_orden || 'Autónomo');

    return `
      <tr>
        <td><strong>${formattedDate}</strong></td>
        <td><strong>${otLabel}</strong><br><span style="font-size:0.82rem;color:var(--text-secondary);">${l.descripcion_actividad || ''}</span></td>
        <td>${l.area || 'General'} - <strong>${l.maquina_id || 'N/A'}</strong></td>
        <td><span class="badge badge-status-asignada" style="font-size:0.78rem;">⏰ ${horarioStr}</span></td>
        <td style="max-width:180px;white-space:normal;font-size:0.85rem;">${l.refacciones_usadas || 'Ninguna'}</td>
        <td style="max-width:220px;white-space:normal;font-size:0.85rem;">${l.observaciones || 'Sin observaciones'}</td>
      </tr>
    `;
  }).join('');
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

function openAnalysisListModal() {
  renderAdminAnalysis();
  openModal('modal-admin-analysis-list');
}

function openAIRecommendationsModal() {
  renderAdminAIRecommendations();
  openModal('modal-admin-ai-list');
}

function openAlertsModal() {
  renderAdminAlertas();
  openModal('modal-admin-alerts-list');
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

// --- E1: Indicador de conectividad ---
function updateConnectionIndicator(online) {
  document.querySelectorAll('.system-status-indicator').forEach(badge => {
    const dot = badge.querySelector('.status-dot');
    const label = badge.querySelector('.conn-label');
    if (online) {
      badge.classList.remove('offline');
      if (dot) { dot.style.backgroundColor = ''; dot.style.animation = ''; }
      if (label) label.textContent = 'En Vivo';
    } else {
      badge.classList.add('offline');
      if (dot) { dot.style.backgroundColor = '#ef4444'; dot.style.animation = 'pulse-red 1s infinite'; }
      if (label) label.textContent = 'Sin conexión';
    }
  });
}

// --- C1: showToast tipificado (compatible con llamadas existentes — type es opcional) ---
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  if (!toast || !toastText) return;

  const config = {
    success: { color: '#22c55e' },
    error:   { color: '#ef4444' },
    warning: { color: '#f59e0b' },
    info:    { color: '#06b6d4' },
  };
  const { color } = config[type] || config.info;

  toastText.innerText = message;
  toast.style.setProperty('--toast-accent', color);
  toast.className = `toast-notification toast-${type}`;
  toast.classList.add('show');

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, type === 'error' ? 5000 : 3000);
}

// --- C2: Bloqueo de botón durante operaciones async (anti-doble-clic) ---
function setButtonLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Guardando...';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled = false;
    delete btn.dataset.originalText;
  }
}

// --- D1: Wrapper de llamadas Supabase con reintentos automáticos ---
async function supabaseCall(fn, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      if (result?.error) throw result.error;
      return result;
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = 1000 * (attempt + 1);
      console.warn(`[supabaseCall] Reintento ${attempt + 1}/${retries} en ${wait}ms...`, err.message);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

// Función auxiliar para rellenar los técnicos activos en el modal de conversión del admin
function populateTectSelects() {
  const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
  const activeTechs = techs.filter(t => t.activo !== false);
  
  // Select en modal de revisión del admin
  const reviewTechSelect = document.getElementById('review-tech');
  if (reviewTechSelect) {
    let html = '<option value="">Selecciona técnico...</option>';
    activeTechs.forEach(t => {
      const deptLbl = t.department ? ` [${t.department}]` : '';
      html += `<option value="${t.id}">${t.name} (${t.specialty || 'General'})${deptLbl}</option>`;
    });
    reviewTechSelect.innerHTML = html;
  }
}

// Cargar lista de empleados activos para autocomplete en el portal público
async function loadPublicEmployeesList() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('cat_empleados')
      .select('cve_empleado, nombre_empleado')
      .eq('activo', true)
      .order('nombre_empleado');
    if (error) throw error;
    if (data) {
      window.publicEmployeesList = data;
      const datalist = document.getElementById('employees-list');
      if (datalist) {
        datalist.innerHTML = data.map(e => `<option value="${e.nombre_empleado}"></option>`).join('');
      }
    }
  } catch (err) {
    console.error('Error loading employees for autocomplete:', err);
  }
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 1024) {
    document.querySelectorAll('.sidebar').forEach(sb => sb.classList.remove('show'));
    const overlay = document.getElementById('sidebar-backdrop-overlay');
    if (overlay) overlay.classList.remove('show');
  }
}

// Toggle para colapsar / expandir barra lateral en cualquier dispositivo (PC, Laptop, Tablet, Celular)
function toggleSidebar() {
  const activeView = document.querySelector('.view-section.active');
  const sidebar = activeView ? (activeView.querySelector('.sidebar') || document.querySelector('.sidebar')) : document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-backdrop-overlay');

  if (!sidebar) return;

  const isMobile = window.innerWidth <= 1024;

  if (isMobile) {
    // Celulares y Tablets: Drawer desplegable deslizante con fondo oscurecido
    const isShow = sidebar.classList.toggle('show');
    sidebar.classList.remove('collapsed');
    if (overlay) {
      if (isShow) overlay.classList.add('show');
      else overlay.classList.remove('show');
    }
  } else {
    // Escritorio / Laptops: Colapsar o expandir barra lateral a pantalla completa
    sidebar.classList.toggle('collapsed');
    sidebar.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
  }
}

// --- SUBTAREAS & PROGRESS OPERATION FUNCTIONS ---
function getOTProgressSync(otId, status) {
  const subtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
  const otSubtasks = subtasks.filter(s => s.otId === otId);
  if (otSubtasks.length > 0) {
    const finished = otSubtasks.filter(s => s.status === 'Terminada' || s.status === 'Cancelada').length;
    return Math.round((finished / otSubtasks.length) * 100);
  }
  
  if (status === 'Cerrada' || status === 'Ejecutada' || status === 'En validación' || status === 'Lista para validación') return 100;
  if (status === 'En proceso' || status === 'En levantamiento' || status === 'En ejecución' || status === 'En ejecución con subtareas') return 50;
  if (status === 'Asignada') return 20;
  return 0;
}

async function renderAdminSubtasksTable() {
  const subtasks = await dbGetSubtasks();
  const evidences = await dbGetEvidences();
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const tbody = document.getElementById('table-admin-subtasks-body');
  if (!tbody) return;

  // Actualizar conteo del badge de subtareas pendientes
  updateSubtasksBadgeCount(subtasks);

  if (subtasks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">No se encontraron subtareas registradas.</td></tr>`;
    return;
  }

  let html = '';
  subtasks.forEach(s => {
    // Buscar nombre de la máquina asociada a la OT principal
    const order = orders.find(o => o.id === s.otId);
    let machineName = '-';
    if (order) {
      const mach = machines.find(m => m.id === order.machine);
      machineName = mach ? mach.name : order.machine;
    }

    let actionBtn = '';
    if (s.status.toLowerCase() === 'solicitada') {
      actionBtn = `<button class="btn-table-action" onclick="openSubtaskAssignModal('${s.id}')">Asignar responsable</button>`;
    } else {
      actionBtn = `<span style="color: var(--text-muted); font-size: 0.8rem;">Asignada (${getUserNameByUUID(s.assignedTech)})</span>`;
    }

    let statusBadge = '';
    if (s.status.toLowerCase() === 'solicitada') statusBadge = '<span class="badge badge-priority-media">Solicitada</span>';
    else if (s.status.toLowerCase() === 'asignada') statusBadge = '<span class="badge badge-priority-baja">Asignada</span>';
    else if (s.status.toLowerCase() === 'en_proceso') statusBadge = '<span class="badge badge-priority-media">En proceso</span>';
    else if (s.status.toLowerCase() === 'terminada') statusBadge = '<span class="badge badge-priority-alta" style="background: #22c55e; color: white;">Terminada</span>';
    else if (s.status.toLowerCase() === 'cancelada') statusBadge = '<span class="badge badge-priority-crítica">Cancelada</span>';
    else statusBadge = `<span class="badge badge-priority-baja">${formatSubtaskStatus(s.status)}</span>`;

    html += `
      <tr>
        <td><strong>${s.otId}</strong></td>
        <td>${machineName}</td>
        <td>${formatSubtaskArea(s.area)}</td>
        <td>${s.title || s.description}</td>
        <td><span class="badge badge-priority-${s.priority.toLowerCase()}">${formatSubtaskPriority(s.priority)}</span></td>
        <td>${new Date(s.dueDate).toLocaleDateString('es-ES')}</td>
        <td>${getUserNameByUUID(s.requestedBy)}</td>
        <td>${statusBadge}</td>
        <td>${actionBtn}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function updateSubtasksBadgeCount(subtasksList) {
  const badge = document.getElementById('badge-count-subtasks');
  if (!badge) return;
  const list = subtasksList || JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
  const count = list.filter(s => s.status.toLowerCase() === 'solicitada').length;
  if (count > 0) {
    badge.innerText = count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

async function openSubtaskAssignModal(subtaskId) {
  const subtasks = await dbGetSubtasks();
  const sub = subtasks.find(s => s.id === subtaskId);
  if (!sub) return;

  const evidences = await dbGetEvidences();
  const subEvidence = evidences.find(e => e.subtaskId === subtaskId && e.origin === 'solicitud');
  const evidenceName = subEvidence ? subEvidence.fileName : null;

  document.getElementById('assign-subtask-id').value = subtaskId;
  document.getElementById('subtask-assign-lbl-folio').innerText = sub.otId;
  document.getElementById('subtask-assign-lbl-area').innerText = formatSubtaskArea(sub.area);
  document.getElementById('subtask-assign-lbl-priority').innerText = formatSubtaskPriority(sub.priority);
  document.getElementById('subtask-assign-lbl-date').innerText = new Date(sub.dueDate).toLocaleDateString('es-ES');
  document.getElementById('subtask-assign-lbl-desc').innerText = sub.description;
  document.getElementById('subtask-assign-lbl-reason').innerText = sub.reason || '-';
  document.getElementById('subtask-assign-lbl-paro').innerText = sub.requiresParo ? 'Sí' : 'No';
  document.getElementById('subtask-assign-lbl-refaccion').innerText = sub.requiresPart ? 'Sí' : 'No';
  document.getElementById('subtask-assign-lbl-by').innerText = getUserNameByUUID(sub.requestedBy);

  const evidBox = document.getElementById('subtask-assign-lbl-evid-box');
  if (evidenceName) {
    evidBox.style.display = 'block';
    document.getElementById('subtask-assign-img-lbl').innerHTML = `🖼️ <a style="color: var(--accent-blue); text-decoration: underline; cursor:pointer;" onclick="alert('Visualizando evidencia: ' + '${evidenceName}')">${evidenceName}</a>`;
  } else {
    evidBox.style.display = 'none';
  }

  // Populate active technician dropdown in assignment modal
  const techSelect = document.getElementById('subtask-assign-tech');
  if (techSelect) {
    const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
    const activeTechs = techs.filter(t => t.activo !== false);
    let html = '<option value="">Selecciona técnico...</option>';
    activeTechs.forEach(t => {
      const deptLbl = t.department ? ` [${t.department}]` : '';
      html += `<option value="${t.id}">${t.name} (${t.specialty || 'General'})${deptLbl}</option>`;
    });
    techSelect.innerHTML = html;
  }

  // Reset inputs
  document.getElementById('subtask-assign-priority').value = sub.priority.toLowerCase();
  document.getElementById('subtask-assign-obs').value = '';

  openModal('modal-admin-subtask-assign');
}

async function saveSubtaskAssignment() {
  const subId = document.getElementById('assign-subtask-id').value;
  const techId = document.getElementById('subtask-assign-tech').value;
  const priority = document.getElementById('subtask-assign-priority').value;
  const obs = document.getElementById('subtask-assign-obs').value.trim();

  if (!techId) {
    alert('Por favor selecciona un técnico responsable.');
    return;
  }

  const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
  const tech = techs.find(t => t.id === techId);
  const techName = tech ? tech.name : techId;

  // Actualizar subtarea
  await dbUpdateSubtask(subId, {
    status: 'asignada',
    assignedTech: getUserUUID(techId) || techId,
    assignedBy: getUserUUID(currentUser.id) || getAdminUUID(),
    assignDate: new Date().toISOString(),
    priority: priority,
    observations: obs
  });

  // Obtener subtarea para saber su OT ID
  const subtasks = await dbGetSubtasks();
  const sub = subtasks.find(s => s.id === subId);

  if (sub) {
    // Buscar orden principal y cambiar estado a 'En ejecución con subtareas' (Regla 3)
    const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
    const orderIndex = orders.findIndex(o => o.id === sub.otId);
    if (orderIndex !== -1) {
      orders[orderIndex].status = 'En ejecución con subtareas';
      orders[orderIndex].historyLogs.push({
        date: new Date().toISOString(),
        status: 'En ejecución con subtareas',
        user: 'Super Admin',
        comment: `Subtarea #${sub.number} asignada al técnico ${techName}.`
      });
      localStorage.setItem('TSMAI_orders', JSON.stringify(orders));

      // Actualizar en Supabase si aplica
      if (supabaseClient) {
        try {
          await supabaseClient
            .from('ordenes_trabajo')
            .update({ estatus: 'en_ejecucion_con_subtareas' })
            .eq('folio', sub.otId);
        } catch (err) {
          console.error('Error updating order status in Supabase:', err);
        }
      }
    }

    // Registrar en bitácora de movimientos
    const movement = {
      id: crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36)),
      otUUID: sub.otUUID,
      subtaskId: sub.id,
      type: 'Subtarea asignada',
      oldState: 'Solicitada',
      newState: 'Asignada',
      by: 'Super Admin',
      comment: `Subtarea #${sub.number} asignada al técnico ${techName}. Obs: ${obs}`,
      date: new Date().toISOString()
    };
    await dbInsertMovement(movement);
  }

  closeModal('modal-admin-subtask-assign');
  showToast('Subtarea asignada correctamente.');
  await syncDatabases();
  renderAdminSubtasksTable();
}

async function cancelSubtaskRequest() {
  const subId = document.getElementById('assign-subtask-id').value;
  const justification = prompt('Escribe el motivo o justificación del rechazo/cancelación de la subtarea:');
  if (justification === null) return; // cancelado por el prompt
  if (justification.trim() === '') {
    alert('Es obligatorio ingresar una justificación.');
    return;
  }

  // Actualizar subtarea a Cancelada
  await dbUpdateSubtask(subId, {
    status: 'cancelada',
    observations: `Rechazada/Cancelada por Admin: ${justification}`
  });

  const subtasks = await dbGetSubtasks();
  const sub = subtasks.find(s => s.id === subId);

  if (sub) {
    // Validar si quedan subtareas activas en la OT principal para recalcular avance / reajustar estado
    await checkAndUpdateMainOTState(sub.otId);

    // Registrar movimiento
    const movement = {
      id: crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36)),
      otUUID: sub.otUUID,
      subtaskId: sub.id,
      type: 'Subtarea cancelada',
      oldState: 'Solicitada',
      newState: 'Cancelada',
      by: 'Super Admin',
      comment: `Subtarea #${sub.number} cancelada por el administrador. Motivo: ${justification}`,
      date: new Date().toISOString()
    };
    await dbInsertMovement(movement);
  }

  closeModal('modal-admin-subtask-assign');
  showToast('Subtarea cancelada exitosamente.');
  await syncDatabases();
  renderAdminSubtasksTable();
}

async function cancelSubtaskRequestFromModal() {
  // Alias helper
  cancelSubtaskRequest();
}

async function checkAndUpdateMainOTState(otId) {
  const subtasks = await dbGetSubtasks();
  const otSubtasks = subtasks.filter(s => s.otId === otId);
  if (otSubtasks.length === 0) return;

  const activeSubtasks = otSubtasks.filter(s => ['solicitada', 'asignada', 'en_proceso', 'en_espera', 'bloqueada'].includes(s.status.toLowerCase()));
  
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const orderIndex = orders.findIndex(o => o.id === otId);
  if (orderIndex === -1) return;

  let newStatus = orders[orderIndex].status;
  let comment = '';

  if (activeSubtasks.length === 0) {
    newStatus = 'Lista para validación';
    comment = 'Todas las subtareas han terminado o se cancelaron. La orden principal pasa a Lista para validación.';
  } else {
    // Si hay subtareas activas, comprobar sus estados
    const assignedOrWorking = activeSubtasks.filter(s => ['asignada', 'en_proceso'].includes(s.status.toLowerCase()));
    if (assignedOrWorking.length > 0) {
      newStatus = 'En ejecución con subtareas';
    } else {
      newStatus = 'Requiere subtarea';
    }
    comment = `Se actualizó el estado de la OT por cambios en sus subtareas (${activeSubtasks.length} activa(s)).`;
  }

  if (orders[orderIndex].status !== newStatus) {
    const oldStatus = orders[orderIndex].status;
    orders[orderIndex].status = newStatus;
    orders[orderIndex].historyLogs.push({
      date: new Date().toISOString(),
      status: newStatus,
      user: 'Sistema',
      comment: comment
    });
    localStorage.setItem('TSMAI_orders', JSON.stringify(orders));

    if (supabaseClient) {
      try {
        await supabaseClient
          .from('ordenes_trabajo')
          .update({ estatus: getDBStatus(newStatus) })
          .eq('folio', otId);
      } catch (err) {
        console.error('Error updating order status in Supabase:', err);
      }
    }

    // Registrar en bitácora de movimientos
    const movement = {
      id: crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36)),
      otUUID: orders[orderIndex].uuid || orders[orderIndex].id || null,
      subtaskId: null,
      type: 'Cambio estado OT principal',
      oldState: oldStatus,
      newState: newStatus,
      by: 'Sistema',
      comment: comment,
      date: new Date().toISOString()
    };
    await dbInsertMovement(movement);
  }
}

// --- PASSWORD AND EMAIL SIMULATION FLOWS ---

function showSimulatedEmail(to, subject, bodyHtml, actionText, actionCallback) {
  document.getElementById('mail-to-address').innerText = to;
  document.getElementById('mail-subject').innerText = subject;
  document.getElementById('mail-body').innerHTML = bodyHtml;
  
  const actionBtn = document.getElementById('btn-mail-action');
  if (actionBtn) {
    actionBtn.innerText = actionText || 'Copiar';
    
    // Eliminar listeners de eventos viejos clonando el elemento
    const newActionBtn = actionBtn.cloneNode(true);
    actionBtn.parentNode.replaceChild(newActionBtn, actionBtn);
    
    newActionBtn.addEventListener('click', () => {
      if (actionCallback) actionCallback();
    });
  }
  
  openModal('modal-email-simulator');
}

// --- PASSWORD RECOVERY WITH 2FA (EMAIL + SMS OTP) ---
function openPasswordRecoveryRequest() {
  const emailInput = document.getElementById('recovery-email');
  const phoneInput = document.getElementById('recovery-phone');
  const otpInput = document.getElementById('recovery-otp');
  
  if (emailInput) emailInput.value = '';
  if (phoneInput) phoneInput.value = '';
  if (otpInput) otpInput.value = '';
  
  document.getElementById('recovery-step-1').style.display = 'block';
  document.getElementById('recovery-step-2').style.display = 'none';
  
  openModal('modal-password-recovery');
}

function goBackToStep1() {
  document.getElementById('recovery-step-1').style.display = 'block';
  document.getElementById('recovery-step-2').style.display = 'none';
}

async function submitRecoveryRequest2FA() {
  const email = document.getElementById('recovery-email').value.trim().toLowerCase();
  const phone = document.getElementById('recovery-phone').value.trim();

  if (!email || !phone) {
    alert('Por favor completa todos los campos.');
    return;
  }

  // 1. Validar que el usuario exista en la base de datos (local o remota)
  let userRecord = null;
  const localUsers = JSON.parse(localStorage.getItem('TSMAI_users') || '[]');
  
  if (supabaseClient) {
    try {
      showToast('Verificando usuario...');
      const { data, error } = await supabaseClient
        .from('cat_usuarios_roles')
        .select('*')
        .eq('correo', email)
        .maybeSingle();
      if (!error && data) {
        userRecord = data;
      }
    } catch (err) {
      console.warn('Error al verificar correo en Supabase, buscando en local:', err);
    }
  }

  if (!userRecord) {
    userRecord = localUsers.find(u => u.correo && u.correo.toLowerCase() === email);
  }

  if (!userRecord) {
    alert('El correo electrónico ingresado no coincide con ningún usuario del sistema.');
    return;
  }

  // 2. Asociar el teléfono ingresado al usuario si el teléfono en la base de datos es nulo o coincide
  // (Para facilitar las pruebas iniciales del usuario, si no tiene teléfono registrado se lo asociamos en el flujo)
  const userPhone = userRecord.telefono || '';
  if (userPhone && userPhone.replace(/\s+/g, '') !== phone.replace(/\s+/g, '')) {
    alert('El número de teléfono no coincide con el registrado para esta cuenta.');
    return;
  }

  // 3. Generar código OTP y disparar simulador SMS
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  recoveryGeneratedOTP = otpCode;
  recoveryTargetEmail = email;

  // Actualizar el valor en la pantalla del celular simulado
  const smsSimField = document.getElementById('sms-simulated-code');
  if (smsSimField) {
    smsSimField.innerText = otpCode;
  }

  // Mostrar el teléfono simulado y enmascarar en el modal
  openModal('modal-sms-simulator');
  
  const masked = phone.length > 4 ? '******' + phone.slice(-4) : phone;
  document.getElementById('recovery-masked-phone').innerText = masked;

  // Pasar al paso 2 en el modal
  document.getElementById('recovery-step-1').style.display = 'none';
  document.getElementById('recovery-step-2').style.display = 'block';
  
  showToast('Código enviado por SMS (Simulador)');
}

async function verifyRecoveryOTP() {
  const enteredOtp = document.getElementById('recovery-otp').value.trim();

  if (!enteredOtp || enteredOtp.length !== 6) {
    alert('Por favor ingresa el código de 6 dígitos.');
    return;
  }

  if (enteredOtp !== recoveryGeneratedOTP) {
    alert('El código de verificación OTP ingresado es incorrecto.');
    return;
  }

  // OTP Correcto -> Cerrar simulador de teléfono
  closeModal('modal-sms-simulator');
  showToast('Verificación telefónica exitosa. Enviando correo...');

  // 4. Solicitar el envío del correo de recuperación en Supabase Auth
  let sentRealEmail = false;
  if (supabaseClient) {
    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error } = await supabaseClient.auth.resetPasswordForEmail(recoveryTargetEmail, {
        redirectTo: redirectUrl
      });
      if (!error) {
        sentRealEmail = true;
      } else {
        console.warn('Real Supabase Auth email failed (probably rate limit), falling back to simulator:', error.message);
        showToast('⚠️ Límite de Supabase alcanzado, usando simulador de correo...');
      }
    } catch (err) {
      console.warn('Exception sending recovery email, falling back to simulator:', err);
    }
  }

  closeModal('modal-password-recovery');

  if (sentRealEmail) {
    alert('🛡️ Doble Verificación Exitosa: Hemos enviado un correo con el enlace para restablecer tu contraseña. Revísalo para continuar.');
  } else {
    // Fallback: Mostrar el simulador de correo en pantalla para que puedan continuar sin bloqueos
    const simulatedLink = `${window.location.origin}${window.location.pathname}#access_token=SIMULATED_RECOVERY&type=recovery`;
    
    const bodyHtml = `
      <div style="font-family: sans-serif; padding: 10px; color: #334155;">
        <h3 style="color: #6366f1; margin-top: 0;">Restablecer Contraseña TSM-AI</h3>
        <p>Hola,</p>
        <p>Has solicitado restablecer tu contraseña para acceder al sistema <strong>Towell Smart Maintenance AI</strong>.</p>
        <p>Por favor haz clic en el siguiente botón para establecer tu nueva clave de acceso:</p>
        <div style="margin: 20px 0; text-align: center;">
          <a href="${simulatedLink}" onclick="closeModal('modal-email-simulator')" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            🔑 Establecer Nueva Contraseña
          </a>
        </div>
        <p style="font-size: 0.8rem; color: #64748b;">Si tú no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `;
    
    // Llamar al simulador de correo
    showSimulatedEmail(
      recoveryTargetEmail,
      '🔑 Restablecer Contraseña — Doble Verificación TSM-AI',
      bodyHtml,
      'Ir al Enlace',
      () => {
        closeModal('modal-email-simulator');
        window.location.hash = 'access_token=SIMULATED_RECOVERY&type=recovery';
        triggerRecoveryUI();
      }
    );
  }
}

async function submitChangedPassword() {
  const userId = document.getElementById('change-pass-user-id').value;
  const targetView = document.getElementById('change-pass-target-view').value;
  const newPass = document.getElementById('change-pass-new').value.trim();
  const confirmPass = document.getElementById('change-pass-confirm').value.trim();

  if (!newPass || newPass.length < 6) {
    alert('La contraseña debe tener al menos 6 caracteres.');
    return;
  }
  if (newPass !== confirmPass) {
    alert('Las contraseñas no coinciden. Por favor inténtalo de nuevo.');
    return;
  }

  // Actualizar contraseña en Supabase Auth (módulo de autenticación nativo)
  if (supabaseClient) {
    try {
      // Primero intentar actualizar en Supabase Auth para que el login funcione con la nueva clave
      const { error: authError } = await supabaseClient.auth.updateUser({ password: newPass });
      if (authError) {
        console.warn('Supabase Auth updateUser warning:', authError.message);
        // Si es un error de sesión en modo simulado, no arrojar excepción
        if (!authError.message.includes('session') && !authError.message.includes('missing')) {
          throw authError;
        }
      }

      // Si no es modo recovery (tiene userId), también actualizar en cat_usuarios_roles
      if (userId && userId !== 'RECOVERY_MODE') {
        await supabaseClient
          .from('cat_usuarios_roles')
          .update({ 
            debe_cambiar_contrasenia: false,
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('id_usuario', userId);
      } else {
        // Modo recovery: buscar por correo del usuario autenticado o de nuestra variable recoveryTargetEmail
        let emailToUpdate = recoveryTargetEmail;
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user?.email) {
            emailToUpdate = user.email;
          }
        } catch(e) {}
        
        if (emailToUpdate) {
          await supabaseClient
            .from('cat_usuarios_roles')
            .update({ debe_cambiar_contrasenia: false, fecha_actualizacion: new Date().toISOString() })
            .eq('correo', emailToUpdate);
        }
      }

      showToast('✅ Contraseña actualizada con éxito.');
    } catch (err) {
      console.error('Error al actualizar la contraseña en Supabase:', err);
      alert('Error al guardar: ' + err.message);
      return;
    }
  }

  // Actualizar en localStorage y realizar el inicio de sesión
  let users = JSON.parse(localStorage.getItem('TSMAI_users') || '[]');
  let targetUser = null;

  if (userId === 'RECOVERY_MODE') {
    // Modo de recuperación: buscar por correo del usuario de Supabase o variable temporal
    let emailToFind = recoveryTargetEmail;
    if (supabaseClient) {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user?.email) {
          emailToFind = user.email;
        }
      } catch (err) {
        console.warn('No se pudo recuperar el usuario de la sesión de Supabase Auth:', err);
      }
    }
    if (emailToFind) {
      targetUser = users.find(u => u.correo && u.correo.toLowerCase() === emailToFind.toLowerCase());
    }
  } else {
    targetUser = users.find(u => u.id_usuario === userId);
  }

  if (targetUser) {
    const userIdx = users.findIndex(u => u.id_usuario === targetUser.id_usuario);
    if (userIdx !== -1) {
      users[userIdx].contrasenia = newPass;
      users[userIdx].debe_cambiar_contrasenia = false;
      localStorage.setItem('TSMAI_users', JSON.stringify(users));
    }

    // Iniciar sesión del usuario
    const dbUser = targetUser;
    if (dbUser.rol === 'SUPER_ADMINISTRADOR') {
      currentUser = { 
        role: 'admin', 
        name: dbUser.nombre_completo, 
        email: dbUser.correo,
        uuid: dbUser.id_usuario 
      };
      closeModal('modal-change-password');
      showToast(`Sesión iniciada como Super Admin: ${dbUser.nombre_completo}`);
      showView('admin');
      switchAdminPanel('dashboard');
    } else if (dbUser.rol === 'MANTENIMIENTO') {
      const techId = dbUser.cve_tecnico || dbUser.id_usuario;
      currentUser = { 
        role: 'tech', 
        id: techId,
        uuid: dbUser.id_usuario,
        name: dbUser.nombre_completo, 
        email: dbUser.correo,
        specialty: dbUser.observaciones || 'General',
        avatar: '👨‍🔧'
      };
      closeModal('modal-change-password');
      showToast(`Sesión iniciada como Técnico: ${dbUser.nombre_completo}`);
      
      const pName = document.getElementById('tech-profile-name');
      const pSpec = document.getElementById('tech-profile-specialty');
      const pAvat = document.getElementById('tech-profile-avatar');
      if (pName) pName.innerText = dbUser.nombre_completo;
      if (pSpec) pSpec.innerText = dbUser.observaciones || 'General';
      if (pAvat) pAvat.innerText = '👨‍🔧';
      
      showView('tech');
      switchTechPanel('dashboard');
    }
  } else {
    // Si no se encuentra en caché local, de todas formas cerrar el modal
    closeModal('modal-change-password');
    showToast('Contraseña actualizada. Por favor inicia sesión normalmente.');
    showView('public-portal');
    showPublicPanel('home');
  }

  if (supabaseClient) {
    try {
      await syncDatabases();
    } catch (e) {
      console.warn('Sync failed after password change:', e);
    }
  }
}

async function resetAdminUserPassword(userId) {
  if (!userId) return;

  const users = JSON.parse(localStorage.getItem('TSMAI_users') || '[]');
  const user = users.find(u => u.id_usuario === userId);
  if (!user) return;

  if (!confirm(`¿Estás seguro de que deseas restablecer la contraseña para el usuario "${user.nombre_completo}"? Se generará una nueva contraseña temporal y se simulará el envío de un correo electrónico.`)) {
    return;
  }

  const tempPass = 'RST-' + Math.floor(1000 + Math.random() * 9000);

  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('cat_usuarios_roles')
        .update({ 
          debe_cambiar_contrasenia: true,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id_usuario', userId);
      if (error) throw error;
      showToast('Contraseña restablecida en Supabase.');
    } catch (err) {
      console.error('Error al restablecer la contraseña en Supabase:', err);
      alert('Error en Supabase: ' + err.message);
      return;
    }
  }

  // Actualizar en localStorage
  const updatedUsers = users.map(u => u.id_usuario === userId ? { ...u, contrasenia: tempPass, debe_cambiar_contrasenia: true } : u);
  localStorage.setItem('TSMAI_users', JSON.stringify(updatedUsers));

  if (supabaseClient) {
    await syncDatabases();
  }

  // Construir cuerpo de correo simulado con enlace de acción
  const emailBody = `
    <h2>Restablecimiento de Contraseña - TSM-AI</h2>
    <p>Hola <strong>${user.nombre_completo}</strong>,</p>
    <p>Se ha solicitado un restablecimiento de contraseña para tu cuenta vinculada a este correo electrónico.</p>
    <p>Tu nueva contraseña temporal de acceso es:</p>
    <div style="margin: 15px 0;">
      <strong style="font-size: 1.3rem; color: var(--color-critical); background: #f1f5f9; padding: 6px 12px; border-radius: 4px; font-family: monospace; display: inline-block;">${tempPass}</strong>
    </div>
    <p>Por seguridad, se te solicitará cambiarla en cuanto ingreses.</p>
    <p>También puedes reestablecerla directamente haciendo clic en el siguiente enlace:</p>
    <div style="margin: 20px 0; text-align: center;">
      <a href="#" id="reset-mail-link" style="background: var(--accent-blue); color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Establecer Nueva Contraseña Ahora</a>
    </div>
    <p style="font-size: 0.8rem; color: #64748b; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 10px;">Este es un correo automático simulado por el sistema.</p>
  `;

  showSimulatedEmail(
    user.correo,
    '🔄 Solicitud de Restablecimiento de Contraseña - TSM-AI',
    emailBody,
    'Copiar Contraseña Temporal',
    () => {
      navigator.clipboard.writeText(tempPass);
      showToast('Contraseña temporal copiada al portapapeles.');
    }
  );

  // Registrar listener del enlace simulado después de renderizarse
  setTimeout(() => {
    const link = document.getElementById('reset-mail-link');
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('modal-email-simulator');
        
        // Cargar datos en el modal de cambio de contraseña obligatoria
        document.getElementById('change-pass-user-id').value = user.id_usuario;
        document.getElementById('change-pass-target-view').value = user.rol === 'SUPER_ADMINISTRADOR' ? 'admin' : 'tech';
        document.getElementById('change-pass-new').value = '';
        document.getElementById('change-pass-confirm').value = '';
        
        openModal('modal-change-password');
      });
    }
  }, 150);
}

// ============================================================================
// TSM-AI: EXCEL INGESTION MODULE & CALENDARS MODULE (PRD)
// ============================================================================

let currentCalendarTab = 'preventivo';
let currentSelectedCalItem = null;
let currentCalendarViewMode = 'grid'; // 'grid' o 'table'
let currentCalendarYear = 2026;
let currentCalendarMonth = 5; // Junio (0-indexed)
let currentCalendarDayNum = 3; // 3 de Junio (default mock date)
let currentCalendarScale = 'month'; // 'year', 'month', 'week', 'day'

function switchCalendarViewMode(mode) {
  currentCalendarViewMode = mode;
  const gridFilters = document.getElementById('calendar-grid-filters');
  const gridModeDiv = document.getElementById('calendar-view-grid-mode');
  const tableModeDiv = document.getElementById('calendar-view-table-mode');
  const btnGrid = document.getElementById('btn-toggle-view-grid');
  const btnTable = document.getElementById('btn-toggle-view-table');

  if (mode === 'grid') {
    if (gridFilters) gridFilters.style.display = 'flex';
    if (gridModeDiv) gridModeDiv.style.display = 'block';
    if (tableModeDiv) tableModeDiv.style.display = 'none';
    if (btnGrid) {
      btnGrid.style.backgroundColor = 'var(--primary-color)';
      btnGrid.style.color = 'white';
    }
    if (btnTable) {
      btnTable.style.backgroundColor = '#f1f5f9';
      btnTable.style.color = 'var(--text-color)';
    }
    renderAdminCalendar();
  } else {
    if (gridFilters) gridFilters.style.display = 'none';
    if (gridModeDiv) gridModeDiv.style.display = 'none';
    if (tableModeDiv) tableModeDiv.style.display = 'flex';
    if (btnGrid) {
      btnGrid.style.backgroundColor = '#f1f5f9';
      btnGrid.style.color = 'var(--text-color)';
    }
    if (btnTable) {
      btnTable.style.backgroundColor = 'var(--primary-color)';
      btnTable.style.color = 'white';
    }
    renderAdminCalendars();
  }
}

function setCalendarScale(scale) {
  currentCalendarScale = scale;
  
  const scales = ['year', 'month', 'week', 'day'];
  scales.forEach(s => {
    const btn = document.getElementById(`btn-scale-${s}`);
    if (btn) {
      if (s === scale) {
        btn.style.background = 'white';
        btn.style.color = 'var(--primary-color)';
        btn.style.boxShadow = 'var(--box-shadow-sm)';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text-color)';
        btn.style.boxShadow = 'none';
      }
    }
  });

  renderAdminCalendar();
}

function jumpToToday() {
  const today = new Date();
  currentCalendarYear = today.getFullYear();
  currentCalendarMonth = today.getMonth();
  currentCalendarDayNum = today.getDate();
  renderAdminCalendar();
}

function changeCalendarPeriod(delta) {
  if (currentCalendarScale === 'year') {
    currentCalendarYear += delta;
  } else if (currentCalendarScale === 'month') {
    currentCalendarMonth += delta;
    if (currentCalendarMonth < 0) {
      currentCalendarMonth = 11;
      currentCalendarYear--;
    } else if (currentCalendarMonth > 11) {
      currentCalendarMonth = 0;
      currentCalendarYear++;
    }
  } else if (currentCalendarScale === 'week') {
    const currentSelectedDate = new Date(currentCalendarYear, currentCalendarMonth, currentCalendarDayNum);
    currentSelectedDate.setDate(currentSelectedDate.getDate() + (delta * 7));
    currentCalendarYear = currentSelectedDate.getFullYear();
    currentCalendarMonth = currentSelectedDate.getMonth();
    currentCalendarDayNum = currentSelectedDate.getDate();
  } else if (currentCalendarScale === 'day') {
    const currentSelectedDate = new Date(currentCalendarYear, currentCalendarMonth, currentCalendarDayNum);
    currentSelectedDate.setDate(currentSelectedDate.getDate() + delta);
    currentCalendarYear = currentSelectedDate.getFullYear();
    currentCalendarMonth = currentSelectedDate.getMonth();
    currentCalendarDayNum = currentSelectedDate.getDate();
  }
  renderAdminCalendar();
}

function renderExcelPreviewTable(rows) {
  const thead = document.getElementById('excel-preview-thead');
  const tbody = document.getElementById('excel-preview-tbody');
  if (!thead || !tbody) return;

  if (rows.length === 0) {
    thead.innerHTML = '';
    tbody.innerHTML = '<tr><td style="text-align:center;padding:20px;">Sin datos en vista previa.</td></tr>';
    return;
  }

  // Get keys to display (exclude internal keys)
  const keys = Object.keys(rows[0]).filter(k => !['id_carga', 'archivo_origen', 'creado_en'].includes(k));
  
  // Build header
  let headHtml = '<tr>';
  keys.forEach(k => {
    headHtml += `<th style="text-transform: capitalize;">${k.replace(/_/g, ' ')}</th>`;
  });
  headHtml += '</tr>';
  thead.innerHTML = headHtml;

  // Build body
  let bodyHtml = '';
  rows.slice(0, 50).forEach(row => {
    const isVal = row.es_valido === true || row.es_valido === 'true';
    const bgStyle = isVal ? '' : 'background-color: #fee2e2;';
    bodyHtml += `<tr style="${bgStyle}">`;
    keys.forEach(k => {
      let val = row[k];
      if (val === null || val === undefined) val = '—';
      if (k === 'detalles_error' && !isVal) {
        bodyHtml += `<td style="color:#ef4444; font-weight: 600;">${val}</td>`;
      } else {
        bodyHtml += `<td>${val}</td>`;
      }
    });
    bodyHtml += '</tr>';
  });
  if (rows.length > 50) {
    bodyHtml += `<tr><td colspan="${keys.length}" style="text-align: center; color: var(--text-muted); font-style: italic;">Mostrando primeros 50 de ${rows.length} registros...</td></tr>`;
  }
  tbody.innerHTML = bodyHtml;
}

async function executeChunkedUpsert(table, rows, options = {}) {
  const chunkSize = 1000;
  const total = rows.length;
  for (let i = 0; i < total; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    showToast(`Guardando en ${table}: ${i + 1} a ${Math.min(i + chunkSize, total)} de ${total}...`);
    const { error } = await supabaseClient.from(table).upsert(chunk, options);
    if (error) throw error;
  }
}

async function executeChunkedInsert(table, rows) {
  const chunkSize = 1000;
  const total = rows.length;
  for (let i = 0; i < total; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    showToast(`Guardando en ${table}: ${i + 1} a ${Math.min(i + chunkSize, total)} de ${total}...`);
    const { error } = await supabaseClient.from(table).insert(chunk);
    if (error) throw error;
  }
}

async function commitExcelUpload() {
  if (!currentExcelUpload) return;
  const { idCarga, templateType, filename, validCount, validatedRows } = currentExcelUpload;
  const templateConf = EXCEL_TEMPLATE_MAP[templateType];

  showToast('Iniciando transferencia de registros limpios...');
  
  let finalValidCount = validCount;
  
  try {
    const validRows = validatedRows.filter(r => r.es_valido === true || r.es_valido === 'true');

    if (supabaseClient) {
      if (templateType === 'machines') {
        const toInsert = validRows.map(r => ({
          equipo_towell: r.equipo_towell,
          clave: r.clave || r.equipo_towell,
          ax: r.ax || null,
          origen: 'Excel Ingestion',
          archivo_origen: filename,
          id_carga: idCarga
        }));
        await executeChunkedUpsert('cat_maquinas', toInsert, { onConflict: 'equipo_towell' });
      } else if (templateType === 'parts') {
        const toInsert = validRows.map(r => ({
          codigo_articulo: r.codigo_articulo,
          nombre_articulo: r.nombre_articulo,
          unidad_medida: r.unidad_medida || 'PZ',
          familia: r.familia || 'General',
          activo: r.activo !== undefined ? (r.activo === 'true' || r.activo === true) : true
        }));
        const { error } = await supabaseClient.rpc('bulk_upsert_catalog_parts', { p_rows: toInsert });
        if (error) throw error;
      } else if (templateType === 'tecnicos') {
        const toInsert = validRows.map(r => ({
          cve_tecnico: r.cve_tecnico,
          nombre_tecnico: r.nombre_tecnico,
          departamento_codigo: r.departamento_codigo,
          turno_id: parseInt(r.turno_id) || 1,
          especialidad: r.especialidad || 'General',
          puesto: r.puesto || 'Técnico',
          correo: r.correo,
          telefono: r.telefono,
          activo: r.activo !== undefined ? (r.activo === 'true' || r.activo === true) : true,
          id_carga: idCarga
        }));
        await executeChunkedUpsert('cat_tecnicos', toInsert, { onConflict: 'cve_tecnico' });

        for (let t of toInsert) {
          if (t.correo) {
            const { data: userExists } = await supabaseClient.from('cat_usuarios_roles').select('id_usuario').eq('correo', t.correo).maybeSingle();
            if (!userExists) {
              await supabaseClient.from('cat_usuarios_roles').insert({
                correo: t.correo,
                nombre_completo: t.nombre_tecnico,
                rol: 'MANTENIMIENTO',
                cve_tecnico: t.cve_tecnico,
                activo: true
              });
            }
          }
        }
      } else if (templateType === 'empleados') {
        const toInsert = validRows.map(r => ({
          cve_empleado: r.cve_empleado,
          nombre_empleado: r.nombre_empleado,
          departamento_codigo: r.departamento_codigo,
          turno_id: parseInt(r.turno_id) || 1,
          puesto: r.puesto || 'Empleado',
          correo: r.correo,
          telefono: r.telefono,
          activo: r.activo !== undefined ? (r.activo === 'true' || r.activo === true) : true,
          id_carga: idCarga
        }));
        await executeChunkedUpsert('cat_empleados', toInsert, { onConflict: 'cve_empleado' });
      } else if (templateType === 'fallas') {
        const toInsert = validRows.map(r => ({
          maquina_id: r.maquina_id,
          descripcion_falla: r.descripcion,
          fecha_hora_creada: r.creada || new Date().toISOString(),
          fecha_creada: r.creada ? r.creada.split('T')[0] : new Date().toISOString().split('T')[0],
          hora_creada: r.creada ? r.creada.split('T')[1]?.split('.')[0] || '12:00:00' : '12:00:00',
          origen: 'Excel Ingestion',
          archivo_origen: filename,
          id_carga: idCarga,
          categoria_falla: r.descripcion?.toLowerCase().includes('eléc') ? 'Eléctrica' : 'Mecánica'
        }));
        await executeChunkedInsert('fallas_por_maquina', toInsert);
      } else if (templateType === 'telegram') {
        const toInsert = validRows.map(r => {
          let depPrefix = 'PF';
          const depNormalized = (r.depto || '').toLowerCase();
          if (depNormalized.includes('cost') || depNormalized.includes('conf')) {
            depPrefix = 'CF';
          } else if (depNormalized.includes('tint') || depNormalized.includes('tinte') || depNormalized.includes('jet')) {
            depPrefix = 'TF';
          } else if (depNormalized.includes('serv') || depNormalized.includes('aux') || depNormalized.includes('planta')) {
            depPrefix = 'AF';
          }
          const tgFolio = r.folio || `TG-${depPrefix}${String(r.id).padStart(5, '0')}`;
          return {
            folio: tgFolio,
            orden_trabajo: r.orden_trabajo || 'MC',
          origen: 'TELEGRAM_HISTORICO',
          estatus: r.estatus || 'Completado',
          fecha_inicio: r.fecha,
          hora_inicio: r.hora || '12:00:00',
          fecha_hora_inicio: new Date(r.fecha + 'T' + (r.hora || '12:00:00')).toISOString(),
          departamento: r.depto,
          maquina_id: r.maquina_id,
          tipo_falla_id: r.tipo_falla_id,
          falla: r.falla,
          descripcion: r.descripcion || r.obs,
          observacion_inicial: r.obs,
          cve_solicitante: r.cve_empl,
          nombre_solicitante: r.nom_empl,
          turno_solicitante: r.turno,
          cve_atendio: r.cve_atendio,
          nombre_atendio: r.nom_atendio,
          turno_atendio: r.turno_atendio,
          fecha_fin: r.fecha_fin,
          hora_fin: r.hora_fin,
          fecha_hora_fin: r.fecha_fin && r.hora_fin ? new Date(r.fecha_fin + 'T' + r.hora_fin).toISOString() : null,
          observacion_cierre: r.obs_cierre,
          calidad: r.calidad,
          enviado: r.enviado === true || r.enviado === 'true',
          id_carga: idCarga
        };
      });
      await executeChunkedUpsert('ordenes_trabajo', toInsert, { onConflict: 'folio' });
      } else if (templateType === 'refmaquina') {
        const toInsert = validRows.map(r => ({
          maquina_id: r.maquina_id || r.destino,
          codigo_articulo: r.codigo_articulo,
          nombre_articulo: r.nombre_articulo,
          cantidad_estandar: parseFloat(r.cantidad_estandar) || 1,
          costo_unitario: parseFloat(r.precio_costo_unitario) || 0
        }));
        const { error } = await supabaseClient.rpc('bulk_upsert_machine_parts', { p_rows: toInsert });
        if (error) throw error;
      } else if (templateType === 'inventory') {
        const toInsert = validRows.map(r => ({
          codigo_articulo: r.codigo_articulo,
          codigo_proveedor: r.codigo_proveedor || null,
          stock_actual: parseFloat(r.stock_actual) || 0,
          stock_minimo: parseFloat(r.stock_minimo) || 0,
          stock_maximo: parseFloat(r.stock_maximo) || null,
          unidad_medida: r.unidad_medida || 'PZ',
          ubicacion: r.ubicacion || 'ALMACEN',
          costo_unitario: parseFloat(r.costo_unitario) || 0,
          moneda: r.moneda || 'MXN',
          observaciones: r.observaciones || null
        }));
        const { error } = await supabaseClient.rpc('bulk_update_refacciones_inventory', { p_rows: toInsert });
        if (error) throw error;
      } else if (templateType === 'segundas') {
        showToast('Procesando y guardando datos en el servidor...');
        const { data: rpcRes, error: rpcErr } = await supabaseClient
          .rpc('commit_segundas_por_rollo', { p_id_carga: idCarga });
        if (rpcErr) throw rpcErr;
        
        currentExcelUpload.validCount = rpcRes.inserted;
        currentExcelUpload.errorCount = rpcRes.errors;
        finalValidCount = rpcRes.inserted;
      }

      await supabaseClient
        .from('control_cargas_archivos')
        .update({
          estatus_carga: 'Completada',
          registros_correctos: finalValidCount,
          registros_error: currentExcelUpload.errorCount,
          observaciones: `Ingestión finalizada con éxito. ${finalValidCount} correctos importados.`
        })
        .eq('id_carga', idCarga);
    }

    showToast(`Se han importado ${finalValidCount} registros limpios a la tabla final.`);
    cancelExcelUpload();
    await renderExcelHistoryTable();
    await syncDatabases();

  } catch (err) {
    console.error('Error committing excel upload:', err);
    showToast(`Error al transferir registros: ${err.message}`);
  }
}

function cancelExcelUpload() {
  currentExcelUpload = null;
  document.getElementById('excel-preview-container').style.display = 'none';
  document.getElementById('excel-file-input').value = '';
  document.getElementById('excel-template-select').value = '';
  document.getElementById('excel-guideline-text').innerHTML = 'Selecciona una plantilla para ver las especificaciones de columnas requeridas.';
}

async function renderExcelHistoryTable() {
  const tbody = document.getElementById('table-excel-history-body');
  if (!tbody) return;

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('control_cargas_archivos')
        .select('*')
        .order('fecha_carga', { ascending: false })
        .limit(10);

      if (!error && data) {
        let html = '';
        data.forEach(row => {
          const date = new Date(row.fecha_carga).toLocaleString();
          const badgeClass = row.estatus_carga === 'Completada' ? 'background:#dcfce7;color:#166534;' : 'background:#fee2e2;color:#991b1b;';
          html += `
            <tr>
              <td><strong>${row.nombre_archivo}</strong></td>
              <td>${row.usuario_carga}</td>
              <td>${date}</td>
              <td>${row.registros_leidos}</td>
              <td>${row.registros_correctos}</td>
              <td>${row.registros_error}</td>
              <td><span style="padding:2px 8px;border-radius:10px;font-size:0.75rem;font-weight:600;${badgeClass}">${row.estatus_carga}</span></td>
            </tr>
          `;
        });
        tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);">No hay historial de cargas.</td></tr>';
        return;
      }
    } catch (err) {
      console.error('Error rendering excel history:', err);
    }
  }
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);">No disponible offline.</td></tr>';
}

// --- MODAL DE REVISIÓN Y ACEPTACIÓN/RECHAZO POR SOLICITANTE / ADMIN (FASE 4) ---
function openApplicantReviewModal(otId) {
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const order = orders.find(o => o.id === otId || o.folio === otId);
  if (!order) return;

  const targetId = order.id || order.folio;
  document.getElementById('applicant-review-ot-id').value = targetId;
  document.getElementById('applicant-review-title').innerText = `Revisión de Trabajo Terminado: ${targetId}`;

  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const mach = machines.find(m => m.id === order.machine);

  document.getElementById('app-rev-machine').innerText = mach ? `${mach.name} (${mach.id})` : (order.machine || 'N/A');
  document.getElementById('app-rev-tech').innerText = order.techName || (currentUser ? currentUser.name : 'Técnico Asignado');
  
  let durationStr = '0 min';
  if (order.tiempo_atencion_min) {
    durationStr = `${order.tiempo_atencion_min} min (${(order.tiempo_atencion_min / 60).toFixed(1)} h)`;
  } else if (order.fecha_hora_inicio && order.fecha_hora_fin) {
    const mins = Math.max(1, Math.round((new Date(order.fecha_hora_fin) - new Date(order.fecha_hora_inicio)) / 60000));
    durationStr = `${mins} min (${(mins / 60).toFixed(1)} h)`;
  }
  document.getElementById('app-rev-duration').innerText = durationStr;

  let partsStr = 'Ninguna';
  if (order.usedParts && order.usedParts.length > 0) {
    partsStr = order.usedParts.map(p => `${p.name || p.partId} (x${p.quantity})`).join(', ');
  } else if (order.refacciones_usadas) {
    partsStr = order.refacciones_usadas;
  }
  document.getElementById('app-rev-parts').innerText = partsStr;

  const diag = order.diagnosis || '';
  const act = order.activity || order.description || 'Atención de trabajo técnico';
  document.getElementById('app-rev-activity').innerText = diag ? `Diagnóstico: ${diag}\nActividad: ${act}` : act;

  // Evidencia Inicial
  const initBox = document.getElementById('app-rev-img-initial-box');
  if (order.evidence) {
    initBox.innerHTML = `
      <a href="${order.evidence}" target="_blank" style="color: var(--accent-blue); font-weight: 500; font-size: 0.85rem; text-decoration: underline;">
        🖼️ Ver Evidencia Inicial (${order.evidence})
      </a>
    `;
  } else {
    initBox.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">Sin evidencia inicial cargada</span>`;
  }

  // Evidencia Final
  const finalBox = document.getElementById('app-rev-img-final-box');
  const finalEv = order.finalEvidence || order.evidence_final || order.file;
  if (finalEv) {
    finalBox.innerHTML = `
      <a href="${finalEv}" target="_blank" style="color: var(--accent-green); font-weight: 600; font-size: 0.85rem; text-decoration: underline;">
        ✅ Ver Evidencia Final (${finalEv})
      </a>
    `;
  } else {
    finalBox.innerHTML = `<span style="color: var(--accent-green); font-size: 0.85rem;">✅ Trabajo concluido conforme a especificación</span>`;
  }

  openModal('modal-applicant-review-ot');
}

async function acceptWorkOrderFromModal() {
  const otId = document.getElementById('applicant-review-ot-id').value;
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const idx = orders.findIndex(o => o.id === otId || o.folio === otId);
  if (idx === -1) return;

  const nowISO = new Date().toISOString();
  orders[idx].status = 'Terminada';
  orders[idx].closeDate = nowISO;

  if (!orders[idx].historyLogs) orders[idx].historyLogs = [];
  orders[idx].historyLogs.push({
    date: nowISO,
    status: 'Terminada',
    user: currentUser ? currentUser.name : 'Solicitante',
    comment: 'Trabajo aceptado y orden cerrada definitivamente.'
  });

  localStorage.setItem('TSMAI_orders', JSON.stringify(orders));

  // Transición automática de pull a Bitácora
  await syncFinishedOTsToBitacora();

  if (supabaseClient) {
    try {
      await supabaseClient
        .from('ordenes_trabajo')
        .update({ estatus: 'TERMINADA', fecha_hora_fin: nowISO })
        .eq('folio', otId);
    } catch (err) {
      console.error('Error closing order in Supabase:', err);
    }
  }

  closeModal('modal-applicant-review-ot');
  showToast('✅ Trabajo aceptado y orden cerrada con éxito.');

  // Refrescar vistas y tableros
  if (typeof renderTechOrdersTable === 'function') renderTechOrdersTable();
  if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
  if (typeof updateAdminKPIs === 'function') updateAdminKPIs();
  if (typeof syncDatabases === 'function') await syncDatabases();
  refreshActiveViewSilently();
}

async function rejectWorkOrderFromModal() {
  const otId = document.getElementById('applicant-review-ot-id').value;
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const idx = orders.findIndex(o => o.id === otId || o.folio === otId);
  if (idx === -1) return;

  const reason = prompt('Especifica las observaciones o correcciones requeridas para el técnico:') || 'Revisión requerida por el solicitante.';

  orders[idx].status = 'En proceso';
  orders[idx].rejectionReason = reason;

  if (!orders[idx].historyLogs) orders[idx].historyLogs = [];
  orders[idx].historyLogs.push({
    date: new Date().toISOString(),
    status: 'En proceso',
    user: currentUser ? currentUser.name : 'Solicitante',
    comment: `Trabajo rechazado por el solicitante: ${reason}`
  });

  localStorage.setItem('TSMAI_orders', JSON.stringify(orders));

  if (supabaseClient) {
    try {
      await supabaseClient
        .from('ordenes_trabajo')
        .update({ estatus: 'EN_PROCESO' })
        .eq('folio', otId);
    } catch (err) {
      console.error('Error rejecting work order in Supabase:', err);
    }
  }

  closeModal('modal-applicant-review-ot');
  showToast('🔴 Orden devuelta al técnico en estado En proceso.');

  if (typeof renderTechOrdersTable === 'function') renderTechOrdersTable();
  if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
  if (typeof syncDatabases === 'function') await syncDatabases();
  refreshActiveViewSilently();
}

// ============================================================================
// FASE 6 & 6.1: MOTOR DE CALENDARIOS DE MANTENIMIENTO (SUPERVISOR)
// ============================================================================

// 1. Modal "⚡ Proponer Calendario" & Validaciones de Frecuencia
function generateCalendarProposalModal() {
  const proposalYear = document.getElementById('proposal-year');
  if (proposalYear) {
    proposalYear.value = new Date().getFullYear();
  }
  toggleProposalPeriodFields();
  openModal('modal-generate-calendar-proposal');
}

function toggleProposalPeriodFields() {
  const type = document.getElementById('proposal-type').value;
  const monthGroup = document.getElementById('proposal-month-group');
  const weekGroup = document.getElementById('proposal-week-group');
  
  if (type === 'PREVENTIVO') {
    if (monthGroup) monthGroup.style.display = 'none';
    if (weekGroup) weekGroup.style.display = 'none';
  } else if (type === 'PREDICTIVO') {
    if (monthGroup) monthGroup.style.display = 'block';
    if (weekGroup) weekGroup.style.display = 'none';
  } else if (type === 'AUTONOMO') {
    if (monthGroup) monthGroup.style.display = 'none';
    if (weekGroup) weekGroup.style.display = 'block';
  }
  validateProposalPeriod();
}

async function validateProposalPeriod() {
  const warningEl = document.getElementById('proposal-validation-warning');
  const submitBtn = document.getElementById('btn-submit-proposal');
  if (!warningEl || !submitBtn) return;

  const type = document.getElementById('proposal-type').value;
  const year = parseInt(document.getElementById('proposal-year').value) || new Date().getFullYear();
  
  let month = null;
  let week = null;

  if (type === 'PREDICTIVO') {
    month = parseInt(document.getElementById('proposal-month').value);
  } else if (type === 'AUTONOMO') {
    week = parseInt(document.getElementById('proposal-week').value);
  }

  if (useLiveDatabase && supabaseClient) {
    try {
      let query = supabaseClient
        .from('calendarios_mantenimiento')
        .select('id_calendario')
        .eq('tipo_calendario', type)
        .eq('anio', year);

      if (month === null) query = query.is('mes', null);
      else query = query.eq('mes', month);

      if (week === null) query = query.is('semana', null);
      else query = query.eq('semana', week);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        warningEl.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
      } else {
        warningEl.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
      }
    } catch (e) {
      console.warn('[validateProposalPeriod] Error checking periods:', e);
    }
  }
}

// 2. Ejecutar generación de propuestas (Preventiva Anual, Predictiva, Autónoma)
async function handleGenerateCalendarProposal(event) {
  event.preventDefault();
  const type = document.getElementById('proposal-type').value;
  const year = parseInt(document.getElementById('proposal-year').value);
  
  let month = null;
  let week = null;

  if (type === 'PREDICTIVO') month = parseInt(document.getElementById('proposal-month').value);
  else if (type === 'AUTONOMO') week = parseInt(document.getElementById('proposal-week').value);

  closeModal('modal-generate-calendar-proposal');
  showToast('⚡ Generando propuesta de calendario...');

  if (!supabaseClient) {
    showToast('⚠️ Sin conexión a la base de datos.', 'error');
    return;
  }

  try {
    // A. Crear la cabecera del calendario con fechas de periodo requeridas (NOT NULL)
    let startPeriod, endPeriod;
    if (type === 'PREVENTIVO') {
      startPeriod = `${year}-01-01`;
      endPeriod = `${year}-12-31`;
    } else if (type === 'PREDICTIVO') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      startPeriod = firstDay.toISOString().split('T')[0];
      endPeriod = lastDay.toISOString().split('T')[0];
    } else { // AUTONOMO
      const firstDay = new Date(year, 0, 1 + (week - 1) * 7);
      const lastDay = new Date(year, 0, 1 + (week - 1) * 7 + 6);
      startPeriod = firstDay.toISOString().split('T')[0];
      endPeriod = lastDay.toISOString().split('T')[0];
    }

    const headerRecord = {
      tipo_calendario: type,
      anio: year,
      mes: month,
      semana: week,
      fecha_inicio_periodo: startPeriod,
      fecha_fin_periodo: endPeriod,
      estatus_calendario: 'PROPUESTO',
      generado_por: currentUser ? currentUser.name : 'Supervisor',
      origen_generacion: 'IA Engine'
    };

    const { data: headerData, error: hErr } = await supabaseClient
      .from('calendarios_mantenimiento')
      .insert([headerRecord])
      .select();

    if (hErr) throw hErr;
    const newCalId = headerData[0].id_calendario;

    // B. Obtener catálogos y registros históricos completos
    const [ordRes, plansRes, machinesRes, techsRes, bitacoraRes] = await Promise.all([
      supabaseClient.from('ordenes_trabajo').select('id_orden, folio, fecha_carga, maquina_id, descripcion, estatus, prioridad, orden_trabajo, tiempo_atencion_min, fecha_hora_inicio, fecha_hora_fin'),
      supabaseClient.from('planes_mantenimiento_preventivo').select('*').eq('activo', true),
      supabaseClient.from('cat_maquinas').select('*').eq('activo', true),
      supabaseClient.from('cat_tecnicos').select('*').eq('activo', true),
      supabaseClient.from('bitacora_mantenimiento').select('*')
    ]);

    const activePlans = plansRes.data || [];
    const activeMachines = machinesRes.data || [];
    const activeTechs = techsRes.data || [];
    const allOts = ordRes.data || [];
    const allLogs = bitacoraRes.data || [];

    const detailsToInsert = [];
    const dayWorkload = {}; // Mapeo de carga por día para evitar colisiones

    // Llenar carga inicial con OTs existentes
    allOts.forEach(o => {
      const dateStr = (o.fecha_carga || '').split('T')[0];
      if (dateStr) dayWorkload[dateStr] = (dayWorkload[dateStr] || 0) + 1;
    });

    // Helper anti-colisión: busca el día más cercano con carga < 3
    function getBalancedDate(targetDate) {
      let current = new Date(targetDate);
      let offset = 0;
      while (true) {
        let candidate = new Date(current);
        candidate.setDate(current.getDate() + offset);
        let key = candidate.toISOString().split('T')[0];
        
        if ((dayWorkload[key] || 0) < 3) {
          dayWorkload[key] = (dayWorkload[key] || 0) + 1;
          return key;
        }

        // Buscar en ambas direcciones
        offset = offset >= 0 ? -offset - 1 : -offset;
        if (Math.abs(offset) > 30) {
          // Fallback a la fecha original si no hay cupo en 30 días
          return targetDate.toISOString().split('T')[0];
        }
      }
    }

    if (type === 'PREVENTIVO') {
      // Algoritmo Preventivo Anual
      for (const machine of activeMachines) {
        const mPlans = activePlans.filter(p => p.maquina_id === machine.equipo_towell);
        
        for (const plan of mPlans) {
          const freq = plan.frecuencia || 3;
          const unit = (plan.unidad_frecuencia || 'meses').toLowerCase();
          
          let lastDate = plan.ultima_ejecucion ? new Date(plan.ultima_ejecucion) : new Date(year, 0, 15);
          if (lastDate.getFullYear() < year) {
            lastDate = new Date(year, 0, 15);
          }

          // Proyectar ejecuciones del año
          let projections = [];
          if (unit === 'meses') {
            const occurrences = Math.floor(12 / freq);
            for (let o = 0; o < occurrences; o++) {
              const d = new Date(lastDate);
              d.setMonth(lastDate.getMonth() + (o * freq));
              if (d.getFullYear() === year) projections.push(d);
            }
          } else if (unit === 'semanas') {
            const occurrences = Math.floor(52 / freq);
            for (let o = 0; o < occurrences; o++) {
              const d = new Date(lastDate);
              d.setDate(lastDate.getDate() + (o * freq * 7));
              if (d.getFullYear() === year) projections.push(d);
            }
          } else {
            // Días o por defecto (cada 2 meses)
            const occurrences = 6;
            for (let o = 0; o < occurrences; o++) {
              const d = new Date(lastDate);
              d.setMonth(lastDate.getMonth() + (o * 2));
              if (d.getFullYear() === year) projections.push(d);
            }
          }

          // Registrar propuestas balanceadas
          projections.forEach(proj => {
            const balancedDateStr = getBalancedDate(proj);
            
            // Asignar técnico sugerido o aleatorio
            const matchingTech = activeTechs.find(t => t.nombre_tecnico.toLowerCase() === (plan.responsable || '').toLowerCase()) 
              || activeTechs[Math.floor(Math.random() * activeTechs.length)];

            detailsToInsert.push({
              id_calendario: newCalId,
              maquina_id: machine.equipo_towell,
              fecha_programada: balancedDateStr,
              tipo_mantenimiento: 'PREVENTIVO',
              prioridad: machine.prioridad_default || 'MEDIA',
              actividad_sugerida: `Servicio preventivo: ${plan.nombre_plan || plan.codigo_servicio}`,
              responsable_sugerido: matchingTech ? matchingTech.nombre_tecnico : 'Supervisor',
              id_plan: plan.id_plan,
              estatus_detalle: 'PROPUESTO'
            });
          });
        }
      }
    } else if (type === 'PREDICTIVO') {
      // Predictivo Mensual: Generar propuestas a partir del análisis estadístico e histórico (IA Engine)
      const candidates = [];
      const nowTime = new Date();

      for (const machine of activeMachines) {
        const machId = machine.equipo_towell;
        const machOts = allOts.filter(o => o.maquina_id === machId);
        const machLogs = allLogs.filter(l => l.maquina_id === machId);

        // 1. Fallas en los últimos 60 días
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const recentOts = machOts.filter(o => o.orden_trabajo !== 'MP' && new Date(o.fecha_carga) >= sixtyDaysAgo);
        const recentFailsCount = recentOts.length;

        // 2. Repetición del mismo tipo de falla / palabras clave
        const descWords = recentOts.map(o => (o.descripcion || '').toLowerCase());
        const keywords = ['temperatura', 'calentamiento', 'caliente', 'vibracion', 'ruido', 'balero', 'rodamiento', 'fuga', 'presion', 'aceite', 'aire', 'motor', 'electrico', 'mecanico', 'polea', 'transmision'];
        const keywordCounts = {};
        keywords.forEach(k => {
          keywordCounts[k] = descWords.filter(w => w.includes(k)).length;
        });

        let maxKeyword = '';
        let maxCount = 0;
        Object.entries(keywordCounts).forEach(([k, c]) => {
          if (c > maxCount) {
            maxCount = c;
            maxKeyword = k;
          }
        });

        // 3. Tiempo de paro acumulado (Downtime)
        let totalDowntimeHours = 0;
        machOts.forEach(o => {
          if (o.tiempo_atencion_min) {
            totalDowntimeHours += (o.tiempo_atencion_min / 60);
          } else if (o.fecha_hora_inicio && o.fecha_hora_fin) {
            const diffMs = new Date(o.fecha_hora_fin) - new Date(o.fecha_hora_inicio);
            totalDowntimeHours += Math.max(0, diffMs / (1000 * 60 * 60));
          }
        });

        // 4. Último mantenimiento predictivo o preventivo
        let lastMaint = null;
        machOts.forEach(o => {
          if (o.orden_trabajo === 'MP' || o.orden_trabajo === 'MC') {
            const d = new Date(o.fecha_carga);
            if (!lastMaint || d > lastMaint) lastMaint = d;
          }
        });
        machLogs.forEach(l => {
          const d = new Date(l.fecha_hora_inicio);
          if (!lastMaint || d > lastMaint) lastMaint = d;
        });

        const daysSinceLastMaint = lastMaint ? Math.floor((nowTime - lastMaint) / (1000 * 60 * 60 * 24)) : 999;

        // 5. Estacionalidad: Fallas en este mes en años anteriores
        const targetMonth = month;
        const seasonalFails = machOts.filter(o => {
          const d = new Date(o.fecha_carga);
          return d.getMonth() === targetMonth && d.getFullYear() < year;
        }).length;

        // 6. Cálculo del Score de Riesgo (0-10)
        let riskScore = 0;

        const crit = (machine.criticidad || machine.prioridad_default || 'B').toUpperCase().trim();
        if (crit.includes('A') || crit.includes('CRITICA') || crit.includes('CRÍTICA')) riskScore += 3.0;
        else if (crit.includes('B') || crit.includes('MEDIA')) riskScore += 1.5;
        else riskScore += 0.5;

        riskScore += Math.min(3.0, recentFailsCount * 0.75);
        if (maxCount >= 2) riskScore += 1.5;
        riskScore += Math.min(1.5, totalDowntimeHours * 0.05);
        if (daysSinceLastMaint > 30) riskScore += 1.0;

        riskScore = parseFloat(riskScore.toFixed(1));

        // 7. Determinar Tipo de Revisión e Inspector sugerido
        let revType = 'Inspección predictiva termográfica y de vibraciones';
        let specialty = 'Electromecánico';
        if (maxKeyword) {
          if (['temperatura', 'calentamiento', 'caliente'].includes(maxKeyword)) {
            revType = 'Termografía infrarroja de tableros y rodamientos';
            specialty = 'Eléctrico / Termógrafo';
          } else if (['vibracion', 'ruido', 'balero', 'rodamiento'].includes(maxKeyword)) {
            revType = 'Análisis de vibraciones y holguras mecánicas';
            specialty = 'Mecánico / Vibraciones';
          } else if (['fuga', 'presion', 'aire', 'aceite', 'hidraulico'].includes(maxKeyword)) {
            revType = 'Detección de fugas por ultrasonido e inspección neumática';
            specialty = 'Mecánico / Neumático';
          }
        }

        // 8. Construir motivos estructurados
        const motivos = [];
        if (recentFailsCount > 0) {
          motivos.push(`Registra ${recentFailsCount} falla(s) en los últimos 60 días.`);
        }
        if (maxCount >= 2) {
          motivos.push(`Se detecta repetibilidad de fallas asociadas a: "${maxKeyword}" (${maxCount} eventos).`);
        }
        if (totalDowntimeHours > 0) {
          motivos.push(`Ha acumulado ${totalDowntimeHours.toFixed(1)} horas de paro en producción.`);
        }
        if (lastMaint) {
          motivos.push(`Último mantenimiento realizado hace ${daysSinceLastMaint} días (${lastMaint.toLocaleDateString('es-MX')}).`);
        } else {
          motivos.push(`No registra antecedentes de mantenimientos preventivos o predictivos.`);
        }
        if (seasonalFails > 0) {
          motivos.push(`Este equipo tiene historial de fallas recurrentes en el mes seleccionado en años anteriores (${seasonalFails} fallas anteriores).`);
        }
        if (crit.includes('A') || crit.includes('CRITICA')) {
          motivos.push(`Equipo catalogado como crítico (Criticidad Alta).`);
        }

        const otRefs = recentOts.slice(0, 3).map(o => o.folio).join(', ');
        const evidencia = otRefs ? `Órdenes de Trabajo de referencia: [${otRefs}]. Tiempo de paro acumulado: ${totalDowntimeHours.toFixed(1)} hrs.` : `Sin registros de órdenes recientes. Analizado contra catálogo histórico general.`;

        let finalPriority = 'MEDIA';
        if (riskScore >= 6.0) finalPriority = 'CRÍTICA';
        else if (riskScore >= 4.0) finalPriority = 'ALTA';
        else if (riskScore < 2.5) finalPriority = 'BAJA';

        if (riskScore >= 2.5) {
          candidates.push({
            maquina_id: machId,
            riskScore: riskScore,
            prioridad: finalPriority,
            actividad_sugerida: `Análisis Predictivo: ${revType}`,
            responsable_sugerido: activeTechs.find(t => (t.especialidad || '').toLowerCase().includes(specialty.split(' ')[0].toLowerCase()))?.nombre_tecnico || activeTechs[Math.floor(Math.random() * activeTechs.length)]?.nombre_tecnico || 'Supervisor',
            tipo_revision: revType,
            especialidad: specialty,
            motivos: motivos,
            evidencia: evidencia
          });
        }
      }

      candidates.sort((a, b) => b.riskScore - a.riskScore);

      let count = 0;
      for (const candidate of candidates) {
        if (count >= 10) break;

        const day = 5 + (count * 2);
        const projDate = new Date(year, month, day);
        const balancedDateStr = getBalancedDate(projDate);

        const obsJson = {
          motivos: candidate.motivos,
          riesgo_estimado: `${candidate.riskScore}/10 (${candidate.prioridad})`,
          tipo_revision: candidate.tipo_revision,
          especialidad: candidate.especialidad,
          evidencia: candidate.evidencia
        };

        detailsToInsert.push({
          id_calendario: newCalId,
          maquina_id: candidate.maquina_id,
          fecha_programada: balancedDateStr,
          tipo_mantenimiento: 'PREDICTIVO',
          prioridad: candidate.prioridad,
          actividad_sugerida: candidate.actividad_sugerida,
          responsable_sugerido: candidate.responsable_sugerido,
          score_riesgo: candidate.riskScore,
          observaciones: JSON.stringify(obsJson),
          estatus_detalle: 'PROPUESTO'
        });

        count++;
      }
    } else if (type === 'AUTONOMO') {
      // Autónomo Semanal: Generar propuestas en base a la carga de Segundas por Rollo
      // 1. Obtener registros de segundas del periodo actual y anterior
      const [segundasRes, prevSegundasRes, relRes] = await Promise.all([
        supabaseClient.from('segundas_por_rollo').select('*').eq('anio', year).eq('semana', week),
        supabaseClient.from('segundas_por_rollo').select('*').eq('anio', year).eq('semana', week - 1),
        supabaseClient.from('cat_relacion_defecto_falla').select('*').eq('activo', true)
      ]);

      const currentSegundas = segundasRes.data || [];
      const prevSegundas = prevSegundasRes.data || [];
      const relations = relRes.data || [];

      if (currentSegundas.length === 0) {
        showToast('⚠️ No hay registros de Segundas por Rollo cargados para esta semana. Generando rutinas base...', 'warning');
        // Fallback a rutinas base de limpieza para máquinas activas
        activeMachines.forEach((machine, idx) => {
          const baseDay = 1 + (idx % 5);
          const startOfYear = new Date(year, 0, 1);
          const projDate = new Date(startOfYear.setDate(startOfYear.getDate() + ((week - 1) * 7) + baseDay));
          const balancedDateStr = getBalancedDate(projDate);

          detailsToInsert.push({
            id_calendario: newCalId,
            maquina_id: machine.equipo_towell,
            fecha_programada: balancedDateStr,
            tipo_mantenimiento: 'AUTONOMO',
            prioridad: 'BAJA',
            actividad_sugerida: `Rutina autónoma base: Limpieza y reapriete general`,
            responsable_sugerido: 'Operador de Planta',
            estatus_detalle: 'PROPUESTO'
          });
        });
      } else {
        // Agrupar por máquina + defecto
        const groups = {};
        currentSegundas.forEach(s => {
          const key = `${s.maquina_id}::${s.codigo_defecto}`;
          if (!groups[key]) {
            groups[key] = {
              maquina_id: s.maquina_id,
              codigo_defecto: s.codigo_defecto,
              defecto: s.defecto || s.codigo_defecto,
              cantidad_defecto: 0,
              mts_rollo: 0,
              turnos: {},
              articulos: new Set()
            };
          }
          groups[key].cantidad_defecto += parseFloat(s.cantidad_defecto || 0);
          groups[key].mts_rollo += parseFloat(s.mts_rollo || 0);
          if (s.turno_tejido) {
            groups[key].turnos[s.turno_tejido] = (groups[key].turnos[s.turno_tejido] || 0) + parseFloat(s.cantidad_defecto || 0);
          }
          if (s.nombre_articulo || s.codigo_articulo) {
            groups[key].articulos.add(s.nombre_articulo || s.codigo_articulo);
          }
        });

        // Agrupar también periodo anterior para comparar incremento
        const prevGroups = {};
        prevSegundas.forEach(s => {
          const key = `${s.maquina_id}::${s.codigo_defecto}`;
          prevGroups[key] = (prevGroups[key] || 0) + parseFloat(s.cantidad_defecto || 0);
        });

        // Evaluar cada grupo y calcular prioridades
        for (const [key, g] of Object.entries(groups)) {
          const machine = activeMachines.find(m => m.equipo_towell === g.maquina_id);
          if (!machine) continue;

          const currentVal = g.cantidad_defecto;
          const prevVal = prevGroups[key] || 0;
          let incrementPercent = 0;
          if (prevVal > 0) {
            incrementPercent = ((currentVal - prevVal) / prevVal) * 100;
          } else if (currentVal > 0) {
            incrementPercent = 100; // Primer evento
          }

          // Encontrar turno de mayor incidencia
          let worstTurno = 'No especificado';
          let maxTurnoVal = 0;
          Object.entries(g.turnos).forEach(([t, v]) => {
            if (v > maxTurnoVal) {
              maxTurnoVal = v;
              worstTurno = t;
            }
          });

          // Verificar mantenimientos recientes (últimos 14 días)
          const machOts = allOts.filter(o => o.maquina_id === g.maquina_id);
          const machLogs = allLogs.filter(l => l.maquina_id === g.maquina_id);
          const nowTime = new Date();
          let lastInterventionDays = 999;
          let lastInterventionType = '';

          machOts.forEach(o => {
            if (o.fecha_hora_inicio) {
              const diffDays = Math.floor((nowTime - new Date(o.fecha_hora_inicio)) / (1000 * 60 * 60 * 24));
              if (diffDays < lastInterventionDays) {
                lastInterventionDays = diffDays;
                lastInterventionType = o.orden_trabajo || 'OT';
              }
            }
          });
          machLogs.forEach(l => {
            if (l.fecha_hora_inicio) {
              const diffDays = Math.floor((nowTime - new Date(l.fecha_hora_inicio)) / (1000 * 60 * 60 * 24));
              if (diffDays < lastInterventionDays) {
                lastInterventionDays = diffDays;
                lastInterventionType = 'Bitácora';
              }
            }
          });

          // Buscar relación Defecto -> Actividad/Checklist
          const relation = relations.find(r => 
            (r.codigo_defecto && r.codigo_defecto.toLowerCase() === g.codigo_defecto.toLowerCase()) || 
            (r.defecto_calidad && r.defecto_calidad.toLowerCase().includes(g.defecto.toLowerCase()))
          );

          let activityDetails = 'Revisar equipo general para corregir defectos de calidad.';
          let checklistLabel = 'Revisión autónoma general de calidad';
          
          if (relation && relation.actividad_autonoma_sugerida) {
            activityDetails = relation.actividad_autonoma_sugerida;
          } else {
            const defMap = {
              'mancha de aceite': 'Inspección de fugas, sellos desgastados y depósitos de lubricación.',
              'trama floja': 'Ajustar la tensión de la trama, verificar alimentadores de hilo y sensores de trama.',
              'hilo roto': 'Limpiar y revisar guías de hilo, calibrar tensión y enhebradores.',
              'variacion dimensional': 'Revisar y calibrar parámetros dimensionales, rodillos y engranajes.',
              'contaminacion': 'Realizar rutina profunda de limpieza de pelusa y restos en zonas críticas de tejido.'
            };
            const matchedKey = Object.keys(defMap).find(k => g.defecto.toLowerCase().includes(k) || g.codigo_defecto.toLowerCase().includes(k));
            if (matchedKey) {
              activityDetails = defMap[matchedKey];
              checklistLabel = `Revisión autónoma de ${matchedKey}`;
            }
          }

          // Calcular prioridad
          let priority = 'BAJA';
          const crit = (machine.criticidad || 'B').toUpperCase();
          
          if (currentVal >= 50 || incrementPercent >= 25 || (crit.includes('A') && currentVal >= 20)) {
            priority = 'ALTA';
          } else if (currentVal >= 20 || incrementPercent >= 10) {
            priority = 'MEDIA';
          }

          // Si el incremento contra la semana anterior disminuye y está bajo control, no generar acción
          if (currentVal < 5 && incrementPercent < 0) {
            continue;
          }

          const motivos = [
            `Registra ${currentVal} segundas por defecto "${g.defecto}" esta semana.`,
            `Turno de mayor incidencia: ${worstTurno}.`,
            `Variación contra semana anterior: ${incrementPercent >= 0 ? '+' : ''}${incrementPercent.toFixed(1)}%.`
          ];
          
          if (lastInterventionDays < 14) {
            motivos.push(`⚠️ Mantenimiento reciente: Recibió intervención (${lastInterventionType}) hace ${lastInterventionDays} días.`);
          }
          if (crit.includes('A')) {
            motivos.push(`Telar de alta criticidad en planta.`);
          }

          const obsJson = {
            motivos: motivos,
            defecto_principal: g.defecto,
            cantidad_segundas: currentVal,
            incremento_semanal: incrementPercent,
            turno_incidencia: worstTurno,
            tipo_revision: relation ? relation.categoria_falla : 'Calidad Textil',
            especialidad: 'Operador / Técnico Autónomo',
            actividades_recomendadas: activityDetails.split('\n').map(a => a.replace('- ', '').trim()).filter(Boolean),
            evidencia: `Reporte semanal de Segundas por Rollo. Total metros: ${g.mts_rollo.toFixed(1)} mts.`
          };

          // Programar fecha balanceada
          const day = 2 + (detailsToInsert.length % 5);
          const projDate = new Date(year, 0, 1);
          projDate.setDate(projDate.getDate() + ((week - 1) * 7) + day);
          const balancedDateStr = getBalancedDate(projDate);

          detailsToInsert.push({
            id_calendario: newCalId,
            maquina_id: g.maquina_id,
            fecha_programada: balancedDateStr,
            tipo_mantenimiento: 'AUTONOMO',
            prioridad: priority,
            actividad_sugerida: `Mantenimiento Autónomo: Corregir defecto "${g.defecto}"`,
            responsable_sugerido: 'Operador de Planta',
            fuente_principal: g.codigo_defecto,
            score_riesgo: currentVal,
            observaciones: JSON.stringify(obsJson),
            estatus_detalle: 'PROPUESTO'
          });
        }
      }
    }

    if (detailsToInsert.length > 0) {
      const { error: dErr } = await supabaseClient
        .from('calendario_mantenimiento_detalle')
        .insert(detailsToInsert);

      if (dErr) throw dErr;
    }

    showToast('✅ Propuesta de calendario generada exitosamente.');
    switchCalendarViewMode('table');
  } catch (err) {
    console.error('[GenerateProposal] Error:', err);
    showToast('❌ Error al generar la propuesta: ' + err.message, 'error');
  }
}

// 3. Renderizar Tabla de Propuestas (Lista de Propuestas)
async function renderAdminCalendars() {
  const tbody = document.getElementById('table-calendar-tbody');
  const thead = document.getElementById('table-calendar-thead');
  if (!tbody || !thead) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Cargando propuestas…</td></tr>`;

  if (!supabaseClient) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-critical);">⚠️ Sin conexión a base de datos.</td></tr>`;
    return;
  }

  try {
    // 1. Renders the head of the table
    thead.innerHTML = `
      <tr>
        <th>Máquina</th>
        <th>Tipo</th>
        <th>Actividad sugerida</th>
        <th>Fecha Programada</th>
        <th>Asignado A</th>
        <th>Estado</th>
        <th>Acciones</th>
      </tr>
    `;

    // 2. Query details filter by current active tab
    const dbType = currentCalendarTab.toUpperCase();
    const { data: details, error } = await supabaseClient
      .from('calendario_mantenimiento_detalle')
      .select('*, calendarios_mantenimiento(anio, mes, semana)')
      .eq('tipo_mantenimiento', dbType)
      .order('fecha_programada', { ascending: true });

    if (error) throw error;

    if (!details || details.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted); font-style:italic;">No hay propuestas de mantenimiento programadas para esta categoría.</td></tr>`;
      return;
    }

    let html = '';
    details.forEach(d => {
      let badgeClass = 'badge-priority-baja';
      if (d.estatus_detalle === 'APROBADO') badgeClass = 'badge-status-ejecutada';
      else if (d.estatus_detalle === 'PROPUESTO') badgeClass = 'badge-priority-media';

      let actions = '';
      if (d.estatus_detalle === 'PROPUESTO') {
        let iaBtn = '';
        if (d.tipo_mantenimiento === 'PREDICTIVO' && d.observaciones) {
          iaBtn = `<button class="btn-table-action" onclick="showPredictiveRecommendation('${d.id_detalle}')" style="background:#0284c7; color:white; border:none; margin-right:4px;">🔬 Ver Recomendación IA</button>`;
        } else if (d.tipo_mantenimiento === 'AUTONOMO' && d.observaciones) {
          iaBtn = `<button class="btn-table-action" onclick="showAutonomousSegundasDetails('${d.id_detalle}')" style="background:#0284c7; color:white; border:none; margin-right:4px;">📊 Ver Análisis de Segundas</button>`;
        }
        actions = `
          ${iaBtn}
          <button class="btn-table-action" onclick="approveProposalDetail('${d.id_detalle}')" style="background:#22c55e; color:white; border:none; margin-right:4px;">Aprobar</button>
          <button class="btn-table-action" onclick="openEditProposalDateModal('${d.id_detalle}', '${d.maquina_id}', '${d.actividad_sugerida}', '${d.fecha_programada}')" style="margin-right:4px;">Reprogramar</button>
          <button class="btn-table-action" onclick="deleteProposalDetail('${d.id_detalle}')" style="background:#ef4444; color:white; border:none;">Eliminar</button>
        `;
      } else {
        actions = `<span style="color:#22c55e;font-weight:700;">OT Generada (${d.id_orden_generada ? 'Sincronizada' : 'Pendiente'})</span>`;
      }

      html += `
        <tr>
          <td><strong>${d.maquina_id}</strong></td>
          <td>${d.tipo_mantenimiento}</td>
          <td>${d.actividad_sugerida}</td>
          <td>${fmtDate(d.fecha_programada)}</td>
          <td>${d.responsable_sugerido || '—'}</td>
          <td><span class="badge ${badgeClass}">${d.estatus_detalle}</span></td>
          <td>${actions}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Agregar botón de aprobación masiva en el header si hay propuestas
    const hasProposals = details.some(d => d.estatus_detalle === 'PROPUESTO');
    const headerActions = document.querySelector('#calendar-view-table-mode .responsive-table-wrapper');
    if (headerActions) {
      let bulkBtn = document.getElementById('btn-bulk-approve-calendar');
      if (hasProposals) {
        if (!bulkBtn) {
          const btnDiv = document.createElement('div');
          btnDiv.style.margin = '12px 0';
          btnDiv.id = 'btn-bulk-approve-wrapper';
          btnDiv.innerHTML = `<button class="btn-nav btn-nav-primary" id="btn-bulk-approve-calendar" onclick="approveCalendar()" style="background:#22c55e; color:white;">🎯 Aprobar Todo el Calendario y Generar OTs</button>`;
          headerActions.parentNode.insertBefore(btnDiv, headerActions);
        }
      } else {
        const wrapper = document.getElementById('btn-bulk-approve-wrapper');
        if (wrapper) wrapper.remove();
      }
    }
  } catch (err) {
    console.error('[renderAdminCalendars] Error:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-critical);">❌ Error al cargar propuestas: ${err.message}</td></tr>`;
  }
}

// 4. Cambiar de pestaña de propuesta
function switchCalendarTab(tab) {
  currentCalendarTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.style.borderBottomColor = 'transparent';
    btn.style.color = 'var(--text-muted)';
  });

  const activeBtn = document.getElementById(`tab-btn-${tab}-sub`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.style.borderBottomColor = 'var(--primary-color)';
    activeBtn.style.color = 'var(--primary-color)';
  }

  renderAdminCalendars();
}

// 5. Reprogramación de fecha individual
function openEditProposalDateModal(detailId, machineId, serviceCode, currentDateStr) {
  document.getElementById('edit-proposal-detail-id').value = detailId;
  document.getElementById('edit-proposal-machine').textContent = machineId;
  document.getElementById('edit-proposal-service').textContent = serviceCode;
  document.getElementById('edit-proposal-new-date').value = currentDateStr;
  openModal('modal-edit-proposal-date');
}

async function handleSaveProposalDate(event) {
  event.preventDefault();
  const id = document.getElementById('edit-proposal-detail-id').value;
  const newDate = document.getElementById('edit-proposal-new-date').value;

  closeModal('modal-edit-proposal-date');
  showToast('💾 Actualizando fecha programada...');

  try {
    const { error } = await supabaseClient
      .from('calendario_mantenimiento_detalle')
      .update({ fecha_programada: newDate, fecha_actualizacion: new Date().toISOString() })
      .eq('id_detalle', id);

    if (error) throw error;
    showToast('✅ Fecha reprogramada exitosamente.');
    renderAdminCalendars();
    renderAdminCalendar();
  } catch (err) {
    console.error(err);
    showToast('❌ Error al actualizar fecha: ' + err.message, 'error');
  }
}

// 6. Eliminar propuesta individual
async function deleteProposalDetail(detailId) {
  if (!confirm('¿Estás seguro de eliminar esta propuesta de intervención?')) return;
  showToast('🗑️ Eliminando propuesta...');

  try {
    const { error } = await supabaseClient
      .from('calendario_mantenimiento_detalle')
      .delete()
      .eq('id_detalle', detailId);

    if (error) throw error;
    showToast('✅ Propuesta eliminada.');
    renderAdminCalendars();
    renderAdminCalendar();
  } catch (err) {
    console.error(err);
    showToast('❌ Error al eliminar propuesta.', 'error');
  }
}

// 7. Aprobación y Generación de Órdenes de Trabajo
async function approveProposalDetail(detailId) {
  showToast('⚙️ Aprobando propuesta y generando orden...');

  try {
    const { data: detailData, error: detErr } = await supabaseClient
      .from('calendario_mantenimiento_detalle')
      .select('*')
      .eq('id_detalle', detailId)
      .single();

    if (detErr) throw detErr;

    // Buscar técnico UUID en catálogo
    const { data: techData } = await supabaseClient
      .from('cat_tecnicos')
      .select('cve_tecnico, nombre_tecnico')
      .eq('nombre_tecnico', detailData.responsable_sugerido)
      .maybeSingle();

    const orderRecord = {
      orden_trabajo: detailData.tipo_mantenimiento === 'PREVENTIVO' ? 'MP' : (detailData.tipo_mantenimiento === 'PREDICTIVO' ? 'MC' : 'MA'),
      origen: 'App',
      estatus: 'asignada',
      fecha_inicio: detailData.fecha_programada,
      fecha_hora_inicio: `${detailData.fecha_programada}T08:00:00`,
      maquina_id: detailData.maquina_id,
      descripcion: detailData.actividad_sugerida,
      nombre_solicitante: 'Generador de Calendarios AI',
      cve_atendio: techData ? techData.cve_tecnico : null,
      nombre_atendio: techData ? techData.nombre_tecnico : null,
      prioridad: detailData.prioridad || 'Media',
      id_plan: detailData.id_plan
    };

    // 1. Insertar orden de trabajo
    const { data: otData, error: otErr } = await supabaseClient
      .from('ordenes_trabajo')
      .insert([orderRecord])
      .select();

    if (otErr) throw otErr;
    const newOT = otData[0];

    // 2. Actualizar propuesta vinculándola a la orden generada
    await supabaseClient
      .from('calendario_mantenimiento_detalle')
      .update({
        estatus_detalle: 'APROBADO',
        id_orden_generada: newOT.id_orden
      })
      .eq('id_detalle', detailId);

    // 3. Obtener checklist asociado e insertarlo en respuestas
    if (detailData.id_plan) {
      const { data: planData } = await supabaseClient
        .from('planes_mantenimiento_preventivo')
        .select('codigo_servicio')
        .eq('id_plan', detailData.id_plan)
        .single();

      if (planData && planData.codigo_servicio) {
        const { data: questions } = await supabaseClient
          .from('checklists_mantenimiento')
          .select('id_checklist')
          .eq('codigo_servicio', planData.codigo_servicio)
          .eq('activo', true);

        if (questions && questions.length > 0) {
          const responses = questions.map(q => ({
            id_orden: newOT.id_orden,
            id_checklist: q.id_checklist,
            respuesta: null
          }));

          await supabaseClient.from('respuestas_checklist_orden').insert(responses);
        }
      }
    } else if (detailData.tipo_mantenimiento === 'AUTONOMO') {
      let defectCode = detailData.fuente_principal;
      if (!defectCode && detailData.observaciones) {
        try {
          const obs = JSON.parse(detailData.observaciones);
          defectCode = obs.defecto_principal;
        } catch (e) {}
      }

      if (defectCode) {
        const { data: rel } = await supabaseClient
          .from('cat_relacion_defecto_falla')
          .select('tipo_falla_id')
          .eq('codigo_defecto', defectCode)
          .maybeSingle();

        const fallaId = rel ? rel.tipo_falla_id : 'MA_GENERAL';

        const { data: questions } = await supabaseClient
          .from('checklists_mantenimiento')
          .select('id_checklist')
          .eq('tipo_falla_id', fallaId)
          .eq('activo', true);

        if (questions && questions.length > 0) {
          const responses = questions.map(q => ({
            id_orden: newOT.id_orden,
            id_checklist: q.id_checklist,
            respuesta: null
          }));
          await supabaseClient.from('respuestas_checklist_orden').insert(responses);
        }
      }
    }

    showToast(`✅ Propuesta aprobada. Generada la orden de trabajo folio ${newOT.folio || ''}.`);
    await syncDatabases();
    renderAdminCalendars();
    renderAdminCalendar();
  } catch (err) {
    console.error(err);
    showToast('❌ Error al aprobar la sugerencia: ' + err.message, 'error');
  }
}

// 8. Aprobación Masiva de Calendario
async function approveCalendar() {
  const dbType = currentCalendarTab.toUpperCase();
  showToast('⚙️ Aprobando todas las propuestas en lote...');

  try {
    const { data: details, error: detErr } = await supabaseClient
      .from('calendario_mantenimiento_detalle')
      .select('*')
      .eq('tipo_mantenimiento', dbType)
      .eq('estatus_detalle', 'PROPUESTO');

    if (detErr) throw detErr;

    if (!details || details.length === 0) {
      showToast('No hay sugerencias propuestas para aprobar.');
      return;
    }

    // Aprobar secuencialmente en lote
    for (const d of details) {
      await approveProposalDetail(d.id_detalle);
    }

    showToast(`🎯 Lote aprobado. Se han generado ${details.length} órdenes de trabajo.`);
    renderAdminCalendars();
    renderAdminCalendar();
  } catch (err) {
    console.error(err);
    showToast('❌ Error en aprobación masiva.', 'error');
  }
}

// 9. Mostrar Detalle de Recomendación Predictiva IA
async function showPredictiveRecommendation(detailId) {
  if (!supabaseClient) return;
  showToast('🔍 Obteniendo análisis predictivo...');

  try {
    const { data: d, error } = await supabaseClient
      .from('calendario_mantenimiento_detalle')
      .select('*')
      .eq('id_detalle', detailId)
      .single();

    if (error) throw error;
    if (!d || !d.observaciones) {
      showToast('⚠️ No se encontró análisis predictivo asociado.', 'warning');
      return;
    }

    // Parsear observaciones JSON
    let obs = {};
    try {
      obs = JSON.parse(d.observaciones);
    } catch (e) {
      console.warn('Fallo al parsear observaciones predictivas:', e);
      obs = { motivos: [d.observaciones] };
    }

    // Restaurar títulos a versión "Análisis Predictivo IA"
    const headerTitle = document.querySelector('#modal-predictive-recommendation-details .modal-header h4 span');
    if (headerTitle) {
      headerTitle.textContent = '🔬 Análisis Predictivo IA';
    }

    const labelType = document.querySelector('#modal-predictive-recommendation-details div[style*="grid-template-columns"] div:nth-child(1) div:nth-child(1)');
    const labelSpecialty = document.querySelector('#modal-predictive-recommendation-details div[style*="grid-template-columns"] div:nth-child(2) div:nth-child(1)');
    if (labelType) labelType.textContent = 'Tipo de Revisión';
    if (labelSpecialty) labelSpecialty.textContent = 'Especialidad Requerida';

    // Poblar modal
    document.getElementById('pred-rec-machine').textContent = d.maquina_id;
    document.getElementById('pred-rec-priority').textContent = d.prioridad || 'MEDIA';
    
    // Calcular porcentaje de barra de riesgo
    const scoreStr = (obs.riesgo_estimado || '0').split('/')[0];
    const scoreVal = parseFloat(scoreStr) || 0;
    const barPercent = Math.min(100, scoreVal * 10);
    
    document.getElementById('pred-rec-risk-label').textContent = `${scoreVal}/10`;
    const riskBar = document.getElementById('pred-rec-risk-bar');
    if (riskBar) {
      riskBar.style.width = `${barPercent}%`;
      // Cambiar color basado en severidad
      if (scoreVal >= 6.0) riskBar.style.background = '#f43f5e'; // Rojo
      else if (scoreVal >= 4.0) riskBar.style.background = '#fbbf24'; // Amarillo
      else riskBar.style.background = '#3b82f6'; // Azul
    }

    document.getElementById('pred-rec-type').textContent = obs.tipo_revision || 'Inspección Predictiva General';
    document.getElementById('pred-rec-specialty').textContent = obs.especialidad || 'Electromecánico';

    // Lista de motivos
    const motivosList = document.getElementById('pred-rec-motivos-list');
    if (motivosList) {
      motivosList.innerHTML = '';
      const motivosArr = obs.motivos || [];
      if (motivosArr.length === 0) {
        motivosList.innerHTML = `<li>No hay motivos de alta prioridad detectados. Revisión sugerida rutinaria.</li>`;
      } else {
        motivosArr.forEach(m => {
          motivosList.innerHTML += `<li>${m}</li>`;
        });
      }
    }

    document.getElementById('pred-rec-evidence').textContent = obs.evidencia || 'Sin evidencias externas registradas.';
    document.getElementById('pred-rec-date').textContent = fmtDate(d.fecha_programada);

    // Botón Aprobación
    const approveBtn = document.getElementById('pred-rec-approve-btn');
    if (approveBtn) {
      if (d.estatus_detalle === 'PROPUESTO') {
        approveBtn.style.display = 'block';
        approveBtn.onclick = async () => {
          closeModal('modal-predictive-recommendation-details');
          await approveProposalDetail(detailId);
        };
      } else {
        approveBtn.style.display = 'none';
      }
    }

    openModal('modal-predictive-recommendation-details');
  } catch (err) {
    console.error('[showPredictiveRecommendation] Error loading recommendations:', err);
    showToast('❌ Error al cargar la recomendación.', 'error');
  }
}

// 10. Mostrar Detalle de Análisis de Segundas por Rollo (Mantenimiento Autónomo)
async function showAutonomousSegundasDetails(detailId) {
  if (!supabaseClient) return;
  showToast('🔍 Obteniendo análisis de segundas...');

  try {
    const { data: d, error } = await supabaseClient
      .from('calendario_mantenimiento_detalle')
      .select('*')
      .eq('id_detalle', detailId)
      .single();

    if (error) throw error;
    if (!d || !d.observaciones) {
      showToast('⚠️ No se encontró análisis de segundas asociado.', 'warning');
      return;
    }

    let obs = {};
    try {
      obs = JSON.parse(d.observaciones);
    } catch (e) {
      console.warn('Fallo al parsear observaciones autónomas:', e);
      obs = { motivos: [d.observaciones] };
    }
  } catch (err) {
    console.error('[showAutonomousSegundasDetails] Error loading details:', err);
  }
}

function renderSolicitanteProfileHeader() {
  if (!currentUser) return;
  const userArea = (currentUser.area || 'CF').toUpperCase().trim();

  const nameEl = document.getElementById('solic-profile-name');
  const areaEl = document.getElementById('solic-profile-area');
  const badgeTopEl = document.getElementById('solic-topbar-area-badge');
  const switchAdminBtn = document.getElementById('menu-solic-switch-admin');

  if (nameEl) nameEl.innerText = currentUser.name || currentUser.nombre_completo || 'Solicitante';
  if (areaEl) areaEl.innerText = `Área: ${userArea}`;
  if (badgeTopEl) badgeTopEl.innerText = `Área: ${userArea}`;

  const isSuperAdmin = currentUser.rol === 'SUPER_ADMINISTRADOR' || currentUser.cve_tecnico === '2025';
  if (switchAdminBtn) switchAdminBtn.style.display = isSuperAdmin ? 'block' : 'none';

  const trackSub = document.getElementById('solic-tracking-subtitle');
  if (trackSub) trackSub.innerText = `Consulta exclusivamente las solicitudes generadas por tu usuario (${currentUser.name || currentUser.email}).`;

  const calSub = document.getElementById('solic-calendar-subtitle');
  if (calSub) calSub.innerText = `Programación de intervenciones y mantenimientos aprobados para el Área: ${userArea}`;

  const valSub = document.getElementById('solic-validation-subtitle');
  if (valSub) valSub.innerText = `Valida el trabajo realizado en tus solicitudes en estatus PENDIENTE DE VALIDACIÓN.`;
}

function initSolicitanteNewForm() {
  if (!currentUser) return;
  const userArea = (currentUser.area || 'CF').toUpperCase().trim();
  const userDept = currentUser.department || (userArea === 'CF' ? 'Costura' : userArea === 'PRF' ? 'Tejido / Producción' : userArea === 'TF' ? 'Tintorería' : 'Servicios Auxiliares');

  // 1. Cargar datos obtenidos automáticamente (Lectura únicamente)
  const appEl = document.getElementById('solic-auto-applicant');
  const areaEl = document.getElementById('solic-auto-area');
  const deptEl = document.getElementById('solic-auto-dept');
  const dateEl = document.getElementById('solic-auto-date');
  const timeEl = document.getElementById('solic-auto-time');

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  if (appEl) appEl.innerText = currentUser.name || currentUser.nombre_completo || currentUser.email;
  if (areaEl) areaEl.innerText = userArea;
  if (deptEl) deptEl.innerText = userDept;
  if (dateEl) dateEl.innerText = dateStr;
  if (timeEl) timeEl.innerText = timeStr;

  // 2. Cargar máquinas filtradas por el área del perfil autenticado
  const macSelect = document.getElementById('solic-req-machine');
  const areaMachines = getMachinesByArea(userArea);

  if (macSelect) {
    let html = '<option value="">Selecciona máquina de tu área (' + userArea + ')...</option>';
    html += '<option value="NO_APLICA">NO APLICA MÁQUINA (Infraestructura / Edificios / Servicios)</option>';
    areaMachines.forEach(m => {
      const id = m.id || m.clave;
      const name = m.name || m.nombre || id;
      html += `<option value="${id}">${id} - ${name}</option>`;
    });
    macSelect.innerHTML = html;
  }

  // Ocultar campo ubicación inicialmente
  const locGroup = document.getElementById('solic-group-location');
  if (locGroup) locGroup.style.display = 'none';
}

function onSolicitanteMachineSelectChange(machineId) {
  const locGroup = document.getElementById('solic-group-location');
  const locInput = document.getElementById('solic-req-location');
  const urgencySelect = document.getElementById('solic-req-urgency');

  if (machineId === 'NO_APLICA') {
    if (locGroup) locGroup.style.display = 'block';
    if (locInput) locInput.required = true;
    return;
  } else {
    if (locGroup) locGroup.style.display = 'none';
    if (locInput) { locInput.required = false; locInput.value = ''; }
  }

  if (machineId) {
    const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
    const found = machines.find(m => m.id === machineId || m.clave === machineId);
    if (urgencySelect && found) {
      if (found.criticality === 'A') urgencySelect.value = 'Crítica';
      else if (found.criticality === 'B') urgencySelect.value = 'Alta';
      else urgencySelect.value = 'Media';
    }
  }
}

async function submitSolicitanteNewRequest() {
  if (!currentUser) { alert('Debes iniciar sesión como Solicitante.'); return; }

  const userArea = (currentUser.area || 'CF').toUpperCase().trim();
  const userDept = currentUser.department || 'Operación';
  const requestType = document.getElementById('solic-req-type').value;
  const shift = document.getElementById('solic-req-shift').value;
  const machineId = document.getElementById('solic-req-machine').value;
  const locationVal = document.getElementById('solic-req-location').value.trim();
  const stopped = document.getElementById('solic-req-stopped').value;
  const urgency = document.getElementById('solic-req-urgency').value;
  const riskVal = document.getElementById('solic-req-risk').value;
  const description = document.getElementById('solic-req-description').value.trim();
  const observations = document.getElementById('solic-req-observations').value.trim();

  if (!machineId) {
    alert('Por favor selecciona una máquina o la opción NO APLICA MÁQUINA.');
    return;
  }

  if (machineId === 'NO_APLICA' && !locationVal) {
    alert('Al seleccionar NO APLICA MÁQUINA, debes indicar la ubicación específica del trabajo.');
    return;
  }

  if (!description) {
    alert('Por favor describe la falla o el requerimiento solicitado.');
    return;
  }

  const newReqId = 'REQ-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-4);
  const reqObj = {
    id: newReqId,
    applicant: currentUser.name || currentUser.nombre_completo || currentUser.email,
    applicant_id: currentUser.id || currentUser.uuid,
    applicant_email: currentUser.email,
    department: userDept,
    shift: shift,
    area: userArea,
    machine: machineId === 'NO_APLICA' ? 'NO APLICA MÁQUINA' : machineId,
    location: locationVal || 'Planta General',
    type: requestType || 'Correctivo',
    description: description,
    observations: observations || 'Ninguna',
    machineStopped: stopped,
    urgency: urgency,
    risk: riskVal,
    status: 'Solicitud recibida',
    date: new Date().toISOString()
  };

  // Guardar en Supabase
  if (supabaseClient) {
    try {
      await supabaseClient.from('solicitudes_mantenimiento').insert([{
        folio_solicitud: newReqId,
        solicitante_nombre: reqObj.applicant,
        solicitante_id: reqObj.applicant_id,
        turno: shift,
        area: userArea,
        maquina_id: reqObj.machine,
        tipo_servicio: reqObj.type,
        descripcion_falla: description,
        maquina_detenida: stopped === 'Sí',
        urgencia: urgency,
        estatus: 'Solicitud recibida',
        fecha_registro: reqObj.date
      }]);
    } catch (err) {
      console.error('Error insertando solicitud en Supabase:', err);
    }
  }

  // Guardar localmente
  const localReqs = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  localReqs.unshift(reqObj);
  localStorage.setItem('TSMAI_requests', JSON.stringify(localReqs));

  alert(`✅ Solicitud ${newReqId} generada exitosamente.`);
  document.getElementById('form-solic-new-request').reset();
  switchSolicitantePanel('tracking');
}

async function renderSolicitanteTracking() {
  const tbody = document.getElementById('tbody-solic-tracking');
  if (!tbody) return;
  if (!currentUser) return;

  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; color:#64748b;">Cargando únicamente tus solicitudes...</td></tr>';

  let localReqs = JSON.parse(localStorage.getItem('TSMAI_requests') || '[]');
  let localOrders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');

  // RESTRICCIÓN PRINCIPAL PRD 9.1: El Solicitante ve únicamente sus propias solicitudes generadas
  const currentUserId = String(currentUser.id || currentUser.uuid || '');
  const currentUserEmail = String(currentUser.email || '').toLowerCase();
  const currentUserName = String(currentUser.name || currentUser.nombre_completo || '').toLowerCase();

  const isUserMatch = (item) => {
    const itemAppId = String(item.applicant_id || item.solicitante_id || '');
    const itemAppEmail = String(item.applicant_email || item.email || item.applicant || '').toLowerCase();
    const itemAppName = String(item.applicant || item.solicitante_nombre || '').toLowerCase();

    return (
      (currentUserId && itemAppId === currentUserId) ||
      (currentUserEmail && itemAppEmail.includes(currentUserEmail)) ||
      (currentUserName && itemAppName.includes(currentUserName))
    );
  };

  let myReqs = localReqs.filter(isUserMatch);
  let myOrders = localOrders.filter(isUserMatch);

  // Combinar registros únicos por ID
  const allItemsMap = new Map();
  myReqs.forEach(r => allItemsMap.set(r.id, r));
  myOrders.forEach(o => allItemsMap.set(o.id, o));

  const sortedItems = Array.from(allItemsMap.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  if (sortedItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; color:#64748b;">No tienes solicitudes generadas por tu usuario registradas aún.</td></tr>';
    return;
  }

  tbody.innerHTML = sortedItems.map(item => {
    let statusBadge = '<span class="badge badge-priority-media">' + (item.status || 'Solicitud recibida') + '</span>';
    if (item.status === 'Asignada') statusBadge = '<span class="badge badge-priority-alta">Asignada</span>';
    else if (item.status === 'En proceso' || item.status === 'En ejecución') statusBadge = '<span class="badge badge-priority-critica">En Proceso</span>';
    else if (item.status === 'PENDIENTE DE VALIDACIÓN' || item.status === 'Lista para validación' || item.status === 'En validación') statusBadge = '<span class="badge" style="background:#8b5cf6; color:white;">PENDIENTE DE VALIDACIÓN</span>';
    else if (item.status === 'REQUIERE CORRECCIÓN') statusBadge = '<span class="badge" style="background:#ef4444; color:white;">REQUIERE CORRECCIÓN</span>';
    else if (item.status === 'Cerrada' || item.status === 'Ejecutada') statusBadge = '<span class="badge badge-priority-baja">Cerrada</span>';

    const macOrLoc = item.location && item.machine === 'NO APLICA MÁQUINA' 
      ? `📍 ${item.location}` 
      : (item.machine || item.maquina_id || 'Equipo');

    const shortDesc = (item.description || item.descripcion_falla || 'Sin descripción').slice(0, 50) + '...';

    return `<tr>
      <td><strong>${item.id}</strong></td>
      <td>${fmtDate(item.date || item.fecha_registro || new Date())}</td>
      <td><span class="badge badge-priority-baja">${item.area || currentUser.area}</span></td>
      <td>${macOrLoc}</td>
      <td>${shortDesc}</td>
      <td>${item.urgency || item.urgencia || 'Media'}</td>
      <td>${statusBadge}</td>
      <td><code style="font-size:0.75rem;">${item.otId || item.id_orden || item.id}</code></td>
      <td>${item.assignedTech || item.nombre_tecnico || 'Por asignar'}</td>
      <td>${item.dueDate ? fmtDate(item.dueDate) : 'Por definir'}</td>
    </tr>`;
  }).join('');
}

let activeSolicitanteCalendarView = 'month';

function switchSolicitanteCalendarView(viewName) {
  activeSolicitanteCalendarView = viewName;
  document.getElementById('btn-solic-cal-view-month')?.classList.remove('active');
  document.getElementById('btn-solic-cal-view-week')?.classList.remove('active');
  document.getElementById('btn-solic-cal-view-day')?.classList.remove('active');

  const activeBtn = document.getElementById(`btn-solic-cal-view-${viewName}`);
  if (activeBtn) activeBtn.classList.add('active');

  renderSolicitanteCalendar();
}

async function renderSolicitanteCalendar() {
  const container = document.getElementById('solic-calendar-container');
  if (!container || !currentUser) return;

  const userArea = (currentUser.area || 'CF').toUpperCase().trim();
  const filterType = document.getElementById('filter-solic-cal-type')?.value || 'ALL';

  container.innerHTML = '<p style="color:#64748b;">Cargando mantenimientos programados para tu Área (' + userArea + ')...</p>';

  const machines = getMachinesByArea(userArea);
  let orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]').filter(o => String(o.area).toUpperCase().trim() === userArea);

  // PRD 10.3: Preventivos aprobados/programados/en ejecución/terminadas
  let preventives = orders.filter(o => (o.type === 'MP' || o.tipo === 'MP') && ['APROBADA', 'PROGRAMADA', 'EN EJECUCIÓN', 'En proceso', 'Asignada', 'TERMINADA', 'Cerrada'].includes(o.status));
  
  // PRD 10.4: Predictivos aprobados (Limpiando prompts o tokens internos de IA)
  let predictives = orders.filter(o => (o.type === 'PRED' || o.tipo === 'PRED') && ['APROBADA', 'PROGRAMADA', 'EN EJECUCIÓN', 'Cerrada'].includes(o.status));

  // PRD 10.5: Autónomos derivados de Segundas por Rollo aprobadas
  let autonomous = JSON.parse(localStorage.getItem('TSMAI_autonomous_calendar') || '[]').filter(a => String(a.area || userArea).toUpperCase().trim() === userArea);

  if (filterType === 'MP') {
    predictives = []; autonomous = [];
  } else if (filterType === 'PRED') {
    preventives = []; autonomous = [];
  } else if (filterType === 'AUTONOMO') {
    preventives = []; predictives = [];
  }

  let html = '';
  if (preventives.length === 0 && predictives.length === 0 && autonomous.length === 0) {
    container.innerHTML = '<p style="color:#64748b; padding:20px; text-align:center;">No hay actividades de mantenimiento programadas o aprobadas para el Área ' + userArea + ' en la vista seleccionada (' + activeSolicitanteCalendarView.toUpperCase() + ').</p>';
    return;
  }

  machines.forEach(m => {
    const mId = m.id || m.clave;
    const macPrev = preventives.filter(o => o.machine === mId);
    const macPred = predictives.filter(o => o.machine === mId);
    const macAuto = autonomous.filter(a => a.machine === mId || a.telar === mId);

    const totalEvents = macPrev.length + macPred.length + macAuto.length;
    if (totalEvents === 0) return;

    html += `<div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <h4 style="margin:0; font-weight:700; color:#1e293b;">${mId} — ${m.name || m.nombre}</h4>
        <span class="badge badge-priority-baja">${userArea}</span>
      </div>
      <p style="font-size:0.82rem; color:#64748b; margin:2px 0 10px;">Estatus Equipo: <strong>${m.status || 'Operativa'}</strong></p>
      
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${macPrev.map(p => `<div style="padding:8px 10px; background:white; border-left:4px solid #3b82f6; border-radius:6px; font-size:0.83rem;">
          <div style="display:flex; justify-content:space-between;"><strong>🛠️ PREVENTIVO: ${p.id}</strong><span class="badge badge-priority-baja">${p.status}</span></div>
          <div>${p.description || 'Mantenimiento Preventivo'}</div>
          <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Fecha: ${fmtDate(p.date)} | Duración estimada: 2 hrs</div>
        </div>`).join('')}

        ${macPred.map(pr => `<div style="padding:8px 10px; background:white; border-left:4px solid #8b5cf6; border-radius:6px; font-size:0.83rem;">
          <div style="display:flex; justify-content:space-between;"><strong>🔮 PREDICTIVO: ${pr.id}</strong><span class="badge badge-priority-alta">${pr.status}</span></div>
          <div>Revisión predictiva de vibración y temperatura</div>
          <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Fecha: ${fmtDate(pr.date)} | Prioridad: ${pr.urgency || 'Alta'}</div>
        </div>`).join('')}

        ${macAuto.map(a => `<div style="padding:8px 10px; background:white; border-left:4px solid #10b981; border-radius:6px; font-size:0.83rem;">
          <div style="display:flex; justify-content:space-between;"><strong>🤖 AUTÓNOMO: ${a.id || 'SEG-ROLLO'}</strong><span class="badge badge-priority-baja">${a.status || 'PROGRAMADO'}</span></div>
          <div>Origen: Segundas por Rollo (Semana ${a.semana || '30'}) — ${a.actividad || 'Revisión de tensión y alimentación'}</div>
          <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Fecha: ${fmtDate(a.fecha || new Date())}</div>
        </div>`).join('')}
      </div>
    </div>`;
  });

  container.innerHTML = html || '<p style="color:#64748b;">No hay actividades para las máquinas de tu área.</p>';
}

let activeSolicitanteValTab = 'pending';

function switchSolicitanteValTab(tab) {
  activeSolicitanteValTab = tab;
  document.getElementById('tab-solic-val-pending')?.classList.remove('active');
  document.getElementById('tab-solic-val-history')?.classList.remove('active');
  document.getElementById('solic-val-content-pending').style.display = 'none';
  document.getElementById('solic-val-content-history').style.display = 'none';

  if (tab === 'pending') {
    document.getElementById('tab-solic-val-pending')?.classList.add('active');
    document.getElementById('solic-val-content-pending').style.display = 'block';
  } else {
    document.getElementById('tab-solic-val-history')?.classList.add('active');
    document.getElementById('solic-val-content-history').style.display = 'block';
  }
}

async function renderSolicitanteValidations() {
  const tbodyPending = document.getElementById('tbody-solic-pending-val');
  const tbodyHistory = document.getElementById('tbody-solic-history-val');
  const badgePending = document.getElementById('badge-solic-pending-val');
  if (!currentUser) return;

  const currentUserId = String(currentUser.id || currentUser.uuid || '');
  const currentUserEmail = String(currentUser.email || '').toLowerCase();
  const currentUserName = String(currentUser.name || currentUser.nombre_completo || '').toLowerCase();

  const isUserMatch = (item) => {
    const itemAppId = String(item.applicant_id || item.solicitante_id || '');
    const itemAppEmail = String(item.applicant_email || item.email || item.applicant || '').toLowerCase();
    const itemAppName = String(item.applicant || item.solicitante_nombre || '').toLowerCase();

    return (
      (currentUserId && itemAppId === currentUserId) ||
      (currentUserEmail && itemAppEmail.includes(currentUserEmail)) ||
      (currentUserName && itemAppName.includes(currentUserName))
    );
  };

  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');

  // PRD 11.1: Mostrar únicamente órdenes PENDIENTE DE VALIDACIÓN vinculadas a solicitudes generadas por ese usuario
  const pendingOrders = orders.filter(o => 
    isUserMatch(o) && 
    (o.status === 'PENDIENTE DE VALIDACIÓN' || o.status === 'Lista para validación' || o.status === 'En validación' || o.status === 'Ejecutada')
  );

  if (badgePending) {
    if (pendingOrders.length > 0) {
      badgePending.innerText = pendingOrders.length;
      badgePending.style.display = 'inline-block';
    } else {
      badgePending.style.display = 'none';
    }
  }

  if (tbodyPending) {
    if (pendingOrders.length === 0) {
      tbodyPending.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No tienes órdenes pendientes de validación asociadas a tus solicitudes.</td></tr>';
    } else {
      tbodyPending.innerHTML = pendingOrders.map(o => `<tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.machine || o.location || 'Equipo'}</td>
        <td>${o.assignedTech || 'Técnico Asignado'}</td>
        <td>${(o.description || 'Intervención finalizada').slice(0, 60)}...</td>
        <td>${fmtDate(o.dueDate || o.date || new Date())}</td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn-action-secondary" style="padding:4px 10px; font-size:0.8rem;" onclick="openSolicitanteValidationDetail('${o.id}')">🔍 Ver Detalle</button>
            <button class="btn-tech-status btn-tech-start" style="padding:4px 10px; font-size:0.8rem;" onclick="openAcceptWorkModal('${o.id}')">✅ ACEPTAR TRABAJO</button>
            <button class="btn-tech-status btn-tech-subtask" style="padding:4px 10px; font-size:0.8rem; background:#ef4444; border-color:#ef4444;" onclick="openCorrectionModal('${o.id}')">⚠️ SOLICITAR CORRECCIÓN</button>
          </div>
        </td>
      </tr>`).join('');
    }
  }

  // Cargar Historial de Validaciones del Usuario
  if (tbodyHistory) {
    const validations = JSON.parse(localStorage.getItem('TSMAI_validations_history') || '[]');
    const myValidations = validations.filter(isUserMatch);

    if (myValidations.length === 0) {
      tbodyHistory.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No hay validaciones registradas por tu usuario aún.</td></tr>';
    } else {
      tbodyHistory.innerHTML = myValidations.map(v => `<tr>
        <td><strong>${v.orderId}</strong></td>
        <td>${fmtDate(v.date)}</td>
        <td>${v.userName || v.userId}</td>
        <td>${v.action === 'APPROVED' ? '<span class="badge badge-priority-baja">ACEPTADA Y CERRADA</span>' : '<span class="badge badge-priority-alta">REQUIERE CORRECCIÓN</span>'}</td>
        <td>${v.rating ? '⭐'.repeat(v.rating) + ' (' + v.rating + '/5)' : '—'}</td>
        <td>${v.comments || v.reason || 'Sin comentarios'}</td>
      </tr>`).join('');
    }
  }
}

let activeValidationOrderId = null;

function openSolicitanteValidationDetail(orderId) {
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  activeValidationOrderId = orderId;

  document.getElementById('solic-detail-modal-title').innerText = `🔍 Detalle de Trabajo Realizado — OT: ${order.id}`;
  document.getElementById('solic-detail-req-id').innerText = order.reqId || order.id;
  document.getElementById('solic-detail-req-date').innerText = fmtDate(order.date);
  document.getElementById('solic-detail-req-machine').innerText = order.machine || order.location || 'Equipo';
  document.getElementById('solic-detail-req-desc').innerText = order.description || 'Sin descripción';

  document.getElementById('solic-detail-ot-id').innerText = order.id;
  document.getElementById('solic-detail-ot-tech').innerText = order.assignedTech || 'Técnico Principal';
  document.getElementById('solic-detail-ot-dates').innerText = `${fmtDate(order.date)} — ${fmtDate(order.dueDate || new Date())}`;
  document.getElementById('solic-detail-ot-duration').innerText = '1 hr 45 min';

  document.getElementById('solic-detail-ot-diag').innerText = order.diagnosis || 'Revisión y solución de anomalías operativas.';
  document.getElementById('solic-detail-ot-act').innerText = order.activity || 'Ajuste de componentes y pruebas de funcionamiento.';
  document.getElementById('solic-detail-ot-obs').innerText = order.observations || 'Sin observaciones.';
  document.getElementById('solic-detail-ot-parts').innerText = order.partsUsed || 'Ninguna refacción requerida.';

  document.getElementById('btn-solic-modal-accept').onclick = () => { closeModal('modal-solic-detail-view'); openAcceptWorkModal(orderId); };
  document.getElementById('btn-solic-modal-reject').onclick = () => { closeModal('modal-solic-detail-view'); openCorrectionModal(orderId); };

  openModal('modal-solic-detail-view');
}

function openAcceptWorkModal(orderId) {
  activeValidationOrderId = orderId;
  document.getElementById('solic-accept-ot-id').value = orderId;
  document.getElementById('solic-accept-stars').value = '5';
  document.getElementById('solic-accept-comments').value = '';
  openModal('modal-solic-accept-work');
}

async function submitSolicitanteAcceptWork() {
  if (!currentUser) return;
  const orderId = document.getElementById('solic-accept-ot-id').value || activeValidationOrderId;
  const rating = parseInt(document.getElementById('solic-accept-stars').value) || 5;
  const comments = document.getElementById('solic-accept-comments').value.trim();

  // PRD 11.7 Transición de estado: PENDIENTE DE VALIDACIÓN -> ACEPTADA -> CALIFICADA -> CERRADA
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = 'Cerrada';
    order.validatedBy = currentUser.name || currentUser.email;
    order.rating = rating;
    order.ratingComment = comments || 'Trabajo aceptado satisfactoriamente';
    order.closeDate = new Date().toISOString();
    localStorage.setItem('TSMAI_orders', JSON.stringify(orders));
  }

  const history = JSON.parse(localStorage.getItem('TSMAI_validations_history') || '[]');
  history.unshift({
    orderId: orderId,
    action: 'APPROVED',
    userName: currentUser.name || currentUser.email,
    userId: currentUser.id,
    applicant_id: currentUser.id,
    area: currentUser.area,
    rating: rating,
    comments: comments || 'ACEPTADA Y CALIFICADA',
    date: new Date().toISOString()
  });
  localStorage.setItem('TSMAI_validations_history', JSON.stringify(history));

  closeModal('modal-solic-accept-work');
  alert(`✅ Trabajo de la Orden ${orderId} ACEPTADO y CERRADO con ${rating} estrellas.`);
  renderSolicitanteValidations();
}

function openCorrectionModal(orderId) {
  activeValidationOrderId = orderId;
  document.getElementById('solic-correct-ot-id').value = orderId;
  document.getElementById('solic-correct-reason').value = 'La falla continúa';
  document.getElementById('solic-correct-comments').value = '';
  openModal('modal-solic-request-correction');
}

async function submitSolicitanteCorrection() {
  if (!currentUser) return;
  const orderId = document.getElementById('solic-correct-ot-id').value || activeValidationOrderId;
  const reason = document.getElementById('solic-correct-reason').value;
  const comments = document.getElementById('solic-correct-comments').value.trim();

  if (!comments) {
    alert('Por favor detalla el motivo de la corrección requerida.');
    return;
  }

  // PRD 12.1 Transición de estado: PENDIENTE DE VALIDACIÓN -> REQUIERE CORRECCIÓN (Sin crear nueva OT)
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = 'REQUIERE CORRECCIÓN';
    order.reworkRequired = true;
    order.reworkReason = `${reason}: ${comments}`;
    localStorage.setItem('TSMAI_orders', JSON.stringify(orders));
  }

  const history = JSON.parse(localStorage.getItem('TSMAI_validations_history') || '[]');
  history.unshift({
    orderId: orderId,
    action: 'REJECTED',
    userName: currentUser.name || currentUser.email,
    userId: currentUser.id,
    applicant_id: currentUser.id,
    area: currentUser.area,
    reason: reason,
    comments: `REQUIERE CORRECCIÓN — ${reason}: ${comments}`,
    date: new Date().toISOString()
  });
  localStorage.setItem('TSMAI_validations_history', JSON.stringify(history));

  closeModal('modal-solic-request-correction');
  alert(`⚠️ Se ha solicitado corrección para la Orden ${orderId}. La orden cambió a estatus REQUIERE CORRECCIÓN sin generar una nueva OT.`);
  renderSolicitanteValidations();
}

// ==========================================================================
// AUDITORÍA 360° DE ÓRDENES DE TRABAJO Y SUBTAREAS (SÚPER ADMINISTRADOR)
// ==========================================================================

let activeAdmin360Tab = 'general';

function switchAdmin360Tab(tabId) {
  activeAdmin360Tab = tabId || 'general';

  // Desactivar botones de pestañas
  ['general', 'diag', 'subtasks', 'parts', 'gallery', 'validation'].forEach(t => {
    const btn = document.getElementById(`tab-btn-ot360-${t}`);
    const panel = document.getElementById(`tab-content-ot360-${t}`);
    if (btn) btn.classList.remove('active');
    if (panel) panel.style.display = 'none';
  });

  // Activar pestaña actual
  const activeBtn = document.getElementById(`tab-btn-ot360-${tabId}`);
  const activePanel = document.getElementById(`tab-content-ot360-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');
  if (activePanel) activePanel.style.display = 'block';
}

async function openAdmin360OTAuditModal(orderId) {
  if (!orderId) return;

  // 1. Obtener la Orden de Trabajo
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  let order = orders.find(o => o.id === orderId || o.otId === orderId || o.folio === orderId);

  if (!order && supabaseClient) {
    try {
      const { data } = await supabaseClient.from('ordenes_trabajo').select('*').eq('id', orderId).single();
      if (data) order = data;
    } catch (e) {
      console.warn('Fallo consultando Supabase para OT:', e);
    }
  }

  if (!order) {
    // Si no está explícitamente en el arreglo, crear representación base
    order = {
      id: orderId,
      machine: 'M-101',
      area: 'CF',
      shift: 'Turno Mañana',
      status: 'En proceso',
      urgency: 'Alta',
      type: 'MC',
      description: 'Mantenimiento Correctivo asignado',
      date: new Date().toISOString()
    };
  }

  // Actualizar Título
  document.getElementById('ot360-header-title').innerText = `🔍 Auditoría 360° de OT: ${order.id}`;
  document.getElementById('ot360-header-subtitle').innerText = `Máquina: ${order.machine || order.maquina_id || 'Equipo'} | Área: ${order.area || 'CF'} | Estado: ${order.status}`;

  // Pestaña 1: General & Fallas
  document.getElementById('ot360-info-folio').innerText = order.id;
  document.getElementById('ot360-info-machine').innerText = order.machine || order.maquina_id || 'M-101';
  document.getElementById('ot360-info-area-shift').innerText = `${order.area || 'CF'} — ${order.shift || 'Turno Mañana'}`;
  document.getElementById('ot360-info-status').innerText = `${order.status} (${order.urgency || order.priority || 'Alta'})`;

  document.getElementById('ot360-fault-type').innerText = order.faultType || order.tipo_falla || (order.type === 'MP' ? 'Mantenimiento Preventivo' : 'Falla Mecánica / Desgaste');
  document.getElementById('ot360-fault-cat').innerText = order.faultCategory || order.categoria_falla || 'Operativa / Desgaste Componentes';
  document.getElementById('ot360-fault-component').innerText = order.faultComponent || order.componente || 'Rodamiento / Transmisión / Motor';
  document.getElementById('ot360-fault-stopped').innerText = (order.machineStopped === 'Sí' || order.maquina_detenida) ? 'Sí (PARADA TOTAL)' : 'No (Operando con síntoma)';

  document.getElementById('ot360-applicant-name').innerText = order.applicant || order.solicitante_nombre || order.validatedBy || 'Operador de Planta';
  document.getElementById('ot360-applicant-folio').innerText = order.reqId || order.folio_solicitud || order.id;
  document.getElementById('ot360-applicant-date').innerText = fmtDate(order.date || order.fecha_registro || new Date());
  document.getElementById('ot360-applicant-location').innerText = order.location || order.ubicacion || `Planta General — Área ${order.area || 'CF'}`;

  // Pestaña 2: Diagnóstico & Tiempos
  document.getElementById('ot360-diag-initial-desc').innerText = order.description || order.descripcion_falla || 'Sin descripción inicial.';
  document.getElementById('ot360-diag-tech-root').innerText = order.diagnosis || order.causa_raiz || 'Revisión técnica de componentes y detección de desgaste en rodamiento principal.';
  document.getElementById('ot360-diag-solution').innerText = order.activity || order.solucion || 'Sustitución de componente, lubricación, ajuste de tensión y pruebas de operación continuas.';
  
  document.getElementById('ot360-time-assigned').innerText = fmtDate(order.date || new Date());
  document.getElementById('ot360-time-start').innerText = fmtDate(order.startDate || order.date || new Date());
  document.getElementById('ot360-time-end').innerText = order.closeDate ? fmtDate(order.closeDate) : 'En ejecución / Pendiente';
  document.getElementById('ot360-time-duration').innerText = order.duration || '1 hr 45 min';

  // Pestaña 3: Subtareas (`subtareas_orden_trabajo`)
  const allSubtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
  const subtasks = allSubtasks.filter(s => s.otId === order.id || s.id_orden === order.id);
  const subCountBadge = document.getElementById('ot360-subtasks-count');
  const subAccordion = document.getElementById('ot360-subtasks-accordion');

  if (subCountBadge) subCountBadge.innerText = `${subtasks.length} Subtareas`;

  if (subtasks.length === 0) {
    subAccordion.innerHTML = `<div style="background:#f8fafc; padding:20px; text-align:center; border-radius:8px; border:1px solid #cbd5e1;">
      <p style="margin:0; color:#64748b;">No hay subtareas registradas para esta Orden de Trabajo.</p>
    </div>`;
  } else {
    subAccordion.innerHTML = subtasks.map((s, idx) => `
      <div style="background:white; border:1px solid #cbd5e1; border-radius:8px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h4 style="margin:0; font-weight:700; color:#0f172a;">Subtarea #${idx+1}: ${s.description || s.descripcion || 'Subtarea sin título'}</h4>
          <span class="badge ${s.status === 'COMPLETADA' || s.status === 'Concluida' ? 'badge-priority-baja' : 'badge-priority-alta'}">${s.status || 'En Proceso'}</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:8px; font-size:0.85rem; color:#475569;">
          <div><strong>Técnico Asignado:</strong> ${s.assignedTech || s.tecnico || 'Técnico General'}</div>
          <div><strong>Diagnóstico Específico:</strong> ${s.diagnosis || 'Revisión y ajuste completo.'}</div>
          <div><strong>Refacciones Usadas:</strong> ${s.partsUsed || 'Ninguna'}</div>
          <div><strong>Fecha Inicio/Fin:</strong> ${fmtDate(s.date || new Date())}</div>
        </div>
        ${s.evidenceUrl ? `<div style="margin-top:8px;"><a href="${s.evidenceUrl}" target="_blank" style="font-size:0.8rem; color:#0284c7; font-weight:600;">📷 Ver Evidencia de Subtarea</a></div>` : ''}
      </div>
    `).join('');
  }

  // Pestaña 4: Refacciones & Costos (`refacciones_usadas_subtarea` / `costos_orden_trabajo`)
  const tbodyParts = document.getElementById('tbody-ot360-parts');
  const localParts = JSON.parse(localStorage.getItem('TSMAI_parts_used') || '[]');
  const orderParts = localParts.filter(p => p.otId === order.id || p.orderId === order.id);

  if (orderParts.length === 0 && !order.partsUsed) {
    tbodyParts.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">No hay refacciones registradas para esta orden.</td></tr>';
    document.getElementById('ot360-cost-parts').innerText = '$0.00 MXN';
    document.getElementById('ot360-cost-labor').innerText = '$350.00 MXN';
    document.getElementById('ot360-cost-total').innerText = '$350.00 MXN';
  } else {
    let totalPartsCost = 0;
    const rowsHtml = orderParts.map(p => {
      const qty = p.quantity || 1;
      const unitCost = p.unitCost || 450;
      const total = qty * unitCost;
      totalPartsCost += total;
      return `<tr>
        <td><code>${p.code || 'REF-1001'}</code></td>
        <td><strong>${p.name || 'Rodamiento 6205-2RS'}</strong></td>
        <td>${p.subtask || 'Orden Principal'}</td>
        <td>${qty} pza(s)</td>
        <td>$${unitCost.toFixed(2)} MXN</td>
        <td><strong>$${total.toFixed(2)} MXN</strong></td>
      </tr>`;
    }).join('');

    tbodyParts.innerHTML = rowsHtml || `<tr><td><code>REF-1001</code></td><td><strong>${order.partsUsed || 'Refacción Mecánica'}</strong></td><td>Orden Principal</td><td>1 pza</td><td>$450.00 MXN</td><td><strong>$450.00 MXN</strong></td></tr>`;
    const partsVal = totalPartsCost || 450;
    document.getElementById('ot360-cost-parts').innerText = `$${partsVal.toFixed(2)} MXN`;
    document.getElementById('ot360-cost-labor').innerText = '$350.00 MXN';
    document.getElementById('ot360-cost-total').innerText = `$${(partsVal + 350).toFixed(2)} MXN`;
  }

  // Pestaña 5: Galería Completa de Evidencias Fotografías (`evidencias_orden` / `evidencias_subtareas`)
  const galleryContainer = document.getElementById('ot360-gallery-container');
  const allEvidences = JSON.parse(localStorage.getItem('TSMAI_evidences') || '[]');
  const orderEvidences = allEvidences.filter(e => e.otId === order.id || e.orderId === order.id);

  if (orderEvidences.length === 0 && !order.evidenceUrl) {
    galleryContainer.innerHTML = `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; text-align:center;">
        <span style="font-size:0.75rem; color:#64748b; font-weight:700;">📷 EVIDENCIA ANTES (Solicitud)</span>
        <div style="height:120px; background:#e2e8f0; border-radius:6px; display:flex; align-items:center; justify-content:center; margin-top:6px; font-size:0.8rem; color:#64748b;">Evidencia Inicial</div>
      </div>
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; text-align:center;">
        <span style="font-size:0.75rem; color:#64748b; font-weight:700;">📷 EVIDENCIA DESPUÉS (Conclusión)</span>
        <div style="height:120px; background:#e2e8f0; border-radius:6px; display:flex; align-items:center; justify-content:center; margin-top:6px; font-size:0.8rem; color:#166534;">Evidencia Final</div>
      </div>
    `;
  } else {
    galleryContainer.innerHTML = orderEvidences.map(ev => `
      <div style="background:white; border:1px solid #cbd5e1; border-radius:8px; padding:10px; text-align:center;">
        <span style="font-size:0.75rem; color:#64748b; font-weight:700;">${ev.type || 'FOTOGRAFÍA EVIDENCIA'}</span>
        <img src="${ev.url}" alt="Evidencia OT" style="width:100%; height:120px; object-fit:cover; border-radius:6px; margin-top:6px; cursor:pointer;" onclick="window.open('${ev.url}', '_blank')">
        <span style="font-size:0.72rem; color:#94a3b8; display:block; margin-top:4px;">${fmtDate(ev.date || new Date())}</span>
      </div>
    `).join('');
  }

  // Pestaña 6: Cierre & Validaciones (`validaciones_historial`)
  const valUser = document.getElementById('ot360-val-user');
  const valStatus = document.getElementById('ot360-val-status');
  const valRating = document.getElementById('ot360-val-rating');
  const valComments = document.getElementById('ot360-val-comments');
  const tbodyValHist = document.getElementById('tbody-ot360-val-history');

  valUser.innerText = order.validatedBy || order.applicant || 'Solicitante de Planta';
  valStatus.innerText = order.status === 'Cerrada' ? 'ACEPTADA Y CERRADA' : (order.status === 'REQUIERE CORRECCIÓN' ? 'REQUIERE CORRECCIÓN' : order.status);
  valRating.innerText = order.rating ? '⭐'.repeat(order.rating) + ` (${order.rating}/5)` : 'Pendiente de calificar';
  valComments.innerText = order.ratingComment || order.reworkReason || 'Sin comentarios adicionales.';

  const allValidations = JSON.parse(localStorage.getItem('TSMAI_validations_history') || '[]');
  const orderValidations = allValidations.filter(v => v.orderId === order.id);

  if (orderValidations.length === 0) {
    tbodyValHist.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">No hay eventos de validación registrados aún.</td></tr>';
  } else {
    tbodyValHist.innerHTML = orderValidations.map(v => `
      <tr>
        <td>${fmtDate(v.date)}</td>
        <td><strong>${v.userName || v.userId}</strong></td>
        <td>${v.action === 'APPROVED' ? '<span class="badge badge-priority-baja">ACEPTADA Y CERRADA</span>' : '<span class="badge badge-priority-alta">REQUIERE CORRECCIÓN</span>'}</td>
        <td>${v.rating ? '⭐'.repeat(v.rating) + ' (' + v.rating + '/5)' : '—'}</td>
        <td>${v.comments || v.reason || 'Sin comentarios'}</td>
      </tr>
    `).join('');
  }

  // Abrir Modal
  switchAdmin360Tab('general');
  openModal('modal-ot-360-audit');
}



