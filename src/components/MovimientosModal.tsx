import { useState, useEffect } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, RotateCcw } from 'lucide-react';
import { getMovimientosByBolsillo, revertirMovimiento } from '../services/movimientoService';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from './NotificationContainer';
import { ConfirmDialog } from './ConfirmDialog';
import type { Database } from '../lib/database.types';

type Movimiento = Database['public']['Tables']['movimientos']['Row'];

interface MovimientosModalProps {
  bolsilloId: string;
  bolsilloNombre: string;
  onClose: () => void;
  onMovimientoRevertido?: () => void;
}

export function MovimientosModal({ bolsilloId, bolsilloNombre, onClose, onMovimientoRevertido }: MovimientosModalProps) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [revirtiendoId, setRevirtiendoId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    movimientoId: string;
  }>({ isOpen: false, movimientoId: '' });
  const { notifications, removeNotification, success, error } = useNotification();

  useEffect(() => {
    loadMovimientos();
  }, [bolsilloId]);

  const loadMovimientos = async () => {
    try {
      setLoading(true);
      const data = await getMovimientosByBolsillo(bolsilloId);
      setMovimientos(data);
    } catch (error) {
      console.error('Error loading movimientos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMovimientoIcon = (tipo: string) => {
    switch (tipo) {
      case 'carga':
        return <ArrowUpCircle className="text-green-600" size={20} />;
      case 'descarga':
        return <ArrowDownCircle className="text-red-600" size={20} />;
      case 'transferencia':
        return <ArrowRightLeft className="text-blue-600" size={20} />;
      default:
        return <ArrowUpCircle className="text-gray-600" size={20} />;
    }
  };

  const getMovimientoColor = (tipo: string) => {
    switch (tipo) {
      case 'carga':
        return 'text-green-600';
      case 'descarga':
        return 'text-red-600';
      case 'transferencia':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
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

  const handleRevertir = async (movimientoId: string) => {
    setConfirmDialog({
      isOpen: true,
      movimientoId
    });
  };

  const confirmarReversion = async () => {
    const movimientoId = confirmDialog.movimientoId;
    try {
      setRevirtiendoId(movimientoId);
      await revertirMovimiento(movimientoId);
      await loadMovimientos();
      onMovimientoRevertido?.();
      success('Movimiento revertido correctamente');
    } catch (err: any) {
      error(err.message || 'Error al revertir movimiento');
    } finally {
      setRevirtiendoId(null);
      setConfirmDialog({ isOpen: false, movimientoId: '' });
    }
  };

  const puedeRevertir = (movimiento: Movimiento) => {
    return !movimiento.es_reversion && !movimientos.some(m => m.movimiento_original_id === movimiento.id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-2xl font-bold text-slate-900">
            Movimientos - {bolsilloNombre}
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
              No hay movimientos registrados para este bolsillo
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
                      {getMovimientoIcon(movimiento.tipo_movimiento)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900 capitalize">
                            {movimiento.es_reversion ? 'Reversión de ' : ''}{movimiento.tipo_movimiento}
                          </span>
                          <span className={`font-bold ${getMovimientoColor(movimiento.tipo_movimiento)}`}>
                            {movimiento.tipo_movimiento === 'descarga' ? '-' : '+'}
                            ${movimiento.valor.toLocaleString('es-ES')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {movimiento.observacion}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(movimiento.fecha)}
                        </p>
                      </div>
                    </div>
                    {puedeRevertir(movimiento) && (
                      <button
                        type="button"
                        onClick={() => handleRevertir(movimiento.id)}
                        disabled={revirtiendoId === movimiento.id}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition disabled:opacity-50"
                        title="Revertir movimiento"
                      >
                        {revirtiendoId === movimiento.id ? (
                          <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <RotateCcw size={18} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <NotificationContainer 
          notifications={notifications} 
          onRemove={removeNotification} 
        />
        
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title="Revertir Movimiento"
          message="¿Estás seguro de revertir este movimiento? Esta acción no se puede deshacer."
          type="warning"
          confirmText="Revertir"
          onConfirm={confirmarReversion}
          onCancel={() => setConfirmDialog({ isOpen: false, movimientoId: '' })}
        />
      </div>
    </div>
  );
}