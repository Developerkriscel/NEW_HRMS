'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/tables/DataTable'
import { tenantApi } from '@/services/tenantApi'
import { formatDate } from '@/lib/utils'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tenantApi.getAuditLogsGlobal({ size: 100 })
      .then((res) => setLogs(res.data.data.content))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { header: 'Action', accessor: 'action' },
    { header: 'Entity', accessor: 'entityType' },
    { header: 'Performed By', accessor: 'performerEmail' },
    { header: 'Role', accessor: 'performerRole' },
    { header: 'Description', accessor: 'description' },
    { header: 'When', accessor: 'createdAt', render: (v) => formatDate(v, 'dd MMM yyyy, HH:mm') },
  ]

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100/80 dark:border-slate-800/60 pb-6">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-1.5">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight">Audit Logs</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Cross-tenant activity log</p>
        </div>
      </div>
      <DataTable columns={columns} data={logs} isLoading={loading} searchPlaceholder="Search logs..." />
    </div>
  )
}
