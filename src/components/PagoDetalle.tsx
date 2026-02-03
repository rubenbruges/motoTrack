import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { getMovimientosByBolsillo } from '../services/movimientoService';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Pago = Database['public']['Tables']['pagos']['Row'];
type Bolsillo = Database['public']['Tables']['bolsillos']['Row'];
type Movimiento = Database['public']['Tables']['movimientos']['Row'];
type PagoDetalle = Database['public']['Tables']['pago_detalles']['Row'];

interface PagoDetalleProps {
  pago: Pago;
  bolsillos: Bolsillo[];
  onDelete?: () => void;
}

export function PagoDetalle({ pago, bolsillos, onDelete }: PagoDetalleProps) {
  const [expanded, setExpanded] = useState(false);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [pagoDetalles, setPagoDetalles] = useState<PagoDetalle[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMovimientos = async () => {
    if (!expanded || movimientos.length > 0) return;
    
    setLoading(true);
    try {
      // Cargar movimientos
      const allMovimientos = await Promise.all(
        bolsillos.map(bolsillo => getMovimientosByBolsillo(bolsillo.id))
      );
      
      const movimientosPago = allMovimientos
        .flat()
        .filter(mov => mov.pago_id === pago.id);
      
      setMovimientos(movimientosPago);

      // Cargar detalles de pago (transferencia/efectivo)
      if (pago.tiene_detalles) {
        const { data: detalles, error } = await supabase
          .from('pago_detalles')
          .select('*')
          .eq('pago_id', pago.id);
        
        if (!error && detalles) {
          setPagoDetalles(detalles);
        }
      }
    } catch (error) {
      console.error('Error loading movimientos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      loadMovimientos();
    }
  }, [expanded]);

  const getBolsilloNombre = (bolsilloId: string | null) => {
    if (!bolsilloId) return 'Sin bolsillo';
    return bolsillos.find(b => b.id === bolsilloId)?.nombre || 'Desconocido';
  };

  // Verificar si es distribución manual basado en el tipo de pago
  const esManual = pago.tipo_pago === 'parcial';

  return (
    <div className="border border-slate-200 rounded-lg">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <div>
            <p className="font-medium text-slate-900">
              {new Date(pago.fecha_pago).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              {esManual && (
                <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                  Manual
                </span>
              )}
            </p>
            <p className="text-sm text-slate-600 capitalize">
              {pago.tipo_pago} • ${pago.valor_pagado.toLocaleString('es-ES')}
            </p>
          </div>
        </div>
        {onDelete && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
            title="Eliminar pago"
          >
            <Trash2 size={18} />
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando detalles...</p>
          ) : movimientos.length === 0 ? (
            <p className="text-sm text-slate-500">No se encontraron movimientos para este pago</p>
          ) : (
            <div className="space-y-2">
              {/* Detalles de transferencia/efectivo */}
              {pagoDetalles.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Detalles del pago:</h5>
                  <div className="space-y-1">
                    {pagoDetalles.map((detalle) => (
                      <div key={detalle.id} className="flex justify-between items-center py-1 px-3 bg-blue-50 rounded text-sm">
                        <span className="text-blue-700 capitalize">{detalle.tipo_detalle}:</span>
                        <span className="font-medium text-blue-800">
                          ${detalle.valor.toLocaleString('es-ES')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <h5 className="font-medium text-slate-700 mb-3">Distribución en bolsillos:</h5>
              {movimientos.map((movimiento) => (
                <div key={movimiento.id} className="flex justify-between items-center py-2 px-3 bg-white rounded border">
                  <span className="text-sm text-slate-700">
                    {movimiento.bolsillo_id ? getBolsilloNombre(movimiento.bolsillo_id) : 'Sin bolsillo'}
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    +${movimiento.valor.toLocaleString('es-ES')}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 px-3 bg-slate-100 rounded font-medium">
                <span className="text-sm text-slate-700">Total distribuido:</span>
                <span className="text-sm text-slate-900">
                  ${movimientos.reduce((sum, mov) => sum + mov.valor, 0).toLocaleString('es-ES')}
                </span>
              </div>
              {esManual && (
                <p className="text-xs text-orange-600 mt-2">
                  * Este pago fue distribuido manualmente.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}