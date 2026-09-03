'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, CheckCircle2, Layers, Eye, Edit2, Trash2, Play, Pause, Server, Users, Code, Puzzle } from 'lucide-react'
import { PermissionDenied } from '@/components/common/PermissionDenied'
import { formatCurrency, cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const getTenantApi = async () => (await import('@/services/tenantApi')).tenantApi

const emptyForm = { name: '', description: '', price: 0, billingCycle: 'MONTHLY', employeeLimit: 50, storageLimitMb: 5120, apiQuota: 10000, integrationLimit: 3, gracePeriodDays: 7, trialDays: 14, featuresText: '' }

export default function PlansPage() {
  const router = useRouter()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setForbidden(false)
    try {
      const tenantApi = await getTenantApi()
      const res = await tenantApi.getPlans()
      setPlans(res.data.data)
    } catch (err) {
      if (err.response?.status === 403) setForbidden(true)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const tenantApi = await getTenantApi()
      await tenantApi.createPlan({
        ...form,
        price: Number(form.price),
        employeeLimit: Number(form.employeeLimit),
        storageLimitMb: Number(form.storageLimitMb),
        apiQuota: Number(form.apiQuota),
        integrationLimit: Number(form.integrationLimit),
        gracePeriodDays: Number(form.gracePeriodDays),
        trialDays: Number(form.trialDays),
        features: form.featuresText.split(',').map((f) => f.trim()).filter(Boolean),
      })
      setShowCreate(false)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create plan')
    } finally {
      setSaving(false)
    }
  }

  if (forbidden) return <PermissionDenied requiredPermission="plan.view" message="You don't have permission to view plans." />

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Plans</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage subscription plans, limits and module packaging</p>
        </div>
        {hasPermission('plan.create') && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Create Plan
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><p className="text-slate-400 text-sm font-semibold">Loading plans...</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div key={plan._id} className="bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-200/80 dark:border-slate-800 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex flex-col hover:border-blue-500/30 transition-all duration-300">
              
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">
                    PLAN-{plan._id.substring(0, 6)}
                  </p>
                  <h3 className="font-black text-xl text-slate-900 dark:text-white capitalize">{plan.name}</h3>
                </div>
                <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-indigo-500" />
                </div>
              </div>

              {/* Description Placeholder */}
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                {plan.description || `Optimized subscription plan with ${plan.employeeLimit > 0 ? plan.employeeLimit : 'unlimited'} users capacity and advanced tooling.`}
              </p>

              {/* Price & Status */}
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">Starting from</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-sky-500 dark:text-sky-400 tracking-tight">{formatCurrency(plan.price)}</span>
                    <span className="text-xs font-bold text-slate-400">/{plan.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</span>
                  </div>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  plan.active !== false 
                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50" 
                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                )}>
                  {plan.active !== false ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-2.5 flex flex-col justify-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Users className="w-3 h-3" /> USERS</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">{plan.employeeLimit === -1 ? 'Unlimited' : plan.employeeLimit}</p>
                </div>
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-2.5 flex flex-col justify-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Server className="w-3 h-3" /> STORAGE</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">{plan.storageLimitMb} <span className="text-[10px]">MB</span></p>
                </div>
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-2.5 flex flex-col justify-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Code className="w-3 h-3" /> API CALLS</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">{plan.apiQuota === -1 ? 'Unlimited' : plan.apiQuota}</p>
                </div>
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-2.5 flex flex-col justify-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Puzzle className="w-3 h-3" /> APPS</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">{plan.integrationLimit === -1 ? 'Unlimited' : plan.integrationLimit}</p>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-2.5 mb-5 flex-1">
                {(plan.features?.length > 0 ? plan.features.slice(0, 4) : [
                  "Core HR Module", "Employee Management", "Basic Reporting", "Helpdesk Support"
                ]).map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{f}</span>
                  </div>
                ))}
                {plan.features?.length > 4 && (
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 italic pl-6 pt-1">
                    +{plan.features.length - 4} more features
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-auto">
                <button onClick={() => router.push(`/super-admin/plans/${plan._id}`)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button onClick={() => router.push(`/super-admin/plans/${plan._id}`)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-orange-200 dark:border-orange-900/40 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-xs font-bold text-orange-600 dark:text-orange-400 transition-colors">
                  {plan.active !== false ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Resume</>}
                </button>
                <button className="w-10 h-10 flex shrink-0 items-center justify-center rounded-xl border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create Plan</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{error}</div>}
              <input required placeholder="Plan Name" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="Description" className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input required type="number" placeholder="Price" className="input-field" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <select className="input-field" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Employee Limit (-1=unlimited)" className="input-field" value={form.employeeLimit} onChange={(e) => setForm({ ...form, employeeLimit: e.target.value })} />
                <input type="number" placeholder="Storage (MB)" className="input-field" value={form.storageLimitMb} onChange={(e) => setForm({ ...form, storageLimitMb: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="API Quota/mo" className="input-field" value={form.apiQuota} onChange={(e) => setForm({ ...form, apiQuota: e.target.value })} />
                <input type="number" placeholder="Integration Limit" className="input-field" value={form.integrationLimit} onChange={(e) => setForm({ ...form, integrationLimit: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Trial Days" className="input-field" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} />
                <input type="number" placeholder="Grace Period Days" className="input-field" value={form.gracePeriodDays} onChange={(e) => setForm({ ...form, gracePeriodDays: e.target.value })} />
              </div>
              <input placeholder="Features (comma separated)" className="input-field" value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} />
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                {saving ? 'Creating...' : 'Create'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
