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
  
  try {
    const bolsillos = await getBolsillos(pago.moto_id);

    if (bolsillos.length === 0) {
      throw new Error('No hay bolsillos configurados para esta moto');
    }

    // Validaciones
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

    // Preparar todas las operaciones
    const detalles = [];
    const distribuciones = [];
    const movimientos: (Movimiento & { pago_id?: string })[] = [];
    const bolsilloUpdates: { id: string; saldo_actual: number }[] = [];

    // Detalles de pago parcial
    if (pago.tipo_pago === 'parcial') {
      if (transferencia && transferencia > 0) {
        detalles.push({ pago_id: pagoData.id, tipo_detalle: 'transferencia', valor: transferencia });
      }
      if (efectivo && efectivo > 0) {
        detalles.push({ pago_id: pagoData.id, tipo_detalle: 'efectivo', valor: efectivo });
      }
    }

    // Procesar distribución
    if (distribucionManual && distribucionManual.length > 0) {
      for (const distribucion of distribucionManual) {
        if (distribucion.valor > 0) {
          const bolsillo = bolsillos.find(b => b.id === distribucion.bolsilloId);
          if (!bolsillo) {
            throw new Error(`Bolsillo no encontrado: ${distribucion.bolsilloId}`);
          }

          const nuevoSaldo = bolsillo.saldo_actual + distribucion.valor;
          bolsilloUpdates.push({ id: bolsillo.id, saldo_actual: nuevoSaldo });

          distribuciones.push({
            pago_id: pagoData.id,
            bolsillo_id: bolsillo.id,
            valor_asignado: distribucion.valor,
            es_distribucion_manual: true
          });

          movimientos.push({
            bolsillo_id: bolsillo.id,
            pago_id: pagoData.id,
            tipo_movimiento: 'carga',
            valor: distribucion.valor,
            fecha: pago.fecha_pago || new Date().toISOString(),
            observacion: 'Pago parcial (distribución manual)'
          });
        }
      }
    } else {
      for (const bolsillo of bolsillos) {
        let montoAsignado = 0;

        if (bolsillo.tipo_descuento === 'porcentaje') {
          montoAsignado = (pago.valor_pagado * bolsillo.valor_descuento) / 100;
        } else {
          montoAsignado = bolsillo.valor_descuento;
        }

        const nuevoSaldo = bolsillo.saldo_actual + montoAsignado;
        bolsilloUpdates.push({ id: bolsillo.id, saldo_actual: nuevoSaldo });

        distribuciones.push({
          pago_id: pagoData.id,
          bolsillo_id: bolsillo.id,
          valor_asignado: montoAsignado,
          es_distribucion_manual: false
        });

        movimientos.push({
          bolsillo_id: bolsillo.id,
          pago_id: pagoData.id,
          tipo_movimiento: 'carga',
          valor: montoAsignado,
          fecha: pago.fecha_pago || new Date().toISOString(),
          observacion: 'Pago registrado'
        });
      }
    }

    // Ejecutar todas las operaciones
    const supabasePromises = [];
    const bolsilloPromises = [];

    if (detalles.length > 0) {
      supabasePromises.push(supabase.from('pago_detalles').insert(detalles));
    }

    if (distribuciones.length > 0) {
      supabasePromises.push(supabase.from('pago_distribuciones').insert(distribuciones));
    }

    if (movimientos.length > 0) {
      supabasePromises.push(supabase.from('movimientos').insert(movimientos));
    }

    // Batch update bolsillos
    for (const update of bolsilloUpdates) {
      bolsilloPromises.push(updateBolsillo(update.id, { saldo_actual: update.saldo_actual }));
    }

    // Execute Supabase operations
    const supabaseResults = await Promise.all(supabasePromises);
    for (const result of supabaseResults) {
      if (result.error) throw result.error;
    }

    // Execute bolsillo updates
    await Promise.all(bolsilloPromises);

    return pagoData;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}

export async function deletePago(id: string): Promise<void> {
  try {
    // Obtener el pago antes de eliminarlo
    const { data: pago, error: pagoError } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', id)
      .single();

    if (pagoError) throw pagoError;
    if (!pago) throw new Error('Pago no encontrado');

    // Obtener los movimientos relacionados usando pago_id
    const { data: movimientos, error: movError } = await supabase
      .from('movimientos')
      .select('*')
      .eq('pago_id', id);

    if (movError) throw movError;

    // Preparar operaciones de reversión
    const bolsilloUpdates: { id: string; saldo_actual: number }[] = [];

    if (movimientos && movimientos.length > 0) {
      // Obtener saldos actuales de bolsillos
      const bolsilloIds = [...new Set(movimientos.map(m => m.bolsillo_id).filter(Boolean))];
      const { data: bolsillos, error: bolsillosError } = await supabase
        .from('bolsillos')
        .select('id, saldo_actual, nombre')
        .in('id', bolsilloIds);

      if (bolsillosError) throw bolsillosError;

      // Validar que ningún bolsillo quede con saldo negativo
      for (const movimiento of movimientos) {
        if (movimiento.bolsillo_id) {
          const bolsillo = bolsillos?.find(b => b.id === movimiento.bolsillo_id);
          if (bolsillo) {
            const nuevoSaldo = bolsillo.saldo_actual - movimiento.valor;
            if (nuevoSaldo < 0) {
              throw new Error(
                `No se puede eliminar el pago. El bolsillo "${bolsillo.nombre}" quedaría con saldo negativo ($${nuevoSaldo.toLocaleString('es-ES')}). ` +
                `Posiblemente se realizaron movimientos posteriores que utilizaron este dinero.`
              );
            }
          }
        }
      }

      // Calcular nuevos saldos
      for (const movimiento of movimientos) {
        if (movimiento.bolsillo_id) {
          const bolsillo = bolsillos?.find(b => b.id === movimiento.bolsillo_id);
          if (bolsillo) {
            const nuevoSaldo = bolsillo.saldo_actual - movimiento.valor;
            bolsilloUpdates.push({ id: bolsillo.id, saldo_actual: nuevoSaldo });
          }
        }
      }
    }

    // Ejecutar todas las operaciones de eliminación
    const promises = [];

    // Actualizar saldos de bolsillos
    for (const update of bolsilloUpdates) {
      promises.push(updateBolsillo(update.id, { saldo_actual: update.saldo_actual }));
    }

    // Eliminar movimientos (CASCADE eliminará automáticamente por pago_id)
    if (movimientos && movimientos.length > 0) {
      promises.push(supabase.from('movimientos').delete().eq('pago_id', id));
    }

    // Ejecutar actualizaciones
    const results = await Promise.all(promises);
    
    // Verificar errores
    for (const result of results) {
      if ('error' in result && result.error) {
        throw result.error;
      }
    }

    // Finalmente eliminar el pago (CASCADE eliminará distribuciones y detalles)
    const { error } = await supabase
      .from('pagos')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
}

// Obtener detalles completos de un pago
export async function getPagoCompleto(pagoId: string) {
  try {
    const { data, error } = await supabase
      .from('vista_pagos_completos')
      .select('*')
      .eq('pago_id', pagoId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Pago no encontrado');
    return data;
  } catch (error) {
    console.error('Error fetching complete payment:', error);
    throw error;
  }
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
