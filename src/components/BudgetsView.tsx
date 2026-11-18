import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Trash2, X, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  BUDGET_CATEGORIES,
  type BudgetCategory,
  type BudgetRecord,
  type ExpenseRecord,
} from '../types/finance';
import { currentMonthKeyIST, formatINR, formatMonthLabel } from '../lib/formatters';
import { removeBudget, upsertBudget } from '../services/firestoreService';
import { ConfirmDialog } from './ConfirmDialog';

export function BudgetsView({
  uid,
  budgets,
  expenses,
  hideBalances,
}: {
  uid: string;
  budgets: BudgetRecord[];
  expenses: ExpenseRecord[];
  hideBalances: boolean;
}) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKeyIST());
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRecord | null>(null);
  const [category, setCategory] = useState<BudgetCategory>('Overall');
  const [limitAmount, setLimitAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<BudgetRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const monthBudgets = useMemo(
    () => budgets.filter((b) => b.monthKey === selectedMonth),
    [budgets, selectedMonth]
  );

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(selectedMonth)),
    [expenses, selectedMonth]
  );

  const budgetRows = useMemo(() => {
    const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    return monthBudgets
      .map((b) => {
        const spent =
          b.category === 'Overall'
            ? totalSpent
            : monthExpenses
                .filter((e) => e.category === b.category)
                .reduce((sum, e) => sum + e.amount, 0);
        const remaining = b.limitAmount - spent;
        const pct = Math.round((spent / b.limitAmount) * 100);
        return {
          ...b,
          spent,
          remaining,
          pct,
          alertState: pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'healthy',
        };
      })
      .sort((a, b) => (a.category === 'Overall' ? -1 : b.category === 'Overall' ? 1 : b.pct - a.pct));
  }, [monthBudgets, monthExpenses]);

  const activeAlerts = useMemo(
    () => budgetRows.filter((r) => r.alertState !== 'healthy'),
    [budgetRows]
  );

  function openNewModal() {
    setEditingBudget(null);
    setCategory('Overall');
    setLimitAmount('');
    setFormOpen(true);
    setStatusMsg(null);
  }

  function openEditModal(b: BudgetRecord) {
    setEditingBudget(b);
    setCategory(b.category);
    setLimitAmount(String(b.limitAmount));
    setFormOpen(true);
    setStatusMsg(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const numericLimit = Number(limitAmount);
    if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid monthly limit in INR.' });
      return;
    }

    const existingSameCategory = monthBudgets.find(
      (b) => b.category === category && b.id !== editingBudget?.id
    );

    setSubmitting(true);
    setStatusMsg(null);
    try {
      await upsertBudget(uid, {
        existingId: editingBudget?.id || existingSameCategory?.id,
        monthKey: selectedMonth,
        category,
        limitAmount: numericLimit,
      });
      setStatusMsg({
        type: 'success',
        text: `${category} budget saved for ${formatMonthLabel(selectedMonth)}.`,
      });
      setFormOpen(false);
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save budget.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeBudget(uid, deleteTarget.id);
      setDeleteTarget(null);
      setStatusMsg({ type: 'success', text: 'Budget removed.' });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to delete budget.',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#101B35] tracking-tight">
            Monthly Budget Management
          </h1>
          <p className="text-sm text-slate-600">
            Set overall and category spending limits with 80% and 100% alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Select month"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-[#101B35] focus:outline-none focus:border-[#101B35]"
          />
          <button
            type="button"
            onClick={openNewModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#101B35] text-white text-sm font-semibold hover:bg-[#182746] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#10B981]" />
            Set Budget
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-[#D1FAE5] border-[#10B981]/30 text-[#101B35]'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Active 80% / 100% Alert Banners */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2.5">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                alert.alertState === 'exceeded'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">
                  {alert.alertState === 'exceeded'
                    ? `${alert.category} budget reached ${alert.pct}% (100% threshold exceeded)`
                    : `${alert.category} budget at ${alert.pct}% (80% warning threshold)`}
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  Spent {formatINR(alert.spent, hideBalances)} out of{' '}
                  {formatINR(alert.limitAmount, hideBalances)} limit for{' '}
                  {formatMonthLabel(selectedMonth)}.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {budgetRows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <h2 className="font-display text-lg font-bold text-[#101B35] mb-2">
            No budgets set for {formatMonthLabel(selectedMonth)}
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            Add an Overall monthly limit or category caps like Food and Transport to track
            utilisation and receive alerts at 80% and 100%.
          </p>
          <button
            type="button"
            onClick={openNewModal}
            className="px-5 py-2.5 rounded-lg bg-[#10B981] text-[#101B35] text-sm font-bold cursor-pointer"
          >
            Create Monthly Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {budgetRows.map((row) => (
              <div key={row.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-display text-base font-bold text-[#101B35]">
                      {row.category} Budget
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {row.alertState === 'exceeded'
                        ? 'Limit Reached (100%+)'
                        : row.alertState === 'warning'
                        ? 'Approaching Limit (80%+)'
                        : 'Within Budget'}
                      {' · '}
                      {row.remaining >= 0
                        ? `${formatINR(row.remaining, hideBalances)} remaining`
                        : `${formatINR(Math.abs(row.remaining), hideBalances)} over budget`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(row)}
                      className="text-xs font-semibold text-[#101B35] hover:text-[#10B981] px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(row)}
                      aria-label={`Delete ${row.category} budget`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-mono text-sm font-semibold text-[#101B35] tabular-nums">
                    {formatINR(row.spent, hideBalances)} spent of{' '}
                    {formatINR(row.limitAmount, hideBalances)}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-600 tabular-nums">
                    {row.pct}%
                  </span>
                </div>

                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      row.alertState === 'exceeded'
                        ? 'bg-red-500'
                        : row.alertState === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-[#10B981]'
                    }`}
                    style={{ width: `${Math.min(100, row.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 self-start">
            <h2 className="font-display text-base font-bold text-[#101B35] mb-1">
              Budget vs Actual Spending
            </h2>
            <p className="text-xs text-slate-500 mb-5">{formatMonthLabel(selectedMonth)}</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetRows} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={84}
                    tick={{ fontSize: 11, fill: '#101B35' }}
                  />
                  <Tooltip formatter={(val: unknown) => formatINR(Number(val), hideBalances)} />
                  <Bar dataKey="limitAmount" name="Budget Limit" fill="#CBD5E1" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="spent" name="Actual Spent" fill="#101B35" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#101B35]/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-bold text-[#101B35]">
                {editingBudget ? 'Edit Monthly Budget' : 'Set Monthly Budget'}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#101B35]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
                <input
                  type="month"
                  required
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BudgetCategory)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#101B35]"
                >
                  {BUDGET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Spending Limit (INR ₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  placeholder="e.g. 8000"
                  className="w-full px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-[#101B35] text-white text-sm font-semibold hover:bg-[#182746] disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Budget"
        message={
          deleteTarget
            ? `Remove the ${deleteTarget.category} budget for ${formatMonthLabel(deleteTarget.monthKey)}?`
            : ''
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
