'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff, Sparkles, Shield, Building2, UserCheck, Users, Briefcase, DollarSign, Terminal } from 'lucide-react'

const ROLE_DASHBOARDS = {
  SUPER_ADMIN: '/super-admin/dashboard',
  COMPANY_ADMIN: '/company/dashboard',
  HR_MANAGER: '/hr/dashboard',
  MANAGER: '/manager/dashboard',
  EMPLOYEE: '/employee/dashboard',
  FINANCE: '/hr/dashboard',
  IT_ADMIN: '/hr/dashboard',
}

const QUICK_LOGINS = [
  { label: 'Super Admin', email: 'admin@nexahr.io', password: 'Password@123', icon: Shield, color: 'from-blue-600 to-indigo-600 text-blue-700 bg-blue-50/80 border-blue-200' },
  { label: 'Company Admin', email: 'admin@acme.com', password: 'Password@123', icon: Building2, color: 'from-emerald-600 to-teal-600 text-emerald-700 bg-emerald-50/80 border-emerald-200' },
  { label: 'HR Manager', email: 'hr@acme.com', password: 'Password@123', icon: UserCheck, color: 'from-purple-600 to-pink-600 text-purple-700 bg-purple-50/80 border-purple-200' },
  { label: 'Manager', email: 'manager@acme.com', password: 'Password@123', icon: Users, color: 'from-amber-600 to-orange-600 text-amber-700 bg-amber-50/80 border-amber-200' },
  { label: 'Employee', email: 'employee@acme.com', password: 'Password@123', icon: Briefcase, color: 'from-sky-600 to-cyan-600 text-sky-700 bg-sky-50/80 border-sky-200' },
  { label: 'Finance', email: 'finance@acme.com', password: 'Password@123', icon: DollarSign, color: 'from-rose-600 to-red-600 text-rose-700 bg-rose-50/80 border-rose-200' },
  { label: 'IT Admin', email: 'itadmin@acme.com', password: 'Password@123', icon: Terminal, color: 'from-slate-700 to-slate-900 text-slate-700 bg-slate-100 border-slate-300' },
]

function loginErrorMessage(err, fallback) {
  if (err.message) return err.message
  if (err.response?.data?.message) return err.response.data.message
  if (!err.response) return 'Could not reach the server — check your connection and try again'
  return fallback
}

async function postAuth(path, body) {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || 'Invalid email or password')
  }
  return data
}

export default function LoginPage() {
  const router = useRouter()
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
      const data = await postAuth('login', { email: credentials.email, password: credentials.password })
      const user = data.data.user
      const { useAuthStore } = await import('@/store/authStore')
      useAuthStore.getState().setAuth(user)
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
    <div className="min-h-screen w-full bg-[#f4f6fb] dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decorative Glow Circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-6xl min-h-[600px] lg:min-h-[700px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-[0_20px_70px_rgba(15,23,42,0.12)] border border-slate-100 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 overflow-hidden z-10">
        
        {/* Left Visual Branding Panel (Restored Image) */}
        <div className="lg:col-span-5 relative hidden lg:block p-4 min-h-0">
          <div className="relative w-full h-full rounded-[20px] overflow-hidden bg-[#021BA1] shadow-inner">
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

        {/* Right Form Panel */}
        <div className="lg:col-span-7 flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="max-w-md w-full mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 lg:hidden mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">N</div>
                <span className="font-bold text-slate-900 dark:text-white">NexaHR</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Welcome Back
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">
                Sign in to your organization workspace
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2.5 animate-shake">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Keep me logged in</span>
                </label>
                <Link href="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              </button>
            </form>

            {/* Quick Login Section */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Sign In</span>
                  <span className="text-[11px] text-slate-400">Click to fill & login</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {QUICK_LOGINS.map((login) => {
                    const Icon = login.icon
                    return (
                      <button
                        key={login.email}
                        type="button"
                        disabled={loading}
                        title={login.email}
                        onClick={() => loginWithQuickAccount(login)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all hover:scale-[1.02] hover:shadow-sm ${login.color}`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{login.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
