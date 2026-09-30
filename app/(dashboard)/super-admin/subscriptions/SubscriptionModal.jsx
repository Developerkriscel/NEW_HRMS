'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Portal } from '@/components/common/Portal'
import { platformApi } from '@/services/platformApi'
import { tenantApi } from '@/services/tenantApi'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

export function SubscriptionModal({ open, onClose, subscriptionId, onSuccess }) {
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const [data, setData] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [fields, setFields] = useState({})

  useEffect(() => {
    if (open && subscriptionId) {
      setLoading(true)
      setForbidden(false)
      setFields({})
      setActionError('')
      platformApi.getSubscription(subscriptionId)
        .then((res) => {
          setData(res.data.data)
          if (res.data.data.subscription?.plan) {
            setFields({ planId: res.data.data.subscription.plan._id })
          }
        })
        .catch((err) => { if (err.response?.status === 403) setForbidden(true) })
        .finally(() => setLoading(false))
    }
  }, [open, subscriptionId])

  useEffect(() => {
    if (open && plans.length === 0) {
      tenantApi.getPlans().then((res) => setPlans(res.data.data || [])).catch(() => setPlans([]))
    }
  }, [open, plans.length])

  async function handlePlanChange() {
    if (!fields.planId || !fields.reason?.trim()) return
    setActionLoading(true)
    setActionError('')
    try {
      await platformApi.changeSubscriptionPlan(subscriptionId, { planId: fields.planId, reason: fields.reason })
      onSuccess()
    } catch (err) {
      setActionError(err.response?.data?.message || 'Plan change failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (!open) return null

  const canManage = hasPermission('subscription.update')

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
        <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-7xl max-h-[95vh] overflow-y-auto rounded-[32px] shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 relative">
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white dark:bg-slate-900 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors shadow-sm border border-slate-200 dark:border-slate-800 z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : forbidden ? (
            <div className="flex flex-col items-center justify-center h-96">
              <p className="text-sm font-bold text-slate-500">You don't have permission to view this subscription.</p>
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-sm font-bold text-slate-400">Subscription not found</p>
            </div>
          ) : (
            <>
              <div className="p-8 pb-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-0 rounded-t-[32px]">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Change Plan for {data.subscription.tenant?.companyName}</h1>
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Current Plan: <strong className="text-slate-700 dark:text-slate-200">{data.subscription.plan?.name || 'None'}</strong>
                  <span className="mx-2">•</span>
                  Status: <Badge>{data.subscription.status}</Badge>
                </p>
              </div>

              <div className="p-8 overflow-y-auto">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Select a New Plan</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Choose a new plan to upgrade or downgrade this organization. Changes will be reflected immediately.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-10">
                  {plans.map((plan) => {
                    const selected = fields.planId === plan._id || (!fields.planId && data.subscription.plan?._id === plan._id)
                    const isCurrent = data.subscription.plan?._id === plan._id
                    return (
                      <button
                        key={plan._id}
                        type="button"
                        className={`flex min-h-[300px] flex-col rounded-3xl border bg-white p-6 text-left shadow-sm transition-all dark:bg-slate-900 ${selected ? 'border-blue-500 bg-blue-50/70 ring-4 ring-blue-100 dark:border-blue-500 dark:bg-blue-900/20 dark:ring-blue-900/50 transform scale-[1.02]' : 'border-slate-200 hover:border-blue-200 dark:border-slate-800 hover:shadow-md'}`}
                        onClick={() => setFields({ ...fields, planId: plan._id })}
                        disabled={!canManage}
                      >
                        <div className="flex items-start justify-between gap-3 w-full">
                          <div>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{plan.name}</p>
                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{plan.description || 'Subscription plan'}</p>
                          </div>
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-300 dark:border-slate-700'}`}>
                            {selected ? <Check className="h-4 w-4" /> : null}
                          </span>
                        </div>
                        <div className="mt-6">
                          <p className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(plan.price, 'INR')}</p>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">Per {plan.billingCycle || 'MONTHLY'}</p>
                        </div>
                        <div className="mt-6 flex-1 space-y-3">
                          <p className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> {plan.employeeLimit === -1 ? 'Unlimited' : plan.employeeLimit} users</p>
                          <p className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> {plan.storageLimitMB === -1 ? 'Unlimited' : plan.storageLimitMB} MB storage</p>
                          <p className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> {plan.features?.length > 0 ? `${plan.features.length} modules included` : 'Standard modules included'}</p>
                        </div>
                        <div className={`mt-6 text-center text-sm font-bold w-full py-2 rounded-xl ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                          {isCurrent ? 'Current Plan' : selected ? 'Selected for Upgrade' : 'Select Plan'}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {canManage && (
                  <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <label className="block mb-3 text-sm font-bold text-slate-900 dark:text-white">Reason for change <span className="text-red-500">*</span></label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Please provide a brief reason for upgrading or downgrading this organization's subscription. This will be logged in their billing history.</p>
                    <textarea 
                      className="input-field min-h-[100px] w-full resize-none text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border-slate-200/60 focus:bg-white" 
                      placeholder="e.g., Requested upgrade to premium for more users..."
                      value={fields.reason || ''}
                      onChange={(e) => setFields({ ...fields, reason: e.target.value })}
                    />
                    
                    {actionError && <div className="mt-4 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-4 rounded-xl">{actionError}</div>}
                    
                    <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                      <button type="button" className="btn-secondary px-6 py-3 flex-1 justify-center text-sm" onClick={onClose} disabled={actionLoading}>Cancel</button>
                      <button 
                        type="button" 
                        className="btn-primary px-6 py-3 flex-1 justify-center text-sm shadow-md shadow-blue-500/20" 
                        disabled={!fields.planId || !fields.reason?.trim() || actionLoading || fields.planId === data.subscription.plan?._id} 
                        onClick={handlePlanChange}
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Confirm Plan Change
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  )
}
