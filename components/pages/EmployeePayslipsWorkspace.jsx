'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/common/Badge'
import { useAuthStore } from '@/store/authStore'
import { employeeApi } from '@/services/employeeApi'
import { formatCurrency } from '@/lib/utils'

export function EmployeePayslipsWorkspace() {
  const { user } = useAuthStore()
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [downloading, setDownloading] = useState(null)

  async function handleDownload(payslipId) {
    try {
      setDownloading(payslipId)
      const res = await employeeApi.downloadPayslipPdf(payslipId)
      
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      let filename = 'Payslip.pdf'
      const disposition = res.headers['content-disposition']
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '')
      }
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed', err)
    } finally {
      setDownloading(null)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    employeeApi.getPayslips(user.id)
      .then((res) => setPayslips(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [user?.id])

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Payslips
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            Your detailed salary history and earnings breakdown
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-500/10 rounded-3xl border border-rose-100 dark:border-rose-500/20 p-8 text-center text-sm font-bold text-rose-600 dark:text-rose-400">
          Failed to load payslips. Please try refreshing the page.
        </div>
      ) : payslips.length === 0 ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800/50 rounded-3xl border border-indigo-100 dark:border-slate-800 shadow-xl p-12 text-center group">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 mb-6 rounded-3xl bg-white dark:bg-slate-800 shadow-2xl flex items-center justify-center transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
              <svg className="w-12 h-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No Payslips Yet</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
              You don&apos;t have any generated payslips in your history. They will appear here once payroll is processed.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {payslips.map((p) => (
            <div key={p._id} className="max-h-[90dvh] overflow-y-auto group relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="p-6 relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Payroll Period</p>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {new Date(2000, p.month - 1, 1).toLocaleString('default', { month: 'long' })} {p.year}
                    </h3>
                  </div>
                  <Badge variant={p.status === 'PAID' ? 'success' : 'warning'}>{p.status}</Badge>
                </div>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Gross Salary</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(p.grossSalary)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Deductions</span>
                    <span className="font-bold text-rose-500 dark:text-rose-400">-{formatCurrency(p.totalDeductions)}</span>
                  </div>
                  <div className="w-full h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Net Pay</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(p.netSalary)}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDownload(p._id)}
                  disabled={downloading === p._id}
                  className="w-full bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-500/10 dark:text-slate-300 dark:hover:text-indigo-400 disabled:opacity-50 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                >
                  {downloading === p._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  {downloading === p._id ? 'Downloading...' : 'Download PDF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
