import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DeudaMovimiento {
  id: string;
  tipo_movimiento: 'deuda_abono' | 'deuda_cargo';
  valor: number;
  observacion: string;
  fecha: string;
}

interface DeudaHistorialModalProps {
  deudaId: string;
  descripcionDeuda: string;
  onClose: () => void;
}

export function DeudaHistorialModal({ deudaId, descripcionDeuda, onClose }: DeudaHistorialModalProps) {
  const [movimientos, setMovimientos] = useState<DeudaMovimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistorial();
  }, [deudaId]);

  const loadHistorial = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('movimientos')
        .select('*')
        .eq('deuda_id', deudaId)
        .in('tipo_movimiento', ['deuda_abono', 'deuda_cargo'])
        .order('fecha', { ascending: false });

      if (error) throw error;
      setMovimientos(data || []);
    } catch (error) {
      console.error('Error loading historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-2xl font-bold text-slate-900">
            Historial - {descripcionDeuda}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No hay movimientos registrados para esta deuda
            </div>
          ) : (
            <div className="space-y-3">
              {movimientos.map((movimiento) => (
                <div
                  key={movimiento.id}
                  className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {movimiento.tipo_movimiento === 'deuda_abono' ? (
                        <Minus className="text-green-600 mt-1" size={20} />
                      ) : (
                        <Plus className="text-red-600 mt-1" size={20} />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900 capitalize">
                            {movimiento.tipo_movimiento === 'deuda_abono' ? 'Abono' : 'Cargo'}
                          </span>
                          <span className={`font-bold ${
                            movimiento.tipo_movimiento === 'deuda_abono' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {movimiento.tipo_movimiento === 'deuda_abono' ? '-' : '+'}
                            ${movimiento.valor.toLocaleString('es-ES')}
                          </span>
                        </div>
                        {movimiento.observacion && (
                          <p className="text-sm text-slate-600 mb-2">
                            {movimiento.observacion}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {formatDate(movimiento.fecha)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}