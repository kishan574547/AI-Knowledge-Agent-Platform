import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/Spinner';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base text-text-main flex flex-col justify-between">
      {/* Top Bar with brand & theme switcher */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-text-main text-surface font-mono font-bold text-xs flex items-center justify-center">
            R
          </div>
          <span className="font-semibold text-sm tracking-tight text-text-main">DocuRAG</span>
        </div>
        <ThemeSwitcher />
      </header>

      {/* Main 55/45 Two-Column Layout */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-border bg-surface shadow-level2 overflow-hidden">
          
          {/* Left Column: Form (55% / 7 cols) */}
          <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-text-main">Sign in</h1>
              <p className="text-xs text-text-secondary mt-1.5">
                Access your private workspace and grounded document intelligence.
              </p>
            </div>

            {/* Animated Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 p-3 rounded-lg border-l-4 border-danger bg-danger-tint text-danger text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-main mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-secondary absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full h-11 pl-10 pr-3.5 bg-surface-2 border border-border rounded-lg text-sm text-text-main placeholder-text-secondary/60 focus:bg-surface transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-text-main">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-secondary absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-10 bg-surface-2 border border-border rounded-lg text-sm text-text-main placeholder-text-secondary/60 focus:bg-surface transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-text-secondary hover:text-text-main"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-accent text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border text-center text-xs text-text-secondary">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-accent hover:underline">
                Create an account
              </Link>
            </div>
          </div>

          {/* Right Column: Editorial Panel (45% / 5 cols) */}
          <div className="hidden lg:flex lg:col-span-5 bg-surface-2 p-10 flex-col justify-between border-l border-border relative overflow-hidden">
            {/* Subtle geometric line pattern */}
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            />

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-[11px] font-mono text-text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>Zero-Retention RAG Engine</span>
              </div>
            </div>

            <div className="relative z-10 my-auto">
              <blockquote className="text-lg font-medium leading-snug text-text-main">
                "Ask questions with complete confidence. Every answer links back to the exact passage and source document."
              </blockquote>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-mono font-semibold text-text-main">
                  pg
                </div>
                <div>
                  <div className="text-xs font-semibold text-text-main">PostgreSQL + pgvector</div>
                  <div className="text-[11px] text-text-secondary">Isolated user-scoped retrieval</div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-text-secondary">
              Protected by Supabase Row-Level Security & AES-256
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-[11px] text-text-secondary">
        DocuRAG Platform · Enterprise Multi-Tenant Intelligence
      </footer>
    </div>
  );
};
