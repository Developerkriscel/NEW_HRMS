'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Database, Download, Loader2, RotateCw, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { PermissionDenied } from '@/components/common/PermissionDenied'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { platformApi } from '@/services/platformApi'
import { tenantApi } from '@/services/tenantApi'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const TABS = ['Overview', 'Subscription', 'Modules', 'Usage', 'Primary Admin', 'Provisioning', 'Security', 'Billing', 'Audit History', 'Data Management']

const TRANSITIONS = {
  TRIAL: ['ACTIVE', 'GRACE', 'SUSPENDED', 'ARCHIVED'],
  ACTIVE: ['GRACE', 'SUSPENDED', 'ARCHIVED'],
  GRACE: ['ACTIVE', 'SUSPENDED', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE', 'PURGE_SCHEDULED'],
  PURGE_SCHEDULED: ['ARCHIVED'],
  PURGED: [],
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 dark:text-slate-200 font-medium truncate">{value ?? '—'}</p>
    </div>
  )
}

function Panel({ title, action, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

function EmptyModule({ message }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center">
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  )
}

export default function TenantDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const [tab, setTab] = useState('Overview')
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  function load() {
    setLoading(true)
    setForbidden(false)
    tenantApi.getById(id)
      .then((res) => setTenant(res.data.data))
      .catch((err) => { if (err.response?.status === 403) setForbidden(true) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [id])

  if (forbidden) return <PermissionDenied requiredPermission="tenant.view" message="You don't have permission to view this company." />
  if (loading) return <PageLoader />
  if (!tenant) return <div className="text-center text-slate-400 py-12">Company not found</div>

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <button onClick={() => router.push('/super-admin/tenants')} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to companies
        </button>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{tenant.companyName}</h1>
          <Badge>{tenant.status}</Badge>
          <Badge>{tenant.provisioningStatus}</Badge>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{tenant.tenantCode} · {tenant.email}</p>
      </div>

      <div className="flex gap-1 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap flex-shrink-0 transition-colors ${tab === t ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab tenant={tenant} hasPermission={hasPermission} onChanged={load} />}
      {tab === 'Subscription' && <SubscriptionTab tenant={tenant} />}
      {tab === 'Modules' && <ModulesTab tenant={tenant} hasPermission={hasPermission} onChanged={load} />}
      {tab === 'Usage' && <UsageTab tenant={tenant} hasPermission={hasPermission} />}
      {tab === 'Primary Admin' && <PrimaryAdminTab tenant={tenant} hasPermission={hasPermission} />}
      {tab === 'Provisioning' && <ProvisioningTab tenant={tenant} hasPermission={hasPermission} />}
      {tab === 'Security' && <SecurityTab tenant={tenant} />}
      {tab === 'Billing' && <BillingTab tenant={tenant} hasPermission={hasPermission} />}
      {tab === 'Audit History' && <AuditHistoryTab tenant={tenant} />}
      {tab === 'Data Management' && <DataManagementTab tenant={tenant} hasPermission={hasPermission} />}
    </div>
  )
}

// ---------------------------------------------------------------------------

function OverviewTab({ tenant, hasPermission, onChanged }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [purgeDate, setPurgeDate] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  function load() {
    setLoading(true)
    setLoadError(false)
    platformApi.getTenantLifecycle(tenant._id).then((res) => setEvents(res.data.data || [])).catch(() => setLoadError(true)).finally(() => setLoading(false))
  }
  useEffect(load, [tenant._id])

  const availableTransitions = TRANSITIONS[tenant.status] || []

  async function handleTransition(reason) {
    setActionLoading(true)
    setActionError('')
    try {
      await platformApi.changeTenantStatus(tenant._id, { toStatus: dialog, reason, purgeScheduledFor: dialog === 'PURGE_SCHEDULED' ? purgeDate : undefined })
      setDialog(null)
      setPurgeDate('')
      load()
      onChanged()
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to change status')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card !p-4"><p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Employee Limit</p><p className="text-xl font-bold text-slate-900 dark:text-white">{tenant.employeeLimit}</p></div>
        <div className="stat-card !p-4"><p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Storage</p><p className="text-xl font-bold text-slate-900 dark:text-white">{tenant.storageUsedMb} / {tenant.storageLimitMb} MB</p></div>
        <div className="stat-card !p-4"><p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tenant Database</p><div className="flex items-center gap-2 mt-0.5"><Database className="h-4 w-4 text-slate-400" /><Badge>{tenant.databaseStatus}</Badge></div></div>
        <div className="stat-card !p-4"><p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Created</p><p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1.5">{formatDate(tenant.createdAt)}</p></div>
      </div>

      <Panel title="Company Details">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <InfoRow label="Subdomain" value={tenant.subdomain} />
          <InfoRow label="Phone" value={tenant.phone} />
          <InfoRow label="Primary Admin" value={tenant.adminEmail} />
          <InfoRow label="Industry" value={tenant.industryType} />
          <InfoRow label="Country / State" value={[tenant.country, tenant.state].filter(Boolean).join(' / ') || null} />
          <InfoRow label="Timezone / Currency" value={`${tenant.timezone} / ${tenant.currency}`} />
          <InfoRow label="GST" value={tenant.gstNumber} />
          <InfoRow label="PAN" value={tenant.panNumber} />
          {tenant.suspensionReason && <InfoRow label="Last status reason" value={tenant.suspensionReason} />}
        </div>
      </Panel>

      {hasPermission('tenant.suspend') && (
        <Panel title="Change Status">
          {availableTransitions.length === 0 ? (
            <p className="text-sm text-slate-400">This tenant has no available status transitions.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTransitions.map((s) => (
                <button key={s} className="btn-secondary" onClick={() => setDialog(s)}>Move to {s.replace('_', ' ')}</button>
              ))}
            </div>
          )}
        </Panel>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Lifecycle History</p></div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            : loadError ? <p className="p-6 text-center text-sm text-red-500">Failed to load lifecycle history — <button onClick={load} className="underline">retry</button></p>
            : events.length === 0 ? <p className="p-6 text-center text-sm text-slate-400">No status changes recorded yet</p>
            : events.map((event) => (
              <div key={event._id} className="p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Badge>{event.fromStatus}</Badge><span className="text-slate-400">→</span><Badge>{event.toStatus}</Badge>
                  <span className="text-xs text-slate-400 ml-auto">{formatDate(event.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">{event.reason}</p>
                <p className="text-xs text-slate-400 mt-0.5">by {event.performedByEmail}</p>
              </div>
            ))}
        </div>
      </div>

      <ConfirmDialog
        open={!!dialog}
        title={`Move to ${dialog?.replace('_', ' ')}?`}
        description={dialog === 'SUSPENDED' ? "The tenant's data is preserved — this only blocks access." : dialog === 'PURGE_SCHEDULED' ? 'Purging is scheduled, not immediate — it can still be cancelled before the date.' : undefined}
        confirmLabel={`Move to ${dialog?.replace('_', ' ')}`}
        variant={dialog === 'SUSPENDED' || dialog === 'ARCHIVED' || dialog === 'PURGE_SCHEDULED' ? 'danger' : 'default'}
        loading={actionLoading}
        error={actionError}
        onConfirm={handleTransition}
        onClose={() => { setDialog(null); setActionError(''); setPurgeDate('') }}
      >
        {dialog === 'PURGE_SCHEDULED' && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Purge Date (minimum 14 days out) <span className="text-red-500">*</span></span>
            <input type="date" className="input-field" value={purgeDate} onChange={(e) => setPurgeDate(e.target.value)} />
          </label>
        )}
      </ConfirmDialog>
    </div>
  )
}

function SubscriptionTab({ tenant }) {
  const router = useRouter()
  const [subscription, setSubscription] = useState(undefined)

  useEffect(() => {
    platformApi.getSubscriptions({ tenant: tenant._id, size: 1 })
      .then((res) => setSubscription(res.data.data.content[0] || null))
      .catch(() => setSubscription(null))
  }, [tenant._id])

  if (subscription === undefined) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
  if (!subscription) return <EmptyModule message="No subscription on record for this tenant." />

  return (
    <Panel title="Subscription" action={<button className="btn-secondary" onClick={() => router.push(`/super-admin/subscriptions/${subscription._id}`)}>Manage Subscription</button>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <InfoRow label="Plan" value={subscription.plan?.name} />
        <InfoRow label="Status" value={<Badge>{subscription.status}</Badge>} />
        <InfoRow label="Start Date" value={formatDate(subscription.startDate)} />
        <InfoRow label="Trial End" value={formatDate(subscription.trialEndDate)} />
        <InfoRow label="Auto Renew" value={subscription.autoRenew ? 'Yes' : 'No'} />
      </div>
    </Panel>
  )
}

function ModulesTab({ tenant, hasPermission, onChanged }) {
  const [features, setFeatures] = useState(tenant.features instanceof Object ? { ...tenant.features } : {})
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function toggle(key) {
    setFeatures((f) => ({ ...f, [key]: !f[key] }))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      await tenantApi.updateFeatures(tenant._id, { features, reason })
      setReason('')
      onChanged()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update modules')
    } finally {
      setSaving(false)
    }
  }

  const canManage = hasPermission('tenant.update')

  return (
    <Panel title="Enabled Modules">
      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{error}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {Object.keys(features).length === 0 && <p className="text-sm text-slate-400 col-span-full">No modules configured</p>}
        {Object.entries(features).map(([key, enabled]) => (
          <button
            key={key}
            type="button"
            disabled={!canManage}
            onClick={() => toggle(key)}
            className={`min-h-10 rounded-xl border px-3 text-left text-xs font-medium transition-colors ${enabled ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'}`}
          >
            <span className="flex items-center gap-2">{enabled && <Check className="h-3.5 w-3.5" />}{key}</span>
          </button>
        ))}
      </div>
      {canManage && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input className="input-field" placeholder="Reason for module change" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn-primary flex-shrink-0" onClick={save} disabled={saving || !reason.trim()}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      )}
    </Panel>
  )
}

function UsageTab({ tenant, hasPermission }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [recomputing, setRecomputing] = useState(false)

  function load() {
    setLoading(true)
    setLoadError(false)
    platformApi.getTenantUsage(tenant._id).then((res) => setData(res.data.data)).catch(() => setLoadError(true)).finally(() => setLoading(false))
  }
  useEffect(load, [tenant._id])

  async function recompute() {
    setRecomputing(true)
    try {
      await platformApi.recomputeTenantUsage(tenant._id)
      load()
    } finally {
      setRecomputing(false)
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
  if (loadError) return <p className="text-sm text-red-500 py-8 text-center">Failed to load usage data — <button onClick={load} className="underline">retry</button></p>
  const latest = data?.latest

  return (
    <Panel title="Usage" action={hasPermission('tenant.view') && (
      <button className="btn-secondary" onClick={recompute} disabled={recomputing}><RotateCw className={`w-4 h-4 ${recomputing ? 'animate-spin' : ''}`} /> Recompute</button>
    )}>
      {!latest ? (
        <p className="text-sm text-slate-400">No usage snapshot yet — click Recompute to take one.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UsageMeter label="Employees" used={latest.employeeCount} limit={latest.employeeLimit} />
          <UsageMeter label="Storage (MB)" used={latest.storageUsedMb} limit={latest.storageLimitMb} />
          <UsageMeter label="API Calls / mo" used={latest.apiCallsThisMonth} limit={latest.apiQuota} note="Not yet instrumented" />
          <UsageMeter label="Integrations" used={latest.integrationCount} limit={latest.integrationLimit} note="No integrations built yet" />
        </div>
      )}
      {latest && <p className="text-xs text-slate-400 mt-4">Snapshot taken {formatDate(latest.snapshotAt)}</p>}
    </Panel>
  )
}

function UsageMeter({ label, used, limit, note }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-900 dark:text-white">{used} <span className="text-xs font-normal text-slate-400">/ {limit === -1 ? '∞' : limit}</span></p>
      {limit > 0 && (
        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
          <div className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {note && <p className="text-xs text-amber-500 mt-1">{note}</p>}
    </div>
  )
}

function PrimaryAdminTab({ tenant, hasPermission }) {
  const [admin, setAdmin] = useState(undefined)
  const [showReset, setShowReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')
  const [newTempPassword, setNewTempPassword] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    platformApi.getTenantPrimaryAdmin(tenant._id).then((res) => setAdmin(res.data.data)).catch(() => setAdmin(null))
  }, [tenant._id])

  async function handleReset(reason) {
    setResetting(true)
    setResetError('')
    try {
      const { data } = await platformApi.resetTenantAdminPassword(tenant._id, reason)
      setNewTempPassword(data.data.tempPassword)
      setShowReset(false)
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  function copyPassword() {
    navigator.clipboard?.writeText(newTempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (admin === undefined) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
  if (!admin) return <EmptyModule message="Primary administrator record not found — the tenant database may not be provisioned yet." />

  return (
    <Panel
      title="Primary Administrator"
      action={hasPermission?.('tenant.update') && (
        <button className="btn-secondary" onClick={() => { setShowReset(true); setResetError(''); setNewTempPassword('') }}>Reset Password</button>
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <InfoRow label="Name" value={`${admin.firstName} ${admin.lastName}`} />
        <InfoRow label="Email" value={admin.email} />
        <InfoRow label="Phone" value={admin.phone} />
        <InfoRow label="Role" value={admin.role} />
        <InfoRow label="Status" value={<Badge>{admin.status}</Badge>} />
        <InfoRow label="Joined" value={formatDate(admin.joiningDate)} />
        <InfoRow label="MFA" value={admin.twoFactorEnabled ? 'Enabled' : 'Not enabled'} />
      </div>
      <p className="text-xs text-slate-400 mt-4">Only account/contact fields are shown here — salary, bank and identity-document fields are never exposed to platform operators.</p>

      {newTempPassword && (
        <div className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-700 dark:text-emerald-300">
          <p>New password set for {admin.email}. Copy it now — it will not be shown again.</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg p-3 font-mono text-center">{newTempPassword}</div>
            <button className="btn-secondary flex-shrink-0" onClick={copyPassword}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showReset}
        title="Reset primary admin password?"
        description={`This immediately invalidates ${admin.email}'s current password and issues a new one-time password shown only once.`}
        confirmLabel="Reset Password"
        variant="danger"
        loading={resetting}
        error={resetError}
        onConfirm={handleReset}
        onClose={() => setShowReset(false)}
      />
    </Panel>
  )
}

function ProvisioningTab({ tenant, hasPermission }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState('')

  function load() {
    if (!tenant.provisioningJob) { setLoading(false); return }
    setLoading(true)
    setLoadError(false)
    platformApi.getProvisioningJob(tenant.provisioningJob).then((res) => setData(res.data.data)).catch(() => setLoadError(true)).finally(() => setLoading(false))
  }
  useEffect(load, [tenant.provisioningJob])

  async function retry() {
    setRetrying(true)
    setError('')
    try {
      await platformApi.retryProvisioningJob(tenant.provisioningJob)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Retry failed')
      load()
    } finally {
      setRetrying(false)
    }
  }

  if (!tenant.provisioningJob) return <EmptyModule message="No provisioning job on record for this company." />
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
  if (loadError) return <p className="text-sm text-red-500 py-8 text-center">Failed to load provisioning status — <button onClick={load} className="underline">retry</button></p>

  const job = data?.job
  const steps = data?.steps || []

  return (
    <Panel title="Provisioning" action={(job?.status === 'FAILED' || job?.status === 'PARTIALLY_COMPLETED') && hasPermission('tenant.create') && (
      <button className="btn-secondary" onClick={retry} disabled={retrying}><RotateCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} /> Retry</button>
    )}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status:</span>
        <Badge>{job?.status}</Badge>
        <span className="text-xs text-slate-400">{job?.attempts} attempt(s)</span>
      </div>
      {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-3">{error}</div>}
      {job?.error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-3">{job.error}</div>}
      <ol className="space-y-2">
        {steps.map((s) => (
          <li key={s.stepKey} className="flex items-center gap-3 text-sm">
            {s.status === 'COMPLETED' ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700 flex-shrink-0" />}
            <span className="text-slate-700 dark:text-slate-300 flex-1">{s.stepKey.replace(/_/g, ' ')}</span>
            <span className="text-xs text-slate-400">{s.attempts} attempt(s)</span>
            {s.error && <span className="text-xs text-red-500">{s.error}</span>}
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function SecurityTab({ tenant }) {
  return (
    <Panel title="Security Configuration">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <InfoRow label="Allowed Email Domains" value={(tenant.securityDefaults?.allowedEmailDomains || []).join(', ') || 'Any domain'} />
        <InfoRow label="Session Timeout" value={`${tenant.securityDefaults?.sessionTimeoutMinutes || 60} minutes`} />
      </div>
      <p className="text-xs text-slate-400 mt-4 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> No secrets, keys or credentials are stored on the tenant profile — there is nothing sensitive to redact here. Live enforcement of these settings is a future phase.</p>
    </Panel>
  )
}

function BillingTab({ tenant, hasPermission }) {
  const router = useRouter()
  const [data, setData] = useState(undefined)

  useEffect(() => {
    platformApi.getTenantBilling(tenant._id).then((res) => setData(res.data.data)).catch(() => setData(null))
  }, [tenant._id])

  if (data === undefined) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
  if (!data?.subscription) return <EmptyModule message="No subscription — nothing to bill yet." />

  return (
    <Panel title="Billing" action={hasPermission('subscription.view') && (
      <button className="btn-secondary" onClick={() => router.push(`/super-admin/subscriptions/${data.subscription._id}`)}>Manage Invoices</button>
    )}>
      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {data.invoices.length === 0 ? <p className="text-sm text-slate-400 py-4">No invoices recorded</p> : data.invoices.map((inv) => (
          <div key={inv._id} className="py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{inv.invoiceNumber}</p>
              <p className="text-xs text-slate-400">{formatCurrency(inv.amount)} {inv.currency} · {inv.payments.length} payment(s)</p>
            </div>
            <Badge>{inv.status}</Badge>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function AuditHistoryTab({ tenant }) {
  const [logs, setLogs] = useState(undefined)

  useEffect(() => {
    tenantApi.getAuditLogs(tenant._id, { size: 50 }).then((res) => setLogs(res.data.data.content)).catch(() => setLogs([]))
  }, [tenant._id])

  if (logs === undefined) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
  if (logs.length === 0) return <EmptyModule message="No audit events recorded for this tenant yet." />

  return (
    <Panel title="Audit History">
      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {logs.map((log) => (
          <div key={log._id} className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{log.action}</span>
              <span className="text-xs text-slate-400">{formatDate(log.createdAt)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{log.description}</p>
            <p className="text-xs text-slate-400 mt-0.5">by {log.performerEmail}</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function DataManagementTab({ tenant, hasPermission }) {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  async function handleExport() {
    setExporting(true)
    setError('')
    try {
      const { data } = await platformApi.exportTenantMetadata(tenant._id)
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tenant.tenantCode}-metadata-export.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Panel title="Metadata Export">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Downloads company profile, subscription summary and lifecycle history as JSON. Employee and payroll records are never included.</p>
        {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-3">{error}</div>}
        {hasPermission('tenant.export_metadata') && (
          <button className="btn-primary" onClick={handleExport} disabled={exporting}><Download className="w-4 h-4" /> {exporting ? 'Exporting...' : 'Export Metadata'}</button>
        )}
      </Panel>

      <Panel title="Retention & Purge Status">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <InfoRow label="Current Status" value={<Badge>{tenant.status}</Badge>} />
          <InfoRow label="Archived At" value={tenant.archivedAt ? formatDate(tenant.archivedAt) : 'Not archived'} />
          <InfoRow label="Purge Scheduled For" value={tenant.purgeScheduledFor ? formatDate(tenant.purgeScheduledFor) : 'Not scheduled'} />
        </div>
        <p className="text-xs text-slate-400 mt-4">Purging is scheduled-only in this system — no automated deletion runs yet. See the Overview tab to schedule or cancel a purge.</p>
      </Panel>
    </div>
  )
}
