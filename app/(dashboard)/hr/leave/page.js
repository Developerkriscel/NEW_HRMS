'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { CalendarOff, CheckSquare } from 'lucide-react'

const EmployeeLeaveWorkspace = dynamic(
  () => import('@/components/pages/EmployeeLeaveWorkspace').then((mod) => mod.EmployeeLeaveWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

const ManagerApprovalsWorkspace = dynamic(
  () => import('@/components/pages/ManagerApprovalsWorkspace').then((mod) => mod.ManagerApprovalsWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function HRLeavePage() {
  const [activeTab, setActiveTab] = useState('mine')

  const Tabs = (
    <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl">
      <button
        onClick={() => setActiveTab('mine')}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all duration-300 ${
          activeTab === 'mine'
            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
        }`}
      >
        <CalendarOff className="w-3.5 h-3.5" />
        My Leave & Requests
      </button>
      <button
        onClick={() => setActiveTab('company')}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all duration-300 ${
          activeTab === 'company'
            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
        }`}
      >
        <CheckSquare className="w-3.5 h-3.5" />
        Company Approvals
      </button>
    </div>
  )

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex justify-end -mb-4 relative z-10">
        {Tabs}
      </div>
      {activeTab === 'mine' ? (
        <EmployeeLeaveWorkspace />
      ) : (
        <ManagerApprovalsWorkspace title="Company Approvals" subtitle="" scope="company" />
      )}
    </div>
  )
}
