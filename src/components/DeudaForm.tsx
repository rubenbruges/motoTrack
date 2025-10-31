import { useState } from 'react';
import { X } from 'lucide-react';
import type { Database } from '../lib/database.types';

interface DeudaFormProps {
  motoId: string;
  onSubmit: (deuda: Database['public']['Tables']['deudas']['Insert']) => Promise<void>;
  onClose: () => void;
  initialData?: Database['public']['Tables']['deudas']['Row'];
}

export function DeudaForm({ motoId, onSubmit, onClose, initialData }: DeudaFormProps) {
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '');
  const [loading, setLoading] = useState(false);
  const [valorInicial, setValorInicial] = useState(initialData?.valor_inicial?.toString() || '');

  const formatNumber = (value: string) => {
    const num = parseFloat(value.replace(/\./g, '').replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

  const formatDisplay = (value: string) => {
    const num = formatNumber(value);
    return num > 0 ? num.toLocaleString('es-ES') : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', { descripcion, valorInicial });
    
    const valorNumerico = formatNumber(valorInicial);
    
    if (!descripcion.trim() || valorNumerico <= 0) {
      console.log('Validation failed:', { descripcion: descripcion.trim(), valorInicial, valorNumerico });
      return;
    }

    setLoading(true);
    try {
      console.log('Submitting deuda:', {
        moto_id: motoId,
        descripcion: descripcion.trim(),
        valor_inicial: valorNumerico,
        saldo_actual: valorNumerico
      });
      
      await onSubmit({
        moto_id: motoId,
        descripcion: descripcion.trim(),
        valor_inicial: valorNumerico,
        saldo_actual: valorNumerico
      });
      
      console.log('Deuda created successfully');
    } catch (error) {
      console.error('Error creating deuda:', error);
      alert('Error al crear la deuda: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-900">
            {initialData ? 'Editar Deuda' : 'Nueva Deuda'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descripción
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descripción de la deuda"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Valor Inicial
            </label>
            <input
              type="text"
              value={formatDisplay(valorInicial) || valorInicial}
              onChange={(e) => setValorInicial(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
              required
            />
          </div>

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
              disabled={loading || !descripcion.trim() || formatNumber(valorInicial) <= 0}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}