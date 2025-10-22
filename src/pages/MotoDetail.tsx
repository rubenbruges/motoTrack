import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Wallet, CreditCard, ArrowLeftRight, TrendingUp, Trash2, Edit, Settings, History } from 'lucide-react';
import { getBolsillos, createBolsillo, updateBolsillo, deleteBolsillo } from '../services/bolsilloService';
import { getPagos, createPago, deletePago } from '../services/pagoService';
import { createTransferencia, createRetiro, getMovimientos, getMovimientosReporte } from '../services/movimientoService';
import { updateMoto } from '../services/motoService';
import { BolsilloForm } from '../components/BolsilloForm';
import { PagoForm } from '../components/PagoForm';
import { MovimientoForm } from '../components/MovimientoForm';
import { MotoForm } from '../components/MotoForm';
import { PagoDetalle } from '../components/PagoDetalle';
import { MovimientosModal } from '../components/MovimientosModal';
import type { Database } from '../lib/database.types';

type Moto = Database['public']['Tables']['motos']['Row'];
type Bolsillo = Database['public']['Tables']['bolsillos']['Row'];
type Pago = Database['public']['Tables']['pagos']['Row'];

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
  const [activeTab, setActiveTab] = useState<'bolsillos' | 'pagos' | 'reportes'>('bolsillos');
  const [editingBolsillo, setEditingBolsillo] = useState<Bolsillo | null>(null);
  const [currentMoto, setCurrentMoto] = useState(moto);

  useEffect(() => {
    loadData();
  }, [moto.id]);

  useEffect(() => {
    setCurrentMoto(moto);
  }, [moto]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bolsillosData, pagosData] = await Promise.all([
        getBolsillos(currentMoto.id),
        getPagos(currentMoto.id)
      ]);
      setBolsillos(bolsillosData);
      setPagos(pagosData);
      
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

  const totalBolsillos = bolsillos.reduce((sum, b) => sum + b.saldo_actual, 0);
  const totalPagos = pagos.reduce((sum, p) => sum + p.valor_pagado, 0);

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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft size={20} />
            Volver
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{currentMoto.placa}</h1>
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="text-green-600" size={24} />
              <span className="text-sm text-slate-600">Total en Bolsillos</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              ${totalBolsillos.toLocaleString('es-ES')}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="text-blue-600" size={24} />
              <span className="text-sm text-slate-600">Total Recibido</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              ${totalPagos.toLocaleString('es-ES')}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-orange-600" size={24} />
              <span className="text-sm text-slate-600">Total Pagos</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{pagos.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="border-b border-slate-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('bolsillos')}
                className={`flex-1 py-4 px-6 font-medium transition ${
                  activeTab === 'bolsillos'
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bolsillos
              </button>
              <button
                onClick={() => setActiveTab('pagos')}
                className={`flex-1 py-4 px-6 font-medium transition ${
                  activeTab === 'pagos'
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pagos
              </button>
              <button
                onClick={() => setActiveTab('reportes')}
                className={`flex-1 py-4 px-6 font-medium transition ${
                  activeTab === 'reportes'
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reportes
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
                      Movimientos
                    </button>
                    <button
                      onClick={() => setShowBolsilloForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                    >
                      <Plus size={18} />
                      Agregar
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
                          <div className="flex gap-2">
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
                    Registrar Pago
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

                    <div className="bg-white border border-slate-200 rounded-lg p-6">
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

                    <div className="bg-white border border-slate-200 rounded-lg p-6">
                      <h4 className="font-semibold text-slate-900 mb-4">Últimos 10 Movimientos</h4>
                      {movimientos.length === 0 ? (
                        <p className="text-slate-500 text-center py-4">No hay movimientos registrados</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <div className="min-w-[800px] space-y-3">
                            <div className="grid grid-cols-6 gap-4 p-3 bg-slate-100 rounded-lg font-semibold text-slate-700">
                              <div>Fecha</div>
                              <div>Tipo</div>
                              <div>Origen</div>
                              <div>Destino</div>
                              <div>Descripción</div>
                              <div className="text-right">Valor</div>
                            </div>
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
                                <div key={`${movimiento.fecha}-${movimiento.valor}`} className="grid grid-cols-6 gap-4 p-3 bg-slate-50 rounded-lg items-center">
                                  <div className="text-sm text-slate-600">
                                    {new Date(movimiento.fecha).toLocaleDateString('es-ES', {
                                      day: '2-digit',
                                      month: 'short'
                                    })}
                                  </div>
                                  <div className="font-medium text-slate-900 capitalize">
                                    {movimiento.tipo_movimiento === 'transferencia' ? 'Transferencia' : 
                                     movimiento.tipo_movimiento === 'descarga' ? 'Retiro' : 'Carga'}
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
                              );
                            })}
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
    </div>
  );
}
