import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getMovimientos } from '../services/movimientoService';
import type { Database } from '../lib/database.types';

type Pago = Database['public']['Tables']['pagos']['Row'];
type Bolsillo = Database['public']['Tables']['bolsillos']['Row'];
type Movimiento = Database['public']['Tables']['movimientos']['Row'];

interface PagoDetalleProps {
  pago: Pago;
  bolsillos: Bolsillo[];
}

export function PagoDetalle({ pago, bolsillos }: PagoDetalleProps) {
  const [expanded, setExpanded] = useState(false);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMovimientos = async () => {
    if (!expanded || movimientos.length > 0) return;
    
    setLoading(true);
    try {
      const allMovimientos = await Promise.all(
        bolsillos.map(bolsillo => getMovimientos(bolsillo.id))
      );
      
      const movimientosPago = allMovimientos
        .flat()
        .filter(mov => mov.observacion.includes(`ID: ${pago.id}`));
      
      setMovimientos(movimientosPago);
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

  const getBolsilloNombre = (bolsilloId: string) => {
    return bolsillos.find(b => b.id === bolsilloId)?.nombre || 'Desconocido';
  };

  const esDistribucionManual = movimientos.some(mov => 
    mov.observacion.includes('distribución manual')
  );

  return (
    <div className="border border-slate-200 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <div className="text-left">
            <p className="font-medium text-slate-900">
              {new Date(pago.fecha_pago).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
            <p className="text-sm text-slate-600 capitalize">
              {pago.tipo_pago} • ${pago.valor_pagado.toLocaleString('es-ES')}
              {esDistribucionManual && (
                <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                  Manual
                </span>
              )}
            </p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando detalles...</p>
          ) : movimientos.length === 0 ? (
            <p className="text-sm text-slate-500">No se encontraron movimientos para este pago</p>
          ) : (
            <div className="space-y-2">
              <h5 className="font-medium text-slate-700 mb-3">Distribución en bolsillos:</h5>
              {movimientos.map((movimiento) => (
                <div key={movimiento.id} className="flex justify-between items-center py-2 px-3 bg-white rounded border">
                  <span className="text-sm text-slate-700">
                    {getBolsilloNombre(movimiento.bolsillo_id)}
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
              {esDistribucionManual && (
                <p className="text-xs text-orange-600 mt-2">
                  * Este pago fue distribuido manualmente debido a que el monto no cubría todos los bolsillos
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}