import { supabase } from '../lib/supabase';
import { updateBolsillo } from './bolsilloService';
import type { Database } from '../lib/database.types';

type Mantenimiento = Database['public']['Tables']['mantenimientos']['Row'];
type MantenimientoInsert = Database['public']['Tables']['mantenimientos']['Insert'];

export const getMantenimientos = async (motoId: string): Promise<Mantenimiento[]> => {
  const { data, error } = await supabase
    .from('mantenimientos')
    .select('*')
    .eq('moto_id', motoId)
    .order('fecha', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createMantenimiento = async (
  mantenimiento: MantenimientoInsert,
  bolsillos: { bolsilloId: string; valor: number }[]
): Promise<void> => {
  // Validar que el total de bolsillos coincida con el valor total
  const totalBolsillos = bolsillos.reduce((sum, b) => sum + b.valor, 0);
  if (Math.abs(totalBolsillos - mantenimiento.valor_total) > 0.01) {
    throw new Error('El total de los bolsillos debe coincidir con el valor del mantenimiento');
  }

  // Obtener saldos actuales de los bolsillos
  const bolsilloIds = bolsillos.map(b => b.bolsilloId);
  const { data: bolsillosData, error: bolsillosError } = await supabase
    .from('bolsillos')
    .select('id, saldo_actual, nombre')
    .in('id', bolsilloIds);

  if (bolsillosError) throw bolsillosError;
  if (!bolsillosData || bolsillosData.length !== bolsillos.length) {
    throw new Error('No se encontraron todos los bolsillos');
  }

  // Validar saldos suficientes
  for (const bolsillo of bolsillos) {
    const bolsilloData = bolsillosData.find(b => b.id === bolsillo.bolsilloId);
    if (!bolsilloData) {
      throw new Error('Bolsillo no encontrado');
    }
    if (bolsilloData.saldo_actual < bolsillo.valor) {
      throw new Error(`Saldo insuficiente en bolsillo ${bolsilloData.nombre}`);
    }
  }

  // Crear mantenimiento
  const { data: nuevoMantenimiento, error: mantenimientoError } = await supabase
    .from('mantenimientos')
    .insert(mantenimiento)
    .select()
    .single();

  if (mantenimientoError) throw mantenimientoError;

  // Crear detalles de bolsillos y actualizar saldos
  const detallesBolsillos = [];
  const movimientos = [];
  const fechaMovimiento = new Date().toISOString();

  for (const bolsillo of bolsillos) {
    const bolsilloData = bolsillosData.find(b => b.id === bolsillo.bolsilloId)!;
    
    // Actualizar saldo del bolsillo
    await updateBolsillo(bolsillo.bolsilloId, {
      saldo_actual: bolsilloData.saldo_actual - bolsillo.valor
    });

    // Preparar detalle
    detallesBolsillos.push({
      mantenimiento_id: nuevoMantenimiento.id,
      bolsillo_id: bolsillo.bolsilloId,
      valor_descontado: bolsillo.valor
    });

    // Preparar movimiento
    movimientos.push({
      bolsillo_id: bolsillo.bolsilloId,
      tipo_movimiento: 'descarga',
      valor: bolsillo.valor,
      fecha: fechaMovimiento,
      observacion: `Mantenimiento: ${mantenimiento.descripcion}`
    });
  }

  // Insertar detalles de bolsillos
  const { error: detallesError } = await supabase
    .from('mantenimientos_bolsillos')
    .insert(detallesBolsillos);

  if (detallesError) throw detallesError;

  // Insertar movimientos
  const { error: movimientosError } = await supabase
    .from('movimientos')
    .insert(movimientos);

  if (movimientosError) throw movimientosError;
};

export const deleteMantenimiento = async (id: string): Promise<void> => {
  // Obtener mantenimiento con detalles
  const { data: mantenimiento, error: mantenimientoError } = await supabase
    .from('mantenimientos')
    .select(`
      *,
      mantenimientos_bolsillos (
        bolsillo_id,
        valor_descontado
      )
    `)
    .eq('id', id)
    .single();

  if (mantenimientoError) throw mantenimientoError;
  if (!mantenimiento) throw new Error('Mantenimiento no encontrado');

  // Revertir saldos de bolsillos
  for (const detalle of mantenimiento.mantenimientos_bolsillos) {
    const { data: bolsillo, error: bolsilloError } = await supabase
      .from('bolsillos')
      .select('saldo_actual')
      .eq('id', detalle.bolsillo_id)
      .single();

    if (bolsilloError) throw bolsilloError;
    if (bolsillo) {
      await updateBolsillo(detalle.bolsillo_id, {
        saldo_actual: bolsillo.saldo_actual + detalle.valor_descontado
      });
    }
  }

  // Eliminar movimientos relacionados
  await supabase
    .from('movimientos')
    .delete()
    .eq('observacion', `Mantenimiento: ${mantenimiento.descripcion}`);

  // Eliminar mantenimiento (los detalles se eliminan por CASCADE)
  const { error: deleteError } = await supabase
    .from('mantenimientos')
    .delete()
    .eq('id', id);

  if (deleteError) throw deleteError;
};