import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Wallet, CreditCard, ArrowLeftRight, TrendingUp, Trash2, Edit, Settings, History, X, Receipt, BarChart3 } from 'lucide-react';
import { getBolsillos, createBolsillo, updateBolsillo, deleteBolsillo } from '../services/bolsilloService';
import { getPagos, createPago, deletePago } from '../services/pagoService';
import { createTransferencia, createRetiro, createRetiroMultiple, getMovimientos, getMovimientosReporte } from '../services/movimientoService';
import { updateMoto } from '../services/motoService';
import { supabase } from '../lib/supabase';
import { BolsilloForm } from '../components/BolsilloForm';
import { PagoForm } from '../components/PagoForm';
import { MovimientoForm } from '../components/MovimientoForm';
import { MotoForm } from '../components/MotoForm';
import { PagoDetalle } from '../components/PagoDetalle';
import { MovimientosModal } from '../components/MovimientosModal';
import { DeudaForm } from '../components/DeudaForm';
import { MovimientoDeudaForm } from '../components/MovimientoDeudaForm';
import { getDeudas, createDeuda, updateDeuda, deleteDeuda, createMovimientoDeuda } from '../services/deudaService';
import type { Database } from '../lib/database.types';

type Moto = Database['public']['Tables']['motos']['Row'];
type Bolsillo = Database['public']['Tables']['bolsillos']['Row'];
type Pago = Database['public']['Tables']['pagos']['Row'];
type Deuda = Database['public']['Tables']['deudas']['Row'];

interface MotoDetailProps {
  moto: Moto;
  onBack: () => void;
  onMotoUpdate?: (moto: Moto) => void;
}

export function MotoDetail({ moto, onBack, onMotoUpdate }: MotoDetailProps) {
  const [bolsillos, setBolsillos] = useState<Bolsillo[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBolsilloForm, setShowBolsilloForm] = useState(false);
  const [showPagoForm, setShowPagoForm] = useState(false);
  const [showMovimientoForm, setShowMovimientoForm] = useState(false);
  const [showMotoForm, setShowMotoForm] = useState(false);
  const [showMovimientosModal, setShowMovimientosModal] = useState(false);
  const [selectedBolsillo, setSelectedBolsillo] = useState<Bolsillo | null>(null);
  const [activeTab, setActiveTab] = useState<'bolsillos' | 'pagos' | 'deudas' | 'reportes'>('bolsillos');
  const [editingBolsillo, setEditingBolsillo] = useState<Bolsillo | null>(null);
  const [currentMoto, setCurrentMoto] = useState(moto);
  const [selectedBolsillosCards, setSelectedBolsillosCards] = useState<string[]>([]);
  const [showBolsilloSelectorModal, setShowBolsilloSelectorModal] = useState(false);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [showDeudaForm, setShowDeudaForm] = useState(false);
  const [showMovimientoDeudaForm, setShowMovimientoDeudaForm] = useState(false);
  const [editingDeuda, setEditingDeuda] = useState<Deuda | null>(null);
  const [selectedDeuda, setSelectedDeuda] = useState<Deuda | null>(null);

  useEffect(() => {
    loadData();
  }, [moto.id]);

  useEffect(() => {
    setCurrentMoto(moto);
  }, [moto]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bolsillosData, pagosData, deudasData] = await Promise.all([
        getBolsillos(currentMoto.id),
        getPagos(currentMoto.id),
        getDeudas(currentMoto.id)
      ]);
      setBolsillos(bolsillosData);
      setPagos(pagosData);
      setDeudas(deudasData);
      
      // Cargar bolsillos seleccionados
      await loadSelectedBolsillos();
      
      // Cargar movimientos por separado para no bloquear el resto
      try {
        const movimientosData = await getMovimientosReporte(currentMoto.id);
        setMovimientos(movimientosData);
      } catch (movError) {
        console.error('Error loading movimientos:', movError);
        setMovimientos([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedBolsillos = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('selected_bolsillos')
        .eq('user_id', currentMoto.user_id)
        .eq('moto_id', currentMoto.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading selected bolsillos:', error);
      }
      
      if (data?.selected_bolsillos && Array.isArray(data.selected_bolsillos)) {
        console.log('Bolsillos cargados:', data.selected_bolsillos);
        setSelectedBolsillosCards(data.selected_bolsillos);
      } else {
        setSelectedBolsillosCards([]);
      }
    } catch (error) {
      console.error('Error loading selected bolsillos:', error);
      setSelectedBolsillosCards([]);
    }
  };

  const saveSelectedBolsillos = async (selection: string[]) => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: currentMoto.user_id,
          moto_id: currentMoto.id,
          selected_bolsillos: selection,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,moto_id'
        });
      
      if (error) {
        console.error('Error saving selected bolsillos:', error);
      } else {
        console.log('Bolsillos guardados:', selection);
      }
    } catch (error) {
      console.error('Error saving selected bolsillos:', error);
    }
  };

  const handleCreateBolsillo = async (bolsillo: Database['public']['Tables']['bolsillos']['Insert']) => {
    if (editingBolsillo) {
      await updateBolsillo(editingBolsillo.id, bolsillo);
      setEditingBolsillo(null);
    } else {
      await createBolsillo(bolsillo);
    }
    await loadData();
    setShowBolsilloForm(false);
  };

  const handleEditBolsillo = (bolsillo: Bolsillo) => {
    setEditingBolsillo(bolsillo);
    setShowBolsilloForm(true);
  };

  const handleUpdateMoto = async (motoData: Database['public']['Tables']['motos']['Insert']) => {
    try {
      const updatedMoto = await updateMoto(currentMoto.id, motoData);
      setCurrentMoto(updatedMoto);
      onMotoUpdate?.(updatedMoto);
      setShowMotoForm(false);
    } catch (error: any) {
      alert(error.message || 'Error al actualizar la moto');
    }
  };

  const handleDeleteBolsillo = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este bolsillo?')) {
      await deleteBolsillo(id);
      await loadData();
    }
  };

  const handleCreatePago = async (pago: Database['public']['Tables']['pagos']['Insert']) => {
    await createPago(pago);
    await loadData();
    setShowPagoForm(false);
  };

  const handleDeletePago = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este pago? Esta acción no se puede deshacer.')) {
      try {
        await deletePago(id);
        await loadData();
      } catch (error: any) {
        alert(error.message || 'Error al eliminar el pago');
      }
    }
  };

  const handleTransferencia = async (origenId: string, destinoId: string, valor: number, observacion: string) => {
    await createTransferencia(origenId, destinoId, valor, observacion);
    await loadData();
    setShowMovimientoForm(false);
  };

  const handleRetiro = async (bolsilloId: string, valor: number, observacion: string) => {
    await createRetiro(bolsilloId, valor, observacion);
    await loadData();
    setShowMovimientoForm(false);
  };

  const handleRetiroMultiple = async (retiros: { bolsilloId: string; valor: number }[], observacion: string) => {
    await createRetiroMultiple(retiros, observacion);
    await loadData();
    setShowMovimientoForm(false);
  };

  const handleCreateDeuda = async (deuda: Database['public']['Tables']['deudas']['Insert']) => {
    try {
      console.log('handleCreateDeuda called with:', deuda);
      
      if (editingDeuda) {
        console.log('Updating deuda:', editingDeuda.id);
        await updateDeuda(editingDeuda.id, deuda);
        setEditingDeuda(null);
      } else {
        console.log('Creating new deuda');
        await createDeuda(deuda);
      }
      
      console.log('Reloading data...');
      await loadData();
      setShowDeudaForm(false);
      console.log('Deuda operation completed successfully');
    } catch (error) {
      console.error('Error in handleCreateDeuda:', error);
      throw error;
    }
  };

  const handleEditDeuda = (deuda: Deuda) => {
    setEditingDeuda(deuda);
    setShowDeudaForm(true);
  };

  const handleDeleteDeuda = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta deuda?')) {
      await deleteDeuda(id);
      await loadData();
    }
  };

  const handleMovimientoDeuda = async (
    tipo: 'abono' | 'cargo',
    valor: number,
    observacion: string,
    bolsillos?: { bolsilloId: string; valor: number }[]
  ) => {
    if (!selectedDeuda) return;
    await createMovimientoDeuda(selectedDeuda.id, tipo, valor, observacion, bolsillos);
    await loadData();
    setShowMovimientoDeudaForm(false);
    setSelectedDeuda(null);
  };

  const totalBolsillos = bolsillos.reduce((sum, b) => sum + b.saldo_actual, 0);
  const totalPagos = pagos.reduce((sum, p) => sum + p.valor_pagado, 0);
  const totalDeudas = deudas.reduce((sum, d) => sum + d.saldo_actual, 0);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-fuchsia-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-fuchsia-600 mb-4"
          >
            <ArrowLeft size={20} />
            Volver
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-fuchsia-600 bg-clip-text text-transparent">{currentMoto.placa}</h1>
              <p className="text-sm text-slate-600">
                {currentMoto.modelo && `${currentMoto.modelo} • `}{currentMoto.color} • {currentMoto.cilindraje}cc • {currentMoto.tipo_pago}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowMotoForm(true)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                title="Editar moto"
              >
                <Settings size={20} />
              </button>
              <div className="text-right">
                <p className="text-sm text-slate-600">Cuota {currentMoto.tipo_pago}</p>
                <p className="text-2xl font-bold text-slate-900">
                  ${currentMoto.valor_cuota.toLocaleString('es-ES')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 overflow-hidden">
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 ${
          // Responsive grid basado en cantidad de tarjetas
          (() => {
            const totalCards = 3 + selectedBolsillosCards.length + (selectedBolsillosCards.length < 2 ? 1 : 0);
            if (totalCards <= 2) return 'md:grid-cols-2';
            if (totalCards === 3) return 'md:grid-cols-3';
            if (totalCards === 4) return 'md:grid-cols-2 lg:grid-cols-4';
            return 'md:grid-cols-3 lg:grid-cols-5';
          })()
        }`}>
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="text-blue-500" size={24} />
              <span className="text-sm text-blue-600">Total en Bolsillos</span>
            </div>
            <p className="text-3xl font-bold text-fuchsia-600">
              ${totalBolsillos.toLocaleString('es-ES')}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="text-fuchsia-500" size={24} />
              <span className="text-sm text-blue-600">Total Recibido</span>
            </div>
            <p className="text-3xl font-bold text-fuchsia-600">
              ${totalPagos.toLocaleString('es-ES')}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-blue-500" size={24} />
              <span className="text-sm text-blue-600">Total Pagos</span>
            </div>
            <p className="text-3xl font-bold text-fuchsia-600">{pagos.length}</p>
          </div>

          {/* Bolsillos seleccionados */}
          {selectedBolsillosCards.map((bolsilloId) => {
            const bolsillo = bolsillos.find(b => b.id === bolsilloId);
            if (!bolsillo) return null;
            return (
              <div key={bolsilloId} className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-blue-200 relative">
                <button
                  onClick={() => {
                    const newSelection = selectedBolsillosCards.filter(id => id !== bolsilloId);
                    setSelectedBolsillosCards(newSelection);
                    saveSelectedBolsillos(newSelection);
                  }}
                  className="absolute top-2 right-2 p-1 text-blue-400 hover:text-fuchsia-500 transition"
                  title="Quitar bolsillo"
                >
                  <X size={16} />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="text-fuchsia-500" size={24} />
                  <span className="text-sm text-blue-600">{bolsillo.nombre}</span>
                </div>
                <p className="text-3xl font-bold text-fuchsia-600">
                  ${bolsillo.saldo_actual.toLocaleString('es-ES')}
                </p>
              </div>
            );
          })}

          {/* Botón agregar bolsillo */}
          {selectedBolsillosCards.length < 2 && (
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-blue-200 border-dashed">
              <button
                onClick={() => setShowBolsilloSelectorModal(true)}
                className="w-full h-full flex flex-col items-center justify-center text-blue-400 hover:text-fuchsia-500 transition"
                disabled={bolsillos.filter(b => !selectedBolsillosCards.includes(b.id)).length === 0}
              >
                <Plus size={32} className="mb-2" />
                <span className="text-sm font-medium">Agregar Bolsillo</span>
              </button>
            </div>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-blue-200 mb-6">
          <div className="border-b border-blue-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('bolsillos')}
                className={`flex-1 py-4 px-6 font-medium transition flex items-center justify-center gap-2 ${
                  activeTab === 'bolsillos'
                    ? 'border-b-2 border-fuchsia-500 text-fuchsia-600'
                    : 'text-blue-600 hover:text-fuchsia-600'
                }`}
              >
                <Wallet size={18} className="sm:hidden" />
                <span className="hidden sm:inline">Bolsillos</span>
              </button>
              <button
                onClick={() => setActiveTab('pagos')}
                className={`flex-1 py-4 px-6 font-medium transition flex items-center justify-center gap-2 ${
                  activeTab === 'pagos'
                    ? 'border-b-2 border-fuchsia-500 text-fuchsia-600'
                    : 'text-blue-600 hover:text-fuchsia-600'
                }`}
              >
                <CreditCard size={18} className="sm:hidden" />
                <span className="hidden sm:inline">Pagos</span>
              </button>
              <button
                onClick={() => setActiveTab('deudas')}
                className={`flex-1 py-4 px-6 font-medium transition flex items-center justify-center gap-2 ${
                  activeTab === 'deudas'
                    ? 'border-b-2 border-fuchsia-500 text-fuchsia-600'
                    : 'text-blue-600 hover:text-fuchsia-600'
                }`}
              >
                <Receipt size={18} className="sm:hidden" />
                <span className="hidden sm:inline">Deudas</span>
              </button>
              <button
                onClick={() => setActiveTab('reportes')}
                className={`flex-1 py-4 px-6 font-medium transition flex items-center justify-center gap-2 ${
                  activeTab === 'reportes'
                    ? 'border-b-2 border-fuchsia-500 text-fuchsia-600'
                    : 'text-blue-600 hover:text-fuchsia-600'
                }`}
              >
                <BarChart3 size={18} className="sm:hidden" />
                <span className="hidden sm:inline">Reportes</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'bolsillos' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">Bolsillos</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowMovimientoForm(true)}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                    >
                      <ArrowLeftRight size={18} />
                      <span className="hidden sm:inline">Movimientos</span>
                    </button>
                    <button
                      onClick={() => setShowBolsilloForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                    >
                      <Plus size={18} />
                      <span className="hidden sm:inline">Agregar</span>
                    </button>
                  </div>
                </div>

                {bolsillos.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600 mb-4">No hay bolsillos configurados</p>
                    <button
                      onClick={() => setShowBolsilloForm(true)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                    >
                      Agregar Primer Bolsillo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bolsillos.map((bolsillo) => (
                      <div
                        key={bolsillo.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <h4 className="font-semibold text-slate-900">{bolsillo.nombre}</h4>
                          <p className="text-sm text-slate-600">
                            {bolsillo.tipo_descuento === 'porcentaje'
                              ? `${bolsillo.valor_descuento}%`
                              : `$${bolsillo.valor_descuento.toLocaleString('es-ES')}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Saldo</p>
                            <p className="text-lg font-bold text-green-600">
                              ${bolsillo.saldo_actual.toLocaleString('es-ES')}
                            </p>
                          </div>
                          <div className="flex gap-1 sm:gap-2">
                            <button
                              onClick={() => {
                                setSelectedBolsillo(bolsillo);
                                setShowMovimientosModal(true);
                              }}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                              title="Ver movimientos"
                            >
                              <History size={18} />
                            </button>
                            <button
                              onClick={() => handleEditBolsillo(bolsillo)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Editar bolsillo"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteBolsillo(bolsillo.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Eliminar bolsillo"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pagos' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">Historial de Pagos</h3>
                  <button
                    onClick={() => setShowPagoForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                    disabled={bolsillos.length === 0}
                  >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Registrar Pago</span>
                  </button>
                </div>

                {bolsillos.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600 mb-4">
                      Primero debes configurar los bolsillos antes de registrar pagos
                    </p>
                  </div>
                ) : pagos.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600 mb-4">No hay pagos registrados</p>
                    <button
                      onClick={() => setShowPagoForm(true)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                    >
                      Registrar Primer Pago
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pagos.map((pago) => (
                      <div
                        key={pago.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {new Date(pago.fecha_pago).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-sm text-slate-600 capitalize">{pago.tipo_pago}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-lg font-bold text-slate-900">
                            ${pago.valor_pagado.toLocaleString('es-ES')}
                          </p>
                          <button
                            onClick={() => handleDeletePago(pago.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar pago"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'deudas' && (
              <div className="w-full sm:px-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">Deudas</h3>
                  <button
                    onClick={() => setShowDeudaForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Nueva Deuda</span>
                  </button>
                </div>

                {deudas.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600 mb-4">No hay deudas registradas</p>
                    <button
                      onClick={() => setShowDeudaForm(true)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                    >
                      Registrar Primera Deuda
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deudas.map((deuda) => (
                      <div
                        key={deuda.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">{deuda.descripcion}</h4>
                          <div className="flex gap-4 text-sm text-slate-600 mt-1">
                            <span>Inicial: ${deuda.valor_inicial.toLocaleString('es-ES')}</span>
                            <span className={`font-medium ${
                              deuda.saldo_actual > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              Saldo: ${deuda.saldo_actual.toLocaleString('es-ES')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedDeuda(deuda);
                              setShowMovimientoDeudaForm(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Movimiento"
                          >
                            <Receipt size={18} />
                          </button>
                          <button
                            onClick={() => handleEditDeuda(deuda)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                            title="Editar deuda"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteDeuda(deuda.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar deuda"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reportes' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Reportes</h3>

                {bolsillos.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600">No hay datos para mostrar</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {bolsillos.map((bolsillo) => {
                        const porcentaje = totalBolsillos > 0
                          ? (bolsillo.saldo_actual / totalBolsillos) * 100
                          : 0;

                        return (
                          <div key={bolsillo.id} className="bg-slate-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-slate-900">{bolsillo.nombre}</span>
                              <span className="text-sm text-slate-600">
                                {porcentaje.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                              <div
                                className="bg-slate-900 h-2 rounded-full transition-all"
                                style={{ width: `${porcentaje}%` }}
                              />
                            </div>
                            <p className="text-lg font-bold text-slate-900">
                              ${bolsillo.saldo_actual.toLocaleString('es-ES')}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-slate-50 p-6 rounded-lg">
                      <h4 className="font-semibold text-slate-900 mb-4">Resumen</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Número de bolsillos:</span>
                          <span className="font-semibold">{bolsillos.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total acumulado:</span>
                          <span className="font-semibold">${totalBolsillos.toLocaleString('es-ES')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Pagos realizados:</span>
                          <span className="font-semibold">{pagos.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total recibido:</span>
                          <span className="font-semibold">${totalPagos.toLocaleString('es-ES')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6">
                      <h4 className="font-semibold text-slate-900 mb-4">Detalle de Pagos por Bolsillo</h4>
                      {pagos.length === 0 ? (
                        <p className="text-slate-500 text-center py-4">No hay pagos registrados</p>
                      ) : (
                        <div className="space-y-4">
                          {pagos.slice(0, 5).map((pago) => (
                            <PagoDetalle key={pago.id} pago={pago} bolsillos={bolsillos} />
                          ))}
                          {pagos.length > 5 && (
                            <p className="text-sm text-slate-500 text-center pt-2">
                              Mostrando los últimos 5 pagos de {pagos.length} total
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6">
                      <h4 className="font-semibold text-slate-900 mb-4">Últimos 10 Movimientos</h4>
                      {movimientos.length === 0 ? (
                        <p className="text-slate-500 text-center py-4">No hay movimientos registrados</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <div className="sm:min-w-0">
                            <div className="hidden sm:grid sm:grid-cols-6 gap-4 p-3 bg-slate-100 rounded-lg font-semibold text-slate-700 mb-3">
                              <div>Fecha</div>
                              <div>Tipo</div>
                              <div>Origen</div>
                              <div>Destino</div>
                              <div>Descripción</div>
                              <div className="text-right">Valor</div>
                            </div>
                            <div className="space-y-3">
                              {movimientos.map((movimiento) => {
                                const getMovimientoColor = (tipo: string) => {
                                  switch (tipo) {
                                    case 'carga': return 'text-green-600';
                                    case 'descarga': return 'text-red-600';
                                    case 'transferencia': return 'text-blue-600';
                                    default: return 'text-gray-600';
                                  }
                                };
                                
                                return (
                                  <div key={`${movimiento.fecha}-${movimiento.valor}`} className="bg-slate-50 rounded-lg p-3">
                                    {/* Mobile layout */}
                                    <div className="sm:hidden space-y-2">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="text-sm text-slate-600">
                                            {new Date(movimiento.fecha).toLocaleDateString('es-ES', {
                                              day: '2-digit',
                                              month: 'short'
                                            })}
                                          </div>
                                          <div className="font-medium text-slate-900">
                                            {movimiento.tipo_movimiento === 'transferencia' ? 'Transferencia' : 
                                             movimiento.tipo_movimiento === 'descarga' ? 
                                               (movimiento.es_retiro_multiple ? 'Retiro Múltiple' : 'Retiro') : 'Carga'}
                                          </div>
                                        </div>
                                        <span className={`font-bold ${getMovimientoColor(movimiento.tipo_movimiento)}`}>
                                          {movimiento.tipo_movimiento === 'descarga' || movimiento.valor < 0 ? '-' : '+'}
                                          ${Math.abs(movimiento.valor).toLocaleString('es-ES')}
                                        </span>
                                      </div>
                                      {(movimiento.bolsillo_origen || movimiento.bolsillo_destino) && (
                                        <div className="text-sm text-slate-600">
                                          {movimiento.bolsillo_origen && `De: ${movimiento.bolsillo_origen}`}
                                          {movimiento.bolsillo_origen && movimiento.bolsillo_destino && ' → '}
                                          {movimiento.bolsillo_destino && `A: ${movimiento.bolsillo_destino}`}
                                        </div>
                                      )}
                                      {movimiento.descripcion && (
                                        <div className="text-sm text-slate-600">
                                          {movimiento.descripcion}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Desktop layout */}
                                    <div className="hidden sm:grid sm:grid-cols-6 gap-4 items-center">
                                      <div className="text-sm text-slate-600">
                                        {new Date(movimiento.fecha).toLocaleDateString('es-ES', {
                                          day: '2-digit',
                                          month: 'short'
                                        })}
                                      </div>
                                      <div className="font-medium text-slate-900 capitalize">
                                        {movimiento.tipo_movimiento === 'transferencia' ? 'Transferencia' : 
                                         movimiento.tipo_movimiento === 'descarga' ? 
                                           (movimiento.es_retiro_multiple ? 'Retiro Múltiple' : 'Retiro') : 'Carga'}
                                      </div>
                                      <div className="text-sm text-slate-600">
                                        {movimiento.bolsillo_origen || '-'}
                                      </div>
                                      <div className="text-sm text-slate-600">
                                        {movimiento.bolsillo_destino || '-'}
                                      </div>
                                      <div className="text-sm text-slate-600">
                                        {movimiento.descripcion}
                                      </div>
                                      <div className="text-right">
                                        <span className={`font-bold ${getMovimientoColor(movimiento.tipo_movimiento)}`}>
                                          {movimiento.tipo_movimiento === 'descarga' || movimiento.valor < 0 ? '-' : '+'}
                                          ${Math.abs(movimiento.valor).toLocaleString('es-ES')}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {showBolsilloForm && (
        <BolsilloForm
          motoId={currentMoto.id}
          onSubmit={handleCreateBolsillo}
          onClose={() => {
            setShowBolsilloForm(false);
            setEditingBolsillo(null);
          }}
          initialData={editingBolsillo || undefined}
        />
      )}

      {showPagoForm && (
        <PagoForm
          motoId={currentMoto.id}
          valorCuota={currentMoto.valor_cuota}
          onSubmit={handleCreatePago}
          onClose={() => setShowPagoForm(false)}
        />
      )}

      {showMovimientoForm && (
        <MovimientoForm
          bolsillos={bolsillos}
          onTransferencia={handleTransferencia}
          onRetiro={handleRetiro}
          onRetiroMultiple={handleRetiroMultiple}
          onClose={() => setShowMovimientoForm(false)}
        />
      )}

      {showMotoForm && (
        <MotoForm
          userId={currentMoto.user_id}
          onSubmit={handleUpdateMoto}
          onClose={() => setShowMotoForm(false)}
          initialData={currentMoto}
        />
      )}

      {showMovimientosModal && selectedBolsillo && (
        <MovimientosModal
          bolsilloId={selectedBolsillo.id}
          bolsilloNombre={selectedBolsillo.nombre}
          onClose={() => {
            setShowMovimientosModal(false);
            setSelectedBolsillo(null);
          }}
        />
      )}

      {showDeudaForm && (
        <DeudaForm
          motoId={currentMoto.id}
          onSubmit={handleCreateDeuda}
          onClose={() => {
            setShowDeudaForm(false);
            setEditingDeuda(null);
          }}
          initialData={editingDeuda || undefined}
        />
      )}

      {showMovimientoDeudaForm && selectedDeuda && (
        <MovimientoDeudaForm
          deudaId={selectedDeuda.id}
          descripcionDeuda={selectedDeuda.descripcion}
          bolsillos={bolsillos}
          onSubmit={handleMovimientoDeuda}
          onClose={() => {
            setShowMovimientoDeudaForm(false);
            setSelectedDeuda(null);
          }}
        />
      )}

      {/* Modal selector de bolsillos */}
      {showBolsilloSelectorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-900">Seleccionar Bolsillo</h2>
              <button
                onClick={() => setShowBolsilloSelectorModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {bolsillos
                  .filter(b => !selectedBolsillosCards.includes(b.id))
                  .map((bolsillo) => (
                    <button
                      key={bolsillo.id}
                      onClick={() => {
                        const newSelection = [...selectedBolsillosCards, bolsillo.id];
                        setSelectedBolsillosCards(newSelection);
                        saveSelectedBolsillos(newSelection);
                        setShowBolsilloSelectorModal(false);
                      }}
                      className="w-full text-left p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900">{bolsillo.nombre}</div>
                          <div className="text-sm text-slate-500">
                            {bolsillo.tipo_descuento === 'porcentaje'
                              ? `${bolsillo.valor_descuento}%`
                              : `$${bolsillo.valor_descuento.toLocaleString('es-ES')}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">
                            ${bolsillo.saldo_actual.toLocaleString('es-ES')}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                }
                {bolsillos.filter(b => !selectedBolsillosCards.includes(b.id)).length === 0 && (
                  <p className="text-center text-slate-500 py-8">
                    No hay más bolsillos disponibles
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <footer className="bg-white/80 backdrop-blur-sm border-t border-blue-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-blue-600">MotoWallet v1.1.0</p>
        </div>
      </footer>
    </div>
  );
}
