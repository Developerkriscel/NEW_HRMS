'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Save, Rocket, X, Loader2, Eye, FileStack } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { SkillTagInput } from '../SkillTagInput'
import { PillRadioGroup } from '../PillRadioGroup'
import { JobSkillsEditor } from './JobSkillsEditor'
import { ScreeningQuestionsEditor } from './ScreeningQuestionsEditor'
import { ApplicationFieldsTable } from './ApplicationFieldsEditor'
import { PipelineStagesEditor } from './PipelineStagesEditor'
import { JobPreviewModal } from './JobPreviewModal'
import { jobApi } from '@/services/jobApi'
import { requisitionApi } from '@/services/requisitionApi'
import { departmentApi, designationApi, branchApi } from '@/services/departmentApi'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import {
  JOB_EMPLOYMENT_TYPE_LIST, JOB_EMPLOYMENT_TYPE_LABELS, WORK_MODE_LIST, WORK_MODE_LABELS,
  JOB_VISIBILITY_LIST, JOB_VISIBILITY_LABELS, JOB_VISIBILITY_DESCRIPTIONS,
  JOB_EDITABLE_STATUSES, DEFAULT_APPLICATION_FIELDS, PIPELINE_TEMPLATES,
  canCreateWithoutRequisition,
} from '@/lib/jobConstants'
import { validateAlways, validateForOpen, isValid } from '@/lib/jobValidation'

const FORM_DEFAULTS = {
  jobTitle: '', department: '', designation: '', totalOpenings: 1, hiringManager: '', recruiter: '', location: '', workMode: '', employmentType: '',
  minExperience: '', maxExperience: '', minEducation: '', preferredEducation: '', certifications: '', industryExperience: '', freshersAllowed: false,
  requiredSkills: [], preferredSkills: [],
  internalMinCtc: '', internalMaxCtc: '', currency: 'INR', publicSalaryVisible: false, publicMinCtc: '', publicMaxCtc: '',
  jobSummary: '', responsibilities: '', requiredQualifications: '', preferredQualifications: '', aboutRole: '', benefits: '', perks: '',
  screeningQuestions: [],
  applicationFields: DEFAULT_APPLICATION_FIELDS.map((f) => ({ ...f })),
  pipelineTemplate: 'DEFAULT_HIRING',
  pipelineStages: PIPELINE_TEMPLATES.DEFAULT_HIRING.stages.map((s) => ({ ...s, isActive: true })),
  openingDate: '', applicationDeadline: '', expectedJoiningDate: '', targetClosingDate: '',
  visibility: 'INTERNAL_ONLY',
}

function toDateInput(iso) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : ''
}

function mapJobToFormData(doc) {
  return {
    jobTitle: doc.jobTitle || '', department: doc.department?._id || '', designation: doc.designation?._id || '',
    totalOpenings: doc.totalOpenings ?? 1, hiringManager: doc.hiringManager?._id || '', recruiter: doc.recruiter?._id || '',
    location: doc.location?._id || '', workMode: doc.workMode || '', employmentType: doc.employmentType || '',
    minExperience: doc.minExperience ?? '', maxExperience: doc.maxExperience ?? '',
    minEducation: doc.minEducation || '', preferredEducation: doc.preferredEducation || '',
    certifications: doc.certifications || '', industryExperience: doc.industryExperience || '', freshersAllowed: !!doc.freshersAllowed,
    requiredSkills: doc.requiredSkills || [], preferredSkills: doc.preferredSkills || [],
    internalMinCtc: doc.internalMinCtc ?? '', internalMaxCtc: doc.internalMaxCtc ?? '', currency: doc.currency || 'INR',
    publicSalaryVisible: !!doc.publicSalaryVisible, publicMinCtc: doc.publicMinCtc ?? '', publicMaxCtc: doc.publicMaxCtc ?? '',
    jobSummary: doc.jobSummary || '', responsibilities: doc.responsibilities || '', requiredQualifications: doc.requiredQualifications || '',
    preferredQualifications: doc.preferredQualifications || '', aboutRole: doc.aboutRole || '', benefits: doc.benefits || '', perks: doc.perks || '',
    screeningQuestions: doc.screeningQuestions || [],
    applicationFields: doc.applicationFields?.length ? doc.applicationFields : DEFAULT_APPLICATION_FIELDS.map((f) => ({ ...f })),
    pipelineTemplate: doc.pipelineTemplate || 'DEFAULT_HIRING',
    pipelineStages: doc.pipelineStages?.length ? doc.pipelineStages : PIPELINE_TEMPLATES.DEFAULT_HIRING.stages.map((s) => ({ ...s, isActive: true })),
    openingDate: toDateInput(doc.openingDate), applicationDeadline: toDateInput(doc.applicationDeadline),
    expectedJoiningDate: toDateInput(doc.expectedJoiningDate), targetClosingDate: toDateInput(doc.targetClosingDate),
    visibility: doc.visibility || 'INTERNAL_ONLY',
  }
}

// HR reviews/edits only what's prefilled here — nothing gets retyped.
function mapRequisitionToJobFormData(req, reqSkills) {
  return {
    ...FORM_DEFAULTS,
    jobTitle: req.jobTitle || '', department: req.department?._id || '', designation: req.designation?._id || '',
    totalOpenings: req.openings ?? 1, hiringManager: req.hiringManager?._id || '', recruiter: req.recruiter?._id || '',
    location: req.location?._id || '', workMode: req.workMode || '', employmentType: req.employmentType || '',
    minExperience: req.minExperience ?? '', maxExperience: req.maxExperience ?? '',
    minEducation: req.education || '', certifications: req.certifications || '', industryExperience: req.industryExperience || '',
    requiredSkills: (reqSkills?.requiredSkills || []).map((skillName) => ({ skillName, minYears: null, proficiency: null })),
    preferredSkills: (reqSkills?.preferredSkills || []).map((skillName) => ({ skillName, minYears: null, proficiency: null })),
    internalMinCtc: req.minCtc ?? '', internalMaxCtc: req.maxCtc ?? '', currency: req.currency || 'INR',
    jobSummary: req.jobSummary || '', responsibilities: req.responsibilities || '', requiredQualifications: req.requiredQualifications || '',
    preferredQualifications: req.preferredQualifications || '', benefits: req.benefits || '',
    expectedJoiningDate: toDateInput(req.expectedJoiningDate),
  }
}

function buildPayload(fd) {
  return {
    jobTitle: fd.jobTitle.trim(), department: fd.department || null, designation: fd.designation || null,
    totalOpenings: fd.totalOpenings === '' ? null : Number(fd.totalOpenings),
    hiringManager: fd.hiringManager || null, recruiter: fd.recruiter || null, location: fd.location || null,
    workMode: fd.workMode || null, employmentType: fd.employmentType || null,
    minExperience: fd.minExperience === '' ? null : Number(fd.minExperience),
    maxExperience: fd.maxExperience === '' ? null : Number(fd.maxExperience),
    minEducation: fd.minEducation, preferredEducation: fd.preferredEducation, certifications: fd.certifications,
    industryExperience: fd.industryExperience, freshersAllowed: fd.freshersAllowed,
    requiredSkills: fd.requiredSkills, preferredSkills: fd.preferredSkills,
    internalMinCtc: fd.internalMinCtc === '' ? null : Number(fd.internalMinCtc),
    internalMaxCtc: fd.internalMaxCtc === '' ? null : Number(fd.internalMaxCtc),
    currency: fd.currency, publicSalaryVisible: fd.publicSalaryVisible,
    publicMinCtc: fd.publicMinCtc === '' ? null : Number(fd.publicMinCtc),
    publicMaxCtc: fd.publicMaxCtc === '' ? null : Number(fd.publicMaxCtc),
    jobSummary: fd.jobSummary, responsibilities: fd.responsibilities, requiredQualifications: fd.requiredQualifications,
    preferredQualifications: fd.preferredQualifications, aboutRole: fd.aboutRole, benefits: fd.benefits, perks: fd.perks,
    screeningQuestions: fd.screeningQuestions, applicationFields: fd.applicationFields,
    pipelineTemplate: fd.pipelineTemplate, pipelineStages: fd.pipelineStages,
    openingDate: fd.openingDate || null, applicationDeadline: fd.applicationDeadline || null,
    expectedJoiningDate: fd.expectedJoiningDate || null, targetClosingDate: fd.targetClosingDate || null,
    visibility: fd.visibility,
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

export function JobForm({ jobId }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <JobFormInner jobId={jobId} />
    </Suspense>
  )
}

function JobFormInner({ jobId }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requisitionId = searchParams.get('requisitionId')
  const user = useAuthStore((s) => s.user)
  const addNotification = useUIStore((s) => s.addNotification)

  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)
  const [notEditable, setNotEditable] = useState(false)
  const [linkedRequisition, setLinkedRequisition] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [formData, setFormData] = useState(FORM_DEFAULTS)

  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [locations, setLocations] = useState([])
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    Promise.all([departmentApi.getAll(), designationApi.getAll(), branchApi.getAll(), jobApi.getEmployees()])
      .then(([depRes, desRes, branchRes, empRes]) => {
        setDepartments(depRes.data.data || [])
        setDesignations(desRes.data.data || [])
        setLocations(branchRes.data.data || [])
        setEmployees(empRes.data.data || [])
      }).catch(() => {})
  }, [])

  useEffect(() => {
    if (jobId) {
      jobApi.get(jobId).then((res) => {
        const doc = res.data.data
        if (!JOB_EDITABLE_STATUSES.includes(doc.status)) { setNotEditable(true); return }
        setFormData(mapJobToFormData(doc))
        if (doc.requisitionId) setLinkedRequisition(doc.requisitionId)
      }).catch(() => setErrorMessage('Could not load this job opening')).finally(() => setLoading(false))
      return
    }
    if (requisitionId) {
      Promise.all([requisitionApi.get(requisitionId)])
        .then(async ([reqRes]) => {
          const req = reqRes.data.data
          if (req.status !== 'APPROVED') { setBlocked(true); return }
          setLinkedRequisition({ requisitionCode: req.requisitionCode, jobTitle: req.jobTitle, status: req.status })
          setFormData(mapRequisitionToJobFormData(req, req))
        })
        .catch(() => setErrorMessage('Could not load the linked requisition'))
        .finally(() => setLoading(false))
      return
    }
    // Direct creation — permission-gated (job.create_without_requisition unless Admin).
    if (!user) return
    if (!canCreateWithoutRequisition({ role: user.role, permissions: user.permissions || [] })) {
      setBlocked(true)
    }
    setLoading(false)
  }, [jobId, requisitionId, user])

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
      ...fd, department: value,
      designation: designations.find((d) => d._id === fd.designation && (d.department?._id || d.department) === value) ? fd.designation : '',
    }))
  }

  async function handleSave({ thenOpen = false } = {}) {
    setErrorMessage('')
    if (!formData.jobTitle.trim()) { setErrors({ jobTitle: 'Job title is required' }); return }
    const baseErrors = validateAlways(formData)
    if (!isValid(baseErrors)) { setErrors(baseErrors); return }
    if (thenOpen) {
      const openErrors = validateForOpen(formData)
      if (!isValid(openErrors)) { setErrors(openErrors); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    }

    setSaving(true)
    try {
      const payload = buildPayload(formData)
      let id = jobId
      if (id) {
        await jobApi.update(id, payload)
      } else if (requisitionId) {
        const res = await jobApi.createFromRequisition(requisitionId, payload)
        id = res.data.data._id
      } else {
        const res = await jobApi.create(payload)
        id = res.data.data._id
      }

      if (thenOpen) {
        await jobApi.open(id)
        addNotification({ title: 'Job opening published', message: `${payload.jobTitle} is now open internally`, type: 'success' })
      } else {
        addNotification({ title: 'Draft saved', message: `${payload.jobTitle} saved as draft`, type: 'info' })
      }
      router.push(`/hr/recruitment/jobs/${id}`)
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
    router.push(jobId ? `/hr/recruitment/jobs/${jobId}` : '/hr/recruitment/jobs')
  }

  if (loading) return <PageLoader />

  if (notEditable) {
    return (
      <div className="stat-card text-center py-16">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">This job opening is no longer editable</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Closed, filled and cancelled jobs are read-only.</p>
        <button onClick={() => router.push(`/hr/recruitment/jobs/${jobId}`)} className="btn-secondary mx-auto">View job opening</button>
      </div>
    )
  }

  if (blocked) {
    return (
      <div className="stat-card text-center py-16">
        <FileStack className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
          {requisitionId ? 'This requisition cannot become a job opening yet' : "You don't have permission to create a job directly"}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 max-w-md mx-auto">
          {requisitionId
            ? 'Only requisitions with status Approved can be converted into a job opening.'
            : 'Direct job creation without an approved requisition is off by default — ask your Company Admin to grant it.'}
        </p>
        <Link href="/hr/recruitment/requisitions" className="btn-secondary mx-auto w-fit">Back to Requisitions</Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{jobId ? 'Edit Job Opening' : 'Create Job Opening'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review the details, then keep it as a draft or open it internally.</p>
        </div>
        <button type="button" onClick={() => setShowPreview(true)} className="btn-secondary">
          <Eye className="w-4 h-4" /> Preview Job
        </button>
      </div>

      {errorMessage && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{errorMessage}</div>}

      {linkedRequisition && (
        <div className="px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm flex items-center gap-2">
          <FileStack className="w-4 h-4 flex-shrink-0" />
          Created from requisition <span className="font-semibold">{linkedRequisition.requisitionCode}</span> — position details were pre-filled and can be reviewed/edited below.
        </div>
      )}

      {/* Section 1 — Basic Information */}
      <section className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Job Title" required error={errors.jobTitle} className="sm:col-span-2">
            <input className={inputClass(errors.jobTitle)} value={formData.jobTitle} onChange={(e) => update('jobTitle', e.target.value)} placeholder="e.g. Backend Developer" />
          </Field>
          <Field label="Job Code">
            <input className="input-field bg-slate-50 dark:bg-slate-800/60" disabled value="Auto-generated on save" />
          </Field>
          {linkedRequisition && (
            <Field label="Requisition">
              <input className="input-field bg-slate-50 dark:bg-slate-800/60" disabled value={linkedRequisition.requisitionCode} />
            </Field>
          )}
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
          <Field label="Number of Openings" required error={errors.totalOpenings}>
            <input type="number" min={1} className={inputClass(errors.totalOpenings)} value={formData.totalOpenings} onChange={(e) => update('totalOpenings', e.target.value)} />
          </Field>
          <Field label="Location" required error={errors.location}>
            <select className={inputClass(errors.location)} value={formData.location} onChange={(e) => update('location', e.target.value)}>
              <option value="">Select location</option>
              {locations.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Hiring Manager" required error={errors.hiringManager}>
            <select className={inputClass(errors.hiringManager)} value={formData.hiringManager} onChange={(e) => update('hiringManager', e.target.value)}>
              <option value="">Select hiring manager</option>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Recruiter" required error={errors.recruiter}>
            <select className={inputClass(errors.recruiter)} value={formData.recruiter} onChange={(e) => update('recruiter', e.target.value)}>
              <option value="">Select recruiter</option>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Work Mode" required error={errors.workMode} className="sm:col-span-2">
            <PillRadioGroup options={WORK_MODE_LIST} labels={WORK_MODE_LABELS} value={formData.workMode} onChange={(v) => update('workMode', v)} error={errors.workMode} />
          </Field>
          <Field label="Employment Type" required error={errors.employmentType} className="sm:col-span-2">
            <PillRadioGroup options={JOB_EMPLOYMENT_TYPE_LIST} labels={JOB_EMPLOYMENT_TYPE_LABELS} value={formData.employmentType} onChange={(v) => update('employmentType', v)} error={errors.employmentType} />
          </Field>
        </div>
      </section>

      {/* Section 2 — Experience & Eligibility */}
      <section className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Experience & Eligibility</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Minimum Experience (years)" required error={errors.minExperience}>
            <input type="number" min={0} step="0.5" className={inputClass(errors.minExperience)} value={formData.minExperience} onChange={(e) => update('minExperience', e.target.value)} />
          </Field>
          <Field label="Maximum Experience (years)" required error={errors.maxExperience}>
            <input type="number" min={0} step="0.5" className={inputClass(errors.maxExperience)} value={formData.maxExperience} onChange={(e) => update('maxExperience', e.target.value)} />
          </Field>
          <Field label="Minimum Education">
            <input className="input-field" value={formData.minEducation} onChange={(e) => update('minEducation', e.target.value)} placeholder="e.g. B.Tech" />
          </Field>
          <Field label="Preferred Education">
            <input className="input-field" value={formData.preferredEducation} onChange={(e) => update('preferredEducation', e.target.value)} placeholder="e.g. M.Tech / MBA" />
          </Field>
          <Field label="Required Certifications">
            <input className="input-field" value={formData.certifications} onChange={(e) => update('certifications', e.target.value)} />
          </Field>
          <Field label="Industry Experience">
            <input className="input-field" value={formData.industryExperience} onChange={(e) => update('industryExperience', e.target.value)} placeholder="e.g. SaaS, Fintech" />
          </Field>
          <Field label="Freshers Allowed">
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => update('freshersAllowed', true)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium border', formData.freshersAllowed ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700')}>Yes</button>
              <button type="button" onClick={() => update('freshersAllowed', false)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium border', !formData.freshersAllowed ? 'bg-slate-700 text-white border-slate-700' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700')}>No</button>
            </div>
          </Field>
        </div>
      </section>

      {/* Section 3 — Skills */}
      <section className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Skills</h3>
        <p className="text-xs text-slate-400 -mt-2">Each skill can optionally carry a minimum experience and proficiency — this is what future AI candidate matching will compare against.</p>
        <JobSkillsEditor label="Required Skills" value={formData.requiredSkills} onChange={(v) => update('requiredSkills', v)} placeholder="e.g. Node.js" />
        <JobSkillsEditor label="Preferred Skills" value={formData.preferredSkills} onChange={(v) => update('preferredSkills', v)} placeholder="e.g. AWS" />
      </section>

      {/* Section 4 — Compensation */}
      <section className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Compensation</h3>
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Internal Budget</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Minimum CTC" error={errors.internalMinCtc}>
              <input type="number" min={0} className={inputClass(errors.internalMinCtc)} value={formData.internalMinCtc} onChange={(e) => update('internalMinCtc', e.target.value)} />
            </Field>
            <Field label="Maximum CTC">
              <input type="number" min={0} className="input-field" value={formData.internalMaxCtc} onChange={(e) => update('internalMaxCtc', e.target.value)} />
            </Field>
            <Field label="Currency">
              <input className="input-field uppercase" maxLength={3} value={formData.currency} onChange={(e) => update('currency', e.target.value.toUpperCase())} />
            </Field>
          </div>
        </div>
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Public Salary Range</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Display Salary Publicly?</span>
              <button type="button" onClick={() => update('publicSalaryVisible', true)} className={cn('px-2.5 py-1 rounded-full text-xs font-medium border', formData.publicSalaryVisible ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700')}>Yes</button>
              <button type="button" onClick={() => update('publicSalaryVisible', false)} className={cn('px-2.5 py-1 rounded-full text-xs font-medium border', !formData.publicSalaryVisible ? 'bg-slate-700 text-white border-slate-700' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700')}>No</button>
            </div>
          </div>
          {formData.publicSalaryVisible ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Public Minimum CTC" error={errors.publicMinCtc}>
                <input type="number" min={0} className={inputClass(errors.publicMinCtc)} value={formData.publicMinCtc} onChange={(e) => update('publicMinCtc', e.target.value)} />
              </Field>
              <Field label="Public Maximum CTC">
                <input type="number" min={0} className="input-field" value={formData.publicMaxCtc} onChange={(e) => update('publicMaxCtc', e.target.value)} />
              </Field>
            </div>
          ) : (
            <p className="text-sm text-slate-400">The public posting will show &ldquo;Not Disclosed&rdquo; — the internal budget above stays private regardless.</p>
          )}
        </div>
      </section>

      {/* Section 5 — Job Description */}
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
        <Field label="About the Role">
          <textarea className="input-field" rows={2} value={formData.aboutRole} onChange={(e) => update('aboutRole', e.target.value)} />
        </Field>
        <Field label="Benefits">
          <textarea className="input-field" rows={2} value={formData.benefits} onChange={(e) => update('benefits', e.target.value)} />
        </Field>
        <Field label="Perks">
          <textarea className="input-field" rows={2} value={formData.perks} onChange={(e) => update('perks', e.target.value)} />
        </Field>
      </section>

      {/* Section 6 — Screening Questions */}
      <section className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Screening Questions</h3>
        <p className="text-xs text-slate-400 -mt-2">A knockout question with a minimum acceptable answer never auto-rejects a candidate — it just flags them for HR to review as &ldquo;Does Not Meet Screening Criteria&rdquo; later.</p>
        <ScreeningQuestionsEditor value={formData.screeningQuestions} onChange={(v) => update('screeningQuestions', v)} />
      </section>

      {/* Section 7 — Application Requirements */}
      <section className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Application Requirements</h3>
        <p className="text-xs text-slate-400 -mt-2">What a candidate must provide when applying.</p>
        <ApplicationFieldsTable value={formData.applicationFields} onChange={(v) => update('applicationFields', v)} />
      </section>

      {/* Section 8 — Hiring Pipeline */}
      <section className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Hiring Pipeline</h3>
        <PipelineStagesEditor
          template={formData.pipelineTemplate}
          stages={formData.pipelineStages}
          onTemplateChange={(v) => update('pipelineTemplate', v)}
          onStagesChange={(v) => update('pipelineStages', v)}
        />
      </section>

      {/* Section 9 — Dates */}
      <section className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Important Dates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Opening Date">
            <input type="date" className="input-field" value={formData.openingDate} onChange={(e) => update('openingDate', e.target.value)} />
          </Field>
          <Field label="Application Deadline" error={errors.applicationDeadline}>
            <input type="date" className={inputClass(errors.applicationDeadline)} value={formData.applicationDeadline} onChange={(e) => update('applicationDeadline', e.target.value)} />
          </Field>
          <Field label="Expected Joining Date" error={errors.expectedJoiningDate}>
            <input type="date" className={inputClass(errors.expectedJoiningDate)} value={formData.expectedJoiningDate} onChange={(e) => update('expectedJoiningDate', e.target.value)} />
          </Field>
          <Field label="Target Closing Date">
            <input type="date" className="input-field" value={formData.targetClosingDate} onChange={(e) => update('targetClosingDate', e.target.value)} />
          </Field>
        </div>
      </section>

      {/* Section 10 — Visibility */}
      <section className="stat-card space-y-3">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Visibility</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {JOB_VISIBILITY_LIST.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => update('visibility', v)}
              className={cn(
                'text-left p-3 rounded-xl border transition-colors',
                formData.visibility === v ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
              )}
            >
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{JOB_VISIBILITY_LABELS[v]}</p>
              <p className="text-xs text-slate-400 mt-0.5">{JOB_VISIBILITY_DESCRIPTIONS[v]}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pb-6">
        <button type="button" onClick={handleCancel} disabled={saving} className="btn-secondary justify-center">
          <X className="w-4 h-4" /> Cancel
        </button>
        <button type="button" onClick={() => handleSave({ thenOpen: false })} disabled={saving} className="btn-secondary justify-center">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
        </button>
        <button type="button" onClick={() => handleSave({ thenOpen: true })} disabled={saving} className="btn-primary justify-center">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />} Publish
        </button>
      </div>

      {showPreview && (
        <JobPreviewModal
          formData={formData}
          locationName={locations.find((l) => l._id === formData.location)?.name}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
