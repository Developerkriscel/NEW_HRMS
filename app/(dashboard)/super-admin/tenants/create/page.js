'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, RotateCw, X, XCircle, Building2, Globe, UserCheck, Shield, CreditCard, Layers, Settings, Sparkles, Copy, KeyRound, Database } from 'lucide-react'
import { platformApi } from '@/services/platformApi'
import { tenantApi } from '@/services/tenantApi'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const DRAFT_KEY = 'nexahr_company_wizard_draft_v1'
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MODULES = [
  { key: 'core_hr', label: 'Core HR', desc: 'Employee Directory & Structure' },
  { key: 'attendance', label: 'Attendance', desc: 'Clock-in & Shift Tracking' },
  { key: 'leave', label: 'Leave', desc: 'Leave Policies & Approvals' },
  { key: 'payroll', label: 'Payroll', desc: 'Salary Slips & Tax Formulas' },
  { key: 'recruitment', label: 'Recruitment', desc: 'Job Postings & Pipeline' },
  { key: 'performance', label: 'Performance', desc: 'KRAs & Annual Reviews' },
  { key: 'assets', label: 'Assets', desc: 'Hardware & Laptop Allocation' },
  { key: 'ai_assistant', label: 'AI Assistant', desc: 'Smart Assistant & Insights' },
]

const STEPS = [
  { label: 'Identity', icon: Building2 },
  { label: 'Locale', icon: Globe },
  { label: 'Admin', icon: UserCheck },
  { label: 'Defaults', icon: Settings },
  { label: 'Plan', icon: CreditCard },
  { label: 'Payroll', icon: Layers },
  { label: 'Security', icon: Shield },
  { label: 'Provision', icon: Sparkles },
]

function defaultForm() {
  return {
    companyName: '', tenantCode: '', subdomain: '', email: '', phone: '', industryType: '', logoUrl: '',
    country: 'India', state: '', address: '', city: '', gstNumber: '', panNumber: '', timezone: 'Asia/Kolkata', currency: 'INR',
    adminName: '', adminEmail: '', adminPhone: '', sendLoginInvitation: true,
    employeeIdPrefix: 'EMP', officeStartTime: '09:00', officeEndTime: '18:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], weeklyOff: ['Saturday', 'Sunday'],
    planId: '', employeeLimit: 50, subscriptionStartDate: '', subscriptionEndDate: '',
    features: { core_hr: true, attendance: true, leave: true, payroll: true, recruitment: true, performance: false, assets: false, ai_assistant: true },
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
      <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
        {label}{required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-500 font-medium">{error}</span>}
      {!error && hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  )
}

function Section({ title, icon: Icon, description, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 border border-blue-100 dark:border-blue-900/50">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h3>
          {description && <p className="text-xs text-slate-400 font-medium">{description}</p>}
        </div>
      </div>
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
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => router.push('/super-admin/tenants')} 
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Companies
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Create Organization</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-medium mt-0.5">
            Configure identity, multi-tenant databases, administrator credentials, and enabled SaaS modules.
          </p>
        </div>
      </div>

      {draftBanner && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 p-4 text-xs font-medium text-blue-800 dark:text-blue-200 shadow-sm">
          <span>You have an unfinished organization draft in progress.</span>
          <div className="flex gap-2">
            <button onClick={resumeDraft} className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-sm">Resume</button>
            <button onClick={discardDraft} className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-colors">Discard</button>
          </div>
        </div>
      )}

      {/* Stepper Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isCompleted = i < step
          return (
            <button
              key={s.label}
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={cn(
                "flex items-center gap-2 flex-shrink-0 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-300",
                isActive ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]" :
                isCompleted ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 cursor-pointer hover:bg-blue-100/60" :
                "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800 opacity-60"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                isActive ? "bg-white/20 text-white font-black" :
                isCompleted ? "bg-blue-500 text-white" :
                "bg-slate-100 dark:bg-slate-800 text-slate-400"
              )}>
                {isCompleted ? <Check className="w-3 h-3 stroke-[2.5]" /> : <span>{i + 1}</span>}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Wizard Form Container */}
      <div className="relative bg-white dark:bg-slate-900 rounded-[26px] p-6 sm:p-8 border border-slate-100/90 dark:border-slate-800/80 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.02)]">
        {step === 0 && (
          <Section title="Company Identity" icon={Building2} description="Core organization naming, unique routing code, and contact email.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <Field label="Company Name" required>
                <input required className="input-field" value={form.companyName} onChange={(e) => setValue('companyName', e.target.value)} placeholder="e.g. Acme Technologies Inc." />
              </Field>
              <Field label="Company Code" required error={codeCheck?.available === false ? codeCheck.reason : ''} hint="Unique uppercase alphanumeric tag (used for IDs)">
                <input required className="input-field uppercase font-bold" value={form.tenantCode} onChange={(e) => setValue('tenantCode', e.target.value.toUpperCase())} placeholder="ACME" />
              </Field>
              <Field label="Subdomain Routing" error={subdomainCheck?.available === false ? subdomainCheck.reason : ''} hint="Custom workspace portal URL (e.g. acme.nexahr.io)">
                <div className="relative flex items-center">
                  <input className="input-field lowercase pr-24" value={form.subdomain} onChange={(e) => setValue('subdomain', e.target.value.toLowerCase())} placeholder="acme" />
                  <span className="absolute right-3.5 text-xs text-slate-400 font-semibold pointer-events-none">.nexahr.io</span>
                </div>
              </Field>
              <Field label="Business Email" required>
                <input required type="email" className="input-field" value={form.email} onChange={(e) => setValue('email', e.target.value)} placeholder="contact@company.com" />
              </Field>
              <Field label="Contact Phone">
                <input className="input-field" value={form.phone} onChange={(e) => setValue('phone', e.target.value)} placeholder="+91 98765 43210" />
              </Field>
              <Field label="Industry Sector">
                <input className="input-field" value={form.industryType} onChange={(e) => setValue('industryType', e.target.value)} placeholder="e.g. Software & Technology" />
              </Field>
              <Field label="Company Logo URL" hint="Direct link to SVG or PNG logo asset">
                <input className="input-field" value={form.logoUrl} onChange={(e) => setValue('logoUrl', e.target.value)} placeholder="https://..." />
              </Field>
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section title="Legal & Regional Locale" icon={Globe} description="Billing currency, registered address, tax numbers, and timezone defaults.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <Field label="Country"><input className="input-field" value={form.country} onChange={(e) => setValue('country', e.target.value)} /></Field>
              <Field label="State / Province"><input className="input-field" value={form.state} onChange={(e) => setValue('state', e.target.value)} /></Field>
              <Field label="City"><input className="input-field" value={form.city} onChange={(e) => setValue('city', e.target.value)} /></Field>
              <Field label="Registered Corporate Address"><input className="input-field" value={form.address} onChange={(e) => setValue('address', e.target.value)} /></Field>
              <Field label="GST / VAT Tax Number"><input className="input-field uppercase" value={form.gstNumber} onChange={(e) => setValue('gstNumber', e.target.value)} placeholder="27AAAAA0000A1Z5" /></Field>
              <Field label="PAN / Tax ID"><input className="input-field uppercase" value={form.panNumber} onChange={(e) => setValue('panNumber', e.target.value)} placeholder="ABCDE1234F" /></Field>
              <Field label="System Time Zone">
                <select className="input-field" value={form.timezone} onChange={(e) => setValue('timezone', e.target.value)}>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC (GMT +0:00)</option>
                  <option value="America/New_York">America/New_York (EST -5:00)</option>
                  <option value="Europe/London">Europe/London (BST +1:00)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                </select>
              </Field>
              <Field label="Base Currency">
                <select className="input-field font-semibold" value={form.currency} onChange={(e) => setValue('currency', e.target.value)}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </Field>
            </div>
          </Section>
        )}

        {step === 2 && (
          <Section title="Primary Administrator" icon={UserCheck} description="Initial super admin account for the tenant organization.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <Field label="Admin Full Name" required>
                <input required className="input-field" value={form.adminName} onChange={(e) => setValue('adminName', e.target.value)} placeholder="John Doe" />
              </Field>
              <Field label="Work Email Address" required error={emailCheck?.available === false ? emailCheck.reason : ''} hint="Used for initial admin dashboard sign-in">
                <input required type="email" className="input-field" value={form.adminEmail} onChange={(e) => setValue('adminEmail', e.target.value)} placeholder="admin@company.com" />
              </Field>
              <Field label="Admin Phone Number">
                <input className="input-field" value={form.adminPhone} onChange={(e) => setValue('adminPhone', e.target.value)} placeholder="+91 98765 43210" />
              </Field>
            </div>
            <div className="mt-4 p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
              <label className="flex items-center gap-3 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                <input type="checkbox" checked={form.sendLoginInvitation} onChange={(e) => setValue('sendLoginInvitation', e.target.checked)} className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span>Issue initial login invitation credentials upon cluster provisioning</span>
              </label>
              <p className="mt-1 text-[11px] text-slate-400 pl-7">A secure one-time generated password will be displayed on the final review step for you to copy directly.</p>
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section title="Organization Defaults" icon={Settings} description="Working shifts, employee badge prefix, and weekly offs.">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              <Field label="Employee ID Prefix" hint="e.g. EMP-001, ACME-101">
                <input className="input-field uppercase font-bold" value={form.employeeIdPrefix} onChange={(e) => setValue('employeeIdPrefix', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Office Shift Start Time">
                <input type="time" className="input-field" value={form.officeStartTime} onChange={(e) => setValue('officeStartTime', e.target.value)} />
              </Field>
              <Field label="Office Shift End Time">
                <input type="time" className="input-field" value={form.officeEndTime} onChange={(e) => setValue('officeEndTime', e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <div>
                <p className="mb-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">Official Working Days</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => {
                    const isSelected = form.workingDays.includes(day)
                    return (
                      <button 
                        type="button" 
                        key={day} 
                        onClick={() => toggleList('workingDays', day)} 
                        className={cn(
                          "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all",
                          isSelected ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">Weekly Off Days</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => {
                    const isSelected = form.weeklyOff.includes(day)
                    return (
                      <button 
                        type="button" 
                        key={day} 
                        onClick={() => toggleList('weeklyOff', day)} 
                        className={cn(
                          "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all",
                          isSelected ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </Section>
        )}

        {step === 4 && (
          <Section title="Subscription Plan & Modules" icon={CreditCard} description="Select pricing tier, seat allocation limit, and enabled feature modules.">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <Field label="Subscription Plan Tier">
                <select className="input-field font-bold text-blue-600 dark:text-blue-400" value={form.planId} onChange={(e) => setValue('planId', e.target.value)}>
                  <option value="">No plan (Custom Tier)</option>
                  {plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.name} — ${plan.price || 0}/mo</option>)}
                </select>
              </Field>
              <Field label="Max Employee Limit (Seats)">
                <input type="number" min="1" className="input-field font-bold" value={form.employeeLimit} onChange={(e) => setValue('employeeLimit', Number(e.target.value))} />
              </Field>
              <Field label="Contract Start Date">
                <input type="date" className="input-field" value={form.subscriptionStartDate} onChange={(e) => setValue('subscriptionStartDate', e.target.value)} />
              </Field>
              <Field label="Trial / Renewal Expiry">
                <input type="date" className="input-field" value={form.subscriptionEndDate} onChange={(e) => setValue('subscriptionEndDate', e.target.value)} />
              </Field>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Enabled HR SaaS Modules</p>
                <span className="text-[11px] font-semibold text-slate-400">Click to toggle module access</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {MODULES.map((mod) => {
                  const isEnabled = !!form.features[mod.key]
                  return (
                    <button
                      type="button"
                      key={mod.key}
                      onClick={() => toggleFeature(mod.key)}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between min-h-[76px]",
                        isEnabled 
                          ? "border-blue-500/80 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm" 
                          : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60 hover:opacity-100"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("text-xs font-bold", isEnabled ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300")}>
                          {mod.label}
                        </span>
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px]", isEnabled ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-300")}>
                          {isEnabled && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium mt-1">{mod.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </Section>
        )}

        {step === 5 && (
          <Section title="Payroll Defaults" icon={Layers} description="Disbursement frequency and cutoff day parameters.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <Field label="Salary Pay Frequency">
                <select className="input-field font-semibold" value={form.payFrequency} onChange={(e) => setValue('payFrequency', e.target.value)}>
                  <option value="MONTHLY">Monthly Cycle (End of Month)</option>
                  <option value="BIWEEKLY">Bi-weekly (Every 2 Weeks)</option>
                  <option value="WEEKLY">Weekly Payouts</option>
                </select>
              </Field>
              <Field label="Payroll Cutoff Day (1 - 28)" hint="Day of month when attendance/leaves are locked">
                <input type="number" min="1" max="28" className="input-field font-bold" value={form.payrollCutoffDay} onChange={(e) => setValue('payrollCutoffDay', Number(e.target.value))} />
              </Field>
            </div>
          </Section>
        )}

        {step === 6 && (
          <Section title="Security & Authentication Policies" icon={Shield} description="Domain whitelisting and enterprise session lifetime rules.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <Field label="Whitelisted Corporate Email Domains" hint="Comma-separated (e.g. acme.com, acmetech.io)">
                <input className="input-field" value={form.allowedEmailDomainsText} onChange={(e) => setValue('allowedEmailDomainsText', e.target.value)} placeholder="acme.com, acmetech.io" />
              </Field>
              <Field label="Session Idle Timeout (Minutes)" hint="Automatically logs out inactive users">
                <input type="number" min="5" className="input-field font-bold" value={form.sessionTimeoutMinutes} onChange={(e) => setValue('sessionTimeoutMinutes', Number(e.target.value))} />
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

        {/* Wizard Footer Controls */}
        {step < 7 && (
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button" 
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
              onClick={goBack} 
              disabled={step === 0}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button 
              type="button" 
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 hover:shadow-blue-500/35 transition-all disabled:opacity-40 active:scale-95"
              onClick={goNext} 
              disabled={!stepValid}
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
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
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 border border-purple-100 dark:border-purple-900/50">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Review & Provision Tenant</h3>
          <p className="text-xs text-slate-400 font-medium">Verify organization specifications and launch multi-tenant database provisioning.</p>
        </div>
      </div>

      {!job && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SummaryBlock title="Organization Identity" icon={Building2}>
              <SummaryRow label="Company Name" value={form.companyName} />
              <SummaryRow label="Tenant Code" value={form.tenantCode} />
              <SummaryRow label="Subdomain" value={form.subdomain ? `${form.subdomain}.nexahr.io` : '—'} />
              <SummaryRow label="Business Email" value={form.email} />
            </SummaryBlock>

            <SummaryBlock title="Primary Administrator" icon={UserCheck}>
              <SummaryRow label="Admin Name" value={form.adminName} />
              <SummaryRow label="Admin Email" value={form.adminEmail} />
              <SummaryRow label="Invitation Mode" value={form.sendLoginInvitation ? 'Credentials displayed' : 'Silent'} />
            </SummaryBlock>

            <SummaryBlock title="Subscription Tier" icon={CreditCard}>
              <SummaryRow label="Selected Plan" value={plan?.name || 'Custom Enterprise'} />
              <SummaryRow label="Employee Allocation" value={`${form.employeeLimit} Seats`} />
              <SummaryRow label="Modules" value={Object.entries(form.features).filter(([, v]) => v).map(([k]) => k.replace('_', ' ')).join(', ') || 'None'} />
            </SummaryBlock>

            <SummaryBlock title="Locale & Currency" icon={Globe}>
              <SummaryRow label="Country" value={form.country} />
              <SummaryRow label="Timezone" value={form.timezone} />
              <SummaryRow label="Currency" value={form.currency} />
            </SummaryBlock>
          </div>

          {submitError && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-4 text-xs font-semibold text-rose-600 dark:text-rose-400">
              {submitError}
            </div>
          )}

          <button 
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold text-sm shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
            onClick={onSubmit} 
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Provisioning Tenant Database Cluster...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Confirm & Provision Organization</span>
              </>
            )}
          </button>
        </div>
      )}

      {job && (
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Cluster Provisioning State:</span>
            </div>
            <StatusPill status={job.status} />
          </div>

          {steps && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Provisioning Pipeline Execution</p>
              <ol className="space-y-2.5">
                {steps.map((s) => (
                  <li key={s.stepKey} className="flex items-center gap-3 text-xs font-medium">
                    <StepIcon status={s.status} />
                    <span className="text-slate-800 dark:text-slate-200 flex-1">{s.stepKey.replace(/_/g, ' ').toUpperCase()}</span>
                    {s.error && <span className="text-[11px] text-rose-500 font-semibold">{s.error}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {job.status === 'COMPLETED' && (
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-5 text-xs text-emerald-800 dark:text-emerald-200 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Organization & Database Cluster Provisioned Successfully!</span>
              </div>
              {job.tempPassword && (
                <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900/40">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Administrator Initial One-Time Access Key:
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl p-3 font-mono font-bold text-center text-sm border border-emerald-200 dark:border-slate-800 text-slate-900 dark:text-white">
                      {job.tempPassword}
                    </div>
                    <button 
                      type="button" 
                      className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                      onClick={copyPassword}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copied ? 'Copied!' : 'Copy Key'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-3">
            {(job.status === 'FAILED' || job.status === 'PARTIALLY_COMPLETED') && (
              <button 
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2"
                onClick={onRetry} 
                disabled={submitting}
              >
                <RotateCw className={cn("w-3.5 h-3.5", submitting && "animate-spin")} /> Retry Provisioning
              </button>
            )}
            <button 
              className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20"
              onClick={onDone}
            >
              Open Organization Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryBlock({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 bg-slate-50/50 dark:bg-slate-900/40">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-3.5 h-3.5 text-blue-500" />}
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between items-center text-xs py-0.5">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className="text-slate-800 dark:text-slate-200 font-bold text-right truncate max-w-[200px]">{value || '—'}</span>
    </div>
  )
}

function StatusPill({ status }) {
  const isComplete = status === 'COMPLETED'
  const isFailed = status === 'FAILED'
  return (
    <span className={cn(
      "px-3 py-0.5 rounded-full text-xs font-bold border",
      isComplete ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400" :
      isFailed ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400" :
      "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400"
    )}>
      {status}
    </span>
  )
}

function StepIcon({ status }) {
  if (status === 'COMPLETED') return <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
  if (status === 'FAILED') return <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
  if (status === 'RUNNING') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
  return <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700 flex-shrink-0" />
}
