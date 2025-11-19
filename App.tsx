
import React, { useState, useEffect, useMemo } from 'react';
import { AppState } from './types';
import { rid, parseYMD, monthKey, addMonths, currentMonthKey, today, fmtDate, nextMonthKey } from './utils';
import { Button, Input, Field, Modal } from './components/ui';
import { Dashboard } from './components/Dashboard';
import { Incomes } from './components/Incomes';
import { Expenses } from './components/Expenses';
import { Cards, Categories } from './components/CardsCategories';

// --- Logic Hooks ---

const STORAGE_KEY = "budget_data_v1";
const defaultState: AppState = {
  cards: [],
  categories: [
    { id: rid(), name: "Salário", type: "income" },
    { id: rid(), name: "Freelancer", type: "income" },
    { id: rid(), name: "Mercado", type: "expense" },
    { id: rid(), name: "Transporte", type: "expense" },
    { id: rid(), name: "Contas", type: "expense" }
  ],
  incomes: [],
  expenses: [],
  installments: []
};

function useStorageState(): [AppState, React.Dispatch<React.SetStateAction<AppState>>] {
  const [state, setState] = useState<AppState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultState;
    } catch {
      return defaultState;
    }
  });
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  return [state, setState];
}

function useSupabaseAuth() {
  const [client, setClient] = useState<any>(() => window.supabase || null);
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(!!client);

  useEffect(() => {
    const onReady = () => { setClient(window.supabase || null); setReady(true); };
    window.addEventListener('supabase-ready', onReady);
    // Check if client was initialized in script tag
    const cfg = JSON.parse(localStorage.getItem('SUPABASE_CFG') || 'null');
    if (cfg && cfg.url && cfg.anon && !window.supabase && window.createSupabaseClient) {
      window.supabase = window.createSupabaseClient(cfg.url, cfg.anon);
      setClient(window.supabase);
      setReady(true);
    }
    return () => window.removeEventListener('supabase-ready', onReady);
  }, []);

  useEffect(() => {
    if (!client) return;
    client.auth.getUser().then(({ data: { user } }: any) => setUser(user || null));
    const { data: sub } = client.auth.onAuthStateChange((_e: any, s: any) => setUser(s?.user || null));
    return () => sub.subscription.unsubscribe();
  }, [client]);

  return { client, user, ready };
}

async function run(q: any) { const { data, error } = await q; if (error) throw error; return data; }
const up = (client: any, table: string, obj: any) => client.from(table).insert([obj]).select('*').single();
const del = (client: any, table: string, by: any) => client.from(table).delete().match(by);

// --- Main Component ---

export default function App() {
  const [state, setState] = useStorageState();
  const [tab, setTab] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { client, user, ready } = useSupabaseAuth();

  const [baseDate, setBaseDate] = useState(() => fmtDate(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() => nextMonthKey(currentMonthKey()));
  const monthsOptions = useMemo(() => {
    const anchor = parseYMD(selectedMonth + '-01');
    const base = addMonths(anchor, -36);
    return Array.from({ length: 72 }, (_, i) => monthKey(addMonths(base, i)));
  }, [selectedMonth]);

  const incomesInMonth = useMemo(() => {
    const mk = parseYMD(selectedMonth + '-01');
    const res = state.incomes.filter(g => {
      const st = parseYMD(g.start_date || g.startDate || '');
      const a = new Date(st.getFullYear(), st.getMonth(), 1);
      const b = addMonths(a, Number(g.months || 1) - 1);
      return mk >= a && mk <= b;
    });
    return { list: res, total: res.reduce((s, g) => s + Number(g.amount || 0), 0) };
  }, [state.incomes, selectedMonth]);

  const installsInMonth = useMemo(() => {
    const list = state.installments.filter(i => (i.due_month || i.dueMonth) === selectedMonth);
    return {
      list,
      total: list.reduce((s, i) => s + Number(i.amount || 0), 0),
      totalPaid: list.filter(i => i.paid).reduce((s, i) => s + Number(i.amount || 0), 0)
    };
  }, [state.installments, selectedMonth]);

  const leftover = useMemo(() => incomesInMonth.total - installsInMonth.total, [incomesInMonth.total, installsInMonth.total]);

  // Sync with Supabase
  useEffect(() => {
    (async () => {
      if (!client || !user) return;
      try {
        const [cards, categories, incomes, expenses, installments] = await Promise.all([
          run(client.from('cards').select('*').eq('user_id', user.id).order('created_at')),
          run(client.from('categories').select('*').eq('user_id', user.id).order('created_at')),
          run(client.from('incomes').select('*').eq('user_id', user.id).order('created_at')),
          run(client.from('expenses').select('*').eq('user_id', user.id).order('created_at')),
          run(client.from('installments').select('*').eq('user_id', user.id).order('created_at'))
        ]);
        setState(s => ({ ...s, cards, categories, incomes, expenses, installments }));
      } catch (e: any) { console.error(e); alert('Erro ao carregar do Supabase: ' + e.message); }
    })();
  }, [client, user?.id]);

  // --- Actions ---

  const addCard = async (name: string) => { if (user && client) { try { const row = await run(up(client, 'cards', { user_id: user.id, name })); setState(s => ({ ...s, cards: [...s.cards, row] })); } catch (e: any) { alert(e.message); } } else setState(s => ({ ...s, cards: [...s.cards, { id: rid(), name }] })); };
  const removeCard = async (id: string) => { if (user && client) { try { await del(client, 'cards', { id, user_id: user.id }); } catch (e: any) { alert(e.message); } } setState(s => ({ ...s, cards: s.cards.filter(c => c.id !== id) })); };

  const addCategory = async (name: string, type: string) => { if (user && client) { try { const row = await run(up(client, 'categories', { user_id: user.id, name, type })); setState(s => ({ ...s, categories: [...s.categories, row] })); } catch (e: any) { alert(e.message); } } else setState(s => ({ ...s, categories: [...s.categories, { id: rid(), name, type: type as any }] })); };
  const removeCategory = async (id: string) => {
    const inUse = state.incomes.some(g => g.category_id === id || g.categoryId === id) || state.expenses.some(e => e.category_id === id || e.categoryId === id) || state.installments.some(i => i.category_id === id || i.categoryId === id);
    if (inUse && !confirm("Esta categoria está em uso. Confirmar exclusão?")) return;
    if (user && client) { try { await del(client, 'categories', { id, user_id: user.id }); } catch (e: any) { alert(e.message); } } setState(s => ({ ...s, categories: s.categories.filter(c => c.id !== id) }));
  };

  const addIncome = async (g: any) => { if (user && client) { try { const row = await run(up(client, 'incomes', { user_id: user.id, name: g.name, amount: Number(g.amount || 0), months: Number(g.months || 1), start_date: g.startDate || g.start_date || fmtDate(today()), category_id: g.categoryId || g.category_id || null })); setState(s => ({ ...s, incomes: [...s.incomes, row] })); } catch (e: any) { alert(e.message); } } else setState(s => ({ ...s, incomes: [...s.incomes, { ...g, id: rid() }] })); };
  const updateIncome = async (u: any) => { if (user && client) { try { await run(client.from('incomes').update({ name: u.name, amount: u.amount, months: u.months, start_date: u.startDate || u.start_date, category_id: u.categoryId || u.category_id }).eq('id', u.id).eq('user_id', user.id).select('*')); } catch (e: any) { alert(e.message); } } setState(s => ({ ...s, incomes: s.incomes.map(g => g.id === u.id ? u : g) })); };
  const deleteIncome = async (id: string) => { if (user && client) { try { await del(client, 'incomes', { id, user_id: user.id }); } catch (e: any) { alert(e.message); } } setState(s => ({ ...s, incomes: s.incomes.filter(g => g.id !== id) })); };

  function materializeInstallments(exp: any) { const arr = []; const months = exp.type === "parcelado" ? Number(exp.months) : 1; const per = exp.isPerInstallmentValue ? Number(exp.perInstallment) : Number((Number(exp.totalAmount) / months).toFixed(2)); const [y, m] = exp.startBillingMonth.split('-').map(Number); const start = new Date(y, m - 1, 1); for (let i = 0; i < months; i++) { const due = addMonths(start, i); arr.push({ id: rid(), expenseId: exp.id, n: i + 1, total: months, amount: per, dueMonth: monthKey(due), paid: false, paymentType: exp.paymentType, cardId: exp.cardId || null, name: exp.name, categoryId: exp.categoryId, createdAt: new Date().toISOString() }); } return arr; }
  const addExpense = async (e: any) => {
    if (user && client) {
      try {
        const ex = await run(up(client, 'expenses', { user_id: user.id, name: e.name, total_amount: Number(e.totalAmount), per_installment: Number(e.perInstallment), is_per_installment_value: !!e.isPerInstallmentValue, category_id: e.categoryId || null, purchase_date: e.purchaseDate || fmtDate(today()), payment_type: e.paymentType, card_id: e.paymentType === 'card' ? e.cardId : null, start_billing_month: e.startBillingMonth, type: e.type, months: Number(e.months || 1) }));
        const mats = materializeInstallments({ ...e, id: ex.id }).map(i => ({ expense_id: ex.id, user_id: user.id, n: i.n, total: i.total, amount: i.amount, due_month: i.dueMonth, paid: i.paid, payment_type: i.paymentType, card_id: i.cardId, name: i.name, category_id: i.categoryId }));
        if (mats.length) { await run(client.from('installments').insert(mats)); }
        const [installments] = await Promise.all([run(client.from('installments').select('*').eq('user_id', user.id).order('created_at'))]);
        setState(s => ({ ...s, expenses: [...s.expenses, ex], installments }));
      } catch (e: any) { alert('Erro: ' + e.message); }
    } else { const id = rid(); const exp = { ...e, id }; const mats = materializeInstallments(exp); setState(s => ({ ...s, expenses: [...s.expenses, exp], installments: [...s.installments, ...mats] })); }
  };
  const deleteExpense = async (expenseId: string, scope: 'all' | 'one', installmentId: string | null = null) => {
    if (user && client) { try { if (scope === 'all') { await del(client, 'expenses', { id: expenseId, user_id: user.id }); await run(client.from('installments').delete().eq('expense_id', expenseId).eq('user_id', user.id)); } else if (scope === 'one') { await run(client.from('installments').delete().eq('id', installmentId).eq('user_id', user.id)); } } catch (e: any) { alert(e.message); } const [installments] = await Promise.all([run(client.from('installments').select('*').eq('user_id', user.id).order('created_at'))]); setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== expenseId), installments })); }
    else setState(s => { let inst = [...s.installments]; if (scope === 'all') { inst = inst.filter(i => i.expenseId !== expenseId); } else { inst = inst.filter(i => i.id !== installmentId); } return { ...s, expenses: s.expenses.filter(e => e.id !== expenseId), installments: inst }; });
  };
  const setInstallmentPaid = async (id: string, paid: boolean) => { if (user && client) { try { await run(client.from('installments').update({ paid }).eq('id', id).eq('user_id', user.id)); } catch (e: any) { alert(e.message); } } setState(s => ({ ...s, installments: s.installments.map(i => i.id === id ? { ...i, paid } : i) })); };
  const setCardMonthPaid = async (cardId: string, month: string, paid: boolean) => { if (user && client) { try { await run(client.from('installments').update({ paid }).eq('card_id', cardId).eq('due_month', month).eq('user_id', user.id)); } catch (e: any) { alert(e.message); } } setState(s => ({ ...s, installments: s.installments.map(i => i.cardId === cardId && (i.dueMonth === month || i.due_month === month) ? { ...i, paid } : i) })); };

  const exportJson = () => { const data = JSON.stringify({ version: 10, exportedAt: fmtDate(today()), data: state }, null, 2); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `controle-gastos-${fmtDate(today())}.json`; a.click(); URL.revokeObjectURL(url); };
  const onBaseDateChange = (ymd: string) => { setBaseDate(ymd); setSelectedMonth(nextMonthKey(ymd.slice(0, 7))); };

  const getMonths = (e: any) => Number(e.months ?? e.months ?? 1);
  const getTotal = (e: any) => Number((e.totalAmount ?? e.total_amount ?? 0));
  const getPer = (e: any) => { const per = e.perInstallment ?? e.per_installment; if (per !== undefined && per !== null && String(per) !== "") return Number(per); const months = getMonths(e) || 1; const total = getTotal(e); return Number((total / months).toFixed(2)); };
  const isParcelado = (e: any) => String(e.type || '').toLowerCase() === 'parcelado';

  // --- UI Components ---

  const TabButton = ({ id, label, icon }: any) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left text-sm font-medium group relative overflow-hidden ${tab === id ? 'text-primary' : 'text-textMuted hover:text-textMain hover:bg-surfaceHighlight/30'}`}
    >
      {tab === id && <div className="absolute inset-0 bg-primary/10 border-l-4 border-primary" />}
      <div className="relative z-10 flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
    </button>
  );

  const icons = {
    dash: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    inc: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    exp: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
    card: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>,
    cat: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  };

  return (
    <div className="min-h-screen bg-[#121214] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/20 via-[#121214] to-[#121214] text-textMain font-sans flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-surface/60 backdrop-blur-xl border-r border-border/50 h-screen sticky top-0 p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primaryHover flex items-center justify-center text-black font-bold text-xl shadow-lg shadow-primary/20">
              $
           </div>
           <h1 className="text-lg font-bold tracking-tight text-textMain">FinControl</h1>
        </div>
        <nav className="flex-1 space-y-1">
          <TabButton id="dashboard" label="Dashboard" icon={icons.dash} />
          <TabButton id="incomes" label="Ganhos" icon={icons.inc} />
          <TabButton id="expenses" label="Gastos" icon={icons.exp} />
          <TabButton id="cards" label="Cartões" icon={icons.card} />
          <TabButton id="categories" label="Categorias" icon={icons.cat} />
        </nav>
        <div className="pt-6 border-t border-border/50 space-y-2">
          <Button variant="ghost" onClick={() => setCfgOpen(true)} className="w-full justify-start text-xs opacity-70 hover:opacity-100">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
             Configuração
          </Button>
          <Button variant="ghost" onClick={exportJson} className="w-full justify-start text-xs opacity-70 hover:opacity-100">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
             Backup JSON
          </Button>
          {ready && (user ? (
            <Button variant="danger" onClick={() => client.auth.signOut()} className="w-full justify-start text-xs">Sair ({user.email?.split('@')[0]})</Button>
          ) : (
            <Button onClick={() => setLoginOpen(true)} className="w-full justify-start text-xs">Entrar / Sync</Button>
          ))}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-b border-border/50 z-40 px-4 py-3 flex items-center justify-between">
         <div className="font-bold text-lg flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-black text-sm font-bold">$</div>
            FinControl
         </div>
         <button onClick={() => setMenuOpen(true)} className="p-2 rounded text-textMain hover:bg-surfaceHighlight">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
         </button>
      </div>

      {/* Content Area */}
      <main className="flex-1 p-4 sm:p-8 md:pt-8 pt-20 overflow-x-hidden">
         <div className="max-w-6xl mx-auto">
            <header className="mb-8 md:flex items-center justify-between hidden">
               <h2 className="text-2xl font-bold text-textMain capitalize tracking-tight">{tab === 'cards' ? 'Cartões' : tab}</h2>
               <div className="flex items-center gap-2 text-sm text-textMuted bg-surfaceHighlight/50 px-3 py-1.5 rounded-full border border-border/50">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {today().toLocaleDateString()}
               </div>
            </header>
            
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               {tab === "dashboard" && <Dashboard state={state} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} monthsOptions={monthsOptions} baseDate={baseDate} onBaseDateChange={onBaseDateChange} installsInMonth={installsInMonth} incomesInMonth={incomesInMonth} leftover={leftover} setCardMonthPaid={setCardMonthPaid} setInstallmentPaid={setInstallmentPaid} />}
               {tab === "incomes" && <Incomes state={state} addIncome={addIncome} updateIncome={updateIncome} deleteIncome={deleteIncome} />}
               {tab === "expenses" && <Expenses state={state} addExpense={addExpense} deleteExpense={deleteExpense} getPer={getPer} getTotal={getTotal} isParcelado={isParcelado} setState={setState} client={client} user={user} />}
               {tab === "cards" && <Cards state={state} addCard={addCard} removeCard={removeCard} />}
               {tab === "categories" && <Categories state={state} addCategory={addCategory} removeCategory={removeCategory} />}
            </div>
         </div>
      </main>

      {/* Floating Action Button (Mobile) */}
      <button
        onClick={() => setTab('expenses')}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-black rounded-full shadow-[0_0_20px_-5px_rgba(251,191,36,0.5)] flex items-center justify-center text-3xl z-30 active:scale-90 transition-transform"
      >
        +
      </button>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)}></div>
          <div className="relative bg-surface w-64 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-border flex justify-between items-center">
               <span className="font-bold">Menu</span>
               <button onClick={() => setMenuOpen(false)}>&times;</button>
            </div>
            <nav className="flex-1 p-4 space-y-2">
               {['dashboard', 'incomes', 'expenses', 'cards', 'categories'].map(t => (
                  <button key={t} onClick={() => { setTab(t); setMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg capitalize ${tab === t ? 'bg-surfaceHighlight text-primary' : 'text-textMuted'}`}>
                     {t}
                  </button>
               ))}
            </nav>
            <div className="p-4 border-t border-border space-y-3">
               <Button variant="secondary" onClick={() => { exportJson(); setMenuOpen(false); }} className="w-full">Exportar JSON</Button>
               <Button variant="secondary" onClick={() => { setCfgOpen(true); setMenuOpen(false); }} className="w-full">Config Supabase</Button>
               {user ? <Button variant="danger" onClick={() => { client.auth.signOut(); setMenuOpen(false); }} className="w-full">Sair</Button> : <Button onClick={() => { setLoginOpen(true); setMenuOpen(false); }} className="w-full">Entrar</Button>}
            </div>
          </div>
        </div>
      )}

      <ConfigDialog open={cfgOpen} onClose={() => setCfgOpen(false)} />
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} client={client} />
    </div>
  );
}

// --- Dialogs ---

function ConfigDialog({ open, onClose }: any) {
  const [url, setUrl] = useState(() => { try { return JSON.parse(localStorage.getItem('SUPABASE_CFG') || '{}').url || ''; } catch { return '' } });
  const [anon, setAnon] = useState(() => { try { return JSON.parse(localStorage.getItem('SUPABASE_CFG') || '{}').anon || ''; } catch { return '' } });
  const save = () => {
    if (!url || !anon) { alert('Informe URL e anon key'); return; }
    localStorage.setItem('SUPABASE_CFG', JSON.stringify({ url, anon }));
    window.location.reload(); // Simple reload to apply
  };

  return (
    <Modal open={open} onClose={onClose} title="Configurar Supabase">
      <div className="space-y-4">
        <Field label="Project URL"><Input placeholder="https://xyz.supabase.co" value={url} onChange={e => setUrl(e.target.value)} /></Field>
        <Field label="Anon Key"><Input placeholder="eyJ..." value={anon} onChange={e => setAnon(e.target.value)} /></Field>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="secondary" onClick={() => { localStorage.removeItem('SUPABASE_CFG'); window.location.reload(); }}>Reset</Button>
          <Button onClick={save}>Salvar e Recarregar</Button>
        </div>
        <div className="text-xs text-textMuted bg-surfaceHighlight p-2 rounded">
           Atenção: Ao salvar, a página será recarregada para inicializar a conexão.
        </div>
      </div>
    </Modal>
  );
}

function LoginDialog({ open, onClose, client }: any) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('magic');

  if (!client) return null;

  const sendMagic = async () => { const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } }); if (error) alert(error.message); else alert('Link enviado!'); };
  const sendOtp = async () => { const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }); if (error) alert(error.message); else alert('Código enviado!'); };
  const verifyOtp = async () => { const { error } = await client.auth.verifyOtp({ email, token: code, type: 'email' }); if (error) alert(error.message); else onClose(); };

  return (
    <Modal open={open} onClose={onClose} title="Entrar">
      <div className="space-y-4">
        <Field label="Método">
           <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={mode === 'magic'} onChange={() => setMode('magic')} /> Magic Link</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={mode === 'otp'} onChange={() => setMode('otp')} /> Código OTP</label>
           </div>
        </Field>
        <Field label="E-mail"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
        {mode === 'otp' && <Field label="Código"><Input value={code} onChange={e => setCode(e.target.value)} placeholder="123456" /></Field>}
        <div className="flex gap-2 justify-end mt-4">
           {mode === 'magic' ? <Button onClick={sendMagic}>Enviar Link</Button> : <><Button onClick={sendOtp}>Enviar Código</Button><Button variant="secondary" onClick={verifyOtp}>Verificar</Button></>}
        </div>
      </div>
    </Modal>
  );
}
