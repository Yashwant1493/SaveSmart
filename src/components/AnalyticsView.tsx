import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import type {
  BudgetRecord,
  ExpenseRecord,
  IncomeRecord,
  SavingsGoalRecord,
} from '../types/finance';
import {
  currentMonthKeyIST,
  formatINR,
  startOfMonthIST,
  todayIST,
} from '../lib/formatters';

const PALETTE = [
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

export function AnalyticsView({
  expenses,
  income,
  budgets,
  goals,
  hideBalances,
}: {
  expenses: ExpenseRecord[];
  income: IncomeRecord[];
  budgets: BudgetRecord[];
  goals: SavingsGoalRecord[];
  hideBalances: boolean;
}) {
  const [range, setRange] = useState<'7d' | '30d' | '6m' | 'all'>('30d');
  const today = todayIST();

  const startDate = useMemo(() => {
    if (range === 'all') return '2000-01-01';
    const [y, m, d] = today.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (range === '7d') dt.setUTCDate(dt.getUTCDate() - 6);
    if (range === '30d') dt.setUTCDate(dt.getUTCDate() - 29);
    if (range === '6m') dt.setUTCMonth(dt.getUTCMonth() - 5);
    return dt.toISOString().slice(0, 10);
  }, [range, today]);

  const scopedExpenses = useMemo(
    () => expenses.filter((e) => e.date >= startDate && e.date <= today),
    [expenses, startDate, today]
  );

  const scopedIncome = useMemo(
    () => income.filter((i) => i.date >= startDate && i.date <= today),
    [income, startDate, today]
  );

  // Daily spending series
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    scopedExpenses.forEach((e) => {
      map.set(e.date, (map.get(e.date) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([date, amount]) => ({ date: date.slice(5), fullDate: date, amount }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [scopedExpenses]);

  // Weekly spending series (ISO week start)
  const weeklyData = useMemo(() => {
    const map = new Map<string, number>();
    scopedExpenses.forEach((e) => {
      const [y, m, d] = e.date.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      const day = dt.getUTCDay();
      const diff = day === 0 ? 6 : day - 1;
      dt.setUTCDate(dt.getUTCDate() - diff);
      const weekKey = dt.toISOString().slice(0, 10);
      map.set(weekKey, (map.get(weekKey) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([week, amount]) => ({ week: `Wk ${week.slice(5)}`, raw: week, amount }))
      .sort((a, b) => a.raw.localeCompare(b.raw));
  }, [scopedExpenses]);

  // Monthly Income vs Expenses & Net Savings trend
  const monthlyCashflow = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expenses: number; savings: number }>();
    scopedIncome.forEach((i) => {
      const m = i.date.slice(0, 7);
      const entry = map.get(m) || { month: m, income: 0, expenses: 0, savings: 0 };
      entry.income += i.amount;
      entry.savings = entry.income - entry.expenses;
      map.set(m, entry);
    });
    scopedExpenses.forEach((e) => {
      const m = e.date.slice(0, 7);
      const entry = map.get(m) || { month: m, income: 0, expenses: 0, savings: 0 };
      entry.expenses += e.amount;
      entry.savings = entry.income - entry.expenses;
      map.set(m, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [scopedIncome, scopedExpenses]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    scopedExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [scopedExpenses]);

  // Current month budget utilisation
  const currentMonth = currentMonthKeyIST();
  const budgetUtilisation = useMemo(() => {
    const monthExp = expenses.filter((e) => e.date >= startOfMonthIST());
    const totalSpent = monthExp.reduce((sum, e) => sum + e.amount, 0);
    return budgets
      .filter((b) => b.monthKey === currentMonth)
      .map((b) => {
        const spent =
          b.category === 'Overall'
            ? totalSpent
            : monthExp.filter((e) => e.category === b.category).reduce((s, e) => s + e.amount, 0);
        return {
          category: b.category,
          limit: b.limitAmount,
          spent,
          pct: Math.round((spent / b.limitAmount) * 100),
        };
      });
  }, [budgets, expenses, currentMonth]);

  const totalGoalsSaved = useMemo(
    () => goals.reduce((s, g) => s + g.currentAmount, 0),
    [goals]
  );

  const hasData = expenses.length > 0 || income.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#101B35] tracking-tight">
            Spending Analytics
          </h1>
          <p className="text-sm text-slate-600">
            Daily, weekly, monthly, and category-level insights in Indian Rupees (INR ₹).
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg self-start">
          {(
            [
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '6m', label: '6 Months' },
              { id: 'all', label: 'All Time' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRange(item.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                range === item.id
                  ? 'bg-[#101B35] text-white'
                  : 'text-slate-600 hover:text-[#101B35]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <BarChart3 className="w-8 h-8 text-[#10B981] mx-auto mb-3" />
          <h2 className="font-display text-lg font-bold text-[#101B35] mb-1">
            No Analytics Data Yet
          </h2>
          <p className="text-sm text-slate-500">
            Charts populate automatically as soon as you record your first expense or income entry.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Daily Spending */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-display text-base font-bold text-[#101B35] mb-1">
              Daily Spending
            </h2>
            <p className="text-xs text-slate-500 mb-4">Day-by-day INR outflows</p>
            <div className="h-64">
              {dailyData.length === 0 ? (
                <p className="text-sm text-slate-400 text-center pt-24">No expenses in this window.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip formatter={(val: unknown) => formatINR(Number(val), hideBalances)} />
                    <Bar dataKey="amount" name="Spent" fill="#101B35" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Weekly Spending */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-display text-base font-bold text-[#101B35] mb-1">
              Weekly Spending
            </h2>
            <p className="text-xs text-slate-500 mb-4">Week-over-week expenditure</p>
            <div className="h-64">
              {weeklyData.length === 0 ? (
                <p className="text-sm text-slate-400 text-center pt-24">No weekly expenses yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip formatter={(val: unknown) => formatINR(Number(val), hideBalances)} />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name="Weekly Spend"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#101B35' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Monthly Income vs Expenses + Savings Trend */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-display text-base font-bold text-[#101B35] mb-1">
              Monthly Spending, Income &amp; Net Savings Trend
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Total allocated to Savings Goals: {formatINR(totalGoalsSaved, hideBalances)}
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyCashflow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip formatter={(val: unknown) => formatINR(Number(val), hideBalances)} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#101B35" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="savings" name="Net Retained" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category-Wise Expenses */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-display text-base font-bold text-[#101B35] mb-1">
              Category-Wise Expenses
            </h2>
            <p className="text-xs text-slate-500 mb-4">Distribution across spending categories</p>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-slate-400 text-center pt-24">No category data yet.</p>
            ) : (
              <div className="space-y-4">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={75}
                      >
                        {categoryBreakdown.map((item, idx) => (
                          <Cell key={item.name} fill={PALETTE[idx % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: unknown) => formatINR(Number(val), hideBalances)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {categoryBreakdown.map((cat, idx) => (
                    <div key={cat.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-slate-700">
                        <span
                          className="w-2.5 h-2.5 rounded-xs"
                          style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                        />
                        {cat.name}
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

          {/* Budget Utilisation */}
          <div className="lg:col-span-12 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-display text-base font-bold text-[#101B35] mb-1">
              Current Month Budget Utilisation ({currentMonth})
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Live ratio of actual spending against active monthly budgets
            </p>
            {budgetUtilisation.length === 0 ? (
              <p className="text-sm text-slate-400">
                No active budgets configured for {currentMonth}.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {budgetUtilisation.map((b) => (
                  <div key={b.category} className="p-4 rounded-lg border border-slate-200 bg-[#F5F7FA]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[#101B35]">{b.category}</span>
                      <span className="font-mono font-bold tabular-nums">{b.pct}%</span>
                    </div>
                    <p className="font-mono text-xs text-slate-600 tabular-nums mb-2">
                      {formatINR(b.spent, hideBalances)} / {formatINR(b.limit, hideBalances)}
                    </p>
                    <div className="h-2 rounded-full bg-white overflow-hidden">
                      <div
                        className={`h-full ${
                          b.pct >= 100
                            ? 'bg-red-500'
                            : b.pct >= 80
                            ? 'bg-amber-500'
                            : 'bg-[#10B981]'
                        }`}
                        style={{ width: `${Math.min(100, b.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
