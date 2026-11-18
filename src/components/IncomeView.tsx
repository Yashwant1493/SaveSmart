import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  INCOME_CATEGORIES,
  type IncomeCategory,
  type IncomeRecord,
} from '../types/finance';
import { formatDisplayDate, formatINR, todayIST } from '../lib/formatters';
import { addIncome, removeIncome, updateIncome } from '../services/firestoreService';
import { ConfirmDialog } from './ConfirmDialog';

export function IncomeView({
  uid,
  income,
  hideBalances,
}: {
  uid: string;
  income: IncomeRecord[];
  hideBalances: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeRecord | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<IncomeCategory>('Salary');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayIST());

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<IncomeRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return income.filter((item) => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (
        q &&
        !item.description.toLowerCase().includes(q) &&
        !item.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [income, categoryFilter, searchTerm]);

  const totalIncome = useMemo(
    () => filtered.reduce((sum, item) => sum + item.amount, 0),
    [filtered]
  );

  function openNewForm() {
    setEditing(null);
    setAmount('');
    setCategory('Salary');
    setDescription('');
    setDate(todayIST());
    setFormOpen(true);
    setStatusMsg(null);
  }

  function openEditForm(item: IncomeRecord) {
    setEditing(item);
    setAmount(String(item.amount));
    setCategory(item.category);
    setDescription(item.description);
    setDate(item.date);
    setFormOpen(true);
    setStatusMsg(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setStatusMsg({ type: 'error', text: 'Enter a valid income amount greater than ₹0.' });
      return;
    }
    if (!description.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter a short source description.' });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);
    try {
      if (editing) {
        await updateIncome(uid, editing.id, {
          amount: numericAmount,
          category,
          description,
          date,
        });
        setStatusMsg({ type: 'success', text: 'Income entry updated.' });
      } else {
        await addIncome(uid, {
          amount: numericAmount,
          category,
          description,
          date,
        });
        setStatusMsg({ type: 'success', text: 'Income recorded in INR.' });
      }
      setFormOpen(false);
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save income entry.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeIncome(uid, deleteTarget.id);
      setDeleteTarget(null);
      setStatusMsg({ type: 'success', text: 'Income entry deleted.' });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete income entry.',
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
            Income Management
          </h1>
          <p className="text-sm text-slate-600">
            Log salary, pocket money, freelance payouts, business income, or allowances.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#10B981] text-[#101B35] text-sm font-bold hover:bg-[#0ea572] transition-colors whitespace-nowrap self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Income
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

      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search salary, freelance client, allowance..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter income source"
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#101B35]"
        >
          <option value="All">All Sources</option>
          {INCOME_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-[#101B35]">
            Income History ({filtered.length})
          </h2>
          <span className="font-mono text-sm font-bold text-[#10B981] tabular-nums">
            Total: {formatINR(totalIncome, hideBalances)}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500 mb-4">No income entries recorded yet.</p>
            <button
              type="button"
              onClick={openNewForm}
              className="px-4 py-2 rounded-lg bg-[#10B981] text-[#101B35] text-xs font-bold cursor-pointer"
            >
              Add First Income
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
                  <p className="text-sm font-semibold text-[#101B35] truncate">{item.description}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.category} · {formatDisplayDate(item.date)}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-sm font-bold text-[#10B981] tabular-nums">
                    +{formatINR(item.amount, hideBalances)}
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

      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#101B35]/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-bold text-[#101B35]">
                {editing ? 'Edit Income' : 'Add Income'}
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
                  placeholder="e.g. 15000"
                  className="w-full px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Source</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as IncomeCategory)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#101B35]"
                  >
                    {INCOME_CATEGORIES.map((cat) => (
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
                  placeholder="e.g. Monthly internship stipend"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
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
                  className="px-5 py-2 rounded-lg bg-[#10B981] text-[#101B35] text-sm font-bold hover:bg-[#0ea572] disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Save Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Income Entry"
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
