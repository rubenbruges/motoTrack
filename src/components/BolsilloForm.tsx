import { useState } from 'react';
import { X } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { useFormattedNumber } from '../hooks/useFormattedNumber';

type BolsilloInsert = Database['public']['Tables']['bolsillos']['Insert'];

interface BolsilloFormProps {
  motoId: string;
  onSubmit: (bolsillo: BolsilloInsert) => Promise<void>;
  onClose: () => void;
  initialData?: Partial<BolsilloInsert>;
}

export function BolsilloForm({ motoId, onSubmit, onClose, initialData }: BolsilloFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || '',
    tipo_descuento: initialData?.tipo_descuento || 'porcentaje' as 'porcentaje' | 'valor_fijo',
  });
  const valorDescuento = useFormattedNumber(initialData?.valor_descuento || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        moto_id: motoId,
        ...formData,
        valor_descuento: valorDescuento.numericValue,
      });
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-slate-900">
            {initialData ? 'Editar Bolsillo' : 'Nuevo Bolsillo'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="SOAT, RTM, GPS, Ahorro..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Descuento *
            </label>
            <select
              value={formData.tipo_descuento}
              onChange={(e) => setFormData({ ...formData, tipo_descuento: e.target.value as 'porcentaje' | 'valor_fijo' })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              required
            >
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="valor_fijo">Valor Fijo ($)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {formData.tipo_descuento === 'porcentaje' ? 'Porcentaje' : 'Valor Fijo'} *
            </label>
            <input
              type="text"
              value={valorDescuento.displayValue}
              onChange={(e) => valorDescuento.handleChange(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder={formData.tipo_descuento === 'porcentaje' ? '20' : '6.799'}
              required
            />
            {formData.tipo_descuento === 'porcentaje' && (
              <p className="text-xs text-slate-500 mt-1">Máximo 100%</p>
            )}
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
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
