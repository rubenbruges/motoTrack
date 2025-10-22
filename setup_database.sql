-- MotoWallet Database Schema Completo
-- Ejecutar todo este código en SQL Editor de Supabase

-- Create motos table
CREATE TABLE IF NOT EXISTS motos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  placa text NOT NULL,
  modelo text DEFAULT '',
  color text DEFAULT '',
  cilindraje integer DEFAULT 0,
  tipo_pago text NOT NULL CHECK (tipo_pago IN ('semanal', 'mensual')),
  valor_cuota numeric(10,2) NOT NULL DEFAULT 0,
  foto_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bolsillos table
CREATE TABLE IF NOT EXISTS bolsillos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moto_id uuid REFERENCES motos(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  tipo_descuento text NOT NULL CHECK (tipo_descuento IN ('porcentaje', 'valor_fijo')),
  valor_descuento numeric(10,2) NOT NULL DEFAULT 0,
  saldo_actual numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pagos table
CREATE TABLE IF NOT EXISTS pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moto_id uuid REFERENCES motos(id) ON DELETE CASCADE NOT NULL,
  fecha_pago timestamptz DEFAULT now(),
  tipo_pago text NOT NULL CHECK (tipo_pago IN ('total', 'parcial')),
  valor_pagado numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create movimientos table
CREATE TABLE IF NOT EXISTS movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bolsillo_id uuid REFERENCES bolsillos(id) ON DELETE CASCADE NOT NULL,
  bolsillo_origen_id uuid REFERENCES bolsillos(id) ON DELETE SET NULL,
  bolsillo_destino_id uuid REFERENCES bolsillos(id) ON DELETE SET NULL,
  tipo_movimiento text NOT NULL CHECK (tipo_movimiento IN ('carga', 'descarga', 'transferencia')),
  valor numeric(10,2) NOT NULL DEFAULT 0,
  fecha timestamptz DEFAULT now(),
  observacion text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_motos_user_id ON motos(user_id);
CREATE INDEX IF NOT EXISTS idx_bolsillos_moto_id ON bolsillos(moto_id);
CREATE INDEX IF NOT EXISTS idx_pagos_moto_id ON pagos(moto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_bolsillo_id ON movimientos(bolsillo_id);

-- Enable Row Level Security
ALTER TABLE motos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bolsillos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for motos
CREATE POLICY "Users can manage own motorcycles" ON motos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for bolsillos
CREATE POLICY "Users can manage pockets of own motorcycles" ON bolsillos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = bolsillos.moto_id
      AND motos.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = bolsillos.moto_id
      AND motos.user_id = auth.uid()
    )
  );

-- RLS Policies for pagos
CREATE POLICY "Users can manage payments of own motorcycles" ON pagos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = pagos.moto_id
      AND motos.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = pagos.moto_id
      AND motos.user_id = auth.uid()
    )
  );

-- RLS Policies for movimientos
CREATE POLICY "Users can manage movements of own pockets" ON movimientos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bolsillos
      JOIN motos ON motos.id = bolsillos.moto_id
      WHERE bolsillos.id = movimientos.bolsillo_id
      AND motos.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bolsillos
      JOIN motos ON motos.id = bolsillos.moto_id
      WHERE bolsillos.id = movimientos.bolsillo_id
      AND motos.user_id = auth.uid()
    )
  );