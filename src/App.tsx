import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/AuthForm';
import { MotosList } from './pages/MotosList';
import { MotoDetail } from './pages/MotoDetail';
import type { Database } from './lib/database.types';

type Moto = Database['public']['Tables']['motos']['Row'];

function AppContent() {
  const { user, loading } = useAuth();
  const [selectedMoto, setSelectedMoto] = useState<Moto | null>(null);

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

  if (!user) {
    return <AuthForm />;
  }

  if (selectedMoto) {
    return (
      <MotoDetail 
        moto={selectedMoto} 
        onBack={() => setSelectedMoto(null)}
        onMotoUpdate={setSelectedMoto}
      />
    );
  }

  return <MotosList onSelectMoto={setSelectedMoto} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
