-- Add modelo column to motos table
ALTER TABLE motos ADD COLUMN IF NOT EXISTS modelo text DEFAULT '';