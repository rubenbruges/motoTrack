import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { getBolsillos, updateBolsillo } from './bolsilloService';

type Pago = Database['public']['Tables']['pagos']['Row'];
type PagoInsert = Database['public']['Tables']['pagos']['Insert'];
type Movimiento = Database['public']['Tables']['movimientos']['Insert'];

export async function getPagos(motoId: string): Promise<Pago[]> {
  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .eq('moto_id', motoId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPago(pago: PagoInsert & { 
  distribucionManual?: { bolsilloId: string; valor: number }[],
  transferencia?: number,
  efectivo?: number,
  observaciones?: string
}): Promise<Pago> {
  const { distribucionManual, transferencia, efectivo, observaciones, ...pagoSinExtras } = pago;
  const bolsillos = await getBolsillos(pago.moto_id);

  if (bolsillos.length === 0) {
    throw new Error('No hay bolsillos configurados para esta moto');
  }

  // Solo validar si NO hay distribución manual
  if (!distribucionManual || distribucionManual.length === 0) {
    let totalPorcentaje = 0;
    let totalValorFijo = 0;

    bolsillos.forEach(b => {
      if (b.tipo_descuento === 'porcentaje') {
        totalPorcentaje += b.valor_descuento;
      } else {
        totalValorFijo += b.valor_descuento;
      }
    });

    if (totalPorcentaje > 100) {
      throw new Error('La suma de porcentajes excede el 100%');
    }

    if (totalValorFijo > pago.valor_pagado) {
      throw new Error('La suma de valores fijos excede el monto del pago');
    }
  }

  // Crear el pago principal
  const { data: pagoData, error: pagoError } = await supabase
    .from('pagos')
    .insert({
      ...pagoSinExtras,
      observaciones: observaciones || '',
      tiene_detalles: pago.tipo_pago === 'parcial' && ((transferencia && transferencia > 0) || (efectivo && efectivo > 0))
    })
    .select()
    .single();

  if (pagoError) throw pagoError;

  // Guardar detalles de transferencia/efectivo si es pago parcial
  if (pago.tipo_pago === 'parcial') {
    const detalles = [];
    if (transferencia && transferencia > 0) {
      detalles.push({ pago_id: pagoData.id, tipo_detalle: 'transferencia', valor: transferencia });
    }
    if (efectivo && efectivo > 0) {
      detalles.push({ pago_id: pagoData.id, tipo_detalle: 'efectivo', valor: efectivo });
    }
    
    if (detalles.length > 0) {
      const { error: detallesError } = await supabase
        .from('pago_detalles')
        .insert(detalles);
      if (detallesError) throw detallesError;
    }
  }

  // Procesar distribución en bolsillos
  const distribuciones = [];
  const movimientos: Movimiento[] = [];

  if (distribucionManual && distribucionManual.length > 0) {
    // Distribución manual
    for (const distribucion of distribucionManual) {
      if (distribucion.valor > 0) {
        const bolsillo = bolsillos.find(b => b.id === distribucion.bolsilloId);
        if (bolsillo) {
          const nuevoSaldo = bolsillo.saldo_actual + distribucion.valor;
          await updateBolsillo(bolsillo.id, { saldo_actual: nuevoSaldo });

          distribuciones.push({
            pago_id: pagoData.id,
            bolsillo_id: bolsillo.id,
            valor_asignado: distribucion.valor,
            es_distribucion_manual: true
          });

          movimientos.push({
            bolsillo_id: bolsillo.id,
            tipo_movimiento: 'carga',
            valor: distribucion.valor,
            fecha: pago.fecha_pago || new Date().toISOString(),
            observacion: `Pago parcial (distribución manual) - ID: ${pagoData.id}`,
          });
        }
      }
    }
  } else {
    // Distribución automática
    for (const bolsillo of bolsillos) {
      let montoAsignado = 0;

      if (bolsillo.tipo_descuento === 'porcentaje') {
        montoAsignado = (pago.valor_pagado * bolsillo.valor_descuento) / 100;
      } else {
        montoAsignado = bolsillo.valor_descuento;
      }

      const nuevoSaldo = bolsillo.saldo_actual + montoAsignado;
      await updateBolsillo(bolsillo.id, { saldo_actual: nuevoSaldo });

      distribuciones.push({
        pago_id: pagoData.id,
        bolsillo_id: bolsillo.id,
        valor_asignado: montoAsignado,
        es_distribucion_manual: false
      });

      movimientos.push({
        bolsillo_id: bolsillo.id,
        tipo_movimiento: 'carga',
        valor: montoAsignado,
        fecha: pago.fecha_pago || new Date().toISOString(),
        observacion: `Pago registrado - ID: ${pagoData.id}`,
      });
    }
  }

  // Guardar distribuciones
  if (distribuciones.length > 0) {
    const { error: distError } = await supabase
      .from('pago_distribuciones')
      .insert(distribuciones);
    if (distError) throw distError;
  }

  // Guardar movimientos
  const { error: movError } = await supabase
    .from('movimientos')
    .insert(movimientos);
  if (movError) throw movError;

  return pagoData;
}

export async function deletePago(id: string): Promise<void> {
  // Obtener el pago antes de eliminarlo
  const { data: pago, error: pagoError } = await supabase
    .from('pagos')
    .select('*')
    .eq('id', id)
    .single();

  if (pagoError) throw pagoError;
  if (!pago) throw new Error('Pago no encontrado');

  // Obtener los movimientos relacionados con este pago
  const { data: movimientos, error: movError } = await supabase
    .from('movimientos')
    .select('*')
    .like('observacion', `%ID: ${id}%`);

  if (movError) throw movError;

  // Revertir los saldos de los bolsillos
  if (movimientos && movimientos.length > 0) {
    for (const movimiento of movimientos) {
      const { data: bolsillo, error: bolsilloError } = await supabase
        .from('bolsillos')
        .select('saldo_actual')
        .eq('id', movimiento.bolsillo_id)
        .single();

      if (bolsilloError) throw bolsilloError;

      const nuevoSaldo = bolsillo.saldo_actual - movimiento.valor;
      await updateBolsillo(movimiento.bolsillo_id, { saldo_actual: nuevoSaldo });
    }

    // Eliminar los movimientos
    const { error: deleteMovError } = await supabase
      .from('movimientos')
      .delete()
      .like('observacion', `%ID: ${id}%`);

    if (deleteMovError) throw deleteMovError;
  }

  // Finalmente eliminar el pago
  const { error } = await supabase
    .from('pagos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Obtener detalles completos de un pago
export async function getPagoCompleto(pagoId: string) {
  const { data, error } = await supabase
    .from('vista_pagos_completos')
    .select('*')
    .eq('pago_id', pagoId)
    .single();

  if (error) throw error;
  return data;
}

// Obtener distribución de un pago por bolsillos
export async function getPagoDistribucion(pagoId: string) {
  const { data, error } = await supabase
    .from('vista_pago_distribuciones')
    .select('*')
    .eq('pago_id', pagoId);

  if (error) throw error;
  return data || [];
}

// Obtener todos los pagos con sus detalles
export async function getPagosCompletos(motoId: string) {
  const { data, error } = await supabase
    .from('vista_pagos_completos')
    .select('*')
    .eq('moto_id', motoId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
