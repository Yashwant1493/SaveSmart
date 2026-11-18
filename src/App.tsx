import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, BOOTSTRAPPED_ADMIN_EMAIL, db } from './lib/firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './components/LandingPage';
import { AuthView } from './components/AuthView';
import { AppShell } from './components/AppShell';
import {
  ensureUserProvisioned,
  subscribeBudgets,
  subscribeExpenses,
  subscribeGoals,
  subscribeIncome,
  subscribeNotifications,
  subscribePreferences,
  subscribePrivateProfile,
  subscribeUserAccount,
} from './services/firestoreService';
import type {
  BudgetRecord,
  ExpenseRecord,
  IncomeRecord,
  NotificationRecord,
  SavingsGoalRecord,
  UserAccountDoc,
  UserPreferencesDoc,
  UserPrivateProfileDoc,
} from './types/finance';

function SaveSmartRoot() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authScreen, setAuthScreen] = useState<'none' | 'login' | 'register'>('none');
  const [verificationTick, setVerificationTick] = useState(0);

  const [isAdmin, setIsAdmin] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  const [account, setAccount] = useState<UserAccountDoc | null>(null);
  const [profile, setProfile] = useState<UserPrivateProfileDoc | null>(null);
  const [prefs, setPrefs] = useState<UserPreferencesDoc | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [goals, setGoals] = useState<SavingsGoalRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setAccount(null);
        setProfile(null);
        setPrefs(null);
        setExpenses([]);
        setIncome([]);
        setBudgets([]);
        setGoals([]);
        setNotifications([]);
        setIsAdmin(false);
        setProvisionError(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !user.emailVerified) return;

    let cancelled = false;
    const unsubscribers: Array<() => void> = [];

    async function initUserWorkspace(activeUser: User) {
      setDataLoading(true);
      setProvisionError(null);
      try {
        await ensureUserProvisioned(activeUser);

        // Trusted Admin authorization check (bootstrapped verified email OR /admins/{uid} doc)
        let adminVerified =
          Boolean(activeUser.emailVerified) &&
          activeUser.email === BOOTSTRAPPED_ADMIN_EMAIL;
        if (!adminVerified) {
          try {
            const adminSnap = await getDoc(doc(db, 'admins', activeUser.uid));
            adminVerified = adminSnap.exists();
          } catch {
            adminVerified = false;
          }
        }
        if (!cancelled) setIsAdmin(adminVerified);

        if (cancelled) return;

        unsubscribers.push(
          subscribeUserAccount(activeUser.uid, (acc) => setAccount(acc)),
          subscribePrivateProfile(activeUser.uid, (prof) => setProfile(prof)),
          subscribePreferences(activeUser.uid, (pr) => setPrefs(pr)),
          subscribeExpenses(activeUser.uid, (exp) => setExpenses(exp)),
          subscribeIncome(activeUser.uid, (inc) => setIncome(inc)),
          subscribeBudgets(activeUser.uid, (bdg) => setBudgets(bdg)),
          subscribeGoals(activeUser.uid, (gls) => setGoals(gls)),
          subscribeNotifications(activeUser.uid, (ntf) => setNotifications(ntf))
        );
      } catch (err) {
        if (!cancelled) {
          setProvisionError(
            err instanceof Error ? err.message : 'Unable to initialize your ledger.'
          );
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    void initUserWorkspace(user);

    return () => {
      cancelled = true;
      unsubscribers.forEach((fn) => fn());
    };
  }, [user, verificationTick]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#101B35] border-t-[#10B981] animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-500">Loading SaveSmart...</p>
        </div>
      </div>
    );
  }

  if (user && !user.emailVerified) {
    return (
      <AuthView
        onBack={() => setAuthScreen('none')}
        unverifiedUser={user}
        onVerificationRefreshed={() => setVerificationTick((t) => t + 1)}
      />
    );
  }

  if (user && user.emailVerified) {
    if (provisionError) {
      throw new Error(provisionError);
    }
    return (
      <AppShell
        firebaseUser={user}
        isAdmin={isAdmin}
        account={account}
        profile={profile}
        prefs={prefs}
        expenses={expenses}
        income={income}
        budgets={budgets}
        goals={goals}
        notifications={notifications}
        dataLoading={dataLoading}
      />
    );
  }

  if (authScreen === 'login' || authScreen === 'register') {
    return <AuthView initialMode={authScreen} onBack={() => setAuthScreen('none')} />;
  }

  return (
    <LandingPage
      onGetStarted={() => setAuthScreen('register')}
      onLogin={() => setAuthScreen('login')}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SaveSmartRoot />
    </ErrorBoundary>
  );
}
