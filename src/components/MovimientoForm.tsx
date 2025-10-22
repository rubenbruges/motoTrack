import { useState } from 'react';
import { X } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { useFormattedNumber } from '../hooks/useFormattedNumber';

type Bolsillo = Database['public']['Tables']['bolsillos']['Row'];

interface MovimientoFormProps {
  bolsillos: Bolsillo[];
  onTransferencia: (origenId: string, destinoId: string, valor: number, observacion: string) => Promise<void>;
  onRetiro: (bolsilloId: string, valor: number, observacion: string) => Promise<void>;
  onClose: () => void;
}

export function MovimientoForm({ bolsillos, onTransferencia, onRetiro, onClose }: MovimientoFormProps) {
  const [loading, setLoading] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<'transferencia' | 'retiro'>('transferencia');
  const [bolsilloOrigenId, setBolsilloOrigenId] = useState('');
  const [bolsilloDestinoId, setBolsilloDestinoId] = useState('');
  const valor = useFormattedNumber();
  const [observacion, setObservacion] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tipoMovimiento === 'transferencia') {
        if (!bolsilloOrigenId || !bolsilloDestinoId) {
          alert('Selecciona los bolsillos de origen y destino');
          return;
        }
        if (bolsilloOrigenId === bolsilloDestinoId) {
          alert('El bolsillo de origen y destino deben ser diferentes');
          return;
        }
        await onTransferencia(bolsilloOrigenId, bolsilloDestinoId, valor.numericValue, observacion);
      } else {
        if (!bolsilloOrigenId) {
          alert('Selecciona el bolsillo');
          return;
        }
        await onRetiro(bolsilloOrigenId, valor.numericValue, observacion);
      }
      onClose();
    } catch (error: any) {
      alert(error.message || 'Error al realizar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const bolsilloOrigen = bolsillos.find(b => b.id === bolsilloOrigenId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-slate-900">Nuevo Movimiento</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Movimiento *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoMovimiento('transferencia')}
                className={`py-3 px-4 rounded-lg font-medium transition ${
                  tipoMovimiento === 'transferencia'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Transferencia
              </button>
              <button
                type="button"
                onClick={() => setTipoMovimiento('retiro')}
                className={`py-3 px-4 rounded-lg font-medium transition ${
                  tipoMovimiento === 'retiro'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Retiro
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {tipoMovimiento === 'transferencia' ? 'Bolsillo Origen' : 'Bolsillo'} *
            </label>
            <select
              value={bolsilloOrigenId}
              onChange={(e) => setBolsilloOrigenId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              required
            >
              <option value="">Seleccionar...</option>
              {bolsillos.map((bolsillo) => (
                <option key={bolsillo.id} value={bolsillo.id}>
                  {bolsillo.nombre} (${bolsillo.saldo_actual.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {tipoMovimiento === 'transferencia' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bolsillo Destino *
              </label>
              <select
                value={bolsilloDestinoId}
                onChange={(e) => setBolsilloDestinoId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                required
              >
                <option value="">Seleccionar...</option>
                {bolsillos
                  .filter(b => b.id !== bolsilloOrigenId)
                  .map((bolsillo) => (
                    <option key={bolsillo.id} value={bolsillo.id}>
                      {bolsillo.nombre} (${bolsillo.saldo_actual.toLocaleString()})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Valor *
            </label>
            <input
              type="text"
              value={valor.displayValue}
              onChange={(e) => valor.handleChange(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="0"
              required
            />
            {bolsilloOrigen && (
              <p className="text-xs text-slate-500 mt-1">
                Saldo disponible: ${bolsilloOrigen.saldo_actual.toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Observación
            </label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="Descripción del movimiento..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
