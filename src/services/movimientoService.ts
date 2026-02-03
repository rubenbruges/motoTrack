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
  // Obtener bolsillos de la moto
  const { data: bolsillos, error: bolsillosError } = await supabase
    .from('bolsillos')
    .select('id, nombre')
    .eq('moto_id', motoId);
  
  if (bolsillosError) throw bolsillosError;
  if (!bolsillos || bolsillos.length === 0) return [];

  const bolsilloIds = bolsillos.map(b => b.id);

  // Obtener movimientos
  const { data: movimientos, error: movimientosError } = await supabase
    .from('movimientos')
    .select('fecha, tipo_movimiento, valor, bolsillo_id, bolsillo_origen_id, bolsillo_destino_id, observacion, es_retiro_multiple, es_reversion')
    .in('bolsillo_id', bolsilloIds)
    .or('tipo_movimiento.in.(transferencia,descarga),es_reversion.eq.true')
    .order('fecha', { ascending: false });
  
  if (movimientosError) throw movimientosError;
  if (!movimientos) return [];

  // Agrupar transferencias por fecha y bolsillos origen/destino
  const transferenciasAgrupadas = new Map();
  const otrosMovimientos = [];

  for (const mov of movimientos) {
    if (mov.tipo_movimiento === 'transferencia' && !mov.es_reversion) {
      const key = `${mov.fecha}-${mov.bolsillo_origen_id}-${mov.bolsillo_destino_id}`;
      
      if (!transferenciasAgrupadas.has(key)) {
        // Crear registro único de transferencia con valor positivo
        transferenciasAgrupadas.set(key, {
          fecha: mov.fecha,
          tipo_movimiento: 'transferencia',
          es_retiro_multiple: false,
          es_reversion: false,
          valor: Math.abs(mov.valor),
          bolsillo_origen: bolsillos.find(b => b.id === mov.bolsillo_origen_id)?.nombre || 'Bolsillo eliminado',
          bolsillo_destino: bolsillos.find(b => b.id === mov.bolsillo_destino_id)?.nombre || 'Bolsillo eliminado',
          descripcion: mov.observacion ? mov.observacion.replace(/^(Transferencia a otro bolsillo: |Transferencia desde otro bolsillo: )/, '') : ''
        });
      }
    } else {
      // Otros movimientos (descarga, reversiones)
      otrosMovimientos.push({
        fecha: mov.fecha,
        tipo_movimiento: mov.tipo_movimiento,
        es_retiro_multiple: mov.es_retiro_multiple,
        es_reversion: mov.es_reversion,
        valor: mov.valor,
        bolsillo_origen: mov.tipo_movimiento === 'descarga' ? bolsillos.find(b => b.id === mov.bolsillo_id)?.nombre || 'Bolsillo eliminado' : '',
        bolsillo_destino: '',
        descripcion: mov.observacion ? mov.observacion.replace(/^(Retiro: |Retiro múltiple: |Reversión de carga: |Reversión de retiro: |Reversión de transferencia: )/, '') : ''
      });
    }
  }

  // Combinar y ordenar por fecha
  const resultado = [...Array.from(transferenciasAgrupadas.values()), ...otrosMovimientos]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 10);
  
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

export async function createRetiroMultiple(
  retiros: { bolsilloId: string; valor: number }[],
  observacion: string
): Promise<void> {
  // Obtener saldos actuales de todos los bolsillos
  const bolsilloIds = retiros.map(r => r.bolsilloId);
  const { data: bolsillos, error: bolsillosError } = await supabase
    .from('bolsillos')
    .select('id, saldo_actual')
    .in('id', bolsilloIds);

  if (bolsillosError) throw bolsillosError;
  if (!bolsillos || bolsillos.length !== retiros.length) {
    throw new Error('No se encontraron todos los bolsillos');
  }

  // Validar saldos suficientes
  for (const retiro of retiros) {
    const bolsillo = bolsillos.find(b => b.id === retiro.bolsilloId);
    if (!bolsillo) {
      throw new Error('Bolsillo no encontrado');
    }
    if (bolsillo.saldo_actual < retiro.valor) {
      throw new Error(`Saldo insuficiente en bolsillo`);
    }
  }

  const fecha = new Date().toISOString();
  const movimientos = [];

  // Actualizar saldos y crear movimientos
  for (const retiro of retiros) {
    const bolsillo = bolsillos.find(b => b.id === retiro.bolsilloId)!;
    
    // Actualizar saldo
    await updateBolsillo(retiro.bolsilloId, { 
      saldo_actual: bolsillo.saldo_actual - retiro.valor 
    });

    // Preparar movimiento
    movimientos.push({
      bolsillo_id: retiro.bolsilloId,
      bolsillo_origen_id: retiro.bolsilloId,
      bolsillo_destino_id: null,
      tipo_movimiento: 'descarga',
      valor: retiro.valor,
      fecha,
      observacion: `Retiro múltiple: ${observacion}`,
      es_retiro_multiple: true
    });
  }

  // Insertar todos los movimientos
  const { error: movimientosError } = await supabase
    .from('movimientos')
    .insert(movimientos);

  if (movimientosError) throw movimientosError;
}

export async function revertirMovimiento(movimientoId: string): Promise<void> {
  // Obtener el movimiento original
  const { data: movimiento, error: movError } = await supabase
    .from('movimientos')
    .select('*')
    .eq('id', movimientoId)
    .single();

  if (movError) throw movError;
  if (!movimiento) throw new Error('Movimiento no encontrado');
  
  // Verificar que no sea una reversión
  if (movimiento.es_reversion) {
    throw new Error('No se puede revertir una reversión');
  }

  // Verificar que no esté ya revertido
  const { data: yaRevertido } = await supabase
    .from('movimientos')
    .select('id')
    .eq('movimiento_original_id', movimientoId)
    .single();

  if (yaRevertido) {
    throw new Error('Este movimiento ya fue revertido');
  }

  const fecha = new Date().toISOString();
  let movimientoReversion: MovimientoInsert;

  if (movimiento.tipo_movimiento === 'carga') {
    // Revertir carga = descarga
    const { data: bolsillo } = await supabase
      .from('bolsillos')
      .select('saldo_actual')
      .eq('id', movimiento.bolsillo_id)
      .single();

    if (!bolsillo || bolsillo.saldo_actual < movimiento.valor) {
      throw new Error('Saldo insuficiente para revertir');
    }

    await updateBolsillo(movimiento.bolsillo_id, { 
      saldo_actual: bolsillo.saldo_actual - movimiento.valor 
    });

    movimientoReversion = {
      bolsillo_id: movimiento.bolsillo_id,
      tipo_movimiento: 'descarga',
      valor: movimiento.valor,
      fecha,
      observacion: `Reversión de carga: ${movimiento.observacion}`,
      movimiento_original_id: movimientoId,
      es_reversion: true
    };
  } else if (movimiento.tipo_movimiento === 'descarga') {
    // Revertir descarga = carga
    const { data: bolsillo } = await supabase
      .from('bolsillos')
      .select('saldo_actual')
      .eq('id', movimiento.bolsillo_id)
      .single();

    if (!bolsillo) throw new Error('Bolsillo no encontrado');

    await updateBolsillo(movimiento.bolsillo_id, { 
      saldo_actual: bolsillo.saldo_actual + movimiento.valor 
    });

    movimientoReversion = {
      bolsillo_id: movimiento.bolsillo_id,
      tipo_movimiento: 'carga',
      valor: movimiento.valor,
      fecha,
      observacion: `Reversión de retiro: ${movimiento.observacion}`,
      movimiento_original_id: movimientoId,
      es_reversion: true
    };
  } else if (movimiento.tipo_movimiento === 'transferencia') {
    // Revertir transferencia = transferencia inversa
    const origenId = movimiento.valor > 0 ? movimiento.bolsillo_destino_id : movimiento.bolsillo_origen_id;
    const destinoId = movimiento.valor > 0 ? movimiento.bolsillo_origen_id : movimiento.bolsillo_destino_id;
    const valor = Math.abs(movimiento.valor);

    if (!origenId || !destinoId) {
      throw new Error('Datos de transferencia incompletos');
    }

    // Obtener saldos
    const { data: bolsillos } = await supabase
      .from('bolsillos')
      .select('id, saldo_actual')
      .in('id', [origenId, destinoId]);

    if (!bolsillos || bolsillos.length !== 2) {
      throw new Error('Bolsillos no encontrados');
    }

    const origen = bolsillos.find(b => b.id === origenId)!;
    const destino = bolsillos.find(b => b.id === destinoId)!;

    if (origen.saldo_actual < valor) {
      throw new Error('Saldo insuficiente para revertir transferencia');
    }

    // Actualizar saldos
    await updateBolsillo(origenId, { saldo_actual: origen.saldo_actual - valor });
    await updateBolsillo(destinoId, { saldo_actual: destino.saldo_actual + valor });

    // Crear movimientos de reversión
    await supabase.from('movimientos').insert([
      {
        bolsillo_id: origenId,
        bolsillo_origen_id: origenId,
        bolsillo_destino_id: destinoId,
        tipo_movimiento: 'transferencia',
        valor: -valor,
        fecha,
        observacion: `Reversión de transferencia: ${movimiento.observacion}`,
        movimiento_original_id: movimientoId,
        es_reversion: true
      },
      {
        bolsillo_id: destinoId,
        bolsillo_origen_id: origenId,
        bolsillo_destino_id: destinoId,
        tipo_movimiento: 'transferencia',
        valor: valor,
        fecha,
        observacion: `Reversión de transferencia: ${movimiento.observacion}`,
        movimiento_original_id: movimientoId,
        es_reversion: true
      }
    ]);
    return;
  } else {
    throw new Error('Tipo de movimiento no soportado para reversión');
  }

  // Crear movimiento de reversión (para carga/descarga)
  await supabase.from('movimientos').insert(movimientoReversion);
}

export async function getMovimientos(motoId: string): Promise<Movimiento[]> {
  return getMovimientosByMoto(motoId);
}