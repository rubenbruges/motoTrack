import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface MonthPickerProps {
  value: string;
  onChange: (month: string) => void;
  minMonth?: string;
  maxMonth?: string;
}

export function MonthPicker({ value, onChange, minMonth, maxMonth }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(parseInt(value.split('-')[0]));
  
  const [year, month] = value.split('-');
  const currentMonth = parseInt(month) - 1;
  
  const displayMonth = new Date(parseInt(year), currentMonth, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  });

  const handleMonthClick = (monthNum: number) => {
    const newMonth = String(monthNum + 1).padStart(2, '0');
    onChange(`${displayYear}-${newMonth}`);
    setIsOpen(false);
  };

  const handleYearChange = (newYear: number) => {
    setDisplayYear(newYear);
    onChange(`${newYear}-${month}`);
  };

  const getMinDate = () => {
    if (!minMonth) return undefined;
    const [minYear, minMonthStr] = minMonth.split('-');
    return new Date(parseInt(minYear), parseInt(minMonthStr) - 1, 1);
  };

  const getMaxDate = () => {
    if (!maxMonth) return undefined;
    const [maxYear, maxMonthStr] = maxMonth.split('-');
    return new Date(parseInt(maxYear), parseInt(maxMonthStr), 0);
  };

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const canGoPrev = !getMinDate() || new Date(displayYear - 1, 0, 1) >= getMinDate();
  const canGoNext = !getMaxDate() || new Date(displayYear + 1, 11, 31) <= getMaxDate();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1 border border-slate-300 rounded text-sm bg-white hover:bg-slate-50 transition capitalize"
      >
        <span>{displayMonth}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-slate-300 rounded-lg shadow-lg z-50 p-4 w-64">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => canGoPrev && handleYearChange(displayYear - 1)}
              disabled={!canGoPrev}
              className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &lt;
            </button>
            <span className="font-semibold text-slate-900">
              {displayYear}
            </span>
            <button
              type="button"
              onClick={() => canGoNext && handleYearChange(displayYear + 1)}
              disabled={!canGoNext}
              className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &gt;
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {months.map((m, idx) => {
              const testDate = new Date(displayYear, idx, 1);
              const isDisabled = (getMinDate() && testDate < getMinDate()) || (getMaxDate() && testDate > getMaxDate());
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => !isDisabled && handleMonthClick(idx)}
                  disabled={isDisabled}
                  className={`py-2 px-1 rounded text-sm font-medium transition ${
                    idx === currentMonth && displayYear === parseInt(year)
                      ? 'bg-blue-600 text-white'
                      : isDisabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
