import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Lock,
  Smartphone,
  Target,
  TrendingUp,
  Wallet,
  Sparkles,
  Check,
  Menu,
  X,
} from 'lucide-react';
import { SaveSmartLogo } from './SaveSmartLogo';
import { LegalModal } from './LegalModals';
import { WhatsAppButton } from './WhatsAppButton';
import { WHATSAPP_SUPPORT_URL } from '../lib/firebase';

const SAMPLE_PREVIEW_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'ai', label: 'AI Insights' },
] as const;

const SAMPLE_STORIES = [
  {
    name: 'Aarav Sharma',
    role: 'B.Tech Student · Ghaziabad',
    avatar: '/src/assets/images/avatar_aarav_sharma_1795021989982.jpg',
    quote:
      'Before SaveSmart, my monthly hostel allowance vanished by the 18th. Setting a ₹3,500 food cap and 80% alerts helped me set aside ₹1,800 every month toward my laptop goal.',
  },
  {
    name: 'Priya Verma',
    role: 'Junior Product Designer · Noida',
    avatar: '/src/assets/images/avatar_priya_verma_1795021990166.jpg',
    quote:
      'Seeing my UPI coffee and cab rides grouped automatically showed me where ₹4,200 was leaking each month. My emergency fund reached ₹30,000 in five months.',
  },
  {
    name: 'Rohan Mehta',
    role: 'Delivery & Gig Earner · East Delhi',
    avatar: '/src/assets/images/avatar_rohan_mehta_1795021991787.jpg',
    quote:
      'With daily payouts, keeping track of fuel and bike maintenance was messy. Logging daily earnings alongside fuel expenses gave me clarity on what I actually take home.',
  },
];

const FAQS = [
  {
    q: 'Does SaveSmart ever ask for my UPI PIN, bank password, or OTP?',
    a: 'No. Never. SaveSmart does not connect to your bank account, does not ask for UPI PINs, card PINs, or OTPs, and does not initiate any money transfers. You log and control every entry yourself.',
  },
  {
    q: 'Is SaveSmart built specifically for Indian Rupees (INR)?',
    a: 'Yes. All dashboards, budgets, goals, charts, and AI summaries format natively in INR (₹) using Indian numbering and Asia/Kolkata (IST) dates.',
  },
  {
    q: 'Do my web and Android accounts share the same data?',
    a: 'Yes. Both the SaveSmart Web App and the Kotlin Jetpack Compose Android companion connect to the same Firebase Authentication account and Cloud Firestore database.',
  },
  {
    q: 'How does the Gemini AI Financial Assistant protect my privacy?',
    a: 'All AI requests run through an authenticated server route. You control AI Context Sharing in Settings, and only summarized monthly totals—never banking credentials—are used to answer budgeting questions.',
  },
  {
    q: 'Is SaveSmart free to start?',
    a: 'Yes. The Free Plan includes expense tracking, income tracking, monthly budgets, savings goals, and core analytics. SaveSmart Premium (proposed at ₹99/month) unlocks advanced analytics and expanded AI budgeting reports once payment processing is configured.',
  },
];

export function LandingPage({
  onGetStarted,
  onLogin,
}: {
  onGetStarted: () => void;
  onLogin: () => void;
}) {
  const [previewTab, setPreviewTab] = useState<'overview' | 'budgets' | 'ai'>('overview');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [premiumPriceInr, setPremiumPriceInr] = useState<number>(99);
  const [heroImgError, setHeroImgError] = useState(false);
  const [featureImgError, setFeatureImgError] = useState(false);

  useEffect(() => {
    fetch('/api/config/public')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.plans?.premium?.priceInr) {
          setPremiumPriceInr(data.plans.premium.priceInr);
        }
      })
      .catch(() => {
        // default ₹99 remains
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#182230]">
      {/* Top Bar Contract: Zone 1 (Brand) — Zone 2 (5 Links) — Zone 3 (1 Primary Action) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a href="#top" className="whitespace-nowrap shrink-0">
            <SaveSmartLogo />
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-[#101B35] transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#101B35] transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#ai-assistant" className="hover:text-[#101B35] transition-colors whitespace-nowrap shrink-0">
              AI Assistant
            </a>
            <a href="#pricing" className="hover:text-[#101B35] transition-colors whitespace-nowrap shrink-0">
              Pricing
            </a>
            <button
              type="button"
              onClick={onLogin}
              className="hover:text-[#101B35] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Login
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onGetStarted}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#101B35] text-white text-sm font-semibold hover:bg-[#182746] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Started Free
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-lg text-[#101B35] hover:bg-slate-100"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 px-6 py-4 space-y-3">
            <a
              href="#features"
              onClick={() => setMobileNavOpen(false)}
              className="block text-sm font-medium text-slate-700 py-1"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileNavOpen(false)}
              className="block text-sm font-medium text-slate-700 py-1"
            >
              How It Works
            </a>
            <a
              href="#ai-assistant"
              onClick={() => setMobileNavOpen(false)}
              className="block text-sm font-medium text-slate-700 py-1"
            >
              AI Assistant
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileNavOpen(false)}
              className="block text-sm font-medium text-slate-700 py-1"
            >
              Pricing
            </a>
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onLogin}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-[#101B35]"
              >
                Login
              </button>
              <button
                type="button"
                onClick={onGetStarted}
                className="flex-1 py-2.5 rounded-lg bg-[#101B35] text-white text-sm font-semibold"
              >
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-wide text-[#10B981] mb-4">
                Track Smart. Spend Better. Save More. · Built for India (INR ₹)
              </p>
              <h1
                className="font-display font-bold text-[#101B35] tracking-tight leading-[1.08] mb-6"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)', textWrap: 'balance' }}
              >
                Take Control of Your Money. Build Your Future.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
                SaveSmart helps college students, young professionals, first-time earners, and gig
                workers across Delhi NCR, Ghaziabad, Noida, and India track daily INR expenses, stick
                to monthly budgets, and grow real savings goals.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-8">
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#10B981] text-[#101B35] font-bold text-sm hover:bg-[#0ea572] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onLogin}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-slate-300 bg-white text-[#101B35] font-semibold text-sm hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Login to Dashboard
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                <span>Zero UPI PIN or bank passwords required</span>
                <span aria-hidden="true">·</span>
                <span>Synced Web &amp; Android Companion</span>
                <span aria-hidden="true">·</span>
                <span>IST (Asia/Kolkata)</span>
              </div>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-[#101B35] min-h-[320px] lg:min-h-[420px] relative">
                {!heroImgError ? (
                  <img
                    src="/src/assets/images/hero_young_indian_finance_1795021990777.jpg"
                    alt="Young Indian professional reviewing personal budget and savings plan on SaveSmart"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#101B35] to-[#182746] flex flex-col items-center justify-center p-8 text-white">
                    <Wallet className="w-10 h-10 text-[#10B981] mb-3" />
                    <p className="font-display font-semibold text-lg">SaveSmart Personal Finance</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive App Interface Preview Strip */}
          <div className="max-w-7xl mx-auto px-6 pb-16">
            <div className="rounded-2xl border border-slate-200 bg-[#F5F7FA] p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    Interactive Product Preview · Sample Illustrative Figures
                  </p>
                  <h2 className="text-lg font-bold text-[#101B35]">
                    Inside the SaveSmart Workspace
                  </h2>
                </div>
                <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg self-start">
                  {SAMPLE_PREVIEW_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPreviewTab(tab.id)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        previewTab === tab.id
                          ? 'bg-[#101B35] text-white'
                          : 'text-slate-600 hover:text-[#101B35]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {previewTab === 'overview' && (
                <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs text-slate-500 mb-2">Monthly Income</p>
                    <p className="font-mono text-2xl font-semibold text-[#101B35] tabular-nums">
                      ₹32,000
                    </p>
                    <p className="text-xs text-[#10B981] mt-2 font-medium">Salary + Freelance</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs text-slate-500 mb-2">Monthly Expenses</p>
                    <p className="font-mono text-2xl font-semibold text-[#101B35] tabular-nums">
                      ₹18,450
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Across 6 categories</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs text-slate-500 mb-2">Available Balance</p>
                    <p className="font-mono text-2xl font-semibold text-[#10B981] tabular-nums">
                      ₹13,550
                    </p>
                    <p className="text-xs text-slate-500 mt-2">42% cash retained</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs text-slate-500 mb-2">Emergency Fund Goal</p>
                    <p className="font-mono text-2xl font-semibold text-[#101B35] tabular-nums">
                      ₹24,000 / ₹40,000
                    </p>
                    <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-[#10B981] w-[60%]" />
                    </div>
                  </div>
                </div>
              )}

              {previewTab === 'budgets' && (
                <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { name: 'Food & Tiffin', spent: 4100, limit: 5000, state: '82% · Alert Triggered' },
                    { name: 'Metro & Transport', spent: 1650, limit: 2500, state: '66% · On Track' },
                    { name: 'Bills & Recharge', spent: 2200, limit: 2200, state: '100% · Limit Reached' },
                  ].map((item) => {
                    const pct = Math.min(100, Math.round((item.spent / item.limit) * 100));
                    return (
                      <div key={item.name} className="bg-white border border-slate-200 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-[#101B35]">{item.name}</span>
                          <span className="text-xs font-medium text-slate-500">{item.state}</span>
                        </div>
                        <p className="font-mono text-base font-semibold text-[#101B35] tabular-nums mb-3">
                          ₹{item.spent.toLocaleString('en-IN')} / ₹{item.limit.toLocaleString('en-IN')}
                        </p>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full ${
                              pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-[#10B981]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {previewTab === 'ai' && (
                <div className="pt-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-semibold text-[#10B981]">
                      Sample Question · &ldquo;How can I save ₹2,000 next month?&rdquo;
                    </p>
                    <p className="text-sm text-[#182230] leading-relaxed">
                      Your top flexible categories this month are Food Delivery (₹4,100) and
                      Entertainment (₹2,300). Reducing food delivery by ₹1,200 and capping weekend
                      outings at ₹1,500 frees up ₹2,000 directly toward your Emergency Fund without
                      cutting fixed rent or metro commute costs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onGetStarted}
                    className="px-4 py-2.5 rounded-lg bg-[#101B35] text-white text-xs font-semibold hover:bg-[#182746] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Try with Your Real Data
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Asymmetric Features & Savings Benefits Section */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-2xl mb-12">
            <h2 className="font-display text-3xl font-bold text-[#101B35] tracking-tight mb-3">
              Designed for Everyday Indian Cashflow
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Whether you manage monthly pocket money, a first salary in Noida, or daily gig
              earnings across Delhi NCR, every tool stays clear and focused.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <Wallet className="w-5 h-5 text-[#10B981] mb-3" />
                  <h3 className="font-display text-lg font-bold text-[#101B35] mb-2">
                    01. Fast Expense &amp; Income Ledger
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Record expenses across Food, Metro/Transport, Education, Bills, and UPI/Cash
                    labels alongside salary, pocket money, or freelance payouts.
                  </p>
                </div>
                <div>
                  <TrendingUp className="w-5 h-5 text-[#10B981] mb-3" />
                  <h3 className="font-display text-lg font-bold text-[#101B35] mb-2">
                    02. Smart 80% &amp; 100% Budget Alerts
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Set monthly overall and category spending limits. Receive immediate warnings at
                    80% utilisation before overspending happens.
                  </p>
                </div>
                <div>
                  <Target className="w-5 h-5 text-[#10B981] mb-3" />
                  <h3 className="font-display text-lg font-bold text-[#101B35] mb-2">
                    03. Goal-First Savings Tracking
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Build dedicated buckets for an Emergency Fund, College Fees, Laptop, or
                    Smartphone with clear target dates and progress milestones.
                  </p>
                </div>
                <div>
                  <Smartphone className="w-5 h-5 text-[#10B981] mb-3" />
                  <h3 className="font-display text-lg font-bold text-[#101B35] mb-2">
                    04. Web + Android Sync
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    One Firebase account powers both your desktop dashboard and native Jetpack
                    Compose Android app with offline persistence.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
              <div className="h-64 bg-slate-100 overflow-hidden">
                {!featureImgError ? (
                  <img
                    src="/src/assets/images/feature_delhi_lifestyle_1795021990159.jpg"
                    alt="Clean Indian workspace with mobile budget tracking"
                    referrerPolicy="no-referrer"
                    onError={() => setFeatureImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#101B35] flex items-center justify-center text-white">
                    <Lock className="w-8 h-8 text-[#10B981]" />
                  </div>
                )}
              </div>
              <div className="p-7 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#101B35] mb-2">
                    Zero Banking Passwords. Full User Ownership.
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    SaveSmart never asks for your UPI PIN, OTP, or net-banking login. Your financial
                    records stay isolated under your verified account with instant JSON/CSV export.
                  </p>
                </div>
                <div className="pt-5">
                  <button
                    type="button"
                    onClick={onGetStarted}
                    className="text-sm font-semibold text-[#101B35] hover:text-[#10B981] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    Create your private ledger
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="bg-white border-y border-slate-200 py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <h2 className="font-display text-3xl font-bold text-[#101B35] tracking-tight mb-3">
                How SaveSmart Works
              </h2>
              <p className="text-base text-slate-600">
                Start in under two minutes with zero complex bank linking.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  step: '01. Sign In Securely',
                  desc: 'Create an individual account with Google Sign-In or verified Email & Password.',
                },
                {
                  step: '02. Log Income & Daily Spends',
                  desc: 'Record pocket money, salary, or gig payouts and categorize daily INR expenses.',
                },
                {
                  step: '03. Set Monthly Budgets & Goals',
                  desc: 'Add category caps and savings targets with automated 80% and 100% alerts.',
                },
                {
                  step: '04. Review Analytics & AI Tips',
                  desc: 'Spot spending leaks with visual charts and ask Gemini AI for practical savings ideas.',
                },
              ].map((item) => (
                <div key={item.step} className="pt-4 border-t border-slate-200">
                  <h3 className="font-display text-base font-bold text-[#101B35] mb-2">
                    {item.step}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gemini AI Financial Assistant Introduction */}
        <section id="ai-assistant" className="max-w-7xl mx-auto px-6 py-20">
          <div className="bg-[#101B35] text-white rounded-2xl p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#D1FAE5] mb-4">
                <Sparkles className="w-4 h-4 text-[#10B981]" />
                <span>Gemini AI Financial Assistant</span>
              </div>
              <h2 className="font-display text-3xl font-bold tracking-tight mb-4 text-white">
                Plain-Language Answers About Your Real Spending
              </h2>
              <p className="text-slate-300 text-base leading-relaxed mb-6">
                Ask SaveSmart AI where your money went this month, how to carve out ₹2,000 for next
                month, or how to structure an emergency savings goal. Responses stay grounded in your
                permitted summary—never recommending risky investments or loans.
              </p>
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#10B981] text-[#101B35] text-sm font-bold hover:bg-[#0ea572] transition-colors cursor-pointer"
              >
                Open AI Assistant
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="lg:col-span-5 bg-[#182746] border border-white/10 rounded-xl p-6 space-y-3">
              <p className="text-xs font-medium text-slate-300">Example prompts inside SaveSmart</p>
              {[
                'Where did I spend the most this month?',
                'How can I save ₹2,000 next month?',
                'Am I following my monthly budget?',
                'Help me create an emergency savings goal.',
              ].map((prompt) => (
                <div
                  key={prompt}
                  className="px-4 py-3 rounded-lg bg-[#101B35]/70 border border-white/10 text-sm text-slate-100"
                >
                  &ldquo;{prompt}&rdquo;
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sample Testimonials (Clearly Labelled) */}
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="mb-10">
            <p className="text-xs font-semibold text-slate-500 mb-2">
              Sample Testimonials · Illustrative Pilot Scenarios Until Public User Reviews Are Collected
            </p>
            <h2 className="font-display text-3xl font-bold text-[#101B35] tracking-tight">
              Built Around Real Delhi NCR Financial Habits
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SAMPLE_STORIES.map((story) => (
              <div
                key={story.name}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
              >
                <p className="text-sm text-[#182230] leading-relaxed mb-6">
                  &ldquo;{story.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3.5 pt-4 border-t border-slate-100">
                  <img
                    src={story.avatar}
                    alt={`${story.name} sample portrait`}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover bg-slate-100 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-bold text-[#101B35]">{story.name}</p>
                    <p className="text-xs text-slate-500">{story.role} (Sample Profile)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Freemium Pricing Section */}
        <section id="pricing" className="bg-white border-y border-slate-200 py-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display text-3xl font-bold text-[#101B35] tracking-tight mb-3">
                Simple, Transparent Pricing
              </h2>
              <p className="text-base text-slate-600">
                Start free forever for everyday tracking. Upgrade only when you want deeper AI
                summaries and extended reports.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#F5F7FA] border border-slate-200 rounded-2xl p-8 flex flex-col justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-600 mb-2">
                    For Students &amp; First-Time Savers
                  </p>
                  <h3 className="font-display text-2xl font-bold text-[#101B35] mb-1">Free Plan</h3>
                  <p className="font-mono text-3xl font-bold text-[#101B35] tabular-nums mb-6">
                    ₹0 <span className="text-sm font-sans font-normal text-slate-500">/ month</span>
                  </p>
                  <ul className="space-y-3 text-sm text-[#182230] mb-8">
                    {[
                      'Full INR expense & income tracking',
                      'Monthly overall & category budgets with alerts',
                      'Savings goals & contribution tracking',
                      'Core spending analytics & CSV/JSON export',
                    ].map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="w-full py-3 rounded-lg bg-[#101B35] text-white text-sm font-semibold hover:bg-[#182746] transition-colors cursor-pointer"
                >
                  Get Started Free
                </button>
              </div>

              <div className="bg-[#101B35] text-white rounded-2xl p-8 flex flex-col justify-between border border-[#182746]">
                <div>
                  <p className="text-sm font-semibold text-[#10B981] mb-2">
                    For Power Savers &amp; Deep Insights
                  </p>
                  <h3 className="font-display text-2xl font-bold text-white mb-1">
                    SaveSmart Premium
                  </h3>
                  <p className="font-mono text-3xl font-bold text-white tabular-nums mb-6">
                    ₹{premiumPriceInr}{' '}
                    <span className="text-sm font-sans font-normal text-slate-300">
                      / month (proposed)
                    </span>
                  </p>
                  <ul className="space-y-3 text-sm text-slate-200 mb-8">
                    {[
                      'Everything in Free Plan',
                      'Advanced multi-month spending & savings trends',
                      'Detailed monthly AI financial summaries',
                      'Personalized Gemini AI budgeting guidance',
                      'Enhanced downloadable financial reports',
                    ].map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={onGetStarted}
                    className="w-full py-3 rounded-lg bg-[#10B981] text-[#101B35] text-sm font-bold hover:bg-[#0ea572] transition-colors cursor-pointer"
                  >
                    Start Free &amp; Preview Premium
                  </button>
                  <p className="text-xs text-slate-300 mt-3 text-center">
                    Billing activates only after payment gateway credentials are configured.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="font-display text-3xl font-bold text-[#101B35] tracking-tight mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="font-semibold text-sm sm:text-base text-[#101B35]">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-[#101B35] text-slate-300 border-t border-[#182746]">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <SaveSmartLogo variant="light" className="mb-2" />
            <p className="text-xs text-slate-400">
              Track Smart. Spend Better. Save More. · Built for Delhi NCR, Ghaziabad, Noida &amp; India.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium">
            <button
              type="button"
              onClick={() => setLegalModal('privacy')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setLegalModal('terms')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Terms &amp; Conditions
            </button>
            <a
              href={WHATSAPP_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#10B981] hover:underline"
            >
              WhatsApp Support (+91 98913 57202)
            </a>
            <span className="text-slate-500">© {new Date().getFullYear()} SaveSmart</span>
          </div>
        </div>
      </footer>

      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      <WhatsAppButton />
    </div>
  );
}
