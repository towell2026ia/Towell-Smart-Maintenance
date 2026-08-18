const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'app.js');
let raw = fs.readFileSync(appJsPath, 'utf8');
const isCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

// 1. Fix DOMContentLoaded premature signOut
const oldDomInit = `  // ── REGLA PWA: Si NO hay sesión en sessionStorage, SIEMPRE arrancar en Home (login) ──
  // Esto cubre el caso de cerrar la ventana/app y volver a abrirla.
  // Supabase Auth persiste su sesión en localStorage, así que la cerramos explícitamente
  // para que el usuario SIEMPRE tenga que volver a ingresar sus credenciales.
  if (!currentUser && supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
      console.log('[TSMAI] No hay sesión de pestaña. Supabase Auth cerrada para forzar re-login.');
    } catch (e) {
      console.warn('[TSMAI] signOut on init:', e);
    }
  }`;

const newDomInit = `  // ── REGLA PWA: Si NO hay sesión en sessionStorage, SIEMPRE arrancar en Home (login) ──
  // Esto cubre el caso de cerrar la ventana/app y volver a abrirla.
  // Supabase Auth persiste su sesión en localStorage, así que la cerramos explícitamente
  // para que el usuario SIEMPRE tenga que volver a ingresar sus credenciales.
  // IMPORTANTE: NO cerrar sesión si la URL contiene un token de recuperación (#access_token=... o #type=recovery o ?code=...)
  const isRecoveryHash = window.location.hash && (
    window.location.hash.includes('type=recovery') || 
    window.location.hash.includes('recovery') || 
    window.location.hash.includes('access_token')
  );
  const isRecoveryQuery = window.location.search && (
    window.location.search.includes('code=') || 
    window.location.search.includes('type=recovery')
  );
  const isCurrentlyRecovering = pendingRecovery || isRecoveryHash || isRecoveryQuery;

  if (!currentUser && supabaseClient && !isCurrentlyRecovering) {
    try {
      await supabaseClient.auth.signOut();
      console.log('[TSMAI] No hay sesión de pestaña. Supabase Auth cerrada para forzar re-login.');
    } catch (e) {
      console.warn('[TSMAI] signOut on init:', e);
    }
  }`;

if (!content.includes(oldDomInit)) {
  console.error('Error: oldDomInit target not found!');
  process.exit(1);
}
content = content.replace(oldDomInit, newDomInit);
console.log('✅ DOMContentLoaded recovery protection replaced.');

// 2. Fix submitChangedPassword implementation
const oldSubmitPass = `async function submitChangedPassword() {
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

  if (userId === 'RECOVERY_MODE') {
    closeModal('modal-change-password');
    showToast('✅ Contraseña restablecida con éxito. Por favor inicia sesión con tu nueva contraseña.');

    // Limpiar tokens de recuperación de la barra de direcciones de la URL
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, null, window.location.pathname);
    } else {
      window.location.hash = '';
    }

    // Cerrar sesión de recuperación temporal en Supabase
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch (e) {
        console.warn('SignOut post-recovery non-blocking warning:', e);
      }
    }

    // Limpiar variables de sesión y mantener en Homepage
    currentUser = null;
    localStorage.removeItem('TSMAI_current_user');
    pendingRecovery = false;
    recoverySession = null;
    recoveryTargetEmail = null;

    showView('public-portal');
    showPublicPanel('home');

    if (supabaseClient) {
      try {
        await syncDatabases();
      } catch (e) {}
    }
    return;
  }`;

const newSubmitPass = `async function submitChangedPassword() {
  const userId = document.getElementById('change-pass-user-id')?.value || '';
  const newPass = document.getElementById('change-pass-new')?.value?.trim() || '';
  const confirmPass = document.getElementById('change-pass-confirm')?.value?.trim() || '';

  if (!newPass || newPass.length < 6) {
    alert('La contraseña debe tener al menos 6 caracteres.');
    return;
  }
  if (newPass !== confirmPass) {
    alert('Las contraseñas no coinciden. Por favor inténtalo de nuevo.');
    return;
  }

  const submitBtn = document.querySelector('#modal-change-password button.btn-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = '⏳ Guardando contraseña...';
  }

  if (supabaseClient) {
    try {
      // 1. Actualizar contraseña en Supabase Auth
      const { data: updateData, error: authError } = await supabaseClient.auth.updateUser({ password: newPass });
      if (authError) {
        throw new Error(authError.message || 'Error al actualizar la contraseña en Supabase Auth');
      }

      // 2. Localizar el correo del usuario
      let userEmail = updateData?.user?.email || recoveryTargetEmail || recoverySession?.user?.email;
      if (!userEmail) {
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user?.email) userEmail = user.email;
        } catch(e) {}
      }

      // 3. Remover la bandera debe_cambiar_contrasenia en cat_usuarios_roles
      if (userEmail) {
        await supabaseClient
          .from('cat_usuarios_roles')
          .update({ 
            debe_cambiar_contrasenia: false, 
            fecha_actualizacion: new Date().toISOString() 
          })
          .ilike('correo', userEmail.trim());
      } else if (userId && userId !== 'RECOVERY_MODE') {
        await supabaseClient
          .from('cat_usuarios_roles')
          .update({ 
            debe_cambiar_contrasenia: false, 
            fecha_actualizacion: new Date().toISOString() 
          })
          .eq('id_usuario', userId);
      }

      showToast('✅ Contraseña actualizada con éxito.');
    } catch (err) {
      console.error('Error al actualizar la contraseña en Supabase:', err);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Guardar Contraseña';
      }
      alert(\`❌ Error al guardar la contraseña:\\n\\n\${err.message}\\n\\nEs posible que el enlace de correo haya expirado o ya haya sido utilizado.\\nPor favor solicita un nuevo enlace desde "¿Olvidaste tu contraseña?".\`);
      return;
    }
  }

  if (userId === 'RECOVERY_MODE') {
    closeModal('modal-change-password');
    showToast('✅ Contraseña restablecida con éxito. Por favor inicia sesión con tu nueva contraseña.');

    // Limpiar tokens de recuperación de la barra de direcciones de la URL
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, null, window.location.pathname);
    } else {
      window.location.hash = '';
    }

    // Cerrar sesión de recuperación temporal en Supabase para requerir login formal
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch (e) {
        console.warn('SignOut post-recovery non-blocking warning:', e);
      }
    }

    // Limpiar variables de sesión y mantener en Homepage
    currentUser = null;
    localStorage.removeItem('TSMAI_current_user');
    pendingRecovery = false;
    recoverySession = null;
    recoveryTargetEmail = null;

    showView('public-portal');
    showPublicPanel('home');

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Guardar Contraseña';
    }

    alert('✅ Tu contraseña ha sido actualizada exitosamente.\\n\\nYa puedes iniciar sesión ingresando tu correo y tu nueva contraseña.');
    return;
  }`;

if (!content.includes(oldSubmitPass)) {
  console.error('Error: oldSubmitPass target not found!');
  process.exit(1);
}
content = content.replace(oldSubmitPass, newSubmitPass);
console.log('✅ submitChangedPassword replaced successfully.');

if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(appJsPath, content, 'utf8');
console.log('🎉 app.js updated successfully!');
