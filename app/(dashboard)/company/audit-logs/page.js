'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/tables/DataTable'
import { companyApi } from '@/services/companyApi'
import { formatDate } from '@/lib/utils'

export default function CompanyAuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    companyApi.getAuditLogs({ size: 100 })
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
          <div className="relative z-10 group w-fit mb-2">
  <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-900 via-indigo-700 to-blue-600 dark:from-indigo-200 dark:via-indigo-400 dark:to-blue-400 drop-shadow-sm transition-all duration-500 group-hover:scale-[1.02] origin-left">Audit Logs</h1>
  <div className="h-1 w-12 rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 mt-2 transition-all duration-500 group-hover:w-full opacity-70"></div>
</div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">User activity, data changes and approval history for your company</p>
        </div>
      </div>
      <DataTable columns={columns} data={logs} isLoading={loading} searchPlaceholder="Search logs..." />
    </div>
  )
}
