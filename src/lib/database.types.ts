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
      mantenimientos: {
        Row: {
          id: string
          moto_id: string
          fecha: string
          descripcion: string
          valor_total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          moto_id: string
          fecha: string
          descripcion: string
          valor_total: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          moto_id?: string
          fecha?: string
          descripcion?: string
          valor_total?: number
          created_at?: string
          updated_at?: string
        }
      }
      mantenimientos_bolsillos: {
        Row: {
          id: string
          mantenimiento_id: string
          bolsillo_id: string
          valor_descontado: number
          created_at: string
        }
        Insert: {
          id?: string
          mantenimiento_id: string
          bolsillo_id: string
          valor_descontado: number
          created_at?: string
        }
        Update: {
          id?: string
          mantenimiento_id?: string
          bolsillo_id?: string
          valor_descontado?: number
          created_at?: string
        }
      }
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
      movimientos: {
        Row: {
          id: string
          bolsillo_id: string | null
          bolsillo_origen_id: string | null
          bolsillo_destino_id: string | null
          tipo_movimiento: 'carga' | 'descarga' | 'transferencia' | 'deuda_abono' | 'deuda_cargo'
          valor: number
          fecha: string
          observacion: string
          movimiento_original_id: string | null
          es_reversion: boolean
          es_retiro_multiple: boolean | null
          deuda_id: string | null
          mantenimiento_id: string | null
          pago_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          bolsillo_id?: string | null
          bolsillo_origen_id?: string | null
          bolsillo_destino_id?: string | null
          tipo_movimiento: 'carga' | 'descarga' | 'transferencia' | 'deuda_abono' | 'deuda_cargo'
          valor: number
          fecha?: string
          observacion?: string
          movimiento_original_id?: string | null
          es_reversion?: boolean
          es_retiro_multiple?: boolean | null
          deuda_id?: string | null
          mantenimiento_id?: string | null
          pago_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          bolsillo_id?: string | null
          bolsillo_origen_id?: string | null
          bolsillo_destino_id?: string | null
          tipo_movimiento?: 'carga' | 'descarga' | 'transferencia' | 'deuda_abono' | 'deuda_cargo'
          valor?: number
          fecha?: string
          observacion?: string
          movimiento_original_id?: string | null
          es_reversion?: boolean
          es_retiro_multiple?: boolean | null
          deuda_id?: string | null
          mantenimiento_id?: string | null
          pago_id?: string | null
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
      user_preferences: {
        Row: {
          id: string
          user_id: string | null
          moto_id: string | null
          selected_bolsillos: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          moto_id?: string | null
          selected_bolsillos?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          moto_id?: string | null
          selected_bolsillos?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      vista_pago_distribuciones: {
        Row: {
          pago_id: string | null
          bolsillo_id: string | null
          valor_asignado: number | null
          es_distribucion_manual: boolean | null
          bolsillo_nombre: string | null
        }
      }
      vista_pagos_completos: {
        Row: {
          detalles: Json | null
          moto_id: string | null
          fecha_pago: string | null
          created_at: string | null
          pago_id: string | null
          valor_pagado: number | null
          tiene_detalles: boolean | null
          tipo_pago: string | null
          observaciones: string | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}