import { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  ArrowDownLeft,
  PiggyBank,
  Target,
  BarChart3,
  Sparkles,
  Bell,
  User as UserIcon,
  Settings,
  Smartphone,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  Eye,
  EyeOff,
} from 'lucide-react';
import { signOut, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { SaveSmartLogo } from './SaveSmartLogo';
import { WhatsAppButton } from './WhatsAppButton';
import { DashboardView } from './DashboardView';
import { ExpensesView } from './ExpensesView';
import { IncomeView } from './IncomeView';
import { BudgetsView } from './BudgetsView';
import { GoalsView } from './GoalsView';
import { AnalyticsView } from './AnalyticsView';
import { AIAssistantView } from './AIAssistantView';
import { NotificationsView } from './NotificationsView';
import { ProfileSettingsView } from './ProfileSettingsView';
import { AndroidCompanionView } from './AndroidCompanionView';
import { AdminDashboardView } from './AdminDashboardView';
import { updateUserPreferences } from '../services/firestoreService';
import type {
  AppSection,
  BudgetRecord,
  ExpenseRecord,
  IncomeRecord,
  NotificationRecord,
  SavingsGoalRecord,
  UserAccountDoc,
  UserPreferencesDoc,
  UserPrivateProfileDoc,
} from '../types/finance';

export function AppShell({
  firebaseUser,
  isAdmin,
  account,
  profile,
  prefs,
  expenses,
  income,
  budgets,
  goals,
  notifications,
  dataLoading,
}: {
  firebaseUser: User;
  isAdmin: boolean;
  account: UserAccountDoc | null;
  profile: UserPrivateProfileDoc | null;
  prefs: UserPreferencesDoc | null;
  expenses: ExpenseRecord[];
  income: IncomeRecord[];
  budgets: BudgetRecord[];
  goals: SavingsGoalRecord[];
  notifications: NotificationRecord[];
  dataLoading: boolean;
}) {
  const [section, setSection] = useState<AppSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hideBalances = Boolean(prefs?.hideBalances);

  const navItems: Array<{
    id: AppSection;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'income', label: 'Income', icon: ArrowDownLeft },
    { id: 'budgets', label: 'Budgets', icon: PiggyBank },
    { id: 'goals', label: 'Savings Goals', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'android', label: 'Android App', icon: Smartphone },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Console', icon: ShieldCheck });
  }

  function selectSection(next: AppSection) {
    setSection(next);
    setMobileMenuOpen(false);
  }

  const activeLabel = navItems.find((n) => n.id === section)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 bg-[#101B35] text-white border-r border-[#182746]">
        <div className="h-16 px-6 flex items-center border-b border-white/10">
          <SaveSmartLogo variant="light" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectSection(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#182746] text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${active ? 'text-[#10B981]' : 'text-slate-400'}`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="text-[11px] font-mono font-bold text-[#10B981] tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {profile?.fullName || firebaseUser.displayName || 'SaveSmart User'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{firebaseUser.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut(auth)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#101B35]/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#101B35] text-white flex flex-col h-full z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
              <SaveSmartLogo variant="light" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
                className="p-2 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectSection(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                      active ? 'bg-[#182746] text-white' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${active ? 'text-[#10B981]' : 'text-slate-400'}`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="text-xs font-mono font-bold text-[#10B981]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => void signOut(auth)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/10 text-xs font-semibold text-white"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[260px] flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-2 rounded-lg text-[#101B35] hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-slate-500 truncate">
              <span>SaveSmart</span>
              <span className="mx-2">/</span>
              <span className="font-semibold text-[#101B35]">{activeLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() =>
                void updateUserPreferences(firebaseUser.uid, {
                  hideBalances: !hideBalances,
                })
              }
              title={hideBalances ? 'Show INR balances' : 'Hide INR balances'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#101B35] hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              {hideBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {hideBalances ? 'Balances Hidden' : 'INR (₹)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => selectSection('notifications')}
              aria-label="Open notifications"
              className="relative p-2 rounded-lg border border-slate-200 text-[#101B35] hover:bg-slate-50 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 min-w-[18px] h-[18px] rounded-full bg-[#10B981] text-[#101B35] text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-24">
          {section === 'dashboard' && (
            <DashboardView
              expenses={expenses}
              income={income}
              budgets={budgets}
              goals={goals}
              hideBalances={hideBalances}
              loading={dataLoading}
              onNavigate={selectSection}
            />
          )}
          {section === 'expenses' && (
            <ExpensesView
              uid={firebaseUser.uid}
              expenses={expenses}
              budgets={budgets}
              prefs={prefs}
              hideBalances={hideBalances}
            />
          )}
          {section === 'income' && (
            <IncomeView uid={firebaseUser.uid} income={income} hideBalances={hideBalances} />
          )}
          {section === 'budgets' && (
            <BudgetsView
              uid={firebaseUser.uid}
              budgets={budgets}
              expenses={expenses}
              hideBalances={hideBalances}
            />
          )}
          {section === 'goals' && (
            <GoalsView
              uid={firebaseUser.uid}
              goals={goals}
              prefs={prefs}
              hideBalances={hideBalances}
            />
          )}
          {section === 'analytics' && (
            <AnalyticsView
              expenses={expenses}
              income={income}
              budgets={budgets}
              goals={goals}
              hideBalances={hideBalances}
            />
          )}
          {section === 'ai' && (
            <AIAssistantView
              uid={firebaseUser.uid}
              expenses={expenses}
              income={income}
              budgets={budgets}
              goals={goals}
              prefs={prefs}
            />
          )}
          {section === 'notifications' && (
            <NotificationsView uid={firebaseUser.uid} notifications={notifications} />
          )}
          {(section === 'profile' || section === 'settings') && (
            <ProfileSettingsView
              mode={section}
              firebaseUser={firebaseUser}
              account={account}
              profile={profile}
              prefs={prefs}
              expenses={expenses}
              income={income}
              budgets={budgets}
              goals={goals}
            />
          )}
          {section === 'android' && <AndroidCompanionView />}
          {section === 'admin' && <AdminDashboardView isAdmin={isAdmin} />}
        </main>
      </div>

      <WhatsAppButton />
    </div>
  );
}
