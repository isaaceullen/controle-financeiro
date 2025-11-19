import React from 'react';

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full px-4 py-3 rounded-xl border border-dark-700 bg-dark-850 text-white placeholder-dark-500 focus:outline-none focus:ring-1 focus:ring-brand-400 focus:border-brand-400 transition-all shadow-inner ${props.className || ""}`}
  />
);

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={`w-full px-4 py-3 rounded-xl border border-dark-700 bg-dark-850 text-white focus:outline-none focus:ring-1 focus:ring-brand-400 focus:border-brand-400 transition-all shadow-sm cursor-pointer appearance-none ${props.className || ""}`}
    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23facc15' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
  />
);

export const Button = ({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  disabled = false,
  title
}: {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  className?: string;
  disabled?: boolean;
  title?: string;
}) => {
  let base = "px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2";
  
  if (variant === "danger") base += " bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50";
  else if (variant === "secondary") base += " bg-dark-800 text-gray-300 border border-dark-700 hover:bg-dark-700 hover:text-white hover:border-dark-600 shadow-sm";
  else if (variant === "ghost") base += " bg-transparent text-gray-400 hover:bg-dark-800 hover:text-brand-400";
  else if (variant === "outline") base += " border-2 border-brand-400 text-brand-400 hover:bg-brand-400 hover:text-black";
  else base += " bg-brand-400 text-black hover:bg-brand-300 shadow-[0_4px_20px_-4px_rgba(250,204,21,0.3)] hover:shadow-[0_6px_25px_-5px_rgba(250,204,21,0.4)] border border-brand-400"; // primary

  return (
    <button type={type} onClick={onClick} className={`${base} ${className}`} disabled={disabled} title={title}>
      {children}
    </button>
  );
};

export const Section = ({
  title,
  children,
  right,
  className = ""
}: {
  title: string;
  children?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`bg-dark-900 rounded-2xl shadow-lg border border-dark-800/60 overflow-hidden ${className}`}>
      <div className="px-6 py-5 border-b border-dark-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-dark-900/40">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
          <span className="w-1.5 h-6 bg-brand-400 rounded-full block shadow-[0_0_10px_rgba(250,204,21,0.4)]"></span>
          {title}
        </h2>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
};

export const Checkbox = ({
  checked,
  onChange,
  label,
  disabled
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) => {
  return (
    <label className={`flex items-center gap-3 cursor-pointer select-none group ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${checked ? "bg-brand-400 border-brand-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]" : "bg-dark-950 border-dark-600 group-hover:border-brand-400/50"}`}>
        {checked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )}
      </div>
      <input
        type="checkbox"
        checked={!!checked}
        disabled={!!disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="hidden"
      />
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">{label}</span>
    </label>
  );
};

export const Field = ({ label, children, hint, className = "" }: { label: string; children?: React.ReactNode; hint?: string, className?: string }) => (
  <label className={`block ${className}`}>
    <div className="text-sm font-semibold text-dark-400 mb-2 ml-1 tracking-wider uppercase text-[11px] flex items-center gap-1">
      {label}
    </div>
    {children}
    {hint && <div className="text-xs text-dark-500 mt-1.5 ml-1">{hint}</div>}
  </label>
);

export const Stat = ({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "neutral" | "ok" | "bad" }) => {
  const styles =
    tone === "ok"
      ? "bg-gradient-to-br from-dark-900 to-emerald-950/30 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40"
      : tone === "bad"
      ? "bg-gradient-to-br from-dark-900 to-red-950/30 border-red-500/20 text-red-400 hover:border-red-500/40"
      : "bg-dark-900 border-dark-700 hover:border-brand-400/30 text-white";

  const labelColor = tone === "ok" ? "text-emerald-500/80" : tone === "bad" ? "text-red-400/80" : "text-dark-400";

  return (
    <div className={`rounded-2xl p-6 border flex flex-col justify-between transition-all hover:-translate-y-1 shadow-lg ${styles}`}>
      <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${labelColor}`}>{label}</div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      {sub && <div className={`text-xs mt-2 font-medium opacity-70 flex items-center gap-1`}>{sub}</div>}
    </div>
  );
};

export const Modal = ({ open, onClose, title, children, maxWidth = "max-w-md" }: { open: boolean; onClose: () => void; title: string; children?: React.ReactNode; maxWidth?: string }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div className={`relative bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200`}>
        <div className="px-6 py-4 border-b border-dark-800 flex items-center justify-between bg-dark-950/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-brand-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]"></span>
             {title}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto text-gray-300 scrollbar-thin scrollbar-thumb-dark-700 scrollbar-track-transparent">
          {children}
        </div>
      </div>
    </div>
  );
};