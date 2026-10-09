'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { PermissionDenied } from '@/components/common/PermissionDenied'
import { platformApi } from '@/services/platformApi'
import { tenantApi } from '@/services/tenantApi'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

export default function SubscriptionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const [data, setData] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [fields, setFields] = useState({})

  function load() {
    setLoading(true)
    setForbidden(false)
    platformApi.getSubscription(id)
      .then((res) => {
        setData(res.data.data)
        if (res.data.data.subscription?.plan) {
          setFields({ planId: res.data.data.subscription.plan._id })
        }
      })
      .catch((err) => { if (err.response?.status === 403) setForbidden(true) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  useEffect(() => {
    tenantApi.getPlans().then((res) => setPlans(res.data.data || [])).catch(() => setPlans([]))
  }, [])

  async function handlePlanChange() {
    if (!fields.planId || !fields.reason?.trim()) return
    setActionLoading(true)
    setActionError('')
    try {
      await platformApi.changeSubscriptionPlan(id, { planId: fields.planId, reason: fields.reason })
      router.push('/super-admin/subscriptions')
    } catch (err) {
      setActionError(err.response?.data?.message || 'Plan change failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (forbidden) return <PermissionDenied requiredPermission="subscription.view" message="You don't have permission to view this subscription." />
  if (loading) return <PageLoader />
  if (!data) return <div className="text-center text-slate-400 py-12">Subscription not found</div>

  const { subscription } = data
  const canManage = hasPermission('subscription.update')

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <div className="page-header border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <button onClick={() => router.push('/super-admin/subscriptions')} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Subscriptions
          </button>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Change Plan for {subscription.tenant?.companyName}</h1>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Current Plan: <strong className="text-slate-700 dark:text-slate-200">{subscription.plan?.name || 'None'}</strong>
            <span className="mx-2">•</span>
            Status: <Badge>{subscription.status}</Badge>
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Select a New Plan</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Choose a new plan to upgrade or downgrade this organization. Changes will be reflected immediately.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-10">
          {plans.map((plan) => {
            const selected = fields.planId === plan._id || (!fields.planId && subscription.plan?._id === plan._id)
            const isCurrent = subscription.plan?._id === plan._id
            return (
              <button
                key={plan._id}
                type="button"
                className={`flex min-h-[300px] flex-col rounded-3xl border bg-white p-6 text-left shadow-sm transition-all dark:bg-slate-950 ${selected ? 'border-blue-500 bg-blue-50/70 ring-4 ring-blue-100 dark:border-blue-500 dark:bg-blue-900/20 dark:ring-blue-900/50 transform scale-[1.02]' : 'border-slate-200 hover:border-blue-200 dark:border-slate-800 hover:shadow-md'}`}
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
          <div className="max-w-2xl bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
            <label className="block mb-3 text-sm font-bold text-slate-900 dark:text-white">Reason for change <span className="text-red-500">*</span></label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Please provide a brief reason for upgrading or downgrading this organization's subscription. This will be logged in their billing history.</p>
            <textarea 
              className="input-field min-h-[100px] w-full resize-none text-sm" 
              placeholder="e.g., Requested upgrade to premium for more users..."
              value={fields.reason || ''}
              onChange={(e) => setFields({ ...fields, reason: e.target.value })}
            />
            
            {actionError && <div className="mt-4 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-4 rounded-xl">{actionError}</div>}
            
            <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button type="button" className="btn-secondary px-6 py-2.5 flex-1 justify-center text-sm" onClick={() => router.push('/super-admin/subscriptions')} disabled={actionLoading}>Cancel</button>
              <button 
                type="button" 
                className="btn-primary px-6 py-2.5 flex-1 justify-center text-sm shadow-md shadow-blue-500/20" 
                disabled={!fields.planId || !fields.reason?.trim() || actionLoading || fields.planId === subscription.plan?._id} 
                onClick={handlePlanChange}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Plan Change
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
