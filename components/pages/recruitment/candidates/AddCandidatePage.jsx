'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText, Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import { candidateApi } from '@/services/candidateApi'
import { cn } from '@/lib/utils'

// "HR -> Add Candidate -> Upload Resume -> Parse Resume -> Auto-fill
// Candidate Form -> HR Reviews -> Save" — the same parser used for public
// applications, just run synchronously here since HR is actively waiting.
const FORM_DEFAULTS = {
  firstName: '', lastName: '', email: '', phone: '',
  currentLocation: '', currentCompany: '', currentDesignation: '',
  totalExperience: '', relevantExperience: '', currentCtc: '', expectedCtc: '', noticePeriod: '', lastWorkingDate: '',
  linkedinUrl: '', githubUrl: '', portfolioUrl: '',
}

function Field({ label, children, autoFilled }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
        {autoFilled && <Sparkles className="w-3 h-3 text-blue-500" title="Auto-filled from resume" />}
      </span>
      {children}
    </label>
  )
}

export function AddCandidatePage() {
  const router = useRouter()
  const [form, setForm] = useState(FORM_DEFAULTS)
  const [autoFilledKeys, setAutoFilledKeys] = useState(new Set())
  const [resumeFile, setResumeFile] = useState(null)
  const [draftResumeId, setDraftResumeId] = useState(null)
  const [parsingResume, setParsingResume] = useState(false)
  const [parseNote, setParseNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setAutoFilledKeys((s) => { const next = new Set(s); next.delete(key); return next })
  }

  async function handleResumeSelect(file) {
    if (!file) return
    setResumeFile(file)
    setParsingResume(true)
    setParseNote('')
    setError('')
    try {
      const fd = new FormData()
      fd.append('resume', file)
      const res = await candidateApi.uploadDraftResume(fd)
      const { resumeId, parsingStatus, parsedData } = res.data.data
      setDraftResumeId(resumeId)

      if (!parsedData) {
        setParseNote(parsingStatus === 'FAILED' ? res.data.data.errorMessage || 'Could not read this resume — please fill the form manually.' : 'Resume uploaded — could not confidently extract details, please fill the form manually.')
        return
      }

      const p = parsedData.personal || {}
      const filled = new Set()
      setForm((f) => {
        const next = { ...f }
        const maybeSet = (formKey, value) => {
          if (value !== null && value !== undefined && value !== '' && !next[formKey]) { next[formKey] = value; filled.add(formKey) }
        }
        if (p.name && !next.firstName) {
          const parts = p.name.trim().split(/\s+/)
          next.firstName = parts[0]; next.lastName = parts.slice(1).join(' ')
          filled.add('firstName'); filled.add('lastName')
        }
        maybeSet('email', p.email)
        maybeSet('phone', p.phone)
        maybeSet('currentLocation', p.currentLocation)
        maybeSet('currentCompany', p.currentCompany)
        maybeSet('currentDesignation', p.currentDesignation)
        maybeSet('totalExperience', p.totalExperience)
        maybeSet('relevantExperience', p.relevantExperience)
        maybeSet('linkedinUrl', p.linkedinUrl)
        maybeSet('githubUrl', p.githubUrl)
        maybeSet('portfolioUrl', p.portfolioUrl)
        return next
      })
      setAutoFilledKeys(filled)
      setParseNote(parsingStatus === 'PARSED'
        ? `Auto-filled ${filled.size} field(s) from the resume — please review before saving.`
        : 'Resume parsed with low confidence — auto-filled fields should be double-checked.')
    } catch (err) {
      setParseNote(err.response?.data?.message || 'Could not parse this resume — please fill the form manually.')
    } finally {
      setParsingResume(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = { ...form, draftResumeId: draftResumeId || undefined }
      const res = await candidateApi.create(payload)
      router.push(`/hr/recruitment/candidates/${res.data.data._id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create candidate')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <Link href="/hr/recruitment/candidates" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Candidates
      </Link>

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add Candidate</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Upload a resume to auto-fill this form, then review and save.</p>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="stat-card space-y-3">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Resume (optional, but recommended)</h2>
          <label className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer', 'border-slate-200 dark:border-slate-700 hover:border-blue-300')}>
            {parsingResume ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" /> : <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />}
            <span className="text-sm text-slate-500 dark:text-slate-400 flex-1 truncate">
              {parsingResume ? 'Parsing resume…' : resumeFile ? resumeFile.name : 'Upload PDF, DOC or DOCX (max 5MB)'}
            </span>
            {resumeFile && !parsingResume && <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" disabled={parsingResume} onChange={(e) => handleResumeSelect(e.target.files?.[0] || null)} />
          </label>
          {parseNote && (
            <p className={cn('text-xs flex items-start gap-1.5', autoFilledKeys.size ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400')}>
              {!autoFilledKeys.size && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
              {parseNote}
            </p>
          )}
        </section>

        <section className="stat-card space-y-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Candidate Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name *" autoFilled={autoFilledKeys.has('firstName')}>
              <input required className="input-field" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
            </Field>
            <Field label="Last Name" autoFilled={autoFilledKeys.has('lastName')}>
              <input className="input-field" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
            </Field>
            <Field label="Email *" autoFilled={autoFilledKeys.has('email')}>
              <input required type="email" className="input-field" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </Field>
            <Field label="Phone *" autoFilled={autoFilledKeys.has('phone')}>
              <input required className="input-field" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </Field>
            <Field label="Current Location" autoFilled={autoFilledKeys.has('currentLocation')}>
              <input className="input-field" value={form.currentLocation} onChange={(e) => update('currentLocation', e.target.value)} />
            </Field>
            <Field label="Current Company" autoFilled={autoFilledKeys.has('currentCompany')}>
              <input className="input-field" value={form.currentCompany} onChange={(e) => update('currentCompany', e.target.value)} />
            </Field>
            <Field label="Current Designation" autoFilled={autoFilledKeys.has('currentDesignation')}>
              <input className="input-field" value={form.currentDesignation} onChange={(e) => update('currentDesignation', e.target.value)} />
            </Field>
            <Field label="Total Experience (yrs)" autoFilled={autoFilledKeys.has('totalExperience')}>
              <input type="number" min={0} step="0.5" className="input-field" value={form.totalExperience} onChange={(e) => update('totalExperience', e.target.value)} />
            </Field>
            <Field label="Relevant Experience (yrs)" autoFilled={autoFilledKeys.has('relevantExperience')}>
              <input type="number" min={0} step="0.5" className="input-field" value={form.relevantExperience} onChange={(e) => update('relevantExperience', e.target.value)} />
            </Field>
            <Field label="Current CTC">
              <input type="number" min={0} className="input-field" value={form.currentCtc} onChange={(e) => update('currentCtc', e.target.value)} />
            </Field>
            <Field label="Expected CTC">
              <input type="number" min={0} className="input-field" value={form.expectedCtc} onChange={(e) => update('expectedCtc', e.target.value)} />
            </Field>
            <Field label="Notice Period">
              <input className="input-field" value={form.noticePeriod} onChange={(e) => update('noticePeriod', e.target.value)} />
            </Field>
            <Field label="LinkedIn" autoFilled={autoFilledKeys.has('linkedinUrl')}>
              <input className="input-field" value={form.linkedinUrl} onChange={(e) => update('linkedinUrl', e.target.value)} />
            </Field>
            <Field label="GitHub" autoFilled={autoFilledKeys.has('githubUrl')}>
              <input className="input-field" value={form.githubUrl} onChange={(e) => update('githubUrl', e.target.value)} />
            </Field>
            <Field label="Portfolio" autoFilled={autoFilledKeys.has('portfolioUrl')}>
              <input className="input-field" value={form.portfolioUrl} onChange={(e) => update('portfolioUrl', e.target.value)} />
            </Field>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link href="/hr/recruitment/candidates" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={saving || parsingResume} className="btn-primary">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Candidate
          </button>
        </div>
      </form>
    </div>
  )
}
