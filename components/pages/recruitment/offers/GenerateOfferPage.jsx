'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Eye } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { offerApi } from '@/services/offerApi'
import { candidateApi } from '@/services/candidateApi'
import { selectionApi } from '@/services/selectionApi'
import { compensationApi } from '@/services/compensationApi'
import { departmentApi, designationApi, branchApi } from '@/services/departmentApi'
import { jobApi } from '@/services/jobApi'
import { JOB_EMPLOYMENT_TYPE_LIST, JOB_EMPLOYMENT_TYPE_LABELS, WORK_MODE_LIST, WORK_MODE_LABELS } from '@/lib/jobConstants'
import { OfferPreviewModal } from './OfferPreviewModal'

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label} {required && <span className="text-red-500">*</span>}</span>
      {children}
    </label>
  )
}
function ReadRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm py-1">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 dark:text-slate-200 font-medium text-right">{value ?? '—'}</span>
    </div>
  )
}

// items 2-6 — "Generate Offer" screen: eligibility gate, auto-filled
// fields pulled forward from Job/Selection/Compensation ("HR should not
// retype these"), template choice, and a Preview before saving.
export function GenerateOfferPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationId = searchParams.get('applicationId')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [application, setApplication] = useState(null)
  const [templates, setTemplates] = useState([])
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [branches, setBranches] = useState([])
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    if (!applicationId) { setLoading(false); setError('No application specified.'); return }
    Promise.all([
      candidateApi.getApplication(applicationId),
      selectionApi.getSummary(applicationId).catch(() => null),
      compensationApi.getForApplication(applicationId).catch(() => null),
      offerApi.getForApplication(applicationId).catch(() => null),
      offerApi.listTemplates(),
      departmentApi.getAll(), designationApi.getAll(), branchApi.getAll(), jobApi.getEmployees(),
    ]).then(([appRes, selRes, compRes, offerRes, tplRes, depRes, desRes, branchRes, empRes]) => {
      const app = appRes.data.data
      setApplication(app)
      setTemplates(tplRes.data.data || [])
      setDepartments(depRes.data.data || [])
      setDesignations(desRes.data.data || [])
      setBranches(branchRes.data.data || [])
      setEmployees(empRes.data.data || [])

      const existing = offerRes?.data?.data
      const selectDecision = (selRes?.data?.data?.decisionHistory || []).find((d) => d.decision === 'SELECT')
      const compensation = compRes?.data?.data?.latest

      if (existing?.currentVersion) {
        const v = existing.currentVersion
        setForm({
          designationId: v.designationId || '', departmentId: v.departmentId || '', managerId: v.managerId || '',
          joiningDate: v.joiningDate ? v.joiningDate.slice(0, 10) : '', locationId: v.locationId || '',
          employmentType: v.employmentType || '', workMode: v.workMode || '',
          ctc: v.ctc ?? '', salaryStructureId: v.salaryStructureId || '',
          probationPeriod: v.probationPeriod || '', noticePeriod: v.noticePeriod || '',
          offerValidUntil: v.offerValidUntil ? v.offerValidUntil.slice(0, 10) : '',
          templateId: v.templateId || tplRes.data.data.find((t) => t.isDefault)?._id || '',
        })
      } else {
        setForm({
          designationId: selectDecision?.recommendedDesignationId || app.jobId?.designation || '',
          departmentId: selectDecision?.recommendedDepartmentId || app.jobId?.department || '',
          managerId: selectDecision?.recommendedManagerId || app.jobId?.hiringManager || '',
          joiningDate: (selectDecision?.proposedJoiningDate || app.jobId?.expectedJoiningDate || '').slice?.(0, 10) || '',
          locationId: app.jobId?.location || '',
          employmentType: selectDecision?.employmentType || app.jobId?.employmentType || '',
          workMode: app.jobId?.workMode || '',
          ctc: compensation?.totalCtc ?? '', salaryStructureId: compensation?.salaryStructureId || '',
          probationPeriod: '6 months', noticePeriod: app.candidateId?.noticePeriod || '30 days',
          offerValidUntil: '',
          templateId: tplRes.data.data.find((t) => t.isDefault)?._id || tplRes.data.data[0]?._id || '',
        })
      }
    }).catch(() => setError('Could not load offer details.')).finally(() => setLoading(false))
  }, [applicationId])

  const eligible = application && application.selectionStatus === 'SELECTION_APPROVED' && application.readyForOffer

  function update(key, val) { setForm((f) => ({ ...f, [key]: val })) }

  const previewVariables = useMemo(() => {
    if (!form || !application) return null
    const candidate = application.candidateId
    const designation = designations.find((d) => d._id === form.designationId)
    const department = departments.find((d) => d._id === form.departmentId)
    const manager = employees.find((e) => e._id === form.managerId)
    const branch = branches.find((b) => b._id === form.locationId)
    return {
      candidate_name: candidate ? `${candidate.firstName} ${candidate.lastName}` : '',
      designation: designation?.name || '', department: department?.name || '',
      joining_date: form.joiningDate ? new Date(form.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
      location: branch?.name || '', reporting_manager: manager?.name || '',
      annual_ctc: form.ctc ? `₹${form.ctc}L` : '', probation_period: form.probationPeriod || '',
      offer_expiry: form.offerValidUntil ? new Date(form.offerValidUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
      company_name: 'the company', employment_type: form.employmentType || '', notice_period: form.noticePeriod || '', work_mode: form.workMode || '',
    }
  }, [form, application, designations, departments, employees, branches])

  const selectedTemplate = templates.find((t) => t._id === form?.templateId)

  async function save() {
    if (!form.joiningDate) return setError('A joining date is required')
    if (!form.ctc) return setError('An annual CTC is required')
    if (!form.offerValidUntil) return setError('An offer expiry date is required')
    if (!form.templateId) return setError('An offer template is required')
    setSaving(true); setError('')
    try {
      const res = await offerApi.generate(applicationId, form)
      router.push(`/hr/recruitment/offers/${res.data.data.offer._id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate the offer')
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <Link href={applicationId ? `/hr/recruitment/applications/${applicationId}/selection` : '/hr/recruitment/offers'} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </Link>

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Generate Offer</h1>
          {application && <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{application.candidateId?.firstName} {application.candidateId?.lastName} — {application.jobId?.publicTitle || application.jobId?.jobTitle}</p>}
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

      {!eligible ? (
        <div className="stat-card text-center py-16">
          <p className="text-slate-500 dark:text-slate-400">An offer can only be generated once Selection is approved and Compensation is approved for this candidate.</p>
          {applicationId && <Link href={`/hr/recruitment/applications/${applicationId}/selection`} className="btn-secondary mx-auto w-fit mt-4">Back to Selection</Link>}
        </div>
      ) : form && (
        <>
          <div className="stat-card space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Candidate & Job</h3>
            <ReadRow label="Candidate Name" value={`${application.candidateId?.firstName} ${application.candidateId?.lastName}`} />
            <ReadRow label="Candidate ID" value={application.candidateId?.candidateCode} />
            <ReadRow label="Job Title" value={application.jobId?.publicTitle || application.jobId?.jobTitle} />
          </div>

          <div className="stat-card space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Employment Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Designation">
                <select className="input-field" value={form.designationId} onChange={(e) => update('designationId', e.target.value)}>
                  <option value="">Select designation</option>
                  {designations.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <select className="input-field" value={form.departmentId} onChange={(e) => update('departmentId', e.target.value)}>
                  <option value="">Select department</option>
                  {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Reporting Manager">
                <select className="input-field" value={form.managerId} onChange={(e) => update('managerId', e.target.value)}>
                  <option value="">Select manager</option>
                  {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
              </Field>
              <Field label="Location">
                <select className="input-field" value={form.locationId} onChange={(e) => update('locationId', e.target.value)}>
                  <option value="">Select location</option>
                  {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </Field>
              <Field label="Employment Type">
                <select className="input-field" value={form.employmentType} onChange={(e) => update('employmentType', e.target.value)}>
                  <option value="">Select type</option>
                  {JOB_EMPLOYMENT_TYPE_LIST.map((t) => <option key={t} value={t}>{JOB_EMPLOYMENT_TYPE_LABELS[t]}</option>)}
                </select>
              </Field>
              <Field label="Work Mode">
                <select className="input-field" value={form.workMode} onChange={(e) => update('workMode', e.target.value)}>
                  <option value="">Select mode</option>
                  {WORK_MODE_LIST.map((t) => <option key={t} value={t}>{WORK_MODE_LABELS[t]}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div className="stat-card space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Compensation & Dates</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Annual CTC (₹L)" required><input type="number" className="input-field" value={form.ctc} onChange={(e) => update('ctc', e.target.value)} /></Field>
              <Field label="Proposed Joining Date" required><input type="date" className="input-field" value={form.joiningDate} onChange={(e) => update('joiningDate', e.target.value)} /></Field>
              <Field label="Probation Period"><input className="input-field" value={form.probationPeriod} onChange={(e) => update('probationPeriod', e.target.value)} /></Field>
              <Field label="Notice Period"><input className="input-field" value={form.noticePeriod} onChange={(e) => update('noticePeriod', e.target.value)} /></Field>
              <Field label="Offer Valid Until" required><input type="date" className="input-field" value={form.offerValidUntil} onChange={(e) => update('offerValidUntil', e.target.value)} /></Field>
            </div>
          </div>

          <div className="stat-card space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Offer Letter Template</h3>
            <Field label="Template" required>
              <select className="input-field" value={form.templateId} onChange={(e) => update('templateId', e.target.value)}>
                <option value="">Select a template</option>
                {templates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setPreviewing(true)} disabled={!selectedTemplate} className="btn-secondary"><Eye className="w-4 h-4" /> Preview Offer</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Draft</button>
          </div>

          {previewing && selectedTemplate && (
            <OfferPreviewModal content={selectedTemplate.content} variables={previewVariables} onClose={() => setPreviewing(false)} />
          )}
        </>
      )}
    </div>
  )
}
