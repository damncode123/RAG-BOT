'use client';

import { useState } from 'react';
import { auth } from '../services/api';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon, SparklesIcon, UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        await auth.register(email, password);
      }

      const result = await auth.login(email, password);
      localStorage.setItem('email', email);
      router.push('/');
    } catch (err) {
      setError(
        err.message === 'Passwords do not match'
          ? err.message
          : err.response?.data?.detail ||
            (isRegistering ? 'Registration failed' : 'Login failed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 relative">
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 gradient-primary transform translate-x-16 -translate-y-16"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-20 gradient-secondary transform -translate-x-16 translate-y-16"></div>
      </div>

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg space-y-6 z-10">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-xl">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">RAG Bot</h2>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h3>
          <p className="text-base text-slate-600 dark:text-slate-300">
            {isRegistering
              ? 'Join the future of AI-powered assistance'
              : 'Sign in to continue your AI journey'}
          </p>
        </div>

        <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
          <div className="flex justify-center mb-6">
            <div className="flex w-full max-w-xs bg-slate-100 dark:bg-slate-700 rounded-2xl p-1">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setError('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className={`flex-1 py-2 font-semibold rounded-xl transition-all text-sm ${
                  !isRegistering
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setError('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className={`flex-1 py-2 font-semibold rounded-xl transition-all text-sm ${
                  isRegistering
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-900 dark:text-white">Email</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  id="email"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-900 dark:text-white">Password</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5 text-slate-400" /> : <EyeIcon className="w-5 h-5 text-slate-400" />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-900 dark:text-white">Confirm Password</label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirm-password"
                    required
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5 text-slate-400" /> : <EyeIcon className="w-5 h-5 text-slate-400" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 text-sm font-medium rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50"
            >
              {isLoading ? (isRegistering ? 'Creating Account...' : 'Signing In...') : (isRegistering ? 'Create Account' : 'Sign In')}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}