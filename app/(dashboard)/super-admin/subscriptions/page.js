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
    <div className="animate-fade-in space-y-6 pb-12">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100/80 dark:border-slate-800/60 pb-6">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-1.5">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight">Subscriptions</h1>
            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 uppercase tracking-widest shadow-sm">
              {totalElements} Total
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Filter Dropdown */}
        <select 
          className="bg-white dark:bg-slate-900 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer w-full lg:w-48"
          value={status} 
          onChange={(e) => { setStatus(e.target.value); setPage(0) }}
        >
          {STATUS_TABS.map((tab) => (
            <option key={tab} value={tab}>{tab}</option>
          ))}
        </select>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Start Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Trial / Grace Ends</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Auto Renew</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><div className="flex justify-center"><LoadingSpinner /></div></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm font-semibold text-slate-400">No subscriptions found for the selected filter.</td></tr>
              ) : rows.map((row) => (
                <tr key={row._id} onClick={() => router.push(`/super-admin/subscriptions/${row._id}`)} className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{row.tenant?.companyName || '-'}</p>
                    <p className="text-[11px] font-semibold text-slate-400">{row.tenant?.tenantCode}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{row.plan?.name || 'No plan'}</span>
                      {row.plan?.price > 0 && <span className="text-[11px] font-semibold text-slate-400">{formatCurrency(row.plan.price)}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={row.status === 'ACTIVE' ? 'success' : row.status === 'CANCELLED' ? 'error' : row.status === 'TRIAL' ? 'warning' : 'default'}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{formatDate(row.startDate)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {formatDate(row.status === 'GRACE' ? row.graceEndsAt : row.trialEndDate) || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${row.autoRenew ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {row.autoRenew ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); setPage((p) => Math.max(0, p - 1)) }} disabled={page === 0} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-all">Prev</button>
              <button onClick={(e) => { e.stopPropagation(); setPage((p) => Math.min(totalPages - 1, p + 1)) }} disabled={page >= totalPages - 1} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-all">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
