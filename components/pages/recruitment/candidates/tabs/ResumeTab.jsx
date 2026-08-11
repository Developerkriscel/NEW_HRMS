'use client'

import { useRef, useState } from 'react'
import { FileText, Upload, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, Clock } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { candidateApi } from '@/services/candidateApi'
import { formatRelativeTime } from '@/lib/utils'
import { RESUME_PARSING_STATUS_LABELS } from '@/lib/candidateConstants'
import { ResumeReviewPanel } from './ResumeReviewPanel'

const STATUS_ICON = {
  UPLOADED: Clock, PARSING: Loader2, PARSED: CheckCircle2, REVIEW_REQUIRED: AlertTriangle, FAILED: AlertTriangle,
}

// The "current" resume — its parsing status, and the entry point into the
// Resume Data Review workflow. Every previous version lives in the
// Documents tab instead (see DocumentsTab.jsx).
export function ResumeTab({ candidateId, resumes, onChanged }) {
  const primary = resumes.find((r) => r.isPrimary) || resumes[0] || null
  const [busy, setBusy] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  async function retry() {
    setBusy(true)
    setError('')
    try {
      await candidateApi.retryParse(primary._id)
      onChanged()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not retry parsing')
    } finally {
      setBusy(false)
    }
  }

  async function handleUpload(file) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('resume', file)
      await candidateApi.uploadResume(candidateId, fd)
      onChanged()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not upload resume')
    } finally {
      setBusy(false)
    }
  }

  if (!primary) {
    return (
      <div className="stat-card text-center py-12 space-y-3">
        <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
        <p className="text-sm text-slate-400">No resume on file yet.</p>
        <label className="btn-primary w-fit mx-auto cursor-pointer">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload Resume
          <input type="file" accept=".pdf,.doc,.docx" className="hidden" disabled={busy} onChange={(e) => handleUpload(e.target.files?.[0] || null)} />
        </label>
      </div>
    )
  }

  const StatusIcon = STATUS_ICON[primary.parsingStatus] || Clock

  return (
    <div className="space-y-4">
      {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

      <div className="stat-card space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <a href={primary.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block">
                {primary.originalFileName || primary.fileName}
              </a>
              <p className="text-xs text-slate-400">Version {primary.version} · Uploaded {formatRelativeTime(primary.uploadedAt)}</p>
            </div>
          </div>
          <label className="btn-secondary !py-1.5 !text-xs cursor-pointer flex-shrink-0">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Upload New
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" disabled={busy} onChange={(e) => handleUpload(e.target.files?.[0] || null)} />
          </label>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <StatusIcon className={`w-4 h-4 ${primary.parsingStatus === 'PARSING' ? 'animate-spin text-blue-500' : primary.parsingStatus === 'PARSED' ? 'text-emerald-500' : primary.parsingStatus === 'FAILED' ? 'text-red-500' : primary.parsingStatus === 'REVIEW_REQUIRED' ? 'text-amber-500' : 'text-slate-400'}`} />
          <Badge variant={primary.parsingStatus}>{RESUME_PARSING_STATUS_LABELS[primary.parsingStatus]}</Badge>
          {primary.parsingStatus === 'FAILED' && (
            <>
              <span className="text-xs text-red-500">{primary.errorMessage}</span>
              <button onClick={retry} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                <RefreshCw className="w-3 h-3" /> Retry Parsing
              </button>
            </>
          )}
          {(primary.parsingStatus === 'PARSED' || primary.parsingStatus === 'REVIEW_REQUIRED') && (
            <button onClick={() => setReviewOpen(true)} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
              <Sparkles className="w-3 h-3" /> Review Extracted Data
            </button>
          )}
        </div>

        {primary.possibleDuplicateOf && !primary.duplicateDismissed && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> Possible duplicate candidate identity found — open Review Extracted Data to check.
          </div>
        )}
      </div>

      {reviewOpen && (
        <ResumeReviewPanel
          resumeId={primary._id}
          candidateId={candidateId}
          onClose={() => setReviewOpen(false)}
          onApplied={onChanged}
        />
      )}
    </div>
  )
}
