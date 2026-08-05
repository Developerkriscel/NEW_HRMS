'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { leaveApi } from '@/services/leaveApi'
import { formatDate } from '@/lib/utils'

export function LeaveApprovals({ title, subtitle }) {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    leaveApi.getPendingApprovals({ size: 50 })
      .then((res) => setLeaves(res.data.data.content))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function approve(id) {
    await leaveApi.approve(id, '')
    load()
  }
  async function reject(id) {
    await leaveApi.reject(id, 'Rejected')
    load()
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
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
                <button onClick={() => approve(l._id)} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => reject(l._id)} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
