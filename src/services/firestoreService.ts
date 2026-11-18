import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  where,
  increment,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  FIELD_LIMITS,
  type BudgetCategory,
  type BudgetRecord,
  type ExpenseCategory,
  type ExpenseRecord,
  type IncomeCategory,
  type IncomeRecord,
  type NotificationRecord,
  type NotificationType,
  type PaymentMethod,
  type SavingsGoalRecord,
  type UserAccountDoc,
  type UserPersona,
  type UserPreferencesDoc,
  type UserPrivateProfileDoc,
} from '../types/finance';
import { formatINR } from '../lib/formatters';

function sanitizeString(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

function generateFirestoreId(collectionPath: string): string {
  return doc(collection(db, collectionPath)).id;
}

export async function ensureUserProvisioned(user: User): Promise<void> {
  const uid = user.uid;
  const userDocRef = doc(db, 'users', uid);
  const profileDocRef = doc(db, 'users', uid, 'private', 'profile');
  const prefDocRef = doc(db, 'users', uid, 'preferences', 'default');

  const safeDisplayName = sanitizeString(
    user.displayName || user.email?.split('@')[0] || 'SaveSmart User',
    FIELD_LIMITS.DISPLAY_NAME_MAX
  );
  const safeEmail = sanitizeString(user.email || 'user@savesmart.in', FIELD_LIMITS.EMAIL_MAX);
  const safePhoto = sanitizeString(user.photoURL || '', FIELD_LIMITS.PHOTO_URL_MAX);

  try {
    const existingUserSnap = await getDoc(userDocRef);
    if (!existingUserSnap.exists()) {
      await setDoc(userDocRef, {
        uid,
        displayName: safeDisplayName,
        role: 'user',
        plan: 'free',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        expenseCount: 0,
        incomeCount: 0,
        goalCount: 0,
        budgetCount: 0,
        aiQueryCount: 0,
        lastActiveAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userDocRef, {
        lastActiveAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }

  try {
    const existingProfileSnap = await getDoc(profileDocRef);
    if (!existingProfileSnap.exists()) {
      await setDoc(profileDocRef, {
        uid,
        fullName: safeDisplayName,
        email: safeEmail,
        photoURL: safePhoto,
        city: '',
        persona: 'young_professional',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/private/profile`);
  }

  try {
    const existingPrefSnap = await getDoc(prefDocRef);
    if (!existingPrefSnap.exists()) {
      await setDoc(prefDocRef, {
        id: 'default',
        uid,
        budgetAlerts80: true,
        budgetAlerts100: true,
        savingsReminders: true,
        goalMilestones: true,
        monthlyDigest: true,
        pushEnabled: false,
        hideBalances: false,
        aiContextSharing: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/preferences/default`);
  }
}

export function subscribeUserAccount(
  uid: string,
  onData: (account: UserAccountDoc | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserAccountDoc) : null);
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export function subscribePrivateProfile(
  uid: string,
  onData: (profile: UserPrivateProfileDoc | null) => void
): Unsubscribe {
  const path = `users/${uid}/private/profile`;
  return onSnapshot(
    doc(db, 'users', uid, 'private', 'profile'),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserPrivateProfileDoc) : null);
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export function subscribePreferences(
  uid: string,
  onData: (prefs: UserPreferencesDoc | null) => void
): Unsubscribe {
  const path = `users/${uid}/preferences/default`;
  return onSnapshot(
    doc(db, 'users', uid, 'preferences', 'default'),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserPreferencesDoc) : null);
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export function subscribeExpenses(
  uid: string,
  onData: (items: ExpenseRecord[]) => void
): Unsubscribe {
  const path = `users/${uid}/expenses`;
  const q = query(
    collection(db, 'users', uid, 'expenses'),
    where('uid', '==', uid),
    orderBy('date', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as ExpenseRecord));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeIncome(
  uid: string,
  onData: (items: IncomeRecord[]) => void
): Unsubscribe {
  const path = `users/${uid}/income`;
  const q = query(
    collection(db, 'users', uid, 'income'),
    where('uid', '==', uid),
    orderBy('date', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as IncomeRecord));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeBudgets(
  uid: string,
  onData: (items: BudgetRecord[]) => void
): Unsubscribe {
  const path = `users/${uid}/budgets`;
  const q = query(collection(db, 'users', uid, 'budgets'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as BudgetRecord));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeGoals(
  uid: string,
  onData: (items: SavingsGoalRecord[]) => void
): Unsubscribe {
  const path = `users/${uid}/goals`;
  const q = query(collection(db, 'users', uid, 'goals'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as SavingsGoalRecord));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeNotifications(
  uid: string,
  onData: (items: NotificationRecord[]) => void
): Unsubscribe {
  const path = `users/${uid}/notifications`;
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as NotificationRecord));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

async function bumpUsageCounter(
  uid: string,
  field: 'expenseCount' | 'incomeCount' | 'goalCount' | 'budgetCount' | 'aiQueryCount',
  delta = 1
) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      [field]: increment(delta),
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function recordAiQueryUsage(uid: string): Promise<void> {
  await bumpUsageCounter(uid, 'aiQueryCount', 1);
}

export async function createNotification(
  uid: string,
  payload: {
    type: NotificationType;
    title: string;
    message: string;
  }
): Promise<void> {
  const collectionPath = `users/${uid}/notifications`;
  const id = generateFirestoreId(collectionPath);
  try {
    await setDoc(doc(db, collectionPath, id), {
      id,
      uid,
      type: payload.type,
      title: sanitizeString(payload.title, 120),
      message: sanitizeString(payload.message, 400),
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${collectionPath}/${id}`);
  }
}

export async function addExpense(
  uid: string,
  input: {
    amount: number;
    category: ExpenseCategory;
    description: string;
    date: string;
    paymentMethod?: PaymentMethod;
  }
): Promise<string> {
  const collectionPath = `users/${uid}/expenses`;
  const id = generateFirestoreId(collectionPath);
  const amount = Math.min(Math.max(Number(input.amount), 0.01), FIELD_LIMITS.AMOUNT_MAX);
  const description = sanitizeString(input.description, FIELD_LIMITS.DESCRIPTION_MAX);

  try {
    await setDoc(doc(db, collectionPath, id), {
      id,
      uid,
      amount,
      category: input.category,
      description,
      date: input.date,
      paymentMethod: input.paymentMethod ?? '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await bumpUsageCounter(uid, 'expenseCount', 1);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${collectionPath}/${id}`);
  }
}

export async function updateExpense(
  uid: string,
  expenseId: string,
  input: {
    amount: number;
    category: ExpenseCategory;
    description: string;
    date: string;
    paymentMethod?: PaymentMethod;
  }
): Promise<void> {
  const path = `users/${uid}/expenses/${expenseId}`;
  const amount = Math.min(Math.max(Number(input.amount), 0.01), FIELD_LIMITS.AMOUNT_MAX);
  const description = sanitizeString(input.description, FIELD_LIMITS.DESCRIPTION_MAX);

  try {
    await updateDoc(doc(db, 'users', uid, 'expenses', expenseId), {
      amount,
      category: input.category,
      description,
      date: input.date,
      paymentMethod: input.paymentMethod ?? '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeExpense(uid: string, expenseId: string): Promise<void> {
  const path = `users/${uid}/expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'expenses', expenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function addIncome(
  uid: string,
  input: {
    amount: number;
    category: IncomeCategory;
    description: string;
    date: string;
  }
): Promise<string> {
  const collectionPath = `users/${uid}/income`;
  const id = generateFirestoreId(collectionPath);
  const amount = Math.min(Math.max(Number(input.amount), 0.01), FIELD_LIMITS.AMOUNT_MAX);
  const description = sanitizeString(input.description, FIELD_LIMITS.DESCRIPTION_MAX);

  try {
    await setDoc(doc(db, collectionPath, id), {
      id,
      uid,
      amount,
      category: input.category,
      description,
      date: input.date,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await bumpUsageCounter(uid, 'incomeCount', 1);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${collectionPath}/${id}`);
  }
}

export async function updateIncome(
  uid: string,
  incomeId: string,
  input: {
    amount: number;
    category: IncomeCategory;
    description: string;
    date: string;
  }
): Promise<void> {
  const path = `users/${uid}/income/${incomeId}`;
  const amount = Math.min(Math.max(Number(input.amount), 0.01), FIELD_LIMITS.AMOUNT_MAX);
  const description = sanitizeString(input.description, FIELD_LIMITS.DESCRIPTION_MAX);

  try {
    await updateDoc(doc(db, 'users', uid, 'income', incomeId), {
      amount,
      category: input.category,
      description,
      date: input.date,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeIncome(uid: string, incomeId: string): Promise<void> {
  const path = `users/${uid}/income/${incomeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'income', incomeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertBudget(
  uid: string,
  input: {
    existingId?: string;
    monthKey: string;
    category: BudgetCategory;
    limitAmount: number;
  }
): Promise<string> {
  const collectionPath = `users/${uid}/budgets`;
  const limitAmount = Math.min(Math.max(Number(input.limitAmount), 1), FIELD_LIMITS.AMOUNT_MAX);

  if (input.existingId) {
    const path = `${collectionPath}/${input.existingId}`;
    try {
      await updateDoc(doc(db, collectionPath, input.existingId), {
        monthKey: input.monthKey,
        category: input.category,
        limitAmount,
        updatedAt: serverTimestamp(),
      });
      return input.existingId;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    const id = generateFirestoreId(collectionPath);
    try {
      await setDoc(doc(db, collectionPath, id), {
        id,
        uid,
        monthKey: input.monthKey,
        category: input.category,
        limitAmount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await bumpUsageCounter(uid, 'budgetCount', 1);
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${collectionPath}/${id}`);
    }
  }
}

export async function removeBudget(uid: string, budgetId: string): Promise<void> {
  const path = `users/${uid}/budgets/${budgetId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'budgets', budgetId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function addGoal(
  uid: string,
  input: {
    name: string;
    category?: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
  }
): Promise<string> {
  const collectionPath = `users/${uid}/goals`;
  const id = generateFirestoreId(collectionPath);
  const targetAmount = Math.min(Math.max(Number(input.targetAmount), 1), FIELD_LIMITS.AMOUNT_MAX);
  const currentAmount = Math.min(Math.max(Number(input.currentAmount || 0), 0), FIELD_LIMITS.AMOUNT_MAX);
  const status: 'active' | 'completed' = currentAmount >= targetAmount ? 'completed' : 'active';

  try {
    await setDoc(doc(db, collectionPath, id), {
      id,
      uid,
      name: sanitizeString(input.name, FIELD_LIMITS.GOAL_NAME_MAX),
      category: sanitizeString(input.category || 'Personal Savings', FIELD_LIMITS.GOAL_CATEGORY_MAX),
      targetAmount,
      currentAmount,
      targetDate: input.targetDate,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await bumpUsageCounter(uid, 'goalCount', 1);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${collectionPath}/${id}`);
  }
}

export async function contributeToGoal(
  uid: string,
  goal: SavingsGoalRecord,
  contributionAmount: number,
  notifyMilestones: boolean
): Promise<void> {
  const path = `users/${uid}/goals/${goal.id}`;
  const nextAmount = Math.min(
    goal.currentAmount + Math.max(0, contributionAmount),
    FIELD_LIMITS.AMOUNT_MAX
  );
  const nextStatus: 'active' | 'completed' =
    nextAmount >= goal.targetAmount ? 'completed' : 'active';

  try {
    await updateDoc(doc(db, 'users', uid, 'goals', goal.id), {
      currentAmount: nextAmount,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });

    if (notifyMilestones) {
      if (nextStatus === 'completed') {
        await createNotification(uid, {
          type: 'goal_progress',
          title: `Goal completed: ${goal.name}`,
          message: `You reached your target of ${formatINR(goal.targetAmount)} for ${goal.name}.`,
        });
      } else {
        const pct = Math.round((nextAmount / goal.targetAmount) * 100);
        if (pct >= 50 && Math.round((goal.currentAmount / goal.targetAmount) * 100) < 50) {
          await createNotification(uid, {
            type: 'goal_progress',
            title: `Halfway to ${goal.name}`,
            message: `You are ${pct}% toward your ${formatINR(goal.targetAmount)} goal.`,
          });
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateGoalDetails(
  uid: string,
  goalId: string,
  input: {
    name: string;
    category?: string;
    targetAmount: number;
    targetDate: string;
    currentAmount: number;
  }
): Promise<void> {
  const path = `users/${uid}/goals/${goalId}`;
  const targetAmount = Math.min(Math.max(Number(input.targetAmount), 1), FIELD_LIMITS.AMOUNT_MAX);
  const status: 'active' | 'completed' = input.currentAmount >= targetAmount ? 'completed' : 'active';

  try {
    await updateDoc(doc(db, 'users', uid, 'goals', goalId), {
      name: sanitizeString(input.name, FIELD_LIMITS.GOAL_NAME_MAX),
      category: sanitizeString(input.category || 'Personal Savings', FIELD_LIMITS.GOAL_CATEGORY_MAX),
      targetAmount,
      targetDate: input.targetDate,
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeGoal(uid: string, goalId: string): Promise<void> {
  const path = `users/${uid}/goals/${goalId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'goals', goalId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function checkAndNotifyBudgetThresholds(
  uid: string,
  expenseDate: string,
  expenseCategory: ExpenseCategory,
  allExpenses: ExpenseRecord[],
  budgets: BudgetRecord[],
  prefs: UserPreferencesDoc | null
): Promise<void> {
  if (!prefs) return;
  const monthKey = expenseDate.slice(0, 7);
  const monthExpenses = allExpenses.filter((e) => e.date.startsWith(monthKey));

  const relevantBudgets = budgets.filter(
    (b) => b.monthKey === monthKey && (b.category === 'Overall' || b.category === expenseCategory)
  );

  for (const budget of relevantBudgets) {
    const spent =
      budget.category === 'Overall'
        ? monthExpenses.reduce((sum, e) => sum + e.amount, 0)
        : monthExpenses
            .filter((e) => e.category === budget.category)
            .reduce((sum, e) => sum + e.amount, 0);

    const ratio = spent / budget.limitAmount;
    if (ratio >= 1 && prefs.budgetAlerts100) {
      await createNotification(uid, {
        type: 'budget_exceeded',
        title: `${budget.category} budget reached 100%`,
        message: `You have spent ${formatINR(spent)} against your ${formatINR(budget.limitAmount)} ${budget.category} budget for ${monthKey}.`,
      });
    } else if (ratio >= 0.8 && ratio < 1 && prefs.budgetAlerts80) {
      await createNotification(uid, {
        type: 'budget_warning',
        title: `${budget.category} budget at ${Math.round(ratio * 100)}%`,
        message: `You have used ${formatINR(spent)} of your ${formatINR(budget.limitAmount)} ${budget.category} limit for ${monthKey}.`,
      });
    }
  }
}

export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  const path = `users/${uid}/notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'notifications', notificationId), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markAllNotificationsRead(
  uid: string,
  unreadIds: string[]
): Promise<void> {
  if (!unreadIds.length) return;
  try {
    const batch = writeBatch(db);
    unreadIds.slice(0, 200).forEach((id) => {
      batch.update(doc(db, 'users', uid, 'notifications', id), {
        read: true,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/notifications`);
  }
}

export async function removeNotification(uid: string, notificationId: string): Promise<void> {
  const path = `users/${uid}/notifications/${notificationId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'notifications', notificationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateUserProfileInfo(
  uid: string,
  input: {
    fullName: string;
    email: string;
    photoURL: string;
    city: string;
    persona: UserPersona;
  }
): Promise<void> {
  const cleanName = sanitizeString(input.fullName, FIELD_LIMITS.DISPLAY_NAME_MAX);
  try {
    await updateDoc(doc(db, 'users', uid, 'private', 'profile'), {
      fullName: cleanName,
      email: sanitizeString(input.email, FIELD_LIMITS.EMAIL_MAX),
      photoURL: sanitizeString(input.photoURL, FIELD_LIMITS.PHOTO_URL_MAX),
      city: sanitizeString(input.city, FIELD_LIMITS.CITY_MAX),
      persona: input.persona,
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'users', uid), {
      displayName: cleanName,
      timezone: 'Asia/Kolkata',
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/private/profile`);
  }
}

export async function updateUserPreferences(
  uid: string,
  updates: Partial<
    Pick<
      UserPreferencesDoc,
      | 'budgetAlerts80'
      | 'budgetAlerts100'
      | 'savingsReminders'
      | 'goalMilestones'
      | 'monthlyDigest'
      | 'pushEnabled'
      | 'hideBalances'
      | 'aiContextSharing'
    >
  >
): Promise<void> {
  const path = `users/${uid}/preferences/default`;
  try {
    await updateDoc(doc(db, 'users', uid, 'preferences', 'default'), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAllUserData(uid: string): Promise<void> {
  const subcollections = [
    'expenses',
    'income',
    'budgets',
    'goals',
    'notifications',
    'preferences',
    'private',
  ];

  for (const sub of subcollections) {
    const path = `users/${uid}/${sub}`;
    try {
      const snap = await getDocs(query(collection(db, 'users', uid, sub), where('uid', '==', uid)));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}

export async function fetchAdminAggregateAccounts(): Promise<UserAccountDoc[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as UserAccountDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
