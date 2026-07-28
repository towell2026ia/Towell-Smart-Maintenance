const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

async function testAllRoutes() {
  console.log('🧪 Iniciando prueba automatizada de rutas y paneles del Solicitante...');

  const html = fs.readFileSync('index.html', 'utf8');
  const js = fs.readFileSync('app.js', 'utf8');

  const routesToTest = [
    '',
    '#login',
    '#solicitante',
    '#solicitante/new',
    '#solicitante/tracking',
    '#solicitante/calendar',
    '#solicitante/validation',
    '#admin',
    '#tech'
  ];

  for (const route of routesToTest) {
    console.log(`\n--------------------------------------------------`);
    console.log(`🔍 Probando URL: https://tsmail-towell.netlify.app/${route}`);

    const dom = new JSDOM(html, {
      url: `https://tsmail-towell.netlify.app/${route}`,
      runScripts: 'dangerously',
      resources: 'usable'
    });

    const { window } = dom;
    const { document } = window;

    // Simular usuario Solicitante guardado
    window.localStorage.setItem('TSMAI_current_user', JSON.stringify({
      role: 'solicitante',
      rol: 'SOLICITANTE',
      id_usuario: 'a2e0ae27-6151-4b5e-800c-5adb34716933',
      name: 'SANCHEZ MARTINEZ MONICA ITZEL',
      email: 'sgc@towelmex.com',
      area: 'AF'
    }));

    try {
      // Evaluar script app.js
      const scriptEl = document.createElement('script');
      scriptEl.textContent = js;
      document.head.appendChild(scriptEl);

      // Disparar DOMContentLoaded
      const event = document.createEvent('Event');
      event.initEvent('DOMContentLoaded', true, true);
      document.dispatchEvent(event);

      // Verificar vista activa
      const activeView = document.querySelector('.view-section.active');
      const activeViewId = activeView ? activeView.id : 'NINGUNA (BLANCO)';
      console.log(`  👉 Vista Activa: ${activeViewId}`);

      if (activeViewId === 'view-solicitante') {
        const visiblePanels = Array.from(document.querySelectorAll('.solic-panel-content')).filter(p => p.style.display !== 'none');
        const visiblePanelIds = visiblePanels.map(p => p.id);
        console.log(`  👉 Paneles Solicitante Visibles (${visiblePanels.length}):`, visiblePanelIds);
        if (visiblePanels.length === 0) {
          console.error(`  ❌ ERROR CRÍTICO: ¡El contenedor del Solicitante está activo pero TODOS los paneles están ocultos (PANTALLA BLANCA)!`);
        } else {
          console.log(`  ✅ OK: Panel visible correctamente.`);
        }
      }

    } catch (err) {
      console.error(`  ❌ EXCEPCIÓN EN RUTA ${route}:`, err.message);
    }
  }

  console.log('\n==================================================');
  console.log('🎉 Auditoría de rutas completada.');
}

testAllRoutes();
