import { useState } from 'react';
import { Bell, CheckCheck, Trash2, Plus, AlertTriangle, Target, Info } from 'lucide-react';
import type { NotificationRecord } from '../types/finance';
import { timestampToDate } from '../lib/formatters';
import {
  createNotification,
  markAllNotificationsRead,
  markNotificationRead,
  removeNotification,
} from '../services/firestoreService';

export function NotificationsView({
  uid,
  notifications,
}: {
  uid: string;
  notifications: NotificationRecord[];
}) {
  const [busy, setBusy] = useState(false);

  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

  async function handleMarkAllRead() {
    if (!unreadIds.length) return;
    setBusy(true);
    try {
      await markAllNotificationsRead(uid, unreadIds);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateSavingsReminder() {
    setBusy(true);
    try {
      await createNotification(uid, {
        type: 'savings_reminder',
        title: 'Weekly savings check-in',
        message:
          'Review your active savings goals and set aside even ₹200–₹500 if your weekly budget has room.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#101B35] tracking-tight">
            Notifications
          </h1>
          <p className="text-sm text-slate-600">
            Budget warnings (80% &amp; 100%), goal milestones, and savings reminders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={handleCreateSavingsReminder}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-[#101B35] hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 text-[#10B981]" />
            Add Savings Reminder
          </button>
          {unreadIds.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#101B35] text-white text-xs font-semibold hover:bg-[#182746] cursor-pointer disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#10B981]" />
              Mark All Read ({unreadIds.length})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-10 text-center">
            <Bell className="w-8 h-8 text-[#10B981] mx-auto mb-3" />
            <h2 className="font-display text-base font-bold text-[#101B35] mb-1">
              You are all caught up
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Budget threshold alerts (at 80% and 100% utilisation) and savings goal milestones
              will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((item) => {
              const dt = timestampToDate(item.createdAt);
              const isWarning = item.type === 'budget_warning' || item.type === 'budget_exceeded';
              const isGoal = item.type === 'goal_progress';

              return (
                <div
                  key={item.id}
                  className={`px-6 py-4 flex items-start justify-between gap-4 ${
                    item.read ? 'bg-white' : 'bg-[#D1FAE5]/25'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isWarning
                          ? 'bg-amber-50 text-amber-600'
                          : isGoal
                          ? 'bg-[#D1FAE5] text-[#101B35]'
                          : 'bg-slate-100 text-[#101B35]'
                      }`}
                    >
                      {isWarning ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : isGoal ? (
                        <Target className="w-4 h-4 text-[#10B981]" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#101B35]">{item.title}</p>
                      <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                        {item.message}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        {dt
                          ? dt.toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Just now'}
                        {!item.read && ' · Unread'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!item.read && (
                      <button
                        type="button"
                        onClick={() => void markNotificationRead(uid, item.id)}
                        className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-medium text-[#101B35] hover:bg-slate-50 cursor-pointer"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void removeNotification(uid, item.id)}
                      aria-label="Delete notification"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
