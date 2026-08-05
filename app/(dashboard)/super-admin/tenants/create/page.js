'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, RotateCw, X, XCircle } from 'lucide-react'
import { platformApi } from '@/services/platformApi'
import { tenantApi } from '@/services/tenantApi'
import { useAuthStore } from '@/store/authStore'

const DRAFT_KEY = 'nexahr_company_wizard_draft_v1'
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MODULES = [
  { key: 'core_hr', label: 'Core HR' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'leave', label: 'Leave' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'recruitment', label: 'Recruitment' },
  { key: 'performance', label: 'Performance' },
  { key: 'assets', label: 'Assets' },
  { key: 'ai_assistant', label: 'AI Assistant' },
]

const STEPS = [
  'Company Identity',
  'Legal & Locale',
  'Primary Administrator',
  'Organization Defaults',
  'Subscription',
  'Payroll Defaults',
  'Security',
  'Review & Provision',
]

function defaultForm() {
  return {
    companyName: '', tenantCode: '', subdomain: '', email: '', phone: '', industryType: '', logoUrl: '',
    country: 'India', state: '', address: '', city: '', gstNumber: '', panNumber: '', timezone: 'Asia/Kolkata', currency: 'INR',
    adminName: '', adminEmail: '', adminPhone: '', sendLoginInvitation: true,
    employeeIdPrefix: 'EMP', officeStartTime: '09:00', officeEndTime: '18:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], weeklyOff: ['Saturday', 'Sunday'],
    planId: '', employeeLimit: 50, subscriptionStartDate: '', subscriptionEndDate: '',
    features: { core_hr: true, attendance: true, leave: true, payroll: false, recruitment: false, performance: false, assets: false, ai_assistant: false },
    payFrequency: 'MONTHLY', payrollCutoffDay: 25,
    allowedEmailDomainsText: '', sessionTimeoutMinutes: 60,
  }
}

function newIdempotencyKey() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `wiz_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function loadDraft() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function Field({ label, required, children, hint, error }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
      {!error && hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{title}</h3>
      {children}
    </section>
  )
}

export default function CreateCompanyPage() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.user)

  const [form, setForm] = useState(defaultForm)
  const [step, setStep] = useState(0)
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [draftBanner, setDraftBanner] = useState(false)
  const [plans, setPlans] = useState([])

  const [codeCheck, setCodeCheck] = useState(null) // { available, reason }
  const [subdomainCheck, setSubdomainCheck] = useState(null)
  const [emailCheck, setEmailCheck] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [job, setJob] = useState(null)
  const [submitError, setSubmitError] = useState('')

  // Restore or start a draft on mount
  useEffect(() => {
    const draft = loadDraft()
    if (draft?.form && draft?.idempotencyKey) {
      setDraftBanner(true)
      setIdempotencyKey(draft.idempotencyKey)
    } else {
      setIdempotencyKey(newIdempotencyKey())
    }
  }, [])

  useEffect(() => {
    tenantApi.getPlans().then((res) => setPlans(res.data.data || [])).catch(() => setPlans([]))
  }, [])

  // Autosave draft on every change (until a job has actually started)
  useEffect(() => {
    if (!idempotencyKey || job) return
    const timer = setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step, idempotencyKey, savedAt: Date.now() }))
    }, 300)
    return () => clearTimeout(timer)
  }, [form, step, idempotencyKey, job])

  function resumeDraft() {
    const draft = loadDraft()
    if (draft?.form) {
      setForm({ ...defaultForm(), ...draft.form })
      setStep(draft.step || 0)
    }
    setDraftBanner(false)
  }

  function discardDraft() {
    window.localStorage.removeItem(DRAFT_KEY)
    setForm(defaultForm())
    setStep(0)
    setIdempotencyKey(newIdempotencyKey())
    setDraftBanner(false)
  }

  function setValue(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function toggleList(field, value) {
    setForm((current) => {
      const values = current[field] || []
      return { ...current, [field]: values.includes(value) ? values.filter((v) => v !== value) : [...values, value] }
    })
  }

  function toggleFeature(key) {
    setForm((current) => ({ ...current, features: { ...current.features, [key]: !current.features[key] } }))
  }

  // Live validation, debounced
  useEffect(() => {
    if (!form.tenantCode) { setCodeCheck(null); return }
    const timer = setTimeout(() => {
      platformApi.checkCompanyCode(form.tenantCode).then((res) => setCodeCheck(res.data.data)).catch(() => setCodeCheck(null))
    }, 400)
    return () => clearTimeout(timer)
  }, [form.tenantCode])

  useEffect(() => {
    if (!form.subdomain) { setSubdomainCheck(null); return }
    const timer = setTimeout(() => {
      platformApi.checkSubdomain(form.subdomain).then((res) => setSubdomainCheck(res.data.data)).catch(() => setSubdomainCheck(null))
    }, 400)
    return () => clearTimeout(timer)
  }, [form.subdomain])

  useEffect(() => {
    if (!form.adminEmail) { setEmailCheck(null); return }
    const timer = setTimeout(() => {
      platformApi.checkAdminEmail(form.adminEmail).then((res) => setEmailCheck(res.data.data)).catch(() => setEmailCheck(null))
    }, 400)
    return () => clearTimeout(timer)
  }, [form.adminEmail])

  const stepValid = useMemo(() => {
    switch (step) {
      case 0: return !!form.companyName && !!form.tenantCode && !!form.email && codeCheck?.available !== false && (!form.subdomain || subdomainCheck?.available !== false)
      case 2: return !!form.adminName && !!form.adminEmail && emailCheck?.available !== false
      default: return true
    }
  }, [step, form, codeCheck, subdomainCheck, emailCheck])

  function goNext() { setStep((s) => Math.min(STEPS.length - 1, s + 1)) }
  function goBack() { setStep((s) => Math.max(0, s - 1)) }

  function buildPayload() {
    return {
      ...form,
      allowedEmailDomains: form.allowedEmailDomainsText.split(',').map((d) => d.trim()).filter(Boolean),
    }
  }

  async function loadJobWithSteps(jobId, tempPassword) {
    const { data } = await platformApi.getProvisioningJob(jobId)
    setJob({ ...data.data.job, steps: data.data.steps, tempPassword })
  }

  async function submit() {
    setSubmitting(true)
    setSubmitError('')
    try {
      const { data } = await platformApi.provisionTenant(idempotencyKey, buildPayload())
      await loadJobWithSteps(data.data.job._id, data.data.tempPassword)
      window.localStorage.removeItem(DRAFT_KEY)
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Provisioning failed')
      const failedJob = err.response?.data?.data?.job
      if (failedJob?._id) await loadJobWithSteps(failedJob._id, err.response.data.data.tempPassword)
    } finally {
      setSubmitting(false)
    }
  }

  async function retry() {
    if (!job?._id) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const { data } = await platformApi.retryProvisioningJob(job._id)
      await loadJobWithSteps(data.data._id, job.tempPassword)
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Retry failed')
      await loadJobWithSteps(job._id, job.tempPassword)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <button onClick={() => router.push('/super-admin/tenants')} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to companies
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Company</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>
      </div>

      {draftBanner && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
          <span>You have an unfinished company draft.</span>
          <div className="flex gap-2">
            <button onClick={resumeDraft} className="btn-secondary py-1.5 px-3">Resume</button>
            <button onClick={discardDraft} className="btn-secondary py-1.5 px-3">Discard</button>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => i < step && setStep(i)}
            disabled={i > step}
            className={`flex items-center gap-2 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 cursor-pointer' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            {i < step ? <Check className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        {step === 0 && (
          <Section title="Company Identity">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Company Name" required>
                <input required className="input-field" value={form.companyName} onChange={(e) => setValue('companyName', e.target.value)} />
              </Field>
              <Field label="Company Code" required error={codeCheck?.available === false ? codeCheck.reason : ''} hint="Unique, letters/numbers only">
                <input required className="input-field uppercase" value={form.tenantCode} onChange={(e) => setValue('tenantCode', e.target.value.toUpperCase())} placeholder="ACME" />
              </Field>
              <Field label="Subdomain" error={subdomainCheck?.available === false ? subdomainCheck.reason : ''} hint="Optional — used for display only, never for security">
                <input className="input-field lowercase" value={form.subdomain} onChange={(e) => setValue('subdomain', e.target.value.toLowerCase())} placeholder="acme" />
              </Field>
              <Field label="Business Email" required>
                <input required type="email" className="input-field" value={form.email} onChange={(e) => setValue('email', e.target.value)} />
              </Field>
              <Field label="Phone">
                <input className="input-field" value={form.phone} onChange={(e) => setValue('phone', e.target.value)} />
              </Field>
              <Field label="Industry">
                <input className="input-field" value={form.industryType} onChange={(e) => setValue('industryType', e.target.value)} />
              </Field>
              <Field label="Logo URL">
                <input className="input-field" value={form.logoUrl} onChange={(e) => setValue('logoUrl', e.target.value)} placeholder="https://..." />
              </Field>
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section title="Legal & Locale">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Country"><input className="input-field" value={form.country} onChange={(e) => setValue('country', e.target.value)} /></Field>
              <Field label="State"><input className="input-field" value={form.state} onChange={(e) => setValue('state', e.target.value)} /></Field>
              <Field label="City"><input className="input-field" value={form.city} onChange={(e) => setValue('city', e.target.value)} /></Field>
              <Field label="Registered Address"><input className="input-field" value={form.address} onChange={(e) => setValue('address', e.target.value)} /></Field>
              <Field label="GST Number"><input className="input-field" value={form.gstNumber} onChange={(e) => setValue('gstNumber', e.target.value)} /></Field>
              <Field label="PAN Number"><input className="input-field" value={form.panNumber} onChange={(e) => setValue('panNumber', e.target.value)} /></Field>
              <Field label="Time Zone">
                <select className="input-field" value={form.timezone} onChange={(e) => setValue('timezone', e.target.value)}>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Dubai">Asia/Dubai</option>
                </select>
              </Field>
              <Field label="Currency">
                <select className="input-field" value={form.currency} onChange={(e) => setValue('currency', e.target.value)}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AED">AED</option>
                </select>
              </Field>
            </div>
          </Section>
        )}

        {step === 2 && (
          <Section title="Primary Administrator">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Admin Full Name" required>
                <input required className="input-field" value={form.adminName} onChange={(e) => setValue('adminName', e.target.value)} />
              </Field>
              <Field label="Work Email" required error={emailCheck?.available === false ? emailCheck.reason : ''}>
                <input required type="email" className="input-field" value={form.adminEmail} onChange={(e) => setValue('adminEmail', e.target.value)} />
              </Field>
              <Field label="Phone">
                <input className="input-field" value={form.adminPhone} onChange={(e) => setValue('adminPhone', e.target.value)} />
              </Field>
            </div>
            <label className="mt-4 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={form.sendLoginInvitation} onChange={(e) => setValue('sendLoginInvitation', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Record a login-invitation event on provisioning
            </label>
            <p className="mt-1.5 text-xs text-slate-400">No email service is configured yet, so this does not send an email — the one-time password is shown on the final step instead. Copy it from there (or use "Reset Password" later on the company's Primary Admin tab).</p>
          </Section>
        )}

        {step === 3 && (
          <Section title="Organization Defaults">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Employee ID Prefix">
                <input className="input-field uppercase" value={form.employeeIdPrefix} onChange={(e) => setValue('employeeIdPrefix', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Office Start Time">
                <input type="time" className="input-field" value={form.officeStartTime} onChange={(e) => setValue('officeStartTime', e.target.value)} />
              </Field>
              <Field label="Office End Time">
                <input type="time" className="input-field" value={form.officeEndTime} onChange={(e) => setValue('officeEndTime', e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Working Days</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button type="button" key={day} onClick={() => toggleList('workingDays', day)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${form.workingDays.includes(day) ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{day}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Weekly Off</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button type="button" key={day} onClick={() => toggleList('weeklyOff', day)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${form.weeklyOff.includes(day) ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{day}</button>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        )}

        {step === 4 && (
          <Section title="Subscription">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Plan">
                <select className="input-field" value={form.planId} onChange={(e) => setValue('planId', e.target.value)}>
                  <option value="">No plan</option>
                  {plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.name}</option>)}
                </select>
              </Field>
              <Field label="Employee Limit">
                <input type="number" min="1" className="input-field" value={form.employeeLimit} onChange={(e) => setValue('employeeLimit', Number(e.target.value))} />
              </Field>
              <Field label="Start Date">
                <input type="date" className="input-field" value={form.subscriptionStartDate} onChange={(e) => setValue('subscriptionStartDate', e.target.value)} />
              </Field>
              <Field label="Trial / Expiry Date">
                <input type="date" className="input-field" value={form.subscriptionEndDate} onChange={(e) => setValue('subscriptionEndDate', e.target.value)} />
              </Field>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Enabled Modules</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MODULES.map((mod) => (
                  <button type="button" key={mod.key} onClick={() => toggleFeature(mod.key)} className={`min-h-10 rounded-xl border px-3 text-left text-xs font-medium transition-colors ${form.features[mod.key] ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'}`}>
                    <span className="flex items-center gap-2">{form.features[mod.key] && <Check className="h-3.5 w-3.5" />}{mod.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Section>
        )}

        {step === 5 && (
          <Section title="Payroll Defaults">
            <p className="text-xs text-slate-400 mb-4">Saved to the company profile now; a payroll module in a later phase will act on these.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Pay Frequency">
                <select className="input-field" value={form.payFrequency} onChange={(e) => setValue('payFrequency', e.target.value)}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="BIWEEKLY">Bi-weekly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </Field>
              <Field label="Payroll Cutoff Day" hint="Day of month, 1-28">
                <input type="number" min="1" max="28" className="input-field" value={form.payrollCutoffDay} onChange={(e) => setValue('payrollCutoffDay', Number(e.target.value))} />
              </Field>
            </div>
          </Section>
        )}

        {step === 6 && (
          <Section title="Security">
            <p className="text-xs text-slate-400 mb-4">Saved as the company's security profile now; login enforcement for these lands in a later phase.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Allowed Email Domains" hint="Comma-separated, optional">
                <input className="input-field" value={form.allowedEmailDomainsText} onChange={(e) => setValue('allowedEmailDomainsText', e.target.value)} placeholder="acme.com, acme.io" />
              </Field>
              <Field label="Session Timeout (minutes)">
                <input type="number" min="5" className="input-field" value={form.sessionTimeoutMinutes} onChange={(e) => setValue('sessionTimeoutMinutes', Number(e.target.value))} />
              </Field>
            </div>
          </Section>
        )}

        {step === 7 && (
          <ReviewAndProvision
            form={form}
            plans={plans}
            job={job}
            submitting={submitting}
            submitError={submitError}
            onSubmit={submit}
            onRetry={retry}
            onDone={() => router.push(job?.tenant?._id ? `/super-admin/tenants/${job.tenant._id}` : '/super-admin/tenants')}
          />
        )}

        {step < 7 && (
          <div className="flex justify-between pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
            <button type="button" className="btn-secondary" onClick={goBack} disabled={step === 0}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button type="button" className="btn-primary" onClick={goNext} disabled={!stepValid}>
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewAndProvision({ form, plans, job, submitting, submitError, onSubmit, onRetry, onDone }) {
  const plan = plans.find((p) => p._id === form.planId)
  const steps = job?.steps
  const [copied, setCopied] = useState(false)

  function copyPassword() {
    navigator.clipboard?.writeText(job.tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Review & Provision</h3>

      {!job && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SummaryBlock title="Company">
              <SummaryRow label="Name" value={form.companyName} />
              <SummaryRow label="Code" value={form.tenantCode} />
              <SummaryRow label="Subdomain" value={form.subdomain || '—'} />
              <SummaryRow label="Email" value={form.email} />
            </SummaryBlock>
            <SummaryBlock title="Primary Admin">
              <SummaryRow label="Name" value={form.adminName} />
              <SummaryRow label="Email" value={form.adminEmail} />
              <SummaryRow label="Invitation" value={form.sendLoginInvitation ? 'Will be sent' : 'Not sent'} />
            </SummaryBlock>
            <SummaryBlock title="Subscription">
              <SummaryRow label="Plan" value={plan?.name || 'No plan'} />
              <SummaryRow label="Employee Limit" value={form.employeeLimit} />
              <SummaryRow label="Modules" value={Object.entries(form.features).filter(([, v]) => v).map(([k]) => k).join(', ') || 'None'} />
            </SummaryBlock>
            <SummaryBlock title="Locale">
              <SummaryRow label="Country" value={form.country} />
              <SummaryRow label="Timezone" value={form.timezone} />
              <SummaryRow label="Currency" value={form.currency} />
            </SummaryBlock>
          </div>

          {submitError && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3">{submitError}</div>}

          <button className="btn-primary w-full justify-center" onClick={onSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Provisioning...' : 'Provision Company'}
          </button>
        </div>
      )}

      {job && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status:</span>
            <StatusPill status={job.status} />
          </div>

          {steps && (
            <ol className="space-y-2">
              {steps.map((s) => (
                <li key={s.stepKey} className="flex items-center gap-3 text-sm">
                  <StepIcon status={s.status} />
                  <span className="text-slate-700 dark:text-slate-300 flex-1">{s.stepKey.replace(/_/g, ' ')}</span>
                  {s.error && <span className="text-xs text-red-500">{s.error}</span>}
                </li>
              ))}
            </ol>
          )}

          {job.status === 'COMPLETED' && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-700 dark:text-emerald-300">
              Company provisioned successfully.
              {job.tempPassword && (
                <>
                  <p className="mt-2 font-medium">
                    Copy this password now — there is no email service configured, so it is <u>not</u> sent anywhere, and it will not be shown again. If it's lost, use "Reset Password" on the company's Primary Admin tab.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg p-3 font-mono text-center">{job.tempPassword}</div>
                    <button type="button" className="btn-secondary flex-shrink-0" onClick={copyPassword}>{copied ? 'Copied' : 'Copy'}</button>
                  </div>
                </>
              )}
            </div>
          )}

          {(job.status === 'FAILED' || job.status === 'PARTIALLY_COMPLETED') && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
              {job.error || 'Provisioning did not complete.'}
            </div>
          )}

          {submitError && job.status !== 'FAILED' && job.status !== 'PARTIALLY_COMPLETED' && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3">{submitError}</div>
          )}

          <div className="flex gap-3 justify-end">
            {(job.status === 'FAILED' || job.status === 'PARTIALLY_COMPLETED') && (
              <button className="btn-secondary" onClick={onRetry} disabled={submitting}>
                <RotateCw className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} /> Retry
              </button>
            )}
            <button className="btn-primary" onClick={onDone}>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryBlock({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}
function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 dark:text-slate-300 text-right">{value || '—'}</span>
    </div>
  )
}
function StatusPill({ status }) {
  const color = status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>{status}</span>
}
function StepIcon({ status }) {
  if (status === 'COMPLETED') return <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
  if (status === 'FAILED') return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
  if (status === 'RUNNING') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
  return <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700 flex-shrink-0" />
}
