'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/common/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PermissionDenied } from '@/components/common/PermissionDenied'
import { platformApi } from '@/services/platformApi'
import { formatDate, formatCurrency } from '@/lib/utils'

const STATUS_TABS = ['All', 'TRIAL', 'ACTIVE', 'GRACE', 'EXPIRED', 'CANCELLED', 'SUSPENDED']
const PAGE_SIZE = 20

export default function SubscriptionsPage() {
  const router = useRouter()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  function load() {
    setLoading(true)
    setForbidden(false)
    const params = { page, size: PAGE_SIZE }
    if (status !== 'All') params.status = status
    platformApi.getSubscriptions(params)
      .then((res) => {
        setRows(res.data.data.content)
        setTotalPages(res.data.data.totalPages)
        setTotalElements(res.data.data.totalElements)
      })
      .catch((err) => { if (err.response?.status === 403) setForbidden(true) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [page, status])

  if (forbidden) return <PermissionDenied requiredPermission="subscription.view" message="You don't have permission to view subscriptions." />

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscriptions</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{totalElements} subscriptions across all tenants</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatus(tab); setPage(0) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${status === tab ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Trial / Grace Ends</th>
                <th>Auto Renew</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><div className="flex justify-center"><LoadingSpinner /></div></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">No subscriptions found</td></tr>
              ) : rows.map((row) => (
                <tr key={row._id} onClick={() => router.push(`/super-admin/subscriptions/${row._id}`)} className="cursor-pointer">
                  <td>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{row.tenant?.companyName || '-'}</p>
                    <p className="text-xs text-slate-400">{row.tenant?.tenantCode}</p>
                  </td>
                  <td className="text-sm text-slate-600 dark:text-slate-300">{row.plan?.name || 'No plan'} {row.plan?.price ? `· ${formatCurrency(row.plan.price)}` : ''}</td>
                  <td><Badge>{row.status}</Badge></td>
                  <td className="text-sm text-slate-500 dark:text-slate-400">{formatDate(row.startDate)}</td>
                  <td className="text-sm text-slate-500 dark:text-slate-400">{formatDate(row.status === 'GRACE' ? row.graceEndsAt : row.trialEndDate)}</td>
                  <td className="text-sm text-slate-500 dark:text-slate-400">{row.autoRenew ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500">
            <span>Page {page + 1} of {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
