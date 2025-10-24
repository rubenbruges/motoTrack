import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { useFormattedNumber } from '../hooks/useFormattedNumber';

type Bolsillo = Database['public']['Tables']['bolsillos']['Row'];

interface MovimientoFormProps {
  bolsillos: Bolsillo[];
  onTransferencia: (origenId: string, destinoId: string, valor: number, observacion: string) => Promise<void>;
  onRetiro: (bolsilloId: string, valor: number, observacion: string) => Promise<void>;
  onRetiroMultiple: (retiros: { bolsilloId: string; valor: number }[], observacion: string) => Promise<void>;
  onClose: () => void;
}

export function MovimientoForm({ bolsillos, onTransferencia, onRetiro, onRetiroMultiple, onClose }: MovimientoFormProps) {
  const [loading, setLoading] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<'transferencia' | 'retiro'>('transferencia');
  const [tipoRetiro, setTipoRetiro] = useState<'simple' | 'multiple'>('simple');
  const [bolsilloOrigenId, setBolsilloOrigenId] = useState('');
  const [bolsilloDestinoId, setBolsilloDestinoId] = useState('');
  const valor = useFormattedNumber();
  const [observacion, setObservacion] = useState('');
  const [retirosMultiples, setRetirosMultiples] = useState<{ bolsilloId: string; valor: number; displayValue: string; selected: boolean }[]>([]);

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
        if (tipoRetiro === 'simple') {
          if (!bolsilloOrigenId) {
            alert('Selecciona el bolsillo');
            return;
          }
          await onRetiro(bolsilloOrigenId, valor.numericValue, observacion);
        } else {
          const retirosSeleccionados = retirosMultiples.filter(r => r.selected && r.valor > 0);
          if (retirosSeleccionados.length === 0) {
            alert('Selecciona al menos un bolsillo y asigna un valor');
            return;
          }
          await onRetiroMultiple(retirosSeleccionados.map(r => ({ bolsilloId: r.bolsilloId, valor: r.valor })), observacion);
        }
      }
      onClose();
    } catch (error: any) {
      alert(error.message || 'Error al realizar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const bolsilloOrigen = bolsillos.find(b => b.id === bolsilloOrigenId);

  // Inicializar retiros múltiples cuando cambia a retiro múltiple
  useEffect(() => {
    if (tipoMovimiento === 'retiro' && tipoRetiro === 'multiple') {
      setRetirosMultiples(bolsillos.map(b => ({
        bolsilloId: b.id,
        valor: 0,
        displayValue: '',
        selected: false
      })));
    }
  }, [tipoMovimiento, tipoRetiro, bolsillos]);

  const updateRetiroMultiple = (bolsilloId: string, inputValue: string, selected: boolean) => {
    const cleaned = inputValue.replace(/[^\d]/g, '');
    const formatted = cleaned ? cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
    const numericValue = parseFloat(cleaned) || 0;
    
    setRetirosMultiples(prev => 
      prev.map(r => r.bolsilloId === bolsilloId ? { ...r, valor: numericValue, displayValue: formatted, selected } : r)
    );
  };

  const getTotalRetiroMultiple = () => {
    return retirosMultiples.filter(r => r.selected).reduce((sum, r) => sum + r.valor, 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8 max-h-[calc(100vh-4rem)]">
        <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-slate-900">Nuevo Movimiento</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
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

          {tipoMovimiento === 'retiro' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de Retiro *
              </label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setTipoRetiro('simple')}
                  className={`py-2 px-4 rounded-lg font-medium transition ${
                    tipoRetiro === 'simple'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Simple
                </button>
                <button
                  type="button"
                  onClick={() => setTipoRetiro('multiple')}
                  className={`py-2 px-4 rounded-lg font-medium transition ${
                    tipoRetiro === 'multiple'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Múltiple
                </button>
              </div>
            </div>
          )}

          {(tipoMovimiento === 'transferencia' || (tipoMovimiento === 'retiro' && tipoRetiro === 'simple')) && (
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
          )}

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

          {tipoMovimiento === 'retiro' && tipoRetiro === 'multiple' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Seleccionar Bolsillos y Valores *
              </label>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {retirosMultiples.map((retiro) => {
                  const bolsillo = bolsillos.find(b => b.id === retiro.bolsilloId);
                  return (
                    <div key={retiro.bolsilloId} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                      <input
                        type="checkbox"
                        checked={retiro.selected}
                        onChange={(e) => updateRetiroMultiple(retiro.bolsilloId, retiro.displayValue, e.target.checked)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{bolsillo?.nombre}</p>
                        <p className="text-xs text-slate-500">
                          Saldo: ${bolsillo?.saldo_actual.toLocaleString('es-ES')}
                        </p>
                      </div>
                      <input
                        type="text"
                        value={retiro.displayValue}
                        onChange={(e) => updateRetiroMultiple(retiro.bolsilloId, e.target.value, retiro.selected)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                        placeholder="0"
                        disabled={!retiro.selected}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 p-2 bg-slate-50 rounded">
                <p className="text-sm font-medium text-slate-700">
                  Total a retirar: ${getTotalRetiroMultiple().toLocaleString('es-ES')}
                </p>
              </div>
            </div>
          ) : (
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
                  Saldo disponible: ${bolsilloOrigen.saldo_actual.toLocaleString('es-ES')}
                </p>
              )}
            </div>
          )}

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
