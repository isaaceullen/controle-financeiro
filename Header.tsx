
import React, { useRef } from 'react';
import { YEARS, MONTHS } from '../constants';
import { LogoIcon, ImportIcon, ExportIcon, SettingsIcon, DatabaseIcon } from './Icons';

interface HeaderProps {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  isAnnualView: boolean;
  onToggleAnnualView: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onOpenSettings: () => void;
  dbStatus: 'disconnected' | 'connected' | 'syncing' | 'error';
}

const Header: React.FC<HeaderProps> = ({
  year,
  month,
  onYearChange,
  onMonthChange,
  isAnnualView,
  onToggleAnnualView,
  onImport,
  onExport,
  onOpenSettings,
  dbStatus
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
    event.target.value = '';
  };
  
  const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select {...props} className={`bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition ${props.className}`} />
  );

  const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?:'primary'|'secondary'}> = ({variant = 'secondary', ...props}) => {
    const baseClasses = "px-3 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition";
    const variantClasses = {
      primary: 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-900/50',
      secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600'
    };
    return <button {...props} className={`${baseClasses} ${variantClasses[variant]} ${props.className}`} />;
  }

  const getStatusColor = () => {
      switch(dbStatus) {
          case 'connected': return 'text-emerald-400';
          case 'syncing': return 'text-blue-400 animate-pulse';
          case 'error': return 'text-red-400';
          default: return 'text-slate-500';
      }
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/70 backdrop-blur-lg border-b border-slate-800">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <LogoIcon />
            <h1 className="text-xl font-bold text-white hidden sm:block">
              Camerite <span className="font-light text-slate-400">Dashboard</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Select value={year} onChange={(e) => onYearChange(parseInt(e.target.value))}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
              <Select value={month} onChange={(e) => onMonthChange(parseInt(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={isAnnualView} onChange={onToggleAnnualView} className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-violet-600 focus:ring-violet-500"/>
              <span>Ver anual</span>
            </label>
            
            <div className="h-8 w-[1px] bg-slate-700 mx-2"></div>

            <button 
                onClick={onOpenSettings}
                className="flex items-center gap-2 px-2 py-2 rounded hover:bg-slate-800 transition"
                title="Configurar Banco de Dados"
            >
                <DatabaseIcon className={getStatusColor()} />
                <span className="text-xs text-slate-400 hidden md:inline">DB</span>
            </button>

            <div className="flex items-center gap-2">
                <Button onClick={handleImportClick}> <ImportIcon /> <span className='hidden lg:inline'>Importar</span></Button>
                <Button onClick={onExport} variant="primary"> <ExportIcon /> <span className='hidden lg:inline'>Exportar</span></Button>
                <input type="file" accept=".xlsx, .xls, .json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
