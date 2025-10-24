import { useState, useEffect } from 'react';
import { Plus, LogOut, Search } from 'lucide-react';
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
  const [filteredMotos, setFilteredMotos] = useState<Moto[]>([]);
  const [bolsillosTotals, setBolsillosTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMotos();
  }, [user]);

  useEffect(() => {
    handleSearch();
  }, [motos]);

  const loadMotos = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getMotos(user.id);
      setMotos(data);
      setFilteredMotos(data);

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

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredMotos(motos);
      return;
    }

    const filtered = motos.filter(moto => {
      const searchLower = searchTerm.toLowerCase();
      return (
        moto.placa.toLowerCase().includes(searchLower) ||
        (moto.modelo && moto.modelo.toLowerCase().includes(searchLower)) ||
        (moto.color && moto.color.toLowerCase().includes(searchLower)) ||
        moto.cilindraje.toString().includes(searchLower) ||
        moto.tipo_pago.toLowerCase().includes(searchLower) ||
        moto.valor_cuota.toString().includes(searchLower)
      );
    });
    
    setFilteredMotos(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-fuchsia-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-fuchsia-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-fuchsia-600 bg-clip-text text-transparent">MotoWallet</h1>
            <p className="text-sm text-blue-600">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="p-2 hover:bg-blue-50 rounded-lg transition text-blue-600 hover:text-fuchsia-600"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-blue-900">Mis Motos</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar por placa, modelo, color..."
                className="pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent w-full sm:w-64"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" size={18} />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
            >
              Buscar
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-fuchsia-500 text-white rounded-lg hover:from-blue-600 hover:to-fuchsia-600 transition"
            >
              <Plus size={20} />
              Agregar Moto
            </button>
          </div>
        </div>

        {filteredMotos.length === 0 && motos.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus size={40} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-blue-900 mb-2">
              No tienes motos registradas
            </h3>
            <p className="text-blue-600 mb-6">
              Comienza agregando tu primera moto
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-fuchsia-500 text-white rounded-lg hover:from-blue-600 hover:to-fuchsia-600 transition"
            >
              Agregar Primera Moto
            </button>
          </div>
        ) : filteredMotos.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-fuchsia-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={40} className="text-fuchsia-400" />
            </div>
            <h3 className="text-xl font-semibold text-fuchsia-900 mb-2">
              No se encontraron motos
            </h3>
            <p className="text-fuchsia-600 mb-6">
              No hay motos que coincidan con tu búsqueda
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilteredMotos(motos);
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-fuchsia-500 text-white rounded-lg hover:from-blue-600 hover:to-fuchsia-600 transition"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMotos.map((moto) => (
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
