// build.js - Netlify and Release build script
const fs = require('fs');
const { execSync } = require('child_process');

console.log('==============================================');
console.log('🚀 TSM-AI: Iniciando proceso de Build & Release');
console.log('==============================================');

// 1. Validar sintaxis JavaScript de archivos clave
try {
  console.log('🔍 Validando sintaxis de app.js...');
  execSync('node -c app.js', { stdio: 'inherit' });
  console.log('🔍 Validando sintaxis de agents-client.js...');
  execSync('node -c agents-client.js', { stdio: 'inherit' });
  console.log('✅ Sintaxis JS válida.');
} catch (err) {
  console.error('❌ Falló la validación de sintaxis JS:', err.message);
  process.exit(1);
}

// 2. Asegurar que config.js exista
if (!fs.existsSync('config.js')) {
  console.log('⚙️ config.js no existe en el entorno. Generando a partir de variables de entorno...');
  const supabaseUrl = process.env.SUPABASE_URL || 'https://xqfpsavkefhrxfbtqzec.supabase.co';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_6iHpR6R2yCdqy-YsvCWkSQ_YWg9my_i';
  const content = `// Generated config.js\nconst SUPABASE_URL = "${supabaseUrl}";\nconst SUPABASE_ANON_KEY = "${supabaseAnonKey}";\n`;
  fs.writeFileSync('config.js', content, 'utf8');
  console.log('✅ config.js generado exitosamente.');
} else {
  console.log('✅ config.js ya existe y se encuentra listo.');
}

// 3. Validar existencia de index.html
if (!fs.existsSync('index.html')) {
  console.error('❌ Falta archivo fundamental index.html!');
  process.exit(1);
} else {
  console.log('✅ index.html verificado.');
}

console.log('==============================================');
console.log('🎉 Build exitoso y listo para despliegue!');
console.log('==============================================');
