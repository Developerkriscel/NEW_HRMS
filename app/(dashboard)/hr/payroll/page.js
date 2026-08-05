'use client'

import { useEffect, useState } from 'react'
import { Play, CheckCircle2 } from 'lucide-react'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/common/Badge'
import { StatsCard } from '@/components/cards/StatsCard'
import { Banknote, TrendingUp } from 'lucide-react'
import { payrollApi } from '@/services/payrollApi'
import { formatCurrency } from '@/lib/utils'

const now = new Date()

export default function HRPayrollPage() {
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [payslips, setPayslips] = useState([])
  const [totals, setTotals] = useState({ totalGross: 0, totalNet: 0 })
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')

  function load() {
    setLoading(true)
    payrollApi.getMonthly({ month, year, size: 100 })
      .then((res) => {
        setPayslips(res.data.data.content)
        setTotals({ totalGross: res.data.data.totalGross, totalNet: res.data.data.totalNet })
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [month, year])

  async function handleRun() {
    setRunning(true)
    setMessage('')
    try {
      const { data } = await payrollApi.run(month, year)
      setMessage(`Payroll run complete: ${data.data.succeeded} succeeded, ${data.data.failed} failed`)
      load()
    } finally {
      setRunning(false)
    }
  }

  async function handleApprove() {
    setRunning(true)
    try {
      await payrollApi.approve(month, year)
      load()
    } finally {
      setRunning(false)
    }
  }

  const columns = [
    { header: 'Employee', accessor: 'employee', render: (v) => v ? `${v.firstName} ${v.lastName}` : '—' },
    { header: 'Gross', accessor: 'grossSalary', render: (v) => formatCurrency(v) },
    { header: 'PF', accessor: 'pfDeduction', render: (v) => formatCurrency(v) },
    { header: 'Net Pay', accessor: 'netSalary', render: (v) => formatCurrency(v) },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payroll</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">India statutory payroll processing</p>
        </div>
        <div className="flex gap-2">
          <select className="input-field w-32" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}</option>)}
          </select>
          <select className="input-field w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {message && <div className="text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg p-3">{message}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard title="Total Gross" value={formatCurrency(totals.totalGross)} icon={Banknote} />
        <StatsCard title="Total Net Pay" value={formatCurrency(totals.totalNet)} icon={TrendingUp} />
      </div>

      <div className="flex gap-2">
        <button onClick={handleRun} disabled={running} className="btn-primary">
          <Play className="w-4 h-4" /> {running ? 'Processing...' : 'Run Payroll'}
        </button>
        <button onClick={handleApprove} disabled={running} className="btn-secondary">
          <CheckCircle2 className="w-4 h-4" /> Approve All Drafts
        </button>
      </div>

      <DataTable columns={columns} data={payslips} isLoading={loading} searchPlaceholder="Search employees..." />
    </div>
  )
}
