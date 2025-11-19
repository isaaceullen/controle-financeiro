import React, { useState, useMemo, useEffect } from 'react';
import { AppState, Expense } from '../types';
import { Button, Section, Input, Select, Checkbox, Field, Modal } from './ui';
import { fmtDate, today, parseYMD, monthKey, toMoney, rid } from '../utils';

interface ExpensesProps {
  state: AppState;
  addExpense: (e: any) => Promise<void>;
  deleteExpense: (id: string, scope: 'all' | 'one', instId?: string) => Promise<void>;
  getPer: (e: Expense) => number;
  getTotal: (e: Expense) => number;
  isParcelado: (e: Expense) => boolean;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  client: any;
  user: any;
}

export const Expenses: React.FC<ExpensesProps> = ({ state, addExpense, deleteExpense, getPer, getTotal, isParcelado, setState, client, user }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [isPerInst, setIsPerInst] = useState(false);
  const [totalAmount, setTotalAmount] = useState("");
  const [perInstallment, setPerInstallment] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(fmtDate(today()));
  const [billingYear, setBillingYear] = useState(String(new Date().getFullYear()));
  const [billingMonthNum, setBillingMonthNum] = useState(monthKey(today()).slice(5, 7));
  const [billingTouched, setBillingTouched] = useState(false);
  const [type, setType] = useState("single");
  const [months, setMonths] = useState(2);
  const [payType, setPayType] = useState("card");
  const [cardId, setCardId] = useState(state.cards[0]?.id || "");
  const LAST_CARD_KEY = "budget_last_card_id";

  useEffect(() => { if (!billingTouched) { const pd = parseYMD(purchaseDate); const y = pd.getFullYear(), m = pd.getMonth() + 1; const nx = m === 12 ? 1 : m + 1, ny = m === 12 ? y + 1 : y; setBillingYear(String(ny)); setBillingMonthNum(String(nx).padStart(2, '0')); } }, [purchaseDate, billingTouched]);
  useEffect(() => { const pd = parseYMD(purchaseDate); const minY = pd.getFullYear(); const minM = String(pd.getMonth() + 1).padStart(2, '0'); if (Number(billingYear) < minY) { setBillingYear(String(minY)); setBillingMonthNum(minM); } else if (Number(billingYear) === minY && billingMonthNum < minM) { setBillingMonthNum(minM); } }, [purchaseDate, billingYear, billingMonthNum]);
  useEffect(() => { if (payType !== 'card') return; const saved = localStorage.getItem(LAST_CARD_KEY); if (saved && state.cards.some(c => c.id === saved)) setCardId(saved); }, [payType, state.cards]);
  useEffect(() => { if (payType === 'card' && cardId) localStorage.setItem(LAST_CARD_KEY, cardId); }, [payType, cardId]);

  function nextStep() { if (step === 1) { if (!name) return alert('Informe o nome'); const ok = isPerInst ? Number(perInstallment) > 0 : Number(totalAmount) > 0; if (!ok) return alert('Informe um valor'); } if (step === 2) { if (!purchaseDate) return alert('Informe a data'); } setStep(s => Math.min(3, s + 1)); }
  function reset() { setStep(1); setName(""); setIsPerInst(false); setTotalAmount(""); setPerInstallment(""); setCategoryId(""); const t = today(); setPurchaseDate(fmtDate(t)); setBillingTouched(false); setBillingMonthNum(monthKey(t).slice(5, 7)); setBillingYear(String(t.getFullYear())); setType("single"); setMonths(2); setPayType("card"); setCardId(state.cards[0]?.id || ""); }
  function submit() { if (type === 'parcelado' && Number(months) < 2) { return alert('Para parcelado, informe meses ≥ 2'); } if (payType === 'card' && !cardId) { return alert('Cadastre um cartão em Pagamentos.'); } const m = Number(months || 1); const total = isPerInst ? Number(perInstallment || 0) * m : Number(totalAmount || 0); const per = isPerInst ? Number(perInstallment || 0) : Number((total / m).toFixed(2)); const startBillingMonth = `${billingYear}-${billingMonthNum}`; addExpense({ name, totalAmount: total, perInstallment: per, isPerInstallmentValue: isPerInst, categoryId: categoryId || null, purchaseDate, paymentType: payType, cardId: payType === 'card' ? cardId : null, startBillingMonth, type, months: m }); reset(); alert('Gasto adicionado!'); }

  const all = useMemo(() => state.expenses.slice().reverse(), [state.expenses]);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  const paged = all.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  const [actionExp, setActionExp] = useState<Expense | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const onEdit = () => {
    const e = actionExp!;
    const parcelado = isParcelado(e);
    const months = Number(e.months || 1);
    const per = getPer(e);
    const total = getTotal(e);
    setEditForm({ id: e.id, name: e.name, categoryId: e.categoryId || e.category_id || "", isPerInst: parcelado ? true : false, amount: parcelado ? String(per) : String(total), months, type: e.type || 'single' });
    setEditOpen(true);
    setActionExp(null);
  };
  const onDelete = () => { if (actionExp) deleteExpense(actionExp.id, 'all'); setActionExp(null); };

  async function saveEdit() {
    const { id, name, categoryId, isPerInst, amount, months, type } = editForm;
    const m = Number(months || 1);
    const num = Number(amount || 0);
    if (!(num > 0)) { alert('Informe um valor válido'); return; }
    const total = isPerInst ? Number((num * m).toFixed(2)) : Number(num);
    const per = isPerInst ? Number(num) : Number((total / m).toFixed(2));

    setState(prev => {
      const expenses = prev.expenses.map(e => e.id === id ? { ...e, name, categoryId: categoryId || null, category_id: categoryId || null, totalAmount: total, total_amount: total, perInstallment: per, per_installment: per, isPerInstallmentValue: !!isPerInst, is_per_installment_value: !!isPerInst } : e);
      const installments = prev.installments.map(i => (i.expenseId === id || i.expense_id === id) ? { ...i, name, categoryId: categoryId || null, category_id: categoryId || null, amount: per } : i);
      return { ...prev, expenses, installments };
    });

    try {
      if (client && user) {
        const { error: e1 } = await client.from('expenses').update({ name, category_id: categoryId || null, total_amount: total, per_installment: per, is_per_installment_value: !!isPerInst }).eq('id', id).eq('user_id', user.id);
        if (e1) throw e1;
        const { error: e2 } = await client.from('installments').update({ name, category_id: categoryId || null, amount: per }).eq('expense_id', id).eq('user_id', user.id);
        if (e2) throw e2;
      }
      setEditOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar no Supabase: ' + err.message);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Section title={`Nova Despesa — Passo ${step} de 3`}>
        <div className="w-full bg-surfaceHighlight rounded-full h-1.5 mb-6">
          <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <Field label="Nome do gasto"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Mercado do mês" autoFocus /></Field>
            <Field label="Modo de valor">
              <div className="flex gap-4 bg-surfaceHighlight p-3 rounded-lg border border-border">
                <Checkbox checked={!isPerInst} onChange={v => setIsPerInst(!v)} label="Valor total" />
                <Checkbox checked={isPerInst} onChange={setIsPerInst} label="Valor da parcela" />
              </div>
            </Field>
            <Field label={isPerInst ? 'Valor da parcela (R$)' : 'Valor total (R$)'}>
              {isPerInst ? <Input type="number" step="0.01" min="0" value={perInstallment} onChange={e => setPerInstallment(e.target.value)} /> : <Input type="number" step="0.01" min="0" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />}
            </Field>
            <Field label="Categoria">
              <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {state.categories.filter(c => c.type === 'expense').map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </Select>
            </Field>
            <div className="flex justify-end mt-6">
              <Button onClick={nextStep}>Próximo &rarr;</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <Field label="Data da compra"><Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Mês início">
                <Select value={billingMonthNum} onChange={e => { setBillingTouched(true); setBillingMonthNum(e.target.value) }}>
                  {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>))}
                </Select>
              </Field>
              <Field label="Ano">
                <Select value={billingYear} onChange={e => { setBillingTouched(true); setBillingYear(e.target.value) }}>
                  {Array.from({ length: 11 }, (_, i) => String(parseYMD(purchaseDate).getFullYear() + i)).map(y => (<option key={y} value={y}>{y}</option>))}
                </Select>
              </Field>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Button variant="secondary" onClick={() => setPurchaseDate(fmtDate(today()))} className="py-1.5 px-3 text-xs">Hoje</Button>
              <Button variant="secondary" onClick={() => { const d = today(); d.setDate(d.getDate() - 1); setPurchaseDate(fmtDate(d)); }} className="py-1.5 px-3 text-xs">Ontem</Button>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="secondary" onClick={() => setStep(1)}>&larr; Voltar</Button>
              <Button onClick={nextStep}>Próximo &rarr;</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Tipo"><Select value={type} onChange={e => setType(e.target.value)}><option value="single">Único</option><option value="parcelado">Parcelado</option></Select></Field>
              {type === 'parcelado' && (
                <div className="sm:col-span-2">
                  <Field label="Parcelas">
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={() => setMonths(m => Math.max(2, Number(m) - 1))}>-</Button>
                      <Input type="number" min="2" value={months} onChange={e => setMonths(Number(e.target.value))} className="text-center" />
                      <Button variant="secondary" onClick={() => setMonths(m => Number(m) + 1)}>+</Button>
                    </div>
                  </Field>
                </div>
              )}
            </div>
            <Field label="Pagamento">
              <Select value={payType} onChange={e => setPayType(e.target.value)}><option value="card">Cartão de Crédito</option><option value="cash">Dinheiro / Débito</option></Select>
            </Field>
            {payType === 'card' && (
              <Field label="Selecione o Cartão">
                <Select value={cardId} onChange={e => setCardId(e.target.value)}>
                  {state.cards.length === 0 ? <option value="">Cadastre um cartão primeiro!</option> : state.cards.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </Select>
              </Field>
            )}
            
            <div className="bg-surfaceHighlight/50 border border-border p-4 rounded-xl text-sm space-y-1 mt-4">
               <div className="font-semibold text-primary mb-2 border-b border-border pb-1">Resumo</div>
               <div className="flex justify-between"><span>Gasto:</span> <span className="text-textMain font-medium">{name || '—'}</span></div>
               <div className="flex justify-between"><span>Valor:</span> <span className="text-textMain font-medium">{isPerInst ? `Parcela de R$ ${perInstallment || '0'}` : `Total de R$ ${totalAmount || '0'}`}</span></div>
               <div className="flex justify-between"><span>Condição:</span> <span className="text-textMain font-medium">{type === 'parcelado' ? `${months}x` : 'À vista'}</span></div>
               <div className="flex justify-between"><span>Início:</span> <span className="text-textMain font-medium">{billingMonthNum}/{billingYear}</span></div>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="secondary" onClick={() => setStep(2)}>&larr; Voltar</Button>
              <Button onClick={submit}>Confirmar e Salvar</Button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Histórico de Lançamentos">
        {state.expenses.length === 0 ? <div className="text-textMuted text-sm text-center py-10">Nenhum gasto cadastrado.</div> :
          <div className="space-y-3">
            {paged.map(e => {
              const parcelado = isParcelado(e);
              const valor = parcelado ? getPer(e) : (e.totalAmount ?? e.total_amount ?? 0);
              return (
                <div key={e.id} className="flex items-center justify-between border border-border rounded-xl p-4 bg-surfaceHighlight/20 hover:bg-surfaceHighlight/40 transition-colors">
                  <div>
                    <div className="font-medium text-textMain">{e.name}</div>
                    <div className="text-xs text-textMuted mt-1">
                      <span className="text-primary font-mono">{toMoney(valor)}</span> • {parcelado ? `${e.months}x` : 'À vista'} • {e.startBillingMonth || e.start_billing_month}
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => setActionExp(e)} className="!p-2 !h-8 !w-8 rounded-full">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                  </Button>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-4">
              <Button variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&larr;</Button>
              <div className="text-xs text-textMuted">Página {page} / {totalPages}</div>
              <Button variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>&rarr;</Button>
            </div>
          </div>}
      </Section>

      {/* Action Modal */}
      <Modal open={!!actionExp} onClose={() => setActionExp(null)} title={actionExp?.name || ''}>
        <div className="flex flex-col gap-3">
          <Button variant="secondary" onClick={onEdit}>Editar Gasto</Button>
          <Button variant="danger" onClick={onDelete}>Excluir (Todos os lançamentos)</Button>
          <Button variant="ghost" onClick={() => setActionExp(null)}>Cancelar</Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Gasto">
        <div className="space-y-4">
          <Field label="Nome"><Input value={editForm.name || ''} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Categoria">
            <Select value={editForm.categoryId || ""} onChange={e => setEditForm((f: any) => ({ ...f, categoryId: e.target.value || null }))}>
              <option value="">Sem categoria</option>
              {state.categories.filter(c => c.type === 'expense').map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Select>
          </Field>
          <Field label="Tipo do Valor">
             <div className="flex gap-4">
                <Checkbox checked={!editForm.isPerInst} onChange={v => setEditForm((f: any) => ({ ...f, isPerInst: !v }))} label="Total" />
                <Checkbox checked={!!editForm.isPerInst} onChange={v => setEditForm((f: any) => ({ ...f, isPerInst: v }))} label="Parcela" />
             </div>
          </Field>
          <Field label="Valor">
            <Input type="number" step="0.01" min="0" value={editForm.amount || ''} onChange={e => setEditForm((f: any) => ({ ...f, amount: e.target.value }))} />
          </Field>
          <div className="text-xs text-textMuted bg-surfaceHighlight p-3 rounded-lg border border-border">
             ⚠️ Alterar o valor afetará <strong>todas</strong> as parcelas deste gasto. O número de meses não pode ser alterado na edição.
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar Alterações</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
