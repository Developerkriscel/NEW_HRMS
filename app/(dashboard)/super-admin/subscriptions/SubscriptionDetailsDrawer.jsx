import { useEffect, useState } from 'react'
import { X, Calendar, CreditCard, Building2, ShieldCheck, Activity } from 'lucide-react'
import { platformApi } from '@/services/platformApi'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/common/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export function SubscriptionDetailsDrawer({ subscriptionId, isOpen, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && subscriptionId) {
      setLoading(true)
      platformApi.getSubscription(subscriptionId)
        .then((res) => setData(res.data.data))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [isOpen, subscriptionId])

  if (!isOpen) return null

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
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Subscription Details</h2>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{data?.subscription?.tenant?.companyName || 'Loading...'}</p>
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
            {loading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : data && data.subscription ? (
              <>
                {/* Subscription Status */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    Status & Plan
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</div>
                      <Badge variant={data.subscription.status === 'ACTIVE' ? 'success' : data.subscription.status === 'TRIAL' ? 'warning' : data.subscription.status === 'CANCELLED' ? 'error' : 'default'}>
                        {data.subscription.status}
                      </Badge>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Current Plan</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{data.subscription.plan?.name || 'No Plan'}</div>
                    </div>
                  </div>
                </div>

                {/* Tenant Details */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-500" />
                    Tenant Info
                  </h3>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Company Name</div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{data.subscription.tenant?.companyName || 'Unknown'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tenant Code</div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase">{data.subscription.tenant?.tenantCode || 'Unknown'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lifecycle */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    Lifecycle & Dates
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Start Date</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatDate(data.subscription.startDate)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Auto Renew</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{data.subscription.autoRenew ? 'Yes' : 'No'}</div>
                    </div>
                    {data.subscription.status === 'TRIAL' && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 col-span-2">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Trial Ends At</div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatDate(data.subscription.trialEndsAt)}</div>
                      </div>
                    )}
                    {data.subscription.status === 'GRACE' && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 col-span-2">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Grace Ends At</div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatDate(data.subscription.graceEndsAt)}</div>
                      </div>
                    )}
                  </div>
                </div>

              </>
            ) : (
              <div className="flex justify-center py-10"><p className="text-slate-400 text-sm font-semibold">Subscription not found.</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
