import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut,
  type User,
} from 'firebase/auth';
import {
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { SaveSmartLogo } from './SaveSmartLogo';

type AuthMode = 'login' | 'register' | 'reset';

function mapFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Please choose a stronger password with at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Google Sign-In window was closed before completing authentication.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication > Sign-in method). You can use Google Sign-In immediately or enable Email/Password in Firebase Console.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a couple of minutes before trying again.';
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
  }
}

export function AuthView({
  initialMode = 'login',
  onBack,
  unverifiedUser,
  onVerificationRefreshed,
}: {
  initialMode?: AuthMode;
  onBack: () => void;
  unverifiedUser?: User | null;
  onVerificationRefreshed?: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (unverifiedUser) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center items-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8">
          <div className="mb-6">
            <SaveSmartLogo />
          </div>
          <div className="w-11 h-11 rounded-lg bg-[#D1FAE5] text-[#101B35] flex items-center justify-center mb-4">
            <Mail className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-[#101B35] mb-2">
            Verify your email to open your ledger
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            We sent a verification link to <span className="font-semibold text-[#101B35]">{unverifiedUser.email}</span>.
            SaveSmart security rules require a verified email before syncing financial records.
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-[#D1FAE5] border border-[#10B981]/30 text-xs text-[#101B35] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#10B981]" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setErrorMsg(null);
                setSuccessMsg(null);
                try {
                  await unverifiedUser.reload();
                  await unverifiedUser.getIdToken(true);
                  if (unverifiedUser.emailVerified) {
                    onVerificationRefreshed?.();
                  } else {
                    setErrorMsg('Your email is still unverified. Please click the link in your inbox first.');
                  }
                } catch (err) {
                  setErrorMsg(mapFirebaseAuthError(err));
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-[#101B35] text-white text-sm font-medium hover:bg-[#182746] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              I Verified My Email — Continue
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setErrorMsg(null);
                setSuccessMsg(null);
                try {
                  await sendEmailVerification(unverifiedUser);
                  setSuccessMsg('Verification email resent. Please check your inbox and spam folder.');
                } catch (err) {
                  setErrorMsg(mapFirebaseAuthError(err));
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full py-2.5 px-4 rounded-lg border border-slate-200 bg-white text-[#101B35] text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              Resend Verification Email
            </button>

            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="w-full py-2 text-xs text-slate-500 hover:text-[#101B35] transition-colors"
            >
              Sign out and use another account
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (mode === 'reset') {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, trimmedEmail);
        setSuccessMsg('Password reset link sent to your email. Check your inbox to set a new password.');
      } catch (err) {
        setErrorMsg(mapFirebaseAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'register' && fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await updateProfile(cred.user, { displayName: fullName.trim() });
        await sendEmailVerification(cred.user);
        setSuccessMsg('Account created! Please check your email to verify your address.');
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl w-full mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#101B35] transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
        <SaveSmartLogo />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#101B35] tracking-tight mb-1.5">
              {mode === 'login' && 'Welcome back to SaveSmart'}
              {mode === 'register' && 'Create your SaveSmart account'}
              {mode === 'reset' && 'Reset your password'}
            </h1>
            <p className="text-sm text-slate-600">
              {mode === 'login' && 'Sign in to access your INR expenses, budgets, and goals.'}
              {mode === 'register' && 'Start tracking daily expenses and savings goals for free.'}
              {mode === 'reset' && 'Enter your account email and we will send a reset link.'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-[#D1FAE5] border border-[#10B981]/30 text-xs text-[#101B35] flex items-start gap-2.5 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#10B981]" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode !== 'reset' && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 rounded-lg border border-slate-200 bg-white text-[#101B35] text-sm font-medium hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px bg-slate-200 flex-1" />
                <span>or with email</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-xs text-[#10B981] font-medium hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#101B35]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#101B35] text-white text-sm font-semibold hover:bg-[#182746] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' && 'Sign In'}
              {mode === 'register' && 'Create Free Account'}
              {mode === 'reset' && 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 text-center text-xs text-slate-600">
            {mode === 'login' && (
              <>
                New to SaveSmart?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-semibold text-[#101B35] hover:text-[#10B981] transition-colors"
                >
                  Create a free account
                </button>
              </>
            )}
            {mode === 'register' && (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-semibold text-[#101B35] hover:text-[#10B981] transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="font-semibold text-[#101B35] hover:text-[#10B981] transition-colors"
              >
                Return to Sign In
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
