'use client'; // Enables client-side rendering in Next.js 13+ app directory

import { useState } from 'react';
import { auth } from '../services/api'; // Custom API service for login/register
import { useRouter } from 'next/navigation'; // For programmatic navigation

export default function LoginPage() {
  // State variables to manage user input and app state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false); // toggle login/register mode

  const router = useRouter(); // Next.js router for navigation

  // Handle form submission for both login and registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior
    setError('');
    setIsLoading(true); // Show loading spinner or disable button

    try {
      // Registration flow
      if (isRegistering) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        console.log('Attempting registration with:', { email });
        await auth.register(email, password);
        console.log('Registration successful, attempting login...');
      }

      // Login flow
      console.log('Attempting login with:', { email });
      const result = await auth.login(email, password);
      console.log('Login successful:', result);

      localStorage.setItem('email', email); // Store email in localStorage
      router.push('/'); // Navigate to home/dashboard
    } catch (err: any) {
      // Set error message depending on the failure type
      if (err.message === 'Passwords do not match') {
        setError(err.message);
      } else {
        setError(
          err.response?.data?.detail ||
            (isRegistering
              ? 'Registration failed. Please try again.'
              : 'Login failed. Please try again.')
        );
      }
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Title and switch between login/register */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRegistering ? 'Create an Account' : 'Sign in to RAG Bot'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {/* Toggle between login/register form */}
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              {isRegistering ? 'Sign in' : 'Register here'}
            </button>
          </p>
        </div>

        {/* Form for login/register */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {/* Email input */}
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password input */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Confirm password field only shown in registration mode */}
            {isRegistering && (
              <div>
                <label htmlFor="confirm-password" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required={isRegistering}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Display error message if any */}
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isLoading
                ? isRegistering
                  ? 'Creating Account...'
                  : 'Signing in...'
                : isRegistering
                ? 'Create Account'
                : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
