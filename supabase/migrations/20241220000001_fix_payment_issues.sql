-- Add pago_id to movimientos table for proper relationship
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS pago_id uuid REFERENCES pagos(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_movimientos_pago_id ON movimientos(pago_id);

-- Drop existing views if they exist
DROP VIEW IF EXISTS vista_pagos_completos;
DROP VIEW IF EXISTS vista_pago_distribuciones;

-- Create vista_pagos_completos view
CREATE VIEW vista_pagos_completos AS
SELECT 
  p.id as pago_id,
  p.moto_id,
  p.fecha_pago,
  p.tipo_pago,
  p.valor_pagado,
  p.observaciones,
  p.tiene_detalles,
  p.created_at,
  COALESCE(
    json_agg(
      json_build_object(
        'tipo_detalle', pd.tipo_detalle,
        'valor', pd.valor
      )
    ) FILTER (WHERE pd.id IS NOT NULL), 
    '[]'::json
  ) as detalles
FROM pagos p
LEFT JOIN pago_detalles pd ON p.id = pd.pago_id
GROUP BY p.id, p.moto_id, p.fecha_pago, p.tipo_pago, p.valor_pagado, p.observaciones, p.tiene_detalles, p.created_at;

-- Create vista_pago_distribuciones view
CREATE VIEW vista_pago_distribuciones AS
SELECT 
  pd.pago_id,
  pd.bolsillo_id,
  pd.valor_asignado,
  pd.es_distribucion_manual,
  b.nombre as bolsillo_nombre
FROM pago_distribuciones pd
JOIN bolsillos b ON pd.bolsillo_id = b.id;

-- Update RLS policies for new column
CREATE POLICY "Users can view movements with pago_id of own motorcycles"
  ON movimientos FOR SELECT
  TO authenticated
  USING (
    pago_id IS NULL OR
    EXISTS (
      SELECT 1 FROM pagos p
      JOIN motos m ON m.id = p.moto_id
      WHERE p.id = movimientos.pago_id
      AND m.user_id = auth.uid()
    )
  );