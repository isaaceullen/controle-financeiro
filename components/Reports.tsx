
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { AppState } from '../types';
import { Section, Select } from './ui';
import { parseYMD, monthKey, addMonths } from '../utils';

export const Reports: React.FC<{ state: AppState; selectedMonth: string }> = ({ state, selectedMonth }) => {
  const [mode, setMode] = useState('payment');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  const byPayment = useMemo(() => {
    const m = new Map();
    for (const i of state.installments.filter(x => (x.dueMonth || x.due_month) === selectedMonth)) {
      const k = (i.paymentType || i.payment_type) === 'card' ? (state.cards.find(c => c.id === (i.cardId || i.card_id))?.name || 'Cartão') : 'Dinheiro';
      m.set(k, (m.get(k) || 0) + Number(i.amount || 0));
    }
    return m;
  }, [state.installments, selectedMonth, state.cards]);

  const byCategory = useMemo(() => {
    const m = new Map();
    for (const i of state.installments.filter(x => (x.dueMonth || x.due_month) === selectedMonth)) {
      const k = state.categories.find(c => c.id === (i.categoryId || i.category_id))?.name || 'Sem categoria';
      m.set(k, (m.get(k) || 0) + Number(i.amount || 0));
    }
    return m;
  }, [state.installments, selectedMonth, state.categories]);

  const trend = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, k) => {
      const base = parseYMD(selectedMonth + '-01');
      return monthKey(addMonths(base, -(11 - k)));
    });
    const sums = months.map(m => state.installments.filter(i => (i.dueMonth || i.due_month) === m).reduce((s, i) => s + Number(i.amount || 0), 0));
    return { months, sums };
  }, [state.installments, selectedMonth]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    if (typeof window.Chart === 'undefined') return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    
    let cfg: any = {};
    const colors = ['#fbbf24', '#3b82f6', '#10b981', '#ef4444', '#a855f7', '#ec4899', '#f97316', '#6366f1'];
    
    if (mode === 'month') {
      cfg = {
        type: 'line',
        data: {
          labels: trend.months,
          datasets: [{
            label: 'Gastos',
            data: trend.sums,
            fill: true,
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            borderColor: '#fbbf24',
            tension: 0.3,
            pointBackgroundColor: '#18181b',
            pointBorderColor: '#fbbf24',
            pointBorderWidth: 2
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      };
    } else {
      const labels = Array.from((mode === 'payment' ? byPayment : byCategory).keys());
      const values = Array.from((mode === 'payment' ? byPayment : byCategory).values());
      cfg = {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderColor: '#18181b',
            borderWidth: 4
          }]
        },
        options: {
          plugins: {
            legend: { position: 'right', labels: { color: '#a1a1aa', font: { family: 'Inter', size: 12 }, boxWidth: 12 } }
          },
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%'
        }
      };
    }
    
    // @ts-ignore
    chartRef.current = new window.Chart(ctx, cfg);
    
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [mode, byPayment, byCategory, trend]);

  return (
    <Section title="Relatórios" right={
        <Select value={mode} onChange={e => setMode(e.target.value)} className="!w-auto text-xs py-1.5">
            <option value="payment">Por Pagamento</option>
            <option value="category">Por Categoria</option>
            <option value="month">Tendência (12 meses)</option>
        </Select>
    }>
      <div className="h-64 w-full flex items-center justify-center">
        <canvas ref={canvasRef}></canvas>
      </div>
    </Section>
  );
};
