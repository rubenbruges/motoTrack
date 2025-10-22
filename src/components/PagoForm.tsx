import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { getBolsillos } from '../services/bolsilloService';
import { useFormattedNumber } from '../hooks/useFormattedNumber';

type PagoInsert = Database['public']['Tables']['pagos']['Insert'];

interface PagoFormProps {
  motoId: string;
  valorCuota: number;
  onSubmit: (pago: PagoInsert & { distribucionManual?: { bolsilloId: string; valor: number }[] }) => Promise<void>;
  onClose: () => void;
}

type Bolsillo = Database['public']['Tables']['bolsillos']['Row'];

export function PagoForm({ motoId, valorCuota, onSubmit, onClose }: PagoFormProps) {
  const [loading, setLoading] = useState(false);
  const [tipoPago, setTipoPago] = useState<'total' | 'parcial'>('total');
  const [valorPagado, setValorPagado] = useState(valorCuota);
  const transferencia = useFormattedNumber();
  const efectivo = useFormattedNumber();
  const [observaciones, setObservaciones] = useState('');
  const [fechaPago, setFechaPago] = useState(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });
  const [bolsillos, setBolsillos] = useState<Bolsillo[]>([]);
  const [requiereDistribucionManual, setRequiereDistribucionManual] = useState(false);
  const [distribucionManual, setDistribucionManual] = useState<{ bolsilloId: string; valor: number; displayValue: string }[]>([]);
  const [totalRequerido, setTotalRequerido] = useState(0);

  useEffect(() => {
    loadBolsillos();
  }, [motoId]);

  useEffect(() => {
    if (tipoPago === 'parcial') {
      setValorPagado(transferencia.numericValue + efectivo.numericValue);
    }
  }, [transferencia.numericValue, efectivo.numericValue, tipoPago]);

  useEffect(() => {
    if (bolsillos.length > 0 && tipoPago === 'parcial' && valorPagado > 0) {
      calcularDistribucion();
    } else {
      setRequiereDistribucionManual(false);
    }
  }, [bolsillos, valorPagado, tipoPago]);

  const loadBolsillos = async () => {
    try {
      const data = await getBolsillos(motoId);
      setBolsillos(data);
    } catch (error) {
      console.error('Error loading bolsillos:', error);
    }
  };

  const calcularDistribucion = () => {
    setTotalRequerido(valorCuota);

    if (valorPagado < valorCuota) {
      setRequiereDistribucionManual(true);
      setDistribucionManual(bolsillos.map(b => ({ bolsilloId: b.id, valor: 0, displayValue: '' })));
    } else {
      setRequiereDistribucionManual(false);
      setDistribucionManual([]);
    }
  };

  const updateDistribucionManual = (bolsilloId: string, inputValue: string) => {
    // Formatear el valor
    const cleaned = inputValue.replace(/[^\d]/g, '');
    const formatted = cleaned ? cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
    const numericValue = parseFloat(cleaned) || 0;
    
    setDistribucionManual(prev => 
      prev.map(d => d.bolsilloId === bolsilloId ? { ...d, valor: numericValue, displayValue: formatted } : d)
    );
  };

  const getTotalDistribuido = () => {
    return distribucionManual.reduce((sum, d) => sum + d.valor, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (requiereDistribucionManual && getTotalDistribuido() !== valorPagado) {
      alert(`El total distribuido (${getTotalDistribuido().toLocaleString('es-ES')}) debe ser igual al valor pagado (${valorPagado.toLocaleString('es-ES')})`);
      return;
    }

    setLoading(true);
    try {
      const pagoData = {
        moto_id: motoId,
        tipo_pago: tipoPago,
        valor_pagado: valorPagado,
        fecha_pago: `${fechaPago}T12:00:00.000Z`,
        ...(tipoPago === 'parcial' && {
          transferencia: transferencia.numericValue,
          efectivo: efectivo.numericValue,
          observaciones
        }),
        ...(requiereDistribucionManual && { distribucionManual })
      };
      
      await onSubmit(pagoData);
      onClose();
    } catch (error: any) {
      alert(error.message || 'Error al registrar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-2xl font-bold text-slate-900">Registrar Pago</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Pago *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTipoPago('total');
                  setValorPagado(valorCuota);
                  transferencia.reset();
                  efectivo.reset();
                }}
                className={`py-3 px-4 rounded-lg font-medium transition ${
                  tipoPago === 'total'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Total
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoPago('parcial');
                  setValorPagado(0);
                  transferencia.reset();
                  efectivo.reset();
                }}
                className={`py-3 px-4 rounded-lg font-medium transition ${
                  tipoPago === 'parcial'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Parcial
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Fecha del Pago *
            </label>
            <input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              required
            />
          </div>

          {tipoPago === 'total' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Valor Pagado *
              </label>
              <input
                type="number"
                value={valorPagado}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50"
                disabled
              />
              <p className="text-xs text-slate-500 mt-1">
                Valor automático de la cuota
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Transferencia
                </label>
                <input
                  type="text"
                  value={transferencia.displayValue}
                  onChange={(e) => transferencia.handleChange(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Efectivo
                </label>
                <input
                  type="text"
                  value={efectivo.displayValue}
                  onChange={(e) => efectivo.handleChange(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Total: </span>
                  ${(transferencia.numericValue + efectivo.numericValue).toLocaleString('es-ES')}
                </p>
              </div>
            </div>
          )}

          {requiereDistribucionManual && (
            <div className="border border-orange-200 bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="text-orange-600" size={20} />
                <h3 className="font-medium text-orange-800">Distribución Manual Requerida</h3>
              </div>
              <p className="text-sm text-orange-700 mb-4">
                El pago (${valorPagado.toLocaleString('es-ES')}) no cubre el total requerido (${totalRequerido.toLocaleString('es-ES')}). 
                Distribuye manualmente el valor entre los bolsillos:
              </p>
              
              <div className="space-y-3">
                {bolsillos.map(bolsillo => {
                  const distribucion = distribucionManual.find(d => d.bolsilloId === bolsillo.id);
                  return (
                    <div key={bolsillo.id} className="flex items-center justify-between bg-white p-3 rounded border">
                      <div>
                        <p className="font-medium text-slate-900">{bolsillo.nombre}</p>
                        <p className="text-xs text-slate-500">
                          {bolsillo.tipo_descuento === 'porcentaje' 
                            ? `${bolsillo.valor_descuento}%` 
                            : `$${bolsillo.valor_descuento.toLocaleString('es-ES')}`}
                        </p>
                      </div>
                      <input
                        type="text"
                        value={distribucion?.displayValue || ''}
                        onChange={(e) => updateDistribucionManual(bolsillo.id, e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                        placeholder="0"
                      />
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-3 p-2 bg-white rounded border">
                <div className="flex justify-between text-sm">
                  <span>Total Distribuido:</span>
                  <span className={getTotalDistribuido() === valorPagado ? 'text-green-600 font-medium' : 'text-red-600'}>
                    ${getTotalDistribuido().toLocaleString('es-ES')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Valor Faltante:</span>
                  <span className={valorPagado - getTotalDistribuido() === 0 ? 'text-green-600 font-medium' : 'text-orange-600'}>
                    ${(valorPagado - getTotalDistribuido()).toLocaleString('es-ES')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Valor Pagado:</span>
                  <span className="font-medium">${valorPagado.toLocaleString('es-ES')}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm text-slate-600">
              El pago se distribuirá automáticamente entre los bolsillos configurados según sus porcentajes o valores fijos.
            </p>
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
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
