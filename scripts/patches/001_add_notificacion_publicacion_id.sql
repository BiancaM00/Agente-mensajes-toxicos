-- Migration: Add publicacion_id to notificacion table and foreign key
ALTER TABLE notificacion
  ADD COLUMN publicacion_id INT NULL AFTER creado_en;

-- Add foreign key if publicacion table exists
ALTER TABLE notificacion
  ADD CONSTRAINT fk_notificacion_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicacion(id) ON DELETE SET NULL;

-- Optional: index for quicker lookup
CREATE INDEX idx_notificacion_publicacion ON notificacion(publicacion_id);
