
import React from 'react';

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full px-4 py-2.5 rounded-lg border border-border bg-surfaceHighlight text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${props.className || ""}`}
  />
);

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={`w-full px-4 py-2.5 rounded-lg border border-border bg-surfaceHighlight text-textMain focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${props.className || ""}`}
  />
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children?: React.ReactNode;
}

export const Button = ({ children, onClick, type = "button", variant = "primary", className = "", ...rest }: ButtonProps) => {
  const base = "px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 active:scale-95 duration-150";
  
  let styles = "bg-primary text-black hover:bg-primaryHover shadow-[0_0_15px_-5px_rgba(251,191,36,0.3)] hover:shadow-[0_0_20px_-5px_rgba(251,191,36,0.5)]"; // Primary
  if (variant === "secondary") styles = "bg-surfaceHighlight border border-border text-textMain hover:bg-zinc-700 hover:border-zinc-600";
  if (variant === "danger") styles = "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40";
  if (variant === "ghost") styles = "bg-transparent text-textMuted hover:text-textMain hover:bg-surfaceHighlight/50";

  return (
    <button type={type} onClick={onClick} className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
};

export const Section = ({ title, children, right }: { title: string; children?: React.ReactNode; right?: React.ReactNode }) => (
  <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-2xl shadow-sm p-4 sm:p-6 transition-all hover:border-border">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 border-b border-border/50 pb-4">
      <h2 className="text-lg sm:text-xl font-semibold text-textMain tracking-tight">{title}</h2>
      {right}
    </div>
    <div className="animate-in fade-in duration-500">
      {children}
    </div>
  </div>
);

export const Checkbox = ({ checked, onChange, label, disabled }: { checked?: boolean; onChange?: (v: boolean) => void; label: React.ReactNode; disabled?: boolean }) => (
  <label className={`flex items-center gap-3 select-none cursor-pointer group ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${checked ? 'bg-primary border-primary shadow-[0_0_10px_-3px_rgba(251,191,36,0.4)]' : 'bg-surfaceHighlight border-border group-hover:border-zinc-500'}`}>
      {checked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
    </div>
    <input
      type="checkbox"
      checked={!!checked}
      disabled={!!disabled}
      onChange={(e) => onChange?.(e.target.checked)}
      className="hidden"
    />
    <span className="text-sm text-textMain">{label}</span>
  </label>
);

export const Field = ({ label, children, hint }: { label: string; children?: React.ReactNode; hint?: string }) => (
  <label className="block mb-4">
    <div className="text-xs text-textMuted uppercase tracking-wider font-semibold mb-1.5">{label}</div>
    {children}
    {hint && <div className="text-xs text-textMuted mt-1.5">{hint}</div>}
  </label>
);

export const Modal = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl p-6 scale-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-textMain">{title}</h3>
          <button onClick={onClose} className="text-textMuted hover:text-textMain transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
