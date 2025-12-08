-- Migration 018: Add Geolocation Fields to Clientes
-- Description: Add latitude, longitude, and geocoding metadata to clientes_fornecedores table
-- Date: 2025-12-08

-- Add geolocation fields
ALTER TABLE clientes_fornecedores 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS geocoding_source VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS geocoding_precision VARCHAR(20) DEFAULT 'address';

-- Create index for efficient geolocation queries
CREATE INDEX IF NOT EXISTS idx_clientes_lat_lng 
ON clientes_fornecedores (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create index for geocoded clients
CREATE INDEX IF NOT EXISTS idx_clientes_geocoded 
ON clientes_fornecedores (geocoded_at)
WHERE geocoded_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN clientes_fornecedores.latitude IS 'Latitude in decimal degrees (WGS84)';
COMMENT ON COLUMN clientes_fornecedores.longitude IS 'Longitude in decimal degrees (WGS84)';
COMMENT ON COLUMN clientes_fornecedores.geocoded_at IS 'Timestamp of last successful geocoding';
COMMENT ON COLUMN clientes_fornecedores.geocoding_source IS 'Source of geocoding (manual, api, cep, brasilapi)';
COMMENT ON COLUMN clientes_fornecedores.geocoding_precision IS 'Precision of geocoding (exact, street, city, approximate)';
