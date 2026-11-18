import { Smartphone, CheckCircle2, Layers, Database, Shield } from 'lucide-react';

export function AndroidCompanionView() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#101B35] tracking-tight">
          SaveSmart Native Android Companion
        </h1>
        <p className="text-sm text-slate-600">
          Kotlin + Jetpack Compose mobile project sharing your exact Firebase Authentication and
          Cloud Firestore ledger.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <Smartphone className="w-5 h-5 text-[#10B981] mb-2.5" />
          <h2 className="font-display text-sm font-bold text-[#101B35] mb-1">Package &amp; App</h2>
          <p className="font-mono text-xs text-slate-600">in.savesmart.app</p>
          <p className="text-xs text-slate-500 mt-1">App Name: SaveSmart · Splash + Compose UI</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <Database className="w-5 h-5 text-[#10B981] mb-2.5" />
          <h2 className="font-display text-sm font-bold text-[#101B35] mb-1">Shared Firebase</h2>
          <p className="font-mono text-xs text-slate-600">hip-mountain-8f6jr</p>
          <p className="text-xs text-slate-500 mt-1">
            Reads &amp; writes users/{'{uid}'}/expenses, income, budgets, goals
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <Shield className="w-5 h-5 text-[#10B981] mb-2.5" />
          <h2 className="font-display text-sm font-bold text-[#101B35] mb-1">
            Bottom Navigation
          </h2>
          <p className="text-xs text-slate-600">Home · Expenses · Goals · Analytics · Profile</p>
          <p className="text-xs text-slate-500 mt-1">Plus Budgets, Income &amp; AI Assistant</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#10B981]" />
          <h2 className="font-display text-base font-bold text-[#101B35]">
            Companion Project Included in Repository
          </h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          The complete Kotlin + Jetpack Compose Android source code is included under the{' '}
          <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs">
            /android-companion
          </code>{' '}
          directory in this project workspace.
        </p>

        <ul className="space-y-2.5 text-sm text-[#182230]">
          {[
            'Splash screen & Material 3 SaveSmartTheme (#101B35 Navy, #10B981 Emerald, #F5F7FA Canvas)',
            'Google Sign-In & Email/Password AuthViewModel wired to Firebase Auth',
            'SaveSmartRepository reading the named Firestore database (ai-studio-9b77afd0-b35e-4b29-890a-328841dbecb6)',
            'Jetpack Compose screens for Home, Expenses, Income, Budgets, Goals, Analytics, AI Assistant, and Profile',
            'FCM Notification service & AndroidManifest permissions ready for debug APK and signed AAB builds',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
