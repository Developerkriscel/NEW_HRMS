'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Send, X, Loader2 } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { SkillTagInput } from './SkillTagInput'
import { PillRadioGroup } from './PillRadioGroup'
import { requisitionApi } from '@/services/requisitionApi'
import { departmentApi, designationApi, branchApi } from '@/services/departmentApi'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import {
  EMPLOYMENT_TYPE_LIST, EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LIST, WORK_MODE_LABELS,
  HIRING_REASON, HIRING_REASON_LIST, HIRING_REASON_LABELS,
  BUDGET_TYPE_LIST, BUDGET_TYPE_LABELS,
  PRIORITY_LIST, PRIORITY_LABELS, PRIORITY_SLA_DAYS,
  REQUISITION_EDITABLE_STATUSES,
  computeSlaTargetDate,
} from '@/lib/recruitmentConstants'
import { validateAlways, validateForSubmit, isValid } from '@/lib/recruitmentValidation'

const FORM_DEFAULTS = {
  jobTitle: '', department: '', designation: '', openings: 1, employmentType: '', workMode: '', location: '', hiringManager: '', recruiter: '',
  hiringReason: '', replacementEmployee: '', replacementReason: '', lastWorkingDate: '', otherReasonDetails: '',
  minExperience: '', maxExperience: '', requiredSkills: [], preferredSkills: [], education: '', certifications: '', industryExperience: '', roleSummary: '',
  minCtc: '', maxCtc: '', currency: 'INR', budgetType: '', budgetApproved: false,
  expectedJoiningDate: '', applicationTargetDate: '', priority: 'MEDIUM',
  jobSummary: '', responsibilities: '', requiredQualifications: '', preferredQualifications: '', benefits: '', additionalNotes: '',
}

function toDateInput(iso) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : ''
}

function mapRequisitionToFormData(doc) {
  return {
    jobTitle: doc.jobTitle || '',
    department: doc.department?._id || '',
    designation: doc.designation?._id || '',
    openings: doc.openings ?? 1,
    employmentType: doc.employmentType || '',
    workMode: doc.workMode || '',
    location: doc.location?._id || '',
    hiringManager: doc.hiringManager?._id || '',
    recruiter: doc.recruiter?._id || '',
    hiringReason: doc.hiringReason || '',
    replacementEmployee: doc.replacementEmployee?._id || '',
    replacementReason: doc.replacementReason || '',
    lastWorkingDate: toDateInput(doc.lastWorkingDate),
    otherReasonDetails: doc.otherReasonDetails || '',
    minExperience: doc.minExperience ?? '',
    maxExperience: doc.maxExperience ?? '',
    requiredSkills: doc.requiredSkills || [],
    preferredSkills: doc.preferredSkills || [],
    education: doc.education || '',
    certifications: doc.certifications || '',
    industryExperience: doc.industryExperience || '',
    roleSummary: doc.roleSummary || '',
    minCtc: doc.minCtc ?? '',
    maxCtc: doc.maxCtc ?? '',
    currency: doc.currency || 'INR',
    budgetType: doc.budgetType || '',
    budgetApproved: !!doc.budgetApproved,
    expectedJoiningDate: toDateInput(doc.expectedJoiningDate),
    applicationTargetDate: toDateInput(doc.applicationTargetDate),
    priority: doc.priority || 'MEDIUM',
    jobSummary: doc.jobSummary || '',
    responsibilities: doc.responsibilities || '',
    requiredQualifications: doc.requiredQualifications || '',
    preferredQualifications: doc.preferredQualifications || '',
    benefits: doc.benefits || '',
    additionalNotes: doc.additionalNotes || '',
  }
}

function buildPayload(fd) {
  const isReplacement = fd.hiringReason === HIRING_REASON.REPLACEMENT
  return {
    jobTitle: fd.jobTitle.trim(),
    department: fd.department || null,
    designation: fd.designation || null,
    openings: fd.openings === '' ? null : Number(fd.openings),
    employmentType: fd.employmentType || null,
    workMode: fd.workMode || null,
    location: fd.location || null,
    hiringManager: fd.hiringManager || null,
    recruiter: fd.recruiter || null,
    hiringReason: fd.hiringReason || null,
    replacementEmployee: isReplacement ? (fd.replacementEmployee || null) : null,
    replacementReason: isReplacement ? fd.replacementReason : null,
    lastWorkingDate: isReplacement ? (fd.lastWorkingDate || null) : null,
    otherReasonDetails: fd.hiringReason === HIRING_REASON.OTHER ? fd.otherReasonDetails : null,
    minExperience: fd.minExperience === '' ? null : Number(fd.minExperience),
    maxExperience: fd.maxExperience === '' ? null : Number(fd.maxExperience),
    requiredSkills: fd.requiredSkills,
    preferredSkills: fd.preferredSkills,
    education: fd.education, certifications: fd.certifications, industryExperience: fd.industryExperience, roleSummary: fd.roleSummary,
    minCtc: fd.minCtc === '' ? null : Number(fd.minCtc),
    maxCtc: fd.maxCtc === '' ? null : Number(fd.maxCtc),
    currency: fd.currency, budgetType: fd.budgetType || null, budgetApproved: fd.budgetApproved,
    expectedJoiningDate: fd.expectedJoiningDate || null,
    applicationTargetDate: fd.applicationTargetDate || null,
    priority: fd.priority,
    jobSummary: fd.jobSummary, responsibilities: fd.responsibilities,
    requiredQualifications: fd.requiredQualifications, preferredQualifications: fd.preferredQualifications,
    benefits: fd.benefits, additionalNotes: fd.additionalNotes,
  }
}

function Field({ label, required, error, children, className }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </label>
  )
}

function inputClass(error) {
  return cn('input-field', error && 'border-red-400 focus:ring-red-500/30 focus:border-red-500')
}

export function RequisitionForm({ requisitionId }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const addNotification = useUIStore((s) => s.addNotification)
  const canSeeBudget = user?.role !== 'MANAGER'

  const [loading, setLoading] = useState(!!requisitionId)
  const [notEditable, setNotEditable] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [formData, setFormData] = useState(FORM_DEFAULTS)

  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [locations, setLocations] = useState([])
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    Promise.all([
      departmentApi.getAll(), designationApi.getAll(), branchApi.getAll(), requisitionApi.getEmployees(),
    ]).then(([depRes, desRes, branchRes, empRes]) => {
      setDepartments(depRes.data.data || [])
      setDesignations(desRes.data.data || [])
      setLocations(branchRes.data.data || [])
      setEmployees(empRes.data.data || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!requisitionId) return
    requisitionApi.get(requisitionId)
      .then((res) => {
        const doc = res.data.data
        if (!REQUISITION_EDITABLE_STATUSES.includes(doc.status)) {
          setNotEditable(true)
          return
        }
        setFormData(mapRequisitionToFormData(doc))
      })
      .catch(() => setErrorMessage('Could not load this requisition'))
      .finally(() => setLoading(false))
  }, [requisitionId])

  const filteredDesignations = useMemo(
    () => (formData.department ? designations.filter((d) => (d.department?._id || d.department) === formData.department) : designations),
    [designations, formData.department]
  )

  function update(field, value) {
    setFormData((fd) => ({ ...fd, [field]: value }))
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e))
  }

  function updateDepartment(value) {
    setFormData((fd) => ({
      ...fd,
      department: value,
      designation: designations.find((d) => d._id === fd.designation && (d.department?._id || d.department) === value) ? fd.designation : '',
    }))
  }

  const slaPreview = formData.priority ? computeSlaTargetDate(formData.priority, null) : null

  async function handleSave({ thenSubmit = false } = {}) {
    setErrorMessage('')
    if (!formData.jobTitle.trim()) {
      setErrors({ jobTitle: 'Job title is required' })
      return
    }
    const baseErrors = validateAlways(formData)
    if (!isValid(baseErrors)) { setErrors(baseErrors); return }

    if (thenSubmit) {
      const submitErrors = validateForSubmit(formData)
      if (!isValid(submitErrors)) {
        setErrors(submitErrors)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    }

    setSaving(true)
    try {
      const payload = buildPayload(formData)
      let id = requisitionId
      if (id) {
        await requisitionApi.update(id, payload)
      } else {
        const res = await requisitionApi.create(payload)
        id = res.data.data._id
      }

      if (thenSubmit) {
        await requisitionApi.submit(id)
        addNotification({ title: 'Submitted for approval', message: `${payload.jobTitle} is now awaiting approval`, type: 'info' })
      } else {
        addNotification({ title: 'Draft saved', message: `${payload.jobTitle} saved as draft`, type: 'info' })
      }
      router.push(`/hr/recruitment/requisitions/${id}`)
    } catch (err) {
      const apiErrors = err.response?.data?.data?.errors
      if (apiErrors) setErrors(apiErrors)
      setErrorMessage(err.response?.data?.message || 'Something went wrong. Please try again.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    router.push(requisitionId ? `/hr/recruitment/requisitions/${requisitionId}` : '/hr/recruitment/requisitions')
  }

  if (loading) return <PageLoader />

  if (notEditable) {
    return (
      <div className="stat-card text-center py-16">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">This requisition is no longer editable</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Approved requisitions are read-only in Step 2.</p>
        <button onClick={() => router.push(`/hr/recruitment/requisitions/${requisitionId}`)} className="btn-secondary mx-auto">View requisition</button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{requisitionId ? 'Edit Requisition' : 'Create Requisition'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Raise a hiring request for approval before HR opens the role.</p>
        </div>
      </div>

      {errorMessage && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{errorMessage}</div>
      )}

      {/* Section 1 — Position Details */}
      <section className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Position Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Job Title" required error={errors.jobTitle} className="sm:col-span-2">
            <input className={inputClass(errors.jobTitle)} value={formData.jobTitle} onChange={(e) => update('jobTitle', e.target.value)} placeholder="e.g. Backend Developer" />
          </Field>
          <Field label="Department" required error={errors.department}>
            <select className={inputClass(errors.department)} value={formData.department} onChange={(e) => updateDepartment(e.target.value)}>
              <option value="">Select department</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Designation" required error={errors.designation}>
            <select className={inputClass(errors.designation)} value={formData.designation} onChange={(e) => update('designation', e.target.value)}>
              <option value="">Select designation</option>
              {filteredDesignations.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Number of Openings" required error={errors.openings}>
            <input type="number" min={1} className={inputClass(errors.openings)} value={formData.openings} onChange={(e) => update('openings', e.target.value)} />
          </Field>
          <Field label="Location / Branch" required error={errors.location}>
            <select className={inputClass(errors.location)} value={formData.location} onChange={(e) => update('location', e.target.value)}>
              <option value="">Select location</option>
              {locations.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Employment Type" required error={errors.employmentType} className="sm:col-span-2">
            <PillRadioGroup options={EMPLOYMENT_TYPE_LIST} labels={EMPLOYMENT_TYPE_LABELS} value={formData.employmentType} onChange={(v) => update('employmentType', v)} error={errors.employmentType} />
          </Field>
          <Field label="Work Mode" required error={errors.workMode} className="sm:col-span-2">
            <PillRadioGroup options={WORK_MODE_LIST} labels={WORK_MODE_LABELS} value={formData.workMode} onChange={(v) => update('workMode', v)} error={errors.workMode} />
          </Field>
          <Field label="Hiring Manager" required error={errors.hiringManager}>
            <select className={inputClass(errors.hiringManager)} value={formData.hiringManager} onChange={(e) => update('hiringManager', e.target.value)}>
              <option value="">Select hiring manager</option>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Recruiter">
            <select className="input-field" value={formData.recruiter} onChange={(e) => update('recruiter', e.target.value)}>
              <option value="">Assign later</option>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {/* Section 2 — Hiring Reason */}
      <section className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Hiring Reason</h3>
        <Field label="Hiring Reason" required error={errors.hiringReason}>
          <PillRadioGroup options={HIRING_REASON_LIST} labels={HIRING_REASON_LABELS} value={formData.hiringReason} onChange={(v) => update('hiringReason', v)} error={errors.hiringReason} />
        </Field>

        {formData.hiringReason === HIRING_REASON.REPLACEMENT && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Field label="Employee Being Replaced" required error={errors.replacementEmployee}>
              <select className={inputClass(errors.replacementEmployee)} value={formData.replacementEmployee} onChange={(e) => update('replacementEmployee', e.target.value)}>
                <option value="">Select employee</option>
                {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Last Working Date">
              <input type="date" className="input-field" value={formData.lastWorkingDate} onChange={(e) => update('lastWorkingDate', e.target.value)} />
            </Field>
            <Field label="Replacement Reason" className="sm:col-span-2">
              <textarea className="input-field" rows={2} value={formData.replacementReason} onChange={(e) => update('replacementReason', e.target.value)} />
            </Field>
          </div>
        )}

        {formData.hiringReason === HIRING_REASON.OTHER && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Field label="Reason Details" required error={errors.otherReasonDetails}>
              <textarea className={inputClass(errors.otherReasonDetails)} rows={2} value={formData.otherReasonDetails} onChange={(e) => update('otherReasonDetails', e.target.value)} />
            </Field>
          </div>
        )}
      </section>

      {/* Section 3 — Experience & Skills */}
      <section className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Experience & Skills</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Minimum Experience (years)" required error={errors.minExperience}>
            <input type="number" min={0} step="0.5" className={inputClass(errors.minExperience)} value={formData.minExperience} onChange={(e) => update('minExperience', e.target.value)} />
          </Field>
          <Field label="Maximum Experience (years)" required error={errors.maxExperience}>
            <input type="number" min={0} step="0.5" className={inputClass(errors.maxExperience)} value={formData.maxExperience} onChange={(e) => update('maxExperience', e.target.value)} />
          </Field>
          <Field label="Required Skills" required error={errors.requiredSkills} className="sm:col-span-2">
            <SkillTagInput value={formData.requiredSkills} onChange={(v) => update('requiredSkills', v)} placeholder="e.g. React, press Enter" error={errors.requiredSkills} />
          </Field>
          <Field label="Preferred Skills" className="sm:col-span-2">
            <SkillTagInput value={formData.preferredSkills} onChange={(v) => update('preferredSkills', v)} placeholder="e.g. AWS, press Enter" />
          </Field>
          <Field label="Education">
            <input className="input-field" value={formData.education} onChange={(e) => update('education', e.target.value)} placeholder="e.g. B.Tech in Computer Science" />
          </Field>
          <Field label="Certification">
            <input className="input-field" value={formData.certifications} onChange={(e) => update('certifications', e.target.value)} />
          </Field>
          <Field label="Industry Experience">
            <input className="input-field" value={formData.industryExperience} onChange={(e) => update('industryExperience', e.target.value)} placeholder="e.g. SaaS, Fintech" />
          </Field>
          <Field label="Role Summary" className="sm:col-span-2">
            <textarea className="input-field" rows={2} value={formData.roleSummary} onChange={(e) => update('roleSummary', e.target.value)} />
          </Field>
        </div>
      </section>

      {/* Section 4 — Hiring Budget (RBAC: hidden from Managers) */}
      {canSeeBudget && (
        <section className="stat-card space-y-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Hiring Budget</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Minimum CTC" error={errors.minCtc}>
              <input type="number" min={0} className={inputClass(errors.minCtc)} value={formData.minCtc} onChange={(e) => update('minCtc', e.target.value)} />
            </Field>
            <Field label="Maximum CTC">
              <input type="number" min={0} className="input-field" value={formData.maxCtc} onChange={(e) => update('maxCtc', e.target.value)} />
            </Field>
            <Field label="Currency">
              <input className="input-field uppercase" maxLength={3} value={formData.currency} onChange={(e) => update('currency', e.target.value.toUpperCase())} />
            </Field>
            <Field label="Budget Type" className="sm:col-span-2">
              <PillRadioGroup options={BUDGET_TYPE_LIST} labels={BUDGET_TYPE_LABELS} value={formData.budgetType} onChange={(v) => update('budgetType', v)} />
            </Field>
            <Field label="Budget Approved?">
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => update('budgetApproved', true)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium border', formData.budgetApproved ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700')}>Yes</button>
                <button type="button" onClick={() => update('budgetApproved', false)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium border', !formData.budgetApproved ? 'bg-slate-700 text-white border-slate-700' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700')}>No</button>
              </div>
            </Field>
          </div>
        </section>
      )}

      {/* Section 5 — Timeline */}
      <section className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Timeline</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Expected Joining Date" required error={errors.expectedJoiningDate}>
            <input type="date" className={inputClass(errors.expectedJoiningDate)} value={formData.expectedJoiningDate} onChange={(e) => update('expectedJoiningDate', e.target.value)} />
          </Field>
          <Field label="Application Target Date">
            <input type="date" className="input-field" value={formData.applicationTargetDate} onChange={(e) => update('applicationTargetDate', e.target.value)} />
          </Field>
          <Field label="Priority" required error={errors.priority} className="sm:col-span-2">
            <PillRadioGroup options={PRIORITY_LIST} labels={PRIORITY_LABELS} value={formData.priority} onChange={(v) => update('priority', v)} error={errors.priority} />
          </Field>
        </div>
        {formData.priority && (
          <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2">
            Hiring SLA: {PRIORITY_LABELS[formData.priority]} priority targets a fill within {PRIORITY_SLA_DAYS[formData.priority]} days of submission
            {slaPreview && ` — approx. by ${slaPreview.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} if submitted today`}.
          </p>
        )}
      </section>

      {/* Section 6 — Job Description */}
      <section className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Job Description</h3>
        <Field label="Job Summary" required error={errors.jobSummary}>
          <textarea className={inputClass(errors.jobSummary)} rows={3} value={formData.jobSummary} onChange={(e) => update('jobSummary', e.target.value)} />
        </Field>
        <Field label="Responsibilities" required error={errors.responsibilities}>
          <textarea className={inputClass(errors.responsibilities)} rows={3} value={formData.responsibilities} onChange={(e) => update('responsibilities', e.target.value)} />
        </Field>
        <Field label="Required Qualifications" required error={errors.requiredQualifications}>
          <textarea className={inputClass(errors.requiredQualifications)} rows={2} value={formData.requiredQualifications} onChange={(e) => update('requiredQualifications', e.target.value)} />
        </Field>
        <Field label="Preferred Qualifications">
          <textarea className="input-field" rows={2} value={formData.preferredQualifications} onChange={(e) => update('preferredQualifications', e.target.value)} />
        </Field>
        <Field label="Benefits">
          <textarea className="input-field" rows={2} value={formData.benefits} onChange={(e) => update('benefits', e.target.value)} />
        </Field>
        <Field label="Additional Notes">
          <textarea className="input-field" rows={2} value={formData.additionalNotes} onChange={(e) => update('additionalNotes', e.target.value)} />
        </Field>
      </section>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pb-6">
        <button type="button" onClick={handleCancel} disabled={saving} className="btn-secondary justify-center">
          <X className="w-4 h-4" /> Cancel
        </button>
        <button type="button" onClick={() => handleSave({ thenSubmit: false })} disabled={saving} className="btn-secondary justify-center">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
        </button>
        <button type="button" onClick={() => handleSave({ thenSubmit: true })} disabled={saving} className="btn-primary justify-center">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit for Approval
        </button>
      </div>
    </div>
  )
}
