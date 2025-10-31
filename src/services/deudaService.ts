import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Deuda = Database['public']['Tables']['deudas']['Row'];
type DeudaInsert = Database['public']['Tables']['deudas']['Insert'];

export const getDeudas = async (motoId: string): Promise<Deuda[]> => {
  const { data, error } = await supabase
    .from('deudas')
    .select('*')
    .eq('moto_id', motoId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createDeuda = async (deuda: DeudaInsert): Promise<Deuda> => {
  const { data, error } = await supabase
    .from('deudas')
    .insert({
      ...deuda,
      saldo_actual: deuda.valor_inicial
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateDeuda = async (id: string, updates: Partial<DeudaInsert>): Promise<Deuda> => {
  const { data, error } = await supabase
    .from('deudas')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteDeuda = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('deudas')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const createMovimientoDeuda = async (
  deudaId: string,
  tipo: 'abono' | 'cargo',
  valor: number,
  observacion: string,
  bolsillos?: { bolsilloId: string; valor: number }[]
): Promise<void> => {
  const { data: deuda, error: deudaError } = await supabase
    .from('deudas')
    .select('saldo_actual')
    .eq('id', deudaId)
    .single();

  if (deudaError) throw deudaError;

  const nuevoSaldo = tipo === 'abono' 
    ? deuda.saldo_actual - valor 
    : deuda.saldo_actual + valor;

  // Crear movimiento de deuda
  const { data: movimiento, error: movError } = await supabase
    .from('movimientos_deudas')
    .insert({
      deuda_id: deudaId,
      tipo_movimiento: tipo,
      valor,
      observacion
    })
    .select()
    .single();

  if (movError) throw movError;

  // Actualizar saldo de la deuda
  const { error: updateError } = await supabase
    .from('deudas')
    .update({ 
      saldo_actual: nuevoSaldo,
      updated_at: new Date().toISOString()
    })
    .eq('id', deudaId);

  if (updateError) throw updateError;

  // Si es abono y hay bolsillos, descontar de bolsillos
  if (tipo === 'abono' && bolsillos && bolsillos.length > 0) {
    for (const bolsillo of bolsillos) {
      // Registrar movimiento de bolsillo a deuda
      const { error: bolsilloMovError } = await supabase
        .from('movimientos_deudas_bolsillos')
        .insert({
          movimiento_deuda_id: movimiento.id,
          bolsillo_id: bolsillo.bolsilloId,
          valor_descontado: bolsillo.valor
        });

      if (bolsilloMovError) throw bolsilloMovError;

      // Descontar del saldo del bolsillo
      const { data: bolsilloData, error: getBolsilloError } = await supabase
        .from('bolsillos')
        .select('saldo_actual')
        .eq('id', bolsillo.bolsilloId)
        .single();

      if (getBolsilloError) throw getBolsilloError;

      const { error: updateBolsilloError } = await supabase
        .from('bolsillos')
        .update({ 
          saldo_actual: bolsilloData.saldo_actual - bolsillo.valor,
          updated_at: new Date().toISOString()
        })
        .eq('id', bolsillo.bolsilloId);

      if (updateBolsilloError) throw updateBolsilloError;

      // Crear movimiento en tabla movimientos
      const { error: movimientoError } = await supabase
        .from('movimientos')
        .insert({
          bolsillo_id: bolsillo.bolsilloId,
          tipo_movimiento: 'descarga',
          valor: bolsillo.valor,
          observacion: `Abono a deuda: ${observacion}`,
          fecha: new Date().toISOString()
        });

      if (movimientoError) throw movimientoError;
    }
  }
};

export const getMovimientosDeuda = async (deudaId: string) => {
  const { data, error } = await supabase
    .from('movimientos_deudas')
    .select(`
      *,
      movimientos_deudas_bolsillos (
        valor_descontado,
        bolsillos (
          nombre
        )
      )
    `)
    .eq('deuda_id', deudaId)
    .order('fecha', { ascending: false });

  if (error) throw error;
  return data || [];
};