export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      motos: {
        Row: {
          id: string
          user_id: string
          placa: string
          modelo: string
          color: string
          cilindraje: number
          tipo_pago: 'semanal' | 'mensual'
          valor_cuota: number
          foto_url: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          placa: string
          modelo?: string
          color?: string
          cilindraje?: number
          tipo_pago: 'semanal' | 'mensual'
          valor_cuota: number
          foto_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          placa?: string
          modelo?: string
          color?: string
          cilindraje?: number
          tipo_pago?: 'semanal' | 'mensual'
          valor_cuota?: number
          foto_url?: string
          created_at?: string
          updated_at?: string
        }
      }
      bolsillos: {
        Row: {
          id: string
          moto_id: string
          nombre: string
          tipo_descuento: 'porcentaje' | 'valor_fijo'
          valor_descuento: number
          saldo_actual: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          moto_id: string
          nombre: string
          tipo_descuento: 'porcentaje' | 'valor_fijo'
          valor_descuento: number
          saldo_actual?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          moto_id?: string
          nombre?: string
          tipo_descuento?: 'porcentaje' | 'valor_fijo'
          valor_descuento?: number
          saldo_actual?: number
          created_at?: string
          updated_at?: string
        }
      }
      pagos: {
        Row: {
          id: string
          moto_id: string
          fecha_pago: string
          tipo_pago: 'total' | 'parcial'
          valor_pagado: number
          observaciones: string
          tiene_detalles: boolean
          created_at: string
        }
        Insert: {
          id?: string
          moto_id: string
          fecha_pago?: string
          tipo_pago: 'total' | 'parcial'
          valor_pagado: number
          observaciones?: string
          tiene_detalles?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          moto_id?: string
          fecha_pago?: string
          tipo_pago?: 'total' | 'parcial'
          valor_pagado?: number
          observaciones?: string
          tiene_detalles?: boolean
          created_at?: string
        }
      }
      movimientos: {
        Row: {
          id: string
          bolsillo_id: string
          bolsillo_origen_id: string | null
          bolsillo_destino_id: string | null
          tipo_movimiento: 'carga' | 'descarga' | 'transferencia'
          valor: number
          fecha: string
          observacion: string
          created_at: string
        }
        Insert: {
          id?: string
          bolsillo_id: string
          bolsillo_origen_id?: string | null
          bolsillo_destino_id?: string | null
          tipo_movimiento: 'carga' | 'descarga' | 'transferencia'
          valor: number
          fecha?: string
          observacion?: string
          created_at?: string
        }
        Update: {
          id?: string
          bolsillo_id?: string
          bolsillo_origen_id?: string | null
          bolsillo_destino_id?: string | null
          tipo_movimiento?: 'carga' | 'descarga' | 'transferencia'
          valor?: number
          fecha?: string
          observacion?: string
          created_at?: string
        }
      }
      pago_detalles: {
        Row: {
          id: string
          pago_id: string
          tipo_detalle: 'transferencia' | 'efectivo'
          valor: number
          created_at: string
        }
        Insert: {
          id?: string
          pago_id: string
          tipo_detalle: 'transferencia' | 'efectivo'
          valor: number
          created_at?: string
        }
        Update: {
          id?: string
          pago_id?: string
          tipo_detalle?: 'transferencia' | 'efectivo'
          valor?: number
          created_at?: string
        }
      }
      pago_distribuciones: {
        Row: {
          id: string
          pago_id: string
          bolsillo_id: string
          valor_asignado: number
          es_distribucion_manual: boolean
          created_at: string
        }
        Insert: {
          id?: string
          pago_id: string
          bolsillo_id: string
          valor_asignado: number
          es_distribucion_manual?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          pago_id?: string
          bolsillo_id?: string
          valor_asignado?: number
          es_distribucion_manual?: boolean
          created_at?: string
        }
      }
      deudas: {
        Row: {
          id: string
          moto_id: string
          descripcion: string
          valor_inicial: number
          saldo_actual: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          moto_id: string
          descripcion: string
          valor_inicial: number
          saldo_actual?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          moto_id?: string
          descripcion?: string
          valor_inicial?: number
          saldo_actual?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
