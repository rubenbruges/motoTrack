import { useState } from 'react';

export function useFormattedNumber(initialValue: number = 0) {
  const [displayValue, setDisplayValue] = useState('');
  const [numericValue, setNumericValue] = useState(initialValue);

  const formatNumber = (value: string) => {
    // Remover todo excepto números
    const cleaned = value.replace(/[^\d]/g, '');
    
    if (!cleaned) return '';
    
    // Formatear con separadores de miles
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleChange = (value: string) => {
    const formatted = formatNumber(value);
    setDisplayValue(formatted);
    
    // Convertir a número para cálculos (usar el valor limpio sin puntos)
    const cleaned = value.replace(/[^\d]/g, '');
    const numeric = parseFloat(cleaned) || 0;
    setNumericValue(numeric);
  };

  const reset = () => {
    setDisplayValue('');
    setNumericValue(0);
  };

  return {
    displayValue,
    numericValue,
    handleChange,
    reset
  };
}