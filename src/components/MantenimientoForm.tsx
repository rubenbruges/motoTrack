import { useState } from 'react';
import { X, Wrench } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Bolsillo = Database['public']['Tables']['bolsillos']['Row'];
type MantenimientoInsert = Database['public']['Tables']['mantenimientos']['Insert'];

interface MantenimientoFormProps {
  motoId: string;
  bolsillos: Bolsillo[];
  onSubmit: (mantenimiento: MantenimientoInsert, bolsillos: { bolsilloId: string; valor: number }[]) => Promise<void>;
  onClose: () => void;
}

export function MantenimientoForm({ motoId, bolsillos, onSubmit, onClose }: MantenimientoFormProps) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [descripcion, setDescripcion] = useState('');
  const [valorTotal, setValorTotal] = useState(0);
  const [bolsillosSeleccionados, setBolsillosSeleccionados] = useState<{ bolsilloId: string; valor: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const agregarBolsillo = () => {
    if (bolsillosSeleccionados.length < bolsillos.length) {
      const bolsillosDisponibles = bolsillos.filter(b => 
        !bolsillosSeleccionados.some(bs => bs.bolsilloId === b.id)
      );
      if (bolsillosDisponibles.length > 0) {
        setBolsillosSeleccionados([
          ...bolsillosSeleccionados,
          { bolsilloId: bolsillosDisponibles[0].id, valor: 0 }
        ]);
      }
    }
  };

  const actualizarBolsillo = (index: number, campo: 'bolsilloId' | 'valor', valor: string | number) => {
    const nuevos = [...bolsillosSeleccionados];
    if (campo === 'bolsilloId') {
      nuevos[index].bolsilloId = valor as string;
    } else {
      nuevos[index].valor = typeof valor === 'string' ? parseFloat(valor) || 0 : valor;
    }
    setBolsillosSeleccionados(nuevos);
  };

  const eliminarBolsillo = (index: number) => {
    setBolsillosSeleccionados(bolsillosSeleccionados.filter((_, i) => i !== index));
  };

  const totalBolsillos = bolsillosSeleccionados.reduce((sum, b) => sum + b.valor, 0);
  const diferencia = valorTotal - totalBolsillos;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.abs(diferencia) > 0.01) {
      alert('El total de los bolsillos debe coincidir con el valor del mantenimiento');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(
        {
          moto_id: motoId,
          fecha,
          descripcion,
          valor_total: valorTotal
        },
        bolsillosSeleccionados
      );
    } catch (error: any) {
      alert(error.message || 'Error al crear mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Wrench className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900">Nuevo Mantenimiento</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe el mantenimiento realizado..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Valor Total
              </label>
              <input
                type="number"
                value={valorTotal}
                onChange={(e) => setValorTotal(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700">
                  Bolsillos a Descontar
                </label>
                <button
                  type="button"
                  onClick={agregarBolsillo}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition"
                  disabled={bolsillosSeleccionados.length >= bolsillos.length}
                >
                  Agregar
                </button>
              </div>

              <div className="space-y-3">
                {bolsillosSeleccionados.map((bolsilloSel, index) => (
                  <div key={index} className="flex gap-3 items-center p-3 bg-slate-50 rounded-lg">
                    <select
                      value={bolsilloSel.bolsilloId}
                      onChange={(e) => actualizarBolsillo(index, 'bolsilloId', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {bolsillos
                        .filter(b => 
                          b.id === bolsilloSel.bolsilloId || 
                          !bolsillosSeleccionados.some(bs => bs.bolsilloId === b.id)
                        )
                        .map(bolsillo => (
                          <option key={bolsillo.id} value={bolsillo.id}>
                            {bolsillo.nombre} (${bolsillo.saldo_actual.toLocaleString('es-ES')})
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      value={bolsilloSel.valor}
                      onChange={(e) => actualizarBolsillo(index, 'valor', parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                      step="0.01"
                      min="0"
                    />
                    <button
                      type="button"
                      onClick={() => eliminarBolsillo(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {bolsillosSeleccionados.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  Agrega al menos un bolsillo para descontar
                </p>
              )}
            </div>

            {bolsillosSeleccionados.length > 0 && (
              <div className="bg-slate-100 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-700">Total Bolsillos:</span>
                  <span className="font-bold">${totalBolsillos.toLocaleString('es-ES')}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-700">Valor Mantenimiento:</span>
                  <span className="font-bold">${valorTotal.toLocaleString('es-ES')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Diferencia:</span>
                  <span className={`font-bold ${Math.abs(diferencia) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    ${diferencia.toLocaleString('es-ES')}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || Math.abs(diferencia) > 0.01 || bolsillosSeleccionados.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Crear Mantenimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}