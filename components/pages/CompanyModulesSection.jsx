'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Layers3, Lock, Puzzle, RefreshCw, ShieldCheck, Sparkles, Box, Grid } from 'lucide-react'
import { companyApi } from '@/services/companyApi'

function availabilityLabel(module_) {
  if (module_.enabled) return 'Enabled'
  if (module_.planAvailability === 'ADD_ON') return 'Add-on available'
  return 'Upgrade required'
}

function availabilityClass(module_) {
  if (module_.enabled) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
  if (module_.planAvailability === 'ADD_ON') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
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
      <div className="flex justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
        <button type="button" onClick={loadModules} className="mt-2 text-xs underline">Retry</button>
      </div>
    )
  }

  const summary = data?.summary || {}

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <Puzzle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Modules & Features</h3>
            <div className="mt-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
              Current plan: {data?.currentPlan?.name || 'Not assigned'}
            </div>
          </div>
        </div>
        <button type="button" onClick={loadModules} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Modules', value: summary.total || 0, icon: Grid, color: 'blue' },
          { label: 'Enabled', value: summary.enabled || 0, icon: CheckCircle2, color: 'emerald' },
          { label: 'Add-ons', value: summary.availableAddOns || 0, icon: Sparkles, color: 'amber' },
          { label: 'Locked', value: summary.upgradeRequired || 0, icon: Lock, color: 'slate' },
        ].map((stat) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
            emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
            amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
            slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
          }[stat.color]

          return (
            <div key={stat.label} className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/60">
              <div>
                <p className="text-xl font-black leading-none text-slate-900 dark:text-white">{stat.value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClasses}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-4">
        {Object.entries(groupedModules).map(([category, modules]) => (
          <div key={category} className="rounded-3xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/60 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/20">
              <Layers3 className="h-4 w-4 text-slate-400" />
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">{category}</h4>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {modules.map((module_) => (
                <div key={module_.key} className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${!module_.enabled ? 'opacity-75 grayscale-[0.3]' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${module_.enabled ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                      {module_.enabled ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h5 className="text-base font-bold text-slate-900 dark:text-slate-100">{module_.name}</h5>
                      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{module_.description}</p>
                      {!!module_.dependencies?.length && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                          <Box className="h-3 w-3" /> Requires: {module_.dependencies.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end sm:flex-col sm:items-end gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${availabilityClass(module_)}`}>
                      {availabilityLabel(module_)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{module_.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!data?.modules?.length && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <Puzzle className="h-8 w-8" />
          </div>
          <p className="mb-1 text-lg font-bold text-slate-900 dark:text-white">No modules configured yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Ask the platform admin to assign modules to this company's plan.</p>
        </div>
      )}
    </div>
  )
}
