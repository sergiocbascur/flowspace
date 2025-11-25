-- Agregar coordenadas geográficas a la tabla equipment
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS geofence_radius INTEGER DEFAULT 50;

-- Eliminar la columna public_secret ya que usaremos geocerca
ALTER TABLE equipment DROP COLUMN IF EXISTS public_secret;

-- Comentarios
COMMENT ON COLUMN equipment.latitude IS 'Latitud de la ubicación del equipo';
COMMENT ON COLUMN equipment.longitude IS 'Longitud de la ubicación del equipo';
COMMENT ON COLUMN equipment.geofence_radius IS 'Radio de la geocerca en metros (por defecto 50m)';
