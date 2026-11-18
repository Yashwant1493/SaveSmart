import { useMemo, useState } from 'react';
import {
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Target,
  Sparkles,
  Wallet,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  type AppSection,
  type BudgetRecord,
  type DateRangePreset,
  type ExpenseRecord,
  type IncomeRecord,
  type SavingsGoalRecord,
} from '../types/finance';
import {
  currentMonthKeyIST,
  formatDisplayDate,
  formatINR,
  startOfMonthIST,
  startOfWeekIST,
  todayIST,
} from '../lib/formatters';

const CHART_COLORS = [
  '#101B35',
  '#10B981',
  '#3B82F6',
  '#F59E0B',
  '#6366F1',
  '#EC4899',
  '#14B8A6',
  '#8B5CF6',
  '#64748B',
];

export function DashboardView({
  expenses,
  income,
  budgets,
  goals,
  hideBalances,
  loading,
  onNavigate,
}: {
  expenses: ExpenseRecord[];
  income: IncomeRecord[];
  budgets: BudgetRecord[];
  goals: SavingsGoalRecord[];
  hideBalances: boolean;
  loading: boolean;
  onNavigate: (section: AppSection) => void;
}) {
  const [preset, setPreset] = useState<DateRangePreset>('month');
  const [customStart, setCustomStart] = useState(startOfMonthIST());
  const [customEnd, setCustomEnd] = useState(todayIST());

  const dateBounds = useMemo(() => {
    const today = todayIST();
    if (preset === 'today') return { start: today, end: today };
    if (preset === 'week') return { start: startOfWeekIST(), end: today };
    if (preset === 'month') return { start: startOfMonthIST(), end: today };
    return {
      start: customStart || '2000-01-01',
      end: customEnd || today,
    };
  }, [preset, customStart, customEnd]);

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => e.date >= dateBounds.start && e.date <= dateBounds.end),
    [expenses, dateBounds]
  );

  const filteredIncome = useMemo(
    () => income.filter((i) => i.date >= dateBounds.start && i.date <= dateBounds.end),
    [income, dateBounds]
  );

  const totalIncome = useMemo(
    () => filteredIncome.reduce((sum, i) => sum + i.amount, 0),
    [filteredIncome]
  );

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const availableBalance = totalIncome - totalExpenses;

  const totalSavingsInGoals = useMemo(
    () => goals.reduce((sum, g) => sum + g.currentAmount, 0),
    [goals]
  );

  const currentMonthKey = currentMonthKeyIST();
  const currentMonthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(currentMonthKey)),
    [expenses, currentMonthKey]
  );
  const currentMonthExpenseTotal = useMemo(
    () => currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [currentMonthExpenses]
  );

  const overallBudget = useMemo(
    () => budgets.find((b) => b.monthKey === currentMonthKey && b.category === 'Overall'),
    [budgets, currentMonthKey]
  );

  const categoryBudgetsSum = useMemo(
    () =>
      budgets
        .filter((b) => b.monthKey === currentMonthKey && b.category !== 'Overall')
        .reduce((sum, b) => sum + b.limitAmount, 0),
    [budgets, currentMonthKey]
  );

  const effectiveMonthlyBudget = overallBudget?.limitAmount || categoryBudgetsSum;
  const budgetUtilPct =
    effectiveMonthlyBudget > 0
      ? Math.round((currentMonthExpenseTotal / effectiveMonthlyBudget) * 100)
      : 0;

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const monthlyTrendData = useMemo(() => {
    const monthMap = new Map<string, { month: string; income: number; expenses: number }>();
    income.forEach((item) => {
      const m = item.date.slice(0, 7);
      const curr = monthMap.get(m) || { month: m, income: 0, expenses: 0 };
      curr.income += item.amount;
      monthMap.set(m, curr);
    });
    expenses.forEach((item) => {
      const m = item.date.slice(0, 7);
      const curr = monthMap.get(m) || { month: m, income: 0, expenses: 0 };
      curr.expenses += item.amount;
      monthMap.set(m, curr);
    });
    return Array.from(monthMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [income, expenses]);

  const recentTransactions = useMemo(() => {
    const combined = [
      ...filteredExpenses.map((e) => ({
        id: `exp-${e.id}`,
        kind: 'expense' as const,
        title: e.description,
        category: e.category,
        amount: e.amount,
        date: e.date,
        meta: e.paymentMethod || 'Expense',
      })),
      ...filteredIncome.map((i) => ({
        id: `inc-${i.id}`,
        kind: 'income' as const,
        title: i.description,
        category: i.category,
        amount: i.amount,
        date: i.date,
        meta: 'Income',
      })),
    ];
    return combined.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [filteredExpenses, filteredIncome]);

  const hasAnyData = expenses.length > 0 || income.length > 0 || goals.length > 0 || budgets.length > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse p-5" />
          ))}
        </div>
        <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Date Range Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#101B35] tracking-tight">
            Financial Overview
          </h1>
          <p className="text-sm text-slate-600">
            Real-time INR summary from {formatDisplayDate(dateBounds.start)} to{' '}
            {formatDisplayDate(dateBounds.end)} (IST)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreset(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  preset === item.id
                    ? 'bg-[#101B35] text-white'
                    : 'text-slate-600 hover:text-[#101B35]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                aria-label="Start date"
                className="text-xs text-[#101B35] focus:outline-none"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                aria-label="End date"
                className="text-xs text-[#101B35] focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate('expenses')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#101B35] text-white text-xs font-semibold hover:bg-[#182746] transition-colors whitespace-nowrap cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#10B981]" />
          Add Expense
        </button>
        <button
          type="button"
          onClick={() => onNavigate('income')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-[#101B35] text-xs font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-[#10B981]" />
          Add Income
        </button>
        <button
          type="button"
          onClick={() => onNavigate('goals')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-[#101B35] text-xs font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Target className="w-3.5 h-3.5 text-[#10B981]" />
          New Savings Goal
        </button>
        <button
          type="button"
          onClick={() => onNavigate('ai')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D1FAE5] text-[#101B35] text-xs font-semibold hover:bg-[#b8f4d6] transition-colors whitespace-nowrap cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#101B35]" />
          Ask SaveSmart AI
        </button>
      </div>

      {/* Empty State Banner for Brand-New Users */}
      {!hasAnyData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#D1FAE5] text-[#101B35] flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-6 h-6" />
          </div>
          <h2 className="font-display text-lg font-bold text-[#101B35] mb-2">
            Your SaveSmart Ledger Is Ready
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6 leading-relaxed">
            No sample or fake transactions are added to your account. Start by logging your first
            income, recording a daily expense, or setting this month&apos;s budget.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('income')}
              className="px-4 py-2.5 rounded-lg bg-[#10B981] text-[#101B35] text-xs font-bold hover:bg-[#0ea572] transition-colors cursor-pointer"
            >
              Log First Income
            </button>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="px-4 py-2.5 rounded-lg bg-[#101B35] text-white text-xs font-semibold hover:bg-[#182746] transition-colors cursor-pointer"
            >
              Log First Expense
            </button>
            <button
              type="button"
              onClick={() => onNavigate('budgets')}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-[#101B35] text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Set Monthly Budget
            </button>
          </div>
        </div>
      )}

      {/* 5-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 mb-2">Total Income</p>
          <p className="font-mono text-2xl font-bold text-[#101B35] tabular-nums">
            {formatINR(totalIncome, hideBalances)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">{filteredIncome.length} entries</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 mb-2">Total Expenses</p>
          <p className="font-mono text-2xl font-bold text-[#101B35] tabular-nums">
            {formatINR(totalExpenses, hideBalances)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">{filteredExpenses.length} entries</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 mb-2">Available Balance</p>
          <p
            className={`font-mono text-2xl font-bold tabular-nums ${
              availableBalance >= 0 ? 'text-[#10B981]' : 'text-red-600'
            }`}
          >
            {formatINR(availableBalance, hideBalances)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">Income minus expenses</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 mb-2">Total Savings</p>
          <p className="font-mono text-2xl font-bold text-[#101B35] tabular-nums">
            {formatINR(totalSavingsInGoals, hideBalances)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">{goals.length} active or completed goals</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 mb-2">Monthly Budget</p>
          <p className="font-mono text-2xl font-bold text-[#101B35] tabular-nums">
            {effectiveMonthlyBudget > 0
              ? formatINR(effectiveMonthlyBudget, hideBalances)
              : 'Not Set'}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            {effectiveMonthlyBudget > 0 ? `${budgetUtilPct}% used this month` : 'Configure in Budgets'}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-base font-bold text-[#101B35]">
                Income vs Expenses Trend
              </h2>
              <p className="text-xs text-slate-500">Monthly cashflow comparison in INR</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="text-xs font-semibold text-[#10B981] hover:underline cursor-pointer"
            >
              Full Analytics
            </button>
          </div>

          {monthlyTrendData.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-sm text-slate-400">
              Add income or expenses to view your monthly trend graph.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip
                    formatter={(val: unknown) => formatINR(Number(val), hideBalances)}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#101B35" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-base font-bold text-[#101B35]">
                Expense Categories
              </h2>
              <p className="text-xs text-slate-500">Selected period breakdown</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="text-xs font-semibold text-[#10B981] hover:underline cursor-pointer"
            >
              Manage
            </button>
          </div>

          {categoryTotals.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-sm text-slate-400">
              No expenses recorded in this date range.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryTotals}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {categoryTotals.map((entry, idx) => (
                        <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: unknown) => formatINR(Number(val), hideBalances)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5">
                {categoryTotals.slice(0, 5).map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-700 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <span className="font-mono font-semibold text-[#101B35] tabular-nums">
                      {formatINR(cat.value, hideBalances)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spending Trajectory + Recent Transactions + Savings Goal Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-bold text-[#101B35]">
              Recent Transactions
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="text-xs font-semibold text-[#10B981] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              No transactions logged in this period yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.kind === 'income'
                          ? 'bg-[#D1FAE5] text-[#101B35]'
                          : 'bg-slate-100 text-[#101B35]'
                      }`}
                    >
                      {tx.kind === 'income' ? (
                        <ArrowDownLeft className="w-4 h-4 text-[#10B981]" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#101B35] truncate">{tx.title}</p>
                      <p className="text-xs text-slate-500">
                        {tx.category} · {formatDisplayDate(tx.date)} · {tx.meta}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-mono text-sm font-semibold tabular-nums shrink-0 ${
                      tx.kind === 'income' ? 'text-[#10B981]' : 'text-[#101B35]'
                    }`}
                  >
                    {tx.kind === 'income' ? '+' : '-'}
                    {formatINR(tx.amount, hideBalances)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold text-[#101B35]">
                Savings Goal Progress
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('goals')}
                className="text-xs font-semibold text-[#10B981] hover:underline cursor-pointer"
              >
                Manage Goals
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-400 mb-3">
                  No savings goals yet. Create one for an Emergency Fund, Laptop, or College Fees.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('goals')}
                  className="px-3.5 py-2 rounded-lg bg-[#101B35] text-white text-xs font-semibold cursor-pointer"
                >
                  Create First Goal
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.slice(0, 4).map((goal) => {
                  const pct = Math.min(
                    100,
                    Math.round((goal.currentAmount / goal.targetAmount) * 100)
                  );
                  return (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-[#101B35]">{goal.name}</span>
                        <span className="font-mono text-slate-600 tabular-nums">
                          {formatINR(goal.currentAmount, hideBalances)} /{' '}
                          {formatINR(goal.targetAmount, hideBalances)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full ${
                            goal.status === 'completed' ? 'bg-[#10B981]' : 'bg-[#101B35]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {monthlyTrendData.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2">Monthly Spending Curve</p>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendData}>
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#10B981"
                      fill="#D1FAE5"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
