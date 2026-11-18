import React, { useMemo, useState } from 'react';
import { Send, Sparkles, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { currentMonthKeyIST } from '../lib/formatters';
import { recordAiQueryUsage } from '../services/firestoreService';
import type {
  BudgetRecord,
  ExpenseRecord,
  IncomeRecord,
  SavingsGoalRecord,
  UserPreferencesDoc,
} from '../types/finance';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const EXAMPLE_PROMPTS = [
  'Where did I spend the most this month?',
  'How can I save ₹2,000 next month?',
  'Which expenses can I reduce?',
  'Am I following my monthly budget?',
  'Help me create an emergency savings goal.',
];

export function AIAssistantView({
  uid,
  expenses,
  income,
  budgets,
  goals,
  prefs,
}: {
  uid: string;
  expenses: ExpenseRecord[];
  income: IncomeRecord[];
  budgets: BudgetRecord[];
  goals: SavingsGoalRecord[];
  prefs: UserPreferencesDoc | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! I am SaveSmart AI. Ask me about your monthly INR spending patterns, budget pacing, or realistic ways to build your savings goals.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const monthKey = currentMonthKeyIST();
  const contextShared = prefs?.aiContextSharing ?? true;

  const summaryPayload = useMemo(() => {
    if (!contextShared) {
      return { contextShared: false };
    }
    const monthExpenses = expenses.filter((e) => e.date.startsWith(monthKey));
    const monthIncome = income.filter((i) => i.date.startsWith(monthKey));
    const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const totalIncome = monthIncome.reduce((s, i) => s + i.amount, 0);
    const totalSavedInGoals = goals.reduce((s, g) => s + g.currentAmount, 0);

    const catMap = new Map<string, number>();
    monthExpenses.forEach((e) => {
      catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
    });
    const categoryBreakdown = Array.from(catMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const budgetSummary = budgets
      .filter((b) => b.monthKey === monthKey)
      .map((b) => ({
        category: b.category,
        limit: b.limitAmount,
        spent:
          b.category === 'Overall'
            ? totalExpenses
            : monthExpenses
                .filter((e) => e.category === b.category)
                .reduce((s, e) => s + e.amount, 0),
      }));

    return {
      contextShared: true,
      monthKey,
      totalIncome,
      totalExpenses,
      totalSavedInGoals,
      categoryBreakdown,
      budgets: budgetSummary,
      goals: goals.map((g) => ({
        name: g.name,
        target: g.targetAmount,
        saved: g.currentAmount,
        targetDate: g.targetDate,
      })),
    };
  }, [contextShared, expenses, income, budgets, goals, monthKey]);

  async function sendPrompt(promptText: string) {
    const trimmed = promptText.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setSending(true);
    setErrorMsg(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Please sign in again to use the AI Assistant.');
      }
      const idToken = await currentUser.getIdToken();

      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: trimmed,
          history: messages
            .filter((m) => m.id !== 'welcome')
            .slice(-6)
            .map((m) => ({ role: m.role, text: m.text })),
          summary: summaryPayload,
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        throw new Error(data.error || 'AI Assistant could not generate a response.');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.reply!,
        },
      ]);

      void recordAiQueryUsage(uid).catch(() => {
        // non-blocking telemetry counter
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach AI Assistant.');
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendPrompt(input);
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#101B35] tracking-tight">
          AI Financial Assistant
        </h1>
        <p className="text-sm text-slate-600">
          Powered by Gemini AI · Explains your INR spending habits and helps plan realistic
          savings.
        </p>
      </div>

      {/* Security & Non-Advisory Guardrail */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-600">
        <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-[#101B35]">
            {contextShared
              ? 'Aggregated monthly summary sharing is enabled.'
              : 'Summary sharing is paused in Settings — answering with general INR tips only.'}
          </span>{' '}
          SaveSmart AI provides educational budgeting insights only, never guarantees financial
          returns, and does not offer regulated investment, loan, or tax advice.
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={sending}
            onClick={() => void sendPrompt(prompt)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-[#101B35] hover:border-[#10B981] transition-colors cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Viewport */}
      <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-[500px] overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-[#101B35] text-white'
                    : 'bg-[#F5F7FA] border border-slate-200 text-[#182230]'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#10B981] mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>SaveSmart AI</span>
                  </div>
                )}
                {msg.text}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-[#F5F7FA] border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 inline-flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#10B981]" />
                Analysing your summary...
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mx-6 mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-slate-200 bg-[#F5F7FA] flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={1000}
            placeholder="Ask a budgeting or savings question in INR..."
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#101B35]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#101B35] text-white text-sm font-semibold hover:bg-[#182746] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
