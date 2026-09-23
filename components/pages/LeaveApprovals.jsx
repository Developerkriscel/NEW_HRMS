'use client'

import { useEffect, useState } from 'react'
import { Eye, X } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Portal } from '@/components/common/Portal'
import { leaveApi } from '@/services/leaveApi'
import { formatDate } from '@/lib/utils'

export function LeaveApprovals({ title = 'Leave Approvals', subtitle = 'Pending requests' }) {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  function load() {
    setLoading(true)
    leaveApi.getPendingApprovals({ size: 50 })
      .then((res) => setLeaves(res.data.data.content))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function approve(id) {
    await leaveApi.approve(id, '')
    setSelected(null)
    load()
  }
  async function reject(id) {
    await leaveApi.reject(id, 'Rejected')
    setSelected(null)
    load()
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-indigo-500 after:to-transparent after:rounded-full">{title}</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{subtitle}</p>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : leaves.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center text-sm text-slate-400">
          No pending leave requests
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm divide-y divide-slate-50 dark:divide-slate-800">
          {leaves.map((l) => (
            <div key={l._id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">{l.employee?.firstName} {l.employee?.lastName}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {l.leaveType?.name} · {formatDate(l.startDate)} – {formatDate(l.endDate)} · {l.numberOfDays} day(s)
                </p>
                {l.reason && <p className="text-xs text-slate-500 mt-1">"{l.reason}"</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge>{l.status}</Badge>
                <button onClick={() => setSelected(l)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <Eye className="h-3.5 w-3.5" /> View
                </button>
                <button onClick={() => approve(l._id)} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100">
                  Accept
                </button>
                <button onClick={() => reject(l._id)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-extrabold text-red-700 hover:bg-red-100">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Portal>
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelected(null)}>
            <aside className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Leave Details</h2>
                  <p className="text-sm font-semibold text-slate-500">{selected.employee?.firstName} {selected.employee?.lastName}</p>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4 p-6">
                <Detail label="Leave Type" value={selected.leaveType?.name || 'Leave'} />
                <Detail label="Date Range" value={`${formatDate(selected.startDate)} - ${formatDate(selected.endDate)}`} />
                <Detail label="Total Days" value={`${selected.numberOfDays} day(s)`} />
                <Detail label="Applied On" value={formatDate(selected.createdAt)} />
                <Detail label="Reason" value={selected.reason || '-'} />
              </div>
              <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <button onClick={() => reject(selected._id)} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700">Reject</button>
                <button onClick={() => approve(selected._id)} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white">Accept</button>
              </div>
            </aside>
          </div>
        </Portal>
      )}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}
