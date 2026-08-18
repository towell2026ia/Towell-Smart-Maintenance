const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'app.js');
let raw = fs.readFileSync(appJsPath, 'utf8');
const isCRLF = raw.includes('\r\n');
let lines = raw.split(/\r?\n/);

// 1. Update persistSessionUser (around line 1530)
const persistIdx = lines.findIndex((l, idx) => idx > 1520 && idx < 1560 && l.includes('function persistSessionUser('));
if (persistIdx === -1) {
  console.error('Could not find persistSessionUser');
  process.exit(1);
}

// Find end of persistSessionUser function
let persistEnd = -1;
for (let i = persistIdx; i < persistIdx + 20; i++) {
  if (lines[i].trim() === '}') {
    persistEnd = i + 1;
    break;
  }
}

const newPersistLines = [
  "function persistSessionUser(userObj) {",
  "  currentUser = userObj;",
  "  if (userObj) {",
  "    try {",
  "      sessionStorage.setItem('TSMAI_current_user', JSON.stringify(userObj));",
  "      localStorage.setItem('TSMAI_current_user', JSON.stringify(userObj));",
  "    } catch(e) {}",
  "  } else {",
  "    try {",
  "      sessionStorage.removeItem('TSMAI_current_user');",
  "      sessionStorage.removeItem('TSMAI_current_route');",
  "      localStorage.removeItem('TSMAI_current_user');",
  "      localStorage.removeItem('TSMAI_current_route');",
  "    } catch(e) {}",
  "  }",
  "}"
];

lines.splice(persistIdx, persistEnd - persistIdx, ...newPersistLines);
console.log('✅ persistSessionUser updated for full PWA persistence.');

// 2. Update restoreRouteFromHash (around line 1565)
const restoreIdx = lines.findIndex((l, idx) => idx > 1550 && idx < 1600 && l.includes('function restoreRouteFromHash() {'));
if (restoreIdx === -1) {
  console.error('Could not find restoreRouteFromHash');
  process.exit(1);
}

let restoreEnd = -1;
for (let i = restoreIdx; i < restoreIdx + 110; i++) {
  if (lines[i].includes('// --- INICIALIZACIÓN ---')) {
    restoreEnd = i;
    break;
  }
}

const newRestoreLines = [
  "function restoreRouteFromHash() {",
  "  const hash = window.location.hash || '';",
  "",
  "  // Si la URL contiene un token de recuperación de contraseña o el flag está activo,",
  "  // NO navegar a vistas internas, permanecer siempre en la Homepage (public-portal)",
  "  if (pendingRecovery || hash.includes('type=recovery') || hash.includes('recovery')) {",
  "    console.log('[Recovery Route] Permaneciendo en Homepage para restablecimiento de contraseña.');",
  "    showView('public-portal');",
  "    showPublicPanel('home');",
  "    triggerRecoveryUI();",
  "    return true;",
  "  }",
  "",
  "  // 1. Recuperar usuario desde sessionStorage o localStorage (persistencia PWA)",
  "  if (!currentUser) {",
  "    const savedUser = sessionStorage.getItem('TSMAI_current_user') || localStorage.getItem('TSMAI_current_user');",
  "    if (savedUser) {",
  "      try { currentUser = JSON.parse(savedUser); } catch (e) {}",
  "    }",
  "  }",
  "",
  "  const cleanHash = hash.replace('#', '');",
  "  const parts = cleanHash.split('/');",
  "  const viewId = parts[0] || '';",
  "  const panelId = parts[1] || '';",
  "",
  "  // 2. Si hay usuario autenticado: AISLAMIENTO ESTRICTO DE 1 ROL POR USUARIO",
  "  if (currentUser) {",
  "    const roleKey = normalizeUserRole(currentUser.role || currentUser.rol);",
  "",
  "    // Si el usuario es SOLICITANTE, forzar EXCLUSIVAMENTE la vista de solicitante",
  "    if (roleKey === 'solicitante') {",
  "      const validPanels = ['home', 'new', 'tracking', 'calendar', 'validation'];",
  "      const targetPanel = validPanels.includes(panelId) ? panelId : (activeSolicitantePanel || 'home');",
  "      showView('solicitante');",
  "      switchSolicitantePanel(targetPanel);",
  "      return true;",
  "    }",
  "",
  "    // Si el usuario es TÉCNICO, forzar EXCLUSIVAMENTE la vista de técnico",
  "    if (roleKey === 'tech') {",
  "      const validPanels = ['dashboard', 'checklists', 'bitacora', 'history', 'profile'];",
  "      const targetPanel = validPanels.includes(panelId) ? panelId : (activeTechPanel || 'dashboard');",
  "      const pName = document.getElementById('tech-profile-name');",
  "      const pSpec = document.getElementById('tech-profile-specialty');",
  "      const pAvat = document.getElementById('tech-profile-avatar');",
  "      if (pName) pName.innerText = currentUser.name || currentUser.nombre_completo || 'Técnico';",
  "      if (pSpec) pSpec.innerText = currentUser.specialty || currentUser.observaciones || currentUser.department || 'General';",
  "      if (pAvat) pAvat.innerText = currentUser.avatar || '👨‍🔧';",
  "",
  "      showView('tech');",
  "      switchTechPanel(targetPanel);",
  "      return true;",
  "    }",
  "",
  "    // Si el usuario es ADMIN, forzar EXCLUSIVAMENTE la vista de administrador",
  "    if (roleKey === 'admin') {",
  "      const validPanels = ['dashboard', 'requests', 'orders', 'preventive', 'checklists', 'downtime', 'forms', 'excel', 'config', 'databases', 'users'];",
  "      const targetPanel = validPanels.includes(panelId) ? panelId : (activeAdminPanel || 'dashboard');",
  "      showView('admin');",
  "      switchAdminPanel(targetPanel);",
  "      return true;",
  "    }",
  "  }",
  "",
  "  // 3. Si NO hay usuario autenticado:",
  "  if (viewId === 'login') {",
  "    showView('public-portal');",
  "    showPublicPanel('home');",
  "    return true;",
  "  }",
  "",
  "  if (viewId === 'solicitante' || viewId === 'admin' || viewId === 'tech') {",
  "    showView('public-portal');",
  "    showPublicPanel('home');",
  "    return true;",
  "  }",
  "",
  "  if (viewId === 'public' && panelId) {",
  "    showView('public-portal');",
  "    showPublicPanel(panelId);",
  "    return true;",
  "  }",
  "",
  "  // Por defecto para visitantes públicos sin sesión: Portal Público Home",
  "  showView('public-portal');",
  "  showPublicPanel('home');",
  "  return true;",
  "}",
  ""
];

lines.splice(restoreIdx, restoreEnd - restoreIdx, ...newRestoreLines);
console.log('✅ restoreRouteFromHash updated.');

// 3. Update DOMContentLoaded (around line 1655)
const domIdx = lines.findIndex((l, idx) => idx > 1640 && idx < 1720 && l.includes("document.addEventListener('DOMContentLoaded'"));
if (domIdx === -1) {
  console.error('Could not find DOMContentLoaded');
  process.exit(1);
}

let domEnd = -1;
for (let i = domIdx; i < domIdx + 100; i++) {
  if (lines[i].includes('// Cargar datos en los selects dinámicos')) {
    domEnd = i;
    break;
  }
}

const newDomLines = [
  "document.addEventListener('DOMContentLoaded', async () => {",
  "  // 1. Restaurar sesión activa de sessionStorage o localStorage (PWA)",
  "  const savedUser = sessionStorage.getItem('TSMAI_current_user') || localStorage.getItem('TSMAI_current_user');",
  "  if (savedUser) {",
  "    try {",
  "      currentUser = JSON.parse(savedUser);",
  "    } catch (e) {",
  "      currentUser = null;",
  "    }",
  "  }",
  "",
  "  const isRecoveryHash = window.location.hash && (",
  "    window.location.hash.includes('type=recovery') || ",
  "    window.location.hash.includes('recovery') || ",
  "    window.location.hash.includes('access_token')",
  "  );",
  "  const isRecoveryQuery = window.location.search && (",
  "    window.location.search.includes('code=') || ",
  "    window.location.search.includes('type=recovery')",
  "  );",
  "  const isCurrentlyRecovering = pendingRecovery || isRecoveryHash || isRecoveryQuery;",
  "",
  "  // Si no hay usuario en storage pero Supabase Auth tiene sesión viva, recuperar perfil",
  "  if (!currentUser && supabaseClient && !isCurrentlyRecovering) {",
  "    try {",
  "      const { data: { session } } = await supabaseClient.auth.getSession();",
  "      if (session && session.user && session.user.email) {",
  "        const { data: dbUser } = await supabaseClient",
  "          .from('cat_usuarios_roles')",
  "          .select('*')",
  "          .ilike('correo', session.user.email)",
  "          .maybeSingle();",
  "",
  "        if (dbUser && dbUser.activo !== false) {",
  "          const roleKey = normalizeUserRole(dbUser.rol);",
  "          if (roleKey === 'tech') {",
  "            currentUser = {",
  "              role: 'tech',",
  "              rol: dbUser.rol,",
  "              id: dbUser.cve_tecnico || dbUser.id_usuario,",
  "              cve_tecnico: dbUser.cve_tecnico,",
  "              cve_empleado: dbUser.cve_empleado,",
  "              uuid: dbUser.id_usuario,",
  "              name: dbUser.nombre_completo,",
  "              email: dbUser.correo,",
  "              specialty: dbUser.observaciones || 'General',",
  "              avatar: '👨‍🔧',",
  "              department: dbUser.departamento",
  "            };",
  "            persistSessionUser(currentUser);",
  "          } else if (roleKey === 'admin') {",
  "            currentUser = {",
  "              role: 'admin',",
  "              rol: dbUser.rol,",
  "              name: dbUser.nombre_completo,",
  "              email: dbUser.correo,",
  "              uuid: dbUser.id_usuario,",
  "              cve_tecnico: dbUser.cve_tecnico,",
  "              cve_empleado: dbUser.cve_empleado,",
  "              department: dbUser.departamento",
  "            };",
  "            persistSessionUser(currentUser);",
  "          } else if (roleKey === 'solicitante') {",
  "            currentUser = {",
  "              role: 'solicitante',",
  "              rol: 'SOLICITANTE',",
  "              id: dbUser.id_usuario,",
  "              uuid: dbUser.id_usuario,",
  "              name: dbUser.nombre_completo,",
  "              email: dbUser.correo,",
  "              cve_empleado: dbUser.cve_empleado,",
  "              area: dbUser.area || 'CF'",
  "            };",
  "            persistSessionUser(currentUser);",
  "          }",
  "        }",
  "      }",
  "    } catch(e) {",
  "      console.warn('[Session auto-restore]', e);",
  "    }",
  "  }",
  "",
  "  // Asegurar que el seed de datos esté cargado",
  "  if (typeof initLocalStorage === 'function') {",
  "    initLocalStorage();",
  "  }",
  ""
];

lines.splice(domIdx, domEnd - domIdx, ...newDomLines);
console.log('✅ DOMContentLoaded updated with auto-session restoration.');

// 4. Update showView (around line 1800)
const showViewIdx = lines.findIndex((l, idx) => idx > 1750 && idx < 1850 && l.startsWith('function showView('));
if (showViewIdx === -1) {
  console.error('Could not find showView');
  process.exit(1);
}

let showViewEnd = -1;
for (let i = showViewIdx; i < showViewIdx + 80; i++) {
  if (lines[i].includes('// --- PORTAL PÚBLICO: NAVEGACIÓN Y ACCIONES ---')) {
    showViewEnd = i;
    break;
  }
}

const newShowViewLines = [
  "function showView(viewId) {",
  "  // Remover estilo de pre-carga in-head si existía",
  "  document.documentElement.classList.remove('preload-user-active');",
  "  const preloadStyle = document.getElementById('preload-hide-public');",
  "  if (preloadStyle) {",
  "    try { preloadStyle.remove(); } catch(e) {}",
  "  }",
  "",
  "  // Ocultar todas las secciones de vista principal limpiando inline styles",
  "  document.querySelectorAll('.view-section').forEach(view => {",
  "    view.classList.remove('active');",
  "    view.style.display = '';",
  "  });",
  "  ",
  "  // Mostrar la vista objetivo agregando la clase active",
  "  const targetView = document.getElementById(`view-${viewId}`);",
  "  if (targetView) {",
  "    targetView.style.display = '';",
  "    targetView.classList.add('active');",
  "  }",
  "",
  "  // Actualizar hash según el panel activo de la vista",
  "  let route = `#${viewId}`;",
  "  if (viewId === 'admin') {",
  "    route = `#admin/${activeAdminPanel || 'dashboard'}`;",
  "  } else if (viewId === 'tech') {",
  "    route = `#tech/${activeTechPanel || 'dashboard'}`;",
  "  } else if (viewId === 'solicitante') {",
  "    route = `#solicitante/${activeSolicitantePanel || 'new'}`;",
  "  } else if (viewId === 'public-portal') {",
  "    route = `#public/${activePublicPanel || 'home'}`;",
  "  }",
  "",
  "  updateMobileBottomNav();",
  "",
  "  if (location.hash !== route) {",
  "    try { history.pushState(null, '', route); } catch(e) {}",
  "  }",
  "  try { localStorage.setItem('TSMAI_current_route', route); } catch(e) {}",
  "",
  "  // Ejecutar inicializaciones de datos según la vista de forma segura",
  "  if (viewId === 'admin') {",
  "    switchAdminPanel(activeAdminPanel || 'dashboard');",
  "    try { renderAdminDashboard(); } catch(e) { console.warn('[Admin Dash]', e); }",
  "    try { updateAdminKPIs(); } catch(e) { console.warn('[Admin KPIs]', e); }",
  "    try { renderAdminRequestsTable(); } catch(e) { console.warn('[Admin Requests]', e); }",
  "    try { renderAdminOrdersTable(); } catch(e) { console.warn('[Admin Orders]', e); }",
  "    try { renderAdminCalendar(); } catch(e) { console.warn('[Admin Calendar]', e); }",
  "    try { renderAdminLogsTable(); } catch(e) { console.warn('[Admin Logs]', e); }",
  "    try { renderAdminMachinesTable(); } catch(e) { console.warn('[Admin Machines]', e); }",
  "    try { renderAdminPartsTable(); } catch(e) { console.warn('[Admin Parts]', e); }",
  "    try { renderAdminFormsList(); } catch(e) { console.warn('[Admin Forms]', e); }",
  "    try { renderAdminUsersTable(); } catch(e) { console.warn('[Admin Users]', e); }",
  "    try { updateRequestsBadge(); } catch(e) { console.warn('[Admin Badge]', e); }",
  "  } else if (viewId === 'tech') {",
  "    switchTechPanel(activeTechPanel || 'dashboard');",
  "    try { renderTechDashboard(); } catch(e) { console.warn('[Tech Dash]', e); }",
  "    try { renderTechOrdersTable(); } catch(e) { console.warn('[Tech Orders]', e); }",
  "    try { renderTechChecklistsTable(); } catch(e) { console.warn('[Tech Checklists]', e); }",
  "    try { renderTechBitacora(); } catch(e) { console.warn('[Tech Bitacora]', e); }",
  "    try { populateTechMachineHistorySelect(); } catch(e) { console.warn('[Tech History]', e); }",
  "  } else if (viewId === 'solicitante') {",
  "    try { renderSolicitanteView(); } catch(e) { console.warn('[Solic View]', e); }",
  "  }",
  "}",
  ""
];

lines.splice(showViewIdx, showViewEnd - showViewIdx, ...newShowViewLines);
console.log('✅ showView updated with panel switching and safe try/catch wrappers.');

// 5. Update logout (around line 2970)
const logoutIdx = lines.findIndex((l, idx) => idx > 2950 && idx < 3050 && l.startsWith('function logout('));
if (logoutIdx === -1) {
  console.error('Could not find logout');
  process.exit(1);
}

let logoutEnd = -1;
for (let i = logoutIdx; i < logoutIdx + 30; i++) {
  if (lines[i].trim() === '}') {
    logoutEnd = i + 1;
    break;
  }
}

const newLogoutLines = [
  "function logout() {",
  "  currentUser = null;",
  "  persistSessionUser(null);",
  "  try {",
  "    sessionStorage.clear();",
  "    localStorage.removeItem('TSMAI_current_user');",
  "    localStorage.removeItem('TSMAI_current_route');",
  "  } catch(e) {}",
  "  ",
  "  if (supabaseClient) {",
  "    try {",
  "      supabaseClient.auth.signOut().catch(err => console.warn('Supabase signOut error:', err));",
  "    } catch(e) {}",
  "  }",
  "",
  "  showView('public-portal');",
  "  showPublicPanel('home');",
  "  showToast('Sesión cerrada correctamente.');",
  "}"
];

lines.splice(logoutIdx, logoutEnd - logoutIdx, ...newLogoutLines);
console.log('✅ logout updated.');

const finalContent = lines.join(isCRLF ? '\r\n' : '\n');
fs.writeFileSync(appJsPath, finalContent, 'utf8');
console.log('🎉 app.js fully updated for seamless PWA performance!');
