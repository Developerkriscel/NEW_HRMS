'use client'

import { useState } from 'react'
import { RolesPermissionsSection } from '@/components/pages/RolesPermissionsSection'
import { HierarchySection } from '@/components/pages/HierarchySection'
import { Users, ShieldCheck, Network, Plus } from 'lucide-react'
import { AddEmployeePage } from '@/components/pages/AddEmployeePage'
import { EmployeesList } from '@/components/pages/EmployeesList'

export default function CompanyEmployeesPage() {
  const [activeTab, setActiveTab] = useState('directory')
  const [showAddModal, setShowAddModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="animate-fade-in space-y-1">
      <div className="page-header">
        <div>
          <div className="relative z-10 group w-fit mb-0">
  <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-900 via-indigo-700 to-blue-600 dark:from-indigo-200 dark:via-indigo-400 dark:to-blue-400 drop-shadow-sm transition-all duration-500 group-hover:scale-[1.02] origin-left">Employees</h1>
  <div className="h-1 w-12 rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 mt-2 transition-all duration-500 group-hover:w-full opacity-70"></div>
</div>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800 flex justify-between items-center pr-2">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'directory'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Directory
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'roles'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Roles & Permissions
          </button>
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`flex items-center gap-2 whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'hierarchy'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Network className="w-4 h-4" />
            Hierarchy
          </button>
        </nav>
        <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 mb-2" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" /> Add Employee
        </button>
      </div>

      <div>
        {activeTab === 'directory' ? (
          <>
            <EmployeesList key={refreshKey} basePath="/company/employees" hideHeader={true} />
            {showAddModal && (
              <AddEmployeePage 
                onClose={() => setShowAddModal(false)}
                onSuccess={() => {
                  setShowAddModal(false)
                  setRefreshKey(k => k + 1)
                }}
              />
            )}
          </>
        ) : activeTab === 'roles' ? (
          <RolesPermissionsSection />
        ) : (
          <HierarchySection />
        )}
      </div>
    </div>
  )
}
