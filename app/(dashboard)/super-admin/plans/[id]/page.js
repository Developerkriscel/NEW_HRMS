'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { tenantApi } from '@/services/tenantApi'
import { platformApi } from '@/services/platformApi'
import { useAuthStore } from '@/store/authStore'

const AVAILABILITY_OPTIONS = ['UNAVAILABLE', 'ADD_ON', 'INCLUDED']
const AVAILABILITY_STYLE = {
  UNAVAILABLE: 'bg-slate-100 text-slate-400 dark:bg-slate-800',
  ADD_ON: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  INCLUDED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

export default function PlanDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const [plan, setPlan] = useState(null)
  const [limits, setLimits] = useState(null)
  const [modules, setModules] = useState([])
  const [mapping, setMapping] = useState({}) // moduleId -> availability
  const [loading, setLoading] = useState(true)
  const [savingLimits, setSavingLimits] = useState(false)
  const [savingModules, setSavingModules] = useState(false)
  const [message, setMessage] = useState('')

  function load() {
    setLoading(true)
    Promise.all([tenantApi.getPlans(), platformApi.getModules(), platformApi.getPlanModules(id)])
      .then(([plansRes, modulesRes, mapRes]) => {
        const found = plansRes.data.data.find((p) => p._id === id)
        setPlan(found)
        setLimits(found ? {
          employeeLimit: found.employeeLimit, storageLimitMb: found.storageLimitMb,
          apiQuota: found.apiQuota, integrationLimit: found.integrationLimit,
          gracePeriodDays: found.gracePeriodDays, retentionTier: found.retentionTier,
        } : null)
        setModules(modulesRes.data.data || [])
        const map = {}
        for (const row of mapRes.data.data || []) map[row.module._id] = row.availability
        setMapping(map)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [id])

  async function saveLimits() {
    setSavingLimits(true)
    setMessage('')
    try {
      await tenantApi.updatePlan(id, limits)
      setMessage('Limits saved')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save limits')
    } finally {
      setSavingLimits(false)
    }
  }

  async function saveModules() {
    setSavingModules(true)
    setMessage('')
    try {
      const mappings = modules.map((m) => ({ moduleId: m._id, availability: mapping[m._id] || 'UNAVAILABLE' }))
      await platformApi.setPlanModules(id, mappings)
      setMessage('Module map saved')
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save module map')
    } finally {
      setSavingModules(false)
    }
  }

  function cycleAvailability(moduleId) {
    const current = mapping[moduleId] || 'UNAVAILABLE'
    const next = AVAILABILITY_OPTIONS[(AVAILABILITY_OPTIONS.indexOf(current) + 1) % AVAILABILITY_OPTIONS.length]
    setMapping((m) => ({ ...m, [moduleId]: next }))
  }

  if (loading) return <PageLoader />
  if (!plan) return <div className="text-center text-slate-400 py-12">Plan not found</div>

  const canManage = hasPermission('plan.update')

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <button onClick={() => router.push('/super-admin/plans')} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to plans
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{plan.name}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{plan.description}</p>
        </div>
      </div>

      {message && <div className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg p-3">{message}</div>}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Plan Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Employee Limit</span>
            <input type="number" className="input-field" disabled={!canManage} value={limits.employeeLimit} onChange={(e) => setLimits({ ...limits, employeeLimit: Number(e.target.value) })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Storage (MB)</span>
            <input type="number" className="input-field" disabled={!canManage} value={limits.storageLimitMb} onChange={(e) => setLimits({ ...limits, storageLimitMb: Number(e.target.value) })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">API Quota / month</span>
            <input type="number" className="input-field" disabled={!canManage} value={limits.apiQuota} onChange={(e) => setLimits({ ...limits, apiQuota: Number(e.target.value) })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Integration Limit</span>
            <input type="number" className="input-field" disabled={!canManage} value={limits.integrationLimit} onChange={(e) => setLimits({ ...limits, integrationLimit: Number(e.target.value) })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Grace Period (days)</span>
            <input type="number" className="input-field" disabled={!canManage} value={limits.gracePeriodDays} onChange={(e) => setLimits({ ...limits, gracePeriodDays: Number(e.target.value) })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Retention Tier</span>
            <select className="input-field" disabled={!canManage} value={limits.retentionTier} onChange={(e) => setLimits({ ...limits, retentionTier: e.target.value })}>
              <option value="STANDARD">Standard</option>
              <option value="EXTENDED">Extended</option>
              <option value="COMPLIANCE">Compliance</option>
            </select>
          </label>
        </div>
        {canManage && (
          <button className="btn-primary mt-4" onClick={saveLimits} disabled={savingLimits}>
            {savingLimits ? 'Saving...' : 'Save Limits'}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Module Availability</h3>
          <p className="text-xs text-slate-400">Click a module to cycle Unavailable → Add-on → Included</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {modules.map((mod) => {
            const availability = mapping[mod._id] || 'UNAVAILABLE'
            return (
              <button
                key={mod._id}
                type="button"
                disabled={!canManage}
                onClick={() => cycleAvailability(mod._id)}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${AVAILABILITY_STYLE[availability]}`}
              >
                <span className="flex items-center gap-2">
                  {availability === 'INCLUDED' && <Check className="w-3.5 h-3.5" />}
                  <span>
                    <span className="block font-medium">{mod.name}</span>
                    {mod.dependencies?.length > 0 && <span className="block text-xs opacity-70">needs {mod.dependencies.join(', ')}</span>}
                  </span>
                </span>
                <span className="text-xs font-medium uppercase tracking-wide">{availability.replace('_', ' ')}</span>
              </button>
            )
          })}
        </div>
        {canManage && (
          <button className="btn-primary mt-4" onClick={saveModules} disabled={savingModules}>
            {savingModules ? 'Saving...' : 'Save Module Map'}
          </button>
        )}
      </div>
    </div>
  )
}
