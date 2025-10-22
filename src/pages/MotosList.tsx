import { useState, useEffect } from 'react';
import { Plus, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getMotos, createMoto } from '../services/motoService';
import { getBolsillos } from '../services/bolsilloService';
import { MotoCard } from '../components/MotoCard';
import { MotoForm } from '../components/MotoForm';
import type { Database } from '../lib/database.types';

type Moto = Database['public']['Tables']['motos']['Row'];

interface MotosListProps {
  onSelectMoto: (moto: Moto) => void;
}

export function MotosList({ onSelectMoto }: MotosListProps) {
  const { user, signOut } = useAuth();
  const [motos, setMotos] = useState<Moto[]>([]);
  const [bolsillosTotals, setBolsillosTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadMotos();
  }, [user]);

  const loadMotos = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getMotos(user.id);
      setMotos(data);

      const totals: Record<string, number> = {};
      for (const moto of data) {
        const bolsillos = await getBolsillos(moto.id);
        totals[moto.id] = bolsillos.reduce((sum, b) => sum + b.saldo_actual, 0);
      }
      setBolsillosTotals(totals);
    } catch (error) {
      console.error('Error loading motos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMoto = async (moto: Database['public']['Tables']['motos']['Insert']) => {
    await createMoto(moto);
    await loadMotos();
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">MotoWallet</h1>
            <p className="text-sm text-slate-600">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600 hover:text-slate-900"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Mis Motos</h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            <Plus size={20} />
            Agregar Moto
          </button>
        </div>

        {motos.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus size={40} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No tienes motos registradas
            </h3>
            <p className="text-slate-600 mb-6">
              Comienza agregando tu primera moto
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
            >
              Agregar Primera Moto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {motos.map((moto) => (
              <MotoCard
                key={moto.id}
                moto={moto}
                totalBolsillos={bolsillosTotals[moto.id] || 0}
                onClick={() => onSelectMoto(moto)}
              />
            ))}
          </div>
        )}
      </main>

      {showForm && user && (
        <MotoForm
          userId={user.id}
          onSubmit={handleCreateMoto}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
