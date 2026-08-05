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
    trainingApi.list()
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Training</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Assigned learning sessions from HR</p>
        </div>
      </div>
      <DataTable columns={columns} data={sessions} isLoading={loading} searchPlaceholder="Search training..." emptyMessage="No training assigned" />
    </div>
  )
}
