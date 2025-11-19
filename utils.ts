export const pad = (n: number) => String(n).padStart(2, "0");
export const today = () => new Date();
export const makeDate = (y: number, m: number, d = 1) => new Date(y, m - 1, d);
export const parseYMD = (str: string) => {
  if (!str) return today();
  const p = String(str).split("-");
  return makeDate(+p[0], +(p[1] || 1), +(p[2] || 1));
};
export const fmtDate = (d: Date | string) => {
  const dt = d instanceof Date ? d : parseYMD(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};
export const monthKey = (d: Date | string) => {
  const dt = d instanceof Date ? d : parseYMD(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
};
export const addMonths = (d: Date | string, m: number) => {
  const dt = d instanceof Date ? new Date(d) : parseYMD(d);
  return makeDate(dt.getFullYear(), dt.getMonth() + 1 + m, 1);
};
export const toMoney = (n: any) =>
  isNaN(n)
    ? "R$ 0,00"
    : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const deviceToday = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
  } catch {
    return fmtDate(new Date());
  }
};

export const currentMonthKey = () => deviceToday().slice(0, 7);
export const nextMonthKey = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, '0')}`;
};
export const prevMonthKey = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return `${py}-${String(pm).padStart(2, '0')}`;
};

export function rid() {
  try {
    const a = new Uint32Array(2);
    crypto.getRandomValues(a);
    return a[0].toString(36) + a[1].toString(36);
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
