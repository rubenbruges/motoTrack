import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { updateBolsillo } from './bolsilloService';

type Movimiento = Database['public']['Tables']['movimientos']['Row'];
type MovimientoInsert = Database['public']['Tables']['movimientos']['Insert'];

export async function getMovimientosByBolsillo(bolsilloId: string): Promise<Movimiento[]> {
  const { data, error } = await supabase
    .from('movimientos')
    .select('*')
    .eq('bolsillo_id', bolsilloId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createMovimiento(movimiento: MovimientoInsert): Promise<Movimiento> {
  const { data, error } = await supabase
    .from('movimientos')
    .insert(movimiento)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMovimientosByMoto(motoId: string): Promise<Movimiento[]> {
  const { data, error } = await supabase
    .from('movimientos')
    .select(`
      *,
      bolsillos!inner(
        id,
        nombre,
        moto_id
      )
    `)
    .eq('bolsillos.moto_id', motoId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMovimientosReporte(motoId: string): Promise<any[]> {
  console.log('=== DEBUG MOVIMIENTOS REPORTE ===');
  console.log('1. MotoId recibido:', motoId);
  
  // Obtener bolsillos de la moto
  const { data: bolsillos, error: bolsillosError } = await supabase
    .from('bolsillos')
    .select('id, nombre')
    .eq('moto_id', motoId);

  console.log('2. Bolsillos query result:', { bolsillos, error: bolsillosError });
  
  if (bolsillosError) {
    console.error('Error en bolsillos:', bolsillosError);
    throw bolsillosError;
  }
  if (!bolsillos || bolsillos.length === 0) {
    console.log('3. No hay bolsillos, retornando array vacío');
    return [];
  }

  const bolsilloIds = bolsillos.map(b => b.id);
  console.log('4. IDs de bolsillos:', bolsilloIds);

  // Primero verificar TODOS los movimientos de estos bolsillos
  const { data: todosMovimientos, error: todosError } = await supabase
    .from('movimientos')
    .select('*')
    .in('bolsillo_id', bolsilloIds);
    
  console.log('5. TODOS los movimientos:', { todosMovimientos, error: todosError });

  // Solo movimientos de transferencia y descarga (retiros)
  const { data: movimientos, error: movimientosError } = await supabase
    .from('movimientos')
    .select('fecha, tipo_movimiento, valor, bolsillo_id, bolsillo_origen_id, bolsillo_destino_id, observacion')
    .in('bolsillo_id', bolsilloIds)
    .in('tipo_movimiento', ['transferencia', 'descarga'])
    .order('fecha', { ascending: false })
    .limit(10);

  console.log('6. Movimientos filtrados:', { movimientos, error: movimientosError });
  
  if (movimientosError) {
    console.error('Error en movimientos:', movimientosError);
    throw movimientosError;
  }
  if (!movimientos) {
    console.log('7. No hay movimientos, retornando array vacío');
    return [];
  }

  // Agregar nombres de bolsillos origen y destino
  const resultado = movimientos.map(mov => ({
    fecha: mov.fecha,
    tipo_movimiento: mov.tipo_movimiento,
    valor: mov.valor,
    bolsillo_origen: mov.bolsillo_origen_id ? bolsillos.find(b => b.id === mov.bolsillo_origen_id)?.nombre || 'Bolsillo eliminado' : mov.tipo_movimiento === 'descarga' ? bolsillos.find(b => b.id === mov.bolsillo_id)?.nombre || 'Bolsillo eliminado' : '',
    bolsillo_destino: mov.bolsillo_destino_id ? bolsillos.find(b => b.id === mov.bolsillo_destino_id)?.nombre || 'Bolsillo eliminado' : '',
    descripcion: mov.observacion ? mov.observacion.replace(/^(Transferencia a otro bolsillo: |Transferencia desde otro bolsillo: |Retiro: )/, '') : ''
  }));
  
  console.log('8. Resultado final:', resultado);
  console.log('=== FIN DEBUG ===');
  
  return resultado;
}

export async function createTransferencia(
  origenId: string,
  destinoId: string,
  valor: number,
  observacion: string
): Promise<void> {
  // Obtener saldos actuales
  const { data: bolsillos, error: bolsillosError } = await supabase
    .from('bolsillos')
    .select('id, saldo_actual')
    .in('id', [origenId, destinoId]);

  if (bolsillosError) throw bolsillosError;
  if (!bolsillos || bolsillos.length !== 2) {
    throw new Error('No se encontraron los bolsillos');
  }

  const origen = bolsillos.find(b => b.id === origenId);
  const destino = bolsillos.find(b => b.id === destinoId);

  if (!origen || !destino) {
    throw new Error('Bolsillos no válidos');
  }

  if (origen.saldo_actual < valor) {
    throw new Error('Saldo insuficiente en el bolsillo origen');
  }

  // Actualizar saldos
  await updateBolsillo(origenId, { saldo_actual: origen.saldo_actual - valor });
  await updateBolsillo(destinoId, { saldo_actual: destino.saldo_actual + valor });

  // Crear movimientos
  const fecha = new Date().toISOString();
  
  await supabase.from('movimientos').insert([
    {
      bolsillo_id: origenId,
      bolsillo_origen_id: origenId,
      bolsillo_destino_id: destinoId,
      tipo_movimiento: 'transferencia',
      valor: -valor,
      fecha,
      observacion: `Transferencia a otro bolsillo: ${observacion}`
    },
    {
      bolsillo_id: destinoId,
      bolsillo_origen_id: origenId,
      bolsillo_destino_id: destinoId,
      tipo_movimiento: 'transferencia',
      valor: valor,
      fecha,
      observacion: `Transferencia desde otro bolsillo: ${observacion}`
    }
  ]);
}

export async function createRetiro(
  bolsilloId: string,
  valor: number,
  observacion: string
): Promise<void> {
  // Obtener saldo actual
  const { data: bolsillo, error: bolsilloError } = await supabase
    .from('bolsillos')
    .select('saldo_actual')
    .eq('id', bolsilloId)
    .single();

  if (bolsilloError) throw bolsilloError;
  if (!bolsillo) {
    throw new Error('Bolsillo no encontrado');
  }

  if (bolsillo.saldo_actual < valor) {
    throw new Error('Saldo insuficiente');
  }

  // Actualizar saldo
  await updateBolsillo(bolsilloId, { saldo_actual: bolsillo.saldo_actual - valor });

  // Crear movimiento
  await supabase.from('movimientos').insert({
    bolsillo_id: bolsilloId,
    bolsillo_origen_id: bolsilloId,
    bolsillo_destino_id: null,
    tipo_movimiento: 'descarga',
    valor: valor,
    fecha: new Date().toISOString(),
    observacion: `Retiro: ${observacion}`
  });
}

export async function getMovimientos(motoId: string): Promise<Movimiento[]> {
  return getMovimientosByMoto(motoId);
}