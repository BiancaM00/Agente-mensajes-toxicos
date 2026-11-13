-- Script de inicialización de la Base de Datos
-- Sistema Inteligente de Moderación en Foros Académicos (RAU)
-- Ejecutar en MySQL 8.0+

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS rau_toxicity
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE rau_toxicity;

-- ─── Tabla: Instituciones ───
CREATE TABLE institucion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    dominio VARCHAR(100) UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dominio (dominio)
);

-- ─── Tabla: Usuarios ───
CREATE TABLE usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institucion_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('ESTUDIANTE','DOCENTE','ADMIN_INSTITUCIONAL') NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institucion_id) REFERENCES institucion(id),
    INDEX idx_email (email),
    INDEX idx_rol (rol),
    INDEX idx_activo (activo)
);

-- ─── Tabla: Cursos ───
CREATE TABLE curso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institucion_id INT NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    periodo VARCHAR(20) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institucion_id) REFERENCES institucion(id),
    UNIQUE KEY uq_curso (institucion_id, codigo, periodo),
    INDEX idx_institucion (institucion_id)
);

-- ─── Tabla: Matrículas ───
CREATE TABLE matricula (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    curso_id INT NOT NULL,
    rol_en_curso ENUM('ESTUDIANTE','DOCENTE') NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    FOREIGN KEY (curso_id) REFERENCES curso(id),
    UNIQUE KEY uq_matricula (usuario_id, curso_id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_curso (curso_id)
);

-- ─── Tabla: Foros ───
CREATE TABLE foro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso_id INT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES curso(id),
    INDEX idx_curso (curso_id)
);

-- ─── Tabla: Hilos ───
CREATE TABLE hilo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    foro_id INT NOT NULL,
    titulo VARCHAR(300) NOT NULL,
    creado_por INT NOT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (foro_id) REFERENCES foro(id),
    FOREIGN KEY (creado_por) REFERENCES usuario(id),
    INDEX idx_foro (foro_id),
    INDEX idx_creado_por (creado_por)
);

-- ─── Tabla: Publicaciones ───
CREATE TABLE publicacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hilo_id INT NOT NULL,
    autor_id INT NOT NULL,
    contenido LONGTEXT NOT NULL,
    estado ENUM('PENDIENTE_ANALISIS','APROBADO','PENDIENTE_REVISION','RECHAZADO') DEFAULT 'PENDIENTE_ANALISIS',
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hilo_id) REFERENCES hilo(id) ON DELETE CASCADE,
    FOREIGN KEY (autor_id) REFERENCES usuario(id),
    INDEX idx_hilo (hilo_id),
    INDEX idx_autor (autor_id),
    INDEX idx_estado (estado),
    INDEX idx_creado_en (creado_en)
);

-- ─── Tabla: Evaluaciones de Toxicidad ───
CREATE TABLE evaluacion_toxicidad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    publicacion_id INT NOT NULL UNIQUE,
    score FLOAT NOT NULL,
    riesgo ENUM('BAJO','MEDIO','ALTO') NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    evaluado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (publicacion_id) REFERENCES publicacion(id) ON DELETE CASCADE,
    INDEX idx_riesgo (riesgo),
    INDEX idx_evaluado_en (evaluado_en)
);

-- ─── Tabla: Casos de Moderación ───
CREATE TABLE caso_moderacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    publicacion_id INT NOT NULL UNIQUE,
    moderador_id INT NOT NULL,
    estado ENUM('ABIERTO','APROBADO','RECHAZADO') DEFAULT 'ABIERTO',
    observacion LONGTEXT,
    abierto_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    resuelto_en DATETIME,
    FOREIGN KEY (publicacion_id) REFERENCES publicacion(id) ON DELETE CASCADE,
    FOREIGN KEY (moderador_id) REFERENCES usuario(id),
    INDEX idx_moderador (moderador_id),
    INDEX idx_estado (estado),
    INDEX idx_abierto_en (abierto_en)
);

-- ─── Tabla: Notificaciones ───
CREATE TABLE notificacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo ENUM('COMENTARIO_MARCADO','REVISION_PENDIENTE','CASO_RESUELTO') NOT NULL,
    mensaje LONGTEXT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    publicacion_id INT DEFAULT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (publicacion_id) REFERENCES publicacion(id) ON DELETE SET NULL,
    INDEX idx_usuario (usuario_id),
    INDEX idx_leido (leido),
    INDEX idx_creado_en (creado_en)
);

-- ─── Tabla: Refresh Tokens ───
CREATE TABLE refresh_token (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expira_en DATETIME NOT NULL,
    revocado BOOLEAN DEFAULT FALSE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_revocado (revocado),
    INDEX idx_expira_en (expira_en)
);

-- ─── Insertar Institución de Ejemplo ───
INSERT INTO institucion (nombre, dominio)
VALUES ('Universidad Tecnológica de Bolívar', 'utm.edu.co');

-- ─── Insertar Usuarios de Ejemplo ───
INSERT INTO usuario (institucion_id, nombre, email, password_hash, rol)
VALUES
  (1, 'Admin Sistema', 'admin@utm.edu.co', '$2b$12$abcdefghijklmnopqrstuvwxyz', 'ADMIN_INSTITUCIONAL'),
  (1, 'Dr. García', 'garcia@utm.edu.co', '$2b$12$abcdefghijklmnopqrstuvwxyz', 'DOCENTE'),
  (1, 'Sofía Mejía', 'sofia@utm.edu.co', '$2b$12$abcdefghijklmnopqrstuvwxyz', 'ESTUDIANTE'),
  (1, 'Juan Pérez', 'juan@utm.edu.co', '$2b$12$abcdefghijklmnopqrstuvwxyz', 'ESTUDIANTE');

-- ─── Insertar Curso de Ejemplo ───
INSERT INTO curso (institucion_id, codigo, nombre, periodo)
VALUES (1, 'ING-301', 'Ingeniería de Software I', 'II-2026');

-- ─── Insertar Matrículas de Ejemplo ───
INSERT INTO matricula (usuario_id, curso_id, rol_en_curso)
VALUES
  (2, 1, 'DOCENTE'),   -- Dr. García es docente
  (3, 1, 'ESTUDIANTE'), -- Sofía es estudiante
  (4, 1, 'ESTUDIANTE'); -- Juan es estudiante

-- ─── Insertar Foro de Ejemplo ───
INSERT INTO foro (curso_id, titulo)
VALUES (1, 'General - Dudas sobre el curso');

-- ─── Insertar Hilo de Ejemplo ───
INSERT INTO hilo (foro_id, titulo, creado_por)
VALUES (1, '¿Cuál es la entrega final?', 3);

COMMIT;

SET FOREIGN_KEY_CHECKS=1;

-- Mostrar confirmación
SELECT
  (SELECT COUNT(*) FROM usuario) as total_usuarios,
  (SELECT COUNT(*) FROM curso) as total_cursos,
  (SELECT COUNT(*) FROM matricula) as total_matriculas,
  (SELECT COUNT(*) FROM foro) as total_foros;
