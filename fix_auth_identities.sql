-- ============================================================================
-- SCRIPT DE CORRECCIÓN: SINCRONIZACIÓN DE IDENTIDADES PARA AUTENTICACIÓN
-- ============================================================================
-- Este script soluciona dos problemas críticos en Supabase Auth:
-- 1. Error de identidades: La falta de registros en 'auth.identities'.
-- 2. Error de conversión NULL a String (Scan error on confirmation_token):
--    El motor de Supabase Auth (GoTrue, escrito en Go) falla con error 500
--    "Unable to process request" si los tokens están como NULL en lugar
--    de una cadena vacía ('').
--
-- Instrucciones:
-- 1. Copia todo este código.
-- 2. Ve al SQL Editor en el panel de control de tu proyecto de Supabase.
-- 3. Abre una pestaña nueva de consulta ("New query"), pega el código y haz clic en "Run".
-- ============================================================================

-- 1. Actualizar la función trigger para incluir la inserción de identidades y tokens vacíos
CREATE OR REPLACE FUNCTION public.auto_create_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  default_pass VARCHAR;
  user_uuid UUID;
BEGIN
  -- Definir contraseña por defecto según el rol del usuario creado
  default_pass := CASE 
    WHEN NEW.rol = 'SUPER_ADMINISTRADOR' THEN 'admin123'
    ELSE 'tech123'
  END;

  user_uuid := NEW.id_usuario;

  -- Si el correo no existe en auth.users, crear la cuenta de login
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = NEW.correo) THEN
    -- 1.1 Crear el usuario en auth.users con tokens inicializados en vacío
    INSERT INTO auth.users (
      instance_id,
      id, -- Alineamos los IDs
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      email_change_token_current,
      recovery_token,
      phone_change,
      phone_change_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      user_uuid, -- Usar el mismo UUID
      'authenticated',
      'authenticated',
      NEW.correo,
      crypt(default_pass, gen_salt('bf', 10)), -- Cifrado seguro bcrypt
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      json_build_object('nombre_completo', NEW.nombre_completo, 'rol', NEW.rol),
      NOW(),
      NOW(),
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    );

    -- 1.2 Crear la identidad en auth.identities
    -- Esto es CRÍTICO para que funcionen los flujos de Supabase Auth (como el restablecimiento de contraseña)
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      user_uuid, -- ID de la identidad (usamos el mismo user_uuid)
      user_uuid, -- ID del usuario
      json_build_object('sub', user_uuid::text, 'email', NEW.correo)::jsonb, -- Datos de identidad
      'email', -- Proveedor de autenticación
      user_uuid::text, -- Provider ID (en login por email se usa el uuid del usuario)
      NOW(),
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-asociar el trigger si por alguna razón se borró (sigue apuntando a AFTER INSERT en cat_usuarios_roles)
DROP TRIGGER IF EXISTS trg_auto_create_auth_user ON public.cat_usuarios_roles;
CREATE TRIGGER trg_auto_create_auth_user
AFTER INSERT ON public.cat_usuarios_roles
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_auth_user();

-- ============================================================================
-- 2. REPARACIÓN RETROACTIVA DE USUARIOS EXISTENTES
-- ============================================================================

-- 2.1 Corregir columnas NULL que rompen el escaneo de GoTrue a cadenas vacías ('')
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  recovery_token = COALESCE(recovery_token, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, '');

-- 2.2 Insertar los registros faltantes en auth.identities
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT 
  u.id, -- ID de identidad (usamos el uuid de usuario)
  u.id, -- user_id
  json_build_object('sub', u.id::text, 'email', u.email)::jsonb, -- identity_data
  'email', -- provider
  u.id::text, -- provider_id
  NOW(),
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id
WHERE i.user_id IS NULL;
