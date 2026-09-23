'use client'

import { useEffect, useRef, useState } from 'react'
import { Portal } from '@/components/common/Portal'
import {
  X,
  Building2,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Mail,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { platformApi } from '@/services/platformApi'
import { tenantApi } from '@/services/tenantApi'
import { cn } from '@/lib/utils'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const BUSINESS_TYPES = ['Restaurant', 'Cafe', 'Cloud Kitchen', 'Bakery', 'QSR', 'Bar & Restaurant', 'Food Court', 'Other']
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

function defaultForm() {
  return {
    companyName: '',
    legalBusinessName: '',
    tenantCode: '',
    industryType: 'Restaurant',
    logoUrl: '',
    logoPreview: '',
    website: '',
    gstNumber: '',
    panNumber: '',
    businessRegistrationNumber: '',
    email: '',
    phone: '+91 ',
    address: '',
    country: 'India',
    state: '',
    city: '',
    pincode: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  }
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
          <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
          {description ? <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{description}</p> : null}
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
      <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
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
              <p className="truncate text-sm font-black text-slate-900 dark:text-white">Image ready</p>
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

export function EditOrganizationModal({ open, onClose, tenantId, onSuccess }) {
  if (!open) return null;

  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)

  useEffect(() => {
    if (!open || !tenantId) return
    let active = true
    async function fetchTenant() {
      try {
        const { data } = await tenantApi.getById(tenantId)
        if (active && data?.data) {
          const t = data.data
          setForm({
            companyName: t.companyName || '',
            legalBusinessName: t.legalBusinessName || '',
            tenantCode: t.tenantCode || '',
            industryType: t.industryType || 'Restaurant',
            logoUrl: t.logoUrl || '',
            logoPreview: '',
            website: t.website || '',
            gstNumber: t.gstNumber || '',
            panNumber: t.panNumber || '',
            businessRegistrationNumber: t.businessRegistrationNumber || '',
            email: t.email || '',
            phone: t.phone || '',
            address: t.address || '',
            country: t.country || 'India',
            state: t.state || '',
            city: t.city || '',
            pincode: t.pincode || '',
            timezone: t.timezone || 'Asia/Kolkata',
            currency: t.currency || 'INR',
          })
        }
      } catch (error) {
        console.error('Failed to load tenant', error)
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchTenant()
    return () => { active = false }
  }, [tenantId])

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function uploadImage(file, purpose) {
    if (!IMAGE_TYPES.includes(file.type)) throw new Error('Only JPG, PNG and WEBP images are supported')
    if (file.size > MAX_IMAGE_BYTES) throw new Error('Image must be 2 MB or smaller')
    const { data } = await platformApi.uploadOnboardingImage(file, purpose)
    return data.data?.url || data.url
  }

  async function handleImage(file, purpose) {
    setLogoUploading(true)
    setErrors((current) => ({ ...current, logoUrl: '' }))
    try {
      const preview = URL.createObjectURL(file)
      const url = await uploadImage(file, purpose)
      setForm((current) => ({ ...current, logoUrl: url, logoPreview: preview }))
    } catch (err) {
      setErrors((current) => ({ ...current, logoUrl: err.response?.data?.message || err.message || 'Image upload failed' }))
    } finally {
      setLogoUploading(false)
    }
  }

  function validate() {
    const nextErrors = {}
    if (form.companyName.trim().length < 2) nextErrors.companyName = 'Organization name is required'
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
    
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function saveOrganization() {
    if (!validate()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload = {
        companyName: form.companyName.trim(),
        legalBusinessName: form.legalBusinessName.trim(),
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
      }
      await tenantApi.update(tenantId, payload)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        if (onSuccess) onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      const message = err.response?.data?.message || 'Update failed. Please try again.'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative rounded-3xl bg-white p-12 shadow-2xl dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </div>
      </Portal>
    )
  }

  if (success) {
    return (
      <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative rounded-3xl bg-white p-12 text-center shadow-2xl dark:bg-slate-900 max-w-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">Organization Updated</h2>
            <p className="mt-2 text-sm text-slate-500">Redirecting...</p>
          </div>
        </div>
      </Portal>
    )
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className="relative w-full max-w-5xl rounded-3xl bg-slate-50 shadow-2xl ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
          
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 px-6 py-5 shrink-0">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Edit Organization</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Update the organization information and settings.</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {submitError ? (
        <div className="mx-auto max-w-6xl rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          {submitError}
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-5">
          <Section title="Organization Information" description="Basic organization identity and branding." icon={Building2} color="blue">
            <div className="grid gap-5 lg:grid-cols-2">
              <Field label="Organization Name" required error={errors.companyName}>
                <input className="input-field" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder="Enter organization name" />
              </Field>
              <Field label="Organization Code" hint="Cannot be modified after provisioning">
                <input className="input-field uppercase font-bold bg-slate-50 dark:bg-slate-800 text-slate-500 cursor-not-allowed" value={form.tenantCode} disabled />
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
                  <input className="input-field" value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="State/Province" />
                )}
              </Field>
              <Field label="City" required error={errors.city}>
                <input className="input-field" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="City" />
              </Field>
              <Field label="PIN / ZIP Code" required error={errors.pincode}>
                <input className="input-field" value={form.pincode} onChange={(e) => update('pincode', e.target.value)} placeholder="6 digit code" />
              </Field>
            </div>
          </Section>
        </div>

        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <button type="button" className="btn-secondary justify-center" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn-primary justify-center bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" onClick={saveOrganization} disabled={logoUploading || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
