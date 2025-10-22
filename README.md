# Sistema de Gestión de Pagos de Motos

Sistema web para gestionar pagos de motos con distribución automática en bolsillos configurables.

## 🚀 Características

- **Gestión de Motos**: Registro y edición de motocicletas con información detallada
- **Sistema de Bolsillos**: Configuración de bolsillos con distribución por porcentaje o valor fijo
- **Pagos Flexibles**: 
  - Pagos totales (valor completo de la cuota)
  - Pagos parciales (transferencia + efectivo)
  - Distribución manual cuando el pago no cubre el total
- **Movimientos**: Transferencias entre bolsillos y retiros
- **Reportes**: Visualización de estadísticas, historial de pagos y movimientos
- **Responsive**: Diseño adaptable para dispositivos móviles

## 🛠️ Tecnologías

- **Frontend**: React + TypeScript + Vite
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Iconos**: Lucide React

## 📋 Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase

## ⚙️ Configuración

1. **Clonar el repositorio**
```bash
git clone <url-del-repositorio>
cd project
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
Crear archivo `.env.local`:
```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

4. **Configurar base de datos**
Ejecutar los siguientes scripts SQL en Supabase:

```sql
-- Tabla motos
CREATE TABLE motos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  placa VARCHAR(10) NOT NULL,
  modelo VARCHAR(100),
  color VARCHAR(50),
  cilindraje INTEGER,
  tipo_pago VARCHAR(20) CHECK (tipo_pago IN ('semanal', 'mensual')),
  valor_cuota DECIMAL(10,2) NOT NULL,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla bolsillos
CREATE TABLE bolsillos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  moto_id UUID REFERENCES motos(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  tipo_descuento VARCHAR(20) CHECK (tipo_descuento IN ('porcentaje', 'valor_fijo')),
  valor_descuento DECIMAL(10,2) NOT NULL,
  saldo_actual DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla pagos
CREATE TABLE pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  moto_id UUID REFERENCES motos(id) ON DELETE CASCADE,
  fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tipo_pago VARCHAR(20) CHECK (tipo_pago IN ('total', 'parcial')),
  valor_pagado DECIMAL(10,2) NOT NULL,
  observaciones TEXT,
  tiene_detalles BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla pago_detalles
CREATE TABLE pago_detalles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pago_id UUID REFERENCES pagos(id) ON DELETE CASCADE,
  tipo_detalle VARCHAR(20) CHECK (tipo_detalle IN ('transferencia', 'efectivo')),
  valor DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla pago_distribuciones
CREATE TABLE pago_distribuciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pago_id UUID REFERENCES pagos(id) ON DELETE CASCADE,
  bolsillo_id UUID REFERENCES bolsillos(id) ON DELETE CASCADE,
  valor_asignado DECIMAL(10,2) NOT NULL,
  es_distribucion_manual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla movimientos
CREATE TABLE movimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bolsillo_id UUID REFERENCES bolsillos(id) ON DELETE CASCADE,
  bolsillo_origen_id UUID REFERENCES bolsillos(id),
  bolsillo_destino_id UUID REFERENCES bolsillos(id),
  tipo_movimiento VARCHAR(20) CHECK (tipo_movimiento IN ('carga', 'descarga', 'transferencia')),
  valor DECIMAL(10,2) NOT NULL,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  observacion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

5. **Configurar RLS (Row Level Security)**
```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE motos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bolsillos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pago_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pago_distribuciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad (ejemplo para motos)
CREATE POLICY "Users can view own motos" ON motos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own motos" ON motos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own motos" ON motos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own motos" ON motos FOR DELETE USING (auth.uid() = user_id);
```

## 🚀 Ejecutar el proyecto

```bash
npm run dev
```

El proyecto estará disponible en `http://localhost:5173`

## 📱 Funcionalidades Principales

### Gestión de Motos
- Crear, editar y eliminar motocicletas
- Campos: placa, modelo, color, cilindraje, tipo de pago, valor de cuota

### Sistema de Bolsillos
- Configurar bolsillos con distribución por porcentaje o valor fijo
- Visualizar saldos actuales
- Historial de movimientos por bolsillo

### Registro de Pagos
- **Pago Total**: Valor completo de la cuota
- **Pago Parcial**: Combinación de transferencia y efectivo
- **Distribución Manual**: Cuando el pago parcial no cubre el total

### Movimientos
- Transferencias entre bolsillos
- Retiros de bolsillos
- Historial completo de movimientos

### Reportes
- Estadísticas generales
- Distribución de saldos por bolsillo
- Historial de pagos detallado
- Últimos 10 movimientos (transferencias y retiros)

## 🎨 Características de UI/UX

- Diseño responsive con Tailwind CSS
- Formato de números con separadores de miles
- Validaciones en tiempo real
- Modales para formularios
- Tablas con scroll horizontal en móviles
- Iconos intuitivos con Lucide React

## 📄 Licencia

Este proyecto es de uso privado.