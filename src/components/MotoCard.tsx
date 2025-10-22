import { Bike, DollarSign } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Moto = Database['public']['Tables']['motos']['Row'];

interface MotoCardProps {
  moto: Moto;
  totalBolsillos: number;
  onClick: () => void;
}

export function MotoCard({ moto, totalBolsillos, onClick }: MotoCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-slate-200 overflow-hidden group"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center group-hover:bg-slate-800 transition">
              <Bike className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{moto.placa}</h3>
              <p className="text-sm text-slate-600">
                {moto.modelo && `${moto.modelo} • `}{moto.color}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              {moto.tipo_pago}
            </p>
            <p className="text-lg font-bold text-slate-900">
              ${moto.valor_cuota.toLocaleString('es-ES')}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Total en bolsillos</span>
            <div className="flex items-center gap-1 text-green-600 font-semibold">
              <DollarSign size={16} />
              <span>${totalBolsillos.toLocaleString('es-ES')}</span>
            </div>
          </div>
        </div>

        {moto.cilindraje > 0 && (
          <div className="mt-2 text-xs text-slate-500">
            {moto.cilindraje}cc
          </div>
        )}
      </div>
    </div>
  );
}
