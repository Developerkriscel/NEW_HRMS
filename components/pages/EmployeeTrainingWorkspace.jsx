'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { trainingApi } from '@/services/trainingApi'
import { formatDate } from '@/lib/utils'

export function EmployeeTrainingWorkspace() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    trainingApi.list({ myTraining: true })
      .then((res) => setSessions(res.data.data || []))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { header: 'Training', accessor: 'title', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.title}</p>
        <p className="text-xs text-slate-400">{row.category || 'General'} - {row.trainer || 'No trainer'}</p>
      </div>
    ) },
    { header: 'Scheduled', accessor: 'scheduledAt', render: (v) => formatDate(v, 'dd MMM yyyy HH:mm') },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Notes', accessor: 'notes', render: (v) => v || '-' },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-indigo-500 after:to-transparent after:rounded-full">Training</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Assigned learning sessions from HR</p>
        </div>
      </div>
      <DataTable columns={columns} data={sessions} isLoading={loading} searchPlaceholder="Search training..." emptyMessage="No training assigned" />
    </div>
  )
}
