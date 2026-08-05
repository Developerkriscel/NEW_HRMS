'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/common/Badge'
import { useAuthStore } from '@/store/authStore'
import { employeeApi } from '@/services/employeeApi'
import { formatCurrency } from '@/lib/utils'

export default function PayslipsPage() {
  const { user } = useAuthStore()
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    employeeApi.getPayslips(user.id)
      .then((res) => setPayslips(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [user?.id])

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payslips</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Your salary history</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : error ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center text-sm text-red-500">
          Failed to load payslips — try refreshing
        </div>
      ) : payslips.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center text-sm text-slate-400">
          No payslips generated yet
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead><tr><th>Period</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th></tr></thead>
            <tbody>
              {payslips.map((p) => (
                <tr key={p._id}>
                  <td>{new Date(2000, p.month - 1, 1).toLocaleString('default', { month: 'long' })} {p.year}</td>
                  <td>{formatCurrency(p.grossSalary)}</td>
                  <td>{formatCurrency(p.totalDeductions)}</td>
                  <td className="font-semibold">{formatCurrency(p.netSalary)}</td>
                  <td><Badge>{p.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
