'use client'

import { useEffect, useMemo, useState } from 'react'
import { Rocket, PauseCircle, PlayCircle, XCircle, RotateCcw, AlertCircle, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PublishJobModal } from './PublishJobModal'
import { PublicListingEditor } from './PublicListingEditor'
import { publishingApi } from '@/services/publishingApi'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { formatDate } from '@/lib/utils'
import {
  PUBLISHING_CHANNEL_LIST, PUBLISHING_CHANNEL_LABELS, PUBLICATION_STATUS,
  PUBLICATION_STATUS_LABELS, ACTIVE_PUBLICATION_STATUSES, canPublishJobs,
} from '@/lib/publishingConstants'

export function PublishingTab({ job, onJobReloaded }) {
  const user = useAuthStore((s) => s.user)
  const addNotification = useUIStore((s) => s.addNotification)
  const session = useMemo(() => (user ? { role: user.role, userId: user.id, permissions: user.permissions || [] } : null), [user])
  const canManage = session ? canPublishJobs(session) : false

  const [publications, setPublications] = useState([])
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [errorDialog, setErrorDialog] = useState(null) // publication with an error to show
  const [confirmDialog, setConfirmDialog] = useState(null) // { type, publication }

  function load() {
    setLoading(true)
    Promise.all([publishingApi.listPublications(job._id), publishingApi.listIntegrations()])
      .then(([pubRes, intRes]) => {
        setPublications(pubRes.data.data || [])
        setIntegrations(intRes.data.data || [])
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [job._id])

  const publicationByChannel = Object.fromEntries(publications.map((p) => [p.channel, p]))

  async function handlePublish(channels) {
    const res = await publishingApi.publish(job._id, channels)
    load()
    onJobReloaded?.()
    return res.data.data.results
  }

  async function runPublicationAction(type, publication) {
    setBusyId(publication._id)
    try {
      if (type === 'pause') {
        await publishingApi.pause(job._id, publication._id)
        addNotification({ title: 'Listing paused', message: `${PUBLISHING_CHANNEL_LABELS[publication.channel]} paused for ${job.jobCode}`, type: 'info' })
      } else if (type === 'unpublish') {
        await publishingApi.unpublish(job._id, publication._id)
        addNotification({ title: 'Listing unpublished', message: `${PUBLISHING_CHANNEL_LABELS[publication.channel]} removed for ${job.jobCode}`, type: 'warning' })
      } else if (type === 'retry') {
        const res = await publishingApi.retry(job._id, publication._id)
        const ok = res.data.data.status === PUBLICATION_STATUS.PUBLISHED
        addNotification({ title: ok ? 'Retry succeeded' : 'Retry failed', message: `${PUBLISHING_CHANNEL_LABELS[publication.channel]} — ${PUBLICATION_STATUS_LABELS[res.data.data.status]}`, type: ok ? 'success' : 'warning' })
      } else if (type === 'republish') {
        await publishingApi.publish(job._id, [publication.channel])
        addNotification({ title: 'Republished', message: `${PUBLISHING_CHANNEL_LABELS[publication.channel]} republished for ${job.jobCode}`, type: 'success' })
      }
      setConfirmDialog(null)
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Job Distribution</h3>
            <p className="text-xs text-slate-400 mt-0.5">Choose where this job opening is visible, then track each channel independently.</p>
          </div>
          {canManage && (
            <button className="btn-primary" onClick={() => setShowPublishModal(true)}>
              <Rocket className="w-4 h-4" /> Publish Job
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PUBLISHING_CHANNEL_LIST.filter((c) => c !== 'OTHER').map((channel) => {
            const pub = publicationByChannel[channel]
            const status = pub?.status
            return (
              <div key={channel} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-700 dark:text-slate-200">{PUBLISHING_CHANNEL_LABELS[channel]}</span>
                {status ? <Badge>{PUBLICATION_STATUS_LABELS[status]}</Badge> : <span className="text-xs text-slate-400">Not Published</span>}
              </div>
            )
          })}
        </div>
      </div>

      <PublicListingEditor job={job} onSaved={onJobReloaded} />

      <div className="stat-card">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Publishing History</h3>
        {publications.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing has been published yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table [&_th]:!px-2.5 [&_td]:!px-2.5">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Status</th>
                  <th>Published At</th>
                  <th>Published By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {publications.map((p) => (
                  <tr key={p._id}>
                    <td className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">{PUBLISHING_CHANNEL_LABELS[p.channel]}</td>
                    <td className="whitespace-nowrap"><Badge>{PUBLICATION_STATUS_LABELS[p.status]}</Badge></td>
                    <td className="whitespace-nowrap">{p.publishedAt ? formatDate(p.publishedAt, 'dd MMM yyyy · hh:mm a') : '—'}</td>
                    <td className="whitespace-nowrap">{p.publishedBy ? `${p.publishedBy.firstName} ${p.publishedBy.lastName}` : '—'}</td>
                    <td>
                      <div className="flex items-center gap-1 flex-wrap">
                        {p.externalUrl && p.status === PUBLICATION_STATUS.PUBLISHED && (
                          <a href={p.externalUrl} target="_blank" rel="noreferrer" title="View listing" className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {canManage && p.status === PUBLICATION_STATUS.PUBLISHED && (
                          <button title="Pause" disabled={busyId === p._id} onClick={() => runPublicationAction('pause', p)} className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                            <PauseCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canManage && p.status === PUBLICATION_STATUS.PAUSED && (
                          <button title="Republish" disabled={busyId === p._id} onClick={() => runPublicationAction('republish', p)} className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                            <PlayCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canManage && p.status === PUBLICATION_STATUS.FAILED && (
                          <>
                            <button title="View Error" onClick={() => setErrorDialog(p)} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                              <AlertCircle className="w-3.5 h-3.5" />
                            </button>
                            <button title="Retry" disabled={busyId === p._id} onClick={() => runPublicationAction('retry', p)} className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {canManage && ACTIVE_PUBLICATION_STATUSES.includes(p.status) && (
                          <button title="Unpublish" disabled={busyId === p._id} onClick={() => setConfirmDialog({ type: 'unpublish', publication: p })} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPublishModal && (
        <PublishJobModal
          jobTitle={job.publicTitle || job.jobTitle}
          integrations={integrations}
          onPublish={handlePublish}
          onClose={() => { setShowPublishModal(false); load(); onJobReloaded?.() }}
        />
      )}

      {errorDialog && (
        <ConfirmDialog
          open
          title={`${PUBLISHING_CHANNEL_LABELS[errorDialog.channel]} publish error`}
          description={errorDialog.errorMessage || 'No further details available.'}
          requireReason={false}
          confirmLabel="Retry Now"
          variant="default"
          onConfirm={() => { setErrorDialog(null); runPublicationAction('retry', errorDialog) }}
          onClose={() => setErrorDialog(null)}
        />
      )}

      {confirmDialog?.type === 'unpublish' && (
        <ConfirmDialog
          open
          title={`Unpublish from ${PUBLISHING_CHANNEL_LABELS[confirmDialog.publication.channel]}?`}
          description="This removes the job from this channel only — the internal job status and every other channel are untouched."
          requireReason={false}
          confirmLabel="Unpublish"
          variant="danger"
          loading={busyId === confirmDialog.publication._id}
          onConfirm={() => runPublicationAction('unpublish', confirmDialog.publication)}
          onClose={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}
