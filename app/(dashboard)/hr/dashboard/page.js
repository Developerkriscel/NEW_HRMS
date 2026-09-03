'use client'

import { useState } from 'react'
import { LayoutDashboard, Building2 } from 'lucide-react'
import { HRDashboardWorkspace } from '@/components/pages/HRDashboardWorkspace'
import { EmployeeDashboardWorkspace } from '@/components/pages/EmployeeDashboardWorkspace'

export default function HRDashboardPage() {
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
        <LayoutDashboard className="w-3.5 h-3.5" />
        My Dashboard
      </button>
      <button
        onClick={() => setActiveTab('company')}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all duration-300 ${
          activeTab === 'company'
            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
        }`}
      >
        <Building2 className="w-3.5 h-3.5" />
        Company Dashboard
      </button>
    </div>
  )

  return (
    <div className="animate-fade-in">
      {activeTab === 'mine' ? (
        <EmployeeDashboardWorkspace headerAction={Tabs} />
      ) : (
        <HRDashboardWorkspace headerAction={Tabs} />
      )}
    </div>
  )
}
