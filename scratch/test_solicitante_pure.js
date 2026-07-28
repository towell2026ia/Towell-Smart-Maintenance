const fs = require('fs');

// Crear entorno simulado de DOM mínimo
global.window = {
  location: { hash: '#solicitante', pathname: '/', search: '' },
  localStorage: {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  },
  addEventListener() {},
  removeEventListener() {}
};

global.document = {
  documentElement: { classList: { remove() {}, add() {} } },
  head: { appendChild() {} },
  body: { style: {} },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  getElementById() { return null; },
  createElement() {
    return {
      style: {},
      classList: { add() {}, remove() {} },
      appendChild() {},
      addEventListener() {}
    };
  },
  addEventListener() {}
};

global.history = { pushState() {} };
global.location = global.window.location;
global.localStorage = global.window.localStorage;
global.navigator = { userAgent: 'node' };

async function audit() {
  console.log('🧪 Auditando app.js en entorno Node purificado...');

  const appJsCode = fs.readFileSync('app.js', 'utf8');
  
  try {
    const fn = new Function('global', 'window', 'document', 'localStorage', 'location', 'history', `
      ${appJsCode}
      global.switchSolicitantePanel = typeof switchSolicitantePanel !== 'undefined' ? switchSolicitantePanel : null;
      global.restoreRouteFromHash = typeof restoreRouteFromHash !== 'undefined' ? restoreRouteFromHash : null;
      global.showView = typeof showView !== 'undefined' ? showView : null;
      global.getCurrentUser = () => typeof currentUser !== 'undefined' ? currentUser : null;
      global.setCurrentUser = (val) => { currentUser = val; };
      global.getActiveSolicitantePanel = () => typeof activeSolicitantePanel !== 'undefined' ? activeSolicitantePanel : null;
    `);
    fn(global, global.window, global.document, global.localStorage, global.location, global.history);
    console.log('✅ app.js evaluado sin errores de sintaxis o inicialización.');
  } catch (e) {
    console.error('❌ Error evaluando app.js:', e);
    return;
  }

  // 1. Probar switchSolicitantePanel con todos los argumentos posibles
  console.log('\n🔍 Auditando switchSolicitantePanel(panelId)...');
  const panelTests = ['new', 'tracking', 'calendar', 'validation', 'solicitante', '', null, undefined, 'invalido'];

  for (const t of panelTests) {
    try {
      global.switchSolicitantePanel(t);
      console.log(`  - switchSolicitantePanel('${t}') ➔ activeSolicitantePanel = "${global.getActiveSolicitantePanel()}"`);
    } catch (e) {
      console.error(`  ❌ Error al ejecutar switchSolicitantePanel('${t}'):`, e.message);
    }
  }

  // 2. Probar restoreRouteFromHash en varios escenarios de sesión
  console.log('\n🔍 Auditando restoreRouteFromHash()...');
  
  // Escenario A: Usuario Solicitante Autenticado
  global.localStorage.setItem('TSMAI_current_user', JSON.stringify({
    role: 'solicitante',
    rol: 'SOLICITANTE',
    name: 'MONICA ITZEL',
    email: 'sgc@towelmex.com',
    area: 'AF'
  }));

  const routes = ['#solicitante', '#solicitante/new', '#solicitante/tracking', '#solicitante/calendar', '#solicitante/validation', '', '#login'];
  for (const r of routes) {
    global.window.location.hash = r;
    global.setCurrentUser(null); // forzar restauración desde localStorage
    try {
      global.restoreRouteFromHash();
      const curr = global.getCurrentUser();
      console.log(`  - Ruta '${r}' con sesión Solicitante ➔ Usuario: ${curr ? curr.email : 'null'}`);
    } catch (e) {
      console.error(`  ❌ Error en restoreRouteFromHash para '${r}':`, e.message);
    }
  }

  // Escenario B: Usuario No Autenticado (Sin sesión)
  global.localStorage.removeItem('TSMAI_current_user');
  global.setCurrentUser(null);

  for (const r of routes) {
    global.window.location.hash = r;
    try {
      global.restoreRouteFromHash();
      const curr = global.getCurrentUser();
      console.log(`  - Ruta '${r}' SIN SESIÓN ➔ Usuario: ${curr ? curr.email : 'null'}`);
    } catch (e) {
      console.error(`  ❌ Error en restoreRouteFromHash (Sin Sesión) para '${r}':`, e.message);
    }
  }

  console.log('\n==================================================');
  console.log('🎉 Auditoría pura completada.');
}

audit();
