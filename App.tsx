import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Tags, 
  Menu, 
  LogOut, 
  Settings, 
  FileJson, 
  Plus, 
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Zap,
  List
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

import { AppState, FilterState, Installment } from './types';
import { DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL, STORAGE_KEY, SUPABASE_CFG_KEY } from './constants';
import { Button, Checkbox, Field, Input, Modal, Section, Select, Stat } from './components/UI';

// --- Helpers ---
const pad = (n: number) => String(n).padStart(2, "0");
const today = () => new Date();
const makeDate = (y: number, m: number, d = 1) => new Date(y, m - 1, d);
const parseYMD = (str: string) => {
  if (!str) return today();
  const p = String(str).split("-");
  return makeDate(+p[0], +(p[1] || 1), +(p[2] || 1));
};
const fmtDate = (d: Date | string) => {
  const dt = d instanceof Date ? d : parseYMD(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};
const monthKey = (d: Date | string) => {
  const dt = d instanceof Date ? d : parseYMD(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
};
const addMonths = (d: Date | string, m: number) => {
  const dt = d instanceof Date ? new Date(d) : parseYMD(d);
  return makeDate(dt.getFullYear(), dt.getMonth() + 1 + m, 1);
};
const toMoney = (n: any) => (isNaN(n) ? "R$ 0,00" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const deviceToday = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
  } catch {
    return fmtDate(new Date());
  }
};
const currentMonthKey = () => deviceToday().slice(0, 7);
const nextMonthKey = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, '0')}`;
};
const prevMonthKey = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return `${py}-${String(pm).padStart(2, '0')}`;
};
function rid() {
  try {
    const a = new Uint32Array(2);
    crypto.getRandomValues(a);
    return a[0].toString(36) + a[1].toString(36);
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
async function run(q: any) {
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
const up = (client: SupabaseClient, table: string, obj: any) => client.from(table).insert([obj]).select('*').single();
const del = (client: SupabaseClient, table: string, by: any) => client.from(table).delete().match(by);

// --- Hooks ---
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
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);
  return [state, setState];
}

function useSupabaseAuth() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cfg = JSON.parse(localStorage.getItem(SUPABASE_CFG_KEY) || 'null');
    const url = cfg?.url || DEFAULT_SUPABASE_URL;
    const anon = cfg?.anon || DEFAULT_SUPABASE_ANON_KEY;

    if (url && anon) {
      const supabase = createClient(url, anon);
      setClient(supabase);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!client) return;
    client.auth.getUser().then(({ data: { user } }) => setUser(user || null));
    const { data: sub } = client.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => sub.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    const handler = () => {
       const cfg = JSON.parse(localStorage.getItem(SUPABASE_CFG_KEY) || 'null');
       if (cfg?.url && cfg?.anon) {
         setClient(createClient(cfg.url, cfg.anon));
       }
    };
    window.addEventListener('supabase-ready', handler);
    return () => window.removeEventListener('supabase-ready', handler);
  }, []);

  return { client, user, ready };
}

// --- Main App Component ---
export default function App() {
  const [state, setState] = useStorageState();
  const [tab, setTab] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { client, user, ready } = useSupabaseAuth();

  const [baseDate, setBaseDate] = useState(() => deviceToday());
  const [selectedMonth, setSelectedMonth] = useState(() => nextMonthKey(currentMonthKey()));

  const monthsOptions = useMemo(() => {
    const anchor = parseYMD(selectedMonth + '-01');
    const base = addMonths(anchor, -36);
    return Array.from({ length: 72 }, (_, i) => monthKey(addMonths(base, i)));
  }, [selectedMonth]);

  const incomesInMonth = useMemo(() => {
    const mk = parseYMD(selectedMonth + '-01');
    const res = state.incomes.filter(g => {
      const st = parseYMD(g.start_date || g.startDate || "");
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
      } catch (e: any) {
        console.error(e);
        alert('Erro ao carregar do Supabase: ' + e.message);
      }
    })();
  }, [client, user?.id, setState]);

  // --- Actions ---
  const addCard = async (name: string) => {
    if (user && client) {
      try { const row = await run(up(client, 'cards', { user_id: user.id, name })); setState(s => ({ ...s, cards: [...s.cards, row] })); } catch (e: any) { alert(e.message); }
    } else setState(s => ({ ...s, cards: [...s.cards, { id: rid(), name }] }));
  };
  const removeCard = async (id: string) => {
    if (user && client) { try { await del(client, 'cards', { id, user_id: user.id }); } catch (e: any) { alert(e.message); } }
    setState(s => ({ ...s, cards: s.cards.filter(c => c.id !== id) }));
  };

  const addCategory = async (name: string, type: 'income'|'expense') => {
    if (user && client) { try { const row = await run(up(client, 'categories', { user_id: user.id, name, type })); setState(s => ({ ...s, categories: [...s.categories, row] })); } catch (e: any) { alert(e.message); } }
    else setState(s => ({ ...s, categories: [...s.categories, { id: rid(), name, type }] }));
  };
  const removeCategory = async (id: string) => {
    const inUse = state.incomes.some(g => (g.category_id || g.categoryId) === id) || state.expenses.some(e => (e.category_id || e.categoryId) === id) || state.installments.some(i => (i.category_id || i.categoryId) === id);
    if (inUse && !confirm("Esta categoria está em uso. Confirmar exclusão?")) return;
    if (user && client) { try { await del(client, 'categories', { id, user_id: user.id }); } catch (e: any) { alert(e.message); } }
    setState(s => ({ ...s, categories: s.categories.filter(c => c.id !== id) }));
  };

  const addIncome = async (g: any) => {
    if (user && client) { try { const row = await run(up(client, 'incomes', { user_id: user.id, name: g.name, amount: Number(g.amount || 0), months: Number(g.months || 1), start_date: g.startDate || g.start_date || fmtDate(today()), category_id: g.categoryId || g.category_id || null })); setState(s => ({ ...s, incomes: [...s.incomes, row] })); } catch (e: any) { alert(e.message); } }
    else setState(s => ({ ...s, incomes: [...s.incomes, { ...g, id: rid() }] }));
  };
  const updateIncome = async (u: any) => {
    if (user && client) { try { await run(client.from('incomes').update({ name: u.name, amount: u.amount, months: u.months, start_date: u.startDate || u.start_date, category_id: u.categoryId || u.category_id }).eq('id', u.id).eq('user_id', user.id).select('*')); } catch (e: any) { alert(e.message); } }
    setState(s => ({ ...s, incomes: s.incomes.map(g => g.id === u.id ? u : g) }));
  };
  const deleteIncome = async (id: string) => {
    if (user && client) { try { await del(client, 'incomes', { id, user_id: user.id }); } catch (e: any) { alert(e.message); } }
    setState(s => ({ ...s, incomes: s.incomes.filter(g => g.id !== id) }));
  };

  function materializeInstallments(exp: any) {
    const arr = [];
    const months = String(exp.type).toLowerCase() === "parcelado" ? Number(exp.months) : 1;
    const per = exp.isPerInstallmentValue ? Number(exp.perInstallment) : Number((Number(exp.totalAmount) / months).toFixed(2));
    const [y, m] = exp.startBillingMonth.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    for (let i = 0; i < months; i++) {
      const due = addMonths(start, i);
      arr.push({
        id: rid(), expenseId: exp.id, n: i + 1, total: months, amount: per, dueMonth: monthKey(due), paid: false,
        paymentType: exp.paymentType, cardId: exp.cardId || null, name: exp.name, categoryId: exp.categoryId, createdAt: new Date().toISOString()
      });
    }
    return arr;
  }
  const addExpense = async (e: any) => {
    if (user && client) {
      try {
        const ex = await run(up(client, 'expenses', { user_id: user.id, name: e.name, total_amount: Number(e.totalAmount), per_installment: Number(e.perInstallment), is_per_installment_value: !!e.isPerInstallmentValue, category_id: e.categoryId || null, purchase_date: e.purchaseDate || fmtDate(today()), payment_type: e.paymentType, card_id: e.paymentType === 'card' ? e.cardId : null, start_billing_month: e.startBillingMonth, type: e.type, months: Number(e.months || 1) }));
        const mats = materializeInstallments({ ...e, id: ex.id }).map(i => ({ expense_id: ex.id, user_id: user.id, n: i.n, total: i.total, amount: i.amount, due_month: i.dueMonth, paid: i.paid, payment_type: i.paymentType, card_id: i.cardId, name: i.name, category_id: i.categoryId }));
        if (mats.length) { await run(client.from('installments').insert(mats)); }
        const [installments] = await Promise.all([run(client.from('installments').select('*').eq('user_id', user.id).order('created_at'))]);
        setState(s => ({ ...s, expenses: [...s.expenses, ex], installments }));
      } catch (e: any) { alert('Erro: ' + e.message); }
    }
    else { const id = rid(); const exp = { ...e, id }; const mats = materializeInstallments(exp); setState(s => ({ ...s, expenses: [...s.expenses, exp], installments: [...s.installments, ...mats] })); }
  };
  const deleteExpense = async (expenseId: string, scope = 'all', installmentId: string | null = null) => {
    if (user && client) {
      try {
        if (scope === 'all') { await del(client, 'expenses', { id: expenseId, user_id: user.id }); await run(client.from('installments').delete().eq('expense_id', expenseId).eq('user_id', user.id)); }
        else if (scope === 'one') { await run(client.from('installments').delete().eq('id', installmentId).eq('user_id', user.id)); }
      } catch (e: any) { alert(e.message); }
      const [installments] = await Promise.all([run(client.from('installments').select('*').eq('user_id', user.id).order('created_at'))]);
      setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== expenseId), installments }));
    }
    else setState(s => {
      let inst = [...s.installments];
      if (scope === 'all') { inst = inst.filter(i => i.expenseId !== expenseId); } else { inst = inst.filter(i => i.id !== installmentId); }
      return { ...s, expenses: s.expenses.filter(e => e.id !== expenseId), installments: inst };
    });
  };
  const setInstallmentPaid = async (id: string, paid: boolean) => {
    if (user && client) { try { await run(client.from('installments').update({ paid }).eq('id', id).eq('user_id', user.id)); } catch (e: any) { alert(e.message); } }
    setState(s => ({ ...s, installments: s.installments.map(i => i.id === id ? { ...i, paid } : i) }));
  };
  const setCardMonthPaid = async (cardId: string, month: string, paid: boolean) => {
    if (user && client) { try { await run(client.from('installments').update({ paid }).eq('card_id', cardId).eq('due_month', month).eq('user_id', user.id)); } catch (e: any) { alert(e.message); } }
    setState(s => ({ ...s, installments: s.installments.map(i => i.cardId === cardId && (i.dueMonth === month || i.due_month === month) ? { ...i, paid } : i) }));
  };

  const exportJson = () => { const data = JSON.stringify({ version: 10, exportedAt: fmtDate(today()), data: state }, null, 2); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `controle-gastos-${fmtDate(today())}.json`; a.click(); URL.revokeObjectURL(url); };
  const onBaseDateChange = (ymd: string) => { setBaseDate(ymd); setSelectedMonth(nextMonthKey(ymd.slice(0, 7))); };
  const getPer = (e: any) => { const per = e.perInstallment ?? e.per_installment; if (per !== undefined && per !== null && String(per) !== "") return Number(per); const months = Number(e.months ?? e.months ?? 1) || 1; const total = Number((e.totalAmount ?? e.total_amount ?? 0)); return Number((total / months).toFixed(2)); };
  const getTotal = (e: any) => Number((e.totalAmount ?? e.total_amount ?? 0));
  const isParcelado = (e: any) => String(e.type || '').toLowerCase() === 'parcelado';

  return (
    <div className="min-h-screen bg-dark-950 text-gray-200 font-sans selection:bg-brand-400 selection:text-black">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 w-full border-b border-dark-800 backdrop-blur-md bg-dark-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-400 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                <CreditCard className="text-black w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">Controle de Gastos</span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {[
                { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                { id: "incomes", label: "Ganhos", icon: TrendingUp },
                { id: "expenses", label: "Gastos", icon: TrendingDown },
                { id: "cards", label: "Pagamentos", icon: CreditCard },
                { id: "categories", label: "Categorias", icon: Tags }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wide flex items-center gap-2 transition-all ${
                    tab === item.id ? "bg-brand-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.3)]" : "text-gray-400 hover:bg-dark-800 hover:text-white"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => setCfgOpen(true)} title="Configurações">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" onClick={exportJson} title="Exportar JSON">
                 <FileJson className="w-5 h-5" />
              </Button>
              {ready && user ? (
                <Button variant="secondary" onClick={() => client?.auth.signOut()} className="!px-3">
                  <LogOut className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setLoginOpen(true)}>Entrar</Button>
              )}
            </div>

            <button onClick={() => setMenuOpen(true)} className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-dark-800 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tab === "dashboard" && (
          <Dashboard
            state={state} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} monthsOptions={monthsOptions}
            baseDate={baseDate} onBaseDateChange={onBaseDateChange} installsInMonth={installsInMonth} incomesInMonth={incomesInMonth} leftover={leftover}
            setCardMonthPaid={setCardMonthPaid} setInstallmentPaid={setInstallmentPaid}
          />
        )}
        {tab === "incomes" && <Incomes state={state} addIncome={addIncome} updateIncome={updateIncome} deleteIncome={deleteIncome} />}
        {tab === "expenses" && <Expenses state={state} addExpense={addExpense} deleteExpense={deleteExpense} getPer={getPer} getTotal={getTotal} isParcelado={isParcelado} setState={setState} client={client} user={user} />}
        {tab === "cards" && <Cards state={state} addCard={addCard} removeCard={removeCard} />}
        {tab === "categories" && <Categories state={state} addCategory={addCategory} removeCategory={removeCategory} />}
      </main>

      {/* Floating Action Button */}
      <button
        title="Adicionar gasto"
        onClick={() => setTab('expenses')}
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-brand-400 hover:bg-brand-300 text-black shadow-[0_0_20px_rgba(250,204,21,0.5)] hover:scale-110 transition-all flex items-center justify-center"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Dialogs */}
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} onNav={(t) => setTab(t)} onExport={exportJson} onConfig={() => setCfgOpen(true)} onLogin={() => setLoginOpen(true)} onLogout={() => client?.auth.signOut()} user={user} ready={ready} />
      <ConfigDialog open={cfgOpen} onClose={() => setCfgOpen(false)} />
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} client={client} onLogged={() => { }} />
    </div>
  );
}

// --- Sub-components ---

function Dashboard({ state, selectedMonth, setSelectedMonth, monthsOptions, baseDate, onBaseDateChange, installsInMonth, incomesInMonth, leftover, setCardMonthPaid, setInstallmentPaid }: any) {
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
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

  const installments = installsInMonth.list;
  const cards = state.cards;
  
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const arr = installments.filter((i: any) => {
      if (!String(i.name || "").toLowerCase().includes(q)) return false;
      return matchFilters(i);
    });
    return arr.slice().sort((a: any, b: any) => {
      const ta = new Date(a.created_at || a.createdAt || 0).getTime();
      const tb = new Date(b.created_at || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [installments, query, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const view = filtered.slice(start, start + pageSize);
  const cash = installments.filter((i: any) => (i.payment_type || i.paymentType) === 'cash');
  
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const byCard = useMemo(() => {
    const m = new Map();
    for (const i of (installments.filter((x: any) => (x.payment_type || x.paymentType) === 'card'))) {
      const id = i.card_id || i.cardId || '_';
      const a = m.get(id) || [];
      a.push(i);
      m.set(id, a);
    }
    return m;
  }, [installments]);

  const labelCard = (id: string) => cards.find((c: any) => c.id === id)?.name || 'Cartão';
  const labelCat = (id: string) => !id ? 'Sem categoria' : (state.categories.find((c: any) => c.id === id)?.name || 'Categoria removida');

  const FilterModal = () => (
    <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtrar Gastos" maxWidth="max-w-2xl">
       <div className="grid gap-6">
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Tipo de pagamento</h4>
            <div className="flex flex-wrap items-center gap-4">
              <Checkbox checked={filters.pay.cash} onChange={(v) => setFilters(f => ({ ...f, pay: { ...f.pay, cash: v } }))} label="Dinheiro" />
              <Checkbox checked={filters.pay.card} onChange={(v) => setFilters(f => ({ ...f, pay: { ...f.pay, card: v } }))} label="Cartão" />
            </div>
            {filters.pay.card && (
              <div className="mt-3 pl-4 border-l-2 border-dark-700">
                <span className="text-xs font-medium text-gray-500 block mb-2">Cartões específicos</span>
                 <select multiple value={filters.cards} onChange={(e) => { const vals = Array.from(e.target.selectedOptions).map(o => o.value); setFilters(f => ({ ...f, cards: vals })); }} className="w-full p-2 rounded-lg border border-dark-700 bg-dark-800 text-white text-sm">
                  {cards.length === 0 ? <option value="">—</option> : cards.map((c: any) => (<option key={c.id} value={String(c.id)}>{c.name}</option>))}
                </select>
                 <button className="mt-2 text-xs text-brand-400 font-medium hover:underline" onClick={() => setFilters(f => ({ ...f, cards: [] }))}>Limpar seleção</button>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-white mb-3">Forma da compra</h4>
              <div className="flex flex-col gap-2">
                <Checkbox checked={filters.compra.avista} onChange={(v) => setFilters(f => ({ ...f, compra: { ...f.compra, avista: v } }))} label="À vista" />
                <Checkbox checked={filters.compra.aprazo} onChange={(v) => setFilters(f => ({ ...f, compra: { ...f.compra, aprazo: v } }))} label="A prazo" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-white mb-3">Categoria</h4>
              <select multiple value={filters.categories} onChange={(e) => { const vals = Array.from(e.target.selectedOptions).map(o => o.value); setFilters(f => ({ ...f, categories: vals })); }} className="w-full p-2 rounded-lg border border-dark-700 bg-dark-800 text-white text-sm h-24">
                {state.categories.filter((c: any) => c.type === 'expense').map((c: any) => (<option key={c.id} value={String(c.id)}>{c.name}</option>))}
              </select>
              <div className="text-[10px] text-gray-500 mt-1">Segure Ctrl/Cmd para selecionar vários</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor mínimo">
               <div className="relative">
                  <span className="absolute left-3 top-3.5 text-gray-500 text-sm">R$</span>
                  <Input type="number" className="pl-9" step="0.01" value={filters.min} onChange={(e) => setFilters(f => ({ ...f, min: e.target.value }))} />
               </div>
            </Field>
            <Field label="Valor máximo">
              <div className="relative">
                  <span className="absolute left-3 top-3.5 text-gray-500 text-sm">R$</span>
                  <Input type="number" className="pl-9" step="0.01" value={filters.max} onChange={(e) => setFilters(f => ({ ...f, max: e.target.value }))} />
               </div>
            </Field>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-dark-700">
            <Button variant="ghost" onClick={() => clearFilters()}>Limpar Filtros</Button>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setFiltersOpen(false)}>Cancelar</Button>
              <Button onClick={() => { setPage(1); setFiltersOpen(false); }}>Aplicar Resultados</Button>
            </div>
          </div>
        </div>
    </Modal>
  );

  return (
    <div className="space-y-6">
      <FilterModal />
      <Section title="Resumo Financeiro"
        right={
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex items-center bg-dark-950 rounded-lg p-1 border border-dark-700">
              <button onClick={() => { setSelectedMonth(prevMonthKey(selectedMonth)); setPage(1); }} className="p-1.5 hover:bg-dark-800 rounded-md transition-all"><ChevronLeft className="w-4 h-4 text-gray-400" /></button>
              <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setPage(1); }} className="bg-transparent border-none text-sm font-semibold text-white focus:ring-0 cursor-pointer py-1 px-2">
                {monthsOptions.map((m: string) => (<option key={m} className="bg-dark-900" value={m}>{m}</option>))}
              </select>
              <button onClick={() => { setSelectedMonth(nextMonthKey(selectedMonth)); setPage(1); }} className="p-1.5 hover:bg-dark-800 rounded-md transition-all"><ChevronRight className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="flex items-center gap-2 bg-dark-950 px-3 py-1.5 rounded-lg border border-dark-700">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input type="date" value={baseDate} onChange={(e) => onBaseDateChange(e.target.value)} className="bg-transparent border-none text-sm text-gray-400 focus:ring-0 p-0 w-28" />
            </div>
          </div>
        }>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Stat label="Ganhos Totais" value={toMoney(incomesInMonth.total)} tone="ok" />
          <Stat label="Gastos Totais" value={toMoney(installsInMonth.total)} sub={installsInMonth.totalPaid ? `${toMoney(installsInMonth.totalPaid)} já pagos` : undefined} tone="bad" />
          <Stat label="Saldo Restante" value={toMoney(leftover)} tone={leftover >= 0 ? 'ok' : 'bad'} />
        </div>
      </Section>

      {cards.length > 0 && (
        <Section title="Faturas de Cartão" className="bg-dark-800/40 border-dark-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c: any) => {
              const items = (byCard.get(c.id) || []).filter((i: any) => (i.due_month || i.dueMonth) === selectedMonth);
              const total = items.reduce((s: number, i: any) => s + (i.paid ? 0 : Number(i.amount || 0)), 0);
              const allPaid = items.length > 0 && items.every((i: any) => i.paid);
              const disabled = items.length === 0;
              return (
                <div key={c.id} className="bg-dark-900 rounded-xl border border-dark-800 p-5 shadow-lg hover:border-brand-400/50 transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                      <CreditCard className="w-16 h-16 text-white" />
                  </div>
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="font-semibold text-white text-lg">{c.name}</div>
                    <Checkbox checked={allPaid} disabled={disabled || loadingCardId === c.id} onChange={async (v) => { setLoadingCardId(c.id); try { await setCardMonthPaid(c.id, selectedMonth, v); } finally { setLoadingCardId(null); } }} label="" />
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider relative z-10">Aberto neste mês</div>
                  <div className="text-2xl font-bold text-brand-400 mt-1 relative z-10">{disabled ? '—' : toMoney(total)}</div>
                   {loadingCardId === c.id && <div className="absolute inset-0 bg-dark-900/90 flex items-center justify-center z-20"><span className="text-xs font-bold animate-pulse text-brand-400">Atualizando...</span></div>}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-6">
             <Section title="Detalhamento de Gastos">
                <div className="flex flex-col gap-4 mb-6">
                   <div className="flex gap-3">
                      <div className="relative flex-1">
                         <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                         <Input placeholder="Buscar gasto..." value={query} onChange={e => { setPage(1); setQuery(e.target.value); }} className="pl-10" />
                      </div>
                      <Button variant="secondary" onClick={() => setFiltersOpen(true)} className={hasFilters ? "border-brand-400/50 bg-brand-400/10 text-brand-400" : ""}>
                         <Filter className="w-4 h-4" />
                         Filtros
                      </Button>
                      {hasFilters && <Button variant="ghost" onClick={() => { clearFilters(); setPage(1); }}><X className="w-4 h-4" /></Button>}
                   </div>
                </div>

                {installments.length === 0 ? (
                   <div className="text-center py-12 text-gray-500 bg-dark-900/50 rounded-xl border border-dashed border-dark-800">
                      Nenhum gasto encontrado para este mês.
                   </div>
                ) : (
                   <>
                      <div className="space-y-3">
                         {view.map((i: any) => (
                            <div key={i.id} className="group bg-dark-900 rounded-xl border border-dark-800 p-4 hover:border-brand-400/50 hover:shadow-lg hover:bg-dark-850 transition-all">
                               <div className="flex items-start justify-between">
                                  <div>
                                     <div className="font-semibold text-white group-hover:text-brand-400 transition-colors">{i.name}</div>
                                     <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                        <span className="bg-dark-950 px-2 py-0.5 rounded-full border border-dark-800">{labelCat(i.category_id || i.categoryId)}</span>
                                        <span>•</span>
                                        <span>{(i.payment_type || i.paymentType) === 'card' ? labelCard(i.card_id || i.cardId) : 'Dinheiro'}</span>
                                        {Number(i.total) > 1 && <span className="text-brand-400 font-medium">• {i.n}/{i.total}</span>}
                                     </div>
                                  </div>
                                  <div className="text-right">
                                     <div className="font-bold text-white">{toMoney(i.amount)}</div>
                                     <div className={`text-xs font-medium mt-1 ${i.paid ? "text-emerald-400" : "text-brand-400"}`}>
                                        {i.paid ? "Pago" : "Pendente"}
                                     </div>
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-dark-800">
                         <Button variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                         <span className="text-sm text-gray-500 font-medium">Página {page} de {totalPages}</span>
                         <Button variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</Button>
                      </div>
                   </>
                )}
             </Section>
         </div>

         <div className="space-y-6">
            <Section title="Parcelas em Dinheiro">
               {cash.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">Nenhum pagamento em dinheiro pendente.</div>
               ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scroll">
                     {cash.map((i: any) => (
                        <div key={i.id} className="flex items-center justify-between p-3 rounded-lg border border-dark-800 bg-dark-900 hover:bg-dark-850 transition-colors">
                           <div className="text-sm">
                              <div className="font-medium text-white">{i.name}</div>
                              <div className="text-gray-400 text-xs">{toMoney(i.amount)} • {i.n}/{i.total}</div>
                           </div>
                           <Checkbox checked={i.paid} onChange={(v) => setInstallmentPaid(i.id, v)} label={i.paid ? "Pago" : "Pagar"} />
                        </div>
                     ))}
                  </div>
               )}
            </Section>
            <Reports state={state} selectedMonth={selectedMonth} />
         </div>
      </div>
    </div>
  );
}

function Reports({ state, selectedMonth }: any) {
  const [mode, setMode] = useState('category'); // payment, category, month
  
  const data = useMemo(() => {
     if (mode === 'month') {
        const months = Array.from({ length: 12 }, (_, k) => {
           const base = parseYMD(selectedMonth + '-01');
           return monthKey(addMonths(base, -(11 - k)));
        });
        return months.map(m => ({
           name: m,
           value: state.installments.filter((i: any) => (i.dueMonth || i.due_month) === m).reduce((s: number, i: any) => s + Number(i.amount || 0), 0)
        }));
     }
     
     const currentItems = state.installments.filter((x: any) => (x.dueMonth || x.due_month) === selectedMonth);
     if (mode === 'payment') {
        const m = new Map();
        for (const i of currentItems) {
           const k = (i.paymentType || i.payment_type) === 'card' ? (state.cards.find((c: any) => c.id === (i.cardId || i.card_id))?.name || 'Cartão') : 'Dinheiro';
           m.set(k, (m.get(k) || 0) + Number(i.amount || 0));
        }
        return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
     }
     
     // Default: Category
     const m = new Map();
     for (const i of currentItems) {
        const k = state.categories.find((c: any) => c.id === (i.categoryId || i.category_id))?.name || 'Sem categoria';
        m.set(k, (m.get(k) || 0) + Number(i.amount || 0));
     }
     return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value);
  }, [state.installments, selectedMonth, mode, state.cards, state.categories]);

  const COLORS = ['#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12', '#422006', '#fef08a', '#fef9c3'];

  return (
    <Section title="Relatórios" right={
      <Select value={mode} onChange={e => setMode(e.target.value)} className="w-full py-1.5 text-xs !border-dark-700">
        <option value="category">Por categoria</option>
        <option value="payment">Por pagamento</option>
        <option value="month">Tendência (12 meses)</option>
      </Select>
    }>
      <div className="h-64 w-full">
         <ResponsiveContainer width="100%" height="100%">
            {mode === 'month' ? (
               <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="name" fontSize={10} tickMargin={10} stroke="#a1a1aa" />
                  <YAxis fontSize={10} stroke="#a1a1aa" tickFormatter={(v) => `R$${v}`} />
                  <ReTooltip formatter={(val: number) => toMoney(val)} contentStyle={{backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #3f3f46', color: '#fff'}} itemStyle={{color: '#facc15'}} />
                  <Line type="monotone" dataKey="value" stroke="#facc15" strokeWidth={3} dot={{fill: '#facc15', r: 4}} activeDot={{r: 6}} />
               </LineChart>
            ) : (
               <PieChart>
                  <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                     {data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                  </Pie>
                  <ReTooltip formatter={(val: number) => toMoney(val)} contentStyle={{backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #3f3f46', color: '#fff'}} itemStyle={{color: '#fff'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px', color: '#d4d4d8'}} />
               </PieChart>
            )}
         </ResponsiveContainer>
      </div>
    </Section>
  );
}

function Expenses({ state, addExpense, deleteExpense, getPer, getTotal, isParcelado, setState, client, user }: any) {
  const [addMode, setAddMode] = useState<'quick' | 'full'>('quick');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", isPerInst: false, totalAmount: "", perInstallment: "", categoryId: "",
    purchaseDate: fmtDate(today()), billingYear: String(today().getFullYear()), billingMonthNum: monthKey(today()).slice(5, 7),
    billingTouched: false, type: "single", months: 2, payType: "card", cardId: state.cards[0]?.id || ""
  });

  const [quickForm, setQuickForm] = useState({
     name: "",
     amount: "",
     purchaseDate: fmtDate(today()),
     billingYear: String(today().getFullYear()),
     billingMonthNum: monthKey(today()).slice(5, 7),
     billingTouched: false,
     cardId: state.cards[0]?.id || ""
  });

  // History search
  const [historyQuery, setHistoryQuery] = useState("");

  const LAST_CARD_KEY = "budget_last_card_id";
  
  // Billing Month Logic
  const autoUpdateBilling = (dateStr: string, touched: boolean, setter: any) => {
     if (!touched) {
        const pd = parseYMD(dateStr);
        const y = pd.getFullYear(), m = pd.getMonth() + 1;
        const nx = m === 12 ? 1 : m + 1, ny = m === 12 ? y + 1 : y;
        setter((f: any) => ({ ...f, billingYear: String(ny), billingMonthNum: String(nx).padStart(2, '0') }));
     }
  };

  useEffect(() => { autoUpdateBilling(form.purchaseDate, form.billingTouched, setForm); }, [form.purchaseDate, form.billingTouched]);
  useEffect(() => { autoUpdateBilling(quickForm.purchaseDate, quickForm.billingTouched, setQuickForm); }, [quickForm.purchaseDate, quickForm.billingTouched]);

  useEffect(() => {
    if (form.payType === 'card' && form.cardId) localStorage.setItem(LAST_CARD_KEY, form.cardId);
  }, [form.payType, form.cardId]);
  
  useEffect(() => {
     if(form.payType !== 'card') return;
     const saved = localStorage.getItem(LAST_CARD_KEY);
     if(saved && state.cards.some((c:any) => c.id === saved)) {
        setForm(f => ({...f, cardId: saved}));
        setQuickForm(f => ({...f, cardId: saved}));
     }
  }, [form.payType, state.cards]);

  const reset = () => {
    setStep(1);
    const t = today();
    const defaults = {
      name: "", isPerInst: false, totalAmount: "", perInstallment: "", categoryId: "",
      purchaseDate: fmtDate(t), billingYear: String(t.getFullYear()), billingMonthNum: monthKey(t).slice(5, 7),
      billingTouched: false, type: "single", months: 2, payType: "card", cardId: state.cards[0]?.id || ""
    };
    setForm(defaults);
    setQuickForm({
      name: "", amount: "", purchaseDate: fmtDate(t),
      billingYear: String(t.getFullYear()), billingMonthNum: monthKey(t).slice(5, 7),
      billingTouched: false, cardId: state.cards[0]?.id || ""
    });
  };

  const submitQuick = () => {
     if(!quickForm.name) return alert("Informe o nome.");
     if(!Number(quickForm.amount)) return alert("Informe o valor.");
     if(!quickForm.cardId) return alert("Selecione um cartão. Se não tiver, cadastre na aba Pagamentos.");

     const total = Number(quickForm.amount);
     const startBillingMonth = `${quickForm.billingYear}-${quickForm.billingMonthNum}`;

     addExpense({
        name: quickForm.name,
        totalAmount: total,
        perInstallment: total, // Single
        isPerInstallmentValue: false,
        categoryId: null, // Quick add has no category selection
        purchaseDate: quickForm.purchaseDate,
        paymentType: 'card',
        cardId: quickForm.cardId,
        startBillingMonth,
        type: 'single',
        months: 1
     });
     reset();
     alert('Gasto rápido adicionado!');
  };

  const submitFull = () => {
    if (form.type === 'parcelado' && Number(form.months) < 2) return alert('Para parcelado, informe meses ≥ 2');
    if (form.payType === 'card' && !form.cardId) return alert('Cadastre um cartão em Pagamentos.');
    
    const m = Number(form.months || 1);
    const total = form.isPerInst ? Number(form.perInstallment || 0) * m : Number(form.totalAmount || 0);
    const per = form.isPerInst ? Number(form.perInstallment || 0) : Number((total / m).toFixed(2));
    const startBillingMonth = `${form.billingYear}-${form.billingMonthNum}`;
    
    addExpense({
      name: form.name, totalAmount: total, perInstallment: per, isPerInstallmentValue: form.isPerInst,
      categoryId: form.categoryId || null, purchaseDate: form.purchaseDate, paymentType: form.payType,
      cardId: form.payType === 'card' ? form.cardId : null, startBillingMonth, type: form.type, months: m
    });
    reset();
    alert('Gasto adicionado!');
  };

  const nextStep = () => {
    if (step === 1) {
      if (!form.name) return alert('Informe o nome');
      const ok = form.isPerInst ? Number(form.perInstallment) > 0 : Number(form.totalAmount) > 0;
      if (!ok) return alert('Informe um valor');
    }
    if (step === 2 && !form.purchaseDate) return alert('Informe a data');
    setStep(s => Math.min(3, s + 1));
  };

  // List Logic
  const all = useMemo(() => {
     let arr = [...state.expenses].reverse();
     if(historyQuery) {
        const q = historyQuery.toLowerCase();
        arr = arr.filter((e: any) => e.name.toLowerCase().includes(q));
     }
     return arr;
  }, [state.expenses, historyQuery]);

  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  const paged = all.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
  
  const [actionExp, setActionExp] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const onEdit = () => {
    const e = actionExp;
    const parcelado = isParcelado(e);
    const months = Number(e.months || 1);
    const per = getPer(e);
    const total = getTotal(e);
    setEditForm({
      id: e.id, name: e.name, categoryId: e.categoryId || e.category_id || "",
      isPerInst: !!parcelado, amount: parcelado ? String(per) : String(total),
      months, type: e.type || 'single'
    });
    setEditOpen(true);
    setActionExp(null);
  };

  async function saveEdit() {
    const { id, name, categoryId, isPerInst, amount, months } = editForm;
    const m = Number(months || 1);
    const num = Number(amount || 0);
    if (!(num > 0)) { alert('Informe um valor válido'); return; }
    const total = isPerInst ? Number((num * m).toFixed(2)) : Number(num);
    const per = isPerInst ? Number(num) : Number((total / m).toFixed(2));

    setState((prev: any) => {
      const expenses = prev.expenses.map((e: any) => e.id === id ? {
        ...e, name, categoryId: categoryId || null, category_id: categoryId || null,
        totalAmount: total, total_amount: total, perInstallment: per, per_installment: per,
        isPerInstallmentValue: !!isPerInst, is_per_installment_value: !!isPerInst
      } : e);
      const installments = prev.installments.map((i: any) => (i.expenseId === id || i.expense_id === id) ? {
        ...i, name, categoryId: categoryId || null, category_id: categoryId || null, amount: per
      } : i);
      return { ...prev, expenses, installments };
    });

    try {
      if (client && user) {
        await client.from('expenses').update({ name, category_id: categoryId || null, total_amount: total, per_installment: per, is_per_installment_value: !!isPerInst }).eq('id', id).eq('user_id', user.id);
        await client.from('installments').update({ name, category_id: categoryId || null, amount: per }).eq('expense_id', id).eq('user_id', user.id);
      }
      setEditOpen(false);
    } catch (err: any) { alert('Erro Supabase: ' + err.message); }
  }

  return (
    <div className="grid gap-8">
      <Section title="Novo Gasto" right={
         <div className="bg-dark-950 p-1 rounded-lg border border-dark-700 flex">
            <button 
               onClick={() => setAddMode('quick')} 
               className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${addMode === 'quick' ? 'bg-brand-400 text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}>
               <Zap className="w-3 h-3" /> Rápido
            </button>
            <button 
               onClick={() => setAddMode('full')} 
               className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${addMode === 'full' ? 'bg-brand-400 text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}>
               <List className="w-3 h-3" /> Completo
            </button>
         </div>
      }>
         <div className="max-w-xl mx-auto">
            {addMode === 'quick' ? (
               <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                  <Field label="Nome do Gasto">
                     <Input value={quickForm.name} onChange={e => setQuickForm({...quickForm, name: e.target.value})} placeholder="Ex.: Padaria" autoFocus />
                  </Field>
                  <Field label="Valor (À vista)">
                     <Input type="number" step="0.01" className="text-lg font-bold text-brand-400" placeholder="0,00" value={quickForm.amount} onChange={e => setQuickForm({...quickForm, amount: e.target.value})} />
                  </Field>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <Field label="Data da Compra">
                        <Input type="date" value={quickForm.purchaseDate} onChange={e => setQuickForm({...quickForm, purchaseDate: e.target.value})} />
                     </Field>
                     <div className="grid grid-cols-2 gap-2">
                        <Field label="Mês Início">
                           <Select value={quickForm.billingMonthNum} onChange={e => setQuickForm({...quickForm, billingTouched: true, billingMonthNum: e.target.value})}>
                              {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>))}
                           </Select>
                        </Field>
                        <Field label="Ano">
                           <Select value={quickForm.billingYear} onChange={e => setQuickForm({...quickForm, billingTouched: true, billingYear: e.target.value})}>
                              {Array.from({ length: 5 }, (_, i) => String(parseYMD(quickForm.purchaseDate).getFullYear() + i)).map(y => (<option key={y} value={y}>{y}</option>))}
                           </Select>
                        </Field>
                     </div>
                  </div>

                  <Field label="Cartão">
                     <Select value={quickForm.cardId} onChange={e => setQuickForm({...quickForm, cardId: e.target.value})}>
                       {state.cards.length === 0 ? <option value="">Cadastre um cartão primeiro!</option> : state.cards.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                     </Select>
                  </Field>

                  <Button onClick={submitQuick} className="w-full mt-2">
                     Adicionar Rapidamente
                  </Button>
                  <div className="text-xs text-center text-gray-500">
                     * Para compras parceladas, pagamentos em dinheiro ou categorização, use o modo <strong>Completo</strong>.
                  </div>
               </div>
            ) : (
               <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                   {/* Stepper UI */}
                  <div className="flex items-center justify-center mb-6">
                     {[1, 2, 3].map(s => (
                        <div key={s} className="flex items-center">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors border-2 ${step >= s ? "bg-brand-400 border-brand-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.4)]" : "bg-dark-900 border-dark-700 text-gray-500"}`}>
                              {s}
                           </div>
                           {s < 3 && <div className={`w-12 h-0.5 transition-colors ${step > s ? "bg-brand-400" : "bg-dark-800"}`} />}
                        </div>
                     ))}
                  </div>

                  {step === 1 && (
                   <div className="space-y-5">
                     <Field label="Nome do gasto"><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex.: Compras do Mês" autoFocus /></Field>
                     <div className="bg-dark-950 p-4 rounded-xl border border-dark-800">
                       <Field label="Como prefere informar o valor?" className="mb-3">
                          <div className="flex gap-4">
                             <Checkbox checked={!form.isPerInst} onChange={v => setForm({...form, isPerInst: !v})} label="Valor Total da Compra" />
                             <Checkbox checked={form.isPerInst} onChange={v => setForm({...form, isPerInst: v})} label="Valor da Parcela" />
                          </div>
                       </Field>
                       <Field label={form.isPerInst ? "Valor da Parcela (R$)" : "Valor Total (R$)"}>
                          <Input type="number" step="0.01" className="text-lg font-bold text-brand-400" placeholder="0,00" value={form.isPerInst ? form.perInstallment : form.totalAmount} onChange={e => form.isPerInst ? setForm({...form, perInstallment: e.target.value}) : setForm({...form, totalAmount: e.target.value})} />
                       </Field>
                     </div>
                     <Field label="Categoria">
                       <Select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
                         <option value="">Selecione...</option>
                         {state.categories.filter((c: any) => c.type === 'expense').map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                       </Select>
                     </Field>
                     <div className="flex justify-end pt-2"><Button onClick={nextStep}>Continuar &rarr;</Button></div>
                   </div>
                  )}

                  {step === 2 && (
                   <div className="space-y-5">
                     <Field label="Data da Compra"><Input type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} /></Field>
                     <div className="grid grid-cols-2 gap-4">
                       <Field label="Mês 1ª Fatura"><Select value={form.billingMonthNum} onChange={e => setForm({...form, billingTouched: true, billingMonthNum: e.target.value})}>{Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>))}</Select></Field>
                       <Field label="Ano"><Select value={form.billingYear} onChange={e => setForm({...form, billingTouched: true, billingYear: e.target.value})}>{Array.from({ length: 5 }, (_, i) => String(parseYMD(form.purchaseDate).getFullYear() + i)).map(y => (<option key={y} value={y}>{y}</option>))}</Select></Field>
                     </div>
                     <div className="flex justify-between pt-2"><Button variant="secondary" onClick={() => setStep(1)}>&larr; Voltar</Button><Button onClick={() => setStep(3)}>Continuar &rarr;</Button></div>
                   </div>
                  )}

                  {step === 3 && (
                   <div className="space-y-5">
                     <div className="grid grid-cols-2 gap-4">
                        <Field label="Pagamento">
                           <Select value={form.payType} onChange={e => setForm({...form, payType: e.target.value})}>
                              <option value="card">Cartão de Crédito</option>
                              <option value="cash">Dinheiro / Débito / Pix</option>
                           </Select>
                        </Field>
                        <Field label="Tipo">
                           <Select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                              <option value="single">À Vista (1x)</option>
                              <option value="parcelado">Parcelado</option>
                           </Select>
                        </Field>
                     </div>
                     
                     {form.type === 'parcelado' && (
                        <Field label="Quantidade de Parcelas">
                           <div className="flex items-center gap-3">
                              <Button variant="secondary" onClick={() => setForm(f => ({...f, months: Math.max(2, Number(f.months) - 1)}))}>-</Button>
                              <div className="font-bold text-xl w-12 text-center text-white">{form.months}x</div>
                              <Button variant="secondary" onClick={() => setForm(f => ({...f, months: Number(f.months) + 1}))}>+</Button>
                           </div>
                        </Field>
                     )}
                     
                     {form.payType === 'card' && (
                       <Field label="Cartão Utilizado">
                         <Select value={form.cardId} onChange={e => setForm({...form, cardId: e.target.value})}>
                           {state.cards.length === 0 ? <option value="">Cadastre um cartão primeiro!</option> : state.cards.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                         </Select>
                       </Field>
                     )}
                     
                     <div className="bg-dark-950 rounded-xl p-4 text-sm text-gray-400 border border-dark-800 mt-2">
                        <div className="font-semibold text-brand-400 mb-1 uppercase tracking-wide text-xs">Resumo do Lançamento</div>
                        <div className="text-white text-lg font-bold">{form.name || 'Sem nome'}</div>
                        <div>{form.isPerInst ? `Parcelas de ${toMoney(form.perInstallment)}` : `Total: ${toMoney(form.totalAmount)}`}</div>
                        <div>{form.type === 'parcelado' ? `${form.months} parcelas` : 'Pagamento único'}</div>
                        <div>Início: {form.billingMonthNum}/{form.billingYear}</div>
                     </div>

                     <div className="flex justify-between pt-2"><Button variant="secondary" onClick={() => setStep(2)}>&larr; Voltar</Button><Button onClick={submitFull}>Concluir Lançamento</Button></div>
                   </div>
                  )}
               </div>
            )}
        </div>
      </Section>

      <Section title="Histórico de Gastos" right={
         <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input 
               type="text" 
               placeholder="Buscar no histórico..." 
               value={historyQuery}
               onChange={(e) => { setPage(1); setHistoryQuery(e.target.value); }}
               className="w-full bg-dark-950 border border-dark-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 transition-colors"
            />
         </div>
      }>
        {all.length === 0 ? <div className="text-center py-8 text-gray-500 italic">Nenhum gasto encontrado.</div> :
          <div className="space-y-3">
            {paged.map((e: any) => {
              const parcelado = isParcelado(e);
              const valor = parcelado ? getPer(e) : (e.totalAmount ?? e.total_amount ?? 0);
              return (
                <div key={e.id} className="flex items-center justify-between bg-dark-900 border border-dark-800 rounded-xl p-4 hover:border-brand-400/50 transition-all hover:bg-dark-850 group">
                  <div>
                    <div className="font-bold text-white group-hover:text-brand-400 transition-colors">{e.name}</div>
                    <div className="text-sm text-gray-400 flex gap-2 items-center mt-0.5">
                       <span className="font-medium text-brand-400">{toMoney(valor)}</span>
                       <span>•</span>
                       <span>{parcelado ? `${e.months}x` : `À vista`}</span>
                       <span>•</span>
                       <span className="text-xs bg-dark-950 border border-dark-700 px-1.5 rounded text-gray-400">Início {e.startBillingMonth || e.start_billing_month}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <button onClick={() => setActionExp(actionExp?.id === e.id ? null : e)} className="p-2 hover:bg-dark-800 rounded-lg text-gray-400">
                      <Settings className="w-5 h-5" />
                    </button>
                    {actionExp?.id === e.id && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-dark-800 shadow-xl rounded-xl border border-dark-700 overflow-hidden z-20 py-1 animate-in fade-in zoom-in duration-200">
                         <button onClick={onEdit} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-dark-700 hover:text-white flex items-center gap-2"><Edit2 className="w-3 h-3"/> Editar</button>
                         <button onClick={() => { deleteExpense(actionExp.id, 'all'); setActionExp(null); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"><Trash2 className="w-3 h-3"/> Excluir</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-4">
               <Button variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
               <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
               <Button variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</Button>
            </div>
          </div>}
      </Section>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Gasto">
         <div className="grid gap-4">
            <Field label="Nome"><Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></Field>
            <Field label="Categoria">
               <Select value={editForm.categoryId || ""} onChange={e => setEditForm({ ...editForm, categoryId: e.target.value || null })}>
                  <option value="">Sem categoria</option>
                  {state.categories.filter((c: any) => c.type === 'expense').map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
               </Select>
            </Field>
            <div className="bg-brand-900/10 p-4 rounded-lg border border-brand-500/30 text-brand-200">
               <div className="font-bold text-xs uppercase tracking-wide mb-2 text-brand-400">Ajuste Financeiro</div>
               <Field label="Tipo de valor" className="mb-2">
                  <div className="flex gap-3 text-sm">
                     <label className="flex items-center gap-2"><input type="radio" checked={!editForm.isPerInst} onChange={() => setEditForm({...editForm, isPerInst: false})} /> Valor Total</label>
                     <label className="flex items-center gap-2"><input type="radio" checked={editForm.isPerInst} onChange={() => setEditForm({...editForm, isPerInst: true})} /> Valor da Parcela</label>
                  </div>
               </Field>
               <Field label="Valor (R$)">
                  <Input type="number" step="0.01" value={editForm.amount || ''} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} />
               </Field>
               <div className="text-xs mt-2 opacity-80">Atenção: Alterar este valor atualizará <strong>todas</strong> as parcelas deste gasto.</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
               <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
               <Button onClick={saveEdit}>Salvar Alterações</Button>
            </div>
         </div>
      </Modal>
    </div>
  );
}

function Incomes({ state, addIncome, updateIncome, deleteIncome }: any) {
  const formRef = useRef<HTMLFormElement>(null);
  const onSubmit = (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const o = Object.fromEntries(fd.entries());
    addIncome({ name: o.name, amount: Number(o.amount || 0), months: Number(o.months || 1), startDate: o.startDate || fmtDate(today()), categoryId: o.categoryId || null });
    formRef.current?.reset();
  };
  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
         <Section title="Novo Ganho">
           <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
             <Field label="Nome"><Input name="name" placeholder="Ex.: Salário" required /></Field>
             <Field label="Valor (R$)"><Input name="amount" type="number" step="0.01" min="0" placeholder="0,00" required /></Field>
             <div className="grid grid-cols-2 gap-3">
                <Field label="Meses"><Input name="months" type="number" min="1" defaultValue="1" /></Field>
                <Field label="Início"><Input name="startDate" type="date" defaultValue={fmtDate(today())} /></Field>
             </div>
             <Field label="Categoria">
                <Select name="categoryId">
                   <option value="">Selecione...</option>
                   {state.categories.filter((c: any) => c.type === 'income').map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </Select>
             </Field>
             <Button type="submit" className="w-full mt-2">Adicionar Ganho</Button>
           </form>
         </Section>
      </div>
      <div className="lg:col-span-2">
         <Section title="Ganhos Recentes">
           {state.incomes.length === 0 ? <div className="text-gray-500 text-center py-8 italic">Nenhum ganho registrado.</div> :
             <div className="grid sm:grid-cols-2 gap-4">
                {state.incomes.map((g: any) => (<IncomeRow key={g.id} g={g} categories={state.categories} onSave={updateIncome} onDelete={deleteIncome} />))}
             </div>}
         </Section>
      </div>
    </div>
  );
}

function IncomeRow({ g, categories, onSave, onDelete }: any) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(g);
  useEffect(() => setForm(g), [g.id]);
  
  if (!edit) {
    return (
      <div className="p-4 rounded-xl border border-dark-800 bg-dark-900 shadow-md hover:border-brand-400/50 transition-all hover:-translate-y-1">
         <div className="flex justify-between items-start mb-2">
            <div className="font-bold text-white">{g.name}</div>
            <div className="text-emerald-400 font-bold">{toMoney(g.amount)}</div>
         </div>
         <div className="text-xs text-gray-400 space-y-1 mb-4">
            <div>{g.months} {g.months > 1 ? 'meses' : 'mês'} • Início {fmtDate(g.start_date || g.startDate)}</div>
            <div className="inline-block bg-dark-950 border border-dark-800 px-2 py-0.5 rounded text-gray-300">{categories.find((c: any) => c.id === (g.categoryId || g.category_id))?.name || 'Geral'}</div>
         </div>
         <div className="flex gap-2 border-t border-dark-800 pt-3">
            <Button variant="ghost" onClick={() => setEdit(true)} className="flex-1 text-xs py-1 h-8">Editar</Button>
            <Button variant="ghost" onClick={() => onDelete(g.id)} className="flex-1 text-xs py-1 h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10">Excluir</Button>
         </div>
      </div>
    );
  }
  return (
    <div className="p-4 rounded-xl border border-brand-400/50 bg-dark-900 shadow-lg relative z-10">
      <div className="space-y-3">
         <Field label="Nome"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
         <div className="grid grid-cols-2 gap-2">
            <Field label="Valor"><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
            <Field label="Meses"><Input type="number" min="1" value={form.months} onChange={(e) => setForm({ ...form, months: Number(e.target.value) })} /></Field>
         </div>
         <div className="grid grid-cols-2 gap-2">
            <Field label="Data"><Input type="date" value={fmtDate(form.start_date || form.startDate)} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Categoria">
               <Select value={form.categoryId || form.category_id || ""} onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })}>
                  <option value="">Geral</option>
                  {categories.filter((c: any) => c.type === 'income').map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
               </Select>
            </Field>
         </div>
         <div className="flex gap-2 pt-2">
            <Button onClick={() => { onSave(form); setEdit(false); }} className="flex-1">Salvar</Button>
            <Button variant="secondary" onClick={() => setEdit(false)} className="flex-1">Cancelar</Button>
         </div>
      </div>
    </div>
  );
}

function Cards({ state, addCard, removeCard }: any) {
  const [name, setName] = useState('');
  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <Section title="Gerenciar Cartões">
          <div className="flex gap-3 mb-6">
             <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Cartão (ex: Nubank, Visa)" className="flex-1" />
             <Button onClick={() => { if (!name.trim()) return; addCard(name.trim()); setName(''); }}>Adicionar Cartão</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
             {state.cards.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-4 border border-dark-800 rounded-xl bg-dark-900 shadow-sm hover:border-brand-400/30 transition-all">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-400/10 flex items-center justify-center text-brand-400 shadow-inner">
                         <CreditCard className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-white">{c.name}</span>
                   </div>
                   <Button variant="ghost" onClick={() => removeCard(c.id)} className="text-red-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="w-4 h-4" /></Button>
                </div>
             ))}
             {state.cards.length === 0 && <div className="col-span-full text-center text-gray-500 py-4 italic">Nenhum cartão cadastrado.</div>}
          </div>
       </Section>
    </div>
  );
}

function Categories({ state, addCategory, removeCategory }: any) {
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <Section title="Gerenciar Categorias">
          <div className="flex flex-col sm:flex-row gap-3 mb-8 bg-dark-900 p-4 rounded-xl border border-dark-800">
             <div className="flex-1">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da Categoria" />
             </div>
             <div className="w-full sm:w-40">
                <Select value={type} onChange={e => setType(e.target.value)}>
                   <option value="expense">Gasto</option>
                   <option value="income">Ganho</option>
                </Select>
             </div>
             <Button onClick={() => { if (!name.trim()) return; addCategory(name.trim(), type); setName(''); }}>Adicionar</Button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
             <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Gastos</h3>
                <div className="space-y-2">
                   {state.categories.filter((c:any) => c.type === 'expense').map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 border border-dark-800 rounded-lg bg-dark-900 hover:border-brand-400/50 transition-colors group">
                         <span className="text-gray-300 font-medium">{c.name}</span>
                         <button onClick={() => removeCategory(c.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                   ))}
                </div>
             </div>
             <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Ganhos</h3>
                <div className="space-y-2">
                   {state.categories.filter((c:any) => c.type === 'income').map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 border border-dark-800 rounded-lg bg-dark-900 hover:border-emerald-400/50 transition-colors group">
                         <span className="text-gray-300 font-medium">{c.name}</span>
                         <button onClick={() => removeCategory(c.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                   ))}
                </div>
             </div>
          </div>
       </Section>
    </div>
  );
}

function MobileMenu({ open, onClose, onNav, onExport, onConfig, onLogin, onLogout, user, ready }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-64 bg-dark-900 border-l border-dark-800 shadow-2xl p-4 transform transition-transform duration-200 ease-out" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-dark-800">
          <span className="font-bold text-lg text-white">Menu</span>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-500" /></button>
        </div>
        <nav className="space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'incomes', label: 'Ganhos', icon: TrendingUp },
            { id: 'expenses', label: 'Gastos', icon: TrendingDown },
            { id: 'cards', label: 'Pagamentos', icon: CreditCard },
            { id: 'categories', label: 'Categorias', icon: Tags }
          ].map(item => (
            <button key={item.id} onClick={() => { onNav(item.id); onClose(); }} className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-brand-400/10 hover:text-brand-400 rounded-xl transition-colors font-medium">
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-6 pt-6 border-t border-dark-800 space-y-3">
           <button onClick={() => { onExport(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white"><FileJson className="w-4 h-4" /> Exportar Dados</button>
           <button onClick={() => { onConfig(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white"><Settings className="w-4 h-4" /> Configurar Supabase</button>
           {ready && user ? 
              <button onClick={() => { onLogout(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg"><LogOut className="w-4 h-4" /> Sair</button> 
              : 
              <button onClick={() => { onLogin(); onClose(); }} className="w-full bg-brand-400 text-black py-2.5 rounded-lg font-bold shadow-sm hover:bg-brand-300">Entrar</button>
           }
        </div>
      </div>
    </div>
  );
}

function ConfigDialog({ open, onClose }: any) {
  const [url, setUrl] = useState(() => { try { return JSON.parse(localStorage.getItem(SUPABASE_CFG_KEY) || '{}').url || ''; } catch { return '' } });
  const [anon, setAnon] = useState(() => { try { return JSON.parse(localStorage.getItem(SUPABASE_CFG_KEY) || '{}').anon || ''; } catch { return '' } });
  
  const save = () => {
     if(!url || !anon) { alert('Informe URL e Anon Key'); return; }
     localStorage.setItem(SUPABASE_CFG_KEY, JSON.stringify({url, anon}));
     // Dispatch event for App to pick up
     window.dispatchEvent(new CustomEvent('supabase-ready'));
     onClose();
     alert('Configuração salva. A página pode recarregar os dados.');
  };

  const clear = () => {
     localStorage.removeItem(SUPABASE_CFG_KEY);
     alert('Configuração removida. Usando padrão (se houver).');
     onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Configurar Supabase">
       <div className="space-y-4">
          <div className="text-sm text-blue-200 bg-blue-900/20 p-3 rounded-lg border border-blue-800">
             Por padrão, o sistema usa a configuração interna. Use estes campos apenas se desejar conectar ao <strong>seu próprio</strong> projeto Supabase.
          </div>
          <Field label="Project URL"><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></Field>
          <Field label="Anon Key"><Input value={anon} onChange={e => setAnon(e.target.value)} placeholder="ey..." /></Field>
          <div className="flex justify-end gap-3 pt-2">
             <Button variant="danger" onClick={clear}>Restaurar Padrão</Button>
             <Button onClick={save}>Salvar Conexão</Button>
          </div>
       </div>
    </Modal>
  );
}

function LoginDialog({ open, onClose, client, onLogged }: any) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('magic'); // 'magic' | 'otp'

  const ensure = () => {
    if (!client) { alert('Cliente Supabase não inicializado.'); return false; }
    return true;
  };

  const sendMagic = async () => {
    if (!ensure()) return;
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://isaaceullen.github.io/controle-financeiro/' }
    });
    if (error) alert(error.message);
    else alert('Link enviado para o e-mail!');
  };

  const sendOtp = async () => {
    if (!ensure()) return;
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    });
    if (error) alert(error.message);
    else alert('Código enviado por e-mail!');
  };

  const verifyOtp = async () => {
    if (!ensure()) return;
    const { data, error } = await client.auth.verifyOtp({
      email,
      token: code,
      type: 'email'
    });
    if (error) alert(error.message);
    else {
      onLogged?.(data.user);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Acessar Conta">
       <div className="space-y-4">
          <Field label="Modo de Login">
             <div className="flex bg-dark-700 p-1 rounded-lg">
                <button onClick={() => setMode('magic')} className={`flex-1 py-1.5 text-sm font-bold uppercase tracking-wide rounded-md transition-all ${mode === 'magic' ? 'bg-brand-400 text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}>Link Mágico</button>
                <button onClick={() => setMode('otp')} className={`flex-1 py-1.5 text-sm font-bold uppercase tracking-wide rounded-md transition-all ${mode === 'otp' ? 'bg-brand-400 text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}>Código (OTP)</button>
             </div>
          </Field>
          <Field label="E-mail"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" /></Field>
          {mode === 'otp' && <Field label="Código de 6 dígitos"><Input value={code} onChange={e => setCode(e.target.value)} placeholder="123456" className="tracking-widest text-center font-mono" /></Field>}
          
          <Button onClick={mode === 'magic' ? sendMagic : (code ? verifyOtp : sendOtp)} className="w-full mt-2">
             {mode === 'magic' ? 'Enviar Link de Acesso' : (code ? 'Confirmar Código' : 'Enviar Código')}
          </Button>
       </div>
    </Modal>
  );
}