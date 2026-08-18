const fs = require('fs');
const path = require('path');

// 1. UPDATE index.html (Add IDs to modal title and subtitle)
const indexPath = path.join(__dirname, '..', 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

indexHtml = indexHtml.replace(
  '<h3 style="margin:0;">🔒 Cambio de Contraseña Requerido</h3>',
  '<h3 style="margin:0;" id="modal-change-pass-title">🔒 Cambio de Contraseña Requerido</h3>'
);

indexHtml = indexHtml.replace(
  '<p style="font-size: 0.9rem; margin-bottom: 16px; color: var(--text-muted); line-height:1.4;">',
  '<p style="font-size: 0.9rem; margin-bottom: 16px; color: var(--text-muted); line-height:1.4;" id="modal-change-pass-subtitle">'
);

// Bump version to 3.4.6 for cache-busting
indexHtml = indexHtml.replace(/v=3\.4\.5/g, 'v=3.4.6');

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('✅ index.html updated.');

// 2. UPDATE sw.js version to v3.4.6
const swPath = path.join(__dirname, '..', 'sw.js');
let swContent = fs.readFileSync(swPath, 'utf8');
swContent = swContent.replace(/v3\.4\.5/g, 'v3.4.6');
fs.writeFileSync(swPath, swContent, 'utf8');
console.log('✅ sw.js updated to v3.4.6.');

// 3. UPDATE app.js recovery trigger and detection
const appJsPath = path.join(__dirname, '..', 'app.js');
let raw = fs.readFileSync(appJsPath, 'utf8');
const isCRLF = raw.includes('\r\n');
let lines = raw.split(/\r?\n/);

const startIdx = lines.findIndex((l, idx) => idx > 40 && idx < 60 && l.includes('// Detectar directamente si la URL tiene type=recovery'));
if (startIdx === -1) {
  console.error('Could not find startIdx');
  process.exit(1);
}

const endIdx = lines.findIndex((l, idx) => idx > 70 && idx < 115 && l.includes('// --- VARIABLES GLOBALES Y CONTROL DE ESTADO ---'));
if (endIdx === -1) {
  console.error('Could not find endIdx');
  process.exit(1);
}

const newRecoverySection = [
  "// Detectar directamente si la URL tiene tokens de recuperación (Hash o Search / PKCE)",
  "const initialHash = window.location.hash || '';",
  "const initialSearch = window.location.search || '';",
  "if (",
  "  initialHash.includes('type=recovery') || ",
  "  initialHash.includes('recovery') || ",
  "  initialHash.includes('access_token') ||",
  "  initialSearch.includes('code=') ||",
  "  initialSearch.includes('type=recovery') ||",
  "  initialSearch.includes('recovery')",
  ") {",
  "  pendingRecovery = true;",
  "  console.log('[Auth Recovery] Flag de recuperación activado de inmediato desde la URL.');",
  "}",
  "",
  "if (typeof supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {",
  "  try {",
  "    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);",
  "    useLiveDatabase = true;",
  "    console.log('Supabase client initialized successfully with Live Database mode enabled!');",
  "    ",
  "    // Escuchar eventos de autenticación de Supabase (PASSWORD_RECOVERY, SIGNED_IN, etc.)",
  "    supabaseClient.auth.onAuthStateChange(async (event, session) => {",
  "      console.log('Auth state event received:', event);",
  "      if (",
  "        event === 'PASSWORD_RECOVERY' || ",
  "        event === 'USER_UPDATED' ||",
  "        (event === 'SIGNED_IN' && (pendingRecovery || window.location.hash.includes('recovery') || window.location.search.includes('code=')))",
  "      ) {",
  "        pendingRecovery = true;",
  "        if (session) recoverySession = session;",
  "        if (document.readyState === 'loading') {",
  "          document.addEventListener('DOMContentLoaded', () => {",
  "            setTimeout(triggerRecoveryUI, 120);",
  "          }, { once: true });",
  "        } else {",
  "          setTimeout(triggerRecoveryUI, 120);",
  "        }",
  "      }",
  "    });",
  "  } catch (err) {",
  "    console.error('Failed to initialize Supabase client:', err);",
  "  }",
  "}",
  "",
  "function triggerRecoveryUI() {",
  "  const currentHash = window.location.hash || '';",
  "  const currentSearch = window.location.search || '';",
  "  const isRecoveryUrl = ",
  "    currentHash.includes('type=recovery') || ",
  "    currentHash.includes('recovery') || ",
  "    currentHash.includes('access_token') ||",
  "    currentSearch.includes('code=') ||",
  "    currentSearch.includes('recovery');",
  "",
  "  if (!pendingRecovery && !isRecoveryUrl) return;",
  "",
  "  const modal = document.getElementById('modal-change-password');",
  "  if (!modal) {",
  "    setTimeout(triggerRecoveryUI, 150);",
  "    return;",
  "  }",
  "",
  "  // Mantener al usuario en la Homepage (Public Portal) sin auto-iniciar sesión en el tablero",
  "  showView('public-portal');",
  "  showPublicPanel('home');",
  "",
  "  const userIdInput = document.getElementById('change-pass-user-id');",
  "  if (userIdInput) userIdInput.value = 'RECOVERY_MODE';",
  "",
  "  const targetRol = (recoverySession?.user?.user_metadata?.rol === 'SUPER_ADMINISTRADOR') ? 'admin' : 'tech';",
  "  const targetViewInput = document.getElementById('change-pass-target-view');",
  "  if (targetViewInput) targetViewInput.value = targetRol;",
  "  ",
  "  const titleEl = document.getElementById('modal-change-pass-title');",
  "  const subEl = document.getElementById('modal-change-pass-subtitle');",
  "  if (titleEl) titleEl.innerText = '🔐 Establece tu Nueva Contraseña';",
  "  if (subEl) subEl.innerText = 'Ingresa y confirma la contraseña que usarás para acceder al sistema.';",
  "",
  "  // Limpiar campos de texto del modal",
  "  const newPassInput = document.getElementById('change-pass-new');",
  "  const confirmPassInput = document.getElementById('change-pass-confirm');",
  "  if (newPassInput) newPassInput.value = '';",
  "  if (confirmPassInput) confirmPassInput.value = '';",
  "  ",
  "  openModal('modal-change-password');",
  "  console.log('✅ Modal de restablecimiento de contraseña abierto exitosamente.');",
  "}"
];

lines.splice(startIdx, endIdx - startIdx, ...newRecoverySection);
console.log('✅ Recovery section in app.js updated.');

// Also in DOMContentLoaded, ensure triggerRecoveryUI is called with a tiny delay
const domIdx = lines.findIndex((l, idx) => idx > 1650 && idx < 1750 && l.includes('// Restaurar de inmediato la ruta/vista según el hash'));
if (domIdx !== -1) {
  lines.splice(domIdx + 1, 0, 
    "  if (pendingRecovery || window.location.hash.includes('recovery') || window.location.search.includes('code=')) {",
    "    setTimeout(triggerRecoveryUI, 120);",
    "  }"
  );
  console.log('✅ DOMContentLoaded recovery trigger appended.');
}

const finalContent = lines.join(isCRLF ? '\r\n' : '\n');
fs.writeFileSync(appJsPath, finalContent, 'utf8');
console.log('🎉 app.js written successfully!');
