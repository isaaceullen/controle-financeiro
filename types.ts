export interface Card {
  id: string;
  name: string;
  user_id?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  user_id?: string;
  created_at?: string;
}

export interface Income {
  id: string;
  name: string;
  amount: number;
  months: number;
  start_date?: string; // Supabase column
  startDate?: string; // Local state fallback
  category_id?: string | null;
  categoryId?: string | null;
  user_id?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  name: string;
  total_amount?: number;
  totalAmount?: number;
  per_installment?: number;
  perInstallment?: number;
  is_per_installment_value?: boolean;
  isPerInstallmentValue?: boolean;
  category_id?: string | null;
  categoryId?: string | null;
  purchase_date?: string;
  purchaseDate?: string;
  payment_type?: string;
  paymentType?: string;
  card_id?: string | null;
  cardId?: string | null;
  start_billing_month?: string;
  startBillingMonth?: string;
  type?: string; // 'single' | 'parcelado'
  months?: number;
  user_id?: string;
  created_at?: string;
}

export interface Installment {
  id: string;
  expense_id?: string;
  expenseId?: string;
  n: number;
  total: number;
  amount: number;
  due_month?: string;
  dueMonth?: string;
  paid: boolean;
  payment_type?: string;
  paymentType?: string;
  card_id?: string | null;
  cardId?: string | null;
  name?: string;
  category_id?: string | null;
  categoryId?: string | null;
  user_id?: string;
  created_at?: string;
  createdAt?: string;
}

export interface AppState {
  cards: Card[];
  categories: Category[];
  incomes: Income[];
  expenses: Expense[];
  installments: Installment[];
}

declare global {
  interface Window {
    supabase: any;
    createSupabaseClient: any;
    __setSupabaseClient: (url: string, anon: string) => void;
    Chart: any;
  }
}
