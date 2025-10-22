/*
  # MotoWallet Database Schema

  1. New Tables
    - `motos` (motorcycles)
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `placa` (text, license plate)
      - `color` (text)
      - `cilindraje` (integer, engine displacement)
      - `tipo_pago` (text, payment type: 'semanal' or 'mensual')
      - `valor_cuota` (numeric, installment amount)
      - `foto_url` (text, optional photo URL)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `bolsillos` (pockets/funds)
      - `id` (uuid, primary key)
      - `moto_id` (uuid, foreign key to motos)
      - `nombre` (text, pocket name: SOAT, RTM, GPS, Ahorro, etc.)
      - `tipo_descuento` (text, 'porcentaje' or 'valor_fijo')
      - `valor_descuento` (numeric, percentage or fixed value)
      - `saldo_actual` (numeric, current balance)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `pagos` (payments)
      - `id` (uuid, primary key)
      - `moto_id` (uuid, foreign key to motos)
      - `fecha_pago` (timestamptz, payment date)
      - `tipo_pago` (text, 'total' or 'parcial')
      - `valor_pagado` (numeric, amount paid)
      - `created_at` (timestamptz)
    
    - `movimientos` (movements)
      - `id` (uuid, primary key)
      - `bolsillo_id` (uuid, foreign key to bolsillos)
      - `bolsillo_origen_id` (uuid, optional, foreign key to bolsillos)
      - `bolsillo_destino_id` (uuid, optional, foreign key to bolsillos)
      - `tipo_movimiento` (text, 'carga', 'descarga', 'transferencia')
      - `valor` (numeric, amount)
      - `fecha` (timestamptz)
      - `observacion` (text, optional notes)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Users can only access their own motorcycles and related data
*/

-- Create motos table
CREATE TABLE IF NOT EXISTS motos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  placa text NOT NULL,
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

-- Create indexes for better query performance
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
CREATE POLICY "Users can view own motorcycles"
  ON motos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own motorcycles"
  ON motos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own motorcycles"
  ON motos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own motorcycles"
  ON motos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for bolsillos
CREATE POLICY "Users can view pockets of own motorcycles"
  ON bolsillos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = bolsillos.moto_id
      AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pockets for own motorcycles"
  ON bolsillos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = bolsillos.moto_id
      AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pockets of own motorcycles"
  ON bolsillos FOR UPDATE
  TO authenticated
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

CREATE POLICY "Users can delete pockets of own motorcycles"
  ON bolsillos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = bolsillos.moto_id
      AND motos.user_id = auth.uid()
    )
  );

-- RLS Policies for pagos
CREATE POLICY "Users can view payments of own motorcycles"
  ON pagos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = pagos.moto_id
      AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments for own motorcycles"
  ON pagos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = pagos.moto_id
      AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments of own motorcycles"
  ON pagos FOR UPDATE
  TO authenticated
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

CREATE POLICY "Users can delete payments of own motorcycles"
  ON pagos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = pagos.moto_id
      AND motos.user_id = auth.uid()
    )
  );

-- RLS Policies for movimientos
CREATE POLICY "Users can view movements of own pockets"
  ON movimientos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bolsillos
      JOIN motos ON motos.id = bolsillos.moto_id
      WHERE bolsillos.id = movimientos.bolsillo_id
      AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert movements for own pockets"
  ON movimientos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bolsillos
      JOIN motos ON motos.id = bolsillos.moto_id
      WHERE bolsillos.id = movimientos.bolsillo_id
      AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update movements of own pockets"
  ON movimientos FOR UPDATE
  TO authenticated
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

CREATE POLICY "Users can delete movements of own pockets"
  ON movimientos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bolsillos
      JOIN motos ON motos.id = bolsillos.moto_id
      WHERE bolsillos.id = movimientos.bolsillo_id
      AND motos.user_id = auth.uid()
    )
  );