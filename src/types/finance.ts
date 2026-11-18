export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Education',
  'Entertainment',
  'Bills',
  'Health',
  'Travel',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_METHODS = [
  'UPI',
  'Cash',
  'Debit Card',
  'Credit Card',
  'NetBanking',
  'Wallet',
  '',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const INCOME_CATEGORIES = [
  'Salary',
  'Pocket Money',
  'Freelance Income',
  'Business Income',
  'Allowance',
  'Other Income',
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export const BUDGET_CATEGORIES = ['Overall', ...EXPENSE_CATEGORIES] as const;
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export const USER_PERSONAS = [
  { value: 'student', label: 'College Student (18–25)' },
  { value: 'young_professional', label: 'Young Professional' },
  { value: 'first_time_earner', label: 'First-Time Earner' },
  { value: 'gig_worker', label: 'Gig / Delivery Partner' },
  { value: 'other', label: 'Independent Saver' },
] as const;

export type UserPersona = (typeof USER_PERSONAS)[number]['value'];

export const FIELD_LIMITS = {
  DISPLAY_NAME_MAX: 100,
  EMAIL_MAX: 200,
  CITY_MAX: 80,
  PHOTO_URL_MAX: 500,
  DESCRIPTION_MAX: 200,
  GOAL_NAME_MAX: 100,
  GOAL_CATEGORY_MAX: 60,
  AMOUNT_MAX: 100000000,
  DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$/,
  MONTH_PATTERN: /^\d{4}-\d{2}$/,
} as const;

export interface UserAccountDoc {
  uid: string;
  displayName: string;
  role: 'user';
  plan: 'free' | 'premium';
  currency: 'INR';
  timezone: string;
  expenseCount: number;
  incomeCount: number;
  goalCount: number;
  budgetCount: number;
  aiQueryCount: number;
  lastActiveAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface UserPrivateProfileDoc {
  uid: string;
  fullName: string;
  email: string;
  photoURL?: string;
  city?: string;
  persona?: UserPersona;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface ExpenseRecord {
  id: string;
  uid: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string;
  paymentMethod?: PaymentMethod;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface IncomeRecord {
  id: string;
  uid: string;
  amount: number;
  category: IncomeCategory;
  description: string;
  date: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BudgetRecord {
  id: string;
  uid: string;
  monthKey: string;
  category: BudgetCategory;
  limitAmount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SavingsGoalRecord {
  id: string;
  uid: string;
  name: string;
  category?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  status: 'active' | 'completed';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type NotificationType =
  | 'budget_warning'
  | 'budget_exceeded'
  | 'goal_progress'
  | 'savings_reminder'
  | 'monthly_summary'
  | 'account_update';

export interface NotificationRecord {
  id: string;
  uid: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserPreferencesDoc {
  id: string;
  uid: string;
  budgetAlerts80: boolean;
  budgetAlerts100: boolean;
  savingsReminders: boolean;
  goalMilestones: boolean;
  monthlyDigest: boolean;
  pushEnabled: boolean;
  hideBalances: boolean;
  aiContextSharing: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type DateRangePreset = 'today' | 'week' | 'month' | 'custom';

export type AppSection =
  | 'dashboard'
  | 'expenses'
  | 'income'
  | 'budgets'
  | 'goals'
  | 'analytics'
  | 'ai'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'android'
  | 'admin';
