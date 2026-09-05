'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Calendar, Clock, FileText, CheckCircle2, ListTodo, Search, Filter, MoreVertical, Plus, Download, Eye } from 'lucide-react'
import { OnboardingStatusBadge } from './components/OnboardingStatusBadge'
import { OnboardingProgress } from './components/OnboardingProgress'
import { EmptyState } from './components/EmptyState'
import { StartOnboardingModal } from './StartOnboardingModal'
import { preboardingApi } from '@/services/preboardingApi'
import { adaptPreboardingRecord } from './onboardingRecordAdapter'

export function OnboardingDashboardPage() {
  const router = useRouter()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isStartModalOpen, setIsStartModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await preboardingApi.list({ size: 200 })
      const rows = res.data?.data?.content || res.data?.data?.items || []
      setRecords(rows.map(adaptPreboardingRecord))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load onboarding records from database')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  // Derived metrics
  const total = records.length
  const inProgress = records.filter(r => r.status === 'IN_PROGRESS').length
  const completed = records.filter(r => r.status === 'COMPLETED').length
  const upcoming = records.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length
  
  const pendingDocs = records.reduce((acc, r) => acc + r.documents.filter(d => d.status !== 'VERIFIED').length, 0)
  const pendingTasks = records.reduce((acc, r) => acc + r.tasks.filter(t => t.status !== 'COMPLETED').length, 0)

  // Filtering
  const filteredRecords = records.filter(r => {
    const term = search.toLowerCase()
    const matchesSearch = r.candidate.name.toLowerCase().includes(term) || r.candidate.id.toLowerCase().includes(term) || r.position.toLowerCase().includes(term)
    const matchesStatus = statusFilter === 'All' ? true : statusFilter === 'Completed' ? r.status === 'COMPLETED' : statusFilter === 'In Progress' ? r.status === 'IN_PROGRESS' : r.status === 'NOT_STARTED'
    return matchesSearch && matchesStatus
  })

  return (
    <div className="animate-fade-in space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Onboarding</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage new hires, joining formalities, documents and onboarding progress.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary hidden sm:flex">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setIsStartModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Start Onboarding
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Onboarding', value: total, icon: Users, color: 'text-white', bg: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30 shadow-lg' },
          { label: 'Upcoming Joining', value: upcoming, icon: Calendar, color: 'text-white', bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/30 shadow-lg' },
          { label: 'In Progress', value: inProgress, icon: Clock, color: 'text-white', bg: 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-500/30 shadow-lg' },
          { label: 'Docs Pending', value: pendingDocs, icon: FileText, color: 'text-white', bg: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/30 shadow-lg' },
          { label: 'Tasks Pending', value: pendingTasks, icon: ListTodo, color: 'text-white', bg: 'bg-gradient-to-br from-orange-400 to-orange-500 shadow-orange-500/30 shadow-lg' },
          { label: 'Completed', value: completed, icon: CheckCircle2, color: 'text-white', bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30 shadow-lg' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${kpi.bg} ${kpi.color}`}>
                <kpi.icon className="w-4 h-4 drop-shadow-sm" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5 leading-tight">{kpi.label}</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search candidate, position, department or ID..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap">
            <Filter className="w-4 h-4 text-slate-400" /> Filters
          </button>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Not Started">Not Started</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm font-semibold text-slate-500">Loading onboarding records from database...</div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm font-bold text-red-600">{error}</p>
            <button onClick={loadRecords} className="btn-secondary mt-4">Retry</button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <EmptyState 
            icon={Users}
            title="No onboarding records found"
            description="Accepted offers will appear here automatically for employee onboarding."
            action={
              <button onClick={() => setIsStartModalOpen(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> Start Onboarding
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Position</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Joining Date</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned To</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group cursor-pointer" onClick={() => router.push(`/hr/onboarding/${record.id}`)}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                          {record.candidate.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{record.candidate.name}</p>
                          <p className="text-xs text-slate-500">{record.candidate.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-slate-900 dark:text-white">{record.position}</p>
                      <p className="text-xs text-slate-500">{record.department}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-slate-900 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-sm">{new Date(record.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </td>
                    <td className="py-4 px-6 w-48">
                      <OnboardingProgress progress={record.progress} size="sm" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">{record.onboardingOwner.charAt(0)}</div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{record.onboardingOwner.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <OnboardingStatusBadge status={record.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => router.push(`/hr/onboarding/${record.id}`)} className="p-2 text-slate-400 hover:text-blue-600 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StartOnboardingModal isOpen={isStartModalOpen} onClose={() => {
        setIsStartModalOpen(false)
        loadRecords()
      }} />
    </div>
  )
}

