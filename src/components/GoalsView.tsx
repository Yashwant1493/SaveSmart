import React, { useMemo, useState } from 'react';
import { Plus, Target, CheckCircle2, Trash2, Pencil, X, AlertCircle } from 'lucide-react';
import type { SavingsGoalRecord, UserPreferencesDoc } from '../types/finance';
import { formatDisplayDate, formatINR, todayIST } from '../lib/formatters';
import {
  addGoal,
  contributeToGoal,
  removeGoal,
  updateGoalDetails,
} from '../services/firestoreService';
import { ConfirmDialog } from './ConfirmDialog';

const GOAL_TEMPLATES = [
  'Emergency Fund',
  'New Smartphone',
  'College Fees',
  'Laptop',
  'Personal Savings',
];

function getMotivationalNote(pct: number, status: 'active' | 'completed'): string {
  if (status === 'completed' || pct >= 100) {
    return 'Goal achieved through steady personal contributions.';
  }
  if (pct >= 75) return 'Final stretch — consistent small deposits will finish this goal.';
  if (pct >= 40) return 'Strong momentum — keeping regular monthly savings builds discipline.';
  if (pct > 0) return 'Great start — every ₹100 set aside moves your goal closer.';
  return 'Ready for your first contribution whenever your cashflow allows.';
}

export function GoalsView({
  uid,
  goals,
  prefs,
  hideBalances,
}: {
  uid: string;
  goals: SavingsGoalRecord[];
  prefs: UserPreferencesDoc | null;
  hideBalances: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoalRecord | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Personal Savings');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialAmount, setInitialAmount] = useState('0');
  const [targetDate, setTargetDate] = useState(todayIST());

  const [contribGoal, setContribGoal] = useState<SavingsGoalRecord | null>(null);
  const [contribAmount, setContribAmount] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoalRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.status === 'completed'), [goals]);

  function openNewGoal(presetName = '') {
    setEditing(null);
    setName(presetName);
    setCategory(presetName || 'Personal Savings');
    setTargetAmount('');
    setInitialAmount('0');
    setTargetDate(todayIST());
    setFormOpen(true);
    setStatusMsg(null);
  }

  function openEditGoal(goal: SavingsGoalRecord) {
    setEditing(goal);
    setName(goal.name);
    setCategory(goal.category || 'Personal Savings');
    setTargetAmount(String(goal.targetAmount));
    setInitialAmount(String(goal.currentAmount));
    setTargetDate(goal.targetDate);
    setFormOpen(true);
    setStatusMsg(null);
  }

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    const targetNum = Number(targetAmount);
    const initNum = Number(initialAmount || 0);
    if (!name.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter a goal name.' });
      return;
    }
    if (!Number.isFinite(targetNum) || targetNum <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid target amount in INR.' });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);
    try {
      if (editing) {
        await updateGoalDetails(uid, editing.id, {
          name,
          category,
          targetAmount: targetNum,
          targetDate,
          currentAmount: editing.currentAmount,
        });
        setStatusMsg({ type: 'success', text: 'Savings goal updated.' });
      } else {
        await addGoal(uid, {
          name,
          category,
          targetAmount: targetNum,
          currentAmount: Math.max(0, initNum),
          targetDate,
        });
        setStatusMsg({ type: 'success', text: 'New savings goal created.' });
      }
      setFormOpen(false);
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save goal.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddContribution(e: React.FormEvent) {
    e.preventDefault();
    if (!contribGoal) return;
    const amt = Number(contribAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setStatusMsg({ type: 'error', text: 'Enter a valid contribution greater than ₹0.' });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);
    try {
      await contributeToGoal(uid, contribGoal, amt, Boolean(prefs?.goalMilestones ?? true));
      setStatusMsg({
        type: 'success',
        text: `Added ${formatINR(amt)} toward ${contribGoal.name}.`,
      });
      setContribGoal(null);
      setContribAmount('');
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to add contribution.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeGoal(uid, deleteTarget.id);
      setDeleteTarget(null);
      setStatusMsg({ type: 'success', text: 'Goal deleted.' });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to delete goal.',
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
            Savings Goals
          </h1>
          <p className="text-sm text-slate-600">
            Track dedicated savings targets in INR with steady contributions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openNewGoal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#101B35] text-white text-sm font-semibold hover:bg-[#182746] transition-colors whitespace-nowrap self-start cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#10B981]" />
          New Goal
        </button>
      </div>

      {/* Quick Starter Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 mr-1">Quick templates:</span>
        {GOAL_TEMPLATES.map((tpl) => (
          <button
            key={tpl}
            type="button"
            onClick={() => openNewGoal(tpl)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-[#101B35] hover:border-[#10B981] transition-colors cursor-pointer"
          >
            + {tpl}
          </button>
        ))}
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

      {goals.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#D1FAE5] text-[#101B35] flex items-center justify-center mx-auto mb-4">
            <Target className="w-6 h-6" />
          </div>
          <h2 className="font-display text-lg font-bold text-[#101B35] mb-2">
            Start Your First Savings Goal
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            Whether it is an Emergency Fund, College Fees, or a New Laptop, breaking a target into
            trackable contributions makes saving measurable.
          </p>
          <button
            type="button"
            onClick={() => openNewGoal('Emergency Fund')}
            className="px-5 py-2.5 rounded-lg bg-[#10B981] text-[#101B35] text-sm font-bold cursor-pointer"
          >
            Create Emergency Fund Goal
          </button>
        </div>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-base font-bold text-[#101B35]">
                Active Goals ({activeGoals.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeGoals.map((goal) => {
                  const pct = Math.min(
                    100,
                    Math.round((goal.currentAmount / goal.targetAmount) * 100)
                  );
                  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
                  return (
                    <div
                      key={goal.id}
                      className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="font-display text-lg font-bold text-[#101B35]">
                              {goal.name}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {goal.category || 'Personal Savings'} · Target by{' '}
                              {formatDisplayDate(goal.targetDate)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditGoal(goal)}
                              aria-label={`Edit ${goal.name}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#101B35] hover:bg-slate-100 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(goal)}
                              aria-label={`Delete ${goal.name}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 mb-2 flex items-baseline justify-between">
                          <span className="font-mono text-base font-bold text-[#101B35] tabular-nums">
                            {formatINR(goal.currentAmount, hideBalances)} saved
                          </span>
                          <span className="font-mono text-xs text-slate-500 tabular-nums">
                            Target: {formatINR(goal.targetAmount, hideBalances)} ({pct}%)
                          </span>
                        </div>

                        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                          <div className="h-full bg-[#10B981]" style={{ width: `${pct}%` }} />
                        </div>

                        <p className="text-xs text-slate-600 mb-5">
                          {getMotivationalNote(pct, goal.status)} ({formatINR(remaining, hideBalances)}{' '}
                          to go)
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setContribGoal(goal);
                          setContribAmount('');
                        }}
                        className="w-full py-2.5 rounded-lg bg-[#101B35] text-white text-xs font-semibold hover:bg-[#182746] transition-colors cursor-pointer"
                      >
                        + Add Contribution
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-base font-bold text-[#101B35]">
                Completed Goals ({completedGoals.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {completedGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="bg-[#D1FAE5]/45 border border-[#10B981]/30 rounded-xl p-6"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                        <div>
                          <h3 className="font-display text-base font-bold text-[#101B35]">
                            {goal.name}
                          </h3>
                          <p className="text-xs text-slate-600">
                            Completed · Target {formatINR(goal.targetAmount, hideBalances)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(goal)}
                        aria-label={`Delete completed goal ${goal.name}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-[#101B35] mt-2">
                      Saved {formatINR(goal.currentAmount, hideBalances)} of{' '}
                      {formatINR(goal.targetAmount, hideBalances)} (100%)
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Goal Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#101B35]/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-bold text-[#101B35]">
                {editing ? 'Edit Savings Goal' : 'Create Savings Goal'}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#101B35]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Emergency Fund"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Amount (INR ₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                  />
                </div>
              </div>

              {!editing && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Starting Saved Amount (INR ₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                  />
                </div>
              )}

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
                  {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution Modal */}
      {contribGoal && (
        <div
          className="fixed inset-0 z-50 bg-[#101B35]/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-[#101B35]">Add Contribution</h2>
              <button
                type="button"
                onClick={() => setContribGoal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#101B35]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Goal: <span className="font-semibold text-[#101B35]">{contribGoal.name}</span> (
              {formatINR(contribGoal.currentAmount, hideBalances)} /{' '}
              {formatINR(contribGoal.targetAmount, hideBalances)})
            </p>
            <form onSubmit={handleAddContribution} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contribution Amount (INR ₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setContribGoal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-[#10B981] text-[#101B35] text-sm font-bold hover:bg-[#0ea572] disabled:opacity-60"
                >
                  {submitting ? 'Adding...' : 'Add Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Savings Goal"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}" (${formatINR(deleteTarget.currentAmount, hideBalances)} saved)?`
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
