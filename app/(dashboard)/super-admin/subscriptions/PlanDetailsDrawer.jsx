import { useEffect, useState } from 'react'
import { X, Layers, Calendar, CreditCard, Building2, Play, Pause, Activity } from 'lucide-react'
import { platformApi } from '@/services/platformApi'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/common/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export function PlanDetailsDrawer({ plan, isOpen, onClose }) {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && plan) {
      setLoading(true)
      // Fetch subscriptions for this specific plan
      platformApi.getSubscriptions({ planId: plan._id, size: 100 })
        .then((res) => setSubscriptions(res.data.data.content))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [isOpen, plan])

  if (!isOpen || !plan) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="absolute inset-y-0 right-0 max-w-lg w-full flex">
        <div className="relative w-full h-full bg-white dark:bg-slate-950 shadow-2xl flex flex-col animate-slide-in-right border-l border-slate-100 dark:border-slate-800">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800/30">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">{plan.name}</h2>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Plan Details & Usage</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Quick Stats */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Plan Overview
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      {plan.active !== false && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${plan.active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {plan.active !== false ? 'Active & Available' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Billing Cycle</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">{plan.billingCycle?.toLowerCase() || 'Monthly'}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 col-span-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{plan.description || 'No description provided.'}</div>
                </div>
              </div>
            </div>

            {/* Subscribed Companies */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-500" />
                  Subscribed Companies
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-200 dark:border-purple-500/20">
                  {subscriptions.length} Total
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                  <div className="p-8 flex justify-center"><LoadingSpinner /></div>
                ) : subscriptions.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm font-semibold text-slate-400">No companies are currently subscribed to this plan.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[400px] overflow-y-auto">
                    {subscriptions.map((sub) => (
                      <div key={sub._id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{sub.tenant?.companyName || 'Unknown Company'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{sub.tenant?.tenantCode}</p>
                          </div>
                          <Badge variant={sub.status === 'ACTIVE' ? 'success' : sub.status === 'TRIAL' ? 'warning' : 'default'}>
                            {sub.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">Started</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatDate(sub.startDate)}</span>
                          </div>
                          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">Valid Until</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {sub.status === 'TRIAL' ? formatDate(sub.trialEndsAt) : sub.status === 'GRACE' ? formatDate(sub.graceEndsAt) : 'Auto-renews'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
