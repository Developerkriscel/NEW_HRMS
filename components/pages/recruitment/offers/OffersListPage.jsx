'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileSignature, Settings } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { offerApi } from '@/services/offerApi'
import { formatDate } from '@/lib/utils'
import { OFFER_STATUS_LABELS, OFFER_STATUS_LIST } from '@/lib/offerConstants'

// item 1 — /hr/recruitment/offers: Candidate/Job/Proposed CTC/Joining Date/
// Offer Version/Status/Created By/Sent Date/Expiry/Actions.
export function OffersListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  function load() {
    setLoading(true)
    const params = { size: 100 }
    if (status) params.status = status
    if (search) params.search = search
    offerApi.list(params).then((res) => setRows(res.data.data.content || [])).finally(() => setLoading(false))
  }
  useEffect(load, [status, search])

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Offers</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Generate, approve, send and track offer letters.</p>
        </div>
        <Link href="/hr/recruitment/offer-templates" className="btn-secondary"><Settings className="w-4 h-4" /> Offer Templates</Link>
      </div>

      <div className="stat-card !p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="input-field" placeholder="Search candidate or offer code..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {OFFER_STATUS_LIST.map((s) => <option key={s} value={s}>{OFFER_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <div className="stat-card text-center py-16">
          <FileSignature className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400">No offers yet. Generate one from a Ready for Offer candidate's Selection page.</p>
        </div>
      ) : (
        <div className="stat-card !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4 font-medium">Candidate</th>
                <th className="py-3 px-4 font-medium">Job</th>
                <th className="py-3 px-4 font-medium">Proposed CTC</th>
                <th className="py-3 px-4 font-medium">Joining Date</th>
                <th className="py-3 px-4 font-medium">Version</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Created By</th>
                <th className="py-3 px-4 font-medium">Sent</th>
                <th className="py-3 px-4 font-medium">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {rows.map((r) => (
                <tr key={r.offerId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4">
                    <Link href={`/hr/recruitment/offers/${r.offerId}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{r.candidateName}</Link>
                    <p className="text-xs text-slate-400">{r.offerCode}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.jobTitle}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.proposedCtc != null ? `₹${r.proposedCtc}L` : '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.joiningDate ? formatDate(r.joiningDate, 'dd MMM yyyy') : '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.version ? `V${r.version}` : '—'}</td>
                  <td className="py-3 px-4"><Badge variant={r.status}>{r.statusLabel}</Badge></td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.createdByName || '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.sentAt ? formatDate(r.sentAt, 'dd MMM yyyy') : '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.expiresAt ? formatDate(r.expiresAt, 'dd MMM yyyy') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
