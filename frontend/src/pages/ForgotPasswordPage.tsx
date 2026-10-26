import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/authService';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

type Step = 'EMAIL' | 'OTP' | 'PASSWORD' | 'SUCCESS';

export const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 6 separate OTP input boxes
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();

  // Resend Countdown
  useEffect(() => {
    let timer: any;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Requirement checks
  const checks = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'At least one number or symbol', met: /[0-9!@#$%^&*]/.test(newPassword) },
    { label: 'Passwords match', met: newPassword.length > 0 && newPassword === confirmPassword },
  ];

  // Step 1: Request OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authService.sendPasswordResetOtp(email.trim());
      setStep('OTP');
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      verifyOtpCode(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(paste)) return;

    const digits = paste.split('');
    setOtpDigits(digits);
    otpInputRefs.current[5]?.focus();
    verifyOtpCode(paste);
  };

  const verifyOtpCode = async (code: string) => {
    setError(null);
    setLoading(true);

    try {
      await authService.verifyPasswordResetOtp(email.trim(), code);
      setStep('PASSWORD');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError(null);
    try {
      await authService.sendPasswordResetOtp(email.trim());
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    }
  };

  // Step 3: Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await authService.updatePassword(newPassword);
      setStep('SUCCESS');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* 3-Step Indicator */}
      <div className="flex items-center justify-between gap-1 mb-6">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
              step === 'EMAIL' ? 'bg-accent text-text-on-accent' : 'bg-success text-white'
            }`}
          >
            {step === 'EMAIL' ? '1' : '✓'}
          </div>
          <span className="text-[11px] font-semibold text-text-main hidden sm:inline">Email</span>
        </div>

        <div className="w-6 h-[1px] bg-border" />

        <div className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
              step === 'OTP'
                ? 'bg-accent text-text-on-accent'
                : step === 'PASSWORD' || step === 'SUCCESS'
                ? 'bg-success text-white'
                : 'bg-surface-2 text-text-muted border border-border'
            }`}
          >
            {step === 'PASSWORD' || step === 'SUCCESS' ? '✓' : '2'}
          </div>
          <span className={`text-[11px] font-semibold hidden sm:inline ${step === 'OTP' ? 'text-text-main' : 'text-text-muted'}`}>
            Verify
          </span>
        </div>

        <div className="w-6 h-[1px] bg-border" />

        <div className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
              step === 'PASSWORD' || step === 'SUCCESS'
                ? 'bg-accent text-text-on-accent'
                : 'bg-surface-2 text-text-muted border border-border'
            }`}
          >
            3
          </div>
          <span className={`text-[11px] font-semibold hidden sm:inline ${step === 'PASSWORD' ? 'text-text-main' : 'text-text-muted'}`}>
            Password
          </span>
        </div>
      </div>

      {/* Server Error Banner with Left Accent Bar */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="flex items-start gap-2.5 p-3 rounded-md border-l-4 border-danger bg-danger-muted text-danger text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'EMAIL' && (
          <motion.div
            key="step-email"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-6 text-left">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-text-main">
                Reset password
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                Enter your email to receive a 6-digit recovery code.
              </p>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                className="mt-2"
              >
                Send Reset Code
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border text-center text-xs text-text-secondary">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold text-accent hover:underline">
                Sign in
              </Link>
            </div>
          </motion.div>
        )}

        {step === 'OTP' && (
          <motion.div
            key="step-otp"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={() => setStep('EMAIL')}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-main mb-4 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change email</span>
            </button>

            <div className="mb-6 text-left">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-text-main">
                Enter 6-digit recovery code
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                We sent a password recovery code to <span className="font-mono text-text-main font-semibold">{email}</span>.
              </p>
            </div>

            {/* 6-box OTP with paste */}
            <div className="flex items-center justify-between gap-2 my-6">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={handleOtpPaste}
                  className="w-11 h-12 sm:w-12 sm:h-13 text-center text-lg font-mono font-bold rounded-md border border-border bg-surface-2 text-text-main focus:border-accent focus:bg-surface transition-all"
                />
              ))}
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={otpDigits.includes('')}
              onClick={() => verifyOtpCode(otpDigits.join(''))}
            >
              Verify Code
            </Button>

            <div className="mt-6 text-center text-xs text-text-secondary">
              {countdown > 0 ? (
                <span>
                  Resend code in <strong className="font-mono text-text-main">{countdown}s</strong>
                </span>
              ) : (
                <button
                  onClick={handleResend}
                  className="font-semibold text-accent hover:underline"
                >
                  Resend code now
                </button>
              )}
            </div>
          </motion.div>
        )}

        {step === 'PASSWORD' && (
          <motion.div
            key="step-password"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-6 text-left">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-text-main">
                Set new password
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                Create a strong, unique password for your account.
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <Input
                label="New password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Input
                label="Confirm new password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
              />

              {/* Requirement Checklist */}
              <div className="space-y-1.5 pt-1">
                {checks.map((chk, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                        chk.met
                          ? 'bg-success-muted text-success'
                          : 'bg-surface-2 text-text-muted border border-border'
                      }`}
                    >
                      {chk.met ? '✓' : ''}
                    </div>
                    <span className={chk.met ? 'text-text-main' : 'text-text-secondary'}>
                      {chk.label}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                className="mt-3"
              >
                Update Password
              </Button>
            </form>
          </motion.div>
        )}

        {step === 'SUCCESS' && (
          <motion.div
            key="step-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-10 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-success-muted text-success flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="font-heading text-xl font-bold text-text-main">Password Updated</h2>
            <p className="text-xs text-text-secondary mt-1">
              Your password has been changed. Redirecting to login...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};
