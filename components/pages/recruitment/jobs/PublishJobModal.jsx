'use client'

import { useState } from 'react'
import { X, Loader2, CheckCircle2, XCircle, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PUBLISHING_CHANNEL_LIST, PUBLISHING_CHANNEL_LABELS, CHANNELS_REQUIRING_INTEGRATION,
  PUBLICATION_STATUS, PUBLICATION_STATUS_LABELS,
} from '@/lib/publishingConstants'

export function PublishJobModal({ jobTitle, integrations, onPublish, onClose }) {
  const [selected, setSelected] = useState(new Set(['CAREER_PAGE', 'REFERRAL']))
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const integrationByProvider = Object.fromEntries((integrations || []).map((i) => [i.provider, i]))

  function toggle(channel) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(channel) ? next.delete(channel) : next.add(channel)
      return next
    })
  }

  async function handlePublish() {
    if (!selected.size) return
    setSubmitting(true)
    setError('')
    try {
      const outcome = await onPublish(Array.from(selected))
      setResults(outcome)
    } catch (err) {
      setError(err.response?.data?.message || 'Publishing failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Publish {jobTitle}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          {!results ? (
            <>
              {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
              <div className="space-y-2">
                {PUBLISHING_CHANNEL_LIST.filter((c) => c !== 'OTHER').map((channel) => {
                  const needsIntegration = CHANNELS_REQUIRING_INTEGRATION.includes(channel)
                  const integration = integrationByProvider[channel]
                  const isConnected = !needsIntegration || integration?.status === 'CONNECTED'
                  return (
                    <label
                      key={channel}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                        selected.has(channel) ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(channel)}
                        onChange={() => toggle(channel)}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{PUBLISHING_CHANNEL_LABELS[channel]}</p>
                        {needsIntegration && (
                          <p className={cn('text-xs mt-0.5', isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                            {isConnected ? 'Connected' : 'Connection Required'}
                          </p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary">Cancel</button>
                <button type="button" onClick={handlePublish} disabled={submitting || !selected.size} className="btn-primary">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Publish Selected
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                {results.map((r) => {
                  const success = r.status === PUBLICATION_STATUS.PUBLISHED
                  return (
                    <div key={r.channel} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        {success ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{PUBLISHING_CHANNEL_LABELS[r.channel]}</p>
                          {!success && <p className="text-xs text-red-500">{r.errorMessage || PUBLICATION_STATUS_LABELS[r.status]}</p>}
                          {success && r.externalUrl && (
                            <a href={r.externalUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 hover:underline">
                              <LinkIcon className="w-3 h-3" /> View listing
                            </a>
                          )}
                        </div>
                      </div>
                      <span className={cn('text-xs font-semibold', success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                        {success ? 'SUCCESS' : (r.errorCode || 'FAILED')}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                A channel that failed didn&apos;t block the others — connect it and retry from the publishing history below.
              </p>
              <div className="flex justify-end mt-6">
                <button type="button" onClick={onClose} className="btn-primary">Done</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
