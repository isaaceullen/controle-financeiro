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
  startDate?: string;
  start_date?: string;
  categoryId?: string | null;
  category_id?: string | null;
  user_id?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  name: string;
  totalAmount?: number;
  total_amount?: number;
  perInstallment?: number;
  per_installment?: number;
  isPerInstallmentValue?: boolean;
  is_per_installment_value?: boolean;
  categoryId?: string | null;
  category_id?: string | null;
  purchaseDate?: string;
  purchase_date?: string;
  paymentType?: string;
  payment_type?: string;
  cardId?: string | null;
  card_id?: string | null;
  startBillingMonth?: string;
  start_billing_month?: string;
  type?: string;
  months?: number;
  user_id?: string;
  created_at?: string;
}

export interface Installment {
  id: string;
  expenseId?: string;
  expense_id?: string;
  n: number;
  total: number;
  amount: number;
  dueMonth?: string;
  due_month?: string;
  paid: boolean;
  paymentType?: string;
  payment_type?: string;
  cardId?: string | null;
  card_id?: string | null;
  name: string;
  categoryId?: string | null;
  category_id?: string | null;
  createdAt?: string;
  created_at?: string;
  user_id?: string;
}

export interface AppState {
  cards: Card[];
  categories: Category[];
  incomes: Income[];
  expenses: Expense[];
  installments: Installment[];
}

export interface FilterState {
  pay: { cash: boolean; card: boolean };
  cards: string[];
  compra: { avista: boolean; aprazo: boolean };
  categories: string[];
  min: string;
  max: string;
}