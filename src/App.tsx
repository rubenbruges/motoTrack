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

  // Evitar renderizado hasta que el estado de auth esté definido
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

  // Renderizado condicional estable
  if (!user) {
    return <AuthForm />;
  }

  if (selectedMoto) {
    return (
      <MotoDetail 
        key={selectedMoto.id}
        moto={selectedMoto} 
        onBack={() => setSelectedMoto(null)}
        onMotoUpdate={setSelectedMoto}
      />
    );
  }

  return <MotosList key="motos-list" onSelectMoto={setSelectedMoto} />;
}

function App() {
  return (
    <div className="app-container">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </div>
  );
}

export default App;
