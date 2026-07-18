-- ============================================================================
-- SCRIPT DE SINCRONIZACIÓN AUTOMÁTICA DE CORREO ENTRE PERFILES Y AUTENTICACIÓN
-- ============================================================================
-- Instrucciones: 
-- 1. Copia todo este código.
-- 2. Ve al SQL Editor en el panel de control de Supabase.
-- 3. Pega y haz clic en "Run".
-- ============================================================================

-- Habilitar pgcrypto si no está habilitado (normalmente ya lo está)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Función de sincronización al actualizar el correo en la tabla pública
CREATE OR REPLACE FUNCTION public.sync_auth_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el correo (correo) cambió, actualizarlo en auth.users
  IF (OLD.correo IS DISTINCT FROM NEW.correo) THEN
    UPDATE auth.users
    SET email = NEW.correo,
        normalized_email = LOWER(NEW.correo),
        updated_at = NOW()
    WHERE email = OLD.correo;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger de actualización
DROP TRIGGER IF EXISTS trg_sync_auth_user_email ON public.cat_usuarios_roles;
CREATE TRIGGER trg_sync_auth_user_email
AFTER UPDATE ON public.cat_usuarios_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_user_email();

-- 2. Función para auto-crear la cuenta en auth.users al registrar un nuevo usuario en la app
CREATE OR REPLACE FUNCTION public.auto_create_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  default_pass VARCHAR;
BEGIN
  -- Definir contraseña por defecto según el rol del usuario creado
  default_pass := CASE 
    WHEN NEW.rol = 'SUPER_ADMINISTRADOR' THEN 'admin123'
    ELSE 'tech123'
  END;

  -- Si el correo no existe en auth.users, crear la cuenta de login
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = NEW.correo) THEN
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
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      NEW.id_usuario, -- Usar el mismo UUID
      'authenticated',
      'authenticated',
      NEW.correo,
      crypt(default_pass, gen_salt('bf', 10)), -- Cifrado seguro bcrypt
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      json_build_object('nombre_completo', NEW.nombre_completo, 'rol', NEW.rol),
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger de inserción
DROP TRIGGER IF EXISTS trg_auto_create_auth_user ON public.cat_usuarios_roles;
CREATE TRIGGER trg_auto_create_auth_user
AFTER INSERT ON public.cat_usuarios_roles
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_auth_user();
