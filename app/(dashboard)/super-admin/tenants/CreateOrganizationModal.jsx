'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  Upload,
  UserCheck,
} from 'lucide-react'
import { platformApi } from '@/services/platformApi'
import { tenantApi } from '@/services/tenantApi'
import api from '@/services/api'
import { cn } from '@/lib/utils'

const DRAFT_KEY = 'nexahr_add_organization_draft_v2'
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const BUSINESS_TYPES = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education', 'Real Estate', 'Consulting', 'Other']
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

const STEPS = [
  { title: 'Company Details', description: 'Organization information', icon: Building2 },
  { title: 'Admin Details', description: 'Primary administrator', icon: UserCheck },
  { title: 'Select Plan', description: 'Subscription & billing', icon: CreditCard },
]

const fallbackPlatformSettings = {
  organizationDefaults: {
    defaultCountry: 'India',
    defaultTimezone: 'Asia/Kolkata',
    tenantCodePrefix: '',
  },
  provisioning: {
    databasePrefix: 'nexahr_tenant',
  },
}

function defaultForm(settings = fallbackPlatformSettings) {
  const defaults = settings.organizationDefaults || fallbackPlatformSettings.organizationDefaults
  return {
    companyName: '',
    legalBusinessName: '',
    tenantCode: '',
    industryType: 'Technology',
    logoUrl: '',
    logoPreview: '',
    website: '',
    gstNumber: '',
    panNumber: '',
    businessRegistrationNumber: '',
    email: '',
    phone: '+91 ',
    address: '',
    country: defaults.defaultCountry || 'India',
    state: '',
    city: '',
    pincode: '',
    timezone: defaults.defaultTimezone || 'Asia/Kolkata',
    currency: 'INR',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPhone: '+91 ',
    adminDesignation: '',
    adminProfilePhotoUrl: '',
    adminProfilePreview: '',
    sendLoginInvitation: true,
    passwordMode: 'GENERATE',
    adminPassword: '',
    confirmAdminPassword: '',
    planId: '',
  }
}

function newIdempotencyKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `org_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function normalizeCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 20)
}

function suggestCode(name) {
  const words = String(name || '').match(/[a-z0-9]+/gi) || []
  const seed = words.length > 1 ? words.map((word) => word[0]).join('') : words.join('')
  return normalizeCode(seed).slice(0, 8)
}

function applyTenantCodePrefix(code, settings) {
  const prefix = normalizeCode(settings?.organizationDefaults?.tenantCodePrefix || '')
  const normalized = normalizeCode(code)
  if (!prefix) return normalized
  if (normalized.startsWith(prefix)) return normalized
  return normalizeCode(`${prefix}${normalized}`)
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function isUrl(value) {
  if (!value) return true
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

function isPhone(value) {
  return /^\+\d{1,4}[\d\s-]{7,18}$/.test(String(value || '').trim())
}

function isGstin(value) {
  return !value || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(value).trim().toUpperCase())
}

function isPan(value) {
  return !value || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(value).trim().toUpperCase())
}

function isIndianPin(country, value) {
  return country !== 'India' || /^[1-9][0-9]{5}$/.test(String(value || '').trim())
}

function isStrongPassword(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(String(value || ''))
}

function formatCurrency(value, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0))
}

function limitText(value, suffix = '') {
  if (value === -1 || value === '-1') return 'Unlimited'
  if (value === undefined || value === null || value === '') return 'Not set'
  return `${value}${suffix}`
}

function readDraft() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function Field({ label, required, error, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
        {label}{required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-rose-500">{error}</span> : null}
      {!error && hint ? <span className="mt-1 block text-[11px] font-medium text-slate-400">{hint}</span> : null}
    </label>
  )
}

const SECTION_COLORS = {
  blue: {
    blob: 'bg-blue-500/5 dark:bg-blue-500/10',
    iconBg: 'from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-600 dark:text-blue-400 ring-blue-100/50 dark:ring-blue-800/50',
  },
  indigo: {
    blob: 'bg-indigo-500/5 dark:bg-indigo-500/10',
    iconBg: 'from-indigo-50 to-violet-50 dark:from-indigo-900/40 dark:to-violet-900/40 text-indigo-600 dark:text-indigo-400 ring-indigo-100/50 dark:ring-indigo-800/50',
  },
  emerald: {
    blob: 'bg-emerald-500/5 dark:bg-emerald-500/10',
    iconBg: 'from-emerald-50 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-600 dark:text-emerald-400 ring-emerald-100/50 dark:ring-emerald-800/50',
  },
  rose: {
    blob: 'bg-rose-500/5 dark:bg-rose-500/10',
    iconBg: 'from-rose-50 to-pink-50 dark:from-rose-900/40 dark:to-pink-900/40 text-rose-600 dark:text-rose-400 ring-rose-100/50 dark:ring-rose-800/50',
  },
  amber: {
    blob: 'bg-amber-500/5 dark:bg-amber-500/10',
    iconBg: 'from-amber-50 to-orange-50 dark:from-amber-900/40 dark:to-orange-900/40 text-amber-600 dark:text-amber-400 ring-amber-100/50 dark:ring-amber-800/50',
  },
}

function Section({ title, description, icon: Icon, color = 'blue', children }) {
  const theme = SECTION_COLORS[color] || SECTION_COLORS.blue
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl transition-all hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/80">
      <div className={cn("absolute -right-20 -top-20 h-40 w-40 rounded-full blur-[80px] pointer-events-none", theme.blob)} />
      <div className="relative mb-6 flex items-center gap-4 border-b border-slate-100/80 pb-5 dark:border-slate-800/80">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm ring-1", theme.iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
          {description ? <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
      </div>
      <div className="relative">{children}</div>
    </section>
  )
}

function ImageUploader({ label, value, uploading, error, onFile, onRemove }) {
  const inputRef = useRef(null)

  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <div
        className={cn(
          'group relative flex min-h-[140px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all duration-300',
          error 
            ? 'border-rose-300 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/20' 
            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-blue-400/50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800/80 dark:hover:border-blue-500/50'
        )}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const file = event.dataTransfer.files?.[0]
          if (file) onFile(file)
        }}
      >
        {value ? (
          <div className="flex w-full items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="relative overflow-hidden rounded-2xl border-4 border-white bg-white shadow-xl dark:border-slate-800">
              <img src={value} alt="" className="h-24 w-24 object-cover" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Image ready</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Looking great!</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-secondary !rounded-xl !px-3 !py-1.5 !text-xs !shadow-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
                  Replace
                </button>
                <button type="button" className="btn-secondary !rounded-xl !px-3 !py-1.5 !text-xs !text-rose-600 hover:!bg-rose-50 dark:hover:!bg-rose-900/30" onClick={onRemove} disabled={uploading}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-white text-slate-400 shadow-md ring-1 ring-slate-100 transition-transform duration-300 group-hover:-translate-y-1 group-hover:text-blue-500 group-hover:shadow-lg dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700 dark:group-hover:text-blue-400">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin text-blue-500" /> : <ImagePlus className="h-6 w-6" />}
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Drop image here or browse</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">JPG, PNG, WEBP up to 2 MB</p>
            <button type="button" className="btn-secondary mt-4 !rounded-xl !px-4 !py-2 !text-xs !font-bold !shadow-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload className="h-3.5 w-3.5" /> Browse file
            </button>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onFile(file)
        }}
      />
      {error ? <p className="mt-1.5 text-xs font-semibold text-rose-500">{error}</p> : null}
    </div>
  )
}

import { Portal } from '@/components/common/Portal'
import { X } from 'lucide-react'

export function CreateOrganizationModal({ isOpen, onClose }) {
  const router = useRouter()
  const scrollRef = useRef(null)
  const [platformSettings, setPlatformSettings] = useState(fallbackPlatformSettings)
  const [form, setForm] = useState(() => defaultForm(fallbackPlatformSettings))
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [step])

  const [reviewing, setReviewing] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [draftBanner, setDraftBanner] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [plansError, setPlansError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [profileUploading, setProfileUploading] = useState(false)
  const [codeCheck, setCodeCheck] = useState(null)
  const [emailCheck, setEmailCheck] = useState(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let active = true
    api.get('/super-admin/settings', { skipCache: true, devMock: false })
      .then(({ data }) => {
        if (!active) return
        const nextSettings = {
          organizationDefaults: {
            ...fallbackPlatformSettings.organizationDefaults,
            ...(data.data?.settings?.organizationDefaults || {}),
          },
          provisioning: {
            ...fallbackPlatformSettings.provisioning,
            ...(data.data?.settings?.provisioning || {}),
          },
        }
        setPlatformSettings(nextSettings)
        setForm((current) => {
          const pristine = !current.companyName && !current.email && !current.adminEmail
          return pristine ? defaultForm(nextSettings) : current
        })
      })
      .catch(() => {
        if (active) setPlatformSettings(fallbackPlatformSettings)
      })
    return () => { active = false }
  }, [isOpen])

  useEffect(() => {
    const draft = readDraft()
    if (draft?.form && draft?.idempotencyKey) {
      setDraftBanner(true)
      setIdempotencyKey(draft.idempotencyKey)
    } else {
      setIdempotencyKey(newIdempotencyKey())
    }
  }, [])

  useEffect(() => {
    if (!idempotencyKey || success) return
    const timer = setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step, reviewing, idempotencyKey, savedAt: Date.now() }))
    }, 300)
    return () => clearTimeout(timer)
  }, [form, step, reviewing, idempotencyKey, success])

  useEffect(() => {
    if (!form.tenantCode) {
      setCodeCheck(null)
      return
    }
    const timer = setTimeout(() => {
      platformApi.checkCompanyCode(form.tenantCode)
        .then((res) => setCodeCheck(res.data.data))
        .catch(() => setCodeCheck(null))
    }, 400)
    return () => clearTimeout(timer)
  }, [form.tenantCode])

  useEffect(() => {
    if (!form.adminEmail || !isEmail(form.adminEmail)) {
      setEmailCheck(null)
      return
    }
    const timer = setTimeout(() => {
      platformApi.checkAdminEmail(form.adminEmail)
        .then((res) => setEmailCheck(res.data.data))
        .catch(() => setEmailCheck(null))
    }, 400)
    return () => clearTimeout(timer)
  }, [form.adminEmail])

  useEffect(() => {
    if (step === 2) loadPlans()
  }, [step])

  const activePlans = useMemo(() => plans.filter((plan) => plan.active !== false && plan.deleted !== true), [plans])
  const selectedPlan = useMemo(() => activePlans.find((plan) => plan._id === form.planId), [activePlans, form.planId])

  function update(field, value) {
    setDirty(true)
    setForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'companyName' && !current.tenantCode) next.tenantCode = applyTenantCodePrefix(suggestCode(value), platformSettings)
      return next
    })
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  function resumeDraft() {
    const draft = readDraft()
    if (draft?.form) {
      setForm({ ...defaultForm(platformSettings), ...draft.form })
      setStep(draft.step || 0)
      setReviewing(!!draft.reviewing)
      setDirty(true)
    }
    setDraftBanner(false)
  }

  function discardDraft() {
    window.localStorage.removeItem(DRAFT_KEY)
    setForm(defaultForm(platformSettings))
    setStep(0)
    setReviewing(false)
    setIdempotencyKey(newIdempotencyKey())
    setDirty(false)
    setDraftBanner(false)
    setErrors({})
  }

  function cancel() {
    if (dirty && !window.confirm('Discard this organization draft?')) return
    discardDraft()
    onClose()
  }

  async function loadPlans() {
    setPlansLoading(true)
    setPlansError('')
    try {
      const { data } = await tenantApi.getPlans()
      setPlans(data.data || [])
    } catch (err) {
      setPlansError(err.response?.data?.message || 'Unable to load subscription plans')
    } finally {
      setPlansLoading(false)
    }
  }

  async function uploadImage(file, purpose) {
    if (!IMAGE_TYPES.includes(file.type)) throw new Error('Only JPG, PNG and WEBP images are supported')
    if (file.size > MAX_IMAGE_BYTES) throw new Error('Image must be 2 MB or smaller')
    const { data } = await platformApi.uploadOnboardingImage(file, purpose)
    return data.data?.url || data.url
  }

  async function handleImage(file, purpose) {
    const isLogo = purpose === 'organization-logo'
    const errorKey = isLogo ? 'logoUrl' : 'adminProfilePhotoUrl'
    const uploadSetter = isLogo ? setLogoUploading : setProfileUploading
    const urlKey = isLogo ? 'logoUrl' : 'adminProfilePhotoUrl'
    const previewKey = isLogo ? 'logoPreview' : 'adminProfilePreview'
    uploadSetter(true)
    setErrors((current) => ({ ...current, [errorKey]: '' }))
    try {
      const preview = URL.createObjectURL(file)
      const url = await uploadImage(file, purpose)
      setDirty(true)
      setForm((current) => ({ ...current, [urlKey]: url, [previewKey]: preview }))
    } catch (err) {
      setErrors((current) => ({ ...current, [errorKey]: err.response?.data?.message || err.message || 'Image upload failed' }))
    } finally {
      uploadSetter(false)
    }
  }

  function validateStep(targetStep = step) {
    const nextErrors = {}
    if (targetStep === 0) {
      if (form.companyName.trim().length < 2) nextErrors.companyName = 'Organization name is required'
      if (!form.tenantCode || !/^[A-Z0-9]{2,20}$/.test(form.tenantCode)) nextErrors.tenantCode = 'Use 2-20 letters or numbers'
      if (codeCheck?.available === false) nextErrors.tenantCode = codeCheck.reason
      if (!form.industryType) nextErrors.industryType = 'Business type is required'
      if (form.website && !isUrl(form.website)) nextErrors.website = 'Enter a valid http or https URL'
      if (!isGstin(form.gstNumber)) nextErrors.gstNumber = 'Enter a valid GSTIN'
      if (!isPan(form.panNumber)) nextErrors.panNumber = 'Enter a valid PAN'
      if (!isEmail(form.email)) nextErrors.email = 'Enter a valid business email'
      if (!isPhone(form.phone)) nextErrors.phone = 'Enter phone with country code'
      if (!form.address.trim()) nextErrors.address = 'Address is required'
      if (!form.country.trim()) nextErrors.country = 'Country is required'
      if (!form.state.trim()) nextErrors.state = 'State is required'
      if (!form.city.trim()) nextErrors.city = 'City is required'
      if (!isIndianPin(form.country, form.pincode)) nextErrors.pincode = 'Enter a valid 6 digit PIN code'
      if (!form.timezone) nextErrors.timezone = 'Timezone is required'
      if (!form.currency) nextErrors.currency = 'Currency is required'
    }
    if (targetStep === 1) {
      if (!form.adminFirstName.trim()) nextErrors.adminFirstName = 'First name is required'
      if (!form.adminLastName.trim()) nextErrors.adminLastName = 'Last name is required'
      if (!isEmail(form.adminEmail)) nextErrors.adminEmail = 'Enter a valid work email'
      if (emailCheck?.available === false) nextErrors.adminEmail = emailCheck.reason
      if (!isPhone(form.adminPhone)) nextErrors.adminPhone = 'Enter phone with country code'
      if (form.passwordMode === 'CUSTOM') {
        if (!isStrongPassword(form.adminPassword)) nextErrors.adminPassword = 'Use at least 8 characters with uppercase, lowercase and a number'
        if (form.adminPassword !== form.confirmAdminPassword) nextErrors.confirmAdminPassword = 'Passwords do not match'
      }
    }
    if (targetStep === 2 && !form.planId) nextErrors.planId = 'Select an active subscription plan'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function next() {
    if (!validateStep(step)) return
    if (step === 2) {
      setReviewing(true)
      return
    }
    setStep((current) => current + 1)
  }

  function back() {
    if (reviewing) {
      setReviewing(false)
      return
    }
    setStep((current) => Math.max(0, current - 1))
  }

  function buildPayload() {
    const plan = selectedPlan
    const provisioning = platformSettings.provisioning || fallbackPlatformSettings.provisioning
    const planEmployeeLimit = plan?.employeeLimit
    const planStorageLimit = plan?.storageLimitMb
    const planTrialDays = plan?.trialDays
    const effectiveTrialDays = Number.isFinite(Number(planTrialDays)) ? Number(planTrialDays) : 0
    const subscriptionStartDate = new Date()
    const subscriptionEndDate = effectiveTrialDays > 0
      ? new Date(subscriptionStartDate.getTime() + effectiveTrialDays * 86400000).toISOString().slice(0, 10)
      : undefined
    return {
      companyName: form.companyName.trim(),
      legalBusinessName: form.legalBusinessName.trim(),
      tenantCode: normalizeCode(form.tenantCode),
      industryType: form.industryType,
      logoUrl: form.logoUrl,
      website: form.website.trim(),
      gstNumber: form.gstNumber.trim().toUpperCase(),
      panNumber: form.panNumber.trim().toUpperCase(),
      businessRegistrationNumber: form.businessRegistrationNumber.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      country: form.country.trim(),
      state: form.state.trim(),
      city: form.city.trim(),
      pincode: form.pincode.trim(),
      timezone: form.timezone,
      currency: form.currency,
      adminName: `${form.adminFirstName.trim()} ${form.adminLastName.trim()}`.trim(),
      adminEmail: form.adminEmail.trim().toLowerCase(),
      adminPhone: form.adminPhone.trim(),
      adminProfilePhotoUrl: form.adminProfilePhotoUrl,
      sendLoginInvitation: form.sendLoginInvitation,
      planId: form.planId,
      employeeLimit: planEmployeeLimit ?? 50,
      storageLimitMb: planStorageLimit ?? 5120,
      features: Object.fromEntries((plan?.features || []).map((feature) => [String(feature).toLowerCase().replace(/\s+/g, '_'), true])),
      subscriptionStartDate: subscriptionStartDate.toISOString().slice(0, 10),
      subscriptionEndDate,
      trialDays: effectiveTrialDays,
      databasePrefix: provisioning.databasePrefix || 'nexahr_tenant',
      employeeIdPrefix: 'EMP',
      officeStartTime: '09:00',
      officeEndTime: '18:00',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      weeklyOff: ['Saturday', 'Sunday'],
      payFrequency: 'MONTHLY',
      payrollCutoffDay: 25,
      allowedEmailDomains: [],
    }
  }

  async function createOrganization() {
    if (!validateStep(2) || !selectedPlan) {
      setReviewing(false)
      setStep(2)
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const initialPassword = form.passwordMode === 'CUSTOM' ? form.adminPassword : undefined
      const { data } = await platformApi.provisionTenant(idempotencyKey, buildPayload(), initialPassword)
      const job = data.data?.job
      const tenant = job?.tenant
      window.localStorage.removeItem(DRAFT_KEY)
      setSuccess({
        jobId: job?._id,
        status: job?.status || 'PENDING',
        error: job?.error || '',
        tenantId: tenant?._id || tenant || job?.tenant,
        organizationName: form.companyName,
        adminName: `${form.adminFirstName} ${form.adminLastName}`.trim(),
        adminEmail: form.adminEmail,
        planName: selectedPlan.name,
        price: selectedPlan.price,
        billingCycle: selectedPlan.billingCycle,
        invitation: form.sendLoginInvitation ? 'Prepared for administrator' : 'Invitation disabled',
        passwordMode: form.passwordMode,
        tempPassword: data.data?.tempPassword,
      })
      setDirty(false)
    } catch (err) {
      const message = err.response?.data?.message || 'Organization creation failed. Please try again.'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!success?.jobId || ['COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED'].includes(success.status)) return

    let active = true
    let pollTimer = null

    const pollProvisioningJob = async () => {
      try {
        const { data } = await platformApi.getProvisioningJob(success.jobId)
        if (!active) return
        const job = data.data?.job
        if (!job) return
        const tenant = job.tenant
        setSuccess((current) => {
          if (!current) return current
          return {
            ...current,
            status: job.status || current.status,
            error: job.error || '',
            tenantId: tenant?._id || tenant || job.tenant || current.tenantId,
          }
        })
      } catch (err) {
        if (!active) return
        setSuccess((current) => current ? { ...current, error: err.response?.data?.message || 'Unable to refresh provisioning status' } : current)
      }
    }

    pollProvisioningJob()
    pollTimer = window.setInterval(pollProvisioningJob, 1500)

    return () => {
      active = false
      if (pollTimer) window.clearInterval(pollTimer)
    }
  }, [success?.jobId, success?.status])

  function copyPassword(value) {
    navigator.clipboard?.writeText(value)
    setCopiedPassword(true)
    setTimeout(() => setCopiedPassword(false), 2000)
  }

  if (success) {
    const provisioningDone = success.status === 'COMPLETED'
    const provisioningFailed = ['FAILED', 'PARTIALLY_COMPLETED'].includes(success.status)
    const statusTone = provisioningFailed ? 'rose' : provisioningDone ? 'emerald' : 'blue'
    const title = provisioningFailed
      ? 'Organization Provisioning Needs Attention'
      : provisioningDone
        ? 'Organization Created Successfully'
        : 'Organization Provisioning Started'
    const description = provisioningFailed
      ? (success.error || 'Provisioning did not complete. Review the provisioning job before handing over access.')
      : provisioningDone
        ? `${success.organizationName} has been provisioned and linked to its primary administrator.`
        : `${success.organizationName} is being provisioned. You can keep this screen open; this usually finishes in a few seconds.`

    return (
      <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-3xl min-h-[50vh] rounded-[32px] p-6 sm:p-10 relative shadow-2xl animate-fade-in my-auto">
        <div className={cn(
          'mx-auto max-w-3xl rounded-3xl border bg-white p-8 text-center shadow-sm dark:bg-slate-900',
          statusTone === 'emerald' && 'border-emerald-200 dark:border-emerald-900/60',
          statusTone === 'blue' && 'border-blue-200 dark:border-blue-900/60',
          statusTone === 'rose' && 'border-rose-200 dark:border-rose-900/60'
        )}>
          <div className={cn(
            'mx-auto flex h-16 w-16 items-center justify-center rounded-3xl',
            statusTone === 'emerald' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
            statusTone === 'blue' && 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',
            statusTone === 'rose' && 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300'
          )}>
            {provisioningDone ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : provisioningFailed ? (
              <RefreshCw className="h-8 w-8" />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin" />
            )}
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            {description}
          </p>
          <div className="mt-7 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950/40">
            <SummaryRow label="Provisioning Status" value={success.status || 'PENDING'} />
            <SummaryRow label="Organization ID" value={success.tenantId || 'Creating...'} />
            <SummaryRow label="Primary Admin" value={`${success.adminName} (${success.adminEmail})`} />
            <SummaryRow label="Login Email" value={success.adminEmail} />
            {success.tempPassword ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">One-time Login Password</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-900 dark:border-amber-900/60 dark:bg-slate-900 dark:text-white">
                    {success.tempPassword}
                  </div>
                  <button type="button" className="btn-secondary justify-center !px-3 !py-2 !text-xs" onClick={() => copyPassword(success.tempPassword)}>
                    <Copy className="h-3.5 w-3.5" /> {copiedPassword ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-200">Share this securely. It is shown only on this screen.</p>
                {!provisioningDone ? (
                  <p className="mt-1 text-xs font-semibold text-amber-800 dark:text-amber-200">This password will work after provisioning completes.</p>
                ) : null}
              </div>
            ) : null}
            <SummaryRow label="Subscription" value={`${success.planName} - ${formatCurrency(success.price, form.currency)} / ${String(success.billingCycle || 'MONTHLY').toLowerCase()}`} />
            <SummaryRow label="Invitation" value={success.invitation} />
          </div>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-50" disabled={!success.tenantId} onClick={() => {
              onClose(true);
              router.push(`/super-admin/tenants/${success.tenantId}`);
            }}>
              View Organization
            </button>
            <button type="button" className="btn-secondary justify-center" onClick={() => onClose(true)}>
              Close
            </button>
          </div>
        </div>
      </div>
      </div>
      </Portal>
    )
  }

  if (!isOpen) return null;

  return (
    <Portal>
      <div ref={scrollRef} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
        <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-6xl min-h-[90vh] rounded-[32px] p-6 sm:p-10 relative shadow-2xl animate-fade-in my-auto">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5 text-slate-600 dark:text-slate-300"/>
          </button>
          <div className="space-y-6 pb-12">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create Organization</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Set up a new organization, assign its primary administrator, and activate a subscription plan.
          </p>
        </div>
      </div>

      {draftBanner ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200 sm:flex-row sm:items-center sm:justify-between">
          <span>You have an unfinished organization draft.</span>
          <div className="flex gap-2">
            <button type="button" className="btn-primary !px-3 !py-1.5 !text-xs" onClick={resumeDraft}>Resume</button>
            <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={discardDraft}>Discard</button>
          </div>
        </div>
      ) : null}

      <Stepper step={step} />

      <div className="mx-auto max-w-6xl space-y-6">
        {!reviewing && step === 0 ? (
          <CompanyStep
            form={form}
            errors={errors}
            codeCheck={codeCheck}
            logoUploading={logoUploading}
            update={update}
            handleImage={handleImage}
          />
        ) : null}
        {!reviewing && step === 1 ? (
          <AdminStep
            form={form}
            errors={errors}
            emailCheck={emailCheck}
            profileUploading={profileUploading}
            update={update}
            handleImage={handleImage}
          />
        ) : null}
        {!reviewing && step === 2 ? (
          <PlanStep
            form={form}
            errors={errors}
            plans={activePlans}
            selectedPlan={selectedPlan}
            loading={plansLoading}
            loadError={plansError}
            onRetry={loadPlans}
            update={update}
          />
        ) : null}
        {reviewing ? (
          <ReviewStep
            form={form}
            plan={selectedPlan}
            submitError={submitError}
            submitting={submitting}
            onEdit={(targetStep) => {
              setReviewing(false)
              setStep(targetStep)
            }}
            onCancel={cancel}
            onBack={back}
            onCreate={createOrganization}
          />
        ) : null}

        {!reviewing ? (
          <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
            <button type="button" className="btn-secondary justify-center" onClick={step === 0 ? cancel : back}>
              {step === 0 ? 'Cancel' : <><ArrowLeft className="h-4 w-4" /> Back</>}
            </button>
            <button type="button" className="btn-primary justify-center" onClick={next} disabled={logoUploading || profileUploading || plansLoading}>
              {step === 0 ? 'Save & Continue' : step === 2 ? 'Continue to Review' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
      </div>
      </div>
      </div>
      </Portal>
  )
}

function Stepper({ step }) {
  return (
    <div className="mx-auto max-w-6xl rounded-[32px] border border-white/40 bg-white/60 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-2xl dark:border-slate-800/40 dark:bg-slate-900/60 dark:shadow-slate-900/40">
      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((item, index) => {
          const Icon = item.icon
          const active = index === step
          const complete = index < step
          return (
            <div key={item.title} className={cn('group relative overflow-hidden rounded-[24px] border p-5 transition-all duration-500 ease-out', active ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/50 shadow-md shadow-blue-500/10 dark:border-blue-800/50 dark:from-blue-950/50 dark:to-indigo-950/30 dark:shadow-blue-900/20 transform scale-[1.02]' : complete ? 'border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 to-teal-50/30 dark:border-emerald-800/40 dark:from-emerald-950/30 dark:to-teal-950/10 hover:border-emerald-300 hover:bg-emerald-50' : 'border-slate-200/60 bg-white/40 dark:border-slate-800/60 dark:bg-slate-900/40 opacity-70')}>
              {active && <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-[40px] pointer-events-none" />}
              <div className="relative flex items-center gap-4">
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold transition-all duration-500', active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-4 ring-blue-600/20' : complete ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>
                  {complete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div>
                  <p className={cn("text-[10px] font-bold uppercase tracking-widest", active ? "text-blue-600 dark:text-blue-400" : complete ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>0{index + 1}</p>
                  <p className="text-base font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">{item.title}</p>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CompanyStep({ form, errors, codeCheck, logoUploading, update, handleImage }) {
  return (
    <div className="space-y-5">
      <Section title="Organization Information" description="Basic organization identity and branding." icon={Building2} color="blue">
        <div className="grid gap-5 lg:grid-cols-2">
          <Field label="Organization Name" required error={errors.companyName}>
            <input className="input-field" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder="Enter organization name" />
          </Field>
          <Field label="Organization Code" required error={errors.tenantCode || (codeCheck?.available === true ? '' : '')} hint={codeCheck?.available ? 'Code is available' : 'Used for tenant database and employee IDs'}>
            <input className="input-field uppercase font-bold" value={form.tenantCode} onChange={(e) => update('tenantCode', normalizeCode(e.target.value))} placeholder="ORGCODE" />
          </Field>
          <Field label="Legal Business Name">
            <input className="input-field" value={form.legalBusinessName} onChange={(e) => update('legalBusinessName', e.target.value)} placeholder="Enter legal business name" />
          </Field>
          <Field label="Business Type" required error={errors.industryType}>
            <select className="input-field" value={form.industryType} onChange={(e) => update('industryType', e.target.value)}>
              {BUSINESS_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="Website" error={errors.website}>
            <input className="input-field" value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://example.com" />
          </Field>
          <ImageUploader
            label="Organization Logo"
            value={form.logoPreview || form.logoUrl}
            uploading={logoUploading}
            error={errors.logoUrl}
            onFile={(file) => handleImage(file, 'organization-logo')}
            onRemove={() => {
              update('logoUrl', '')
              update('logoPreview', '')
            }}
          />
        </div>
      </Section>

      <Section title="Business & Tax Information" description="Optional statutory identifiers." icon={ShieldCheck} color="emerald">
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="GSTIN" error={errors.gstNumber}>
            <input className="input-field uppercase" value={form.gstNumber} onChange={(e) => update('gstNumber', e.target.value.toUpperCase())} placeholder="27AAAAA0000A1Z5" />
          </Field>
          <Field label="PAN" error={errors.panNumber}>
            <input className="input-field uppercase" value={form.panNumber} onChange={(e) => update('panNumber', e.target.value.toUpperCase())} placeholder="ABCDE1234F" />
          </Field>
          <Field label="Business Registration Number">
            <input className="input-field" value={form.businessRegistrationNumber} onChange={(e) => update('businessRegistrationNumber', e.target.value)} placeholder="Registration number" />
          </Field>
        </div>
      </Section>

      <Section title="Primary Business Contact" description="Official contact details for the organization." icon={Mail} color="rose">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Business Email" required error={errors.email}>
            <input type="email" className="input-field" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="contact@organization.com" />
          </Field>
          <Field label="Business Phone" required error={errors.phone}>
            <input className="input-field" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+91 98765 43210" />
          </Field>
        </div>
      </Section>

      <Section title="Business Address" description="Registered location and regional defaults." icon={Building2} color="amber">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Address" required error={errors.address}>
            <input className="input-field" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Building, street, area" />
          </Field>
          <Field label="Country" required error={errors.country}>
            <input className="input-field" value={form.country} onChange={(e) => update('country', e.target.value)} placeholder="India" />
          </Field>
          <Field label="State" required error={errors.state}>
            {form.country === 'India' ? (
              <select className="input-field" value={form.state} onChange={(e) => update('state', e.target.value)}>
                <option value="">Select state</option>
                {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            ) : (
              <input className="input-field" value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="State" />
            )}
          </Field>
          <Field label="City" required error={errors.city}>
            <input className="input-field" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="City" />
          </Field>
          <Field label="PIN Code" required error={errors.pincode}>
            <input className="input-field" value={form.pincode} onChange={(e) => update('pincode', e.target.value)} placeholder="560001" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Timezone" required error={errors.timezone}>
              <select className="input-field" value={form.timezone} onChange={(e) => update('timezone', e.target.value)}>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="UTC">UTC</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </Field>
            <Field label="Currency" required error={errors.currency}>
              <select className="input-field" value={form.currency} onChange={(e) => update('currency', e.target.value)}>
                <option value="INR">INR - Indian Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - Pound Sterling</option>
                <option value="AED">AED - UAE Dirham</option>
              </select>
            </Field>
          </div>
        </div>
      </Section>
    </div>
  )
}

function AdminStep({ form, errors, emailCheck, profileUploading, update, handleImage }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <div className="space-y-5">
      <Section title="Administrator Information" description="Primary Company Admin account." icon={UserCheck} color="indigo">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="First Name" required error={errors.adminFirstName}>
            <input className="input-field" value={form.adminFirstName} onChange={(e) => update('adminFirstName', e.target.value)} placeholder="First name" />
          </Field>
          <Field label="Last Name" required error={errors.adminLastName}>
            <input className="input-field" value={form.adminLastName} onChange={(e) => update('adminLastName', e.target.value)} placeholder="Last name" />
          </Field>
          <Field label="Work Email" required error={errors.adminEmail || (emailCheck?.available === false ? emailCheck.reason : '')} hint={emailCheck?.available ? 'Email is available' : ''}>
            <input type="email" className="input-field" value={form.adminEmail} onChange={(e) => update('adminEmail', e.target.value)} placeholder="admin@organization.com" />
          </Field>
          <Field label="Mobile Number" required error={errors.adminPhone}>
            <input className="input-field" value={form.adminPhone} onChange={(e) => update('adminPhone', e.target.value)} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Designation">
            <input className="input-field" value={form.adminDesignation} onChange={(e) => update('adminDesignation', e.target.value)} placeholder="HR Manager" />
          </Field>
          <ImageUploader
            label="Profile Photo"
            value={form.adminProfilePreview || form.adminProfilePhotoUrl}
            uploading={profileUploading}
            error={errors.adminProfilePhotoUrl}
            onFile={(file) => handleImage(file, 'admin-profile')}
            onRemove={() => {
              update('adminProfilePhotoUrl', '')
              update('adminProfilePreview', '')
            }}
          />
        </div>
      </Section>

      <Section title="Admin Access" description="Role assignment for the primary administrator." icon={ShieldCheck} color="emerald">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
          <p className="text-sm font-bold text-blue-900 dark:text-blue-100">Company Admin</p>
          <p className="mt-1 text-xs font-medium text-blue-700 dark:text-blue-200">Primary administrator responsible for managing this organization.</p>
        </div>
      </Section>

      <Section title="Login Credentials" description="Initial email and one-time password for first login." icon={KeyRound} color="amber">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Login Email</p>
            <p className="mt-1 break-all text-sm font-semibold text-slate-900 dark:text-white">{form.adminEmail || 'Enter admin work email above'}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              className={cn(
                'rounded-2xl border p-4 text-left transition-all',
                form.passwordMode === 'GENERATE'
                  ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100 dark:bg-blue-950/30 dark:ring-blue-950/50'
                  : 'border-slate-100 bg-white hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900'
              )}
              onClick={() => update('passwordMode', 'GENERATE')}
            >
              <p className="text-sm font-bold text-slate-900 dark:text-white">Generate one-time password</p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Recommended. The password is shown once after organization creation.</p>
            </button>
            <button
              type="button"
              className={cn(
                'rounded-2xl border p-4 text-left transition-all',
                form.passwordMode === 'CUSTOM'
                  ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100 dark:bg-blue-950/30 dark:ring-blue-950/50'
                  : 'border-slate-100 bg-white hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900'
              )}
              onClick={() => update('passwordMode', 'CUSTOM')}
            >
              <p className="text-sm font-bold text-slate-900 dark:text-white">Set custom one-time password</p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Use when you need to share a known initial password manually.</p>
            </button>
          </div>

          {form.passwordMode === 'CUSTOM' ? (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Initial Password" required error={errors.adminPassword} hint="Minimum 8 characters with uppercase, lowercase and a number">
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} className="input-field pr-10" value={form.adminPassword} onChange={(e) => update('adminPassword', e.target.value)} placeholder="Set initial password" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password" required error={errors.confirmAdminPassword}>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} className="input-field pr-10" value={form.confirmAdminPassword} onChange={(e) => update('confirmAdminPassword', e.target.value)} placeholder="Confirm initial password" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
            </div>
          ) : null}
        </div>
      </Section>

      <Section title="Account Notification" description="Notify the admin about account access." icon={Mail} color="blue">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950/40"
          onClick={() => update('sendLoginInvitation', !form.sendLoginInvitation)}
        >
          <span>
            <span className="block text-sm font-bold text-slate-900 dark:text-white">Send Invitation Email</span>
            <span className="mt-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              When mail delivery is configured, send account access details to the administrator.
            </span>
          </span>
          <span className={cn('relative h-6 w-11 rounded-full transition-colors', form.sendLoginInvitation ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700')}>
            <span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition-transform', form.sendLoginInvitation ? 'translate-x-6' : 'translate-x-1')} />
          </span>
        </button>
      </Section>
    </div>
  )
}

function PlanStep({ form, errors, plans, selectedPlan, loading, loadError, onRetry, update }) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />)}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/60 dark:bg-rose-950/30">
        <p className="text-sm font-bold text-rose-700 dark:text-rose-200">{loadError}</p>
        <button type="button" className="btn-secondary mt-4 justify-center" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    )
  }

  if (!plans.length) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-lg font-black text-slate-900 dark:text-white">No active plans available</p>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Create or activate a subscription plan before adding an organization.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {errors.planId ? <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30">{errors.planId}</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const selected = selectedPlan?._id === plan._id
          return (
            <button
              key={plan._id}
              type="button"
              className={cn('flex min-h-[280px] flex-col rounded-3xl border bg-white p-5 text-left shadow-sm transition-all dark:bg-slate-900', selected ? 'border-blue-500 bg-blue-50/70 ring-4 ring-blue-100 dark:bg-blue-950/20 dark:ring-blue-950/50' : 'border-slate-100 hover:border-blue-200 dark:border-slate-800')}
              onClick={() => update('planId', plan._id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500 dark:text-slate-400">{plan.description || 'Subscription plan'}</p>
                </div>
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border', selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-300 dark:border-slate-700')}>
                  {selected ? <Check className="h-4 w-4" /> : null}
                </span>
              </div>
              <div className="mt-5">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(plan.price, 'INR')}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">per {String(plan.billingCycle || 'MONTHLY').toLowerCase()}</p>
              </div>
              <div className="mt-5 space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <PlanLine label={`${limitText(plan.employeeLimit)} users`} />
                <PlanLine label={`${limitText(plan.storageLimitMb, ' MB')} storage`} />
                <PlanLine label={`${limitText(plan.apiQuota)} API quota`} />
                <PlanLine label={`${limitText(plan.integrationLimit)} integrations`} />
                {plan.trialDays ? <PlanLine label={`${plan.trialDays}-day trial`} /> : null}
              </div>
              {plan.features?.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {plan.features.slice(0, 5).map((feature) => (
                    <span key={feature} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{feature}</span>
                  ))}
                </div>
              ) : null}
              <span className={cn('mt-auto pt-5 text-center text-sm font-semibold', selected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500')}>
                {selected ? 'Selected' : 'Select Plan'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PlanLine({ label }) {
  return (
    <div className="flex items-center gap-2">
      <Check className="h-4 w-4 text-emerald-500" />
      <span>{label}</span>
    </div>
  )
}

function ReviewStep({ form, plan, submitError, submitting, onEdit, onCancel, onBack, onCreate }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <ReviewCard title="Organization" action="Edit" onAction={() => onEdit(0)}>
          <SummaryRow label="Name" value={form.companyName} />
          <SummaryRow label="Business Type" value={form.industryType} />
          <SummaryRow label="Business Email" value={form.email} />
          <SummaryRow label="Phone" value={form.phone} />
          <SummaryRow label="City" value={form.city} />
          <SummaryRow label="State" value={form.state} />
          <SummaryRow label="Country" value={form.country} />
          {form.gstNumber ? <SummaryRow label="GSTIN" value={form.gstNumber} /> : null}
          {form.panNumber ? <SummaryRow label="PAN" value={form.panNumber} /> : null}
        </ReviewCard>
        <ReviewCard title="Primary Admin" action="Edit" onAction={() => onEdit(1)}>
          <SummaryRow label="Name" value={`${form.adminFirstName} ${form.adminLastName}`} />
          <SummaryRow label="Email" value={form.adminEmail} />
          <SummaryRow label="Mobile" value={form.adminPhone} />
          <SummaryRow label="Role" value="Company Admin" />
          <SummaryRow label="Login Email" value={form.adminEmail} />
          <SummaryRow label="Initial Password" value={form.passwordMode === 'CUSTOM' ? 'Custom one-time password' : 'Auto-generated one-time password'} />
          <SummaryRow label="Invitation" value={form.sendLoginInvitation ? 'Enabled' : 'Disabled'} />
        </ReviewCard>
        <ReviewCard title="Subscription" action="Change Plan" onAction={() => onEdit(2)}>
          <SummaryRow label="Plan" value={plan?.name} />
          <SummaryRow label="Billing Cycle" value={plan?.billingCycle} />
          <SummaryRow label="Price" value={plan ? `${formatCurrency(plan.price, form.currency)} / ${String(plan.billingCycle || 'MONTHLY').toLowerCase()}` : ''} />
          <SummaryRow label="User Limit" value={limitText(plan?.employeeLimit)} />
          <SummaryRow label="Integrations" value={limitText(plan?.integrationLimit)} />
          {plan?.trialDays ? <SummaryRow label="Trial" value={`${plan.trialDays} days`} /> : null}
        </ReviewCard>
      </div>

      {submitError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30">{submitError}</p> : null}

      <div className="sticky bottom-4 z-20 flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:flex-row">
        <button type="button" className="btn-secondary justify-center" onClick={onCancel} disabled={submitting}>Cancel</button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" className="btn-secondary justify-center" onClick={onBack} disabled={submitting}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button type="button" className="btn-primary justify-center" onClick={onCreate} disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating Organization...</> : 'Create Organization'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReviewCard({ title, action, onAction, children }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
        <button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300" onClick={onAction}>{action}</button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 font-semibold text-slate-400">{label}</span>
      <span className="min-w-0 break-words text-right font-bold text-slate-800 dark:text-slate-100">{value || '-'}</span>
    </div>
  )
}
