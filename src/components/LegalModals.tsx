import { X, ShieldCheck, FileText } from 'lucide-react';

export function LegalModal({
  type,
  onClose,
}: {
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}) {
  if (!type) return null;

  const isPrivacy = type === 'privacy';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#101B35]/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            {isPrivacy ? (
              <ShieldCheck className="w-5 h-5 text-[#10B981]" />
            ) : (
              <FileText className="w-5 h-5 text-[#101B35]" />
            )}
            <h2 id="legal-modal-title" className="text-lg font-bold text-[#101B35]">
              {isPrivacy ? 'SaveSmart Privacy Policy' : 'SaveSmart Terms & Conditions'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-500 hover:text-[#101B35] hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-sm text-[#182230] leading-relaxed">
          {isPrivacy ? (
            <>
              <p className="text-xs text-slate-500">
                Effective Date: November 2026 · Jurisdiction: India (IST / Asia/Kolkata)
              </p>
              <section className="space-y-2">
                <h3 className="font-semibold text-[#101B35]">1. What We Collect & Store</h3>
                <p>
                  SaveSmart stores your account details (name, email, city, preferences) and the
                  personal financial records you explicitly enter (INR expenses, income, monthly
                  budgets, and savings goals) inside user-isolated Cloud Firestore collections.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-[#101B35]">
                  2. Zero Banking Credentials Policy
                </h3>
                <p>
                  SaveSmart NEVER requests, collects, or stores UPI PINs, bank passwords, debit or
                  credit card PINs, CVVs, net-banking credentials, or OTPs. The MVP does not connect
                  to bank accounts or execute payment transfers.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-[#101B35]">3. Data Isolation & AI Privacy</h3>
                <p>
                  Every financial record is strictly bound to your authenticated user ID via
                  Firestore Security Rules. Administrators cannot inspect your private transactions.
                  When you use the Gemini AI Financial Assistant, only aggregated monthly summaries
                  are transmitted if you enable AI Context Sharing in Settings.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-[#101B35]">4. Data Export & Account Deletion</h3>
                <p>
                  You can export your complete financial ledger in JSON or CSV format at any time or
                  permanently delete your account and all subcollections from Settings.
                </p>
              </section>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Effective Date: November 2026 · SaveSmart Personal Finance Platform
              </p>
              <section className="space-y-2">
                <h3 className="font-semibold text-[#101B35]">1. Personal Budgeting Purpose</h3>
                <p>
                  SaveSmart is a personal expense tracking, budgeting, and savings planning tool
                  designed for individuals in India using Indian Rupees (INR ₹).
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-[#101B35]">2. No Regulated Financial Advice</h3>
                <p>
                  SaveSmart and its AI Financial Assistant provide educational budgeting suggestions
                  based on your logged habits. SaveSmart does not provide SEBI-registered investment
                  advice, loan underwriting, or tax filing services, and never guarantees financial
                  returns.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-[#101B35]">3. Freemium & Subscription Terms</h3>
                <p>
                  The SaveSmart Free Plan includes core expense, income, budget, and savings goal
                  tracking. SaveSmart Premium (proposed at ₹99/month) is enabled only when an
                  authorized payment gateway is configured; no charges are processed in pilot mode.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold text-[#101B35]">4. User Responsibilities</h3>
                <p>
                  You are responsible for keeping your Firebase login credentials secure and
                  verifying your email address before syncing financial records.
                </p>
              </section>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-[#F5F7FA] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#101B35] text-white text-sm font-medium hover:bg-[#182746] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
