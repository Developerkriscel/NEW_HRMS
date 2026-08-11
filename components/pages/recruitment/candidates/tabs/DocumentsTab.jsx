'use client'

import { FileText, Star } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { formatDate } from '@/lib/utils'
import { RESUME_PARSING_STATUS_LABELS } from '@/lib/candidateConstants'

// Every resume ever uploaded for this candidate — a newer resume never
// overwrites an older one (see models/CandidateResume.js). Useful because
// the same candidate may apply again months later with an updated resume.
export function DocumentsTab({ resumes }) {
  if (resumes.length === 0) {
    return (
      <div className="stat-card text-center py-12">
        <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No documents uploaded yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {resumes.map((r) => (
        <div key={r._id} className="stat-card !py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <div className="min-w-0">
              <a href={r.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5">
                Resume V{r.version}
                {r.isPrimary && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
              </a>
              <p className="text-xs text-slate-400 truncate">{r.originalFileName || r.fileName} · {r.uploadSource === 'MANUAL_HR' ? 'Added by HR' : 'From application'} · {formatDate(r.uploadedAt)}</p>
            </div>
          </div>
          <Badge variant={r.parsingStatus}>{RESUME_PARSING_STATUS_LABELS[r.parsingStatus]}</Badge>
        </div>
      ))}
    </div>
  )
}
