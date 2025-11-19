import React, { useState, useEffect, useRef } from 'react';
import { AppState, Income } from '../types';
import { Button, Section, Input, Select, Field } from './ui';
import { toMoney, fmtDate, today } from '../utils';

interface IncomesProps {
  state: AppState;
  addIncome: (i: any) => Promise<void>;
  updateIncome: (i: any) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
}

export const Incomes: React.FC<IncomesProps> = ({ state, addIncome, updateIncome, deleteIncome }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const o = Object.fromEntries(fd.entries());
    addIncome({ name: o.name, amount: Number(o.amount || 0), months: Number(o.months || 1), startDate: o.startDate || fmtDate(today()), categoryId: o.categoryId || null });
    formRef.current?.reset();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Section title="Adicionar Ganho">
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
          <Field label="Descrição"><Input name="name" placeholder="Ex.: Salário, Freelance..." required /></Field>
          <div className="grid grid-cols-2 gap-4">
             <Field label="Valor"><Input name="amount" type="number" step="0.01" min="0" placeholder="0.00" required /></Field>
             <Field label="Duração (meses)"><Input name="months" type="number" min="1" defaultValue="1" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Início"><Input name="startDate" type="date" defaultValue={fmtDate(today())} /></Field>
            <Field label="Categoria">
                <Select name="categoryId">
                    <option value="">— Selecione —</option>
                    {state.categories.filter(c => c.type === 'income').map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </Select>
            </Field>
          </div>
          <div className="pt-2">
             <Button type="submit" className="w-full">Adicionar Receita</Button>
          </div>
        </form>
      </Section>

      <Section title="Lista de Ganhos">
        {state.incomes.length === 0 ? <div className="text-textMuted text-center py-10">Nenhum ganho cadastrado.</div> :
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {state.incomes.map(g => (<IncomeRow key={g.id} g={g} categories={state.categories} onSave={updateIncome} onDelete={deleteIncome} />))}
          </div>}
      </Section>
    </div>
  );
};

const IncomeRow: React.FC<{ g: Income; categories: any[]; onSave: any; onDelete: any }> = ({ g, categories, onSave, onDelete }) => {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(g);
  useEffect(() => setForm(g), [g.id]);

  if (!edit) {
    return (
      <div className="flex items-center justify-between border border-border bg-surfaceHighlight/20 p-4 rounded-xl hover:bg-surfaceHighlight/40 transition-colors">
        <div>
          <div className="font-medium text-textMain">{g.name}</div>
          <div className="text-xs text-textMuted mt-1">
            <span className="text-emerald-400 font-mono font-medium">{toMoney(g.amount)}</span> • {g.months} meses • Início {fmtDate(g.start_date || g.startDate || '')}
          </div>
          <div className="text-xs text-textMuted mt-0.5 uppercase tracking-wider text-[10px] opacity-70">
             {categories.find(c => c.id === (g.categoryId || g.category_id))?.name || 'Sem categoria'}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEdit(true)} className="!p-2">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </Button>
          <Button variant="danger" onClick={() => onDelete(g.id)} className="!p-2">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="border border-primary/30 bg-surfaceHighlight/50 p-4 rounded-xl space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" />
        <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
        <Input type="number" min="1" value={form.months} onChange={(e) => setForm({ ...form, months: Number(e.target.value) })} />
        <Input type="date" value={fmtDate(form.start_date || form.startDate || '')} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <div className="sm:col-span-2">
            <Select value={form.categoryId || form.category_id || ""} onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })}>
                <option value="">Sem categoria</option>
                {categories.filter(c => c.type === 'income').map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Select>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={() => setEdit(false)}>Cancelar</Button>
        <Button onClick={() => { onSave(form); setEdit(false); }}>Salvar</Button>
      </div>
    </div>
  );
};