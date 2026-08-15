const DEFAULT_TECHNICIANS = [
  { id: 'T-01', name: 'Ing. Carlos Mendoza', email: 'carlos@tsm-ai.com', specialty: 'Eléctrica/Electrónica', avatar: '👨‍🔧' },
  { id: 'T-02', name: 'Ing. Sofía Ruiz', email: 'sofia@tsm-ai.com', specialty: 'Mecánica/Neumática', avatar: '👩‍🔧' },
  { id: 'T-03', name: 'Tec. Alejandro Gómez', email: 'alejandro@tsm-ai.com', specialty: 'Limpieza/Lubricación', avatar: '👨‍🔧' },
  { id: 'T-04', name: 'Tec. Laura Torres', email: 'laura@tsm-ai.com', specialty: 'Ajuste general', avatar: '👩‍🔧' }
];

const DEFAULT_MACHINES = [
  // PF Producción
  { id: 'M-101', name: 'Tejedora Circular Terrot', area: 'PF', failures: 8, cost: 1250, status: 'Operativa', mtbf: 120, mttr: 2.5 },
  { id: 'M-102', name: 'Hiladora Rieter G32', area: 'PF', failures: 12, cost: 2100, status: 'Parada', mtbf: 95, mttr: 4.1 },
  // CF Costura
  { id: 'M-201', name: 'Costuradora Juki DDL-8700', area: 'CF', failures: 4, cost: 350, status: 'Operativa', mtbf: 240, mttr: 1.2 },
  { id: 'M-202', name: 'Remalladora Brother', area: 'CF', failures: 5, cost: 420, status: 'Operativa', mtbf: 180, mttr: 1.8 },
  // TF Tintorería
  { id: 'M-301', name: 'Tintorera de Jet Thies', area: 'TF', failures: 15, cost: 3800, status: 'Operativa', mtbf: 72, mttr: 5.6 },
  { id: 'M-302', name: 'Secadora de Cinta Santex', area: 'TF', failures: 9, cost: 1850, status: 'Operativa', mtbf: 110, mttr: 3.2 },
  // AF Planta
  { id: 'M-401', name: 'Compresor Ingersoll Rand', area: 'AF', failures: 3, cost: 950, status: 'Operativa', mtbf: 480, mttr: 1.5 },
  { id: 'M-402', name: 'Subestación Eléctrica 500kVA', area: 'AF', failures: 1, cost: 1500, status: 'Operativa', mtbf: 1200, mttr: 8.0 }
];

const DEFAULT_PARTS = [
  { id: 'R-01', code: 'R-01', name: 'Rodamiento SKF 6204', category: 'Mecánica', stock: 15, minStock: 5, cost: 450 },
  { id: 'R-02', code: 'R-02', name: 'Banda Dentada Gates 1500', category: 'Transmisión', stock: 8, minStock: 3, cost: 680 },
  { id: 'R-03', code: 'R-03', name: 'Sensor Óptico Keyence PZ-V31', category: 'Electrónica', stock: 5, minStock: 2, cost: 2450 },
  { id: 'R-04', code: 'R-04', name: 'Aceite Sintético Mobil DTE (L)', category: 'Lubricación', stock: 35, minStock: 10, cost: 220 },
  { id: 'R-05', code: 'R-05', name: 'Resistencia Eléctrica Industrial 2000W', category: 'Eléctrica', stock: 4, minStock: 2, cost: 1850 },
  { id: 'R-06', code: 'R-06', name: 'Válvula Neumática Solenoide Festo', category: 'Neumática', stock: 6, minStock: 2, cost: 1980 },
  { id: 'R-07', code: 'R-07', name: 'Servomotor Panasonic 750W', category: 'Electrónica', stock: 2, minStock: 1, cost: 5800 },
  { id: 'R-08', code: 'R-08', name: 'Freno Doble de Laminilla AOA3S603', category: 'Mecánica', stock: 3, minStock: 1, cost: 1429.42 },
  { id: 'R-09', code: 'R-09', name: 'Relevador Finder 120V AC 8A 46.52', category: 'Eléctrica', stock: 12, minStock: 4, cost: 110.70 },
  { id: 'R-10', code: 'R-10', name: 'Aguja Groz-Beckert DBx1 (Caja x100)', category: 'Costura', stock: 20, minStock: 5, cost: 560 },
  { id: 'R-11', code: 'R-11', name: 'Guía de Trama para Telar', category: 'Tejido', stock: 10, minStock: 3, cost: 54.50 },
  { id: 'R-12', code: 'R-12', name: 'Malla de Gasa de Vuelta 39cm', category: 'Tejido', stock: 14, minStock: 4, cost: 75.00 },
  { id: 'R-13', code: 'R-13', name: 'Sello Mecánico Bomba Jet Thies', category: 'Tintorería', stock: 4, minStock: 2, cost: 3200 },
  { id: 'R-14', code: 'R-14', name: 'Filtro de Aire Compresor Ingersoll', category: 'Planta', stock: 8, minStock: 2, cost: 890 }
];

const DEFAULT_REFACCIONES_POR_MAQUINA = [
  { maquina_id: 'M-101', codigo_articulo: 'R-01', nombre_articulo: 'Rodamiento SKF 6204', precio_costo_unitario: 450, cantidad_estandar: 2 },
  { maquina_id: 'M-101', codigo_articulo: 'R-02', nombre_articulo: 'Banda Dentada Gates 1500', precio_costo_unitario: 680, cantidad_estandar: 1 },
  { maquina_id: 'M-101', codigo_articulo: 'R-07', nombre_articulo: 'Servomotor Panasonic 750W', precio_costo_unitario: 5800, cantidad_estandar: 1 },
  { maquina_id: 'M-201', codigo_articulo: 'R-10', nombre_articulo: 'Aguja Groz-Beckert DBx1 (Caja x100)', precio_costo_unitario: 560, cantidad_estandar: 1 },
  { maquina_id: 'M-201', codigo_articulo: 'R-04', nombre_articulo: 'Aceite Sintético Mobil DTE (L)', precio_costo_unitario: 220, cantidad_estandar: 1 },
  { maquina_id: 'M-301', codigo_articulo: 'R-13', nombre_articulo: 'Sello Mecánico Bomba Jet Thies', precio_costo_unitario: 3200, cantidad_estandar: 1 },
  { maquina_id: 'M-301', codigo_articulo: 'R-05', nombre_articulo: 'Resistencia Eléctrica Industrial 2000W', precio_costo_unitario: 1850, cantidad_estandar: 2 },
  { maquina_id: 'M-301', codigo_articulo: 'R-06', nombre_articulo: 'Válvula Neumática Solenoide Festo', precio_costo_unitario: 1980, cantidad_estandar: 1 },
  { maquina_id: 'M-401', codigo_articulo: 'R-14', nombre_articulo: 'Filtro de Aire Compresor Ingersoll', precio_costo_unitario: 890, cantidad_estandar: 1 },
  { maquina_id: 'M-401', codigo_articulo: 'R-04', nombre_articulo: 'Aceite Sintético Mobil DTE (L)', precio_costo_unitario: 220, cantidad_estandar: 5 }
];

const DEFAULT_REQUESTS = [
  {
    id: 'REQ-2026-0001',
    applicant: 'Héctor Saldaña',
    shift: 'Turno Mañana',
    area: 'TF',
    machine: 'M-301', // Tintorera de Jet Thies
    type: 'MC',
    description: 'La bomba de recirculación de colorante hace un ruido metálico excesivo y vibra demasiado. La temperatura está subiendo lento.',
    machineStopped: 'No',
    urgency: 'Alta',
    status: 'Solicitud recibida',
    date: '2026-06-03T08:30:00-06:00',
    evidence: 'bomba_ruido.jpg'
  },
  {
    id: 'REQ-2026-0002',
    applicant: 'Julia Méndez',
    shift: 'Turno Tarde',
    area: 'PF',
    machine: 'M-102', // Hiladora Rieter
    type: 'MC',
    description: 'Falla eléctrica general en la pantalla de control de la hiladora. No enciende y detiene el proceso.',
    machineStopped: 'Sí',
    urgency: 'Crítica',
    status: 'Solicitud recibida',
    date: '2026-06-03T19:15:00-06:00',
    evidence: 'pantalla_hiladora.jpg'
  },
  {
    id: 'REQ-2026-0003',
    applicant: 'Roberto Gómez',
    shift: 'Turno Nocturno',
    area: 'CF',
    machine: 'M-201', // Costuradora Juki
    type: 'MP',
    description: 'Mantenimiento preventivo correspondiente al ciclo de 500 horas. Ajuste de tensión y lubricación de poleas.',
    machineStopped: 'No',
    urgency: 'Baja',
    status: 'Solicitud recibida',
    date: '2026-06-03T20:45:00-06:00',
    evidence: null
  }
];

const DEFAULT_ORDERS = [
  {
    id: 'MC-TF-2026-0001',
    reqId: 'REQ-2026-0001',
    applicant: 'Héctor Saldaña',
    shift: 'Turno Mañana',
    area: 'TF',
    machine: 'M-301',
    type: 'MC',
    description: 'La bomba de recirculación de colorante hace un ruido metálico excesivo y vibra demasiado. La temperatura está subiendo lento.',
    machineStopped: 'No',
    urgency: 'Alta',
    status: 'Asignada',
    assignedTech: 'T-02', // Sofía Ruiz
    date: '2026-06-03T08:30:00-06:00',
    dueDate: '2026-06-04T12:00:00-06:00',
    evidence: 'bomba_ruido.jpg',
    historyLogs: [
      { date: '2026-06-03T08:30:00-06:00', status: 'Solicitud recibida', user: 'Héctor Saldaña', comment: 'Registro inicial' },
      { date: '2026-06-03T09:15:00-06:00', status: 'Asignada', user: 'Super Admin', comment: 'Asignada a Ing. Sofía Ruiz' }
    ]
  },
  {
    id: 'MC-PF-2026-0002',
    reqId: 'REQ-2026-0002',
    applicant: 'Julia Méndez',
    shift: 'Turno Tarde',
    area: 'PF',
    machine: 'M-102',
    type: 'MC',
    description: 'Falla eléctrica general en la pantalla de control de la hiladora. No enciende y detiene el proceso.',
    machineStopped: 'Sí',
    urgency: 'Crítica',
    status: 'En proceso',
    assignedTech: 'T-01', // Carlos Mendoza
    date: '2026-06-03T19:15:00-06:00',
    dueDate: '2026-06-03T23:59:00-06:00',
    evidence: 'pantalla_hiladora.jpg',
    historyLogs: [
      { date: '2026-06-03T19:15:00-06:00', status: 'Solicitud recibida', user: 'Julia Méndez', comment: 'Registro inicial' },
      { date: '2026-06-03T19:30:00-06:00', status: 'Asignada', user: 'Super Admin', comment: 'Asignada a Ing. Carlos Mendoza' },
      { date: '2026-06-03T19:45:00-06:00', status: 'En proceso', user: 'Ing. Carlos Mendoza', comment: 'Revisando cableado de alimentación y fusibles' }
    ]
  },
  {
    id: 'MP-CF-2026-0003',
    reqId: 'REQ-PREV-01',
    applicant: 'Super Admin',
    shift: 'Turno Mañana',
    area: 'CF',
    machine: 'M-202', // Remalladora Brother
    type: 'MP',
    description: 'Limpieza interna de pelusa, lubricación de aguja y revisión de banda de transmisión.',
    machineStopped: 'No',
    urgency: 'Media',
    status: 'En espera',
    assignedTech: 'T-03', // Alejandro Gómez
    date: '2026-06-02T10:00:00-06:00',
    dueDate: '2026-06-05T18:00:00-06:00',
    evidence: null,
    historyLogs: [
      { date: '2026-06-02T10:00:00-06:00', status: 'Asignada', user: 'Super Admin', comment: 'Generada por plan preventivo' },
      { date: '2026-06-02T14:20:00-06:00', status: 'En espera', user: 'Tec. Alejandro Gómez', comment: 'Esperando que producción libere la máquina' }
    ]
  },
  {
    id: 'MC-AF-2026-0004',
    reqId: 'REQ-PREV-02',
    applicant: 'Ing. Planta',
    shift: 'Turno Mañana',
    area: 'AF',
    machine: 'M-401',
    type: 'MC',
    description: 'Fuga de aceite en el cárter del compresor principal.',
    machineStopped: 'No',
    urgency: 'Crítica',
    status: 'Cerrada',
    assignedTech: 'T-02', // Sofía Ruiz
    date: '2026-06-01T09:00:00-06:00',
    dueDate: '2026-06-01T15:00:00-06:00',
    evidence: 'fuga_compresor.jpg',
    diagnosis: 'Empaque dañado por sobrecalentamiento térmico.',
    activity: 'Se reemplazó el empaque del cárter y se cambió el filtro de aceite. Relleno con lubricante sintético.',
    interventionType: ['Mecánica', 'Lubricación'],
    usedParts: [{ partId: 'R-04', quantity: 4 }, { id: 'R-01', name: 'Otros repuestos menores', quantity: 1 }],
    finalEvidence: 'compresor_reparado.jpg',
    observations: 'Se sugiere monitorear temperatura de operación del compresor cada 4 horas.',
    historyLogs: [
      { date: '2026-06-01T09:00:00-06:00', status: 'Solicitud recibida', user: 'Ing. Planta', comment: 'Fuga reportada' },
      { date: '2026-06-01T09:30:00-06:00', status: 'Asignada', user: 'Super Admin', comment: 'Asignado a Sofía Ruiz' },
      { date: '2026-06-01T10:00:00-06:00', status: 'En proceso', user: 'Ing. Sofía Ruiz', comment: 'Desensamblando carcasa exterior' },
      { date: '2026-06-01T13:45:00-06:00', status: 'Ejecutada', user: 'Ing. Sofía Ruiz', comment: 'Reparación completada, listo para validación' },
      { date: '2026-06-01T14:15:00-06:00', status: 'Cerrada', user: 'Super Admin', comment: 'Calidad validada y cerrada' }
    ]
  }
];

const DEFAULT_DYNAMIC_FORMS = [];


// Dashboard static config representing the whiteboard
const WHITEBOARD_STATIC_DATA = {
  compliancePercent: 90,
  // Bar chart "OT por cerrar": OTs overdue sorted by days
  otPorCerrar: {
    labels: ['1-3 Días', '4-7 Días', '8-15 Días', '15+ Días'],
    data: [12, 7, 4, 2]
  },
  // Bar chart "Pronóstico vs Presupuesto por Mes" ($)
  pronosticoPresupuesto: {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    pronostico: [4500, 3800, 5200, 2900, 4800, 6100],
    presupuesto: [5000, 4000, 5000, 3000, 5000, 6000]
  },
  // Line chart "Horas Paro (Downtime)"
  downtimeHours: {
    labels: ['1', '3', '5', '7', '9', '11', '13', '15', '17', '19', '21', '23', '25', '27', '29'],
    TIN: [4, 6, 3, 8, 12, 5, 4, 9, 14, 7, 5, 8, 11, 6, 8],
    TE: [2, 1, 3, 2, 4, 5, 2, 1, 3, 4, 2, 3, 2, 1, 4],
    COS: [1, 2, 1, 3, 2, 1, 2, 1, 3, 2, 1, 2, 1, 3, 2],
    totalHours: 198
  },
  alertas: [
    { type: 'Maquinaria', message: 'Hiladora Rieter M-102 fuera de servicio (Falla eléctrica general)' },
    { type: 'Maquinaria', message: 'Remalladora Brother M-202 en espera de liberación de producción' },
    { type: 'Fallas Recurrentes', message: 'La Tintorera de Jet Thies M-301 registra 15 fallas acumuladas este mes' }
  ],
  topFallaCosto: [
    { area: 'TF Tintorería', machine: 'Tintorera de Jet Thies M-301', cost: 3800, failures: 15, priority: 'Crítico' },
    { area: 'PF Producción', machine: 'Hiladora Rieter G32 M-102', cost: 2100, failures: 12, priority: 'Crítico' },
    { area: 'PF Producción', machine: 'Tejedora Circular Terrot M-101', cost: 1250, failures: 8, priority: 'Seguridad' },
    { area: 'AF Planta', machine: 'Subestación Eléctrica M-402', cost: 1500, failures: 1, priority: 'Seguridad' },
    { area: 'AF Planta', machine: 'Compresor Ingersoll M-401', cost: 950, failures: 3, priority: 'Seguridad' }
  ]
};

// Initializer function
function initLocalStorage() {
  if (!localStorage.getItem('TSMAI_technicians')) {
    localStorage.setItem('TSMAI_technicians', JSON.stringify(DEFAULT_TECHNICIANS));
  }
  if (!localStorage.getItem('TSMAI_machines')) {
    localStorage.setItem('TSMAI_machines', JSON.stringify(DEFAULT_MACHINES));
  }
  if (!localStorage.getItem('TSMAI_parts')) {
    localStorage.setItem('TSMAI_parts', JSON.stringify(DEFAULT_PARTS));
  }
  if (!localStorage.getItem('TSMAI_refacciones_por_maquina')) {
    localStorage.setItem('TSMAI_refacciones_por_maquina', JSON.stringify(DEFAULT_REFACCIONES_POR_MAQUINA));
  }
  if (!localStorage.getItem('TSMAI_requests')) {
    localStorage.setItem('TSMAI_requests', JSON.stringify(DEFAULT_REQUESTS));
  }
  if (!localStorage.getItem('TSMAI_orders')) {
    localStorage.setItem('TSMAI_orders', JSON.stringify(DEFAULT_ORDERS));
  }
  if (!localStorage.getItem('TSMAI_dynamic_forms')) {
    localStorage.setItem('TSMAI_dynamic_forms', JSON.stringify(DEFAULT_DYNAMIC_FORMS));
  }
  if (!localStorage.getItem('TSMAI_whiteboard')) {
    localStorage.setItem('TSMAI_whiteboard', JSON.stringify(WHITEBOARD_STATIC_DATA));
  }
}

// Auto-run on script load
initLocalStorage();
