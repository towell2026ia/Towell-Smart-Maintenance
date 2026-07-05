-- ==========================================
-- Trigger para Autogeneración de Folios
-- ==========================================

-- 1. Crear la función que generará el folio
CREATE OR REPLACE FUNCTION generar_folio_orden_trabajo()
RETURNS TRIGGER AS $$
DECLARE
    siguiente_numero INT;
    prefijo VARCHAR(5);
BEGIN
    -- El prefijo es el código del departamento (ej. PF, CF, TF, AF)
    -- Si no viene departamento, usamos 'OT' por defecto
    prefijo := COALESCE(NEW.departamento, 'OT');

    -- Buscar el folio más alto actual para ese prefijo
    -- Ejemplo: si hay PF00099, extraeremos el '00099' y lo convertiremos a entero
    SELECT COALESCE(
        MAX(
            CAST(
                SUBSTRING(folio FROM LENGTH(prefijo) + 1) AS INTEGER
            )
        ), 0
    ) INTO siguiente_numero
    FROM ordenes_trabajo
    WHERE folio LIKE prefijo || '%';

    -- Incrementar en 1
    siguiente_numero := siguiente_numero + 1;

    -- Asignar el nuevo folio concatenando el prefijo y el número con ceros a la izquierda (5 dígitos)
    NEW.folio := prefijo || LPAD(siguiente_numero::TEXT, 5, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Eliminar el trigger si ya existe para evitar errores
DROP TRIGGER IF EXISTS trg_generar_folio ON ordenes_trabajo;

-- 3. Crear el trigger que se dispara ANTES de insertar un registro
CREATE TRIGGER trg_generar_folio
BEFORE INSERT ON ordenes_trabajo
FOR EACH ROW
-- Solo generamos folio si viene vacío o nulo, o si siempre queremos forzarlo:
-- En este caso, siempre lo forzamos para evitar colisiones desde la App o Telegram.
EXECUTE FUNCTION generar_folio_orden_trabajo();
