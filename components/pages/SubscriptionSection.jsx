import React, { useEffect, useMemo, useState } from 'react'
import { CreditCard, CheckCircle2, AlertCircle, Zap, Shield, Crown, Users, Receipt, History } from 'lucide-react'
import { companyApi } from '@/services/companyApi'
import { formatCurrency, formatDate } from '@/lib/utils'

const PLAN_ICONS = {
  free: Shield,
  starter: Shield,
  professional: Zap,
  enterprise: Crown,
}

function planIcon(name) {
  return PLAN_ICONS[String(name || '').toLowerCase()] || CreditCard
}

function limitText(value, suffix = '') {
  if (value === -1) return 'Unlimited'
  if (value == null) return '-'
  return `${Number(value).toLocaleString('en-IN')}${suffix}`
}

function statusClass(status) {
  if (status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
  if (status === 'TRIAL') return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20'
  if (status === 'GRACE') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
  return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20'
}

export function SubscriptionSection() {
  const [billingCycle, setBillingCycle] = useState('MONTHLY')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    companyApi.getSubscription()
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load subscription details.'))
      .finally(() => setLoading(false))
  }, [])

  const currentPlan = data?.currentPlan
  const subscription = data?.subscription
  const tenant = data?.tenant

  const filteredPlans = useMemo(() => {
    const plans = data?.plans || []
    const matching = plans.filter((plan) => plan.billingCycle === billingCycle)
    return matching.length ? matching : plans
  }, [data?.plans, billingCycle])

  if (loading) {
    return <div className="py-16 text-center text-sm font-semibold text-slate-400">Loading subscription...</div>
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
        {error}
      </div>
    )
  }

  const status = subscription?.status || tenant?.status || 'NOT_CONFIGURED'
  const daysRemaining = data?.daysRemaining
  const isExpiringSoon = typeof daysRemaining === 'number' && daysRemaining <= 15

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" /> Subscription & Billing
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your current plan, limits, invoices, and billing status from the platform database.</p>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex text-sm font-semibold border border-slate-200 dark:border-slate-700 shadow-inner">
          {['MONTHLY', 'YEARLY'].map((cycle) => (
            <button
              key={cycle}
              type="button"
              className={`px-4 py-2 rounded-lg transition-all ${billingCycle === cycle ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => setBillingCycle(cycle)}
            >
              {cycle === 'MONTHLY' ? 'Monthly' : 'Yearly'}
            </button>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl border p-5 sm:p-6 ${isExpiringSoon ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/30' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/30'}`}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${isExpiringSoon ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'}`}>
              {isExpiringSoon ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                {currentPlan?.name || 'No Plan Assigned'}
                <span className={`ml-3 inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(status)}`}>
                  {status.replace(/_/g, ' ')}
                </span>
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {subscription ? <>Billing date: <strong>{formatDate(data?.renewalDate) || '-'}</strong></> : 'A platform subscription record has not been configured yet.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Days Left" value={daysRemaining ?? '-'} />
            <Metric label="Employees" value={limitText(tenant?.employeeLimit)} />
            <Metric label="Storage" value={limitText(tenant?.storageLimitMb, ' MB')} />
            <Metric label="Auto Renew" value={subscription?.autoRenew ? 'Yes' : 'No'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InfoPanel title="Plan Limits" icon={Users}>
          <InfoRow label="Employee limit" value={limitText(tenant?.employeeLimit)} />
          <InfoRow label="Storage used" value={`${limitText(tenant?.storageUsedMb || 0, ' MB')} / ${limitText(tenant?.storageLimitMb, ' MB')}`} />
          <InfoRow label="API quota" value={limitText(tenant?.apiQuota)} />
          <InfoRow label="Integration limit" value={limitText(tenant?.integrationLimit)} />
        </InfoPanel>
        <InfoPanel title="Recent Invoices" icon={Receipt}>
          {(data?.invoices || []).length === 0 ? (
            <EmptyLine text="No invoices recorded yet." />
          ) : data.invoices.map((invoice) => (
            <InfoRow key={invoice._id} label={invoice.invoiceNumber} value={`${formatCurrency(invoice.amount)} - ${invoice.status}`} />
          ))}
        </InfoPanel>
        <InfoPanel title="Credits" icon={History}>
          {(data?.credits || []).length === 0 ? (
            <EmptyLine text="No credits applied." />
          ) : data.credits.map((credit) => (
            <InfoRow key={credit._id} label={credit.reason || 'Credit'} value={formatCurrency(credit.amount)} />
          ))}
        </InfoPanel>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredPlans.map((plan) => {
          const Icon = planIcon(plan.name)
          const isCurrent = currentPlan && String(currentPlan._id) === String(plan._id)
          return (
            <div key={plan._id} className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all dark:bg-slate-800 ${isCurrent ? 'border-blue-500 shadow-blue-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
              {isCurrent && (
                <div className="absolute right-4 top-4 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  Current
                </div>
              )}
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
              <p className="mt-2 min-h-10 text-sm text-slate-500 dark:text-slate-400">{plan.description || 'Subscription plan configured by platform admin.'}</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(plan.price || 0)}</span>
                <span className="mb-1 text-xs font-bold text-slate-400">/{plan.billingCycle === 'YEARLY' ? 'yr' : 'mo'}</span>
              </div>
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-700">
                <Feature text={`${limitText(plan.employeeLimit)} employees`} />
                <Feature text={`${limitText(plan.storageLimitMb, ' MB')} storage`} />
                <Feature text={`${limitText(plan.apiQuota)} API calls`} />
                {(plan.features || []).slice(0, 3).map((feature) => <Feature key={feature} text={feature} />)}
              </div>
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                Plan changes are managed by the platform administrator.
              </div>
            </div>
          )
        })}
      </div>

      {filteredPlans.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          No active plans configured for this billing cycle.
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-white/70 px-4 py-3 text-center shadow-sm dark:bg-slate-900/40">
      <p className="text-lg font-black text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  )
}

function InfoPanel({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
        <Icon className="h-4 w-4 text-blue-500" /> {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-bold text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  )
}

function Feature({ text }) {
  return (
    <div className="flex items-start gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      {text}
    </div>
  )
}

function EmptyLine({ text }) {
  return <p className="text-sm font-medium text-slate-400">{text}</p>
}
