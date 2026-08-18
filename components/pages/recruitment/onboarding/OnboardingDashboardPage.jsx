'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserCheck, Send, Bell } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { preboardingApi } from '@/services/preboardingApi'
import { formatDate, cn } from '@/lib/utils'
import { PREBOARDING_TABS, FORM_STATUS_LABELS } from '@/lib/preboardingConstants'

const CARD_DEFS = [
  { key: 'acceptedOffers', label: 'Accepted Offers' },
  { key: 'formsPending', label: 'Forms Pending' },
  { key: 'documentsPending', label: 'Documents Pending' },
  { key: 'verificationPending', label: 'Verification Pending' },
  { key: 'readyToJoin', label: 'Ready to Join' },
  { key: 'joiningThisWeek', label: 'Joining This Week' },
]

// item 1 — /hr/onboarding, the Preboarding Dashboard: 8 tabs,
// 6 summary cards, candidate table with progress columns.
export function OnboardingDashboardPage() {
  const [tab, setTab] = useState('ACCEPTED')
  const [rows, setRows] = useState([])
  const [cards, setCards] = useState(null)
  const [tabCounts, setTabCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)

  function load() {
    setLoading(true)
    const params = { status: tab, size: 100 }
    if (search) params.search = search
    preboardingApi.list(params).then((res) => {
      setRows(res.data.data.content || [])
      setCards(res.data.data.cards)
      setTabCounts(res.data.data.tabCounts || {})
    }).finally(() => setLoading(false))
  }
  useEffect(load, [tab, search])

  async function sendForm(id) {
    setBusyId(id)
    try {
      const res = await preboardingApi.sendForm(id)
      alert(`Form link: ${window.location.origin}${res.data.data.portalUrl}`)
      load()
    } catch (err) { alert(err.response?.data?.message || 'Could not send form') } finally { setBusyId(null) }
  }
  async function sendReminder(id) {
    setBusyId(id)
    try { await preboardingApi.sendForm(id); alert('Reminder sent — a fresh link was issued.'); load() }
    catch (err) { alert(err.response?.data?.message || 'Could not send reminder') } finally { setBusyId(null) }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Preboarding</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Candidate information, documents and joining readiness after offer acceptance.</p>
        </div>
        <Link href="/hr/recruitment/document-requirements" className="btn-secondary">Document Requirements</Link>
      </div>

      {cards && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CARD_DEFS.map((c) => (
            <div key={c.key} className="stat-card !p-4">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{cards[c.key]}</p>
              <p className="text-xs text-slate-400 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {PREBOARDING_TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn('px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap', tab === t.key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200')}>
              {t.label} {tabCounts[t.key] ? <span className="ml-1 text-xs text-slate-400">({tabCounts[t.key]})</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-card !p-4">
        <input className="input-field max-w-sm" placeholder="Search candidate..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <div className="stat-card text-center py-16">
          <UserCheck className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400">No candidates in this stage.</p>
        </div>
      ) : (
        <div className="stat-card !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4 font-medium">Candidate</th>
                <th className="py-3 px-4 font-medium">Position</th>
                <th className="py-3 px-4 font-medium">Joining Date</th>
                <th className="py-3 px-4 font-medium">Form</th>
                <th className="py-3 px-4 font-medium">Documents</th>
                <th className="py-3 px-4 font-medium">Verification</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {rows.map((r) => (
                <tr key={r.preboardingId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4">
                    <Link href={`/hr/onboarding/${r.preboardingId}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{r.candidateName}</Link>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.jobTitle}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.joiningDate ? formatDate(r.joiningDate, 'dd MMM yyyy') : '—'}</td>
                  <td className="py-3 px-4"><Badge variant={r.formStatus}>{r.formStatusLabel}</Badge></td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.documentsPercent != null ? `${r.documentsPercent}%` : '—'}</td>
                  <td className="py-3 px-4"><Badge variant={r.verificationStatus}>{r.verificationStatus === 'COMPLETE' ? 'Verified' : 'Pending'}</Badge></td>
                  <td className="py-3 px-4"><Badge variant={r.status}>{r.status.replace(/_/g, ' ')}</Badge></td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/hr/onboarding/${r.preboardingId}`} className="btn-secondary !text-xs !py-1">View</Link>
                      {['READY_TO_JOIN', 'JOINED'].includes(r.status) && (
                        <Link href={`/hr/onboarding/${r.preboardingId}/joining`} className="btn-secondary !text-xs !py-1">Employee Setup</Link>
                      )}
                      {r.formStatus === 'NOT_SENT' && (
                        <button disabled={busyId === r.preboardingId} onClick={() => sendForm(r.preboardingId)} className="btn-secondary !text-xs !py-1"><Send className="w-3 h-3" /> Send Form</button>
                      )}
                      {['SENT', 'OPENED', 'IN_PROGRESS', 'CORRECTION_REQUIRED'].includes(r.formStatus) && (
                        <button disabled={busyId === r.preboardingId} onClick={() => sendReminder(r.preboardingId)} className="btn-secondary !text-xs !py-1"><Bell className="w-3 h-3" /> Reminder</button>
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
  )
}
