'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Mail, FileText, Paperclip, Trash2, UploadCloud } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { Portal } from '@/components/common/Portal'

export function SendOfferModal({ candidate, companyName = '', onClose, onSend }) {
  const candidateName = candidate?.name || candidate?.candidateName ||
    [candidate?.firstName, candidate?.lastName].filter(Boolean).join(' ') || 'Candidate'
  const roleTitle = candidate?.role || candidate?.jobTitle || candidate?.positionTitle || 'the offered position'
  const company = String(companyName || candidate?.companyName || '').trim() || 'the company'
  const defaultSubject = `Job Offer from ${company} - ${roleTitle}`
  const defaultBody = `Dear ${candidateName},

We are pleased to offer you the position of ${roleTitle} at ${company}. We were impressed by your experience and look forward to welcoming you to the team.

Please review the attached offer letter and use the secure link in this email to accept or decline the offer. After accepting, use the Employee Details link in this email to complete your information.

Best regards,
The ${company} Recruitment Team`;

  const [recipientEmail, setRecipientEmail] = useState(candidate?.email || '')
  const [subject, setSubject] = useState(defaultSubject)
  const [emailBody, setEmailBody] = useState(defaultBody)
  const [attachments, setAttachments] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isRunningOnLocalhost, setIsRunningOnLocalhost] = useState(false)
  const [jobDetails, setJobDetails] = useState(null)
  const [employmentDetails, setEmploymentDetails] = useState({ departmentId: '', designationId: '', employmentType: '', joiningDate: '', probationPeriod: '6 months' })

  const departmentOptions = useMemo(() => (jobDetails?.departments || []).filter(Boolean), [jobDetails])
  const designationOptions = useMemo(() => (jobDetails?.designations || []).filter(Boolean), [jobDetails])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hostname = window.location.hostname
    setIsRunningOnLocalhost(hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1')
  }, [])

  useEffect(() => {
    if (!candidate) return
    setRecipientEmail(candidate.email || '')
    setSubject(defaultSubject)
    setEmailBody(defaultBody)
    setAttachments([])
    setError(null)
  // The defaults intentionally refresh when a different candidate is selected.
  }, [candidate, candidateName, company, defaultBody, defaultSubject])

  useEffect(() => {
    let cancelled = false
    if (!candidate?.jobId) return undefined
    Promise.all([
      fetch(`/api/recruitment/jobs/${candidate.jobId}`).then((response) => response.ok ? response.json() : null),
      fetch('/api/departments').then((response) => response.ok ? response.json() : null),
      fetch('/api/designations').then((response) => response.ok ? response.json() : null),
    ])
      .then(([payload, departmentsPayload, designationsPayload]) => {
        if (cancelled) return
        const job = payload?.data || null
        setJobDetails({ ...job, departments: departmentsPayload?.data || [], designations: designationsPayload?.data || [] })
        setEmploymentDetails({
          departmentId: job?.department?._id || job?.department || '',
          designationId: job?.designation?._id || job?.designation || '',
          employmentType: job?.employmentType || '',
          joiningDate: job?.expectedJoiningDate ? new Date(job.expectedJoiningDate).toISOString().slice(0, 10) : '',
          probationPeriod: '6 months',
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [candidate?.jobId])

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return

    const next = [...attachments]
    for (const file of files) {
      if (next.length >= 5) {
        setError('You can attach up to 5 PDF files.')
        break
      }
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) {
        setError('Only PDF attachments are allowed.')
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is too large. Each PDF must be under 10MB.`)
        continue
      }
      next.push(file)
    }
    setAttachments(next)
  }
  
  const handleSend = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSend({ ...candidate, email: recipientEmail, offerEmail: { subject, body: emailBody, attachments, ...employmentDetails } })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send offer')
    } finally {
      setSaving(false)
    }
  }

  if (!candidate) return null

  return (
    <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-500" />
              Send Offer Letter
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-1">Review and send automated offer via email</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 relative z-10 custom-scrollbar space-y-6">
          
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-5">
            <Avatar name={candidateName} size="lg" />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{candidateName}</h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5">{candidate.email}</p>
            </div>
            <div className="max-w-[40%] text-right">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Position</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{roleTitle}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldSelect label="Department" value={employmentDetails.departmentId} options={departmentOptions} onChange={(value) => setEmploymentDetails((state) => ({ ...state, departmentId: value }))} placeholder="Select department" />
              <FieldSelect label="Designation" value={employmentDetails.designationId} options={designationOptions} onChange={(value) => setEmploymentDetails((state) => ({ ...state, designationId: value }))} placeholder="Select designation" />
              <FieldSelect label="Employment Type" value={employmentDetails.employmentType} options={[{ _id: 'FULL_TIME', name: 'Full Time' }, { _id: 'PART_TIME', name: 'Part Time' }, { _id: 'CONTRACT', name: 'Contract' }, { _id: 'INTERNSHIP', name: 'Internship' }]} onChange={(value) => setEmploymentDetails((state) => ({ ...state, employmentType: value }))} placeholder="Select employment type" />
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Joining Date<input type="date" required value={employmentDetails.joiningDate} onChange={(event) => setEmploymentDetails((state) => ({ ...state, joiningDate: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-800/50" /></label>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 sm:col-span-2">Probation Period<input type="text" required value={employmentDetails.probationPeriod} onChange={(event) => setEmploymentDetails((state) => ({ ...state, probationPeriod: event.target.value }))} placeholder="e.g. 6 months" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-800/50" /></label>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">To (Candidate Email)</label>
              <input 
                type="email" 
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow mb-4"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Email Subject</label>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Email Body</label>
              <textarea 
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full h-48 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm font-medium text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow resize-none custom-scrollbar"
              />
            </div>
          </div>

          {isRunningOnLocalhost && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              This app is running on localhost. Offer and employee-details links will only open on this computer. To let a candidate open them from another device, set <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">FRONTEND_URL</code> to your public HTTPS domain or development tunnel, then restart the app.
            </div>
          )}

          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-sm font-medium">
            <FileText className="w-5 h-5 flex-shrink-0" />
            An automated PDF offer letter will be generated and attached based on the standard template.
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                  <Paperclip className="h-4 w-4 text-indigo-500" /> Additional Attachments
                </h3>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Attach company policy, benefits guide, or joining instructions as PDF files.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-indigo-600 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 dark:ring-slate-700">
                <UploadCloud className="h-4 w-4" />
                Add PDF
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentChange}
                  disabled={saving}
                />
              </label>
            </div>

            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{file.name}</p>
                      <p className="text-xs font-medium text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachments((items) => items.filter((_, i) => i !== index))}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      disabled={saving}
                      title="Remove attachment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-900/60">
                No extra PDFs attached. Offer letter PDF will still be generated automatically.
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-700 dark:text-red-300 text-sm font-semibold">
              {error}
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/30 flex justify-end gap-3 relative z-10">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors bg-slate-100 dark:bg-slate-800"
          >
            Cancel
          </button>
          
          <button 
            type="button"
            onClick={handleSend}
            disabled={saving} 
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            {saving ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span> Sending...</>
            ) : (
              <><Mail className="w-4 h-4" /> Send Offer Letter</>
            )}
          </button>
        </div>
      </div>
      </div>
    </Portal>
  )
}

function FieldSelect({ label, value, options, onChange, placeholder }) {
  return <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}<select required value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-800/50"><option value="">{options.length ? placeholder : 'Loading...'}</option>{options.map((option) => <option key={option._id} value={option._id}>{option.name}</option>)}</select></label>
}
