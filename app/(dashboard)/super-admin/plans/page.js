'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { PermissionDenied } from '@/components/common/PermissionDenied'
import { tenantApi } from '@/services/tenantApi'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

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

  function load() {
    setLoading(true)
    setForbidden(false)
    tenantApi.getPlans()
      .then((res) => setPlans(res.data.data))
      .catch((err) => { if (err.response?.status === 403) setForbidden(true) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
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
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <button key={plan._id} onClick={() => router.push(`/super-admin/plans/${plan._id}`)} className="stat-card flex flex-col text-left">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{plan.name}</h3>
                {!plan.active && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">Archived</span>}
              </div>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 my-2">
                {formatCurrency(plan.price)}<span className="text-sm text-slate-400 font-normal">/{plan.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</span>
              </p>
              <div className="text-xs text-slate-400 space-y-0.5 mb-3">
                <p>{plan.employeeLimit === -1 ? 'Unlimited employees' : `Up to ${plan.employeeLimit} employees`}</p>
                <p>{plan.storageLimitMb} MB storage · {plan.apiQuota === -1 ? 'Unlimited' : plan.apiQuota} API calls/mo</p>
                <p>{plan.integrationLimit === -1 ? 'Unlimited' : plan.integrationLimit} integrations · {plan.retentionTier} retention</p>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400 mt-auto">Manage plan →</span>
            </button>
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
