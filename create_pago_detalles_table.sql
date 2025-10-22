-- Crear tabla para detalles de pagos parciales
CREATE TABLE IF NOT EXISTS pago_detalles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id uuid REFERENCES pagos(id) ON DELETE CASCADE NOT NULL,
  tipo_detalle text NOT NULL CHECK (tipo_detalle IN ('transferencia', 'efectivo')),
  valor numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla para distribución de pagos en bolsillos
CREATE TABLE IF NOT EXISTS pago_distribuciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id uuid REFERENCES pagos(id) ON DELETE CASCADE NOT NULL,
  bolsillo_id uuid REFERENCES bolsillos(id) ON DELETE CASCADE NOT NULL,
  valor_asignado numeric(10,2) NOT NULL DEFAULT 0,
  es_distribucion_manual boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Agregar campos adicionales a la tabla pagos
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS observaciones text DEFAULT '';
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS tiene_detalles boolean DEFAULT false;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_pago_detalles_pago_id ON pago_detalles(pago_id);
CREATE INDEX IF NOT EXISTS idx_pago_distribuciones_pago_id ON pago_distribuciones(pago_id);
CREATE INDEX IF NOT EXISTS idx_pago_distribuciones_bolsillo_id ON pago_distribuciones(bolsillo_id);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE pago_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pago_distribuciones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pago_detalles
CREATE POLICY "Users can manage payment details of own motorcycles" ON pago_detalles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pagos
      JOIN motos ON motos.id = pagos.moto_id
      WHERE pagos.id = pago_detalles.pago_id
      AND motos.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pagos
      JOIN motos ON motos.id = pagos.moto_id
      WHERE pagos.id = pago_detalles.pago_id
      AND motos.user_id = auth.uid()
    )
  );

-- Políticas RLS para pago_distribuciones
CREATE POLICY "Users can manage payment distributions of own motorcycles" ON pago_distribuciones
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pagos
      JOIN motos ON motos.id = pagos.moto_id
      WHERE pagos.id = pago_distribuciones.pago_id
      AND motos.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pagos
      JOIN motos ON motos.id = pagos.moto_id
      WHERE pagos.id = pago_distribuciones.pago_id
      AND motos.user_id = auth.uid()
    )
  );

-- Vista para consultar pagos con sus detalles
CREATE OR REPLACE VIEW vista_pagos_completos AS
SELECT 
  p.id as pago_id,
  p.moto_id,
  p.fecha_pago,
  p.tipo_pago,
  p.valor_pagado,
  p.observaciones,
  p.tiene_detalles,
  p.created_at,
  -- Detalles de transferencia y efectivo
  COALESCE(
    (SELECT valor FROM pago_detalles WHERE pago_id = p.id AND tipo_detalle = 'transferencia'), 
    CASE WHEN p.tipo_pago = 'total' THEN p.valor_pagado ELSE 0 END
  ) as valor_transferencia,
  COALESCE(
    (SELECT valor FROM pago_detalles WHERE pago_id = p.id AND tipo_detalle = 'efectivo'), 
    0
  ) as valor_efectivo,
  -- Información de distribución
  (SELECT COUNT(*) FROM pago_distribuciones WHERE pago_id = p.id AND es_distribucion_manual = true) > 0 as es_distribucion_manual
FROM pagos p;

-- Vista para consultar distribución de pagos por bolsillo
CREATE OR REPLACE VIEW vista_pago_distribuciones AS
SELECT 
  pd.pago_id,
  pd.bolsillo_id,
  b.nombre as bolsillo_nombre,
  pd.valor_asignado,
  pd.es_distribucion_manual,
  p.fecha_pago,
  p.tipo_pago,
  p.valor_pagado as total_pago
FROM pago_distribuciones pd
JOIN bolsillos b ON b.id = pd.bolsillo_id
JOIN pagos p ON p.id = pd.pago_id;