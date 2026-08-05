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
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Cross-tenant activity log</p>
        </div>
      </div>
      <DataTable columns={columns} data={logs} isLoading={loading} searchPlaceholder="Search logs..." />
    </div>
  )
}
