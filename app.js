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
        otUUID: s.id_orden_trabajo,
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
        id_orden_trabajo: sub.otUUID,
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
        otUUID: e.id_orden_trabajo,
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
        id_orden_trabajo: ev.otUUID,
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
        otUUID: m.id_orden_trabajo,
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
        id_orden_trabajo: mov.otUUID,
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
      const existingLocalMachines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
      const localMachines = dbMachines.map(m => {
        const localM = existingLocalMachines.find(lm => lm.id === m.equipo_towell);
        return {
          id: m.equipo_towell,
          name: localM ? localM.name : m.equipo_towell,
          area: m.area,
          clave: m.clave,
          proceso: m.proceso,
          tipo_equipo: m.tipo_equipo,
          status: m.activo ? 'Operativa' : 'Parada',
          failures: localM ? localM.failures : 0,
          cost: localM ? localM.cost : 0,
          mtbf: localM ? localM.mtbf : 120,
          mttr: localM ? localM.mttr : 2.5
        };
      });
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
      localStorage.setItem('TSMAI_users', JSON.stringify(dbUsers));
      const localTechs = dbUsers.filter(u => u.rol === 'MANTENIMIENTO').map(t => ({
        id: t.cve_tecnico || t.id_usuario,
        uuid: t.id_usuario,
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
      const existingLocalParts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
      const localParts = dbParts.map(p => {
        const localP = existingLocalParts.find(lp => lp.id === p.codigo_articulo);
        return {
          id: p.codigo_articulo,
          name: p.nombre_articulo,
          category: p.familia,
          stock: localP ? localP.stock : 50,
          minStock: localP ? localP.minStock : 5,
          cost: localP ? localP.cost : 100,
          activo: p.activo !== false
        };
      });
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

    // 5. Sync Subtasks
    const { data: dbSubtasks, error: sErr } = await supabaseClient.from('subtareas_orden_trabajo').select('*');
    if (sErr) throw sErr;
    if (dbSubtasks && dbSubtasks.length > 0) {
      const localSubtasks = dbSubtasks.map(s => ({
        id: s.id_subtarea,
        otId: s.folio_ot,
        otUUID: s.id_orden_trabajo,
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
      const localSubtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
      if (localSubtasks.length > 0) {
        const insertData = localSubtasks.map(s => ({
          id_subtarea: s.id,
          folio_ot: s.otId,
          id_orden_trabajo: s.otUUID,
          numero_subtarea: s.number,
          titulo_subtarea: s.title || 'Apoyo',
          area_requerida: s.area,
          descripcion_subtarea: s.description,
          motivo_solicitud: s.reason,
          fecha_deseada: s.dueDate,
          prioridad: s.priority,
          requiere_paro: s.requiresParo,
          requiere_refaccion: s.requiresPart,
          estatus_subtarea: s.status,
          solicitado_por: s.requestedBy,
          asignado_por: s.assignedBy,
          responsable_asignado: s.assignedTech,
          fecha_solicitud: s.requestDate,
          fecha_asignacion: s.assignDate,
          fecha_inicio: s.startDate,
          fecha_cierre: s.closeDate,
          observaciones: s.observations,
          activo: s.activo !== undefined ? s.activo : true
        }));
        await supabaseClient.from('subtareas_orden_trabajo').insert(insertData);
      }
    }

    // 5.5. Sync Subtask Evidences
    const { data: dbEvidences, error: evErr } = await supabaseClient.from('evidencias_subtareas').select('*');
    if (evErr) throw evErr;
    if (dbEvidences && dbEvidences.length > 0) {
      const localEvidences = dbEvidences.map(e => ({
        id: e.id_evidencia,
        subtaskId: e.id_subtarea,
        otUUID: e.id_orden_trabajo,
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
      const localEvidences = JSON.parse(localStorage.getItem('TSMAI_subtask_evidences') || '[]');
      if (localEvidences.length > 0) {
        const insertData = localEvidences.map(e => ({
          id_evidencia: e.id,
          id_subtarea: e.subtaskId,
          id_orden_trabajo: e.otUUID,
          tipo_archivo: e.fileType,
          origen_evidencia: e.origin,
          nombre_archivo: e.fileName,
          url_archivo: e.fileUrl,
          storage_bucket: e.bucket,
          storage_path: e.path,
          descripcion: e.description,
          subido_por: e.uploadedBy,
          fecha_subida: e.uploadDate,
          activo: e.active !== undefined ? e.active : true
        }));
        await supabaseClient.from('evidencias_subtareas').insert(insertData);
      }
    }

    // 6. Sync Movements
    const { data: dbMovements, error: mvErr } = await supabaseClient.from('bitacora_subtareas').select('*');
    if (mvErr) throw mvErr;
    if (dbMovements && dbMovements.length > 0) {
      const localMovements = dbMovements.map(m => ({
        id: m.id_movimiento,
        otUUID: m.id_orden_trabajo,
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
      const localMovements = JSON.parse(localStorage.getItem('TSMAI_movements') || '[]');
      if (localMovements.length > 0) {
        const insertData = localMovements.map(m => ({
          id_movimiento: m.id,
          id_orden_trabajo: m.otUUID,
          id_subtarea: m.subtaskId,
          tipo_movimiento: m.type,
          estado_anterior: m.oldState,
          estado_nuevo: m.newState,
          realizado_por: m.by,
          comentario: m.comment,
          fecha_movimiento: m.date
        }));
        await supabaseClient.from('bitacora_subtareas').insert(insertData);
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
// Alternar visualización del submenú de base de datos
function toggleDatabaseSubmenu(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const submenu = document.getElementById('admin-database-submenu');
  const arrow = document.querySelector('#menu-admin-database-group .arrow');
  if (submenu) {
    const isHidden = submenu.style.display === 'none' || submenu.style.display === '';
    submenu.style.display = isHidden ? 'block' : 'none';
    if (arrow) arrow.innerText = isHidden ? '▲' : '▼';
  }
}

function toggleOperationalSubmenu(event) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  const submenu = document.getElementById('admin-operational-submenu');
  const arrow = document.querySelector('#menu-admin-operational-group .arrow-op');
  if (submenu) {
    const isHidden = submenu.style.display === 'none' || submenu.style.display === '';
    submenu.style.display = isHidden ? 'block' : 'none';
    if (arrow) arrow.innerText = isHidden ? '▲' : '▼';
  }
}

function switchAdminPanel(panelId) {
  activeAdminPanel = panelId;
  
  // Cambiar pestaña activa de la barra lateral
  document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const dbGroup = document.getElementById('menu-admin-database-group');
  if (dbGroup) dbGroup.classList.remove('active');

  const activeMenuItem = document.getElementById(`menu-admin-${panelId}`);
  if (activeMenuItem) activeMenuItem.classList.add('active');

  // Si pertenece al grupo de base de datos, asegurar que esté expandido
  const dbPanels = ['machines', 'parts', 'inventory', 'suppliers', 'tecnicos', 'empleados',
    'departamentos', 'turnos', 'servicios', 'tiposfalla', 'categfalla', 'criticidad',
    'estatusot', 'users', 'logs'];
  if (dbPanels.includes(panelId)) {
    if (dbGroup) dbGroup.classList.add('active');
    const submenu = document.getElementById('admin-database-submenu');
    const arrow = document.querySelector('#menu-admin-database-group .arrow');
    if (submenu) {
      submenu.style.display = 'block';
      if (arrow) arrow.innerText = '▲';
    }
  }

  // Si pertenece al grupo operacional, expandir ese submenu
  const opPanels = ['alertas', 'fallas', 'costosot', 'evidencias', 'refmaquina', 'histprecios', 'cierres', 'respchk'];
  const opGroup = document.getElementById('menu-admin-operational-group');
  if (opPanels.includes(panelId)) {
    if (opGroup) opGroup.classList.add('active');
    const opSubmenu = document.getElementById('admin-operational-submenu');
    const opArrow = document.querySelector('#menu-admin-operational-group .arrow-op');
    if (opSubmenu) {
      opSubmenu.style.display = 'block';
      if (opArrow) opArrow.innerText = '▲';
    }
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
    estatusot: '🏷️ Estatus de Órdenes de Trabajo',
    users: '👥 Control de Usuarios y Permisos',
    forms: '🛠️ Formularios y Checklists Dinámicos',
    excel: '📥 Importador de Historiales de Excel',
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
    alertas: '🔔 Alertas del Sistema',
    fallas: '💥 Fallas por Máquina',
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
    renderAdminCalendar();
  } else if (panelId === 'logs') {
    renderAdminLogsTable();
  } else if (panelId === 'machines') {
    renderAdminMachinesTable();
  } else if (panelId === 'parts') {
    renderAdminPartsTable();
  } else if (panelId === 'inventory') {
    renderAdminInventoryTable();
  } else if (panelId === 'suppliers') {
    renderAdminSuppliersTable();
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
  } else if (panelId === 'laborcosts') {
    renderAdminLaborCosts();
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
  } else if (panelId === 'alertas') {
    renderAdminAlertas();
  } else if (panelId === 'fallas') {
    renderAdminFallas();
  } else if (panelId === 'costosot') {
    renderAdminCostosOT();
  } else if (panelId === 'evidencias') {
    renderAdminEvidencias();
  } else if (panelId === 'refmaquina') {
    renderAdminRefMaquina();
  } else if (panelId === 'histprecios') {
    renderAdminHistPrecios();
  } else if (panelId === 'cierres') {
    renderAdminCierres();
  } else if (panelId === 'respchk') {
    renderAdminRespChk();
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

// ── INVENTARIO ───────────────────────────────────────────────────────────────
async function renderAdminInventoryTable() {
  const tbody = document.getElementById('tbody-inventory');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(7, 'Cargando inventario…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(7, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('inventario_refacciones').select('*, cat_refacciones(nombre_articulo), cat_proveedores(nombre_proveedor)').order('fecha_alta', { ascending: false }).limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(7, 'No hay registros de inventario.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td>${r.cat_refacciones?.nombre_articulo || r.codigo_articulo}</td>
      <td>${r.cat_proveedores?.nombre_proveedor || '—'}</td>
      <td>${parseFloat(r.stock_actual || 0).toFixed(2)}</td>
      <td>${parseFloat(r.stock_minimo || 0).toFixed(2)} ${parseFloat(r.stock_actual) < parseFloat(r.stock_minimo) ? '⚠️' : ''}</td>
      <td>${r.ubicacion || '—'}</td>
      <td>${fmtCurrency(r.costo_unitario, r.moneda)}</td>
      <td>${badgeActive(r.activo)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(7, `❌ Error: ${err.message}`); }
}
function openInventoryModal() { alert('Modal de nuevo registro de inventario — próximamente.'); }

// ── PROVEEDORES ──────────────────────────────────────────────────────────────
async function renderAdminSuppliersTable() {
  const tbody = document.getElementById('tbody-suppliers');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(7, 'Cargando proveedores…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(7, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('cat_proveedores').select('*').order('nombre_proveedor').limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(7, 'No hay proveedores registrados.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code>${r.codigo_proveedor}</code></td>
      <td><strong>${r.nombre_proveedor}</strong></td>
      <td>${r.contacto || '—'}</td>
      <td>${r.telefono || '—'}</td>
      <td>${[r.ciudad, r.estado, r.pais].filter(Boolean).join(', ') || '—'}</td>
      <td>${r.tipo_proveedor || '—'}</td>
      <td>${badgeActive(r.activo)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(7, `❌ Error: ${err.message}`); }
}
function openSupplierModal() { alert('Modal de nuevo proveedor — próximamente.'); }

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
function openChecklistModal() { alert('Modal de nueva pregunta de checklist — próximamente.'); }

// ── COSTOS MANO DE OBRA ──────────────────────────────────────────────────────
async function renderAdminLaborCosts() {
  const tbody = document.getElementById('tbody-laborcosts');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(7, 'Cargando tarifas de mano de obra…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(7, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('costos_mano_obra').select('*').order('cve_tecnico').limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(7, 'No hay tarifas de mano de obra registradas.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td>${r.nombre_tecnico || '—'}</td>
      <td><code>${r.cve_tecnico}</code></td>
      <td><strong>${fmtCurrency(r.costo_hora, r.moneda)}</strong></td>
      <td>${r.moneda}</td>
      <td>${fmtDate(r.fecha_inicio_vigencia)}</td>
      <td>${fmtDate(r.fecha_fin_vigencia)}</td>
      <td>${badgeActive(r.activo)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(7, `❌ Error: ${err.message}`); }
}
function openLaborCostModal() { alert('Modal de nueva tarifa de mano de obra — próximamente.'); }

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
  tbody.innerHTML = emptyRow(6, 'Cargando criticidad…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(6, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('cat_criticidad_maquina').select('*').order('maquina_id').limit(200);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(6, 'No hay registros de criticidad.'); return; }
    const nivelColor = { A: '#ef4444', B: '#f59e0b', C: '#22c55e' };
    tbody.innerHTML = data.map(r => {
      const c = nivelColor[r.nivel_criticidad] || '#94a3b8';
      return `<tr>
        <td>${r.maquina_id}</td>
        <td><span style="padding:3px 10px;border-radius:8px;font-weight:700;background:${c};color:#fff;">${r.nivel_criticidad}</span></td>
        <td>${r.impacto_produccion || '—'}</td>
        <td>${r.impacto_calidad || '—'}</td>
        <td>${r.impacto_seguridad || '—'}</td>
        <td>${badgeActive(r.activo)}</td>
      </tr>`;
    }).join('');
  } catch (err) { tbody.innerHTML = emptyRow(6, `❌ Error: ${err.message}`); }
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

// ── REFACCIONES POR MÁQUINA ───────────────────────────────────────────────────
async function renderAdminRefMaquina() {
  const tbody = document.getElementById('tbody-refmaquina');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(7, 'Cargando consumo de refacciones…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(7, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('refacciones_por_maquina').select('*').order('fecha', { ascending: false }).limit(300);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(7, 'No hay consumo de refacciones registrado.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td>${fmtDate(r.fecha)}</td>
      <td>${r.maquina_id}</td>
      <td>${r.nombre_articulo || r.codigo_articulo}</td>
      <td>${parseFloat(r.cantidad_estandar || 0).toFixed(2)}</td>
      <td>${fmtCurrency(r.precio_costo_unitario)}</td>
      <td><strong>${fmtCurrency(r.importe_costo_calculado)}</strong></td>
      <td>${r.origen || '—'}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(7, `❌ Error: ${err.message}`); }
}

// ── HISTORIAL DE PRECIOS ──────────────────────────────────────────────────────
async function renderAdminHistPrecios() {
  const tbody = document.getElementById('tbody-histprecios');
  if (!tbody) return;
  tbody.innerHTML = emptyRow(5, 'Cargando historial de precios…');
  if (!supabaseClient) { tbody.innerHTML = emptyRow(5, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('historico_precios_refacciones').select('*, cat_refacciones(nombre_articulo)').order('fecha', { ascending: false }).limit(300);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(5, 'No hay historial de precios.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td>${r.cat_refacciones?.nombre_articulo || r.codigo_articulo}</td>
      <td>${fmtDate(r.fecha)}</td>
      <td><strong>${fmtCurrency(r.precio_costo_unitario, r.moneda)}</strong></td>
      <td>${r.moneda}</td>
      <td>${r.origen || '—'}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(5, `❌ Error: ${err.message}`); }
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
  if (!supabaseClient) { tbody.innerHTML = emptyRow(6, '⚠️ Sin conexión a Supabase.'); return; }
  try {
    const { data, error } = await supabaseClient.from('respuestas_checklist_orden').select('*').order('fecha_respuesta', { ascending: false }).limit(300);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = emptyRow(6, 'No hay respuestas de checklist registradas.'); return; }
    tbody.innerHTML = data.map(r => `<tr>
      <td><code style="font-size:0.7rem;">${r.id_orden}</code></td>
      <td><code style="font-size:0.7rem;">${r.id_checklist}</code></td>
      <td>${r.respuesta || '—'}</td>
      <td>${r.comentario || '—'}</td>
      <td>${r.usuario_responde || '—'}</td>
      <td>${fmtTs(r.fecha_respuesta)}</td>
    </tr>`).join('');
  } catch (err) { tbody.innerHTML = emptyRow(6, `❌ Error: ${err.message}`); }
}

// ============================================================================
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
  if (!tbody) return;

  let html = '';
  machines.forEach(m => {
    const isOperative = m.status === 'Operativa';
    const statusColor = isOperative ? 'var(--color-preventive)' : 'var(--color-critical)';
    html += `
      <tr style="opacity: ${isOperative ? 1 : 0.65}">
        <td><strong>${m.id}</strong></td>
        <td>${m.name || m.id}</td>
        <td>${m.area}</td>
        <td>${m.mtbf || 0} hrs</td>
        <td>${m.mttr || 0} hrs</td>
        <td>${m.failures || 0}</td>
        <td>$${m.cost || 0} USD</td>
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

function renderAdminPartsTable() {
  const parts = JSON.parse(localStorage.getItem('TSMAI_parts') || '[]');
  const tbody = document.getElementById('table-admin-parts-body');
  if (!tbody) return;

  let html = '';
  parts.forEach(p => {
    const isActive = p.activo !== false;
    const lowStock = p.stock <= p.minStock;
    const stockBadge = !isActive ? '<span class="badge badge-priority-alta">Inactivo</span>' : (lowStock ? '<span class="badge badge-priority-crítica">Reordenar / Bajo</span>' : '<span class="badge badge-status-ejecutada">Óptimo</span>');
    
    html += `
      <tr style="opacity: ${isActive ? 1 : 0.65}">
        <td><strong>${p.id}</strong></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>$${p.cost} USD</td>
        <td style="font-weight: 700; color: ${isActive && lowStock ? 'var(--color-critical)' : 'inherit'};">${p.stock}</td>
        <td>${p.minStock}</td>
        <td>${stockBadge}</td>
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
          <button class="btn-table-action" style="color: ${u.activo ? 'var(--color-critical)' : 'var(--color-preventive)'}; border-color: ${u.activo ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}" onclick="deleteAdminUser('${u.id_usuario}')">
            ${u.activo ? '🚫 Desactivar' : '✅ Activar'}
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// --- CRUD USUARIOS (ADMIN) ---
function toggleAdminUserRoleFields() {
  const role = document.getElementById('admin-user-role').value;
  const techGroup = document.getElementById('admin-user-tech-code-group');
  if (techGroup) {
    if (role === 'MANTENIMIENTO') {
      techGroup.style.display = 'block';
    } else {
      techGroup.style.display = 'none';
      document.getElementById('admin-user-tech-code').value = '';
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
    roleSelect.value = u.rol || 'SOLICITANTE_PUBLICO';
    codeInput.value = u.cve_empleado || '';
    document.getElementById('admin-user-tech-code').value = u.cve_tecnico || '';
    document.getElementById('admin-user-dept').value = u.departamento || '';
    document.getElementById('admin-user-shift').value = u.turno || '1';
    document.getElementById('admin-user-obs').value = u.observaciones || '';

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
    roleSelect.value = 'SOLICITANTE_PUBLICO';
    codeInput.value = '';
    document.getElementById('admin-user-tech-code').value = '';
    document.getElementById('admin-user-dept').value = '';
    document.getElementById('admin-user-shift').value = '1';
    document.getElementById('admin-user-obs').value = '';

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
  const cveEmpleado = document.getElementById('admin-user-emp-code').value.trim();
  const cveTecnico = document.getElementById('admin-user-tech-code').value.trim();
  const departamento = document.getElementById('admin-user-dept').value.trim();
  const shift = document.getElementById('admin-user-shift').value;
  const observaciones = document.getElementById('admin-user-obs').value.trim();

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
  if (rol === 'MANTENIMIENTO' && !cveTecnico) {
    alert('Por favor ingresa la clave de técnico.');
    return;
  }

  const userObj = {
    nombre_completo: nombre,
    correo: correo,
    telefono: telefono || null,
    rol: rol,
    cve_empleado: cveEmpleado || null,
    cve_tecnico: rol === 'MANTENIMIENTO' ? cveTecnico : null,
    departamento: departamento || null,
    turno: shift ? parseInt(shift) : null,
    puede_crear_solicitud: puedeCrear,
    puede_ver_ordenes_asignadas: puedeVerAsignadas,
    puede_ver_todas_ordenes: puedeVerTodas,
    puede_atender_orden: puedeAtender,
    puede_cerrar_orden: puedeCerrar,
    puede_validar_cierre: puedeValidar,
    puede_editar_catalogos: puedeEditar,
    puede_ver_dashboards: puedeVerDash,
    puede_configurar_sistema: puedeConfig,
    recibe_alertas: recibeAlertas,
    activo: activo,
    observaciones: observaciones || null,
    fecha_actualizacion: new Date().toISOString()
  };

  if (supabaseClient) {
    try {
      if (id) {
        const { error } = await supabaseClient
          .from('cat_usuarios_roles')
          .update(userObj)
          .eq('id_usuario', id);
        if (error) throw error;
        showToast('Usuario actualizado en base de datos.');
      } else {
        const { error } = await supabaseClient
          .from('cat_usuarios_roles')
          .insert([userObj]);
        if (error) throw error;
        showToast('Usuario creado en base de datos.');
      }
    } catch (err) {
      console.error('Error guardando usuario en Supabase:', err);
      alert('Error guardando en Supabase: ' + err.message);
      return;
    }
  } else {
    showToast('Guardado localmente (Offline).');
  }

  if (supabaseClient) {
    await syncDatabases();
  } else {
    let localUsers = JSON.parse(localStorage.getItem('TSMAI_users') || '[]');
    if (id) {
      localUsers = localUsers.map(u => u.id_usuario === id ? { ...u, ...userObj } : u);
    } else {
      userObj.id_usuario = crypto.randomUUID ? crypto.randomUUID() : 'local-' + Math.random().toString(36).substr(2, 9);
      userObj.fecha_alta = new Date().toISOString();
      localUsers.push(userObj);
    }
    localStorage.setItem('TSMAI_users', JSON.stringify(localUsers));
    
    // Si es técnico, actualizar catálogo de técnicos
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
  const active = document.getElementById('admin-machine-active').checked;

  if (!code) {
    alert('Por favor ingresa el código del equipo.');
    return;
  }
  if (!name) {
    alert('Por favor ingresa el nombre del equipo.');
    return;
  }

  const machineObj = {
    equipo_towell: code,
    clave: code.split('-')[1] || code,
    area: area,
    proceso: process || (area === 'PF' ? 'Tejido' : area === 'CF' ? 'Costura' : area === 'TF' ? 'Tintorería' : 'Planta'),
    tipo_equipo: type || 'Maquinaria',
    activo: active,
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
  const subtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
  
  // Filtrar OTs y Subtareas asignadas a este técnico
  const myOrders = orders.filter(o => o.assignedTech === currentUser.id);
  const mySubtasks = subtasks.filter(s => s.assignedTech === currentUser.id || s.assignedTech === currentUser.uuid);

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

// Tabla de OTs de Técnico
function renderTechOrdersTable() {
  if (!currentUser) return;
  const orders = JSON.parse(localStorage.getItem('TSMAI_orders') || '[]');
  const subtasks = JSON.parse(localStorage.getItem('TSMAI_subtasks') || '[]');
  const machines = JSON.parse(localStorage.getItem('TSMAI_machines') || '[]');
  const tbody = document.getElementById('table-tech-orders-body');

  const myOrders = orders.filter(o => o.assignedTech === currentUser.id);
  
  // Convertir subtareas activas del técnico a formato compatible con la tabla
  const mySubtasks = subtasks.filter(s => (s.assignedTech === currentUser.id || s.assignedTech === currentUser.uuid) && s.status !== 'Terminada' && s.status !== 'Cancelada');
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

    // Inicializar catálogo de refacciones en el selector
    populateTechSparePartsSelect();
    
    // Cargar refacciones que ya se hayan guardado en esta OT
    tempSelectedParts = order.usedParts ? [...order.usedParts] : [];
    renderTechSelectedPartsList();

    // Reset file upload
    document.getElementById('tech-file').value = '';
    document.getElementById('tech-file-preview').style.display = 'none';

    // Reset temporal subtasks
    tempSubtasksToCreate = [];
    renderTechTempSubtasksList();

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

  // Actualizar estado de la OT principal (Regla 3)
  if (tempSubtasksToCreate.length > 0) {
    orders[orderIndex].status = 'Requiere subtarea';
  } else {
    if (orders[orderIndex].status === 'Asignada') {
      orders[orderIndex].status = 'En proceso';
    }
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
            nombre_articulo: selected.partName || selected.name,
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

  // Populate technician dropdown in assignment modal
  const techSelect = document.getElementById('subtask-assign-tech');
  if (techSelect) {
    const techs = JSON.parse(localStorage.getItem('TSMAI_technicians') || '[]');
    let html = '<option value="">Selecciona técnico...</option>';
    techs.forEach(t => {
      html += `<option value="${t.id}">${t.name} (${t.specialty})</option>`;
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
