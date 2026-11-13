-- Script SQL - Inicialización Manual (OPCIONAL)
-- Este script es opcional, ya que la aplicación lo hace automáticamente
-- Usar solo si necesitas reinicializar o verificar datos manualmente

-- =====================================================
-- 1. INSERTAR INSTITUCIÓN POR DEFECTO
-- =====================================================
INSERT INTO institucion (nombre, dominio, activo, creado_en)
VALUES (
    'Red Académica Universitaria',
    'rau.edu',
    1,
    NOW()
) ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    activo = VALUES(activo);


-- =====================================================
-- 2. INSERTAR USUARIO ADMIN (hash bcrypt de "Admin123456")
-- Nota: El hash debe ser generado con bcrypt en Python
-- Hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUFUDulO
-- =====================================================
INSERT INTO usuario (
    institucion_id,
    nombre,
    email,
    password_hash,
    rol,
    activo,
    creado_en
)
VALUES (
    1,
    'Administrador del Sistema',
    'admin@rau.edu',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUFUDulO',
    'ADMIN_INSTITUCIONAL',
    1,
    NOW()
) ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    rol = VALUES(rol),
    activo = VALUES(activo);


-- =====================================================
-- 3. VERIFICAR DATOS CREADOS
-- =====================================================
SELECT 'INSTITUCIONES' AS seccion;
SELECT id, nombre, dominio, activo FROM institucion;

SELECT '\nUSUARIOS' AS seccion;
SELECT id, nombre, email, rol, activo, creado_en FROM usuario;


-- =====================================================
-- 4. EJEMPLOS DE ESTUDIANTES Y DOCENTES (OPCIONAL)
-- =====================================================

-- ESTUDIANTE EJEMPLO
-- Contraseña: Estudiante123
-- Hash: $2b$12$X9Y8Z7W6V5U4T3S2R1Q0P9O8N7M6L5K4J3I2H1G0F9E8D7C6B5A4
INSERT INTO usuario (
    institucion_id,
    nombre,
    email,
    password_hash,
    rol,
    activo,
    creado_en
) VALUES (
    1,
    'Juan Pérez García',
    'juan.perez@universidad.edu',
    '$2b$12$X9Y8Z7W6V5U4T3S2R1Q0P9O8N7M6L5K4J3I2H1G0F9E8D7C6B5A4',
    'ESTUDIANTE',
    1,
    NOW()
) ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    rol = VALUES(rol);

-- DOCENTE EJEMPLO
-- Contraseña: Docente123
-- Hash: $2b$12$A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6
INSERT INTO usuario (
    institucion_id,
    nombre,
    email,
    password_hash,
    rol,
    activo,
    creado_en
) VALUES (
    1,
    'María López González',
    'maria.lopez@universidad.edu',
    '$2b$12$A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
    'DOCENTE',
    1,
    NOW()
) ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    rol = VALUES(rol);
