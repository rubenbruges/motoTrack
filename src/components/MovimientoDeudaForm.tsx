import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { useFormattedNumber } from '../hooks/useFormattedNumber';
import type { Database } from '../lib/database.types';

type Bolsillo = Database['public']['Tables']['bolsillos']['Row'];

interface MovimientoDeudaFormProps {
  deudaId: string;
  descripcionDeuda: string;
  saldoActual: number;
  bolsillos: Bolsillo[];
  onSubmit: (
    tipo: 'abono' | 'cargo',
    valor: number,
    observacion: string,
    bolsillos?: { bolsilloId: string; valor: number }[]
  ) => Promise<void>;
  onClose: () => void;
}

export function MovimientoDeudaForm({ deudaId, descripcionDeuda, saldoActual, bolsillos, onSubmit, onClose }: MovimientoDeudaFormProps) {
  const [tipo, setTipo] = useState<'abono' | 'cargo'>('abono');
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [bolsillosSeleccionados, setBolsillosSeleccionados] = useState<{ bolsilloId: string; valor: number; displayValue: string }[]>([]);
  const valor = useFormattedNumber(0);

  const agregarBolsillo = () => {
    setBolsillosSeleccionados([...bolsillosSeleccionados, { bolsilloId: '', valor: 0, displayValue: '' }]);
  };

  const removerBolsillo = (index: number) => {
    setBolsillosSeleccionados(bolsillosSeleccionados.filter((_, i) => i !== index));
  };

  const actualizarBolsillo = (index: number, campo: 'bolsilloId' | 'valor', valor: any) => {
    const nuevos = [...bolsillosSeleccionados];
    if (campo === 'valor') {
      const cleaned = valor.replace(/[^\d]/g, '');
      const formatted = cleaned ? cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
      const numericValue = parseFloat(cleaned) || 0;
      nuevos[index] = { ...nuevos[index], valor: numericValue, displayValue: formatted };
    } else {
      nuevos[index] = { ...nuevos[index], [campo]: valor };
    }
    setBolsillosSeleccionados(nuevos);
  };

  const totalBolsillos = bolsillosSeleccionados.reduce((sum, b) => sum + b.valor, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (valor.numericValue <= 0) return;

    // Validar que el abono no exceda el saldo de la deuda
    if (tipo === 'abono' && valor.numericValue > saldoActual) {
      alert(`El abono de $${valor.numericValue.toLocaleString('es-ES')} no puede ser mayor al saldo actual de $${saldoActual.toLocaleString('es-ES')}`);
      return;
    }

    if (tipo === 'abono' && bolsillosSeleccionados.length > 0) {
      if (totalBolsillos !== valor.numericValue) {
        alert('La suma de los valores de los bolsillos debe ser igual al valor del abono');
        return;
      }
      
      const bolsillosValidos = bolsillosSeleccionados.filter(b => b.bolsilloId && b.valor > 0);
      if (bolsillosValidos.length !== bolsillosSeleccionados.length) {
        alert('Todos los bolsillos deben tener un valor válido');
        return;
      }

      // Validar que ningún valor exceda el saldo del bolsillo
      for (const bolsilloSel of bolsillosSeleccionados) {
        const bolsilloData = bolsillos.find(b => b.id === bolsilloSel.bolsilloId);
        if (bolsilloData && bolsilloSel.valor > bolsilloData.saldo_actual) {
          alert(`El valor ${bolsilloSel.valor.toLocaleString('es-ES')} excede el saldo disponible de ${bolsilloData.saldo_actual.toLocaleString('es-ES')} en el bolsillo "${bolsilloData.nombre}"`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      await onSubmit(
        tipo,
        valor.numericValue,
        observacion.trim() || `${tipo === 'abono' ? 'Abono' : 'Cargo'} a deuda`,
        tipo === 'abono' && bolsillosSeleccionados.length > 0 ? bolsillosSeleccionados : undefined
      );
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl sticky top-0">
          <h2 className="text-xl font-bold text-slate-900">Movimiento de Deuda</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm text-slate-600">Deuda:</p>
            <p className="font-medium text-slate-900">{descripcionDeuda}</p>
            <p className="text-sm text-slate-600 mt-1">
              Saldo actual: <span className="font-semibold text-slate-900">${saldoActual.toLocaleString('es-ES')}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Movimiento
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="abono"
                  checked={tipo === 'abono'}
                  onChange={(e) => setTipo(e.target.value as 'abono')}
                  className="mr-2"
                />
                <Minus size={16} className="text-green-600 mr-1" />
                Abono (Restar)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="cargo"
                  checked={tipo === 'cargo'}
                  onChange={(e) => setTipo(e.target.value as 'cargo')}
                  className="mr-2"
                />
                <Plus size={16} className="text-red-600 mr-1" />
                Cargo (Sumar)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Valor
            </label>
            <input
              type="text"
              value={valor.displayValue}
              onChange={(e) => valor.handleChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Observación
            </label>
            <input
              type="text"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Observación del movimiento"
            />
          </div>

          {tipo === 'abono' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Bolsillos (Opcional)
                </label>
                <button
                  type="button"
                  onClick={agregarBolsillo}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Agregar
                </button>
              </div>
              
              {bolsillosSeleccionados.map((bolsillo, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <select
                    value={bolsillo.bolsilloId}
                    onChange={(e) => actualizarBolsillo(index, 'bolsilloId', e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar bolsillo</option>
                    {bolsillos.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre} (${b.saldo_actual.toLocaleString('es-ES')})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={bolsillo.displayValue}
                    onChange={(e) => actualizarBolsillo(index, 'valor', e.target.value)}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => removerBolsillo(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              {bolsillosSeleccionados.length > 0 && (
                <div className="text-sm text-slate-600 mt-2">
                  Total bolsillos: ${totalBolsillos.toLocaleString('es-ES')}
                  {totalBolsillos !== valor.numericValue && valor.numericValue > 0 && (
                    <span className="text-red-600 ml-2">
                      (Debe ser igual a ${valor.numericValue.toLocaleString('es-ES')})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || valor.numericValue <= 0}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Procesando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}