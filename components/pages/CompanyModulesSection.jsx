'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Layers3, Lock, Puzzle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { companyApi } from '@/services/companyApi'

function availabilityLabel(module_) {
  if (module_.enabled) return 'Enabled'
  if (module_.planAvailability === 'ADD_ON') return 'Add-on available'
  return 'Upgrade required'
}

function availabilityClass(module_) {
  if (module_.enabled) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (module_.planAvailability === 'ADD_ON') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-slate-100 text-slate-500 border-slate-200'
}

export function CompanyModulesSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadModules() {
    setLoading(true)
    setError('')
    try {
      const res = await companyApi.getModules()
      setData(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load modules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModules()
  }, [])

  const groupedModules = useMemo(() => {
    const groups = {}
    for (const module_ of data?.modules || []) {
      const key = module_.category || 'Workspace'
      groups[key] = groups[key] || []
      groups[key].push(module_)
    }
    return groups
  }, [data?.modules])

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200/70 bg-white/75 p-8 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading enabled modules...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700">
        <div className="flex items-center gap-2 font-bold">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
        <button type="button" onClick={loadModules} className="btn-secondary mt-4">Retry</button>
      </div>
    )
  }

  const summary = data?.summary || {}

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white p-4 text-blue-600 shadow-sm">
              <Puzzle className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight text-slate-950">Modules & Features</h3>
              <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
                Your company modules are controlled by the active subscription plan and platform admin approvals.
              </p>
              <div className="mt-3 inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-blue-700 shadow-sm">
                Current plan: {data?.currentPlan?.name || 'Not assigned'}
              </div>
            </div>
          </div>
          <button type="button" onClick={loadModules} className="btn-secondary self-start lg:self-center">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Total Modules</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{summary.total || 0}</p>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Enabled</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{summary.enabled || 0}</p>
        </div>
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Add-ons</p>
          <p className="mt-2 text-3xl font-black text-amber-700">{summary.availableAddOns || 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Locked</p>
          <p className="mt-2 text-3xl font-black text-slate-700">{summary.upgradeRequired || 0}</p>
        </div>
      </div>

      {Object.entries(groupedModules).map(([category, modules]) => (
        <div key={category} className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-blue-600" />
            <h4 className="text-lg font-black text-slate-900">{category}</h4>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module_) => (
              <div key={module_.key} className={`rounded-3xl border p-5 transition ${module_.enabled ? 'border-emerald-200 bg-white shadow-sm' : 'border-slate-200 bg-slate-50/80'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className={`rounded-2xl p-3 ${module_.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {module_.enabled ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${availabilityClass(module_)}`}>
                    {availabilityLabel(module_)}
                  </span>
                </div>
                <h5 className="mt-4 text-lg font-black text-slate-950">{module_.name}</h5>
                <p className="mt-2 min-h-12 text-sm font-medium leading-6 text-slate-500">{module_.description}</p>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                  {module_.enabled ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Sparkles className="h-4 w-4 text-amber-500" />}
                  {module_.source}
                </div>
                {!!module_.dependencies?.length && (
                  <p className="mt-3 text-xs font-semibold text-slate-400">
                    Requires: {module_.dependencies.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {!data?.modules?.length && (
        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="font-bold text-slate-700">No modules configured yet.</p>
          <p className="mt-1 text-sm text-slate-500">Ask the platform admin to assign modules to this company's plan.</p>
        </div>
      )}
    </div>
  )
}
