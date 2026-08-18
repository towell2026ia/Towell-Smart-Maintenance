const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'app.js');
let raw = fs.readFileSync(appJsPath, 'utf8');
const isCRLF = raw.includes('\r\n');
let lines = raw.split(/\r?\n/);

// 1. Replace lines 1669 to 1679
// Find index of "if (!currentUser && supabaseClient) {" around 1672
const initIndex = lines.findIndex((l, idx) => idx > 1650 && idx < 1700 && l.includes('if (!currentUser && supabaseClient)'));
if (initIndex === -1) {
  console.error('Could not find initIndex');
  process.exit(1);
}

const replacementInitLines = [
  "  // IMPORTANTE: NO cerrar sesión si la URL contiene un token de recuperación (#access_token=... o #type=recovery o ?code=...)",
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
  "  if (!currentUser && supabaseClient && !isCurrentlyRecovering) {"
];

// Replace the line `if (!currentUser && supabaseClient) {` with replacementInitLines
lines.splice(initIndex, 1, ...replacementInitLines);
console.log('✅ Replaced init signOut guard successfully.');

// Re-split or update
// 2. Replace submitChangedPassword
const passIndexStart = lines.findIndex((l, idx) => idx > 11300 && l.startsWith('async function submitChangedPassword() {'));
if (passIndexStart === -1) {
  console.error('Could not find passIndexStart');
  process.exit(1);
}

// Find where `return;` ends for `if (userId === 'RECOVERY_MODE') {`
let passIndexEnd = -1;
for (let i = passIndexStart; i < passIndexStart + 150; i++) {
  if (lines[i].includes('const users = JSON.parse(localStorage.getItem(\'TSMAI_users\')')) {
    passIndexEnd = i;
    break;
  }
}

if (passIndexEnd === -1) {
  console.error('Could not find passIndexEnd');
  process.exit(1);
}

console.log(`Replacing submitChangedPassword from line ${passIndexStart} to ${passIndexEnd}`);

const replacementPassLines = [
  "async function submitChangedPassword() {",
  "  const userId = document.getElementById('change-pass-user-id')?.value || '';",
  "  const targetView = document.getElementById('change-pass-target-view')?.value || 'tech';",
  "  const newPass = document.getElementById('change-pass-new')?.value?.trim() || '';",
  "  const confirmPass = document.getElementById('change-pass-confirm')?.value?.trim() || '';",
  "",
  "  if (!newPass || newPass.length < 6) {",
  "    alert('La contraseña debe tener al menos 6 caracteres.');",
  "    return;",
  "  }",
  "  if (newPass !== confirmPass) {",
  "    alert('Las contraseñas no coinciden. Por favor inténtalo de nuevo.');",
  "    return;",
  "  }",
  "",
  "  const submitBtn = document.querySelector('#modal-change-password button.btn-submit');",
  "  if (submitBtn) {",
  "    submitBtn.disabled = true;",
  "    submitBtn.innerText = '⏳ Guardando contraseña...';",
  "  }",
  "",
  "  if (supabaseClient) {",
  "    try {",
  "      // 1. Actualizar contraseña en Supabase Auth",
  "      const { data: updateData, error: authError } = await supabaseClient.auth.updateUser({ password: newPass });",
  "      if (authError) {",
  "        throw new Error(authError.message || 'Error al actualizar la contraseña en Supabase Auth');",
  "      }",
  "",
  "      // 2. Localizar el correo del usuario",
  "      let userEmail = updateData?.user?.email || recoveryTargetEmail || recoverySession?.user?.email;",
  "      if (!userEmail) {",
  "        try {",
  "          const { data: { user } } = await supabaseClient.auth.getUser();",
  "          if (user?.email) userEmail = user.email;",
  "        } catch(e) {}",
  "      }",
  "",
  "      // 3. Remover la bandera debe_cambiar_contrasenia en cat_usuarios_roles",
  "      if (userEmail) {",
  "        await supabaseClient",
  "          .from('cat_usuarios_roles')",
  "          .update({ ",
  "            debe_cambiar_contrasenia: false, ",
  "            fecha_actualizacion: new Date().toISOString() ",
  "          })",
  "          .ilike('correo', userEmail.trim());",
  "      } else if (userId && userId !== 'RECOVERY_MODE') {",
  "        await supabaseClient",
  "          .from('cat_usuarios_roles')",
  "          .update({ ",
  "            debe_cambiar_contrasenia: false, ",
  "            fecha_actualizacion: new Date().toISOString() ",
  "          })",
  "          .eq('id_usuario', userId);",
  "      }",
  "",
  "      showToast('✅ Contraseña actualizada con éxito.');",
  "    } catch (err) {",
  "      console.error('Error al actualizar la contraseña en Supabase:', err)",
  "      if (submitBtn) {",
  "        submitBtn.disabled = false;",
  "        submitBtn.innerText = 'Guardar Contraseña';",
  "      }",
  "      alert(`❌ Error al guardar la contraseña:\\n\\n${err.message}\\n\\nEs posible que el enlace de correo haya expirado o ya haya sido utilizado.\\nPor favor solicita un nuevo enlace desde \"¿Olvidaste tu contraseña?\".`);",
  "      return;",
  "    }",
  "  }",
  "",
  "  if (userId === 'RECOVERY_MODE') {",
  "    closeModal('modal-change-password');",
  "    showToast('✅ Contraseña restablecida con éxito. Por favor inicia sesión con tu nueva contraseña.');",
  "",
  "    // Limpiar tokens de recuperación de la barra de direcciones de la URL",
  "    if (window.history && window.history.replaceState) {",
  "      window.history.replaceState(null, null, window.location.pathname);",
  "    } else {",
  "      window.location.hash = '';",
  "    }",
  "",
  "    // Cerrar sesión de recuperación temporal en Supabase para requerir login formal",
  "    if (supabaseClient) {",
  "      try {",
  "        await supabaseClient.auth.signOut();",
  "      } catch (e) {",
  "        console.warn('SignOut post-recovery non-blocking warning:', e);",
  "      }",
  "    }",
  "",
  "    // Limpiar variables de sesión y mantener en Homepage",
  "    currentUser = null;",
  "    localStorage.removeItem('TSMAI_current_user');",
  "    pendingRecovery = false;",
  "    recoverySession = null;",
  "    recoveryTargetEmail = null;",
  "",
  "    showView('public-portal');",
  "    showPublicPanel('home');",
  "",
  "    if (submitBtn) {",
  "      submitBtn.disabled = false;",
  "      submitBtn.innerText = 'Guardar Contraseña';",
  "    }",
  "",
  "    alert('✅ Tu contraseña ha sido actualizada exitosamente.\\n\\nYa puedes iniciar sesión ingresando tu correo y tu nueva contraseña.');",
  "    return;",
  "  }"
];

lines.splice(passIndexStart, passIndexEnd - passIndexStart, ...replacementPassLines);
console.log('✅ Replaced submitChangedPassword successfully.');

const finalContent = lines.join(isCRLF ? '\r\n' : '\n');
fs.writeFileSync(appJsPath, finalContent, 'utf8');
console.log('🎉 app.js patched and written successfully!');
