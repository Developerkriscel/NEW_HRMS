'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Save, Pencil } from 'lucide-react'
import { jobApi } from '@/services/jobApi'
import { formatDate } from '@/lib/utils'
import { JOB_EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from '@/lib/jobConstants'

// Public Job Title / Description are the only fields edited here — HR may
// want the external-facing copy to read differently from the internal
// record (spec: "HR may need slightly different public information").
// Everything else shown below (location, work mode, experience, salary
// visibility, deadline, vacancies, benefits, skills) already has one
// canonical editable home — the Job's own Edit form — so this stays
// read-only here rather than duplicating that surface.
export function PublicListingEditor({ job, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(job.publicTitle || '')
  const [description, setDescription] = useState(job.publicDescription || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await jobApi.update(job._id, { publicTitle: title || null, publicDescription: description || null })
      setEditing(false)
      onSaved?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const salaryText = job.publicSalaryVisible
    ? `${job.currency} ${job.publicMinCtc?.toLocaleString('en-IN') ?? '?'} – ${job.publicMaxCtc?.toLocaleString('en-IN') ?? '?'}`
    : 'Not Disclosed'

  return (
    <div className="stat-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Public Listing</h3>
          <p className="text-xs text-slate-400 mt-0.5">What candidates see — never your internal budget, approvals or HR notes.</p>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="btn-secondary !py-1.5 !px-3 text-xs">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

      {editing ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Public Job Title <span className="text-red-500">*</span></span>
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={job.jobTitle} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Public Job Description <span className="text-red-500">*</span></span>
            <textarea className="input-field" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={job.jobSummary} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setEditing(false); setTitle(job.publicTitle || ''); setDescription(job.publicDescription || '') }} disabled={saving} className="btn-secondary !py-1.5 !px-3 text-xs">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary !py-1.5 !px-3 text-xs">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{job.publicTitle || job.jobTitle}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{job.publicDescription || job.jobSummary || '—'}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-sm">
        <div><span className="text-xs text-slate-400 block">Location</span>{job.location?.name || '—'}</div>
        <div><span className="text-xs text-slate-400 block">Work Mode</span>{WORK_MODE_LABELS[job.workMode] || '—'}</div>
        <div><span className="text-xs text-slate-400 block">Employment Type</span>{JOB_EMPLOYMENT_TYPE_LABELS[job.employmentType] || '—'}</div>
        <div><span className="text-xs text-slate-400 block">Experience</span>{job.minExperience != null ? `${job.minExperience}–${job.maxExperience ?? '?'} yrs` : '—'}</div>
        <div><span className="text-xs text-slate-400 block">Public Salary</span>{salaryText}</div>
        <div><span className="text-xs text-slate-400 block">Application Deadline</span>{job.applicationDeadline ? formatDate(job.applicationDeadline) : '—'}</div>
        <div><span className="text-xs text-slate-400 block">Vacancies</span>{job.totalOpenings}</div>
      </div>
      <Link href={`/hr/recruitment/jobs/${job._id}/edit`} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
        Edit full job details →
      </Link>
    </div>
  )
}
