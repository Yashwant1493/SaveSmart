import { useEffect, useMemo, useState } from 'react';
import { Activity, ShieldAlert, Users, RefreshCw } from 'lucide-react';
import { fetchAdminAggregateAccounts } from '../services/firestoreService';
import { timestampToDate } from '../lib/formatters';
import type { UserAccountDoc } from '../types/finance';

interface HealthStatus {
  status: string;
  service: string;
  timestampIST: string;
  uptimeSeconds: number;
  firebaseProjectId: string | null;
  geminiReady: boolean;
  memoryMb: number;
}

export function AdminDashboardView({ isAdmin }: { isAdmin: boolean }) {
  const [accounts, setAccounts] = useState<UserAccountDoc[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadAdminStats() {
    if (!isAdmin) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [usersData, healthRes] = await Promise.all([
        fetchAdminAggregateAccounts(),
        fetch('/api/health').then((r) => (r.ok ? r.json() : null)),
      ]);
      setAccounts(usersData);
      setHealth(healthRes);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load admin metrics.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAdminStats();
  }, [isAdmin]);

  const metrics = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const monthMs = 30 * dayMs;

    let dau = 0;
    let mau = 0;
    let freeCount = 0;
    let premiumCount = 0;
    let totalExpenses = 0;
    let totalIncome = 0;
    let totalGoals = 0;
    let totalBudgets = 0;
    let totalAiQueries = 0;

    accounts.forEach((acc) => {
      const activeDate = timestampToDate(acc.lastActiveAt);
      if (activeDate) {
        const diff = now - activeDate.getTime();
        if (diff <= dayMs) dau += 1;
        if (diff <= monthMs) mau += 1;
      }
      if (acc.plan === 'premium') premiumCount += 1;
      else freeCount += 1;

      totalExpenses += Number(acc.expenseCount || 0);
      totalIncome += Number(acc.incomeCount || 0);
      totalGoals += Number(acc.goalCount || 0);
      totalBudgets += Number(acc.budgetCount || 0);
      totalAiQueries += Number(acc.aiQueryCount || 0);
    });

    return {
      totalUsers: accounts.length,
      dau,
      mau,
      freeCount,
      premiumCount,
      totalExpenses,
      totalIncome,
      totalGoals,
      totalBudgets,
      totalAiQueries,
    };
  }, [accounts]);

  if (!isAdmin) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 max-w-lg">
        <ShieldAlert className="w-8 h-8 text-red-600 mb-3" />
        <h1 className="font-display text-xl font-bold text-[#101B35] mb-2">
          Administrator Access Restricted
        </h1>
        <p className="text-sm text-slate-600">
          This area requires verified administrator authorization enforced by Firestore security
          rules.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#101B35] tracking-tight">
            Admin Operations Console
          </h1>
          <p className="text-sm text-slate-600">
            Aggregate usage, subscription breakdown, and platform health. Private user transactions
            are isolated and never exposed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAdminStats()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-[#101B35] hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      {/* User Engagement KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 mb-1.5">Total Registered Users</p>
          <p className="font-mono text-2xl font-bold text-[#101B35] tabular-nums">
            {metrics.totalUsers}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 mb-1.5">Daily Active Users (24h)</p>
          <p className="font-mono text-2xl font-bold text-[#10B981] tabular-nums">{metrics.dau}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 mb-1.5">Monthly Active Users (30d)</p>
          <p className="font-mono text-2xl font-bold text-[#101B35] tabular-nums">{metrics.mau}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 mb-1.5">Subscriptions (Free / Premium)</p>
          <p className="font-mono text-2xl font-bold text-[#101B35] tabular-nums">
            {metrics.freeCount} / {metrics.premiumCount}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Aggregate Feature Usage */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[#10B981]" />
            <h2 className="font-display text-base font-bold text-[#101B35]">
              Aggregate Feature Usage (Non-PII Counters)
            </h2>
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            {[
              ['Expenses Logged', metrics.totalExpenses],
              ['Income Entries Logged', metrics.totalIncome],
              ['Monthly Budgets Created', metrics.totalBudgets],
              ['Savings Goals Created', metrics.totalGoals],
              ['Gemini AI Assistant Queries', metrics.totalAiQueries],
            ].map(([label, val]) => (
              <div key={String(label)} className="py-3 flex items-center justify-between">
                <span className="text-slate-600">{label}</span>
                <span className="font-mono font-bold text-[#101B35] tabular-nums">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Application Health Monitoring */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#10B981]" />
            <h2 className="font-display text-base font-bold text-[#101B35]">
              Application Health Monitoring
            </h2>
          </div>
          {!health ? (
            <p className="text-xs text-slate-500">Loading server telemetry...</p>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">API Status</span>
                <span className="font-semibold text-[#10B981] uppercase">{health.status}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Firebase Project</span>
                <span className="font-mono text-[#101B35]">{health.firebaseProjectId}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Gemini AI Key Ready</span>
                <span className="font-semibold text-[#101B35]">
                  {health.geminiReady ? 'Configured' : 'Missing Secret'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Server Uptime</span>
                <span className="font-mono text-[#101B35] tabular-nums">
                  {health.uptimeSeconds}s
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Memory RSS</span>
                <span className="font-mono text-[#101B35] tabular-nums">{health.memoryMb} MB</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
