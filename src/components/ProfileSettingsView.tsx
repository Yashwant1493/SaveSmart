import React, { useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  CheckCircle2,
  AlertCircle,
  Download,
  LogOut,
  Trash2,
  Shield,
  Bell,
  User as UserIcon,
  Lock,
} from 'lucide-react';
import { auth } from '../lib/firebase';
import {
  USER_PERSONAS,
  type BudgetRecord,
  type ExpenseRecord,
  type IncomeRecord,
  type SavingsGoalRecord,
  type UserAccountDoc,
  type UserPersona,
  type UserPreferencesDoc,
  type UserPrivateProfileDoc,
} from '../types/finance';
import { downloadTextFile } from '../lib/formatters';
import {
  deleteAllUserData,
  updateUserPreferences,
  updateUserProfileInfo,
} from '../services/firestoreService';
import { ConfirmDialog } from './ConfirmDialog';

export function ProfileSettingsView({
  mode,
  firebaseUser,
  account,
  profile,
  prefs,
  expenses,
  income,
  budgets,
  goals,
}: {
  mode: 'profile' | 'settings';
  firebaseUser: User;
  account: UserAccountDoc | null;
  profile: UserPrivateProfileDoc | null;
  prefs: UserPreferencesDoc | null;
  expenses: ExpenseRecord[];
  income: IncomeRecord[];
  budgets: BudgetRecord[];
  goals: SavingsGoalRecord[];
}) {
  const [fullName, setFullName] = useState(profile?.fullName || firebaseUser.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || firebaseUser.photoURL || '');
  const [city, setCity] = useState(profile?.city || '');
  const [persona, setPersona] = useState<UserPersona>(profile?.persona || 'young_professional');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [premiumInfo, setPremiumInfo] = useState<{ priceInr: number; paymentsEnabled: boolean }>({
    priceInr: 99,
    paymentsEnabled: false,
  });

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const hasPasswordProvider = firebaseUser.providerData.some((p) => p.providerId === 'password');

  useEffect(() => {
    setFullName(profile?.fullName || firebaseUser.displayName || '');
    setPhotoURL(profile?.photoURL || firebaseUser.photoURL || '');
    setCity(profile?.city || '');
    setPersona(profile?.persona || 'young_professional');
  }, [profile, firebaseUser]);

  useEffect(() => {
    fetch('/api/config/public')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.plans?.premium) {
          setPremiumInfo({
            priceInr: d.plans.premium.priceInr ?? 99,
            paymentsEnabled: Boolean(d.plans.premium.paymentsEnabled),
          });
        }
      })
      .catch(() => {});
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setStatusMsg({ type: 'error', text: 'Full name cannot be empty.' });
      return;
    }
    setSaving(true);
    setStatusMsg(null);
    try {
      await updateUserProfileInfo(firebaseUser.uid, {
        fullName,
        email: firebaseUser.email || profile?.email || '',
        photoURL,
        city,
        persona,
      });
      await updateProfile(firebaseUser, {
        displayName: fullName.trim(),
        photoURL: photoURL.trim() || null,
      });
      setStatusMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update profile.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePreference(
    key: keyof Pick<
      UserPreferencesDoc,
      | 'budgetAlerts80'
      | 'budgetAlerts100'
      | 'savingsReminders'
      | 'goalMilestones'
      | 'monthlyDigest'
      | 'pushEnabled'
      | 'hideBalances'
      | 'aiContextSharing'
    >,
    value: boolean
  ) {
    setStatusMsg(null);
    try {
      await updateUserPreferences(firebaseUser.uid, { [key]: value });
      setStatusMsg({ type: 'success', text: 'Preferences saved.' });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update preference.',
      });
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 6) {
      setStatusMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (!firebaseUser.email) return;

    setSaving(true);
    setStatusMsg(null);
    try {
      const cred = EmailAuthProvider.credential(firebaseUser.email, currentPw);
      await reauthenticateWithCredential(firebaseUser, cred);
      await updatePassword(firebaseUser, newPw);
      setCurrentPw('');
      setNewPw('');
      setStatusMsg({ type: 'success', text: 'Password updated successfully.' });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Unable to change password. Check your current password.',
      });
    } finally {
      setSaving(false);
    }
  }

  function handleExportJSON() {
    const payload = {
      exportedAtIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      currency: 'INR',
      profile: {
        fullName: profile?.fullName,
        email: firebaseUser.email,
        city: profile?.city,
        plan: account?.plan || 'free',
      },
      expenses,
      income,
      budgets,
      goals,
    };
    downloadTextFile(
      `savesmart-export-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
    setStatusMsg({ type: 'success', text: 'Financial archive downloaded as JSON.' });
  }

  function handleExportCSV() {
    const rows = [
      ['Type', 'Date', 'Category', 'Description', 'Amount (INR)', 'Payment Method'],
      ...expenses.map((e) => [
        'Expense',
        e.date,
        e.category,
        `"${e.description.replace(/"/g, '""')}"`,
        String(e.amount),
        e.paymentMethod || '',
      ]),
      ...income.map((i) => [
        'Income',
        i.date,
        i.category,
        `"${i.description.replace(/"/g, '""')}"`,
        String(i.amount),
        '',
      ]),
    ];
    downloadTextFile(
      `savesmart-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((r) => r.join(',')).join('\n'),
      'text/csv;charset=utf-8'
    );
    setStatusMsg({ type: 'success', text: 'Transactions exported as CSV.' });
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      await deleteAllUserData(firebaseUser.uid);
      await deleteUser(firebaseUser);
    } catch (err) {
      setDeleteDialogOpen(false);
      setStatusMsg({
        type: 'error',
        text:
          err instanceof Error
            ? `${err.message}. For security, Firebase may require you to sign out and sign back in before deleting your account.`
            : 'Account deletion requires a recent sign-in.',
      });
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#101B35] tracking-tight">
          {mode === 'profile' ? 'User Profile' : 'Settings & Privacy'}
        </h1>
        <p className="text-sm text-slate-600">
          {mode === 'profile'
            ? 'Manage your personal details, currency preference (INR ₹), and account plan.'
            : 'Control alerts, AI context privacy, password, data exports, and account security.'}
        </p>
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

      {/* Personal Information Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-4 pb-5 mb-5 border-b border-slate-100">
          {photoURL ? (
            <img
              src={photoURL}
              alt="Profile"
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full object-cover bg-slate-100"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#101B35] text-white flex items-center justify-center font-display text-lg font-bold">
              {(fullName || 'S').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="font-display text-base font-bold text-[#101B35]">
              {fullName || 'SaveSmart User'}
            </h2>
            <p className="text-xs text-slate-500">
              {firebaseUser.email} · {account?.plan === 'premium' ? 'Premium Plan' : 'Free Plan'} ·
              INR (₹) · Asia/Kolkata
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              maxLength={100}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              disabled
              value={firebaseUser.email || ''}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              City (e.g. Ghaziabad, Noida, Delhi)
            </label>
            <input
              type="text"
              maxLength={80}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Noida, Delhi NCR"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Financial Profile
            </label>
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value as UserPersona)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#101B35]"
            >
              {USER_PERSONAS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Profile Photo URL (Optional)
            </label>
            <input
              type="url"
              maxLength={500}
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between pt-2">
            <div className="inline-flex items-center gap-2 text-xs text-slate-500">
              <UserIcon className="w-3.5 h-3.5" />
              <span>Currency: Indian Rupee (INR ₹) · Timezone: Asia/Kolkata</span>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#101B35] text-white text-xs font-semibold hover:bg-[#182746] disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Freemium Subscription Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-[#101B35]">
            Plan &amp; Subscription ({account?.plan === 'premium' ? 'Premium' : 'Free Plan'})
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
            SaveSmart Premium (proposed at ₹{premiumInfo.priceInr}/month) includes advanced
            multi-month analytics and expanded AI summaries.{' '}
            {premiumInfo.paymentsEnabled
              ? 'Payment gateway is active.'
              : 'Online payments remain disabled until a payment provider and merchant credentials are configured.'}
          </p>
        </div>
        <span className="px-3.5 py-2 rounded-lg bg-[#F5F7FA] border border-slate-200 text-xs font-semibold text-[#101B35] whitespace-nowrap">
          {account?.plan === 'premium' ? 'Premium Active' : 'Current: Free Plan (₹0)'}
        </span>
      </div>

      {/* Notification & Privacy Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#10B981]" />
            <h2 className="font-display text-base font-bold text-[#101B35]">
              Notification Preferences
            </h2>
          </div>

          {(
            [
              ['budgetAlerts80', 'Budget warning at 80% spent'],
              ['budgetAlerts100', 'Budget alert when 100% limit is reached'],
              ['goalMilestones', 'Savings goal milestone alerts'],
              ['savingsReminders', 'Weekly savings habit reminders'],
              ['monthlyDigest', 'Monthly INR summary notifications'],
              ['pushEnabled', 'Mobile/FCM push alerts (when configured)'],
            ] as const
          ).map(([key, label]) => {
            const checked = Boolean(prefs?.[key]);
            return (
              <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-xs text-[#182230]">{label}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => void handleTogglePreference(key, e.target.checked)}
                  className="w-4 h-4 accent-[#10B981]"
                />
              </label>
            );
          })}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#10B981]" />
            <h2 className="font-display text-base font-bold text-[#101B35]">Privacy &amp; Data</h2>
          </div>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-xs font-medium text-[#182230]">Hide INR balances on screen</p>
              <p className="text-[11px] text-slate-500">Mask rupee amounts in public places</p>
            </div>
            <input
              type="checkbox"
              checked={Boolean(prefs?.hideBalances)}
              onChange={(e) => void handleTogglePreference('hideBalances', e.target.checked)}
              className="w-4 h-4 accent-[#10B981]"
            />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-xs font-medium text-[#182230]">Share summary with Gemini AI</p>
              <p className="text-[11px] text-slate-500">
                Allows personalized budgeting answers from your monthly totals
              </p>
            </div>
            <input
              type="checkbox"
              checked={prefs?.aiContextSharing ?? true}
              onChange={(e) => void handleTogglePreference('aiContextSharing', e.target.checked)}
              className="w-4 h-4 accent-[#10B981]"
            />
          </label>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-xs font-semibold text-[#101B35]">Download Financial Data</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#101B35] hover:bg-slate-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#101B35] hover:bg-slate-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change (Email/Password users) */}
      {hasPasswordProvider && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-[#101B35]" />
            <h2 className="font-display text-base font-bold text-[#101B35]">Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="password"
              required
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Current password"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
            />
            <input
              type="password"
              required
              minLength={6}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#101B35] text-white text-xs font-semibold hover:bg-[#182746] disabled:opacity-60 cursor-pointer"
            >
              Update Password
            </button>
          </form>
        </div>
      )}

      {/* Session & Account Deletion */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => void signOut(auth)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#101B35] hover:bg-slate-50 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        <button
          type="button"
          onClick={() => setDeleteDialogOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account &amp; All Data
        </button>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Permanently Delete Account?"
        message="This removes all your expenses, income records, budgets, savings goals, notifications, and profile data from SaveSmart permanently. This action cannot be undone."
        confirmLabel="Yes, Delete Everything"
        destructive
        loading={deletingAccount}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
