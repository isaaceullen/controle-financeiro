import React, { useState } from 'react';
import { AppState } from '../types';
import { Button, Section, Input, Select } from './ui';

export const Cards: React.FC<{ state: AppState; addCard: (n: string) => void; removeCard: (id: string) => void }> = ({ state, addCard, removeCard }) => {
  const [name, setName] = useState('');
  return (
    <div className="grid gap-6 max-w-4xl mx-auto">
      <Section title="Gerenciar Cartões">
        <div className="flex gap-3 items-end mb-8">
          <div className="flex-1">
             <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cartão (ex: Nubank)" />
          </div>
          <Button onClick={() => { if (!name.trim()) return; addCard(name.trim()); setName(''); }}>
             + Adicionar
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.cards.map(c => (
            <div key={c.id} className="border border-border bg-surfaceHighlight/20 rounded-xl p-4 flex items-center justify-between group hover:border-zinc-600 transition-all">
              <div className="font-medium text-textMain">{c.name}</div>
              <Button variant="danger" onClick={() => removeCard(c.id)} className="!p-2 opacity-50 group-hover:opacity-100">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </Button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export const Categories: React.FC<{ state: AppState; addCategory: (n: string, t: string) => void; removeCategory: (id: string) => void }> = ({ state, addCategory, removeCategory }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  return (
    <div className="grid gap-6 max-w-4xl mx-auto">
      <Section title="Gerenciar Categorias">
        <div className="flex flex-col sm:flex-row gap-3 items-end mb-8">
          <div className="flex-1 w-full">
             <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da categoria" />
          </div>
          <div className="w-full sm:w-40">
             <Select value={type} onChange={e => setType(e.target.value)}>
                <option value="expense">Gasto</option>
                <option value="income">Ganho</option>
             </Select>
          </div>
          <Button onClick={() => { if (!name.trim()) return; addCategory(name.trim(), type); setName(''); }} className="w-full sm:w-auto">
             + Adicionar
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.categories.map(c => (
            <div key={c.id} className="border border-border bg-surfaceHighlight/20 rounded-xl p-4 flex items-center justify-between group hover:border-zinc-600 transition-all">
              <div>
                 <div className="font-medium text-textMain">{c.name}</div>
                 <div className={`text-[10px] uppercase tracking-wider font-bold ${c.type === 'income' ? 'text-emerald-500' : 'text-red-400'}`}>{c.type === 'income' ? 'Receita' : 'Despesa'}</div>
              </div>
              <Button variant="danger" onClick={() => removeCategory(c.id)} className="!p-2 opacity-50 group-hover:opacity-100">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </Button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};
