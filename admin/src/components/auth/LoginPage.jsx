import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError('')

    try {
      await signIn(email, password)
      navigate('/orders', { replace: true })
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : err.message || 'Sign in failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(147,51,234,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-md animate-fadeIn">
        {/* Logo card header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#141414] border border-white/10 mb-4 shadow-xl animate-pulseGlow">
            <span className="text-4xl">🍔</span>
          </div>
          <h1 className="text-3xl font-bold text-[#f0f0f0] tracking-tight">Park N Munch</h1>
          <p className="text-[#a0a0a0] text-sm mt-1 tracking-widest uppercase">Admin Console</p>
        </div>

        {/* Login card */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-[#f0f0f0] mb-6">Sign in to continue</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-[#a0a0a0] mb-1.5" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@parknmunch.com"
                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 text-[#f0f0f0] placeholder-[#555] focus:border-[#9333ea]/60 focus:ring-1 focus:ring-[#9333ea]/30 transition-all text-sm"
                disabled={loading}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-[#a0a0a0] mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 text-[#f0f0f0] placeholder-[#555] focus:border-[#9333ea]/60 focus:ring-1 focus:ring-[#9333ea]/30 transition-all text-sm"
                disabled={loading}
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <span className="text-red-400 text-sm leading-snug">⚠ {error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#9333ea] hover:bg-[#7e22ce] active:bg-[#6b21a8] text-white font-semibold py-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-purple-900/30"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[#555] text-xs mt-6">
          Park N Munch Admin v1.0 · Authorised personnel only
        </p>
      </div>
    </div>
  )
}
