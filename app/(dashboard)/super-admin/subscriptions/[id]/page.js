'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { PermissionDenied } from '@/components/common/PermissionDenied'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { platformApi } from '@/services/platformApi'
import { tenantApi } from '@/services/tenantApi'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

export default function SubscriptionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const [data, setData] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [fields, setFields] = useState({})

  function load() {
    setLoading(true)
    setForbidden(false)
    platformApi.getSubscription(id)
      .then((res) => setData(res.data.data))
      .catch((err) => { if (err.response?.status === 403) setForbidden(true) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [id])

  useEffect(() => {
    tenantApi.getPlans().then((res) => setPlans(res.data.data || [])).catch(() => setPlans([]))
  }, [])

  function closeDialog() {
    setDialog(null)
    setActionError('')
    setFields({})
  }

  async function runAction(reason) {
    setActionLoading(true)
    setActionError('')
    try {
      if (dialog === 'plan-change') await platformApi.changeSubscriptionPlan(id, { planId: fields.planId, reason })
      if (dialog === 'trial-extension') await platformApi.extendTrial(id, { newTrialEndDate: fields.date, reason })
      if (dialog === 'grace-enter') await platformApi.manageGrace(id, { action: 'ENTER', reason, graceDays: fields.graceDays ? Number(fields.graceDays) : undefined })
      if (dialog === 'grace-exit') await platformApi.manageGrace(id, { action: 'EXIT', reason })
      if (dialog === 'status') await platformApi.changeSubscriptionStatus(id, { toStatus: fields.status, reason })
      if (dialog === 'credit') await platformApi.applyCredit(id, { amount: Number(fields.amount), currency: fields.currency || 'INR', reason })
      closeDialog()
      load()
    } catch (err) {
      setActionError(err.response?.data?.message || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (forbidden) return <PermissionDenied requiredPermission="subscription.view" message="You don't have permission to view this subscription." />
  if (loading) return <PageLoader />
  if (!data) return <div className="text-center text-slate-400 py-12">Subscription not found</div>

  const { subscription, history, credits, invoices } = data
  const canManage = hasPermission('subscription.update')
  const canCredit = hasPermission('subscription.apply_credit')
  const canBill = hasPermission('billing.invoice.manage')

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <button onClick={() => router.push('/super-admin/subscriptions')} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to subscriptions
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{subscription.tenant?.companyName}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{subscription.plan?.name || 'No plan'} · <Badge>{subscription.status}</Badge></p>
        </div>
      </div>

      {canManage && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setDialog('plan-change')}>Change Plan</button>
          <button className="btn-secondary" onClick={() => setDialog('trial-extension')}>Extend Trial</button>
          {subscription.status === 'GRACE' ? (
            <button className="btn-secondary" onClick={() => setDialog('grace-exit')}>Exit Grace</button>
          ) : (
            <button className="btn-secondary" onClick={() => setDialog('grace-enter')}>Enter Grace</button>
          )}
          <button className="btn-secondary" onClick={() => setDialog('status')}>Change Status</button>
          {canCredit && <button className="btn-secondary" onClick={() => setDialog('credit')}>Apply Credit</button>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card"><p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Start Date</p><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatDate(subscription.startDate)}</p></div>
        <div className="stat-card"><p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Trial End</p><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatDate(subscription.trialEndDate) || '-'}</p></div>
        <div className="stat-card"><p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Grace Ends</p><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatDate(subscription.graceEndsAt) || '-'}</p></div>
        <div className="stat-card"><p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Auto Renew</p><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{subscription.autoRenew ? 'Yes' : 'No'}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">History</p></div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {history.length === 0 ? <p className="p-6 text-center text-sm text-slate-400">No history yet</p> : history.map((h) => (
              <div key={h._id} className="p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{h.changeType.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-slate-400">{formatDate(h.createdAt)}</span>
                </div>
                {(h.fromValue || h.toValue) && <p className="text-xs text-slate-500 mt-0.5">{h.fromValue || '—'} → {h.toValue || '—'}</p>}
                <p className="text-xs text-slate-400 mt-1">{h.reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Credits</p></div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {credits.length === 0 ? <p className="p-6 text-center text-sm text-slate-400">No credits applied</p> : credits.map((c) => (
              <div key={c._id} className="p-4 text-sm flex justify-between">
                <div><p className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(c.amount)}</p><p className="text-xs text-slate-400">{c.reason}</p></div>
                <span className="text-xs text-slate-400">{formatDate(c.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <InvoicesPanel subscriptionId={id} invoices={invoices} canBill={canBill} onChanged={load} />

      <ConfirmDialog open={dialog === 'plan-change'} title="Change plan" confirmLabel="Change Plan" variant="default" loading={actionLoading} error={actionError} onConfirm={runAction} onClose={closeDialog}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">New Plan <span className="text-red-500">*</span></span>
          <select className="input-field" value={fields.planId || ''} onChange={(e) => setFields({ ...fields, planId: e.target.value })}>
            <option value="">Select a plan...</option>
            {plans.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </label>
      </ConfirmDialog>

      <ConfirmDialog open={dialog === 'trial-extension'} title="Extend trial" confirmLabel="Extend Trial" variant="default" loading={actionLoading} error={actionError} onConfirm={runAction} onClose={closeDialog}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">New Trial End Date <span className="text-red-500">*</span></span>
          <input type="date" className="input-field" value={fields.date || ''} onChange={(e) => setFields({ ...fields, date: e.target.value })} />
        </label>
      </ConfirmDialog>

      <ConfirmDialog open={dialog === 'grace-enter'} title="Move into grace period?" description="The tenant's status will also move to GRACE." confirmLabel="Enter Grace" variant="danger" loading={actionLoading} error={actionError} onConfirm={runAction} onClose={closeDialog}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Grace Days (optional, defaults to plan setting)</span>
          <input type="number" className="input-field" value={fields.graceDays || ''} onChange={(e) => setFields({ ...fields, graceDays: e.target.value })} />
        </label>
      </ConfirmDialog>

      <ConfirmDialog open={dialog === 'grace-exit'} title="Exit grace period?" description="The tenant's status will move back to ACTIVE." confirmLabel="Exit Grace" variant="default" loading={actionLoading} error={actionError} onConfirm={runAction} onClose={closeDialog} />

      <ConfirmDialog open={dialog === 'status'} title="Change subscription status" confirmLabel="Change Status" variant="danger" loading={actionLoading} error={actionError} onConfirm={runAction} onClose={closeDialog}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">New Status <span className="text-red-500">*</span></span>
          <select className="input-field" value={fields.status || ''} onChange={(e) => setFields({ ...fields, status: e.target.value })}>
            <option value="">Select...</option>
            {['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </ConfirmDialog>

      <ConfirmDialog open={dialog === 'credit'} title="Apply a credit" description="Metadata only — this does not affect any real balance or payment." confirmLabel="Apply Credit" variant="default" loading={actionLoading} error={actionError} onConfirm={runAction} onClose={closeDialog}>
        <label className="block mb-3">
          <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Amount <span className="text-red-500">*</span></span>
          <input type="number" className="input-field" value={fields.amount || ''} onChange={(e) => setFields({ ...fields, amount: e.target.value })} />
        </label>
      </ConfirmDialog>
    </div>
  )
}

function InvoicesPanel({ subscriptionId, invoices, canBill, onChanged }) {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ invoiceNumber: '', amount: '', currency: 'INR', dueAt: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [payingInvoice, setPayingInvoice] = useState(null)
  const [payment, setPayment] = useState({ amount: '', method: 'BANK_TRANSFER', reference: '', paidAt: '' })

  async function createInvoice(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await platformApi.createInvoice(subscriptionId, { ...form, amount: Number(form.amount), status: 'ISSUED', issuedAt: new Date().toISOString() })
      setShowCreate(false)
      setForm({ invoiceNumber: '', amount: '', currency: 'INR', dueAt: '' })
      onChanged()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record invoice')
    } finally {
      setSaving(false)
    }
  }

  async function recordPayment(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await platformApi.recordPayment(payingInvoice._id, { ...payment, amount: Number(payment.amount), paidAt: payment.paidAt || new Date().toISOString() })
      setPayingInvoice(null)
      setPayment({ amount: '', method: 'BANK_TRANSFER', reference: '', paidAt: '' })
      onChanged()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Invoices & Payments</p>
        {canBill && <button className="btn-secondary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Record Invoice</button>}
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {invoices.length === 0 ? <p className="p-6 text-center text-sm text-slate-400">No invoices recorded</p> : invoices.map((inv) => (
          <div key={inv._id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{inv.invoiceNumber}</p>
              <p className="text-xs text-slate-400">{formatCurrency(inv.amount)} {inv.currency} · due {formatDate(inv.dueAt) || '-'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{inv.status}</Badge>
              {canBill && inv.status !== 'PAID' && inv.status !== 'VOID' && (
                <button className="btn-secondary text-xs py-1.5" onClick={() => setPayingInvoice(inv)}>Record Payment</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Record Invoice</h2>
            <form onSubmit={createInvoice} className="space-y-3">
              {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{error}</div>}
              <input required placeholder="Invoice Number" className="input-field" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
              <input required type="number" placeholder="Amount" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <input type="date" placeholder="Due Date" className="input-field" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Record Payment for {payingInvoice.invoiceNumber}</h2>
            <form onSubmit={recordPayment} className="space-y-3">
              {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{error}</div>}
              <input required type="number" placeholder="Amount" className="input-field" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
              <select className="input-field" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
              <input placeholder="Reference" className="input-field" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
              <input type="date" className="input-field" value={payment.paidAt} onChange={(e) => setPayment({ ...payment, paidAt: e.target.value })} />
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" className="btn-secondary" onClick={() => setPayingInvoice(null)}>Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
