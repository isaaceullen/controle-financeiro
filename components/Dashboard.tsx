import React, { useState, useMemo } from 'react';
import { AppState, Installment, Card, Category } from '../types';
import { Button, Section, Checkbox, Input, Modal, Field } from './ui';
import { toMoney, prevMonthKey, nextMonthKey } from '../utils';
import { Reports } from './Reports';

interface DashboardProps {
  state: AppState;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  monthsOptions: string[];
  baseDate: string;
  onBaseDateChange: (d: string) => void;
  installsInMonth: { list: Installment[]; total: number; totalPaid: number };
  incomesInMonth: { list: any[]; total: number };
  leftover: number;
  setCardMonthPaid: (id: string, month: string, paid: boolean) => Promise<void>;
  setInstallmentPaid: (id: string, paid: boolean) => void;
}

function Stat({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "neutral" | "ok" | "bad" }) {
  let toneCls = "border-border bg-surface";
  let valCls = "text-textMain";
  if (tone === "ok") {
    toneCls = "border-emerald-500/30 bg-emerald-500/10";
    valCls = "text-emerald-400";
  } else if (tone === "bad") {
    toneCls = "border-red-500/30 bg-red-500/10";
    valCls = "text-red-400";
  }

  return (
    <div className={`rounded-2xl p-5 border ${toneCls} transition-all hover:scale-[1.02]`}>
      <div className="text-sm text-textMuted font-medium uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${valCls}`}>{value}</div>
      {sub && <div className="text-xs text-textMuted mt-1">{sub}</div>}
    </div>
  );
}

export const Dashboard: React.FC<DashboardProps> = ({
  state,
  selectedMonth,
  setSelectedMonth,
  monthsOptions,
  baseDate,
  onBaseDateChange,
  installsInMonth,
  incomesInMonth,
  leftover,
  setCardMonthPaid,
  setInstallmentPaid
}) => {
  const [page, setPage] = useState(1);
  const pageSize = 6; // Slight increase
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    pay: { cash: boolean; card: boolean };
    cards: string[];
    compra: { avista: boolean; aprazo: boolean };
    categories: string[];
    min: string;
    max: string;
  }>({
    pay: { cash: true, card: true },
    cards: [],
    compra: { avista: true, aprazo: true },
    categories: [],
    min: "",
    max: ""
  });

  const hasFilters = useMemo(() => {
    return !(filters.pay.cash && filters.pay.card &&
      filters.cards.length === 0 &&
      filters.compra.avista && filters.compra.aprazo &&
      filters.categories.length === 0 &&
      (filters.min === "" && filters.max === ""));
  }, [filters]);

  const clearFilters = () => setFilters({ pay: { cash: true, card: true }, cards: [], compra: { avista: true, aprazo: true }, categories: [], min: "", max: "" });

  const matchFilters = (i: Installment) => {
    const pay = (i.payment_type || i.paymentType) || 'cash';
    if (!filters.pay.cash && pay === 'cash') return false;
    if (!filters.pay.card && pay === 'card') return false;
    if (pay === 'card' && filters.cards.length > 0) {
      const id = i.card_id || i.cardId || null;
      if (!filters.cards.includes(String(id))) return false;
    }
    const isAprazo = Number(i.total || 0) > 1;
    if (!filters.compra.avista && !isAprazo) return false;
    if (!filters.compra.aprazo && isAprazo) return false;
    const catId = (i.category_id || i.categoryId) || null;
    if (filters.categories.length > 0 && !filters.categories.includes(String(catId))) return false;
    const val = Number(i.amount || 0);
    const min = parseFloat(filters.min || "");
    const max = parseFloat(filters.max || "");
    if (!isNaN(min) && val < min) return false;
    if (!isNaN(max) && val > max) return false;
    return true;
  };

  const cards = state.cards;
  const installments = installsInMonth.list;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const arr = installments.filter(i => {
      if (!String(i.name || "").toLowerCase().includes(q)) return false;
      return matchFilters(i);
    });
    return arr.slice().sort((a, b) => {
      const ta = new Date(a.created_at || a.createdAt || 0).getTime();
      const tb = new Date(b.created_at || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [installments, query, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const view = filtered.slice(start, start + pageSize);
  const cash = installments.filter(i => (i.payment_type || i.paymentType) === 'cash');

  const byCard = useMemo(() => {
    const m = new Map<string, Installment[]>();
    for (const i of (installments.filter(x => (x.payment_type || x.paymentType) === 'card'))) {
      const id = i.card_id || i.cardId || '_';
      const a = m.get(id) || [];
      a.push(i);
      m.set(id, a);
    }
    return m;
  }, [installments]);

  const labelCard = (id: any) => cards.find(c => c.id === id)?.name || 'Cartão';
  const labelCat = (id: any) => !id ? 'Sem categoria' : (state.categories.find(c => c.id === id)?.name || 'Categoria removida');

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Stat label="Ganhos" value={toMoney(incomesInMonth.total)} tone="ok" />
          <Stat label="Gastos" value={toMoney(installsInMonth.total)} sub={installsInMonth.totalPaid ? `${toMoney(installsInMonth.totalPaid)} pagos` : undefined} tone="bad" />
          <Stat label="Sobra" value={toMoney(leftover)} tone={leftover >= 0 ? 'ok' : 'bad'} />
      </div>

      <Section title="Resumo do mês" right={
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex items-center gap-2 bg-surfaceHighlight p-1.5 rounded-lg border border-border">
             <div className="text-xs text-textMuted px-2">Base:</div>
             <input type="date" value={baseDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onBaseDateChange(e.target.value)} className="bg-transparent text-sm text-textMain focus:outline-none" />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setSelectedMonth(prevMonthKey(selectedMonth)); setPage(1); }}
              className="p-2 rounded-lg border border-border bg-surfaceHighlight hover:bg-zinc-700 text-textMain"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <select value={selectedMonth} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedMonth(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg border border-border bg-surfaceHighlight text-textMain text-sm focus:outline-none">
              {monthsOptions.map(m => (<option key={m} value={m}>{m}</option>))}
            </select>
            <button
              type="button"
              onClick={() => { setSelectedMonth(nextMonthKey(selectedMonth)); setPage(1); }}
              className="p-2 rounded-lg border border-border bg-surfaceHighlight hover:bg-zinc-700 text-textMain"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      }>
        {/* Empty space where stats used to be */}
         <div className="text-sm text-textMuted">Visão geral financeira referente ao mês selecionado.</div>
      </Section>

      {cards.length > 0 && (
        <Section title="Faturas (Cartões)">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map(c => {
              const items = (byCard.get(c.id) || []).filter(i => (i.due_month || i.dueMonth) === selectedMonth);
              const total = items.reduce((s, i) => s + (i.paid ? 0 : Number(i.amount || 0)), 0);
              const allPaid = items.length > 0 && items.every(i => i.paid);
              const disabled = items.length === 0;
              return (
                <div key={c.id} className="rounded-xl border border-border bg-surfaceHighlight/50 p-5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                   </div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="font-semibold text-lg text-primary">{c.name}</div>
                  </div>
                  <div className="flex items-end justify-between relative z-10">
                    <div>
                      <div className="text-xs text-textMuted mb-1">Aberto</div>
                      <div className="text-xl font-bold text-textMain">{toMoney(total)}</div>
                    </div>
                    <div className="bg-surface border border-border rounded-lg p-1">
                        <Checkbox
                        checked={allPaid}
                        disabled={disabled || loadingCardId === c.id}
                        onChange={async (v) => { setLoadingCardId(c.id); try { await setCardMonthPaid(c.id, selectedMonth, v); } finally { setLoadingCardId(null); } }}
                        label={(loadingCardId === c.id) ? '...' : 'Pagar'}
                        />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
               <Section title="Extrato">
                {installments.length === 0 ? (
                    <div className="text-sm text-textMuted py-8 text-center">Sem gastos neste mês.</div>
                ) : (
                    <>
                    <div className="flex gap-2 mb-4">
                        <Input
                        type="text"
                        value={query}
                        onChange={e => { setPage(1); setQuery(e.target.value) }}
                        placeholder="Buscar..."
                        className="bg-surface"
                        />
                        <Button variant="secondary" onClick={() => setFiltersOpen(true)}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                        </Button>
                        {hasFilters && <Button variant="ghost" onClick={() => { clearFilters(); setPage(1); }}>Limpar</Button>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {view.map(i => (
                        <div key={i.id} className="group p-4 rounded-xl border border-border bg-surfaceHighlight/30 hover:bg-surfaceHighlight hover:border-zinc-600 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-semibold text-textMain group-hover:text-primary transition-colors">{i.name}</div>
                                <div className="font-bold text-textMain">{toMoney(i.amount)}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-y-1 text-xs text-textMuted">
                                <div>{labelCat(i.category_id || i.categoryId)}</div>
                                <div className="text-right">{(i.payment_type || i.paymentType) === 'card' ? labelCard(i.card_id || i.cardId) : 'Dinheiro'}</div>
                                <div>Parcela {i.n}/{i.total}</div>
                                <div className="text-right">{i.paid ? <span className="text-emerald-400">Pago</span> : 'Pendente'}</div>
                            </div>
                        </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between mt-4 border-t border-border pt-4">
                        <Button variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page===1}>&larr;</Button>
                        <div className="text-xs text-textMuted">Página {page} de {totalPages}</div>
                        <Button variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page===totalPages}>&rarr;</Button>
                    </div>
                    </>
                )}
                </Section>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-6">
                <Section title="Dinheiro (A vista)">
                    {cash.length === 0 ? (
                    <div className="text-sm text-textMuted text-center py-4">Nada aqui.</div>
                    ) : (
                    <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2">
                        {cash.map(i => (
                        <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-surfaceHighlight/30 border border-border">
                            <div className="text-sm">
                            <div className="font-medium text-textMain">{i.name}</div>
                            <div className="text-xs text-textMuted">{toMoney(i.amount)} • {i.n}/{i.total}</div>
                            </div>
                            <Checkbox checked={i.paid} onChange={(v) => setInstallmentPaid(i.id, v)} label="" />
                        </div>
                        ))}
                    </div>
                    )}
                </Section>

                <Reports state={state} selectedMonth={selectedMonth} />
          </div>
      </div>

      {/* Filters Modal */}
      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtrar gastos">
        <div className="space-y-6">
          <div>
            <div className="text-xs font-bold text-textMuted uppercase mb-2">Pagamento</div>
            <div className="flex gap-4">
              <Checkbox checked={filters.pay.cash} onChange={(v) => setFilters(f => ({ ...f, pay: { ...f.pay, cash: v } }))} label="Dinheiro" />
              <Checkbox checked={filters.pay.card} onChange={(v) => setFilters(f => ({ ...f, pay: { ...f.pay, card: v } }))} label="Cartão" />
            </div>
            {filters.pay.card && (
              <div className="mt-2 pl-2 border-l-2 border-border">
                <div className="text-xs text-textMuted mb-1">Cartões específicos</div>
                <select multiple value={filters.cards} onChange={(e) => { const vals = Array.from(e.target.selectedOptions).map(o => o.value); setFilters(f => ({ ...f, cards: vals })); }} className="w-full bg-surfaceHighlight border border-border rounded p-2 text-sm text-textMain h-24">
                  {cards.length === 0 ? <option value="">—</option> : cards.map(c => (<option key={c.id} value={String(c.id)}>{c.name}</option>))}
                </select>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-bold text-textMuted uppercase mb-2">Categoria</div>
            <select multiple value={filters.categories} onChange={(e) => { const vals = Array.from(e.target.selectedOptions).map(o => o.value); setFilters(f => ({ ...f, categories: vals })); }} className="w-full bg-surfaceHighlight border border-border rounded p-2 text-sm text-textMain h-24">
              {state.categories.filter(c => c.type === 'expense').map(c => (<option key={c.id} value={String(c.id)}>{c.name}</option>))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Min (R$)"><Input type="number" step="0.01" value={filters.min} onChange={(e) => setFilters(f => ({ ...f, min: e.target.value }))} /></Field>
            <Field label="Max (R$)"><Input type="number" step="0.01" value={filters.max} onChange={(e) => setFilters(f => ({ ...f, max: e.target.value }))} /></Field>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => { clearFilters(); }}>Limpar</Button>
            <Button onClick={() => { setPage(1); setFiltersOpen(false); }}>Aplicar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};