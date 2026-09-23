'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LifeBuoy, AlertCircle, Search, Filter, Plus } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'

export default function CompanySupportDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({ open: 0, resolved: 0 })

  useEffect(() => {
    fetchTickets()
  }, [])

  async function fetchTickets() {
    try {
      const res = await fetch('/api/company/support/tickets')
      if (res.ok) {
        const data = await res.json()
        setTickets(data.data)
        
        const open = data.data.filter(t => t.status === 'OPEN' || t.status === 'IN PROGRESS' || t.status === 'WAITING FOR CUSTOMER').length
        const resolved = data.data.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length
        setStats({ open, resolved })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-indigo-500" />
            Support Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Get help, track support requests, and connect with platform support.</p>
        </div>
        <button onClick={() => router.push('/company/support/create')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Active Tickets</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.open}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Resolved</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.resolved}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <LifeBuoy className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Ticket List */}
      <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">My Support Tickets</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-slate-100 dark:border-slate-800/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                <th className="pb-4 px-2">Ticket ID</th>
                <th className="pb-4 px-2">Subject</th>
                <th className="pb-4 px-2">Category</th>
                <th className="pb-4 px-2">Priority</th>
                <th className="pb-4 px-2">Status</th>
                <th className="pb-4 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/60">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm text-slate-500 font-semibold">
                    You haven't raised any support requests yet.
                  </td>
                </tr>
              ) : (
                tickets.map(t => (
                  <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-2 font-bold text-sm text-slate-900 dark:text-white">{t.ticketNumber}</td>
                    <td className="py-4 px-2 text-sm text-slate-600 dark:text-slate-300 max-w-[250px] truncate">{t.subject}</td>
                    <td className="py-4 px-2 text-sm text-slate-600 dark:text-slate-300">{t.category}</td>
                    <td className="py-4 px-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        t.priority === 'Urgent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                        t.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      )}>{t.priority}</span>
                    </td>
                    <td className="py-4 px-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        t.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                        t.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                      )}>{t.status}</span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <button onClick={() => router.push(`/company/support/${t._id}`)} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Open</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
