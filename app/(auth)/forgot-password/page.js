'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react'
import { authApi } from '@/services/authApi'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 mx-auto mb-4 flex items-center justify-center">
          <MailCheck className="w-7 h-7 text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
        <p className="text-slate-400 text-sm mb-6">
          If an account exists for <span className="text-slate-300">{email}</span>, we've sent a link to reset your password.
        </p>
        <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">Forgot password?</h2>
      <p className="text-slate-400 text-sm mb-6">Enter your email and we'll send you a reset link.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm"
            placeholder="you@company.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Sending...' : 'Send reset link'}
        </button>

        <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
      </form>
    </div>
  )
}
