'use client'

import { useEffect, useState } from 'react'
import { Clock, FileText, HelpCircle, Laptop, ListTodo, LogIn, LogOut, Receipt, Send, Star } from 'lucide-react'
import { StatsCard } from '@/components/cards/StatsCard'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import { attendanceApi } from '@/services/attendanceApi'
import { leaveApi } from '@/services/leaveApi'
import { expenseApi } from '@/services/expenseApi'
import { teamRequestApi } from '@/services/teamRequestApi'
import { taskApi } from '@/services/taskApi'
import { kraApi } from '@/services/kraApi'
import { documentApi } from '@/services/documentApi'
import { assetApi } from '@/services/assetApi'
import { helpdeskApi } from '@/services/helpdeskApi'

export default function EmployeeDashboardPage() {
  const { user } = useAuthStore()
  const [today, setToday] = useState(null)
  const [balances, setBalances] = useState([])
  const [summary, setSummary] = useState({
    pendingExpenses: 0,
    pendingRequests: 0,
    openTasks: 0,
    activeKras: 0,
    documents: 0,
    assets: 0,
    openTickets: 0,
  })
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [message, setMessage] = useState('')

  function load() {
    setLoading(true)
    Promise.all([
      attendanceApi.getTodayStatus(),
      leaveApi.getBalance(),
      expenseApi.list({ status: 'PENDING', size: 1 }),
      teamRequestApi.list({ status: 'PENDING', size: 1 }),
      taskApi.list({ size: 100 }),
      kraApi.list({ size: 100 }),
      documentApi.list(),
      assetApi.list(),
      helpdeskApi.list({ size: 100 }),
    ])
      .then(([todayRes, balRes, expenseRes, requestRes, taskRes, kraRes, docRes, assetRes, ticketRes]) => {
        setToday(todayRes.data.data)
        setBalances(balRes.data.data)
        const tasks = taskRes.data.data.content || []
        const kras = kraRes.data.data.content || []
        const tickets = ticketRes.data.data.content || []
        setSummary({
          pendingExpenses: expenseRes.data.data.totalElements || 0,
          pendingRequests: requestRes.data.data.totalElements || 0,
          openTasks: tasks.filter((task) => !['APPROVED', 'REJECTED', 'COMPLETED'].includes(task.status)).length,
          activeKras: kras.filter((kra) => !['APPROVED'].includes(kra.status)).length,
          documents: (docRes.data.data || []).length,
          assets: (assetRes.data.data || []).length,
          openTickets: tickets.filter((ticket) => !['RESOLVED', 'CLOSED'].includes(ticket.status)).length,
        })
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function handleCheckIn() {
    setActing(true)
    setMessage('')
    try {
      const { data } = await attendanceApi.checkIn({ source: 'WEB' })
      setMessage(data.data.message)
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Check-in failed')
    } finally {
      setActing(false)
    }
  }

  async function handleCheckOut() {
    setActing(true)
    setMessage('')
    try {
      const { data } = await attendanceApi.checkOut({})
      setMessage(data.data.message)
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Check-out failed')
    } finally {
      setActing(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6">
      <div className="rounded-2xl p-6 text-white bg-gradient-primary shadow-lg">
        <h1 className="text-xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
        <p className="text-white/70 text-sm mt-1">Here's your day at a glance</p>
      </div>

      {message && <div className="text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg p-3">{message}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard title="Open Tasks" value={summary.openTasks} icon={ListTodo} />
        <StatsCard title="Active KRAs" value={summary.activeKras} icon={Star} />
        <StatsCard title="Pending Expenses" value={summary.pendingExpenses} icon={Receipt} />
        <StatsCard title="Pending Requests" value={summary.pendingRequests} icon={Send} />
        <StatsCard title="Documents" value={summary.documents} icon={FileText} />
        <StatsCard title="Assigned Assets" value={summary.assets} icon={Laptop} />
        <StatsCard title="Open Tickets" value={summary.openTickets} icon={HelpCircle} />
      </div>

      <div className="stat-card flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Today's Status</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {today?.checkOutTime ? 'Checked out' : today?.checkInTime ? 'Checked in' : 'Not checked in yet'}
            </p>
          </div>
        </div>
        {!today?.checkInTime ? (
          <button onClick={handleCheckIn} disabled={acting} className="btn-primary">
            <LogIn className="w-4 h-4" /> Check In
          </button>
        ) : !today?.checkOutTime ? (
          <button onClick={handleCheckOut} disabled={acting} className="btn-secondary">
            <LogOut className="w-4 h-4" /> Check Out
          </button>
        ) : (
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Done for today ✓</span>
        )}
      </div>

      <div className="stat-card">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Leave Balance ({new Date().getFullYear()})</h3>
        {balances.length === 0 ? (
          <p className="text-sm text-slate-400">No leave balances set up yet — contact HR.</p>
        ) : (
          <div className="space-y-3">
            {balances.map((b) => (
              <div key={b._id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 dark:text-slate-300">{b.leaveType?.name}</span>
                  <span className="text-slate-400">{b.getAvailableDays ? b.getAvailableDays() : b.totalDays - b.usedDays} available</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.min(100, (b.usedDays / (b.totalDays || 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
