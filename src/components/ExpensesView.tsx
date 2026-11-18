import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type BudgetRecord,
  type ExpenseCategory,
  type ExpenseRecord,
  type PaymentMethod,
  type UserPreferencesDoc,
} from '../types/finance';
import { formatDisplayDate, formatINR, todayIST } from '../lib/formatters';
import {
  addExpense,
  checkAndNotifyBudgetThresholds,
  removeExpense,
  updateExpense,
} from '../services/firestoreService';
import { ConfirmDialog } from './ConfirmDialog';

export function ExpensesView({
  uid,
  expenses,
  budgets,
  prefs,
  hideBalances,
}: {
  uid: string;
  expenses: ExpenseRecord[];
  budgets: BudgetRecord[];
  prefs: UserPreferencesDoc | null;
  hideBalances: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayIST());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return expenses.filter((item) => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;
      if (
        q &&
        !item.description.toLowerCase().includes(q) &&
        !item.category.toLowerCase().includes(q) &&
        !(item.paymentMethod || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [expenses, categoryFilter, startDate, endDate, searchTerm]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const totalFiltered = useMemo(
    () => filtered.reduce((sum, item) => sum + item.amount, 0),
    [filtered]
  );

  function openNewForm() {
    setEditing(null);
    setAmount('');
    setCategory('Food');
    setDescription('');
    setDate(todayIST());
    setPaymentMethod('UPI');
    setFormOpen(true);
    setStatusMsg(null);
  }

  function openEditForm(exp: ExpenseRecord) {
    setEditing(exp);
    setAmount(String(exp.amount));
    setCategory(exp.category);
    setDescription(exp.description);
    setDate(exp.date);
    setPaymentMethod(exp.paymentMethod || '');
    setFormOpen(true);
    setStatusMsg(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setStatusMsg({ type: 'error', text: 'Enter a valid expense amount greater than ₹0.' });
      return;
    }
    if (!description.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter a short description.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setStatusMsg({ type: 'error', text: 'Please choose a valid date.' });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);
    try {
      if (editing) {
        await updateExpense(uid, editing.id, {
          amount: numericAmount,
          category,
          description,
          date,
          paymentMethod,
        });
        const simulatedUpdated = expenses.map((ex) =>
          ex.id === editing.id ? { ...ex, amount: numericAmount, category, date } : ex
        );
        await checkAndNotifyBudgetThresholds(uid, date, category, simulatedUpdated, budgets, prefs);
        setStatusMsg({ type: 'success', text: 'Expense updated.' });
      } else {
        const newId = await addExpense(uid, {
          amount: numericAmount,
          category,
          description,
          date,
          paymentMethod,
        });
        const simulatedAdded: ExpenseRecord[] = [
          {
            id: newId,
            uid,
            amount: numericAmount,
            category,
            description,
            date,
            paymentMethod,
          },
          ...expenses,
        ];
        await checkAndNotifyBudgetThresholds(uid, date, category, simulatedAdded, budgets, prefs);
        setStatusMsg({ type: 'success', text: 'Expense recorded in INR.' });
      }
      setFormOpen(false);
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not save expense.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeExpense(uid, deleteTarget.id);
      setDeleteTarget(null);
      setStatusMsg({ type: 'success', text: 'Expense deleted.' });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete expense.',
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
            Expense Tracker
          </h1>
          <p className="text-sm text-slate-600">
            Track daily INR spending across categories with optional payment labels.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#101B35] text-white text-sm font-semibold hover:bg-[#182746] transition-colors whitespace-nowrap self-start cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#10B981]" />
          Add Expense
        </button>
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

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search description or UPI..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#101B35]"
        >
          <option value="All">All Categories</option>
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          aria-label="From date"
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
        />

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="To date"
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
          />
          {(searchTerm || categoryFilter !== 'All' || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('All');
                setStartDate('');
                setEndDate('');
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Category Totals Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#101B35]">
              Transaction History ({filtered.length})
            </h2>
            <span className="font-mono text-sm font-bold text-[#101B35] tabular-nums">
              Total: {formatINR(totalFiltered, hideBalances)}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-500 mb-4">
                No expenses match your current filters yet.
              </p>
              <button
                type="button"
                onClick={openNewForm}
                className="px-4 py-2 rounded-lg bg-[#10B981] text-[#101B35] text-xs font-bold cursor-pointer"
              >
                Log First Expense
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#101B35] truncate">
                      {item.description}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.category} · {formatDisplayDate(item.date)}
                      {item.paymentMethod ? ` · ${item.paymentMethod}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-mono text-sm font-bold text-[#101B35] tabular-nums">
                      {formatINR(item.amount, hideBalances)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditForm(item)}
                        aria-label={`Edit ${item.description}`}
                        className="p-2 rounded-lg text-slate-500 hover:text-[#101B35] hover:bg-slate-100 cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        aria-label={`Delete ${item.description}`}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 self-start">
          <h2 className="font-display text-base font-bold text-[#101B35] mb-4">Category Totals</h2>
          {categoryTotals.length === 0 ? (
            <p className="text-xs text-slate-400">Totals appear once expenses are added.</p>
          ) : (
            <div className="space-y-3">
              {categoryTotals.map(([cat, sum]) => {
                const pct = totalFiltered > 0 ? Math.round((sum / totalFiltered) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-[#182230]">{cat}</span>
                      <span className="font-mono font-semibold text-[#101B35] tabular-nums">
                        {formatINR(sum, hideBalances)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-[#10B981]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#101B35]/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-bold text-[#101B35]">
                {editing ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#101B35]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Amount (INR ₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#101B35]"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Metro card recharge or lunch"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Method (Optional Label)
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#101B35]"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm || 'none'} value={pm}>
                      {pm || 'Not specified'}
                    </option>
                  ))}
                </select>
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
                  {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Expense"
        message={
          deleteTarget
            ? `Remove "${deleteTarget.description}" (${formatINR(deleteTarget.amount, hideBalances)}) from your ledger?`
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
