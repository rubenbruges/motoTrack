import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { useFormattedNumber } from '../hooks/useFormattedNumber';

type MotoInsert = Database['public']['Tables']['motos']['Insert'];

interface MotoFormProps {
  userId: string;
  onSubmit: (moto: MotoInsert) => Promise<void>;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
  initialData?: Partial<MotoInsert & { id: string }>;
}

export function MotoForm({ userId, onSubmit, onClose, onDelete, initialData }: MotoFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    placa: initialData?.placa || '',
    modelo: initialData?.modelo || '',
    color: initialData?.color || '',
    tipo_pago: initialData?.tipo_pago || 'semanal' as 'semanal' | 'mensual',
  });
  const cilindraje = useFormattedNumber(initialData?.cilindraje || 0);
  const valorCuota = useFormattedNumber(initialData?.valor_cuota || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        user_id: userId,
        ...formData,
        cilindraje: cilindraje.numericValue,
        valor_cuota: valorCuota.numericValue,
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            {initialData ? 'Editar Moto' : 'Nueva Moto'}
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
              Placa *
            </label>
            <input
              type="text"
              value={formData.placa}
              onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="ABC123"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Modelo
            </label>
            <input
              type="text"
              value={formData.modelo}
              onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="XTZ 150"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Color
            </label>
            <input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="Rojo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cilindraje (cc)
            </label>
            <input
              type="text"
              value={cilindraje.displayValue}
              onChange={(e) => cilindraje.handleChange(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="150"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Pago *
            </label>
            <select
              value={formData.tipo_pago}
              onChange={(e) => setFormData({ ...formData, tipo_pago: e.target.value as 'semanal' | 'mensual' })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              required
            >
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Valor de Cuota *
            </label>
            <input
              type="text"
              value={valorCuota.displayValue}
              onChange={(e) => valorCuota.handleChange(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="50.000"
              required
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
            {initialData?.id && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(initialData.id!)}
                className="px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center gap-2"
              >
                <Trash2 size={16} />
                Eliminar
              </button>
            )}
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
