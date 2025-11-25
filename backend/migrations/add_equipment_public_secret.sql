-- Agregar columna public_secret a la tabla equipment
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS public_secret VARCHAR(8);

-- Generar secrets para equipos existentes
UPDATE equipment 
SET public_secret = substr(md5(random()::text), 1, 8)
WHERE public_secret IS NULL;

-- Hacer la columna NOT NULL después de llenar los valores
ALTER TABLE equipment ALTER COLUMN public_secret SET NOT NULL;
