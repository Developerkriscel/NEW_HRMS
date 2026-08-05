'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { authApi } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import { ROLE_DASHBOARDS } from '@/lib/utils'

// Real DB-backed accounts (not the JWT-bypass /api/auth/dev-login route) so
// the quick-login buttons exercise the actual login path, role resolution,
// and per-tenant Employee lookup during local development.
const QUICK_LOGINS = [
  { label: 'Super Admin', email: 'admin@nexahr.io', password: 'Admin@1234' },
  { label: 'Company Admin', email: 'ayushkumar.nov.2005@gmail.com', password: 'Nexahr@1644' },
  { label: 'HR Manager', email: 'hr@asd.test', password: 'Nexahr@1234' },
  { label: 'Manager', email: 'manager@asd.test', password: 'Nexahr@1234' },
  { label: 'Employee', email: 'employee@asd.test', password: 'Nexahr@1234' },
]

// The generic fallback ('Invalid email or password') is only correct for an
// actual 401 from the server. A timeout or dropped connection never reaches
// the server at all (err.response is undefined) — falling back to the same
// text there wrongly tells the user their credentials are wrong.
function loginErrorMessage(err, fallback) {
  if (err.response?.data?.message) return err.response.data.message
  if (!err.response) return 'Could not reach the server — check your connection and try again'
  return fallback
}

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    await loginWithCredentials(form)
  }

  async function loginWithCredentials(credentials) {
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login(credentials)
      const user = data.data.user
      setAuth(user)
      router.push(ROLE_DASHBOARDS[user.role] || '/login')
    } catch (err) {
      setError(loginErrorMessage(err, 'Invalid email or password'))
    } finally {
      setLoading(false)
    }
  }

  async function loginWithQuickAccount(login) {
    setForm({ email: login.email, password: login.password })
    await loginWithCredentials({ email: login.email, password: login.password })
  }

  return (
    <div className="h-screen w-full bg-[#ececef] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="w-full max-w-5xl h-full max-h-[640px] bg-white rounded-[28px] shadow-[0_30px_80px_-20px_rgba(2,27,161,0.35)] grid grid-cols-1 lg:grid-cols-2 overflow-hidden animate-fade-in">
        {/* Illustration panel */}
        <div className="relative hidden lg:block p-3 min-h-0">
          <div className="relative w-full h-full rounded-[20px] overflow-hidden bg-[#021BA1]">
            <Image
              src="/login2.jpg"
              alt="NexaHR — Empower People. Simplify HR. Grow Together."
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 0px"
            />
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center overflow-hidden min-h-0 px-6 py-[clamp(0.75rem,4vh,2.5rem)] sm:px-14">
          <div className="flex items-center gap-2 mb-[clamp(0.5rem,3vh,2.5rem)]">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <span className="text-white font-black text-sm">N</span>
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">NexaHR</span>
          </div>

          <h1 className="text-[clamp(1.25rem,4vh,1.875rem)] font-bold text-slate-900 tracking-tight">Welcome Back!</h1>
          <p className="text-slate-400 text-sm mt-1 mb-[clamp(0.5rem,3vh,2rem)]">Enter your details to sign in</p>

          {error && (
            <div className="mb-[clamp(0.5rem,2vh,1.25rem)] px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-[clamp(0.6rem,2.5vh,1.5rem)]">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pb-2 bg-transparent border-b border-slate-200 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-700 transition-colors text-sm"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pb-2 pr-8 bg-transparent border-b border-slate-200 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-700 transition-colors text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 text-slate-300 hover:text-slate-500"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-700 focus:ring-0 focus:ring-offset-0"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-xs text-slate-400 hover:text-slate-600">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-primary hover:brightness-110 disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 text-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in...' : 'Log in'}
            </button>
          </form>

          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-[clamp(0.4rem,2vh,1.25rem)] pt-[clamp(0.4rem,1.5vh,1rem)] border-t border-slate-100">
              <p className="text-[11px] font-medium text-slate-400 mb-1.5">Quick login (real DB accounts, dev only)</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_LOGINS.map((login) => (
                  <button
                    key={login.email}
                    type="button"
                    disabled={loading}
                    title={login.email}
                    onClick={() => loginWithQuickAccount(login)}
                    className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 transition-colors"
                  >
                    {login.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
